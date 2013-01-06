(ns rdfa.repr
  (:require rdfa.core))


(defn repr-term [term]
  (condp = (type term)
    rdfa.core.IRI (str "<" (:id term) ">")
    rdfa.core.Literal (let [{value :value tag :tag} term
                  qt (if (re-find #"\n|\"" value) "\"\"\"", \")]
              (str qt value qt
                   (cond
                     (= (type tag) rdfa.core.IRI) (str "^^" (repr-term tag))
                     (not-empty tag) (str "@" tag))))
    rdfa.core.BNode (str "_:" (:id term))
    (throw (IllegalArgumentException.
             (str "Cannot repr term: " term "(type: " (type term) ")")))))

(defn repr-triple [[s p o]]
  (str (repr-term s) " " (repr-term p) " " (repr-term o) " ."))

