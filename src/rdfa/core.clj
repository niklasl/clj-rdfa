(ns rdfa.core
  (:require rdfa.profiles)
  (:require [clojure.string :as string]))


(defprotocol DomAccess
  (get-child-elements [this])
  (get-attr [this attr-name])
  (get-content [this as-xml]))


(defrecord BNode [id])
(defrecord IRI [id])
(defrecord Literal [value tag])

(def bnode-counter (atom 0))

(defn next-bnode []
  (swap! bnode-counter inc)
  (BNode. @bnode-counter))


(let [rdf "http://www.w3.org/1999/02/22-rdf-syntax-ns#"]
  (def rdf:type (IRI. (str rdf "type")))
  (def rdf:XMLLiteral (IRI. (str rdf "XMLLiteral"))))


(defn resolve-iri [iref base]
  (if (not-empty iref)
    (.. (java.net.URI. base) (resolve iref) (toString))
    base))

(defn expand-curie
  ([repr env]
   (expand-curie
     repr (env :base) (env :prefix-map) (env :term-map) (env :vocab)))
  ([repr base prefix-map term-map vocab]
   (let [repr (string/replace-first repr #"^\[?(.*?)\]?$" "$1")
         to-iri #(IRI. (resolve-iri %1 base))]
     (cond
       (> (.indexOf repr ":") -1)
       (let [[pfx term] (string/split repr #":" 2)]
         (cond
           (= pfx "_")
           (BNode. term)
           (.startsWith term "//")
           (to-iri repr)
           :else
           (if-let [vocab (prefix-map pfx)]
             (to-iri (str vocab term))
             (to-iri repr))))
       (not-empty vocab)
       (to-iri (str vocab repr))
       :else
       (if-let [iri (term-map repr)]
         (to-iri iri)
         (to-iri repr))))))

(defn to-node [env repr]
  (expand-curie repr env))

(defn- to-tokens [expr]
  (string/split (string/trim expr) #"\s+"))

(defn to-nodes [env expr]
  (if (not-empty expr)
    (map #(to-node env %1) (to-tokens expr))))


(defn init-env
  ([base]
   (init-env base {} {} nil))
  ([base prefix-map term-map vocab]
   {:base base
    :parent-object (IRI. base)
    :prefix-map prefix-map
    :incomplete []
    :lang nil
    :term-map term-map
    :vocab vocab}))

(defn get-data [el]
  (let [attr #(get-attr el %1)
        property (attr "property")
        resource (or (attr "resource") (attr "href") (attr "src"))
        typeof (attr "typeof")
        datatype (attr "datatype")
        as-literal (and property (not (or typeof resource)))
        as-xml (= datatype (:id rdf:XMLLiteral))]
    {
     ;:nsmap (get-ns-map el) ;TODO: get xmlns; (merge nsmap prefix)
     :prefix (attr "prefix")
     :vocab (attr "vocab")
     :about (attr "about")
     :property property
     :rel (attr "rel")
     :rev (attr "rev")
     :resource resource
     :typeof typeof
     :content (or (attr "content")
                  (if as-literal (get-content el as-xml)))
     :lang (or (attr "lang") (attr "xml:lang"))
     :datatype datatype}))

(defn update-env [env data]
  (let [env (if-let [lang (data :lang)]
              (assoc env :lang lang)
              env)
        env (if-let [prefix (not-empty (string/trim (or (data :prefix) "")))]
              (update-in env [:prefix-map]
                         #(merge %1
                                 (apply hash-map
                                        (string/split prefix #":?\s+"))))
              env)
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
        (if (and (not-empty (env :incomplete)) (data :property)) (next-bnode))
        (env :parent-object))))

(defn get-object [data env]
  (or (if-let [o (if (or (data :rel) (data :rev) (data :property))
                    (data :resource))]
        (expand-curie o env))
      ; TODO: if new-pred-and-typeof-and-not-resource? (next-bnode)
      (if (data :content)
        (Literal. (data :content)
                  (or (if-let [dt (data :datatype)] (to-node env dt))
                      (or (data :lang) (env :lang)))))))

(defn next-state [el env]
  ; {:source (.getNodeName el) :line-nr nil}
  (let [data (get-data el)
        env (update-env env data)
        parent-o (env :parent-object)
        s (get-subject data env)
        props (to-nodes env (data :property))
        rels (to-nodes env (data :rel))
        revs (to-nodes env (data :rev))
        ps (concat props rels); TODO: separately if given both (link and content)
        o (get-object data env)
        types (if-let [expr (data :typeof)] (to-nodes env expr))
        type-triples (let [ts (if (or (data :about) (not o)) s o)]
                       (for [t types] [ts rdf:type t]))
        completed-triples (if s
                            (for [rel (env :incomplete)]
                              [parent-o rel s]))
        triples (concat type-triples
                        completed-triples
                        (if o (lazy-cat
                                (for [p ps] [s p o])
                                (for [p revs] [o p s]))))
        ; manage next :incomplete
        env (if s (assoc env :incomplete []) env)
        ; determine :parent-object or :incomplete
        env (cond
              (and o (not= (type o) Literal)) (assoc env :parent-object o)
              (data :about) (assoc env :parent-object s)
              :else (assoc env :incomplete ps))]
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
   (let [[iri-map term-map vocab] (rdfa.profiles/registry profile)]
     (visit-element root (init-env base iri-map term-map vocab)))))

