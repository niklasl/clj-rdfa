(ns rdfa.repr
  (:require rdfa.core)
  (:import [rdfa.core IRI Literal BNode]))


(defn repr-term [term]
  (condp = (type term)
    IRI (str "<" (:id term) ">")
    Literal (let [{value :value tag :tag} term
                  qt (if (re-find #"\n|\"" value) "\"\"\"", \")]
              (str qt value qt
                   (cond
                     (= (type tag) IRI) (str "^^" (repr-term tag))
                     (not-empty tag) (str "@" tag))))
    BNode (str "_:" (:id term))
    (throw (IllegalArgumentException.
             (str "Cannot repr term: " term "(type: " (type term) ")")))))

(defn repr-triple [[s p o]]
  (str (repr-term s) " " (repr-term p) " " (repr-term o) " ."))

