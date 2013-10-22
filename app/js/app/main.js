define(["jquery", "app/jammin", "arrayinsert"], function($, Jammin) {
	window.jamz = new Jammin($('#jamz').first(), '/js/app/test.json');
});