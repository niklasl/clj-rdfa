(ns rdfa.core
  (:require [clojure.string :as string])
  (:require [rdfa.dom :as dom])
  (:require [rdfa.profiles :as profiles]))


(defrecord BNode [id])
(defrecord IRI [id])
(defrecord Literal [value tag])

(def gen-bnode-prefix "GEN")

(def bnode-counter (atom 0))

(defn next-bnode []
  (swap! bnode-counter inc)
  (BNode. (str gen-bnode-prefix @bnode-counter)))


(let [rdf "http://www.w3.org/1999/02/22-rdf-syntax-ns#"]
  (def rdf:type (IRI. (str rdf "type")))
  (def rdf:XMLLiteral (IRI. (str rdf "XMLLiteral")))
  (def rdf:first (IRI. (str rdf "first")))
  (def rdf:rest (IRI. (str rdf "rest")))
  (def rdf:nil (IRI. (str rdf "nil"))))

(let [rdfa "http://www.w3.org/ns/rdfa#"]
  (def rdfa:usesVocabulary (IRI. (str rdfa "usesVocabulary")))
  (def rdfa:Error (IRI. (str rdfa "Error")))
  (def rdfa:Warning (IRI. (str rdfa "Warning")))
  (def dc:description (IRI. "http://purl.org/dc/terms/description")))

(def xhv "http://www.w3.org/1999/xhtml/vocab#")


(defn resolve-iri [iref base]
  (if (not-empty iref)
    (.. (java.net.URI. base) (resolve iref) (toString))
    base))

(defn to-iri [s base]
  (IRI. (resolve-iri s base)))

