define(["app/song"], function(Song) {

	var SCopts = {
		"auto_play" : false,
		"show_comments" : false,
		"iframe" : true
	};

	var YTopts = {
		'height': 200,
		'width': 200,
		// 'events': {
		// 	'onStateChange': handleYTState
		// },
		"playerVars": {
			"controls": 0,
			"enablejsapi": 1,
			"showinfo": 0
		}
	};

	var Playlist = function(div) {
		this.container = div;
		this.songs = new Array();
	}

	Playlist.prototype.addSong = function(song) {
		var newIdx = this.songs.length;

		var newSongContainer = this.buildSongContainer(newIdx, song.type);
		song["container"] = newSongContainer;
		this.container.append(song.container);
		this.songs.push(song);
		if(song.type == 'sc') {
			this.buildSoundCloud(song);
		} else if(song.type == 'yt') {
			this.buildYouTube(song);
		}
	}

	Playlist.prototype.buildSongContainer = function(newIdx, type) {
		var builtSong;

		if(type == 'sc') {
			builtSong = $('<div>');
			builtSong.addClass('control');
			builtSong.attr('id', 'control-'+newIdx);
			builtSong.addClass('sc-control');
			builtSong.attr('songType', 'sc');
		} else if(type == 'yt') {
			builtSong = $('<div>');
			builtSong.addClass('control');
			builtSong.attr('id', 'control-'+newIdx);
			builtSong.addClass('yt-control');
			builtSong.attr('songType', 'sc');
			var ytwrap = $('<div>');
			ytwrap.addClass('yt-wrap');
			//ytwrap.bind('click',this.toggleCurrentSong);
			var yttarget = $('<div>').attr('id', 'yt-'+Date.now());
			yttarget.addClass('yt-target');
			ytwrap.append(yttarget);
			builtSong.append(ytwrap);
		}

		var sWrap = $('<span>');
		sWrap.attr('id', 'song-'+newIdx);
		sWrap.attr('playlistIdx', newIdx);
		sWrap.addClass('song-wrapper');

		sWrap.append(builtSong);

		return sWrap;
	}

	Playlist.prototype.buildSoundCloud = function(song) {
		if(typeof song.track_id != 'undefined') {
			// SC.oEmbed('http://api.soundcloud.com/tracks/'+song.track_id, SCopts, function(oEmbed) {
			// 	$('.control', song.container).append(oEmbed);
			// });
		} else {
			SC.get('/resolve', { url: song.uri.toString() }, function(track) {
				song["sc_track_id"] = track.id;

				SC.oEmbed('http://api.soundcloud.com/tracks/'+track.id, SCopts, function(oEmbed) {
					var scFrame = oEmbed.html;
					$('.control', song.container).append(scFrame);
					song["player"] = SC.Widget(scFrame);
				});
			});
		}
	}

	Playlist.prototype.buildYouTube = function(song) {
		var theseOpts = $.extend(true, { 'videoId': song.video_id }, YTopts);
		var target = $('.yt-target', song.container).first().attr('id');
		var player = new YT.Player(target, theseOpts);
		song["player"] = player;
	}

	return Playlist;
});