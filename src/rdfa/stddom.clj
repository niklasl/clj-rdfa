(ns rdfa.stddom
  (:gen-class)
  (:require (rdfa core util))
  (:import [javax.xml.parsers DocumentBuilderFactory]
           [org.w3c.dom Node]))


(defn dom-parse [uri]
  (.. (DocumentBuilderFactory/newInstance) (newDocumentBuilder) (parse uri)))

(defn node-list [nl]
  (loop [index (dec (.getLength nl)) nodes nil]
    (if (= index -1) nodes
      (recur (dec index) (cons (.item nl index) nodes)))))

(extend-type Node
  rdfa.core/DomAccess
  (get-child-elements [this]
    (filter #(= (.getNodeType %1) Node/ELEMENT_NODE)
            (node-list (.getChildNodes this))))
  (get-attr [this attr-name]
    (if (.hasAttribute this attr-name) (.getAttribute this attr-name)))
  (get-content [this as-xml]
    ; TODO: recursively; support as-xml
    (apply str (map #(.getNodeValue %1)
                    (filter #(= (.getNodeType %1) Node/TEXT_NODE)
                            (node-list (.getChildNodes this)))))))

(defn extract-rdf [source]
  (let [root (.getDocumentElement (dom-parse source))
        baseElems (.getElementsByTagName root "base")
        base (or (if (> (.getLength baseElems) 0)
                   (not-empty (.getAttribute (.item baseElems 0) "href")))
                 (.. (java.io.File. source) (toURI) (toString)))]
    (rdfa.core/extract-triples root base)))

(defn -main [& args]
  (doseq [path args]
    (let [triples (extract-rdf path)]
      (doseq [triple triples]
        (-> triple rdfa.util/repr-triple println)))))

