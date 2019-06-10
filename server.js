'use strict'
// to use ECMAscript modules: node --experimental-modules server.js

// modules START
import http from 'http'
import http2 from 'http2'
import url from 'url'
import fs from 'fs'
import path from 'path'
// modules END

// host START

const hostname = '[::1]' // localhost in IPV6
const port = {http: 80, https: 443} // default port of http and https
// host END

// __dirname and __filename don't exist in ECMAscript modules
// import.meta is equivalence witch return url of module {url: "url-of-module"}
const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// http server START
// redirect all http request to https
// http 301: Moved Permanently
http.createServer((request, response) => {
  response
    .writeHead(301, {'location': `https://${request.headers.host}${request.url}`})
    .end()
})
  .listen(port.http, hostname)
//http server END

// http2 secure server START
// to create key and cert files for self-signed ssl certificate use openssl, or use https://www.ssl.com/online-csr-and-key-generator
// set "allowHTTP1: true" to support both http 1 and 2 clients
http2.createSecureServer({key: fs.readFileSync('private.key'), cert: fs.readFileSync('certificate.cert'), allowHTTP1: true}, (request, response) => {
  console.log(JSON.stringify({method: request.method, url: request.url})))
})
// http2 secure server END
