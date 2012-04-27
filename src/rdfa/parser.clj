(ns rdfa.parser
  (:require (rdfa stddom profiles core))
  (:import [javax.xml.parsers DocumentBuilderFactory]
           ;[nu.validator.htmlparser.dom HtmlDocumentBuilder]
           [org.apache.xerces.parsers DOMParser]
           [org.cyberneko.html HTMLConfiguration]))


(defn dom-parse [source]
  (let [factory (doto (DocumentBuilderFactory/newInstance)
                  (.setFeature
                    "http://apache.org/xml/features/nonvalidating/load-external-dtd"
                    false))
        builder  (.newDocumentBuilder factory)]
    (.parse builder source)))

;(defn html-dom-parse [source]
;  (.. (doto (HtmlDocumentBuilder.)) (parse source)))

(defn html-dom-parse [source]
  (.. (doto (DOMParser.
              (doto (HTMLConfiguration.)
                (.setProperty "http://cyberneko.org/html/properties/names/elems"
                              "lower")
                ; TODO: parser should get this from http content-type header;
                ; at least support a manually provided encoding.
                (.setProperty "http://cyberneko.org/html/properties/default-encoding"
                              "utf-8")))
        (.setFeature "http://xml.org/sax/features/namespaces" false)
        (.parse (org.xml.sax.InputSource. source)))
    (getDocument)))


(defn get-rdfa
  ([location]
   (get-rdfa location location))
  ([source location]
   (let [profile (rdfa.profiles/detect-host-language :location location)]
     (get-rdfa source location profile)))
  ([source location profile]
   (try (let [do-parse (if (= profile :html) html-dom-parse dom-parse)
              root (.getDocumentElement (do-parse source))]
          (rdfa.core/extract-rdfa profile root location))
     (catch Exception e
       (rdfa.core/error-results (.getMessage e) "en")))))

