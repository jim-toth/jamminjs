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
	var wrap = $(this.container);
	
	wrap.addClass('jammin');
	
	// jammin logo
	this.jammin_logo = $('<div>').addClass('jammin-logo');
	this.jammin_logo_text = $('<div>').addClass('jammin-window-text').text('JamminJS');
	this.jammin_logo.append(this.jammin_logo_text);
	wrap.append(this.jammin_logo);

	// jammin window
	this.jammin_window = $('<div>').addClass('jammin-window');
	wrap.append(this.jammin_window);

	// jammin playlist
	this.jammin_playlist = $('<span>').attr('id', 'playlist');
	wrap.append(this.jammin_playlist);

	// add song
	this.add_song_pane = $('<div>').addClass('add-song').attr('id', 'add-song');
	this.add_song_bg = $('<div>').addClass('add-song-bg');
	this.add_song_text = $('<div>').addClass('add-song-text').text('DRAG MUSIC LINKS HERE');
	this.add_song_subtext = $('<div>').addClass('add-song-subtext').text(this.supports_string);
	this.add_song_pane.append(this.add_song_bg);
	this.add_song_bg.append(this.add_song_text,this.add_song_subtext)
	this.add_song_pane.bind("dragover", function(ev) {
		ev.preventDefault();
	});
	this.add_song_pane.bind("drop", function(ev) {
		ev.preventDefault();
		this.acceptDroppedSong(ev);
	});
	wrap.append(this.add_song_pane);
}

Jammin.prototype.acceptDroppedSong = function() {
	console.log('drop');
}