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
                    <form action='extract.txt' method='GET'>
                      (parse :url <input name='url' placeholder='nil' size='42' />
                      :to <button type='submit'>:triples</button>)
                    </form>
                  </body>
                 </html>")
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

