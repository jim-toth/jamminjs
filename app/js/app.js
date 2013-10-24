require.config({
	"baseUrl": "js/lib",
	"paths": {
		"app": "../app"
	},
	"shim": {
		"jsuri": {
			exports: 'Uri'
		},
		"jqueryui": {
			exports: '$',
			deps: ["jquery"]
		}
	}
});

requirejs(["app/main"]);