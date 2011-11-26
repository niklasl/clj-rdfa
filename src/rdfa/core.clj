(ns rdfa.core
  (:require [clojure.string :as string])
  (:use [clojure.contrib.string :only (substring?)])
  (:import [javax.xml.parsers DocumentBuilderFactory]
           [org.w3c.dom Node]))


(defn dom-parse [uri]
  (.. (DocumentBuilderFactory/newInstance) (newDocumentBuilder) (parse uri)))

(defn node-list [nl]
  (loop [index (dec (.getLength nl)) nodes nil]
    (if (= index -1) nodes
      (recur (dec index) (cons (.item nl index) nodes)))))

(defn get-content [el as-xml]
  ; TODO: recursively; support as-xml
  (apply str (map #(.getNodeValue %1)
                (filter #(= (.getNodeType %1) Node/TEXT_NODE)
                        (node-list (.getChildNodes el))))))

(defrecord BNode [id])
(defrecord IRI [iri])
(defrecord Literal [value tag])

(def rdf-ns "http://www.w3.org/1999/02/22-rdf-syntax-ns#")
(def rdf-type (IRI. (str rdf-ns "type")))
(def rdf-XMLLiteral (IRI. (str rdf-ns "XMLLiteral")))

(defn repr-term [term]
  (let [t (type term)]
    (cond
      (= t IRI) (str "<" (:iri term) ">")
      (= t Literal) (str "\"" (:value term) "\""
                         (let [tag (:tag term)]
                           (cond
                             (= (type tag) IRI) (str "^^" (repr-term tag))
                             (not-empty tag) (str "@" tag))))
      (= t BNode) (str "_:" (:id term)))))

(defn repr-triple [[s p o]]
  (str (repr-term s) " " (repr-term p) " " (repr-term o) " ."))


(defn resolve-iri [ref base]
  (if (not-empty ref)
    (.. (java.net.URI. base) (resolve ref) (toString))
    base))

(defn expand-curie
  ([repr env]
   (expand-curie repr (env :uri-map) (env :term-map) (env :vocab)))
  ([repr uri-map term-map vocab]
   (if (substring? ":" repr)
    (let [[pfx term] (string/split repr #":")]
      (if-let [vocab (uri-map pfx)]
        (str vocab term)
        repr))
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
                    (get-content el (= datatype (:iri rdf-XMLLiteral)))))
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
  (map #(to-term env %1) (to-tokens expr)))

(defn get-subject [data env]
  ; TODO: (if (env :incomplete) and new predicate without new subject) BNode
  (or (if-let [it (or (data :about)
                      (if (not (or (data :rel) (data :rev) (data :property)))
                        (data :resource)))]
        (IRI. (resolve-iri it (env :base)))
        (if (data :typeof)
          (BNode. 0))) ; TODO: incr! bnode-counter
      (env :parent-object)))

(defn get-predicates [data env]
  (if-let [expr (or (data :property) (data :rel) (data :rev))]
    (to-terms env expr)))

(defn get-object [data env]
  (or (if-let [it (data :resource)] (IRI. (resolve-iri it (env :base))))
      (if (data :content)
        (Literal. (data :content) (or (if-let [dt (data :datatype)] (to-term env dt))
                                      (or (data :lang) (env :lang)))))))

(defn next-state [el env]
  ; {:source (.getNodeName el) :line-nr nil}
  (let [data (get-data el)
        env (update-env env data)
        s (get-subject data env)
        ps (get-predicates data env)
        o (get-object data env)
        types (if-let [expr (data :typeof)] (to-terms env expr))
        type-triples (for [t types] [s rdf-type t])
        triples (concat type-triples
                        (for [rel (env :incomplete)] [(env :parent-object) rel s])
                        (if o (for [p ps] [s p o])))
        env (cond
              (and o (not= (type o) Literal)) (assoc env :parent-object o)
              (data :about) (assoc env :parent-object s)
              :else (assoc env :incomplete ps))]
    [triples env (data :recurse)]))

(defn visit-element [el env]
  (let [[triples next-env recurse] (next-state el env)
        child-elements (if recurse (filter #(= (.getNodeType %1) Node/ELEMENT_NODE)
                                           (node-list (.getChildNodes el))))]
    (lazy-seq (concat triples
                      (mapcat #(visit-element %1 next-env) child-elements)))))

(defn extract-rdf [source]
  (let [doc (dom-parse source)
        docElem (.getDocumentElement doc)
        baseElems (.getElementsByTagName docElem "base")
        base (or (if (> (.getLength baseElems) 0)
                   (not-empty (.getAttribute (.item baseElems 0) "href")))
                 (.. (java.io.File. source) (toURI) (toString)))
        env (init-env base)]
    (visit-element docElem env)))


; user => (do (use 'rdfa.core :reload) (-main))
(defn -main [& args]
  (let [triples (extract-rdf "resources/test.html")]
    (doseq [triple triples]
      (-> triple repr-triple println))))

