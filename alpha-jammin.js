var jams = {
	"playlist":[
	]
};

var SCopts = {
	"auto_play" : false,
	"show_comments" : false,
	"iframe" : true
};

var YTopts = {
	'height': 200,
	'width': 200,
	'events': {
		'onStateChange': handleYTState
	},
	"playerVars": {
		"controls": 0,
		"enablejsapi": 1,
		"showinfo": 0
	}
};

var ytready = false;

var currentTrack;

function handleYTState(event) {
	var thisIdx = $($(event.target.a).closest('.song-wrapper')[0]).attr('playlistIdx');
	var isCurrentSong = false;
	if(getIndexOfTrack(currentTrack) == thisIdx) {
		isCurrentSong = true;
	}

	if(event.data == YT.PlayerState.ENDED) {
		nextSong();
		$(event.target.a).removeClass('jam-window');
		$('.jam-window').show();
	} else if (event.data == YT.PlayerState.PLAYING) {
		$('#play-control').text('||');
		if(getIndexOfTrack(currentTrack) != thisIdx) {
			stopCurrentTrack();
			currentTrack = jams.playlist[thisIdx];
		}
		$('#jam-window').hide();
		$(event.target.a).addClass('jam-window');
	} else if (event.data == YT.PlayerState.PAUSED) {
		if(isCurrentSong) {
			$('#play-control').text('>');
		}
	}
}

function buildYouTube(song, idx) {
	var ytwrap = $('<div>').addClass('yt-wrap').bind('click',toggleCurrentSong);
	var yt = $('<div>').attr('id', 'aud-'+idx);
	ytwrap.append(yt);
	return ytwrap;
}

function buildSoundCloud(song, idx) {
	if (typeof jams.playlist[idx].track_id != 'undefined') {
		// one call
		SC.oEmbed('http://api.soundcloud.com/tracks/'+jams.playlist[idx].track_id, SCopts, function(oEmbed) {
			$('#control-'+idx).append(oEmbed.html);
		});
	} else {
		// two call
		SC.get('/resolve', { url: jams.playlist[idx].src }, function(track) {
			jams.playlist[idx]['track_id'] = track.id;

			SC.oEmbed('http://api.soundcloud.com/tracks/'+track.id, SCopts, function(oEmbed) {
				$('#control-'+idx).append(oEmbed.html);
				var scFrame = $('#control-'+idx+' > iframe')[0];
				jams.playlist[idx]['player'] = SC.Widget(scFrame);

				jams.playlist[idx].player.bind(SC.Widget.Events.FINISH, function() {
					nextSong();
				});

				jams.playlist[idx].player.bind(SC.Widget.Events.PLAY,function() {
					if(currentTrack !== jams.playlist[idx]) {
						stopCurrentTrack();
						currentTrack = jams.playlist[idx];
					};
					$('#jam-window').addClass('sc-art').css('background-image', 'url('+track.artwork_url+')').show();
					$('#play-control').text('||');
				});

				jams.playlist[idx].player.bind(SC.Widget.Events.PAUSE,function() {
					if(currentTrack === jams.playlist[idx]) {
						$('#play-control').text('>');
					}
				});
			});
		});
	}
}

function initSC() {
	SC.initialize({
  		client_id: '8320c8fe21f98b89ad50068014b92068'
	});
}

