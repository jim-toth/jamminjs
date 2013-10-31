var restify = require('restify');
var MongoClient = require('mongodb').MongoClient;
var format = require('util').format;
var request = require('request');
var http = require('http');
var fs = require('fs');

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : 27017;
var serverport = 80;

function getPlaylist(req, res, next) {
	isPlaylist(req.params.pl, function(isIt) {
		if(!isIt) {
			res.send({});
		} else {
			MongoClient.connect(format("mongodb://%s:%s/linktape", host, port), function(err, db) {
				if(err) {
					console.dir(err);
				}

				var col = db.collection('playlist');
				col.findOne({"id" : req.params.pl}, function(err, item) {
					if(err) { 
						console.dir(err);
					}
					
					res.send({ "a": 'hide' });
				});
			});
		}
	});
}

function addPlaylist(req, res, next) {
	// var slug = genSlug();
	
	// var pIn = req.params.data;
	// var pl = new Object();
	// pl.pid = slug;
	// pl.name = pIn.name;
	// pl.playlist = new Array();

	// for(var i = 0; i < pIn.playlist.length; i++) {
	// 	pl.playlist[i].title = pIn.playlist[i].title;
	// 	pl.playlist[i].artist = pIn.playlist[i].artist;
	// 	pl.playlist[i].uri = pIn.playlist[i].uri;
	// 	pl.playlist[i].song_type = pIn.playlist[i].song_type;
	// 	pl.playlist[i].video_id = pIn.playlist[i].video_id;
	// }

	// MongoClient.connect(format("mongodb://%s:%s/linktape", host, port), function(err,db) {
	// 	if(err) { return console.dir(err); }

	// 	var col = db.collection('playlist');
	// 	col.insert(playlist);
	// });
}

function unShorten(req, res, next) {
	request({
		uri: req.params.url,
		method: "HEAD",
		followRedirect: false
	}, function( error, response, body ) {
		if( error ) {
			res.send({});
			return console.dir(error);
		} else if(Math.floor(response.statusCode/100) == 3) { // you have aspergers
			res.send(response.headers.Location);
		} else {
			res.send( req.params.url );
		}
	});
}

function isPlaylist( slug, callback ) {
	MongoClient.connect(format("mongodb://%s:%s/linktape", host, port), function(err,db) {
		if(err) {
			console.dir(err);
		}

		var col = db.collection('playlist');
		col.findOne( { "id" : slug.toString() }, function (err, item) {
			if( item == null ) {
				isIt = false;
			} else {
				isIt = true;
			}

			callback(isIt);
		});

	});
}

function genSlug() {
	var hrTime = process.hrtime();
	var st = (hrTime[0] * 1e9 + hrTime[1]).toString(36);
	st = st.substring(st.length - 9, st.length);
	
	return st;
}

// var server = restify.createServer();
// server.get('/p/:pl', getPlaylist);
// server.get('/u/:url', unShorten);
// server.get('/p', addPlaylist);
// server.get('/', getIndex);

// server.listen(serverport, function() {
//   console.log('%s listening at %s', server.name, server.url);
// });
var jammin = fs.readFileSync('../app/jammin.html');
var basepath = '../app/';
function handler(req, res) {
	// console.log('req: ' + req);
	// console.log('res: ' + res);
	// res.writeHead(200, {'Content-Type': 'text/html'});
	// res.end(jammin);
}

http.get("http://" + host + "/index.html", function(res) {
	console.log('hi');
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.end(jammin);
});

http.createServer(handler).listen(serverport, host);
console.log("http listening at http://" + host + ":" + serverport);