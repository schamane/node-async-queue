var Async = require('../');

(new Async(
	function() {
		console.log("Test 1");
	},
	function() {
		console.log("Test 2");
	},
	function() {
		console.log("Test 3");
	}
)).on('complete', 
	function() {
		console.log("done");
	}
).run();
