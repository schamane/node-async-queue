var Async = require('../'),
	async = new Async();
	
async.timeouts = -1;

async.add(
	function() {
		console.log("Test 1");
	},
	function() {
		console.log("Test 2");
	},
	function() {
		console.log("Test 3");
	}
);

async.run();
