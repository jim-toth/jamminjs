define(["jqueryui", "app/jammin", "arrayinsert"], function($, Jammin) {
	window.jamz = new Jammin($('#jamz').first(), '/js/app/test.json'); // local
	//window.jamz = new Jammin($('#jamz').first(), '/seekrit/js/app/test.json'); // linkta.pe
});