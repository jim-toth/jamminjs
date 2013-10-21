define(["app/song", "app/jamdisplay"], function(Song, JamDisplay) {

	var Playlist = function(div, song_controls, jam_window) {
		this.container = div;
		
		this.songs = new Array();
		
		this.currentTrack = undefined;
		
		this.bindSongControls(song_controls);

		this.jamDisplay = new JamDisplay(jam_window);

		this.SCopts = {
			"auto_play" : false,
			"show_comments" : false,
			"iframe" : true
		};

		this.YTopts = {
			'height': 200,
			'width': 200,
			'events': {
				'onStateChange': $.proxy(this.handleYouTubeState, this)
			},
			"playerVars": {
				"controls": 0,
				"enablejsapi": 1,
				"showinfo": 0
			}
		};
	}

	Playlist.prototype.bindSongControls = function(song_controls) {
		this.song_controls = song_controls;
		$('#prev-control', song_controls).bind('click', $.proxy(this.playPrev, this));
		$('#play-control', song_controls).bind('click', $.proxy(this.toggleCurrentSong,this));
		$('#next-control', song_controls).bind('click', $.proxy(this.playNext,this));
	}

	Playlist.prototype.addSong = function(song) {
		var newIdx = this.songs.length;

		var newSongContainer = this.buildSongContainer(newIdx, song.song_type);
		song["container"] = newSongContainer;
		this.container.append(song.container);
		this.songs.push(song);
		if(song.song_type == 'sc') {
			this.buildSoundCloud(song);
		} else if(song.song_type == 'yt') {
			this.buildYouTube(song);
		}

		// set recently added track as current song if there isnt already one
		if(typeof this.currentTrack == 'undefined') {
			this["currentTrack"] = song;
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
			ytwrap.bind('click', $.proxy(this.toggleCurrentSong, this));
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
			SC.get('/resolve', { url: song.uri.toString() }, $.proxy(function(track) {
				song["sc_track_id"] = track.id;

				SC.oEmbed('http://api.soundcloud.com/tracks/'+track.id, this.SCopts, $.proxy(function(oEmbed) {
					var scFrame = oEmbed.html;
					$('.control', song.container).append(scFrame);
					song["player"] = SC.Widget($('iframe', song.container)[0]);

					song.player.bind(SC.Widget.Events.FINISH, $.proxy(function() {
						this.jamDisplay.clearBgImage();
						this.playNext();
					},this));

					song.player.bind(SC.Widget.Events.PLAY, $.proxy(function() {
						if(typeof this.currentTrack != 'undefined') {
							if(this.currentTrack !== song) {
								this.stopCurrentTrack();
								this['currentTrack'] = song;
							}
							this.jamDisplay.setBgImage(track.artwork_url);
							this.jamDisplay.show();
							$('#play-control', this.song_controls).text('||');
						}
					},this));

					song.player.bind(SC.Widget.Events.PAUSE, $.proxy(function() {
						if(typeof this.currentTrack != 'undefined') {
							if(this.currentTrack === song) {
								$('#play-control', this.song_controls).text('>');
							}
						}
					},this));
				},this));
			},this));
		}
	}

	Playlist.prototype.handleYouTubeState = function(event) {
		var thisIdx = $($(event.target.a).closest('.song-wrapper')[0]).attr('playlistIdx');
		var isCurrentSong = false;
		if(this.getIndexOfTrack(this.currentTrack) == thisIdx) {
			isCurrentSong = true;
		}

		if(event.data == YT.PlayerState.ENDED) {
			this.playNext();
			$(event.target.a).removeClass('jammin-window');
			this.jamDisplay.show();
		} else if(event.data == YT.PlayerState.PLAYING) {
			$('#play-control', this.song_controls).text('||');
			if(!isCurrentSong) {
				this.stopCurrentTrack();
				this.currentTrack = this.songs[thisIdx];
			}
			this.jamDisplay.hide();
			$(event.target.a).addClass('jammin-window');
		} else if(event.data == YT.PlayerState.PAUSED) {
			if(isCurrentSong) {
				$('#play-control', this.song_controls).text('>');
			} else {
				$(event.target.a).removeClass('jammin-window');
			}
		}
	}

	Playlist.prototype.buildYouTube = function(song) {
		var theseOpts = $.extend(true, { 'videoId': song.video_id }, this.YTopts);
		var target = $('.yt-target', song.container).first().attr('id');
		var player = new YT.Player(target, theseOpts);
		song["player"] = player;
		$(player.a).removeClass('yt-target');
	}

	Playlist.prototype.getIndexOfTrack = function(song) {
		var idx = -1;

		for(var i=0; i < this.songs.length; i++) {
			if (this.songs[i] === song) {
				idx = i;
				break;
			}
		}

		return idx;
	}

	Playlist.prototype.playNext = function() {
		var currentIdx = this.getIndexOfTrack(this.currentTrack);

		if(typeof this.songs[currentIdx+1] != 'undefined') {
			var nSong = this.songs[currentIdx+1];
			nSong.play();
		} else {
			this.currentTrack = this.songs[currentIdx];
		}
	}

	Playlist.prototype.playPrev = function() {
		var currentIdx = this.getIndexOfTrack(this.currentTrack);

		if(typeof this.songs[currentIdx-1] != 'undefined') {
			var pSong = this.songs[currentIdx-1];
			pSong.play();
		}
	}

	Playlist.prototype.stopCurrentTrack = function() {
		if(typeof this.currentTrack != 'undefined') {
			this.currentTrack.stop();
		}
	}

	Playlist.prototype.toggleCurrentSong = function() {
		if(typeof this.currentTrack != 'undefined') {
			this.currentTrack.toggle();
		}
	}

	return Playlist;
});