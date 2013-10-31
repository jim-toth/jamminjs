var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');
var _request = require('request');
var MongoClient = require('mongodb').MongoClient;
var format = require('util').format;

var port = 80;
var mongohost = 'localhost';
var mongoport = 27017;
var basepath = '../app/';

// Whitelist of allowed files/directories
var whitelist = [
	'/index.html',
	'/style',
	'/js'
];

/**
 * File extension to content-type
 */
function extToContentType( ext ) {
	var contentType;

	switch(ext) {
		case '.html':
			contentType = "text/html";
			break;
		case '.css':
			contentType = "text/css";
			break;
		case '.js':
			contentType = 'text/javascript';
			break;
		case '.json':
			contentType = 'application/json';
			break;
		default:
			contentType = 'text/plain';
			break;
	}

	return contentType;
}

/**
 * Routes file requests through whitelist.
 *
 * Sends 200 response with file if allowed.
 * Sends 404 response if not found in whitelist.
 */
function route( request, response ) {
	var pathname = url.parse(request.url).pathname;

	if(pathname == '/') {
		pathname = '/index.html';
	}

	// Allow direct file requests from whitelist or root directory from whitelist (only domain/root)
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

/**
 * Handles /p/laylist requests.
 *
 * Sends 200 when GET and playlist has been found along with playlist JSON.
 * Sends 404 when GET and playlist has not been found.
 */
function routePlaylist( request, response ) {
	var pathname = url.parse(request.url).pathname;
	var pathpcs = pathname.split('/');

	// Get playlist ID
	var pid;
	if (pathpcs.length > 2 && pathpcs[2] != '') {
		pid = pathpcs[2];
	}

	var playlistFound = false;

	if(typeof pid != 'undefined') {
		MongoClient.connect(format("mongodb://%s:%s/linktape", mongohost, mongoport), function(err, db) {

			// Everything below this line is in a different "thread" as MongoClient.connect is asynchronous.
			// The original thread has *probably* ended, but you can still reference memory from it.
			// e.g. I can use pid in the findOne call despite it being declared in another "thread."
			// This function's scope contains routePlaylist's scope at the time this thread was spawned.

			if(err) {
				// Error while attempting to connect to Mongo
				response.writeHead(500, { "Content-Type": "text/plain" });
				response.write("An error has occurred.");
				response.end();

				console.log('Could not connect to Mongo DB!');
			} else {

				// This function is ALSO asynchronous and in a NEW "thread"

				// Attempt to find playlist by ID and send the appropriate response.
				console.log("Attempting to find playlist with ID: " + pid);
				db.collection('playlists').findOne({"pid": pid}, function(err, playlist) {
					if(err) { 
						// Error while searching Mongo
						response.writeHead(500, { "Content-Type": "text/plain" });
						response.write("Could not connect to Mongo DB!");
						response.end();
					} else {
						if(playlist != null) {
							// Found playlist.
							response.writeHead(200, { "Content-Type": "application/json" });
							playlist._id = undefined;
							response.write(JSON.stringify(playlist));
							response.end();
						} else {
							// Could not find playlist.
							response.writeHead(404, { "Content-Type": "text/plain" });
							response.write("Could not find playlist.");
							response.end();
						}
						console.log(playlist);

					}
				});
			}
		});
	} else {
		// Invalid or no playlist ID, send 400 bad request
		response.writeHead(400, { "Content-Type": "text/plain" });
		response.write("Invalid playlist request.");
		response.end();
	}
}

/**
 * Handles /p/laylist requests.
 *
 * Sends 200 when URL has been unshortened or already is.
 * Sends 400 when URL not specified or request error.
 * 
 * Responds with JSON of unshortened, or already-resolved URL.
 */
function routeUnshorten( request, response ) {
	var query = url.parse(request.url, true).query;

	if(typeof query.r != 'undefined') {
		_request({
			uri: query.r,
			method: "HEAD",
			followRedirect: false
		}, function( error, resp, body ) {
			if( error ) {
				response.writeHead(400, { "Content-Type": "text/plain" });
				response.write(error);
				response.end();
			} else if(resp.statusCode == 301 || resp.statusCode == 302) {
				response.writeHead(200, { "Content-Type": "application/json" });
				var json = {"resolvedURL": resp.headers.location};
				response.write(JSON.stringify(json));
				response.end();
			} else {
				response.writeHead(200, { "Content-Type": "application/json" });
				var json = {"resolvedURL": query.r};
				response.write(JSON.stringify(json));
				response.end();
			}
		});
	} else {
		response.writeHead(400, { "Content-Type": "text/plain" });
		response.write("No URL specified.");
		response.end();
	}
}

/**
 * Handles an incoming request.
 *
 * If /p/ is requested, forwards to routePlaylist.
 * If /u/ is requested, forwards to routeUnshorten.
 * Else forwards to route.
 */
function onRequest( request, response ) {
	var pathname = url.parse(request.url).pathname;
	var pathpcs = pathname.split('/');

	// TODO: Check if /p/ or /u/ requests come from this domain.
	if(pathpcs[1] == 'p') {
		routePlaylist(request, response);
	} else if(pathpcs[1] == 'u') {
		routeUnshorten(request, response);
	} else {
		route(request, response);
	}

	//console.log(pathpcs);
}

// Create and listen
http.createServer(onRequest).listen(port);

console.log("\nStarted");