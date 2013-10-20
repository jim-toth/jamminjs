require.config({
	"baseUrl": "js/lib",
	"paths": {
		"app": "../app"
	},
	"shim": {
		"jsuri": ["jsuri"]
	}
});

requirejs(["app/main"]);