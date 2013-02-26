(ns rdfa.test.repr
  (:use midje.sweet)
  (:use [rdfa.repr] :reload)
  (:import [rdfa.core IRI Literal BNode]))


(facts
  (repr-term (IRI. "http://example.org/"))
  => "<http://example.org/>"
  (repr-term (Literal. "hello" nil))
  => "\"hello\""
  (repr-term (Literal. "hello" "en"))
  => "\"hello\"@en"
  (repr-term (Literal.
               "data" (IRI. "http://example.org/ns#data")))
  => "\"data\"^^<http://example.org/ns#data>" )

(facts
  (repr-triple [(IRI. "http://example.org/thing")
                  (IRI. "http://example.org/ns#label")
                  (Literal. "thing" nil)])
  => "<http://example.org/thing> <http://example.org/ns#label> \"thing\" .")

