(ns rdfa.core
  (:require rdfa.profiles)
  (:require [clojure.string :as string]))


(defprotocol DomAccess
  (get-attr [this attr-name])
  (get-ns-map [this])
  (get-child-elements [this])
  (get-content [this as-xml]))


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
  (def rdf:nil (IRI. (str rdf "nil")))
  (def rdfa:usesVocabulary (IRI. "http://www.w3.org/ns/rdfa#usesVocabulary")))

(def xhv "http://www.w3.org/1999/xhtml/vocab#")


(defn resolve-iri [iref base]
  (if (not-empty iref)
    (.. (java.net.URI. base) (resolve iref) (toString))
    base))

(defn expand-term-or-curie
  ([repr env]
   (expand-term-or-curie repr (env :base)
                         (env :prefix-map) (env :term-map) (env :vocab)))
  ([repr base prefix-map]
   (expand-term-or-curie repr base prefix-map {} nil))
  ([repr base prefix-map term-map vocab]
   (let [repr (string/replace-first repr #"^\[?(.*?)\]?$" "$1")
         to-iri #(IRI. (resolve-iri %1 base))]
     (cond
       (> (.indexOf repr ":") -1)
       (let [[pfx term] (string/split repr #":" 2)]
         (cond
           (= pfx "_") (BNode. (or (not-empty term) gen-bnode-prefix))
           (.startsWith term "//") (to-iri repr)
           (empty? pfx) (to-iri (str xhv term))
           :else (if-let [vocab (prefix-map pfx)]
                   (to-iri (str vocab term))
                   (to-iri repr))))
       (not-empty vocab)
       (to-iri (str vocab repr))
       :else
       (if-let [iri (term-map (string/lower-case repr))]
         (to-iri iri)
         (to-iri repr))))))

(defn expand-curie [repr env]
  (expand-term-or-curie repr (env :base) (env :prefix-map)))

(defn to-node [env repr]
  (expand-term-or-curie repr env))

(defn- to-tokens [expr]
  (string/split (string/trim expr) #"\s+"))

(defn to-nodes [env expr]
  (if (not-empty expr)
    (map #(to-node env %1) (to-tokens expr))))

(defn parse-prefix [prefix]
  (if (empty? prefix)
    nil
    (apply hash-map (string/split
                      (string/trim (or prefix ""))
                      #":?\s+"))))

(defn init-env
  ([base]
   (init-env base {} {} nil))
  ([base prefix-map term-map vocab]
   (let [base (let [i (.indexOf base "#")] (if (> i -1) (subs base 0 i) base))]
     {:base base
      :parent-object (IRI. base)
      :incomplete {}
      :list-map {}
      :lang nil
      :prefix-map prefix-map
      :term-map term-map
      :vocab vocab})))

(defn get-data [el]
  (let [attr #(get-attr el %1)
        about (attr "about")
        property (attr "property")
        resource (or (attr "resource") (attr "href") (attr "src"))
        typeof (attr "typeof")
        datatype (attr "datatype")
        prefix-map (parse-prefix (attr "prefix"))
        ; TODO: in a hanging rel, use incomplete-subject as about here:
        as-literal (and property (or about (not (or typeof resource))))
        as-xml (= datatype (:id rdf:XMLLiteral))]
    {:tag (.getNodeName el); :line-nr (... el)
     :prefix-map (merge (get-ns-map el) prefix-map)
     :vocab (attr "vocab")
     :about about
     :property property
     :rel (attr "rel")
     :rev (attr "rev")
     :resource resource
     :typeof typeof
     :inlist (attr "inlist")
     :content (or (attr "content")
                  (if as-literal (get-content el as-xml)))
     :lang (or (attr "lang") (attr "xml:lang"))
     :datatype datatype}))

(defn update-env [env data]
  (let [env (if-let [lang (data :lang)]
              (assoc env :lang lang)
              env)
        env (update-in env [:prefix-map]
                       #(merge %1 (data :prefix-map)))
        env (if-let [vocab (data :vocab)]
              (assoc env :vocab vocab)
              env)]
    env))

(defn get-subject [data env]
  (let [new-pred (or (data :rel) (data :rev) (data :property))]
    (or (if-let [s (or (data :about)
                       (if (not new-pred)
                         (data :resource)))]
          (expand-curie s env)
          (if (and (data :typeof)
                   (not new-pred)
                   (not (data :resource)))
            (next-bnode)))
        (if (and new-pred (not-every? empty? (vals (env :incomplete))))
          (next-bnode)))))

(defn get-literal [data env]
  (if (data :content)
    (Literal. (data :content)
              (or (if-let [dt (not-empty (data :datatype))] (to-node env dt))
                  (or (data :lang) (env :lang))))))

(defn get-object [data env]
   (cond
    (data :resource)
     (expand-curie
       (data :resource) env)
     (and (or (data :rel) (data :rev) (data :property))
          (and (not (data :about)) (data :typeof)))
     (next-bnode)))

(defn get-props-rels-revs-lists [data env]
  (let [inlist (data :inlist)
        props (to-nodes env (data :property))
        rels (to-nodes env (data :rel))
        revs (to-nodes env (data :rev))]
    (if inlist
      [nil nil revs (or props rels)]
      [props rels revs nil])))

(defn next-state [el base-env]
  (let [data (get-data el)
        env (update-env base-env data)
        parent-o (env :parent-object)
        incomplete (env :incomplete)
        ;TODO: :incomplete-subject
        about (data :about)
        new-s (get-subject data env)
        s (or new-s parent-o)
        [props
         rels
         revs
         list-ps] (get-props-rels-revs-lists data env)
        o-resource (get-object data env)
        o-literal (get-literal data env)
        next-parent-o (or o-resource s)
        regular-triples (lazy-cat
                          (if o-literal
                            (for [p props] [s p o-literal]))
                          (if o-resource
                            (lazy-cat (for [p (if o-literal rels
                                                (concat props rels))]
                                        [s p o-resource])
                                      (for [p revs] [o-resource p s]))))
        types (if-let [expr (data :typeof)] (to-nodes env expr))
        type-triples (let [ts (if (or about (not o-resource)) s o-resource)]
                       (for [t types] [ts rdf:type t]))
        completed-triples (if next-parent-o
                            (let [{rels :rels revs :revs} incomplete]
                              (lazy-cat
                                (for [rel rels] [parent-o rel next-parent-o])
                                (for [rev revs] [next-parent-o rev parent-o]))))
        ; TODO: list-rels and list-props (for inlist with both o-l and o-r)
        o (or o-resource o-literal)
        new-list-map (into {} (lazy-cat
                                (for [p list-ps] [p (if o [o] [])])
                                (if (or new-s o-resource)
                                  (for [p (incomplete :list-ps)]
                                    [p [next-parent-o]]))))
        vocab-triples (if-let [v (data :vocab)]
                        [[(IRI. (env :base)) rdfa:usesVocabulary (IRI. v)]])
        env (cond
              (not-empty completed-triples)
              (assoc env
                     :incomplete {})
              (and (not o) (or rels revs list-ps))
              (assoc env
                     :incomplete
                     {:rels rels
                      :revs revs
                      :list-ps list-ps})
              (not= parent-o next-parent-o)
              (assoc-in env
                        [:incomplete :list-ps] {})
              :else env)
        env (assoc env :about about)
        env (assoc env :parent-object next-parent-o)
        env (assoc env :list-map new-list-map)]
    [env
     (lazy-cat type-triples
               completed-triples
               regular-triples
               vocab-triples)]))

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

(defn combine-element-visits [[prev-env prev-triples] child]
  (let [{{list-map :list-map} :env
         triples :triples} (visit-element child prev-env)]
    [(if (empty? list-map)
       prev-env
       (assoc prev-env :list-map list-map))
     (concat prev-triples triples)]))

(defn visit-element [el base-env]
  (let [[env triples] (next-state el base-env)
        about (env :about)
        s (env :parent-object)
        changed-s (not= s (base-env :parent-object))
        new-list-map (env :list-map)
        current-list-map (merge-with concat
                                     (base-env :list-map)
                                     (if about {} new-list-map))
        local-env (assoc env :list-map
                         (if changed-s
                           (if about new-list-map {})
                           current-list-map))
        [{combined-list-map :list-map}
         child-triples] (reduce
                          combine-element-visits [local-env nil]
                          (get-child-elements el))
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
     :triples (lazy-cat triples child-triples list-triples)}))

(defn extract-triples
  ([root base]
   (extract-triples root base :core))
  ([root base profile]
   (let [[prefix-map term-map vocab] (rdfa.profiles/registry profile)]
     (:triples (visit-element root (init-env base prefix-map term-map vocab))))))

