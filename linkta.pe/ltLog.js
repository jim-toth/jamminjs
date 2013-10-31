var fs = require('fs');
var format = require('util').format;

function ltLog() {
	this.loggingLevel = 5;
	this.logFilePath = 'server.log';
	this.fileOptions = {'flag':'a'};
}

ltLog.prototype.startLogger = function(pathName, level) {

	//Logging Levels:
	//5 - error, warn, prod, dev, verbose
	//4 - error, warn, prod, dev
	//3 - error, warn, prod
	//2 - error, warn
	//1 - error
	//0 - none

	if(typeof level != undefined) {
		this.loggingLevel = level;
	} else {
		this.loggingLevel = 5;
	}
	if(typeof pathName != undefined) {
		this.logFilePath = pathName;
	} else {
		throw 'ltLog.js: No path name specified';
	}
}

ltLog.prototype.log = function( level, message ) {

	if(level <= this.loggingLevel) {

		var levelMessage;

		switch(level) {
			case 5:
				levelMessage = '[VERBOSE]';
				break;
			case 4:
				levelMessage = '[DEV]';
				break;
			case 3:
				levelMessage = '[PROD]';
				break;
			case 2:
				levelMessage = '[WARN]';
				break;
			case 1:
				levelMessage = '[ERROR]';
				break;
			default:
				levelMessage = null;
		}

		if(levelMessage) {
			var d = new Date();

			var outMessage =  levelMessage + '[' + d.toDateString() + ' ' + d.toLocaleTimeString() + ']: ' + format("%s",message) + "\n";

			console.log(outMessage);
			fs.writeFile(this.logFilePath, outMessage, this.fileOptions, function(err) {
				if(err) { this.log(1,err); }
			});
		} else {
			this.log(2,'Illegal logging level' + message);
		}

	}
};

ltLog.prototype.error = function( message ) {
	this.log( 1, message );
};

ltLog.prototype.warn = function( message ) {
	this.log( 2, message );
};

ltLog.prototype.prod = function( message ) {
	this.log( 3, message );
};

ltLog.prototype.dev = function( message ) {
	this.log( 4, message );
};

ltLog.prototype.verbose = function( message ) {
	this.log( 5, message );
};

module.exports = new ltLog();
