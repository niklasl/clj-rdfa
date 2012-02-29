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

(def bnode-counter (atom 0))

(defn next-bnode []
  (swap! bnode-counter inc)
  (BNode. (str "gen" @bnode-counter)))


(let [rdf "http://www.w3.org/1999/02/22-rdf-syntax-ns#"]
  (def rdf:type (IRI. (str rdf "type")))
  (def rdf:XMLLiteral (IRI. (str rdf "XMLLiteral")))
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
           (= pfx "_") (BNode. term)
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
      :incomplete []
      :list-map {}
      :lang nil
      :prefix-map prefix-map
      :term-map term-map
      :vocab vocab})))

(defn get-data [el]
  (let [attr #(get-attr el %1)
        property (attr "property")
        resource (or (attr "resource") (attr "href") (attr "src"))
        typeof (attr "typeof")
        datatype (attr "datatype")
        prefix-map (parse-prefix (attr "prefix"))
        as-literal (and property (not (or typeof resource)))
        as-xml (= datatype (:id rdf:XMLLiteral))]
    {:tag (.getNodeName el); :line-nr (... el)
     :prefix-map (merge (get-ns-map el) prefix-map)
     :vocab (attr "vocab")
     :about (attr "about")
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
          (if (and (data :typeof) (not (data :resource)))
            (next-bnode)))
        (if (and new-pred (not-empty (env :incomplete)))
          (next-bnode)))))

(defn get-object [data env]
  (cond
    (data :resource)
    (expand-curie (data :resource) env)
    (data :content)
    (Literal. (data :content)
              (or (if-let [dt (not-empty (data :datatype))] (to-node env dt))
                  (or (data :lang) (env :lang))))
    (or (and (or (data :rel) (data :rev)) (data :resource))
        (and (data :property) (data :typeof)))
    (next-bnode)))

(defn next-state [el env]
  (let [data (get-data el)
        env (update-env env data)
        parent-o (env :parent-object)
        incomplete (env :incomplete)
        new-s (get-subject data env)
        s (or new-s parent-o)
        props (to-nodes env (data :property))
        rels (to-nodes env (data :rel))
        revs (to-nodes env (data :rev))
        ps (concat props rels); TODO: separately if given both (link and content)
        o (get-object data env)
        new-parent-o (if (and o (not= (type o) Literal)) o s)
        types (if-let [expr (data :typeof)] (to-nodes env expr))
        type-triples (let [ts (if (or (data :about) (not o)) s o)]
                       (for [t types] [ts rdf:type t]))
        completed-triples (if (and new-parent-o incomplete)
                            (let [[rels revs] incomplete]
                              (lazy-cat
                                (for [rel rels] [parent-o rel new-parent-o])
                                (for [rev revs] [new-parent-o rev parent-o]))))
        triples (concat type-triples
                        completed-triples
                        (if o (lazy-cat
                                (for [p ps] [s p o])
                                (for [p revs] [o p s])))
                        (if-let [v (data :vocab)]
                          [[(IRI. (env :base)) rdfa:usesVocabulary (IRI. v)]]))
        ; TODO: if (data :inlist)
        ;DEBUG:_ (println {:tag (data :tag) :incomplete incomplete})
        env (cond
              (not-empty completed-triples) (assoc env :incomplete [])
              (and (not o) (or rels revs)) (assoc env :incomplete [rels revs])
              :else env)
        env (if new-parent-o
              (assoc env :parent-object new-parent-o)
              env)]
    [triples env]))

(defn visit-element [el env]
  (let [[triples next-env] (next-state el env)
        child-elements (get-child-elements el)]
    (lazy-seq (concat triples
                      (mapcat #(visit-element %1 next-env) child-elements)))))

(defn extract-triples
  ([root base]
      (extract-triples root base :core))
  ([root base profile]
   (let [[prefix-map term-map vocab] (rdfa.profiles/registry profile)]
     (visit-element root (init-env base prefix-map term-map vocab)))))

