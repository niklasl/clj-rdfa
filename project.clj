(defproject
  rdfa "0.1.0-SNAPSHOT"
  :description "A Clojure library for extracting triples from RDFa 1.1 in XML/XHTML/HTML"
  :url "https://github.com/niklasl/clj-rdfa"
  :dependencies [[org.clojure/clojure "1.3.0"]
                 ;[nu.validator.htmlparser/htmlparser "1.2.1"]
                 [net.sourceforge.nekohtml/nekohtml "1.9.15"]
                 [compojure "1.0.1"]
                 [ring/ring-core "1.0.2"]
                 [ring/ring-jetty-adapter "1.0.1"]
                 [ring/ring-devel "1.0.1"]]
  :dev-dependencies [[midje "1.3.2-SNAPSHOT"]
                     [lein-midje "[1.0.8,)"]
                     [com.stuartsierra/lazytest "1.2.3"]
                     [lein-marginalia "0.6.0"]
                     [lein-ring "0.5.4"]
                     [vimclojure/server "2.3.1"]]
  :repositories {"stuartsierra-releases" "http://stuartsierra.com/maven2"}
  :ring {:handler rdfa.web/app}
  :main rdfa.stddom)
