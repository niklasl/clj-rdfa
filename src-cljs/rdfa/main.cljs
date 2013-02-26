(ns rdfa.main
  (:require [rdfa.core :as core]
            [rdfa.jsdom :as jsdom]))

(defn get-data
  ([]
   (get-data js/document))
  ([doc]
   (let [document-element (.-documentElement doc)
         location (.-URL doc)]
     (core/extract-rdfa :html document-element location))))
