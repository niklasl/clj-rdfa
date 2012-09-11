(defproject
  rdfa "0.5.1-SNAPSHOT"
  :description "A Clojure library for extracting triples from RDFa 1.1 in HTML/XHTML/SVG/XML"
  :url "https://github.com/niklasl/clj-rdfa"
  :license {:name "Eclipse Public License - v 1.0"
            :url "http://www.eclipse.org/legal/epl-v10.html"
            :distribution :repo}
  :dependencies [[org.clojure/clojure "1.4.0"]
                 [net.sourceforge.nekohtml/nekohtml "1.9.15"]]
  :profiles {:dev {:plugins [[lein-midje "2.0.0-SNAPSHOT"]]
                   :dependencies [[midje "1.4.0"]
                                  [com.stuartsierra/lazytest "1.2.3"]]}}
  :plugins [[lein-cljsbuild "0.2.7"]]
  :cljsbuild {:crossovers [rdfa.dom rdfa.profiles rdfa.core rdfa.repr]
              :crossover-jar true
              :crossover-path "src/crossover"
              :builds [{:source-path "src/cljs"
                        :jar true
                        :compiler {:output-to "resources/public/js/rdfa.js"
                                   :optimizations :whitespace
                                   :pretty-print true
                                   :print-input-delimiter true}}]}  :repositories {"stuartsierra-releases" "http://stuartsierra.com/maven2"}
  :source-paths ["src/clj" "src/cljs" "src/crossover"]
  :resource-paths ["resources"]
  :target-dir "target"
  :jar-exclusions [#"(?:^|/)\..+"]
  :main rdfa.cli
  :min-lein-version "2.0.0")
