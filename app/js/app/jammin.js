define(["app/song", "app/playlist"], function(Song, Playlist) {
	var SC_API_KEY = '8320c8fe21f98b89ad50068014b92068';

	var server = 'localhost';

	var Jammin = function (div, init_playlist) {
		this.container = div;
		this.init_playlist = init_playlist;
		this.initAPIs();
		this.plStates = new Array();
	}

	Jammin.prototype.initAPIs = function() {
		// initialize soundcloud
		SC.initialize({client_id:SC_API_KEY});

		// initialize youtube
		window.onYouTubePlayerAPIReady = $.proxy(this.init, this);
		var tag = document.createElement('script');
		tag.src = "https://www.youtube.com/player_api";
		var firstScriptTag = document.getElementsByTagName('script')[0];
		firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
	}

	Jammin.prototype.init = function() {
		this.supports_string = 'hypem, soundcloud, youtube';
		this.build();
	}

	Jammin.prototype.build = function() {
		var container = $(this.container);
		
		container.addClass('jammin');
		
		// jammin logo
		var jammin_logo = $('<div>').addClass('jammin-logo');
		var jammin_logo_text = $('<div>').addClass('jammin-window-text').text('LINKTA.PE');
		jammin_logo.append(jammin_logo_text);
		this.jammin_logo = jammin_logo;
		container.append(this.jammin_logo);

		// jammin window
		var jammin_window = $('<div>').addClass('jammin-window');
		this.jammin_window = jammin_window;
		container.append(this.jammin_window);

		// jammin playlist
		var jammin_playlist = $('<span>').attr('id', 'playlist');
		container.append(jammin_playlist);

		// add song pane
		var add_song_pane = $('<div>').addClass('add-song').attr('id', 'add-song');
		var add_song_bg = $('<div>').addClass('add-song-bg');
		var add_song_text = $('<div>').addClass('add-song-text').text('DRAG MUSIC LINKS HERE');
		var add_song_subtext = $('<div>').addClass('add-song-subtext').text(this.supports_string);
		var add_song_input_wrap = $('<div>').addClass('add-song-input-wrap');
		var add_song_input = $('<input>').attr('id', 'add-song-input').addClass('add-song-input').attr('placeholder', 'Paste music links here');
		add_song_input_wrap.append(add_song_input);

		add_song_input.bind('paste', $.proxy(this.acceptPastedSong, this));

		add_song_pane.append(add_song_input_wrap, add_song_bg);
		add_song_bg.append(add_song_text, add_song_subtext);
		add_song_pane.bind("dragover", function(ev) {
			ev.preventDefault();
		});
		add_song_pane.bind("drop", $.proxy(this.acceptDroppedSong, this));
		this.add_song_pane = add_song_pane;
		container.append(this.add_song_pane);

		// build song controls
		var song_controls_wrap = $('<span>').addClass('controls-wrap');
		var song_controls = $('<div>').attr('id', 'controls').addClass('controls');
		var prev_control = $('<a>').attr('id', 'prev-control').addClass('control-button').text('<<');
		var play_control = $('<a>').attr('id', 'play-control').addClass('control-button').text('>');
		var next_control = $('<a>').attr('id', 'next-control').addClass('control-button').text('>>');
		var prog_control = $('<div>').attr('id', 'prog-control').addClass('control-prog-wrap');
		var prog_display = $('<div>').progressbar({ value: 1, max: 100 }).attr('id', 'prog-display').addClass('control-prog');
		prog_control.append(prog_display);
		song_controls_wrap.append(song_controls);
		song_controls.append(prev_control,play_control,next_control,prog_control);
		this.song_controls = song_controls;
		container.append(song_controls_wrap);

		// build playlist controls
		var pl_controls_wrap = $('<span>').addClass('pl-controls-wrap');
		var pl_controls = $('<div>').attr('id', 'pl-controls').addClass('pl-controls');
		var save_control = $('<a>').attr('id', 'save-control').addClass('control-button').text('Save');
		pl_controls_wrap.append(pl_controls);
		pl_controls.append(save_control);
		container.append(pl_controls_wrap);

		// bind playlist controls
		save_control.click($.proxy(function () {this.savePlaylist()}, this));

		// Create Playlist
		this.playlist = new Playlist(jammin_playlist, this.song_controls, jammin_window);

		//load initial playlist
		if(typeof this.init_playlist != 'undefined') {
			this.loadPlaylist(this.init_playlist);
		}
	}

	Jammin.prototype.acceptDroppedSong = function(ev) {
		ev.preventDefault();
		var dropped_link;
		if(typeof ev.originalEvent.dataTransfer.getData('text/plain') != 'undefined') {
			dropped_link = ev.originalEvent.dataTransfer.getData('text/plain');
		}
		this.resolveURI(dropped_link, $.proxy(this.addSongToPlaylist, this));
	}

	Jammin.prototype.acceptPastedSong = function(ev) {
		var pasted_link;
		if(typeof ev.originalEvent.clipboardData.getData('text/plain') != 'undefined') {
			pasted_link = ev.originalEvent.clipboardData.getData('text/plain');
		}

		this.resolveURI(pasted_link, $.proxy(this.addSongToPlaylist, this));
	}

	Jammin.prototype.resolveURI = function(added_uri, callback) {
		var uri = new Uri(added_uri);

		if(uri.host() == 'hypem.com' || 'www'+uri.host() == 'hypem.com') {
			var path = uri.path().split("/");

			if(path[1] == 'go') { // hypem shortened song link
				this.unshortenURI(uri, function(unshort_uri) {
					callback({'song_type': 'sc', 'uri': (new Uri(unshort_uri)) });
				});
			} else if (path[1] == 'track') { // full hypem song link
				this.unshortenURI('http://hypem.com/go/sc/'+path[2], function(unshort_uri) {
					callback({'song_type': 'sc', 'uri': (new Uri(unshort_uri))});
				});
			} else {
				console.error('Malformed hypem link: ' + uri.toString());
			}
		} else if(uri.host() == 'youtube.com' || uri.host() == 'www.youtube.com') {
			callback({ 'song_type': 'yt', 'uri': uri, 'video_id': uri.getQueryParamValue('v') });
		} else if(uri.host() == 'soundcloud.com' || uri.host() == 'www.soundcloud.com') {
			callback({ 'song_type': 'sc', 'uri': uri });
		} else if(uri.host() == 'youtu.be') {
				callback({ 'song_type': 'yt', 'uri': uri, 'video_id': uri.path() });
		} else if(uri.host() == 'snd.sc') {
			this.unshortenURI(uri, function(unshort_uri) {
				callback({ 'song_type': 'sc', 'uri': (new Uri(unshort_uri)) });
			});
		} else {
			console.error('Unrecognized link: ' + uri.toString());
		}
	}

	Jammin.prototype.unshortenURI = function(short_uri, callback) {
		return $.ajax({
			type: 'GET',
			url: '/u?r=' + short_uri.toString(),
			contentType: "application/json",
			dataType: 'json',
			success: function(json) {
				if (typeof callback != 'undefined') {
					callback(json.resolvedURL);
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log(jqXHR);
				console.log(textStatus);
				console.log(errorThrown);
			}
		});
	}

	Jammin.prototype.addSongToPlaylist = function(song_data, idx) {
		if(typeof idx != 'undefined') {
			this.playlist.addSong(new Song(song_data), idx);
		} else {
			this.playlist.addSong(new Song(song_data));
		}
	}

	Jammin.prototype.loadPlaylist = function(plObj) {
		var resolves = new Array();
		
		$.each(plObj.playlist, $.proxy(function(idx, song) {
			if(song.song_type == 'sc') {
				song.uri = new Uri(song.uri);
				if(song.uri.host() == 'hypem.com' && song.uri.path().split("/")[1] == 'track') {
					song.uri = 'http://hypem.com/go/sc/'+song.uri.path().split("/")[2];
				}
				resolves.push(
					this.unshortenURI(song.uri, $.proxy(function(ruri) {
						song.uri = ruri;
					}, this))
				);
			}
		}, this));

		$.when.apply($, resolves).done($.proxy(function() {
			$.each(plObj.playlist, $.proxy(function(idx, song) {
				song.uri = new Uri(song.uri);
			}, this));
			this.playlist.addSongs(plObj);
		}, this));
	}

	Jammin.prototype.loadPlaylistByID = function(playlist_id) {
		// TODO: clear current playlist, fix url, config file.
		// $.getJSON(playlist_uri, $.proxy(function(json) {
		// 	var resolves = new Array();
			
		// 	$.each(json.playlist, $.proxy(function(idx, song) {
		// 		if(song.song_type == 'sc') {
		// 			song.uri = new Uri(song.uri);
		// 			if(song.uri.host() == 'hypem.com' && song.uri.path().split("/")[1] == 'track') {
		// 				song.uri = 'http://hypem.com/go/sc/'+song.uri.path().split("/")[2];
		// 			}
		// 			resolves.push(
		// 				this.unshortenURI(song.uri, $.proxy(function(ruri) {
		// 					song.uri = ruri;
		// 				}, this))
		// 			);
		// 		}
		// 	}, this));

		// 	$.when.apply($, resolves).done($.proxy(function() {
		// 		$.each(json.playlist, $.proxy(function(idx, song) {
		// 			song.uri = new Uri(song.uri);
		// 		}, this));
		// 		this.playlist.addSongs(json);
		// 	}, this));			
		// }, this));
	}

	Jammin.prototype.savePlaylist = function() {
		$.ajax({
			type: 'POST',
			url: '/p',
			dataType: 'json',
			data: JSON.stringify(this.playlist.toPlainObject()),
			success: $.proxy(function(data, textStatus, jqXHR) {
				this.updateLocation('/' + data.pid);
				console.log('Save successful: ' + data.pid);
			}, this),
			error: function(jqXHR, textStatus, errorThrown) {
				console.log(jqXHR);
				console.log(textStatus);
				console.log(errorThrown);
			}
		});
		this.init_playlist = this.playlist.toPlainObject();
	}

	Jammin.prototype.updateLocation = function(new_path) {
		window.history.pushState($(document).contents()[0], document.title, new_path);
	}

	return Jammin;
});