(ns rdfa.util
  (:import [rdfa.core IRI Literal BNode]))


(defn repr-term [term]
  (condp = (type term)
    IRI (str "<" (:id term) ">")
    Literal (let [{value :value tag :tag} term
                  qt (if (> (.indexOf value "\n") -1) "\"\"\"", \")]
              (str qt value qt
                   (cond
                     (= (type tag) IRI) (str "^^" (repr-term tag))
                     (not-empty tag) (str "@" tag))))
    BNode (str "_:" (:id term))))

(defn repr-triple [[s p o]]
  (str (repr-term s) " " (repr-term p) " " (repr-term o) " ."))

