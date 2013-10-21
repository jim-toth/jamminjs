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
				this.player.pauseVideo();
				this.seek(0);
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

	Song.prototype.seek = function(time) {
		if (typeof this.player != 'undefined') {
			if (this.song_type == 'sc') {
				this.player.seekTo(time);
			} else if (this.song_type == 'yt') {
				this.player.seekTo(time);
			}
		}
	}

	return Song;
});