var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');

var port = 80;
var basepath = '../app/';

var whitelist = [
	'/index.html',
	'/style',
	'/js'
];

function extToContentType(file_ext) {
	var contentType;

	switch(file_ext) {
		case '.html':
			contentType = "text/html";
			break;
		case '.css':
			contentType = "text/css";
			break;
		case '.js':
			contentType = 'text/javascript';
			break;
	}

	return contentType;
}

function route( request, response ) {
	var pathname = url.parse(request.url).pathname;

	if(pathname == '/') {
		pathname = '/index.html';
	}

	if( whitelist.indexOf(pathname) > -1 || whitelist.indexOf('/' + pathname.split('/')[1]) > -1 ) {
		var file = fs.readFileSync(basepath + pathname);

		response.writeHead(200, { "Content-Type": extToContentType(path.extname(pathname)) });
		response.end(file);
	} else {
		response.writeHead(404, { "Content-Type": "text/plain" });
		response.write("404");
		response.end();
	}
}

function onRequest( request, response ) {
	var pathname = url.parse(request.url).pathname;
	
	// if request is not slug or REST function, assume file request
	// TODO: return json as Content-Type: application.json
	route(request, response);
}

http.createServer(onRequest).listen(port);
console.log("\nStarted");