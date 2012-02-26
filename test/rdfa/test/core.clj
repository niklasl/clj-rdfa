(ns rdfa.test.core
  (:use [rdfa.core] :reload)
  ;(:use [clojure.test])
  (:use midje.sweet))


(facts
  (repr-term (rdfa.core.IRI. "http://example.org/"))
  => "<http://example.org/>"
  (repr-term (rdfa.core.Literal. "hello" nil))
  => "\"hello\""
  (repr-term (rdfa.core.Literal. "hello" "en"))
  => "\"hello\"@en"
  (repr-term (rdfa.core.Literal.
               "data" (rdfa.core.IRI. "http://example.org/ns#data")))
  => "\"data\"^^<http://example.org/ns#data>" )

(def env (init-env "./" {"ex" "http://example.org/ns#"}))

(facts
  (:base env)
  => "./"
  (:uri-map env)
  => {"ex" "http://example.org/ns#"} )

(facts
  (expand-curie "ex:name" env)
  => "http://example.org/ns#name"
  (expand-curie "ex:name:first" env)
  => "http://example.org/ns#name:first"
  (expand-curie "ex:/name" env)
  => "http://example.org/ns#/name"
  (expand-curie "ex://name" env)
  => "ex://name" )

