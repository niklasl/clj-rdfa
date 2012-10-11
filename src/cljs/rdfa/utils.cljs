(ns rdfa.utils
  (:require [goog.Uri :as uri]))

;; This is just a quick fix for a bug in goog.Uri: The problem is, 
;; that goog.Uri escapes characters of a path. But that should not 
;; happen (if at all) for URNs which are a subset of URIs.
(def goog.Uri.reDisallowedInRelativePath_ #"[\#\?]")

(defn resolve-iri [iref base]
  (if (not-empty iref)
    (.. (goog.Uri. base) (resolve (goog.Uri. iref)) (toString))
    base))