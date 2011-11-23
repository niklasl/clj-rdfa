(ns rdfa.core
  (:require [clojure.string :as s])
  (:import [javax.xml.parsers DocumentBuilderFactory]
           [org.w3c.dom Node]))


(defn dom-parse [uri]
  (.. (DocumentBuilderFactory/newInstance) (newDocumentBuilder) (parse uri)))

(defn node-list [nl]
  (loop [index (dec (.getLength nl)) nodes nil]
    (if (= index -1) nodes
      (recur (dec index) (cons (.item nl index) nodes)))))


(defrecord BNode [id])
(defrecord IRI [iri])
(defrecord Literal [value tag])

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


(defn init-env
  ([base] (init-env base {} {}))
  ([base uri-map] (init-env base uri-map {}))
  ([base uri-map term-map]
   {:base base
    ;:parent-subject base
    :parent-object base
    :uri-map uri-map
    :incomplete []
    :lang nil
    :term-map term-map
    :vocab nil}))

(defn get-data [el]
  (let [attr #(not-empty (.getAttribute el %1))
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
                    "TEXT"; # TODO: el text / xml
                    ))
     :lang (or (attr "lang") (attr "xml:lang"))
     :datatype datatype
     :recurse (not as-literal)}))

(defn update-env [env data]
  (let [env (if-let [lang (data :lang)]
              (assoc env :lang lang)
              env)
        env (if-let [vocab (data :vocab)]
              (assoc env :vocab vocab)
              env)]
    env))

; TODO: expand-curie...

(defn get-subject [data env]
  (or (if-let [it (or (data :about)
                      (if (not (or (data :rel) (data :rev) (data :property)))
                        (data :resource)))]
        (IRI. it))
      (env :parent-object)))

(defn get-predicates [data env]
  (if-let [repr (or (data :property) (data :rel) (data :rev))]
    (map #(IRI. %1) (s/split (s/trim repr) #"\s+"))))

(defn get-object [data curr-lang]
  (or (if-let [it (data :resource)] (IRI. it))
      (if (data :content)
        (Literal. (data :content) (or (if-let [dt (data :datatype)] (IRI. dt))
                                      (or (data :lang) curr-lang))))))

(defn next-state [el env]
  ; {:source (.getNodeName el) :line-nr nil}
  (let [data (get-data el)
        env (update-env env data)
        s (get-subject data env)
        ps (get-predicates data env)
        o (get-object data (env :lang))
        ; TODO: types (data :typeof) ...
        env (if (and o (not= (type o) Literal))
              (assoc env :parent-object o)
              (assoc env :incomplete ps))]
    [(if (and (not-empty ps) o) (for [p ps] [s p o]))
     env
     (data :recurse)]))

(defn visit-element [el env]
  (let [[triples next-env recurse] (next-state el env)
        child-elements (if recurse (filter #(= (.getNodeType %1) Node/ELEMENT_NODE)
                               (node-list (.getChildNodes el))))]
    (lazy-seq (let [result-triples
                    (mapcat #(visit-element %1 next-env) child-elements)]
                (concat triples result-triples)))))

(defn extract-rdf [source]
  (let [doc (dom-parse source)
        env (init-env (IRI. source))]
    (visit-element (.getDocumentElement doc) env)))


(defn -main [& args]
  (let [triples (extract-rdf "resources/test.html")]
    (doseq [triple triples]
      (-> triple repr-triple println))))