function initYT() {
	var tag = document.createElement('script');
	tag.src = "https://www.youtube.com/player_api";
	var firstScriptTag = document.getElementsByTagName('script')[0];
	firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

function buildYT(idx) {
	if(typeof idx == 'undefined') {
		for(var i=0; i < jams.playlist.length; i++) {
			if(jams.playlist[i].type == 'yt') {
				var ytsong = jams.playlist[i];
				var theseOpts = $.extend(true, {'videoId': ytsong.src}, YTopts);
				var player = new YT.Player('aud-'+i, theseOpts);
				jams.playlist[i]['player'] = player;
			}
		}
	} else {
		var ytsong = jams.playlist[idx];
		var theseOpts = $.extend(true, {'videoId': ytsong.src}, YTopts);
		var player = new YT.Player('aud-'+idx, theseOpts);
		jams.playlist[idx]['player'] = player;
	}
}

function onYouTubePlayerAPIReady() {
	ytready = true;
	buildYT();
}

function onYouTubePlayerReady(id) {
	console.log('id: '+id);
}

function bindAddSongPane() {
	var acceptDiv = $('div#add-song');//.addClass('add-song').append($("<div>").addClass('add-song-text').text('DRAG MUSIC HERE'));
	acceptDiv.bind("dragover", function(ev) {
		ev.preventDefault();
	});
	acceptDiv.bind("drop", function(ev) {
		ev.preventDefault();
		if(typeof ev.originalEvent.dataTransfer.getData('text/plain') != 'undefined') {
			addSong(ev.originalEvent.dataTransfer.getData('text/plain'));
		}
	});

	var songInput = $('#add-song-input').bind("paste", function(ev) {
		addSong(ev.originalEvent.clipboardData.getData('text/plain'));
		$(this).val('');
	});
}

function stopCurrentTrack() {
	if(typeof currentTrack != 'undefined') {
		if(currentTrack.type == 'sc') {
			currentTrack.player.pause();
			currentTrack.player.seekTo(0);
		} else if(currentTrack.type == 'yt') {
			currentTrack.player.pauseVideo();
			$(currentTrack.player.a).removeClass('jam-window');
		}
	}
}

function toggleCurrentSong(event) {
	if(typeof currentTrack != 'undefined') {
		if(currentTrack.type == 'sc') {
			currentTrack.player.toggle();
		} else if(currentTrack.type == 'yt') {
			if(currentTrack.player.getPlayerState() == YT.PlayerState.PLAYING) {
				currentTrack.player.pauseVideo();
				$(currentTrack.player.a).removeClass('jam-window');
			} else {
				currentTrack.player.playVideo();
			}
		}
	}
}

function prevSong(event) {
	var currentIdx = getIndexOfTrack(currentTrack);
	
	if(typeof jams.playlist[currentIdx-1] != 'undefined') {
		var pSong = jams.playlist[currentIdx-1];
		if(pSong.type == 'sc') {
			pSong.player.play();
		} else if(pSong.type == 'yt') {
			pSong.player.seekTo(0);
			pSong.player.playVideo();
		}
	}
}

function nextSong(event) {
	var currentIdx = getIndexOfTrack(currentTrack);

	if(typeof jams.playlist[currentIdx+1] != 'undefined') {
		var nSong = jams.playlist[currentIdx+1];
		if(nSong.type == 'sc') {
			nSong.player.play();
		} else if(nSong.type == 'yt') {
			nSong.player.seekTo(0);
			nSong.player.playVideo();
		}
	} else {
		currentTrack = undefined;
	}
}

function getIndexOfTrack(song) {
	var idx = undefined;

	for(var i=0; i < jams.playlist.length; i++) {
		if (jams.playlist[i] === song) {
			idx = i;
		}
	}

	return idx;
}

function bindSongControls() {
	$('#prev-control').bind('click', prevSong);
	$('#play-control').bind('click', toggleCurrentSong);
	$('#next-control').bind('click', nextSong);
}

function unshorten(uri, callback) {
	$.ajax({
		type: 'GET',
		url: 'http://api.unshort.me/unshorten?r='+uri+'&api_key=e4a749627720e8c0f782f9331b28acad&format=jsonp',
		contentType: "application/json",
		dataType: 'jsonp',
		success: callback,
		error: function(e) {
       		console.log(e.message);
    	}
	});
}

function addSong(src) {
	var uri = new Uri(src);
	if(uri.host() == 'hypem.com' || uri.host() == 'www.hypem.com') {
		var path = uri.path().split("/");

		if(path[1] == 'go') { //hypem short song link
			unshorten(uri, function(json){
				handleAddedSong(json.resolvedURL, 'sc');
			});
		} else if (path[1] == 'track') { // hypem full song link
			unshorten('http://hypem.com/go/sc/'+path[2], function(json){
				handleAddedSong(json.resolvedURL, 'sc');
			});
		} else { // other/malformed hypem link
			console.log("Couldn't recognize hypem.com uri: " + uri.toString());
		}
	} else if (uri.host() == 'youtube.com' || uri.host() == 'www.youtube.com') {
		handleAddedSong(uri.getQueryParamValue('v'),'yt');
	} else if (uri.host() == 'youtu.be') {
		handleAddedSong(uri.path(), 'yt');
	} else if (uri.host() == 'soundcloud.com' || uri.host() == 'www.soundcloud.com') {
		handleAddedSong(uri.toString(), 'sc');
	} else if (uri.host() == 'snd.sc') {
		unshorten(uri, function(json) {
			handleAddedSong(json.resolvedURL, 'sc');
		});
	}
	// else { // streamed mp3
	// 	handleAddedSong(uri.toString(), 'mp3');
	// }
}

function handleAddedSong(url, type) {
	var newSong = {
		"title": "",
		"artist": "",
		"src": url,
		"type": type
	}

	if(typeof currentTrack == 'undefined') {
		currentTrack = newSong;
	}

	jams.playlist.push(newSong);
	var idx = jams.playlist.length-1;
	$('#playlist').append(buildNewSong(idx));
	if(type == 'yt' && ytready) {
		buildYT(idx);
	} else if(type == 'sc') {
		buildSoundCloud(jams.playlist[idx],idx);
	}
}

function buildNewSong(idx) {
	var song = jams.playlist[idx];

	var builtSong;
	if(song.type == 'sc') {
		builtSong = $('<div>').addClass('control').attr('id', 'control-'+idx).addClass('sc-control').attr('songType', 'sc');
	} else if(song.type == 'yt') {
		builtSong = $('<div>').addClass('control').attr('id', 'control-'+idx).addClass('yt-control').attr('songType', 'yt').append(buildYouTube(song, idx));
	}

	var sWrap = $('<span>').attr('id', 'song-'+idx).attr('playlistIdx',idx).addClass('song-wrapper');
	sWrap.append(builtSong);

	return sWrap;
}

$(document).ready(function(){
	initSC();
	initYT();
	bindAddSongPane();
	bindSongControls();
});