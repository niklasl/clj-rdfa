# RDFa extraction in Clojure

Extract triples from RDFa 1.1 XHTML and HTML documents using Clojure.

## Usage

For now, use the source. Or build a jar and just use that:

    $ lein uberjar
    $ java -jar rdfa-*-standalone.jar resources/test.html

## Development

Keep a test watcher running with:

    $ lein midje --lazytest

In a REPL, run:

    user=> (do (use 'rdfa.stddom :reload-all) (-main "resources/test.html"))

For interactive development, use e.g.:

    $ lein run -m vimclojure.nailgun.NGServer 127.0.0.1

Start an RDFa-to-NTriples web service using:

    $ lein ring server-headless

## License

Copyright (C) 2011, 2012 Niklas Lindström

Distributed under the Eclipse Public License, the same as Clojure.

