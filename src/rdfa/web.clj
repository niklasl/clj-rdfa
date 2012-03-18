(ns rdfa.web
  (:use compojure.core
        [ring.adapter.jetty :only [run-jetty]])
  (:require [clojure.string :as string]
            [ring.util.response :as resp]
            [compojure.route :as route]
            [compojure.handler :as handler])
  (:require [rdfa.stddom :as impl]
            [rdfa.repr :as repr]))

(defroutes main-routes
           (GET "/" []
                (resp/resource-response "index.html" {:root "public"}))
           (GET "/extract.:ext" [ext url rdfagraph]
                (let [{triples :triples
                       proc-triples :proc-triples} (impl/get-rdfa url)
                      result-triples (if (= rdfagraph "processor")
                                       proc-triples
                                       triples)
                      turtle-result (string/join
                                      "\n"
                                      (map repr/repr-triple result-triples))
                      mime-type (if (= ext "txt") "text/plain" "text/turtle")]
                  {:status 200
                   :headers {"Content-Type" (str mime-type "; charset=utf-8")}
                   :body turtle-result}))
           (route/resources "/")
           (route/not-found "Not Found"))

(def app
  (handler/site main-routes))

(defn -main [port]
  (let [port (Integer. port)]
    (run-jetty app {:port port})))

