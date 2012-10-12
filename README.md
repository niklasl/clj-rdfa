# RDFa extraction in Clojure

Extract triples from RDFa 1.1 XHTML and HTML documents using Clojure.

## Usage

This library targets two environments: It runs on the Java Virtual Machine (JVM) but can also be deployed to a JavaScript runtime environment (eg. any modern browser or Node.js).

###  Java Virtual Machine (JVM)

For now, use the source. Or build a jar and just use that:

    $ lein uberjar
    $ java -jar rdfa-*-standalone.jar examples/test.html

### JavaScript Runtime Environment

By now, clj-rdfa offers no JS API but can be included in a ClojureScript build process of another project. If you use Leinigen a build tool, simply include the clj-rdfa folder to your "checkouts" as described in the [Leinigen documentation](https://github.com/technomancy/leiningen/blob/master/doc/TUTORIAL.md#checkout-dependencies). You don't need to include clj-rdfa as dependency in your Leinigen project configuration.

Using [lein-cljsbuild](https://github.com/emezeske/lein-cljsbuild) to automate the ClojureScript build process is highly recommended. A example project configuration would be:

	(defproject com.example/my-project "1.0.0"
	  :dependencies [[org.clojure/clojure "1.4.0"]
	                 [org.clojure/clojure-contrib "1.2.0"]]
	  :plugins [[lein-cljsbuild "0.2.7"]]
	  :source-paths ["src/clj"]
	  :resource-paths ["resources"]
	  :cljsbuild {:builds [{:source-path "src/cljs"
	                        :compiler {:output-to "resources/public/js/app.js"}}]})

To start a build simply issue the following command in your project's folder:

	$ lein cljsbuild auto
	  Compiling ClojureScript.
	  Compiling "resources/public/js/app.js" from "src/cljs"...
	  Successfully compiled "resources/public/js/app.js" in 9.587729 seconds.


It should automatically find the cljs files of clj-rdfa, include them in the compilation of app.js and automatically detect changes to your cljs files.

Here is an example how to use clj-rdfa in your own ClojurScript code (taken from [knowl:edge](https://github.com/jocrau/knowl-edge)):

	(ns knowledge.rdfa
	  (:require [cljs.core :as cljs]
	            [clojure.browser.net :as net]
	            [clojure.browser.event :as event]
	            [clojure.browser.dom :as dom]
	            [rdfa.core :as core]
	            [rdfa.repr :as repr]
	            [rdfa.dom :as rdfadom]
	            [rdfa.stddom :as stddom]))

	(declare rdfa)
	(declare base)

	(defn export-graph [graph]
	  (let [connection (net/xhr-connection)
	        representation (repr/print-triples graph)
	        headers (cljs/js-obj "Content-Type" "text/turtle;charset=utf-8")
			base (.-origin (.-location js/document))]
	    (net/transmit connection
			(str base "/resource")
			"POST" 
			representation 
			headers)))

	(defn get-triples []
	  (let [document-element (.-documentElement js/document)
	        location (.-URL js/document)]
	    (:triples (core/extract-rdfa :html document-element location))))

	(def save-triples-handler
	  (fn [event] (export-graph (get-triples)))

	(defn init []
		(attach-handler "save-btn" save-triples-handler))


## Development

Keep a test watcher running with:

    $ lein midje --lazytest

In a REPL, run:

    user=> (do (use 'rdfa.cli :reload-all) (-main "examples/test.html"))

For interactive development, use e.g.:

    $ lein run -m vimclojure.nailgun.NGServer 127.0.0.1

## License

Copyright (C) 2011, 2012 Niklas Lindström

Distributed under the Eclipse Public License, the same as Clojure.

