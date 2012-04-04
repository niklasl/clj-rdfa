(ns rdfa.stddom
  (:gen-class)
  (:require (rdfa dom profiles core repr))
  (:import [org.w3c.dom Node]
           [javax.xml.parsers DocumentBuilderFactory]
           ;[nu.validator.htmlparser.dom HtmlDocumentBuilder]
           [org.apache.xerces.parsers DOMParser]
           [org.cyberneko.html HTMLConfiguration]))


(defn dom-parse [uri]
  (let [factory (doto (DocumentBuilderFactory/newInstance)
                  (.setFeature
                    "http://apache.org/xml/features/nonvalidating/load-external-dtd"
                    false))
        builder  (.newDocumentBuilder factory)]
    (.parse builder uri)))

;(defn html-dom-parse [uri]
;  (.. (doto (HtmlDocumentBuilder.)) (parse uri)))

(defn html-dom-parse [uri]
  (.. (doto (DOMParser.
              (doto (HTMLConfiguration.)
                (.setProperty "http://cyberneko.org/html/properties/names/elems"
                              "lower")
                ; TODO: parser should get this from http content-type header;
                ; at least support a manually provided encoding.
                (.setProperty "http://cyberneko.org/html/properties/default-encoding"
                              "utf-8")))
        (.setFeature "http://xml.org/sax/features/namespaces" false)
        (.parse uri))
    (getDocument)))

(defn node-list [nl]
  (loop [index (dec (.getLength nl)) nodes nil]
    (if (= index -1) nodes
      (recur (dec index) (cons (.item nl index) nodes)))))

(extend-type Node
  rdfa.dom/DomAccess
  (get-name [this]
    (.getNodeName this))
  (get-attr [this attr-name]
    (if (.hasAttribute this attr-name) (.getAttribute this attr-name)))
  (get-ns-map [this]
    (into {}
          (for [attr (node-list (.getAttributes this))
                :when (.. attr (getNodeName) (startsWith "xmlns:"))]
            [(.. attr (getNodeName) (substring 6)) (.getValue attr)])))
  (is-root? [this]
    (.isSameNode this (.. this (getOwnerDocument) (getDocumentElement))))
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

(defn get-rdfa [location]
  (try (let [profile (rdfa.profiles/detect-host-language :location location)
             do-parse (if (= profile :html) html-dom-parse dom-parse)
             root (.getDocumentElement (do-parse location))]
         (rdfa.core/extract-rdfa profile root location))
    (catch Exception e
      (rdfa.core/error-results (.getMessage e) "en"))))

; TODO: would be more useful if env contained data about *used* prefixes.
;(defn print-prefixes [{prefix-map :prefix-map vocab :vocab}]
;  (letfn [(printpfx [pfx iri]
;            (println (str "@prefix " pfx ": <" iri "> .")))]
;    (if vocab (printpfx "" vocab))
;    (doseq [[pfx iri] prefix-map]
;      (printpfx pfx iri))))

(defn print-triples [triples]
  (doseq [triple triples]
    (-> triple rdfa.repr/repr-triple println)))

(defn -main [& args]
  (doseq [path args]
    (let [location (.. (java.net.URI. path) (toString))
          {env :env
           triples :triples
           proc-triples :proc-triples} (get-rdfa location)]
      (do
        ;(print-prefixes env)
        (print-triples triples)
        ; TODO: only if --proc in args
        (print-triples proc-triples)))))

