(ns rdfa.test.core
  (:use midje.sweet)
  (:use [rdfa.core])
  (:import [rdfa.core IRI Literal BNode]))


(fact (:base (init-env "path#frag" {}))
      => "path")


(def env (init-env "./"
                   {:prefix-map {"ns" "http://example.org/ns#"}
                    :term-map {"role" "http://example.org/ns#role"}
                    :vocab nil}))

(def env-w-vocab (assoc env :vocab "http://example.org/vocab#"))

(facts

  (expand-term-or-curie env "ns:name")
  => (IRI. "http://example.org/ns#name")

  (expand-term-or-curie env "ns:name:first")
  => (IRI. "http://example.org/ns#name:first")

  (expand-term-or-curie env "ns:/name")
  => (IRI. "http://example.org/ns#/name")

  (expand-term-or-curie env "ns://name")
  => (IRI. "ns://name")

  (expand-term-or-curie env "[ns:name]")
  => (IRI. "http://example.org/ns#name")

  (expand-term-or-curie env "_:a")
  => (BNode. "a")

  (expand-term-or-curie env "role")
  => (IRI. "http://example.org/ns#role")

  (expand-term-or-curie env "other")
  => (IRI. "other")

  (expand-term-or-curie env-w-vocab "role")
  => (IRI. "http://example.org/vocab#role")

  (expand-term-or-curie env-w-vocab "other")
  => (IRI. "http://example.org/vocab#other")

  (expand-curie env-w-vocab "other")
  => (IRI. "other") )


(facts

  (parse-prefix "ns: http://example.org/ns#")
  => {"ns" "http://example.org/ns#"}

  (parse-prefix "  ns:   http://example.org/ns#
                   voc: http://example.org/vocab#  ")
  => {"ns" "http://example.org/ns#", "voc" "http://example.org/vocab#"}

  (parse-prefix "")
  => nil )

