define(function() {
	var Song = function(song_data) {
		this.init_data = song_data;
		if(typeof song_data.song_type != 'undefined') {
			this.type = song_data.song_type;
		}
		if(typeof song_data.uri != 'undefined') {
			this.uri = new Uri(song_data.uri);
		}
		if(typeof song_data.video_id != 'undefined') {
			this.video_id = song_data.video_id;
		}
	}
	return Song;
});