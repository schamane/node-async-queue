var Async = require('../'),
	rem, async;

rem = function() {
	console.log("Will be removed");
};

async = new Async(
rem,
function() {
	console.log("Test 1");
},
function() {
	console.log("Test 2");
},
{
	fn: function() {
		console.log("Test 3 executed after 3 sec");
	},
	timeout: 3000
},
function() {
	console.log("Test 4 start");
	async.pause();
	process.nextTick(function(){
		console.log("Test 4 end");
		async.run();
	});
},
function() {
	async.pause();
	process.nextTick(function(){
		console.log("Test 5");
		async.stop();
	});
},
function() {
	console.log("Test 6 - should never run");
}
);

async.on("complete", function() {
	console.log("First async queue done");
	var bigAsync = new Async();
	for(i=0; i < 1000000; i++) {
		bigAsync.add(rem);
	};

	bigAsync.run();

});

var first = function() {
	async.remove(rem);
	console.log("Will be executed at start");
};

async.add(first);
async.promote(first);

//async.timeout = -1;

async.run();
console.log("finish");
/*
var bigAsync = new Async();

for(i=0; i < 1000000; i++) {
	bigAsync.add({fn: rem, timeout: 1});
};

bigAsync.run();
*/
