(ns rdfa.test.core
  (:use midje.sweet)
  (:use [rdfa.core] :reload)
  (:import [rdfa.core IRI Literal BNode]))


(def env (init-env "./"
                   {"ns" "http://example.org/ns#"}
                   {"role" "http://example.org/ns#role"}
                   nil))

(def env-w-vocab (assoc env :vocab "http://example.org/vocab#"))

(facts

  (expand-curie "ns:name" env)
  => (IRI. "http://example.org/ns#name")

  (expand-curie "ns:name:first" env)
  => (IRI. "http://example.org/ns#name:first")

  (expand-curie "ns:/name" env)
  => (IRI. "http://example.org/ns#/name")

  (expand-curie "ns://name" env)
  => (IRI. "ns://name")

  (expand-curie "[ns:name]" env)
  => (IRI. "http://example.org/ns#name")

  (expand-curie "_:a" env)
  => (BNode. "a")

  (expand-curie "role" env)
  => (IRI. "http://example.org/ns#role")

  (expand-curie "other" env)
  => (IRI. "other")

  (expand-curie "role" env-w-vocab)
  => (IRI. "http://example.org/vocab#role")

  (expand-curie "other" env-w-vocab)
  => (IRI. "http://example.org/vocab#other") )

(facts

  (parse-prefix "ns: http://example.org/ns#")
  => {"ns" "http://example.org/ns#"}

  (parse-prefix "  ns:   http://example.org/ns#
                   voc: http://example.org/vocab#  ")
  => {"ns" "http://example.org/ns#", "voc" "http://example.org/vocab#"}

  (parse-prefix "")
  => nil )

