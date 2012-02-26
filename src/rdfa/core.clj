(ns rdfa.core
  (:require [clojure.string :as string]))


(defprotocol DomAccess
  (get-child-elements [this])
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


(defn resolve-iri [ref base]
  (if (not-empty ref)
    (.. (java.net.URI. base) (resolve ref) (toString))
    base))

(defn expand-curie
  ([repr env]
   (expand-curie repr (env :uri-map) (env :term-map) (env :vocab)))
  ([repr uri-map term-map vocab]
   (if (> (.indexOf repr ":") -1)
    (let [[pfx term] (string/split repr #":" 2)]
      (if (.startsWith term "//")
        repr
        (if-let [vocab (uri-map pfx)]
          (str vocab term)
          repr)))
    (if-let [term (term-map repr)]
      term
      (str vocab repr)))))

(defn init-env
  ([base] (init-env base {}))
  ([base uri-map] (init-env base uri-map {}))
  ([base uri-map term-map]
   {:base base
    :parent-object (IRI. base)
    :uri-map uri-map
    :incomplete []
    :lang nil
    :term-map term-map
    :vocab nil}))

(defn get-data [el]
  (let [attr #(if (.hasAttribute el %1) (.getAttribute el %1))
        rel (attr "rel")
        rev (attr "rev")
        property (attr "property")
        resource (or (attr "resource") (attr "href") (attr "src"))
        typeof (attr "typeof")
        datatype (attr "datatype")
        as-literal (and property (not (or typeof resource)))]
    {:vocab (attr "vocab")
     :prefix (attr "prefix")
     :about (attr "about")
     :property property
     :rel rel :rev rev :resource resource :typeof typeof
     :content (or (attr "content")
                  (if as-literal
                    (get-content el (= datatype (:id rdf:XMLLiteral)))))
     :lang (or (attr "lang") (attr "xml:lang"))
     :datatype datatype
     :recurse (not as-literal)}))

(defn update-env [env data]
  (let [env (if-let [lang (data :lang)]
              (assoc env :lang lang)
              env)
        env (if-let [prefix (not-empty (string/trim (or (data :prefix) "")))]
              (update-in env [:uri-map]
                         #(merge %1
                                 (apply hash-map
                                        (string/split prefix #":?\s+"))))
              env)
        env (if-let [vocab (data :vocab)]
              (assoc env :vocab vocab)
              env)]
    env))

(defn to-term [env repr]
  (IRI. (expand-curie repr env)))

(defn to-tokens [expr]
  (string/split (string/trim expr) #"\s+"))

(defn to-terms [env expr]
  (if (not-empty expr)
    (map #(to-term env %1) (to-tokens expr))))

(defn get-subject [data env]
  (let [new-pred (or (data :rel) (data :rev) (data :property))]
    (or (if-let [s (or (data :about)
                       (if (not new-pred)
                         (data :resource)))]
          (IRI. (resolve-iri s (env :base)))
          (if (and (data :typeof) (not (data :resource)))
            (next-bnode)))
        (if (and (not-empty (env :incomplete)) (data :property)) (next-bnode))
        (env :parent-object))))

(defn get-object [data env]
  (or (if-let [o (if (or (data :rel) (data :rev) (data :property))
                    (data :resource))]
        (IRI. (resolve-iri o (env :base))))
      ; TODO: if new-pred-and-typeof-and-not-resource? (next-bnode)
      (if (data :content)
        (Literal. (data :content)
                  (or (if-let [dt (data :datatype)] (to-term env dt))
                      (or (data :lang) (env :lang)))))))

(defn next-state [el env]
  ; {:source (.getNodeName el) :line-nr nil}
  (let [data (get-data el)
        env (update-env env data)
        parent-o (env :parent-object)
        s (get-subject data env)
        props (to-terms env (data :property))
        rels (to-terms env (data :rel))
        revs (to-terms env (data :rev))
        ps (concat props rels); TODO: separately if given both (link and content)
        o (get-object data env)
        types (if-let [expr (data :typeof)] (to-terms env expr))
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
    [triples env (data :recurse)]))

(defn visit-element [el env]
  (let [[triples next-env recurse] (next-state el env)
        child-elements (if recurse (get-child-elements el))]
    (lazy-seq (concat triples
                      (mapcat #(visit-element %1 next-env) child-elements)))))

(defn extract-triples [root base]
    (visit-element root (init-env base)))

