define(function() {
	var JamDisplay = function(div) {
		this.container = div;
		this.bgimg = undefined;
	}

	JamDisplay.prototype.show = function() {
		$(this.container).show();
	}

	JamDisplay.prototype.hide = function() {
		$(this.container).hide();
	}

	JamDisplay.prototype.setBgImage = function(img_uri) {
		this.bgimg = img_uri;
		this.container.css('background-image', 'url('+img_uri+')');
	}

	JamDisplay.prototype.clearBgImage = function() {
		this.bgimg = undefined;
		this.container.css('background-image', '');
	}

	return JamDisplay;
});