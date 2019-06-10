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
  if (request.method === 'POST' && request.headers['content-type'] === 'application/x-www-form-urlencoded') {
    let body = Buffer.alloc(0)
    request
      .on('error', error => console.error(error))
      .on('data', chunk => {
        body = Buffer.concat([body, chunk])
        if (Buffer.byteLength(body) > 1024**2) {
          request
            .connection.destroy()
        }
      })
      .on('end', () => {
        // check if "end" event execution due to request.connection.destroy()
        if (request.connection.destroyed === true) {
          response
            .writeHead(413, {"Content-type": "text/html"})
            .end(`<h1>entry data is too large</h1>`)
        }
        else {
          body = url.parse(`?${body.toString()}`, true).query
          // body = {key-1: value-1, key-2: value-2, ..., key-n, value-n}
          // do anything with data
          response
            .writeHead(200, {"Content-type": "text/html"})
            .end(`your info:\n<h2>${JSON.stringify(body)}</h2>`)
        }
        return
      })
  }
  else if (request.method === 'POST' && request.headers['content-type'].match(/^.*?(?=; )/g)[0] === 'multipart/form-data') {
    let raw_boundary = request.headers['content-type'].match(/(?<=boundary=).*?$/g)[0]
    let first_boundary = Buffer.from(`--${raw_boundary}\r\n`)
    // let middle_boundary = Buffer.from(`\r\n${raw_boundary}--\r\n`)
    let last_boundary = Buffer.from(`\r\n--${raw_boundary}--`)
    let multipart = Buffer.alloc(0)
    request
      .on('error', error => {
        response
          .writeHead(422, {"Content-type": "text/html"})
          .end(`<h1>${error.message}</h1>`)
      })
      .on('data', chunk => {
        multipart = Buffer.concat([multipart, chunk])
        if (Buffer.byteLength(multipart) > this.options.maximum_field_inputs_size + this.options.maximum_file_inputs_size) {
          request
            .connection.destroy() // immediately fire 'end' event -> request.connection.destroyed will set to 'true'
        }
      })
      .on('end', ()=> {
        if (request.connection.destroyed === true) {
          response
            .writeHead(413, {"Content-type": "text/html"})
            .end(`<h1>entry data is too large</h1>`)
        }
        else {
          let header_start = multipart.indexOf(first_boundary) + first_boundary.length
          let header_end = multipart.indexOf(Buffer.from('\r\n\r\n'))
          let header = multipart.slice(header_start, header_end).toString()
          
          let start_data = header_end + header_end.length
          let end_data = multipart.indexOf(last_boundary)
          let data = multipart.slice(header_end + header_end.length, end_data)
      }
  }
})
// http2 secure server END
