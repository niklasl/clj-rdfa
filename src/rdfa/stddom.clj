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
  (get-attr [this attr-name]
    (if (.hasAttribute this attr-name) (.getAttribute this attr-name)))
  (get-ns-map [this]
    (into {}
          (for [attr (node-list (.getAttributes this))
                :when (.. attr (getNodeName) (startsWith "xmlns:"))]
            [(.. attr (getNodeName) (substring 6)) (.getValue attr)])))
  (find-by-tag [this tag]
    (node-list (.getElementsByTagName this tag)))
  (get-child-elements [this]
    (filter #(= (.getNodeType %1) Node/ELEMENT_NODE)
            (node-list (.getChildNodes this))))
  (get-text [this]
    (letfn [(get-values [node]
              (cons (if (= (.getNodeType node) Node/TEXT_NODE)
                      (.getNodeValue node))
                    (map get-values (node-list (.getChildNodes node)))))]
      (clojure.string/join (flatten (get-values this)))))
  (get-inner-xml [this xmlns-map lang]
    (let [doc (.getOwnerDocument this)
          frag (.createDocumentFragment doc)
          ser (.. doc (getImplementation) (createLSSerializer))]
      (doto (.getDomConfig ser)
        (.setParameter "xml-declaration" false))
      (doseq [node (node-list (.getChildNodes this))
              :let [node (.cloneNode node true)]]
        (if (= (.getNodeType node) Node/ELEMENT_NODE)
          (do
            (if (not-empty lang)
              (.setAttribute node "xml:lang" lang))
            (doseq [[pfx iri] xmlns-map]
              (let [qname (str "xmlns" (if pfx \:) pfx)]
                (.setAttribute node qname iri)))))
        (.appendChild frag node))
      (.writeToString ser frag))))

(defn extract-rdf [uri]
  (let [root (.getDocumentElement (dom-parse uri))
        base (or (if-let [el (first (rdfa.core/find-by-tag root "base"))]
                   (rdfa.core/get-attr el "href"))
                 uri)]
    (rdfa.core/extract-triples root base)))

(defn -main [& args]
  (doseq [path args]
    (let [uri (.. (java.net.URI. path) (toString))
          triples (extract-rdf uri)]
      (doseq [triple triples]
        (-> triple rdfa.util/repr-triple println)))))

