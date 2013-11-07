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
		$('#play-control', song_controls).bind('click', $.proxy(this.toggleCurrentSong, this));
		$('#next-control', song_controls).bind('click', $.proxy(this.playNext, this));
		$('#prog-control', song_controls).bind('click', $.proxy(this.setProg, this));
	}

	Playlist.prototype.addSong = function(song, idx) {
		var newIdx;
		if(typeof idx != 'undefined') {
			newIdx = idx;
		} else {
			newIdx = idx;
		}
		
		if(typeof idx != 'undefined') {
			this.songs.insert(idx, song);
		} else {
			this.songs.push(song);
		}

		song.container = this.buildSongContainer(newIdx, song.song_type);
		this.container.append(song.container);

		if(song.song_type == 'sc') {
			this.buildSoundCloud(song);//, $.proxy(this.refreshPlaylist, this));
		} else if(song.song_type == 'yt') {
			this.buildYouTube(song);//, $.proxy(this.refreshPlaylist, this));
		}

		// set recently added track as current song if there isnt already one
		if(typeof this.currentTrack == 'undefined') {
			this["currentTrack"] = song;
		}
	}

	Playlist.prototype.addSongs = function (songs) {
		$.each(songs.playlist, $.proxy(function(idx, song) {
			song = new Song(song);
			this.songs.insert(idx, song);

			song.container = this.buildSongContainer(idx, song.song_type);
			this.container.append(song.container);

			if(song.song_type == 'sc') {
				this.buildSoundCloud(song);
			} else if(song.song_type == 'yt') {
				this.buildYouTube(song);
			}
		}, this));

		if(typeof this.currentTrack == 'undefined' && songs.playlist.length > 0) {
			this["currentTrack"] = this.songs[0];
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

	Playlist.prototype.buildSoundCloud = function(song, callback) {
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
					}, this));

					song.player.bind(SC.Widget.Events.PLAY, $.proxy(function() {
						if(typeof this.currentTrack != 'undefined') {
							if(this.currentTrack !== song) {
								this.stopCurrentTrack();
								this['currentTrack'] = song;
							}
							if(track.artwork_url != null) {
								this.jamDisplay.setBgImage(track.artwork_url);
							}
							this.jamDisplay.show();
							$('#play-control', this.song_controls).text('||');
						}
					}, this));

					song.player.bind(SC.Widget.Events.PAUSE, $.proxy(function() {
						if(typeof this.currentTrack != 'undefined') {
							if(this.currentTrack === song) {
								$('#play-control', this.song_controls).text('>');
							}
						}
					}, this));

					song.player.bind(SC.Widget.Events.PLAY_PROGRESS, $.proxy(function(audio) {
						this.updateProg(Math.floor(audio.relativePosition * 100));
					}, this));

					if($(this.container).children().length == this.loaded_length) {
						callback();
					}
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
			if(typeof this.currentTrack.prog_check != 'undefined') {
				clearInterval(this.currentTrack.prog_check);
			}
		} else if(event.data == YT.PlayerState.PLAYING) {
			console.log('playing');
			$('#play-control', this.song_controls).text('||');
			if(!isCurrentSong) {
				this.stopCurrentTrack();
				this.currentTrack = this.songs[thisIdx];
				this.currentTrack["prog_check"] = window.setInterval($.proxy(function() {
					this.currentTrack.getProgress(true, $.proxy(function(prog) {
						this.updateProg(prog);
					}, this));
				}, this), 1000);
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

	Playlist.prototype.buildYouTube = function(song, callback) {
		var theseOpts = $.extend(true, { 'videoId': song.video_id }, this.YTopts);
		var target = $('.yt-target', song.container).first().attr('id');
		var player = new YT.Player(target, theseOpts);
		song["player"] = player;
		$(player.a).removeClass('yt-target');
		if($(this.container).children().length == this.loaded_length) {
			callback();
		}
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

	Playlist.prototype.setProg = function(event) {
		if(typeof this.currentTrack != 'undefined') {
			var progWrap = $(event.currentTarget);
			var x = event.offsetX;
			var width = progWrap.width();
			var perc = (x / width) * 100;
			this.currentTrack.seek(perc, true, $.proxy(function() {
				$('#prog-display', progWrap).progressbar("value", perc);
			}, this));
		}
	}

	Playlist.prototype.updateProg = function(perc) {

		$('#prog-display', this.song_controls).progressbar("value", perc);
	}

	Playlist.prototype.toggleCurrentSong = function() {
		if(typeof this.currentTrack != 'undefined') {
			this.currentTrack.toggle();
		}
	}

	Playlist.prototype.refreshPlaylist = function() {
		$(this.container).empty();
		$.each(this.songs, $.proxy(function(idx, song) {
			// TODO: update ids lol
			$(this.container).append(song.container);
		}, this));
		this.currentTrack = this.songs[0];
	}

	Playlist.prototype.toPlainObject = function() {
		var plistObj = { "playlist": [] };

		$.each(this.songs, $.proxy(function(idx, song) {
			var sObj = {};
			$.each(song, $.proxy(function(prop_name, song_prop) {
				if(prop_name == 'artist' || prop_name == 'title'
					|| prop_name == 'song_type' || prop_name == 'video_id') {
					sObj[prop_name] = song_prop;
				} else if(prop_name == 'uri') {
					sObj[prop_name] = song_prop.toString();
				}
			}, this));
			plistObj.playlist.push(sObj);
		}, this));

		return plistObj;
	}

	return Playlist;
});