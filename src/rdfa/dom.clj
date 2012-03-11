(ns rdfa.dom)


(defprotocol DomAccess
  (get-name [this])
  (get-attr [this attr-name])
  (get-ns-map [this])
  (is-root? [this])
  (find-by-tag [this tag])
  (get-child-elements [this])
  (get-text [this])
  (get-inner-xml [this xmlns-map lang]))

