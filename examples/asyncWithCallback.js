var Async = require('../'),
	async;

(async = new Async(
	function() {
		console.log("Test 1");
	},
	function() {
		async.pause();
		process.nextTick(function() {
			console.log("Test 2");
			async.run();
		});
	},
	function() {
		console.log("Test 3");
	}
)).on('complete', 
	function() {
		console.log("done");
	}
).run();
