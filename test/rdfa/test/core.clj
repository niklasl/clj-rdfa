(ns rdfa.test.core
  (:use midje.sweet)
  (:use [rdfa.core])
  (:import [rdfa.core IRI Literal BNode]))


(fact (:base (init-env "path#frag" nil nil nil))
      => "path")


(def env (init-env "./"
                   {"ns" "http://example.org/ns#"}
                   {"role" "http://example.org/ns#role"}
                   nil))

(def env-w-vocab (assoc env :vocab "http://example.org/vocab#"))

(facts

  (expand-term-or-curie "ns:name" env)
  => (IRI. "http://example.org/ns#name")

  (expand-term-or-curie "ns:name:first" env)
  => (IRI. "http://example.org/ns#name:first")

  (expand-term-or-curie "ns:/name" env)
  => (IRI. "http://example.org/ns#/name")

  (expand-term-or-curie "ns://name" env)
  => (IRI. "ns://name")

  (expand-term-or-curie "[ns:name]" env)
  => (IRI. "http://example.org/ns#name")

  (expand-term-or-curie "_:a" env)
  => (BNode. "a")

  (expand-term-or-curie "role" env)
  => (IRI. "http://example.org/ns#role")

  (expand-term-or-curie "other" env)
  => (IRI. "other")

  (expand-term-or-curie "role" env-w-vocab)
  => (IRI. "http://example.org/vocab#role")

  (expand-term-or-curie "other" env-w-vocab)
  => (IRI. "http://example.org/vocab#other")

  (expand-curie "other" env-w-vocab)
  => (IRI. "other") )


(facts

  (parse-prefix "ns: http://example.org/ns#")
  => {"ns" "http://example.org/ns#"}

  (parse-prefix "  ns:   http://example.org/ns#
                   voc: http://example.org/vocab#  ")
  => {"ns" "http://example.org/ns#", "voc" "http://example.org/vocab#"}

  (parse-prefix "")
  => nil )

