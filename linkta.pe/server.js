var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');
var _request = require('request');
var MongoClient = require('mongodb').MongoClient;
var format = require('util').format;
var inspect = require('util').inspect;
var ltLog = require('./ltLog');
var ejs = require('ejs');

var logfilename = 'server.log';
var loglevel = 4;
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
				ltLog.error(err);
				response.writeHead(500, {
					"Content-Type": "text/plain"
				});
				response.write("Internal Server Error");
				response.end();
			} else {
				if(playlist != null) {
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
							playlist["passphrase"] = undefined;
							try {
								response.end(ejs.render(file, {
									"title": "LINKTA.PE - " + (playlist.name || 'Untitled Playlist'),
									"init_playlist": JSON.stringify(playlist)
								}));
							} catch (e) {
								ltLog.dev(e);
							}
						}
					});
				} else {
					ltLog.prod('Denied request for ' + pathname);
					response.writeHead(404, {
						"Content-Type": "text/plain"
					});
					response.write("404");
					response.end();
				}
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
			ltLog.dev("Attempting to find playlist with ID: " + playlist_id);
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
 * Saves a playlist to the DB.
 */

function mongoSavePlaylist(playlist, callback) {
	//Connect to the database
	MongoClient.connect(format("mongodb://%s:%s/linktape", mongohost, mongoport), function(err, db) {
		if(err) {
			ltLog.error('Could not connect to MongoDB in mongoSavePlaylist');
			callback(err);
		} else {
			//Check if the playlist already exists
			mongoGetPlaylist(playlist.pid, function(err, pl) {
				ltLog.verbose(inspect(playlist));
				if(err) {
					ltLog.error("mongoGetPlaylist returned an error in mongoSavePlaylist");
					callback(err);
				} else {
					//Test if the slug has collided
					if(pl != null) {
						//Slug has collided. Generate a new one and recurse
						ltLog.dev("Collision occurred for slug: " + playlist.pid);
						playlist.pid = genSlug();
						mongoSavePlaylist(playlist, callback);
					} else {
						//Slug is free. Attempt to save the playlist
						ltLog.dev("Attempting to save playlist with ID: " + playlist.pid);
						db.collection('playlists').insert(playlist, function(err, item) {
							//Log the error if there is one
							if(err) {
								ltLog.error("Error inserting playlist into DB.");
								ltLog.verbose(inspect(playlist));
							}
							callback(err,playlist.pid);
						});
					}
				}
			});
		}
	});
}



