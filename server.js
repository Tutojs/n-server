'use strict'
// node version: 12.4.0 [latest]
// to use ECMAscript modules without using .mjs:
// create package.json [recommended in root] and add this field to top level: "type": "module"
// package.json {"type" : "module"}
// node --experimental-modules server.js

// built-in modules START
import http from 'http'
import http2 from 'http2'
import url from 'url'
import fs from 'fs'
import path from 'path'
// built-in modules END

// json database START
// example database
import database from './database.json'
// {
// "admin": {}
// 
// post: [
//   {
//      "name" : "/",
//      "title": "Home",
//      "headline" : "Tutojs",
//      "content" : "<p>Tutojs is pure Nodejs</p>",
//      "author" : "Tuto"
//    },
//   {...},
//   {...},
//   {...},
// ]
// }
// json database END

// host START
const hostname = '[::1]' // localhost in IPV6
const port = {http: 80, https: 443} // default port of http and https
// host END

// __dirname and __filename don't exist in ECMAscript modules
// import.meta is equivalence witch return url of module import.meta = {url: "url-of-module"}
const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// media types list: https://www.iana.org/assignments/media-types/media-types.xhtml
// media types
const mediatypes = {
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
  '.webm': 'video/webm',
  '.weba': 'audio/webm'
}

// http server START
// redirect all http request to https
// http 301: Moved Permanently
http.createServer((request, response) => {
  response
    .writeHead(301, {'location': `https://${request.headers.host}${request.url}`})
    .end()
})
  .listen(port.http, hostname, () => {console.log('redirect to https')})
//http server END

