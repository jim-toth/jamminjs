define(function() {
	var Song = function(song_data) {
		this.init_data = song_data;
		if(typeof song_data.song_type != 'undefined') {
			this.song_type = song_data.song_type;
		}
		if(typeof song_data.uri != 'undefined') {
			this.uri = new Uri(song_data.uri);
		}
		if(typeof song_data.video_id != 'undefined') {
			this.video_id = song_data.video_id;
		}
		if(typeof song_data.artist != 'undefined') {
			this.artist = song_data.artist;
		}
		if(typeof song_data.title != 'undefined') {
			this.title = song_data.title;
		}
	}

	Song.prototype.play = function() {
		if (typeof this.player != 'undefined') {
			if(this.song_type == 'sc') {
				this.player.play();
			} else if(this.song_type == 'yt') {
				this.player.playVideo();
			}
		}
	}

	Song.prototype.pause = function() {
		if (typeof this.player != 'undefined') {
			if(this.song_type == 'sc') {
				this.player.pause();
			} else if(this.song_type == 'yt') {
				this.player.pauseVideo();
			}
		}
	}

	Song.prototype.stop = function() {
		if (typeof this.player != 'undefined') {
			if(this.song_type == 'sc') {
				this.player.pause();
				this.seek(0);
			} else if (this.song_type == 'yt') {
				this.seek(0);
				this.player.pauseVideo();
			}
		}
	}

	Song.prototype.toggle = function() {
		if (typeof this.player != 'undefined') {
			if(this.song_type == 'sc') {
				this.player.toggle();
			} else if(this.song_type == 'yt') {
				if (this.player.getPlayerState() == YT.PlayerState.PLAYING) {
					this.player.pauseVideo();
				} else {
					this.player.playVideo();
				}
			}
		}	
	}

	Song.prototype.seek = function(time, percent, callback) {
		if (typeof this.player != 'undefined') {
			if (this.song_type == 'sc') {
				if(percent) {
					this.player.getDuration($.proxy(function(dur) {
						this.song_length = dur;
						this.player.seekTo( ( dur * time ) / 100 );
						
						if(typeof callback != 'undefined') {
							callback();
						}
					}, this));
				} else {
					this.player.seekTo(time);
					if(typeof callback != 'undefined') {
						callback();
					}
				}
			} else if (this.song_type == 'yt') {
				if(percent) {
					this.song_length = this.player.getDuration();
					this.player.seekTo( ( this.song_length * time ) / 100 );
				} else {
					this.player.seekTo(time);
				}

				if(typeof callback != 'undefined') {
					callback();
				}
			}
		}
	}

	Song.prototype.getProgress = function(percent, callback) {
		if (typeof this.player != 'undefined') {
			if (this.song_type == 'sc') {
				// TODO: SC song progress
				// this.player.getPosition($.proxy(function(pos) {
				// 	if(typeof callback != 'undefined') {
				// 		if (percent) {
				// 			callback();
				// 		} else {

				// 		}
				// 		callback();
				// 	}
				// }, this));
			} else if (this.song_type == 'yt') {
				if (percent) {
					if(!this.song_duration) {
						this.song_duration = this.player.getDuration();
					}
					
					callback( ( this.player.getCurrentTime() / this.player.getDuration() ) * 100 );
				} else {
					callback(this.player.getCurrentTime());
				}
			}
		}
	}

	return Song;
});
