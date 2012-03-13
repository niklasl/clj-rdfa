(ns rdfa.web
  (:use compojure.core
        rdfa.stddom
        rdfa.repr)
  (:require [clojure.string :as string]
            [compojure.route :as route]
            [compojure.handler :as handler]))

(defroutes main-routes
           (GET "/" [] "<!DOCTYPE html>
                       <html>
                        <head></head>
                        <body>
                          <h1>Clj-RDFa</h1>
                          <form action='extract' method='GET'>
                            URL: <input name='url' />
                            <button type='submit'>Parse</button>
                          </form>
                        </body>
                       </html>")
           (GET "/extract" [url rdfagraph]
                 (let [{triples :triples
                        proc-triples :proc-triples} (get-rdfa url)
                       result-triples (if (= rdfagraph "processor")
                                        proc-triples
                                        triples)
                       turtle-result (string/join
                                       "\n"
                                       (map repr-triple result-triples))]
                   {:status 200
                    :headers {"Content-Type" "text/plain; charset=utf-8"}
                    :body turtle-result}))
           (route/resources "/")
           (route/not-found "Not Found"))

(def app
  (handler/site main-routes))

