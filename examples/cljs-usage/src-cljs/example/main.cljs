(ns example.main
  (:require rdfa.main rdfa.repr))

(defn init []
  (let [triples (:triples (rdfa.main/get-data js/document))
        repr (reduce str (map #(str (rdfa.repr/repr-triple %) "\n") triples))
        elem (.getElementById js/document "triples")]
    (set! (.-innerHTML elem) repr)))

(set! (.-onload js/window) init)
