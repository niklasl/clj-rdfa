(ns rdfa.core
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
        resource (or (attr "resource") (attr "href") (attr "src"))
        typeof (attr "typeof")
        datatype (attr "datatype")
        as-literal? (not (or rel rev typeof resource))]
    {:vocab (attr "vocab")
     :prefix (attr "prefix")
     :about (attr "about")
     :property (attr "property")
     :rel rel :rev rev :resource resource :typeof typeof
     :content (or (attr "content")
                  (if as-literal?
                    "TEXT"; # TODO: el text / xml
                    ))
     :lang (or (attr "lang") (attr "xml:lang"))
     :datatype datatype
     :recurse (not as-literal?)}))

(defn get-subject [data env]
  (or (#(if %1 (IRI. %1)) (data :about)) (env :parent-object)))

(defn get-predicates [data env]
  (#(if %1 (IRI. %1)) (or (data :property) (data :rel) (data :rev))))

(defn get-objects [data env]
  (or (#(if %1 (IRI. %1)) (data :resource))
      (if (data :content)
        (Literal. (data :content) (or (#(if %1 (IRI. %1)) (data :datatype))
                                      (or (data :lang) (env :lang)))))))

(defn next-state [el env]
  ; {:source (.getNodeName el) :line-nr nil}
  (let [data (get-data el)
        env (if (data :lang)
              (assoc env :lang (data :lang))
              env)
        s (get-subject data env)
        p (get-predicates data env)
        o (get-objects data env)
        env (if (and o (not= (type o) Literal))
              (assoc env :parent-object o)
              (assoc env :incomplete p))]
    ; TODO: sub-env and multiple triples (*p *o)
    [env
     (if (and p o)
       [s p o])]))

(defn extract-rdf [source]
  (let [doc (dom-parse source)
        env (init-env (IRI. source))]
    (visit-element (.getDocumentElement doc) env)))

(defn visit-element [el env]
  (let [[next-env triple] (next-state el env)
        ; TODO: return and check recurse true/false from next-state
        child-elements (filter #(= (.getNodeType %1) Node/ELEMENT_NODE)
                               (node-list (.getChildNodes el)))]
    (lazy-seq (let [triples
                    (mapcat #(visit-element %1 next-env) child-elements)]
                (if triple (cons triple triples) triples)))))

(defn term-repr [term]
  (let [t (type term)]
    (cond
      (= t IRI) (str "<" (:iri term) ">")
      (= t Literal) (str "\"" (:value term) "\""
                         (if (= (type (:tag term)) IRI)
                           (str "^^" (term-repr (:tag term)))
                           (str "@" (:tag term))))
      (= t BNode) (str "_:" (:id term)))))

(defn triple-repr [[s p o]]
  (str (term-repr s) " " (term-repr p) " " (term-repr o) " ."))


(defn -main [& args]
  (let [triples (extract-rdf "resources/test.html")]
    (doseq [triple triples]
      (-> triple triple-repr println))))

