(ns rdfa.utils)

(defn resolve-iri [iref base]
  (if (not-empty iref)
    ; NOTE: work around bug in java.net.URI for resolving against query string
    ; See e.g. org.apache.http.client.utils.
    ;   URIUtils#resolveReferenceStartingWithQueryString
    (if (.startsWith iref "?")
      (str (let [i (.indexOf base "?")]
             (if (> i -1) (subs base 0 i) base)) iref)
      (.. (java.net.URI. base) (resolve iref) (normalize) (toString)))
    base))
