define(["jqueryui", "app/jammin", "arrayinsert"], function($, Jammin) {

	if(typeof LINKTAPE_INIT_PLAYLIST != 'undefined') {
		window.jamz = new Jammin($('#jamz').first(), LINKTAPE_INIT_PLAYLIST);
	} else {
		window.jamz = new Jammin($('#jamz').first());
	}
});