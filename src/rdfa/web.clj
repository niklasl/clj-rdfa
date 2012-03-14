(ns rdfa.web
  (:use compojure.core
        [ring.adapter.jetty :only [run-jetty]])
  (:require [clojure.string :as string]
            [compojure.route :as route]
            [compojure.handler :as handler])
  (:require [rdfa.stddom :as impl]
            [rdfa.repr :as repr]))

(defroutes main-routes
           (GET "/" []
                "<!DOCTYPE html>
                 <html>
                  <head>
                    <title>RDFa Triple Extractor in Clojure</title>
                 </head>
                  <body>
                    <h1>(use 'rdfa)</h1>
                    <form action='extract' method='GET'>
                      (parse :url <input name='url' placeholder='nil' size='42' />
                      :to <button type='submit'>:triples</button>)
                    </form>
                  </body>
                 </html>")
           (GET "/extract" [url rdfagraph]
                (let [{triples :triples
                       proc-triples :proc-triples} (impl/get-rdfa url)
                      result-triples (if (= rdfagraph "processor")
                                       proc-triples
                                       triples)
                      turtle-result (string/join
                                      "\n"
                                      (map repr/repr-triple result-triples))]
                  {:status 200
                   :headers {"Content-Type" "text/plain; charset=utf-8"}
                   :body turtle-result}))
           (route/resources "/")
           (route/not-found "Not Found"))

(def app
  (handler/site main-routes))

(defn -main [port]
  (let [port (Integer. port)]
    (run-jetty app {:port port})))

