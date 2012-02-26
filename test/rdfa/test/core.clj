(ns rdfa.test.core
  (:use midje.sweet)
  (:use [rdfa.core] :reload))


(def env (init-env "./" {"ex" "http://example.org/ns#"} {} nil))

(facts

  (:base env)
  => "./"

  (:uri-map env)
  => {"ex" "http://example.org/ns#"}

  (expand-curie "ex:name" env)
  => "http://example.org/ns#name"

  (expand-curie "ex:name:first" env)
  => "http://example.org/ns#name:first"

  (expand-curie "ex:/name" env)
  => "http://example.org/ns#/name"

  (expand-curie "ex://name" env)
  => "ex://name"

  )

