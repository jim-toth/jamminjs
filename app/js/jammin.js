var SC_API_KEY = '8320c8fe21f98b89ad50068014b92068';

function Jammin(div) {
	this.container = div;
	this.supports_string = 'hypem, soundcloud, youtube';
	this.init();
}

Jammin.prototype.init = function() {
	// initialize soundcloud
	SC.initialize({client_id:SC_API_KEY});

	// initialize youtube
	window.onYouTubePlayerAPIReady = this.build();
	var tag = document.createElement('script');
	tag.src = "https://www.youtube.com/player_api";
	var firstScriptTag = document.getElementsByTagName('script')[0];
	firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

Jammin.prototype.build = function() {
	var container = $(this.container);
	
	container.addClass('jammin');
	
	// jammin logo
	var jammin_logo = $('<div>').addClass('jammin-logo');
	var jammin_logo_text = $('<div>').addClass('jammin-window-text').text('JamminJS');
	jammin_logo.append(jammin_logo_text);
	this.jammin_logo = jammin_logo;
	container.append(this.jammin_logo);

	// jammin window
	var jammin_window = $('<div>').addClass('jammin-window');
	this.jammin_window = jammin_window;
	container.append(this.jammin_window);

	// jammin playlist
	var jammin_playlist = $('<span>').attr('id', 'playlist');
	this.playlist = jammin_playlist;
	container.append(this.playlist);

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

	// build controls
	var song_controls_wrap = $('<span>').addClass('controls-wrap');
	var song_controls = $('<div>').attr('id', 'controls').addClass('controls');
	var prev_control = $('<a>').attr('id', 'prev-control').addClass('control-button').text('<<');
	var play_control = $('<a>').attr('id', 'play-control').addClass('control-button').text('>');
	var next_control = $('<a>').attr('id', 'next-control').addClass('control-button').text('>>');
	song_controls_wrap.append(song_controls);
	song_controls.append(prev_control,play_control,next_control);
	this.song_controls = song_controls;
	container.append(song_controls_wrap);
}

Jammin.prototype.acceptDroppedSong = function(ev) {
	ev.preventDefault();
	var dropped_link;
	if(typeof ev.originalEvent.dataTransfer.getData('text/plain') != 'undefined') {
		dropped_link = ev.originalEvent.dataTransfer.getData('text/plain');
	}
	this.resolveURI(dropped_link, $.proxy(this.buildSong, this));
	console.log('dropped: ' + dropped_link);
}

Jammin.prototype.acceptPastedSong = function(ev) {
	var pasted_link;
	if(typeof ev.originalEvent.clipboardData.getData('text/plain') != 'undefined') {
		pasted_link = ev.originalEvent.clipboardData.getData('text/plain');
	}

	this.resolveURI(pasted_link, $.proxy(this.buildSong, this));
	console.log('pasted: ' + pasted_link);
}

Jammin.prototype.resolveURI = function(added_uri, callback) {
	var uri = new Uri(added_uri);

	if(uri.host() == 'hypem.com' || 'www'+uri.host() == 'hypem.com') {
		var path = uri.path().split("/");

		if(path[1] == 'go') { // hypem shortened song link
			this.unshortenURI(uri, function(unshort_uri) {
				callback({'type': 'sc', 'uri': unshort_uri});
			});
		} else if (path[1] == 'track') { // full hypem song link
			this.unshortenURI('http://hypem.com/go/sc/'+path[2], function(unshort_uri) {
				callback({'type': 'sc', 'uri': unshort_uri});
			});
		} else {
			console.error('Malformed hypem link: ' + uri.toString());
		}
	} else if(uri.host() == 'youtube.com' || 'www'+uri.host() == 'youtube.com') {
		callback({'song_type': 'yt', 'uri': uri});
	} else if(uri.host() == 'soundcloud.com' || 'www'+uri.host() == 'soundcloud.com') {
		callback({'song_type': 'sc', 'uri': uri});
	} else if(uri.host() == 'youtu.be') {
		this.unshortenURI(uri, function(unshort_uri) {
			callback({'type': 'yt', 'uri': unshort_uri});
		});
	} else if(uri.host() == 'snd.sc') {
		this.unshortenURI(uri, function(unshort_uri) {
			callback({'type': 'sc', 'uri': unshort_uri});
		});
	} else {
		console.error('Unrecognized link: ' + uri.toString());
	}
}

Jammin.prototype.unshortenURI = function(short_uri, callback) {
	$.ajax({
		type: 'GET',
		url: 'http://api.unshort.me/unshorten?r='+short_uri.toString()+'&api_key=e4a749627720e8c0f782f9331b28acad&format=jsonp',
		contentType: "application/json",
		dataType: 'jsonp',
		success: function(json) {
			callback(json.resolvedURL);
		},
		error: function(e) {
       		console.log(e.message);
    	}
	});
}

Jammin.prototype.buildSong = function(song_data) {
	console.log(song_data);
	this.addSongSkeleton();
}

Jammin.prototype.addSongSkeleton = function() {
	this.playlist.append('song');
}