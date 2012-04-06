(ns rdfa.cli
  (:gen-class)
  (:require (rdfa repr parser)))


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
          {:keys [env triples proc-triples]} (rdfa.parser/get-rdfa location)]
      (do
        ;(print-prefixes env)
        (print-triples triples)
        ; TODO: only if --proc in args
        (print-triples proc-triples)))))

