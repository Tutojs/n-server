'use strict'
// node --experimental-modules server.js
import http from 'http'
import http2 from 'http2'
import url from 'url'
import fs from 'fs'
import path from 'path'

const hostname = '[::1]' // localhost: IPV6
const port = {http: 80, https: 443}

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

//http server START
// redirect all http to https
// http 301: Moved Permanently
http.createServer((request, response) => {
  response
    .writeHead(301, {'location': `https://${request.headers.host}${request.url}`})
    .end()
})
  .listen(port.http, hostname)
//http server END

//http2 secure server START
//create key and cert files by openssl, self-signed ssl certificate
http2.createSecureServer({key: fs.readFileSync('private.key'), cert: fs.readFileSync('certificate.cert'), allowHTTP1: true}, (request, response) => {
  console.log(JSON.stringify({method: request.method, url: request.url})))
//http2 secure server END
