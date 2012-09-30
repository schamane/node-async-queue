var Async = require('../'),
	async, err = true;

(async = new Async(
	function() {
		console.log("Test 1");
	},
	function() {
		async.pause();
		process.nextTick(function() {
			console.log("Test 2");
			if(err) {
				async.stop();
				return err;
			}
			async.run();
		});
	},
	function() {
		console.log("Test 3");
	}
)).on('complete', 
	function() {
		console.log("done - should be never reached");
	}
).run();
