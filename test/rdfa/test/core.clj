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
  => [(IRI. "http://example.org/ns#name") nil]

  (expand-term-or-curie env "ns:name:first")
  => [(IRI. "http://example.org/ns#name:first") nil]

  (expand-term-or-curie env "ns:/name")
  => [(IRI. "http://example.org/ns#/name") nil]

  (expand-term-or-curie env "ns://name")
  => [nil {:malformed-curie "ns://name"}]

  (expand-term-or-curie env "[ns:name]")
  => [(IRI. "http://example.org/ns#name") nil]

  (expand-term-or-curie env "[unknown:name]")
  => [nil {:undefined-prefix "unknown"}]

  (expand-term-or-curie env "_:a")
  => [(BNode. "a") nil]

  (expand-term-or-curie env "role")
  => [(IRI. "http://example.org/ns#role") nil]

  (expand-term-or-curie env "other")
  => [nil {:undefined-term "other"}]

  (expand-term-or-curie env-w-vocab "role")
  => [(IRI. "http://example.org/vocab#role") nil]

  (expand-term-or-curie env-w-vocab "other")
  => [(IRI. "http://example.org/vocab#other") nil]

  (to-curie-or-iri env-w-vocab "other")
  => [(IRI. "other") nil] )


(facts

  (parse-prefix "ns: http://example.org/ns#")
  => {"ns" "http://example.org/ns#"}

  (parse-prefix "  ns:   http://example.org/ns#
                   voc: http://example.org/vocab#  ")
  => {"ns" "http://example.org/ns#", "voc" "http://example.org/vocab#"}

  (parse-prefix "  ns:   http://example.org/ns#
                   $invalid: http://example.org/any#
                   voc: http://example.org/vocab#  ")
  => {"ns" "http://example.org/ns#", "voc" "http://example.org/vocab#"}

  (parse-prefix "")
  => nil )

