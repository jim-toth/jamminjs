var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');
var _request = require('request');
var MongoClient = require('mongodb').MongoClient;
var format = require('util').format;
var ltLog = require('ltLog');
var ejs = require('ejs');

var logfilename = 'server.log';
var loglevel = 5;
var port = 80;
var mongohost = 'localhost';
var mongoport = 27017;
var basepath = '../app/';

// Whitelist of allowed files/directories
var whitelist = ['/index.html', '/style', '/js', '/playlist.ejs'];

/**
 * File extension to content-type
 */

function extToContentType(ext) {
	var contentType;

	switch (ext) {
		case '.html':
			contentType = "text/html";
			break;
		case '.ejs':
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
 * Generates a new slug, or resource (playlist) identifier.
 */

function genSlug() {
	var hrTime = process.hrtime();
	var st = (hrTime[0] * 1e9 + hrTime[1]).toString(36);
	st = st.substring(st.length - 9, st.length);

	return st;
}

/**
 * Routes file requests through whitelist.
 *
 * Sends 200 response with file if allowed.
 * Sends 404 response if not found in whitelist.
 */

function route(request, response) {
	var pathname = url.parse(request.url).pathname;

	if (pathname == '/') {
		pathname = '/index.html';
	}

	if (pathname == '/index.html') {
		pathname = '/playlist.ejs';
	}

	// Allow direct file requests from whitelist or root directory from whitelist (only domain/root)
	if (whitelist.indexOf(pathname) > -1 || whitelist.indexOf('/' + pathname.split('/')[1]) > -1) {
		var fileopts = {};
		if (path.extname(pathname) == '.ejs') {
			fileopts["encoding"] = 'utf8';
		}

		try {
			fs.readFile(basepath + pathname, fileopts, function(err, file) {
				if (err) {
					ltLog.error(err);
					response.writeHead(500, {
						"Content-Type": "text/plain"
					});
					response.write("Internal Server Error");
					response.end();
				} else {
					ltLog.dev('Serving ' + pathname);
					response.writeHead(200, {
						"Content-Type": extToContentType(path.extname(pathname))
					});
					if (path.extname(pathname) == '.ejs') {
						try {
							response.end(ejs.render(file, {
								"title": "LINKTA.PE"
							}));
						} catch (e) {
							ltLog.error(e);
							response.writeHead(500, {
								"Content-Type": "text/plain"
							});
							response.write("Internal Server Error");
							response.end();
						}
					} else {
						response.end(file);
					}
				}
			});
		} catch (e) {
			ltLog.error(e);
			response.writeHead(500, {
				"Content-Type": "text/plain"
			});
			response.write("Internal Server Error");
			response.end();
		}
	} else {
		// Check to see if it is a playlist slug.
		var pid = pathname.split("/")[1];
		mongoGetPlaylist(pid, function(err, playlist) {
			if (err) {
				ltLog.prod('Denied request for ' + pathname);
				response.writeHead(404, {
					"Content-Type": "text/plain"
				});
				response.write("404");
				response.end();
			} else {
				fs.readFile(basepath + '/playlist.ejs', {
					"encoding": "utf8"
				}, function(err, file) {
					if (err) {
						ltLog.error(err);
						response.writeHead(500, {
							"Content-Type": "text/plain"
						});
						response.write("Internal Server Error");
						response.end();
					} else {
						ltLog.prod('Serving playlist ' + pid);
						response.writeHead(200, {
							"Content-Type": extToContentType('.ejs')
						});
						try {
							response.end(ejs.render(file, {
								"title": "LINKTA.PE - " + playlist.name,
								"init_playlist": JSON.stringify(playlist)
							}));
						} catch (e) {
							ltLog.dev(e);
						}
					}
				});
			}
		});
	}
}

/**
 * Fetches a playlist from the DB
 */

function mongoGetPlaylist(playlist_id, callback) {
	//Connect to the database
	MongoClient.connect(format("mongodb://%s:%s/linktape", mongohost, mongoport), function(err, db) {
		if (err) {
			//Error occurred during connection, kick it back
			ltLog.error('Could not connect to MongoDB in mongoGetPlaylist');
			callback(err);
		} else {
			//Connected to database, get the playlist
			ltLog.verbose("Attempting to find playlist with ID: " + playlist_id);
			db.collection('playlists').findOne({
				"pid": playlist_id
			}, function(err, playlist) {
				if (err) {
					//Error occured during query
					ltLog.error('Error during mongoGetPlaylist query');
					callback(err);
				} else {
					//No error, but no guarantees the playlist exists
					callback(err, playlist);
				}
			});
		}
	});
}

/**
 * Handles /p/laylist GET requests through mongoGetPlaylist
 *
 * Sends 200 when GET and playlist has been found along with playlist JSON.
 * Sends 404 when GET and playlist has not been found.
 */

function getPlaylist(request, response) {
	var pathname = url.parse(request.url).pathname;
	var pathpcs = pathname.split('/');

	// Get playlist ID
	var pid;
	if (pathpcs.length > 2 && pathpcs[2] != '') {
		pid = pathpcs[2];
	}

	if (typeof pid != 'undefined') {
		mongoGetPlaylist(pid, function(err, playlist) {
			if (err) {
				// Error while attempting to connect to or query Mongo
				response.writeHead(500, {
					"Content-Type": "text/plain"
				});
				response.write("An error has occurred.");
				response.end();
			} else {
				// No errors connecting to mongo, but playlist may not exist
				if (playlist != null) {
					// Found playlist.
					response.writeHead(200, {
						"Content-Type": "application/json"
					});
					playlist._id = undefined;
					response.write(JSON.stringify(playlist));
					response.end();
				} else {
					// Could not find playlist.
					response.writeHead(404, {
						"Content-Type": "text/plain"
					});
					response.write("Could not find playlist.");
					response.end();
				}
			}
		});
	} else {
		// Invalid or no playlist ID, send 400 bad request
		response.writeHead(400, {
			"Content-Type": "text/plain"
		});
		response.write("Invalid playlist request.");
		response.end();
	}
}

/**
 * Handles /p/laylist POST requests.
 *
 * Sends 400 Bad Request when no data sent.
 * Sends 500 Server Error on Mongo error.
 * Sends 200 OK when saved successfully.
 */

function savePlaylist(request, response) {
	var newPID = genSlug();

	//Connect to the database, verify the slug has not collided	
	MongoClient.connect(format("mongodb://%s:%s/linktape", mongohost, mongoport), function(err, db) {
		if (err) {
			// Error while attempting to connect to Mongo
			response.writeHead(500, {
				"Content-Type": "text/plain"
			});
			response.write("An error has occurred.");
			response.end();

			ltLog.error('Could not connect to Mongo DB!');
		} else {
			// Connection successful, check for collision
			db.collection('playlists').count({
				"pid": newPID
			}, function(err, count) {
				if (err) {
					// Error while attempting to access database
					response.writeHead(500, {
						"Content-Type": "text/plain"
					});
					response.write("An error has occurred.");
					response.end();
				} else {
					//Got a count of the number of collisions, if it's zero, proceed
					if (count == 0) {
						//Build and save the playlist
						if (request.headers["content-length"] > 0) {
							// Request data is sent in chunks if it is too big.
							// Data must be handled through events.
							var data = '';

							// Received a chunk, concatenate.
							request.on('data', function(chunk) {
								data += chunk;
							});

							// Done receiving data, attempt to save playlist
							request.on('end', function() {
								var json = JSON.parse(data);

								var pl = new Object();
								pl.pid = newPID;
								pl.name = json.name;
								pl.playlist = new Array();

								for (var i = 0; i < json.playlist.length; i++) {
									pl.playlist[i] = new Object();
									pl.playlist[i].title = json.playlist[i].title;
									pl.playlist[i].artist = json.playlist[i].artist;
									pl.playlist[i].uri = json.playlist[i].uri;
									pl.playlist[i].song_type = json.playlist[i].song_type;
									pl.playlist[i].video_id = json.playlist[i].video_id;
								}

								ltLog.dev("Saving playlist " + pl.pid);

								//Insert the playlist				
								db.collection('playlists').insert(pl, function(err, what) {
									if (err) {
										// Error while attempting to connect to Mongo
										response.writeHead(500, {
											"Content-Type": "text/plain"
										});
										response.write("An error has occurred.");
										response.end();

										ltLog.error('Could not connect to Mongo DB!');
									} else {
										response.writeHead(200, {
											"Content-Type": "application/json"
										});
										response.write(JSON.stringify({
											"pid": pl.pid
										}));
										response.end();
									}
								});
							});
						} else {
							// No data sent, yell at them
							response.writeHead(400, {
								"Content-Type": "text/plain"
							});
							response.write('400 Bad Request: No data sent.');
							response.end();
						}
					} else {
						//Count is not zero, collision detected
						//Recurse the function and try again
						ltLog.dev("Collision Detected");
						savePlaylist(request, response);
					}
				}
			});
		}
	});
}

/**
 * Routes /p/laylist requests.
 */

function routePlaylist(request, response) {
	if (request.method == 'GET') {
		getPlaylist(request, response);
	} else if (request.method == 'POST') {
		savePlaylist(request, response);
	} else {
		// Invalid request
		response.writeHead(400, {
			"Content-Type": "text/plain"
		});
		response.write("500 Bad Request - Method not valid.");
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

function routeUnshorten(request, response) {
	var query = url.parse(request.url, true).query;

	if (typeof query.r != 'undefined') {
		_request({
			uri: query.r,
			method: "HEAD",
			followRedirect: false
		}, function(error, resp, body) {
			if (error) {
				response.writeHead(400, {
					"Content-Type": "text/plain"
				});
				response.write(error);
				response.end();
			} else if (resp.statusCode == 301 || resp.statusCode == 302) {
				response.writeHead(200, {
					"Content-Type": "application/json"
				});
				var json = {
					"resolvedURL": resp.headers.location
				};
				response.write(JSON.stringify(json));
				response.end();
			} else {
				response.writeHead(200, {
					"Content-Type": "application/json"
				});
				var json = {
					"resolvedURL": query.r
				};
				response.write(JSON.stringify(json));
				response.end();
			}
		});
	} else {
		response.writeHead(400, {
			"Content-Type": "text/plain"
		});
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

function onRequest(request, response) {
	try {
		var pathname = url.parse(request.url).pathname;
		var pathpcs = pathname.split('/');

		// TODO: Check if /p/ or /u/ requests come from this domain.
		if (pathpcs[1] == 'p') {
			routePlaylist(request, response);
		} else if (pathpcs[1] == 'u') {
			routeUnshorten(request, response);
		} else {
			route(request, response);
		}
	} catch (err) {
		ltLog.error(err);
	}
}

// Start logger
ltLog.startLogger(logfilename, loglevel);
// Create and listen
http.createServer(onRequest).listen(port);

ltLog.prod("Started");