(defproject
  rdfa "0.1.0-SNAPSHOT"
  :description "FIXME: write description"
  :dependencies [[org.clojure/clojure "1.3.0"]
                  [vimclojure/server "2.3.1"] ]
  :dev-dependencies [[lein-marginalia "0.6.0"]
                     [midje "1.3.2-SNAPSHOT"]
                     [lein-midje "[1.0.8,)"]
                     [com.stuartsierra/lazytest "1.2.3"]]
  :repositories {"stuartsierra-releases" "http://stuartsierra.com/maven2"}
  :main rdfa.core)