// http2 secure server START
// to create key and cert files for self-signed ssl certificate use openssl, or use https://www.ssl.com/online-csr-and-key-generator
// set "allowHTTP1: true" to support both http 1 and 2 clients
http2.createSecureServer({key: fs.readFileSync('private.key'), cert: fs.readFileSync('certificate.cert'), allowHTTP1: true}, (request, response) => {
  console.log(JSON.stringify({method: request.method, url: request.url}))

  // key-value pairs HTTP POST START
  // key-value structure:
  // key-1=value-1&key-2=value-2&...&key-n=value-n
  // {key-1: value-1, key-2, value-2, ..., key-n: value-n}
  if (request.method === 'POST' && request.headers['content-type'] === 'application/x-www-form-urlencoded') {
    let body = Buffer.alloc(0)
    request
      .on('error', error => {
        response
          .writeHead(422, {"Content-type": "text/html"})
          .end(`<h2>${error.stack}</h2>`)
      })
      .on('data', chunk => {
        body = Buffer.concat([body, chunk])
        // maximum form size 1MB
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
            .end(`<h2>entry data is too large</h2>`)
          return
        }
        body = url.parse(`?${body.toString()}`, true).query
        // body = {key-1: value-1, key-2: value-2, ..., key-n, value-n}
        // do something with data
        response
          .writeHead(200, {"Content-type": "text/html"})
          .end(`your info:\n<h2>${JSON.stringify(body)}</h2>`)
      })
  }
  // key-value pairs HTTP POST END

  // multipart HTTP POST START
  // multipart structure:
  // --${boundary}\r\n
  // ${headers}\r\n
  // \r\n
  // ${data}\r\n
  // --${boundary}\r\n
  // ${headers}\r\n
  // \r\n
  // ${data}\r\n
  // --${boundary}--
  else if (request.method === 'POST' && request.headers['content-type'].match(/^.*?(?=; )/g)[0] === 'multipart/form-data') {
    let boundary = request.headers['content-type'].match(/(?<=boundary=).*?$/g)[0]
    let first_boundary = Buffer.from(`--${boundary}\r\n`)
    // let middle_boundary = Buffer.from(`\r\n--${raw_boundary}\r\n`)
    let last_boundary = Buffer.from(`\r\n--${boundary}--`)
    let separator = Buffer.from('\r\n\r\n')
    let multipart = Buffer.alloc(0)
    request
      .on('error', error => {
        response
          .writeHead(422, {"Content-type": "text/html"})
          .end(`<h2>${error.stack}</h2>`)
      })
      .on('data', chunk => {
        multipart = Buffer.concat([multipart, chunk])
        // maximum form size 32MB
        if (Buffer.byteLength(multipart) > 32*1024**2) {
          request
            .connection.destroy() // immediately fire 'end' event -> request.connection.destroyed will set to 'true'
        }
      })
      .on('end', ()=> {
        if (request.connection.destroyed === true) {
          response
            .writeHead(413, {"Content-type": "text/html"})
            .end(`<h2>entry data is too large</h2>`)
          return
        }
        // multipart parse START
        let header_start = multipart.indexOf(first_boundary) + first_boundary.length
        let header_end = multipart.indexOf(separator)
        let header = multipart.slice(header_start, header_end).toString()
        
        let field_name = header.match(/(?<name=").*?(?=")/g)[0]
        let file_name = header.match(/(?<filename=").*?(?=")/g)[0]
        
        let start_data = header_end + separator.length
        let end_data = multipart.indexOf(last_boundary)
        let data = multipart.slice(start_data, end_data)
        
        let data_of_form = {
          file: {
            [field_name]: data
          }
        }
        // fs.writeFileSync('./public/media/${file_name}', data_of_form.file.field_name)
        // multipart parse END
        response
          .writeHead(200, {"Content-type": "text/html"})
          .end(`<h2>file received</h2>`)
      })
  // multipart HTTP POST END
  }
  else {
    let { socket: { alpnProtocol } } = request.httpVersion === '2.0' ? request.stream.session : request
    console.log(JSON.stringify({alpnProtocol, httpVersion: request.httpVersion}))
    // static folder
    let staticfolder = 'public'
    let filepath = path.join(__dirname, staticfolder, request.url)
    let urlpath = path.normalize(request.url)
    request.url = urlpath === path.sep? urlpath: urlpath.replace(/[/\\]?$/, '')

    fs.stat(filepath, (error, stats) => {
      if (error || request.url === path.sep) {
        if (error) {
          if (error.code !== 'ENOENT') {
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
        
        // view template START
        let template = `<!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
            <link
              rel="stylesheet"
              href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css"
              integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm"
              crossorigin="anonymous">
            <title>${title}</title>
          </head>
          <body>
            <header class="text-center">
              <nav class="navbar navbar-expand-sm bg-dark navbar-dark">
                <a class="navbar-brand" href="https://localhost">${siteinfo.title}-${siteinfo.subtitle}</a>
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
            </header>
            <div id="carouselExampleIndicators" class="carousel slide" data-ride="carousel">
              <ol class="carousel-indicators">
                <li data-target="#carouselExampleIndicators" data-slide-to="0" class="active"></li>
                <li data-target="#carouselExampleIndicators" data-slide-to="1"></li>
                <li data-target="#carouselExampleIndicators" data-slide-to="2"></li>
              </ol>
              <div class="carousel-inner">
                <div class="carousel-item active">
                  <img class="d-block w-100 bg-primary" style="height:400px" src="" alt="First slide">
                  <div class="carousel-caption d-none d-md-block" style="background-color: rgba(52,58,64,0.25)">
                    <h5>Article 1</h5>
                    <p>article 1, first caption</p>
                  </div>
                </div>
                <div class="carousel-item">
                  <img class="d-block w-100 bg-danger" style="height:400px" src="" alt="Second slide">
                  <div class="carousel-caption d-none d-md-block" style="background-color: rgba(52,58,64,0.25)">
                    <h5>Article 2</h5>
                    <p>article 2, second caption</p>
                  </div>
                </div>
                <div class="carousel-item">
                  <img class="d-block w-100 bg-warning" style="height:400px" src="" alt="Third slide">
                  <div class="carousel-caption d-none d-md-block" style="background-color: rgba(52,58,64,0.25)">
                    <h5>Article 3</h5>
                    <p>article 3, third caption</p>
                  </div>
                </div>
              </div>
              <a class="carousel-control-prev" href="#carouselExampleIndicators" role="button" data-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                <span class="sr-only">Previous</span>
              </a>
              <a class="carousel-control-next" href="#carouselExampleIndicators" role="button" data-slide="next">
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                <span class="sr-only">Next</span>
              </a>
            </div>
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
                      <a class="nav-link" href="https://${hostname}/about">About</a>
                    </li>
                    <li class="nav-item">
                      <a class="nav-link" href="https://${hostname}">Link</a>
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
                    <input type="file" name="profile" multiple>
                    <button type="submit">Send</button>
                  </form>
                  <h2><a href="https://${hostname}${name}">${headline}</a></h2>
                  <h5>Title description, Jun 11, 2019</h5>
                  <div class="fakeimg">Fake Image</div>
                  ${content}
                  ${author}
                  <br>
                </div>
              </div>
            </div>
            <footer class="footer-area">
              <div class="container">
                <div class="row justify-content-between">
                  <div class="col-sm-6 col-md-6 col-xl-4">
                    <h4>About</h4>
                    <p>But when shot real her. Chamber her one visite removal six
                        sending himself boys scot exquisite existend an </p>
                    <p>But when shot real her hamber her</p>
                  </div>
                  <div class="col-sm-6 col-md-6 col-xl-4">
                    <h4>TUTOJS</h4>
                    <p>"Programming is like a self-service resturant, you can use everything but it's better to cook your meal" Tuto Arya</p>
                  </div>
                  <div class="col-sm-12 col-md-8 col-xl-3">
                    <h4>Latest Posts</h4>
                    <p>${database.post == undefined? 'No Post':
                    database.post
                      .slice(0, 5)
                      .map(el => `<a href="https://${hostname}${el.name}">${el.headline}</a>`)
                      .join('<br>')}
                    </p>
                  </div>
                </div>
              </div>
              <div class="container-fluid">
                <div class="row">
                  <div class="col-lg-12">
                    <div class="row">
                      <div class="col-lg-12">
                        <p class="text-center">Copyrightless</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
            <script
              src="https://code.jquery.com/jquery-3.2.1.slim.min.js"
              integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN"
              crossorigin="anonymous"></script>
            <script
              src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js"
              integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q"
              crossorigin="anonymous"></script>
            <script
              src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js"
              integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl"
              crossorigin="anonymous"></script>
          </body>
        </html>`
        response
          .writeHead(`${article === undefined? 404: 200}`, {"content-type": "text/html"})
          .end(template)
      }
      // view template END
      
      else {
        if (stats.isFile()) {
          // serve request file for client START
          fs.readFile(filepath, (error, data) => {
            if (error) {
              response
                .writeHead(500, {'content-type': 'text/html'})
                .end(`<h2>${error.stack}</h2><p>check with site admin</p>`)
              return
            }
            let { ext } = path.parse(filepath)
            let mediatype = mediatypes[ext.toLowerCase()] || 'application/octet-stream'
            response
              .writeHead(200, {'content-type': mediatype})
              .end(data)
          })
          // serve request file for client END
        }
        else if (stats.isDirectory()) {
          // serve request folder for client START
          fs.readdir(filepath, {encoding: 'utf8', withFileTypes: true}, (error, files) => {
            if (error) {
              response
                .writeHead(500, {'content-type': 'text/html'})
                .end(`<h2>${error.stack}</h2><p>check with site admin</p>`)
              return
            }
            let list = files.map(el => `<li><a href="https://${hostname}${request.url}/${el.name}">${el.name}</a></li>`)
            response
              .writeHead(200, {'content-type': 'text/html'})
              .end(`<ul>${list.join('')}</ul>`)
          })
          // serve request folder for client END
        }
      }
    })
  }
})
  .listen(port.https, hostname, () => {console.log(`server running on https://${hostname}:${port.https}`)})
// http2 secure server END
