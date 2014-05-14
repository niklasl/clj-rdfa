(ns rdfa.repr
  (:require rdfa.core))

(defn quote-string [s]
  (str \" 
       (clojure.string/replace
        (clojure.string/replace s #"\""  "\\\\\"")
        #"\n" "\\\\n")
       \"))

(defn repr-term [term]
  (condp = (type term)
    rdfa.core.IRI (str "<" (:id term) ">")
    rdfa.core.Literal (let [{value :value tag :tag} term]
                        (str (quote-string value)
                             (cond
                              (= (type tag) rdfa.core.IRI) (str "^^" (repr-term tag))
                              (not-empty tag) (str "@" tag))))
    rdfa.core.BNode (str "_:" (:id term))
    (throw (IllegalArgumentException.
            (str "Cannot repr term: " term "(type: " (type term) ")")))))

(defn repr-triple [[s p o]]
  (str (repr-term s) " " (repr-term p) " " (repr-term o) " ."))

(defn repr-triples [triples]
  (reduce str (map #(str (repr-triple %) "\n") triples)))

