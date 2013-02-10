# RDFa extraction in Clojure

This is an implementation in Clojure for parsing [RDFa 1.1](http://rdfa.info/)
embedded in HTML, XHTML, SVG or other XML.

## Usage

This library runs on the JVM through regular Clojure. It can also run in a
JavaScript environment (eg. any modern browser or Node.js) by using
ClojureScript.

On the JVM, it uses the standard Java DOM for parsing XML, and the [CyberNeko
HTML Parser](http://nekohtml.sourceforge.net/) for HTML.

###  From Clojure

Example usage from Clojure can be seen in
[src/rdfa/cli.clj](https://github.com/niklasl/clj-rdfa/blob/master/src/rdfa/cli.clj).

### Command Line

Build a jar and just use that:

    $ lein uberjar
    $ java -jar rdfa-*-standalone.jar examples/test.html

### Web Interface

For a simple web interface, see [clj-rdfa-web](https://github.com/niklasl/clj-rdfa-web).

### From Java

* To use with **Jena**, see [clj-rdfa-jena](https://github.com/niklasl/clj-rdfa-jena).
* To use with **Sesame**, see [clj-rdfa-sesame](https://github.com/niklasl/clj-rdfa-sesame).

### From JavaScript

Projects written in [ClojureScript](https://github.com/clojure/clojurescript)
can use clj-rdfa by adding it as a dependency.

A cljs-based example project using clj-rdfa can be seen in
[examples/cljs-usage/](https://github.com/niklasl/clj-rdfa/tree/master/examples/cljs-usage/).

## Development

This is about developing the library itself.

Keep a test watcher running with:

    $ lein midje --lazytest

In a REPL, run:

    user=> (do (use 'rdfa.cli :reload-all) (-main "examples/test.html"))

For interactive development, use e.g.:

    $ lein run -m vimclojure.nailgun.NGServer 127.0.0.1

## License

Copyright (C) 2011-2013 Niklas Lindström

Distributed under the Eclipse Public License, the same as Clojure.