function mongoUpdatePlaylist(playlist, callback) {
	//Connect to database
	MongoClient.connect(format("mongodb://%s:%s/linktape", mongohost, mongoport), function(err, db) {
		if (err) {
			ltLog.error('Could not connect to Mongo DB!' + err);
			callback(err);
		} else {
			//Connected to database. Attempt to insert playlist
			ltLog.dev("Updating playlist " + playlist.pid);
			//Update the playlist				
			db.collection('playlists').update({ "pid":playlist.pid }, {$set:{"playlist":playlist.playlist,"name":playlist.name}}, function(err, item) {
				if (err) {
					// Error while attempting to connect to Mongo
					ltLog.error('Could not update playlist '+ playlistToSave.pid + ' '+ err);
					callback(err);
				} else {
					//playlist has been updated, send back pid
					ltLog.dev("Updated playlist: " + playlist.pid);
					callback(err, playlist.pid);
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

function getPlaylist(pid, request, response) {
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
					playlist.passphrase = undefined;
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
 * Handles updating a playlist
 */

function updatePlaylist(playlist_id, request, response) {
	//Read in data from request
	if (request.headers["content-length"] > 0) {
		// Request data is sent in chunks if it is too big.
		// Data must be handled through events.
		var data = '';

		// Received a chunk, concatenate.
		request.on('data', function(chunk) {
			data += chunk;
			});

		// Done receiving data, construct playlist object
		request.on('end', function() {
			
			var json = JSON.parse(data);
			
			ltLog.verbose(json);
			
			var pl = new Object();
			pl.name = json.name;
			pl.passphrase = json.passphrase;
			pl.playlist = new Array();
			pl.pid = playlist_id;

			for (var i = 0; i < json.playlist.length; i++) {
				pl.playlist[i] = new Object();
				pl.playlist[i].title = json.playlist[i].title;
				pl.playlist[i].artist = json.playlist[i].artist;
				pl.playlist[i].uri = json.playlist[i].uri;
				pl.playlist[i].song_type = json.playlist[i].song_type;
				pl.playlist[i].video_id = json.playlist[i].video_id;
			}

			//Verify that the playlist exists 
			mongoGetPlaylist(playlist_id, function(err, oldPlaylist) {
				if (err) {
					ltLog.error("Error in updatePlaylist with pid: " + playlist_id);
					// Error while attempting to connect to or query Mongo
					response.writeHead(500, {
						"Content-Type": "text/plain"
					});
					response.write("An error has occurred.");
					response.end();
				} else {
					// No errors connecting to mongo, but playlist may not exist
					if (oldPlaylist) {
						ltLog.verbose(JSON.stringify(pl));
						ltLog.verbose(JSON.stringify(oldPlaylist));
						// Found a playlist. Check that the passphrase is correct
						if(oldPlaylist.passphrase == pl.passphrase) {
							// Connect to the database and update
							mongoUpdatePlaylist(pl, function(err, pid){
								if (err) {
									// Error while attempting to connect to Mongo
									response.writeHead(500, {
										"Content-Type": "text/plain"
									});
									response.write("An error has occurred.");
									response.end();
									ltLog.error('Could not connect to Mongo DB!' + err);
								} else {
									//playlist has been updated, send back pid
									response.writeHead(200, {
										"Content-Type": "application/json"
									});
									response.write(JSON.stringify({
										"pid": pid
									}));
									response.end();
								}
							});
						} else {
							//Wrong passphrase
							response.writeHead(403, {
								"Content-Type": "text/plain"
							});
							response.write("Invalid passphrase.");
							response.end();
						}
					}	else {
						//No playlist found.
						response.writeHead(404, {
							"Content-Type": "text/plain"
						});
						response.write("Playlist not found");
						response.end();
						ltLog.warn("New playlist routed to update function.");
					}
				}
			});
		});
	} else {
		// No data sent, yell at them
		response.writeHead(400, {"Content-Type": "text/plain"});
		response.write('400 Bad Request: No data sent.');
		response.end();
	}
}

/**
 * Routes saving a playlist to the proper function based on whether it's an update or not
 */

function savePlaylist(request, response) {
	
	if (request.headers["content-length"] > 0) {
		// Request data is sent in chunks if it is too big.
		// Data must be handled through events.
		var data = '';

		// Received a chunk, concatenate.
		request.on('data', function(chunk) {
			data += chunk;
			});

		// Done receiving data, construct playlist object
		request.on('end', function() {
			
			var json = JSON.parse(data);
			ltLog.verbose(json);
			
			var pl = new Object();
			pl.name = json.name || 'Untitled Playlist';
			pl.passphrase = json.passphrase || null;
			pl.pid = genSlug();
			pl.playlist = new Array();

			for (var i = 0; i < json.playlist.length; i++) {
				pl.playlist[i] = new Object();
				pl.playlist[i].title = json.playlist[i].title;
				pl.playlist[i].artist = json.playlist[i].artist;
				pl.playlist[i].uri = json.playlist[i].uri;
				pl.playlist[i].song_type = json.playlist[i].song_type;
				pl.playlist[i].video_id = json.playlist[i].video_id;
			}

			ltLog.dev("Saving new playlist");

			mongoSavePlaylist(pl, function(err, savedID) {
				if(err) {
					ltLog.error("Error saving playlist");
					response.writeHead(500, {
						"Content-Type": "text/plain"
					});
					response.write("An error has occurred.");
					response.end();
				} else {
					//Playlist has been saved. Send back new pid
					ltLog.dev("Saved playlist with pid: " + savedID);
					ltLog.verbose("Playlist Saved: " + inspect(pl));

					response.writeHead(200, {
						"Content-Type": "application/json"
					});
					response.write(JSON.stringify({
						"pid": savedID
					}));
					response.end();

				}
			});			
		});	
	} else {
		// No data sent, yell at them
		response.writeHead(400, {"Content-Type": "text/plain"});
		response.write('400 Bad Request: No data sent.');
		response.end();
	}
}

function clonePlaylist(pid, request, response) {
	if (typeof pid != 'undefined') {
		mongoGetPlaylist(pid, function(err, playlist) {
			if (err) {
				// Error while attempting to connect to or query Mongo
				ltLog.error("Error in clonePlaylist. Could not connect to MongoDB");
				response.writeHead(500, {
					"Content-Type": "text/plain"
				});
				response.write("An error has occurred.");
				response.end();
			} else {
				// No errors connecting to mongo, but playlist may not exist
				if (playlist != null) {
					// Found playlist. Save it as a new playlist
					ltLog.dev("Cloning playlist with slug: " + pid);

					playlist._id = undefined;
					playlist.passphrase = undefined;
					playlist.pid = genSlug();

					//first, see if they have supplied a new passphrase or title
					if (request.headers["content-length"] > 0) {
						// Request data is sent in chunks if it is too big.
						// Data must be handled through events.
						var data = '';

						// Received a chunk, concatenate.
						request.on('data', function(chunk) {
						data += chunk;
						});

						// Done receiving data, get passphrase
						request.on('end', function() {
							var json = JSON.parse(data);
							ltLog.dev(json);
							if(typeof json.passphrase != 'undefined') {
								//New passphrase sent. Should we even accept clone requests without a passphrase?
								//Because they've already got the slug of the playlist they're trying to clone
								//And with an undefined passphrase they can't edit the new playlist
								playlist.passphrase = json.passphrase;
							}
							if(typeof json.name != 'undefined') {
								//Change the name if they've sent one
								playlist.name = json.name;
							}

							mongoSavePlaylist(playlist, function(err, savedID) {
								if(err) {
									ltLog.error("Error in clonePlaylist. Could not connect to MongoDB");
									response.writeHead(500, {
										"Content-Type": "text/plain"
									});
									response.write("An error has occurred.");
									response.end();
								} else {
									response.writeHead(200, {
										"Content-Type": "application/json"
									});
									response.write(JSON.stringify({
										"pid": savedID
									}));
									response.end();
								}
							});
						});
					} else {
						//No data sent with clone request, so no passphrase. Just save it as is
						mongoSavePlaylist(playlist, function(err, savedID) {
							if(err) {
								ltLog.error("Error in clonePlaylist. Could not connect to MongoDB");
								response.writeHead(500, {
									"Content-Type": "text/plain"
								});
								response.write("An error has occurred.");
								response.end();
							} else {
								response.writeHead(200, {
									"Content-Type": "application/json"
								});
								response.write(JSON.stringify({
									"pid": savedID
								}));
								response.end();
							}
						});
					}
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
 * Routes /p/laylist requests.
 */

function routePlaylist(request, response) {

	var pathname = url.parse(request.url).pathname;
	var pathpcs = pathname.split('/');
	var playlistID = pathpcs[2];

	if (request.method == 'GET') {
		getPlaylist(playlistID, request, response);
	} else if (request.method == 'POST') {
		if(playlistID == '') {
			savePlaylist(request, response);
		} else {
			updatePlaylist(playlistID, request, response);
		}
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
 * Routes /c/lone requests
 */

function routeClone(request, response) {
	if(request.method == 'POST') {
		
		var pathname = url.parse(request.url).pathname;
		var pathpcs = pathname.split('/');
		var playlistID = pathpcs[2];

		clonePlaylist(playlistID, request, response);
		ltLog.dev("Clone request for playlist with slug: " + playlistID );

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
 * Handles /u/nshorten requests.
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

		// TODO: Check if /p/ or /u/ or /c/ requests come from this domain.
		if (pathpcs[1] == 'p') {
			routePlaylist(request, response);
		} else if (pathpcs[1] == 'u') {
			routeUnshorten(request, response);
		} else if (pathpcs[1] == 'c') {
			routeClone(request, response);
		} else {
			route(request, response);
		}
	} catch (err) {
		ltLog.error(err);
		throw err;
	}
}

// Start logger
ltLog.startLogger(logfilename, loglevel);
// Create and listen
http.createServer(onRequest).listen(port);

ltLog.prod("Started");
