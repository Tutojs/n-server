'use strict'
// node --experimental-modules server.js
import http from 'http'
import http2 from 'http2'
import url from 'url'
import fs from 'fs'
import path from 'path'

import database from './database.json'

const hostname = '[::1]'
const port = {http: 80, https: 443}
//
const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.svg': 'application/image/svg+xml',
  '.wasm': 'application/wasm',
  '.webm': 'video/webm'
}


http.createServer((request, response) => {
  response
    .writeHead(301, {'location': `https://${request.headers.host}${request.url}`})
    .end()
})
  .listen(port.http, hostname)


http2.createSecureServer({key: fs.readFileSync('private.key'), cert: fs.readFileSync('certificate.cert'), allowHTTP1: true}, (request, response) => {
  console.log(JSON.stringify({method: request.method, url: request.url}))
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
        if (request.connection.destroyed === true) {
          response
            .writeHead(413, {"Content-type": "text/html"})
            .end(`<h1>entry data is too large</h1>`)}
        else {
          body = url.parse(`?${body.toString()}`, true).query
          let db = JSON.parse(fs.readFileSync('./public/test.json'))
            db.comments.unshift(body)
          let comment = JSON.stringify(db, null, 2)
          fs.writeFileSync('./public/test.json', comment)
          response
            .writeHead(200, {"Content-type": "text/html"})
            .end(`your info:\n<h2>${JSON.stringify(body)}</h2>`)
        }
        return
      })
  }
  else if (request.method === 'POST' && request.headers['content-type'].match(/^.*?(?=; )/g)[0] === 'multipart/form-data') {
    console.log(request.headers['content-type'].match(/(?<=boundary=).*?$/g)[0])
    let body = Buffer.alloc(0)
    request
      .on('error', error => console.error(error))
      .on('data', chunk => {
        body = Buffer.concat([body, chunk])
        console.log(request._readableState.highWaterMark)
      })
      .on('end', () => {
        console.log(body)
        response
          .writeHead(200, {"Content-type": "text/html"})
          .end(`your info:\n<h2>${body.toString()}</h2>`)
      })
    // there is several multipart parser you can choose by your own.
    // Tutorm will add
    // node --experimental-modules server.js
  }
  else {
    let { socket: { alpnProtocol } } = request.httpVersion === '2.0' ? request.stream.session : request
    console.log(JSON.stringify({alpnProtocol, httpVersion: request.httpVersion}))

    let staticfolder = 'public'
    let filepath = path.join(__dirname, staticfolder, request.url)
    let urlpath = path.normalize(request.url)
    request.url = urlpath === path.sep? urlpath: urlpath.replace(/[/\\]?$/, '')

    fs.stat(filepath, (error, stats) => {
      if (error || request.url === path.sep) {
        if (error) {
          if(error.code !== 'ENOENT') {
            response
              .writeHead(500, {'content-type': 'text/html'})
              .end(`<p>Sorry, check with the site admin for error: <br><b>${error.code}<b></p>`)
            return
          }
        }
        let { pathname } = url.parse(request.url)
          let siteinfo = {...database.admin.site}
          let article = {...database.post.find(post => post.name === pathname)}
          let {
            name = '/',
            title = '404 PAGE',
            headline= 'Return to Home page',
            content = '<h1>PAGE NOT FOUND!</h1><p>HTTP 404</p>',
            author = 'SERVER'
          } = article
          let template = `<!DOCTYPE html>
          <html lang="en">
          <head>
            <title>${title}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
            <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.0/jquery.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js"></script>
            <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js"></script>
            <style>
            .fakeimg {
              height: 200px;
              background: #aaa;
            }
            </style>
          </head>
          <body>
          
          <div class="jumbotron text-center" style="margin-bottom:0">
            <h1><a href="https://${hostname}">${siteinfo.title}</a></h1>
            <p>${siteinfo.subtitle}</p> 
          </div>
          
          <nav class="navbar navbar-expand-sm bg-dark navbar-dark">
            <a class="navbar-brand" href="#">Navbar</a>
            <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#collapsibleNavbar">
              <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="collapsibleNavbar">
              <ul class="navbar-nav">
                <li class="nav-item">
                  <a class="nav-link" href="https://${hostname}">Home</a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" href="https://${hostname}/about">About</a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" href="https://${hostname}/contact">Contact</a>
                </li>    
              </ul>
            </div>  
          </nav>
          
          <div class="container" style="margin-top:30px">
            <div class="row">
              <div class="col-sm-4">
                <h2>About Me</h2>
                <h5>Photo of me:</h5>
                <div class="fakeimg">Fake Image</div>
                <p>Some text about me in culpa qui officia deserunt mollit anim..</p>
                <h3>Some Links</h3>
                <p>Lorem ipsum dolor sit ame.</p>
                <ul class="nav nav-pills flex-column">
                  <li class="nav-item">
                    <a class="nav-link active" href="https://${hostname}">Home</a>
                  </li>
                  <li class="nav-item">
                    <a class="nav-link" href="https://localhost/about">About</a>
                  </li>
                  <li class="nav-item">
                    <a class="nav-link" href="#">Link</a>
                  </li>
                  <li class="nav-item">
                    <a class="nav-link disabled" href="#">Disabled</a>
                  </li>
                </ul>
                <hr class="d-sm-none">
              </div>
              <div class="col-sm-8">
                <form action="/" method="POST" enctype="multipart/form-data"><!--enctype="application/x-www-form-urlencoded"-->
                  <input name="name">
                  <input name="age">
                  <textarea name="text">Hello</textarea>
                  <select>
                    <option value="volvo">Volvo</option>
                    <option value="saab">Saab</option>
                    <option value="mercedes">Mercedes</option>
                    <option value="audi">Audi</option>
                  </select>
                  <input type="file" name="profile" multiple>
                  <button type="submit">Send</button>
                </form>
                <h2><a href="https://${hostname}${name}">${headline}</a></h2>
                <h5>Title description, Dec 7, 2017</h5>
                <div class="fakeimg">Fake Image</div>
                ${content}
                ${author}
                <br>
              </div>
            </div>
          </div>

          <div class="jumbotron text-center" style="margin-bottom:0">
            <p>Latest Posts</p>
            <p>${database.post == undefined? 'No Post':
            database.post
              .slice(0, 5)
              .map(el => `<a href="https://${hostname}${el.name}">${el.headline}</a>`)
              .join('<br>')}
            </p>
          </div>
          
          </body>
          </html>`
          response
            .writeHead(`${article === undefined? 404: 200}`, {"content-type": "text/html"})
            .end(template)
      }
      else {
        if (stats.isFile()) {
          fs.readFile(filepath, (error, data) => {
            if (error) console.log(error)
            else {
              let { ext } = path.parse(filepath)
              let mimetype = mime[ext.toLowerCase()] || 'application/octet-stream'
              response
                .writeHead(200, {'content-type': mimetype})
                .end(data)
            }
          })
        }
        else if (stats.isDirectory()) {
          fs.readdir(filepath, {encoding: 'utf8', withFileTypes: true}, (error, files) => {
            if (error) {console.error(error)}
            else {
              let list = files.map(el => `<li><a href="https://${hostname}${request.url}/${el.name}">${el.name}</a></li>`)
              console.log(files)
              response
                .writeHead(200, {'content-type': 'text/html'})
                .end(`<ul>${list.join('')}</ul>`)
            }
          })
        }
      }
    })
  }
})
  .listen(port.https, hostname, () => {console.log(`server running on https://${hostname}:${port.https}`)})

// node --experimental-modules server.js