(defn expand-term-or-curie
  ([env repr]
   (expand-term-or-curie repr (env :base)
                         (env :prefix-map) (env :term-map) (env :vocab)))
  ([repr base prefix-map]
   (expand-term-or-curie repr base prefix-map {} nil))
  ([repr base prefix-map term-map vocab]
   (let [repr (string/replace-first repr #"^\[?(.*?)\]?$" "$1")]
     (cond
       (> (.indexOf repr ":") -1)
       (let [[pfx term] (string/split repr #":" 2)
             is-empty (empty? pfx)
             is-bnode (if-not is-empty (= pfx "_"))
             pfx-vocab (if-not is-bnode (prefix-map pfx))]
         (cond
           (and (or pfx-vocab is-bnode is-bnode)
             (.startsWith term "//")) [nil {:malformed-curie repr}]
           is-empty [(to-iri (str xhv term) base) nil]
           is-bnode [(BNode. (or (not-empty term) gen-bnode-prefix)) nil]
           pfx-vocab [(to-iri (str pfx-vocab term) base) nil]
           :else (if-let [iri (to-iri repr "")]
                   [iri nil]
                   [nil {:undefined-prefix pfx}])))
       (not-empty vocab)
       [(to-iri (str vocab repr) base) nil]
       :else
       (if-let [iri (term-map (string/lower-case repr))]
         [(to-iri iri base) nil]
         [nil {:undefined-term repr}])))))

(defn to-curie-or-iri [env repr]
  (let [[iri err] (expand-term-or-curie repr (env :base) (env :prefix-map))]
    [(or iri (to-iri repr (env :base))) nil]))

(defn to-node [env repr]
  (expand-term-or-curie env repr))

(defn to-nodes [env expr]
  (if (not-empty expr)
    (let [tokens (string/split (string/trim expr) #"\s+")
          coll (map #(to-node env %1) tokens)
          nodes (remove nil? (map #(first %) coll))
          errs (remove nil? (map #(second %) coll))]
      [nodes errs])))

(defn parse-prefix [prefix]
  (if (empty? prefix) nil
    (apply hash-map (string/split (string/trim (or prefix "")) #":?\s+"))))

(defn init-env
  [location {prefix-map :prefix-map
             term-map :term-map
             vocab :vocab
             base :base
             profile :profile}]
  (let [base (or base location)
        base (let [i (.indexOf base "#")] (if (> i -1) (subs base 0 i) base))]
    {:profile profile
     :base base
     :parent-object (IRI. base)
     :incomplete {}
     :incomplete-subject nil
     :list-map {}
     :lang nil
     :xmlns-map nil
     :prefix-map prefix-map
     :term-map term-map
     :vocab vocab}))

(defn get-data [el]
  (let [attr #(dom/get-attr el %1)
        xmlns-map (dom/get-ns-map el)
        prefix-map (parse-prefix (attr "prefix"))]
    {:element el
     :is-root (dom/is-root? el)
     :xmlns-map (if-let [xmlns (attr "xmlns")]
                  (assoc xmlns-map nil xmlns) xmlns-map)
     :prefix-map (merge xmlns-map prefix-map)
     :vocab (attr "vocab")
     :base nil
     :about (attr "about")
     :property (attr "property")
     :rel (attr "rel")
     :rev (attr "rev")
     :resource (or (attr "resource") (attr "href") (attr "src"))
     :typeof (attr "typeof")
     :inlist (attr "inlist")
     :lang (or (attr "xml:lang") (attr "lang"))
     :content (attr "content")
     :datatype (attr "datatype")}))

(defn update-mappings [env data]
  (let [env (update-in env [:xmlns-map]
                       #(merge %1 (data :xmlns-map)))
        env (update-in env [:prefix-map]
                       #(merge %1 (data :prefix-map)))
        env (if-let [vocab (data :vocab)]
              (assoc env :vocab vocab)
              env)
        env (if-let [base (data :base)]
              (assoc env :base base)
              env)
        env (if-let [lang (data :lang)]
              (assoc env :lang lang)
              env)]
    env))

(defn get-subject [env data]
  (let [new-pred (or (data :rel) (data :rev) (data :property))]
    (if-let [s (or (data :about)
                   (if (not new-pred)
                     (data :resource))
                   (if (data :is-root)
                     ""))]
      (to-curie-or-iri env s)
      (if (and (data :typeof)
               (not new-pred)
               (not (data :resource)))
        [(next-bnode) nil]))))

(defn get-literal [env data]
  (let [el (data :element)
        as-literal (and (data :property)
                        (not (or (data :resource)
                                 (and (data :typeof)
                                      (not (data :about))))))
        [datatype dt-err] (if-let [dt (not-empty (data :datatype))]
                            (to-node env dt))
        as-xml (= datatype rdf:XMLLiteral)
        repr (or (data :content)
                 (if as-literal (if as-xml
                                  (dom/get-inner-xml el (env :xmlns-map) (env :lang))
                                  (dom/get-text el))))]
    [(if repr
       (Literal. repr
                 (or datatype
                     (or (data :lang) (env :lang)))))
     dt-err]))

(defn get-object [env data]
  (cond
    (data :resource)
    (to-curie-or-iri env (data :resource))
    (or
      (and (or (data :rel) (data :rev))
           (not (data :about)) (data :typeof))
      (and (data :property) (not (data :content)) (data :typeof)))
    [(next-bnode) nil]))

(defn get-props-rels-revs-lists [env data]
  (let [inlist (data :inlist)
        [props prop-errs] (to-nodes env (data :property))
        [rels rel-errs] (to-nodes env (data :rel))
        [revs rev-errs] (to-nodes env (data :rev))
        errs (concat prop-errs rel-errs rev-errs)]
    [(if inlist
      [nil nil revs (or props rels)]
      [props rels revs nil]) errs]))

(defn parse-element [parent-env el]
  (let [data (profiles/extended-data parent-env (get-data el))
        env (update-mappings parent-env data)
        [subject s-err] (get-subject env data)
        [[props rels revs list-ps]
         p-errs] (get-props-rels-revs-lists env data)
        [object-resource o-err] (get-object env data)
        [object-literal dt-err] (get-literal env data)
        [types t-errs] (if-let [typeof (data :typeof)] (to-nodes env typeof))
        errs (concat (remove nil? [s-err o-err dt-err]) p-errs t-errs)]
    [subject types object-resource object-literal
     props rels revs list-ps
     env data errs]))

(defn get-hanging [data]
  (if (and (or (data :rel) (data :rev))
           (not (data :resource))
           (or (data :about) (not (data :typeof)))
           (not (data :inlist)))
    (next-bnode)))

(defn create-warning-triples [warning]
  (let [warn-node (next-bnode)
        descr (Literal. (str warning) "en")]
    [[warn-node rdf:type rdfa:Warning]
     [warn-node dc:description descr]]))

(defn process-element [parent-env el]
  (let [[subject types o-resource o-literal
         props rels revs list-ps
         env data errs] (parse-element parent-env el)
        parent-o (env :parent-object)
        incomplete-s (env :incomplete-subject)
        incomplete (env :incomplete)
        has-about (data :about)
        has-p (or (data :property) (data :rel) (data :rev))
        completing-s (or subject (if has-p incomplete-s) o-resource)
        active-s (or subject (if has-p incomplete-s) parent-o)
        active-o (or o-resource o-literal)
        next-parent-o (or o-resource active-s)
        next-incomplete-s (if (not (or subject has-p))
                            incomplete-s
                            (get-hanging data))
        ; TODO: list-rels and list-props (for inlist with both o-l and o-r)
        new-list-map (into {} (lazy-cat
                                (for [p list-ps] [p (if active-o [active-o] [])])
                                (if (or subject o-resource)
                                  (for [p (incomplete :list-ps)]
                                    [p [next-parent-o]]))))
        regular-triples (lazy-cat
                          (if o-literal
                            (for [p props] [active-s p o-literal]))
                          (if o-resource
                            (lazy-cat (for [p (if o-literal rels
                                                (concat props rels))]
                                        [active-s p o-resource])
                                      (for [p revs] [o-resource p active-s]))))
        type-triples (let [ts (if (or has-about (not o-resource))
                                active-s o-resource)]
                       (for [t types] [ts rdf:type t]))
        completed-triples (if completing-s
                            (let [{rels :rels revs :revs} incomplete]
                              (lazy-cat
                                (for [rel rels] [parent-o rel completing-s])
                                (for [rev revs] [completing-s rev parent-o]))))
        vocab-triples (if-let [v (data :vocab)]
                        [[(IRI. (env :base)) rdfa:usesVocabulary (IRI. v)]])
        proc-triples (mapcat create-warning-triples errs)
        next-incomplete (cond
                          (and (or rels revs list-ps) (not active-o))
                          {:rels rels :revs revs :list-ps list-ps}
                          (not-empty completed-triples) {}
                          :else incomplete)
        env (assoc env
                   :incomplete next-incomplete
                   :incomplete-subject next-incomplete-s
                   :parent-object next-parent-o
                   :list-map new-list-map)
        env (if (not= parent-o next-parent-o)
              (assoc-in env [:incomplete :list-ps] {})
              env)]
    [env data (lazy-cat type-triples
                        completed-triples
                        regular-triples
                        vocab-triples) proc-triples]))

(defn gen-list-triples [s p l]
  (loop [s s, p p, l l, triples nil]
    (if (empty? l)
      (conj triples [s p rdf:nil])
      (let [node (next-bnode)
            triples (concat triples
                            [[s p node]
                             [node rdf:first (first l)]])]
        (recur node rdf:rest (rest l) triples)))))

(declare visit-element)

(defn combine-element-visits [[prev-env
                               prev-triples
                               prev-proc-triples] child]
  (let [{{list-map :list-map} :env
         triples :triples
         proc-triples :proc-triples} (visit-element prev-env child)]
    [(if (empty? list-map)
       prev-env
       (assoc prev-env :list-map list-map))
     (concat prev-triples triples)
     (concat prev-proc-triples proc-triples)]))

(defn visit-element [parent-env el]
  (let [[env data triples proc-triples] (process-element parent-env el)
        has-about (data :about)
        s (env :parent-object)
        changed-s (not= s (parent-env :parent-object))
        new-list-map (env :list-map)
        current-list-map (merge-with concat
                                     (parent-env :list-map)
                                     (if has-about {} new-list-map))
        local-env (assoc env :list-map
                         (if changed-s
                           (if has-about new-list-map {})
                           current-list-map))
        [{combined-list-map :list-map}
         child-triples
         child-proc-triples] (reduce
                               combine-element-visits [local-env nil nil]
                               (dom/get-child-elements el))
        list-triples (apply concat
                            (for [[p l] combined-list-map
                                  :when (or changed-s
                                            (not (contains? current-list-map p)))]
                              (gen-list-triples s p l)))
        result-env (assoc env :list-map
                          (cond
                            changed-s current-list-map
                            (empty? list-triples) combined-list-map
                            :else current-list-map))]
    {:env result-env
     :triples (lazy-cat triples child-triples list-triples)
     :proc-triples (lazy-cat proc-triples child-proc-triples)}))

(defn extract-rdfa [profile root location]
  (let [base-env (init-env location (profiles/get-host-env profile root))]
    (visit-element base-env root)))

(defn error-results [err-msg lang]
  (let [err-node (next-bnode)
        descr (Literal. err-msg lang)]
    {:env nil
     :triples nil
     :proc-triples [[err-node rdf:type rdfa:Error]
                    [err-node dc:description descr]]}))

