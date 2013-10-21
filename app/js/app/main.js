define(["jquery", "app/jammin"], function($, Jammin) {
	window.jamz = new Jammin($('#jamz').first(), '/js/app/test.json');
});