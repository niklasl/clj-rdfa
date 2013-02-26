# Example ClojureScript project using clj-rdfa

## Requirements

Use the Leiningen build tool, and
[lein-cljsbuild](https://github.com/emezeske/lein-cljsbuild) for compiling
Clojure and ClojureScript to JavaScript.

This will also do crossover compilation of the clj-rdfa modules which this
project depends on.

## Development

To start a continuous cljs build, run the following command in this directory:

    $ lein cljsbuild auto

If an external dependency containing cljs code is updated (e.g. clj-rdfa
itself), you need to remove the cached crossover compilations:

    $ lein cljsbuild clean

