(defproject
  example-cljs-rdfa-usage "0.1.0-SNAPSHOT"
  :dependencies [[rdfa "0.5.1-SNAPSHOT"]]
  :plugins [[lein-cljsbuild "0.2.9"]]
  :cljsbuild {:crossovers [rdfa.dom rdfa.profiles rdfa.core rdfa.repr]
              :builds [{:source-path "src-cljs"
                        :compiler {:output-to "target/js/main.js"
                                   :pretty-print true
                                   :print-input-delimiter true}}]})
