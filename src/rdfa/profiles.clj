(ns rdfa.profiles
  (:require [rdfa.dom :as dom]))


(def contexts
  {:xml ; "http://www.w3.org/2011/rdfa-context/rdfa-1.1"
   {:prefix-map {"grddl" "http://www.w3.org/2003/g/data-view#",
                 "owl" "http://www.w3.org/2002/07/owl#",
                 "rdf" "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
                 "rdfa" "http://www.w3.org/ns/rdfa#",
                 "rdfs" "http://www.w3.org/2000/01/rdf-schema#",
                 "rif" "http://www.w3.org/2007/rif#",
                 "skos" "http://www.w3.org/2004/02/skos/core#",
                 "skosxl" "http://www.w3.org/2008/05/skos-xl#",
                 "wdr" "http://www.w3.org/2007/05/powder#",
                 "void" "http://rdfs.org/ns/void#",
                 "wdrs" "http://www.w3.org/2007/05/powder-s#",
                 "xhv" "http://www.w3.org/1999/xhtml/vocab#",
                 "xml" "http://www.w3.org/XML/1998/namespace",
                 "xsd" "http://www.w3.org/2001/XMLSchema#",
                 "cc" "http://creativecommons.org/ns#",
                 "ctag" "http://commontag.org/ns#",
                 "dc" "http://purl.org/dc/terms/",
                 "dcterms" "http://purl.org/dc/terms/",
                 "foaf" "http://xmlns.com/foaf/0.1/",
                 "gr" "http://purl.org/goodrelations/v1#",
                 "ical" "http://www.w3.org/2002/12/cal/icaltzd#",
                 "og" "http://ogp.me/ns#",
                 "rev" "http://purl.org/stuff/rev#",
                 "sioc" "http://rdfs.org/sioc/ns#",
                 "v" "http://rdf.data-vocabulary.org/#",
                 "vcard" "http://www.w3.org/2006/vcard/ns#",
                 "schema" "http://schema.org/"}
    :term-map {"describedby" "http://www.w3.org/2007/05/powder-s#describedby",
               "license" "http://www.w3.org/1999/xhtml/vocab#license",
               "role" "http://www.w3.org/1999/xhtml/vocab#role"}
    :vocab nil}
   :xhtml ; "http://www.w3.org/2011/rdfa-context/xhtml-rdfa-1.1"
   {:prefix-map {}
    :term-map {"alternate" "http://www.w3.org/1999/xhtml/vocab#alternate",
               "appendix" "http://www.w3.org/1999/xhtml/vocab#appendix",
               "cite" "http://www.w3.org/1999/xhtml/vocab#cite",
               "bookmark" "http://www.w3.org/1999/xhtml/vocab#bookmark",
               "contents" "http://www.w3.org/1999/xhtml/vocab#contents",
               "chapter" "http://www.w3.org/1999/xhtml/vocab#chapter",
               "copyright" "http://www.w3.org/1999/xhtml/vocab#copyright",
               "first" "http://www.w3.org/1999/xhtml/vocab#first",
               "glossary" "http://www.w3.org/1999/xhtml/vocab#glossary",
               "help" "http://www.w3.org/1999/xhtml/vocab#help",
               "icon" "http://www.w3.org/1999/xhtml/vocab#icon",
               "index" "http://www.w3.org/1999/xhtml/vocab#index",
               "last" "http://www.w3.org/1999/xhtml/vocab#last",
               "license" "http://www.w3.org/1999/xhtml/vocab#license",
               "meta" "http://www.w3.org/1999/xhtml/vocab#meta",
               "next" "http://www.w3.org/1999/xhtml/vocab#next",
               "prev" "http://www.w3.org/1999/xhtml/vocab#prev",
               "previous" "http://www.w3.org/1999/xhtml/vocab#previous",
               "section" "http://www.w3.org/1999/xhtml/vocab#section",
               "start" "http://www.w3.org/1999/xhtml/vocab#start",
               "stylesheet" "http://www.w3.org/1999/xhtml/vocab#stylesheet",
               "subsection" "http://www.w3.org/1999/xhtml/vocab#subsection",
               "top" "http://www.w3.org/1999/xhtml/vocab#top",
               "up" "http://www.w3.org/1999/xhtml/vocab#up",
               "p3pv1" "http://www.w3.org/1999/xhtml/vocab#p3pv1"}
    :vocab nil}})

; TODO: combine contexts properly!

(def contexts
  (assoc-in contexts [:xhtml :prefix-map]
            (get-in contexts [:xml :prefix-map])))

(def contexts
  (update-in contexts [:xhtml :term-map]
             #(merge %1 (get-in contexts [:xml :term-map]))))


(def contexts (assoc contexts :html (contexts :xhtml)))

(defn detect-host-language [&{:keys [location mime-type doctype xmlns]}]
  ; TODO: add support for the other options
  (cond
    (.endsWith location ".html") :html
    (.endsWith location ".xhtml") :xhtml
    :else :xml))


; TODO:
; - vary these functions by profile

(defn get-host-env [profile root]
  (let [base (if-let [el (first (dom/find-by-tag root "base"))]
               (dom/get-attr el "href"))
        context (contexts profile)]
    (assoc context
           :profile profile
           :base base)))

; TODO: :content and :datatype from @datetime for html5

(defn extended-data [env data]
  (let [profile (env :profile)
        el (data :element)
        tag (dom/get-name el)]
    (assoc data
           :base (if (= profile :xml) (dom/get-attr el "xml:base")
                   nil)
           :lang (or (data :lang) (dom/get-attr el "lang"))
           :about (or (data :about)
                      (if (and (or (= tag "head") (= tag "body"))
                            (not (data :resource)))
                        (:id (env :parent-object)))))))

