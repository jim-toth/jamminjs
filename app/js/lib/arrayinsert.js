/*
 	Array insert
 	courtesy of VisioN
 	http://stackoverflow.com/questions/586182/javascript-insert-item-into-array-at-a-specific-index/15621345#15621345
*/

/* Syntax:
   array.insert(index, value1, value2, ..., valueN) */
define(function () {
	window.Array.prototype.insert = function(index) {
		this.splice.apply(this, [index, 0].concat(
			Array.prototype.slice.call(arguments, 1)));
		return this;
	};
});