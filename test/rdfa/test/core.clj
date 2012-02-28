(ns rdfa.test.core
  (:use midje.sweet)
  (:use [rdfa.core] :reload)
  (:import [rdfa.core IRI Literal BNode]))


(def env (init-env "./"
                   {"ex" "http://example.org/ns#"}
                   {"role" "http://example.org/ns#role"}
                   nil))

(def env-w-vocab (assoc env :vocab "http://example.org/vocab#"))

(facts

  (expand-curie "ex:name" env)
  => (IRI. "http://example.org/ns#name")

  (expand-curie "ex:name:first" env)
  => (IRI. "http://example.org/ns#name:first")

  (expand-curie "ex:/name" env)
  => (IRI. "http://example.org/ns#/name")

  (expand-curie "ex://name" env)
  => (IRI. "ex://name")

  (expand-curie "[ex:name]" env)
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

