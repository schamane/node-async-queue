/**
 * @module node-async-queue
 */
 
/**
 * @class AsyncQueue
 * @extends EventEmitter
 * @constructor
 * @param callbacks 0..n callbacks to seed the queue
 */
var T = function() {
	T.super_.apply(this, arguments);
	this._init();
	this.add.apply(this, arguments);
};

require('util').inherits(T, require('events').EventEmitter);

/**
 * static AsyncQueue properties
 * @static
 */
T.SHIFT = 'shift';
T.COMPLETE = 'complete';
T.PROMOTE = 'promote';
T.ADD = 'add';
T.EXECUTE = 'execute';
T.REMOVE = 'remove';

/**
 * Initialization
 * @method _init
 * @private
 */
T.prototype._init = function() {
	this._running = false;
	this._q = [];
	this.on(T.EXECUTE, this._defExecFn.bind(this));
	this.on(T.SHIFT, this._defShiftFn.bind(this));
	this.on(T.ADD, this._defAddFn.bind(this));
	this.on(T.PROMOTE, this._defPromoteFn.bind(this));
	this.on(T.REMOVE, this._defRemoveFn.bind(this));
	this.iterations = 1;
	this.timeout = 0;
};

/**
 * 
 * @method _defRemoveFn
 * @private
 */
T.prototype._defRemoveFn = function(e) {
	var i = this.indexOf(e);
	
	e.removed = (i > -1) ? this._q.splice(i,1)[0] : null;
};

/**
 * 
 * @method _defPromoteFn
 * @private
 */
T.prototype._defPromoteFn = function(e) {
	var i = this.indexOf(e),
		promoted = (i > -1) ? this._q.splice(i,1)[0] : null;
		
	e.promoted = promoted;
	
	if(promoted) {
		this._q.unshift(promoted);
	}
};

/**
 * 
 * @method _defAddFn
 * @private
 */
T.prototype._defAddFn = function(e) {
	var _q = this._q,
		added = [];
		
	e.callbacks.forEach(function(c) {
		if(typeof c === 'object' || typeof c === 'function') {
			_q.push(c);
			added.push(c);
		}
	});
	
	e.added = added;
};

/**
 * 
 * @method _defExecFn
 * @private
 */
T.prototype._defExecFn = function(e) {
	e.callback();
};

/**
 * 
 * @method _defShiftFn
 * @private
 */
T.prototype._defShiftFn = function(e) {
	if(this.indexOf(e) === 0) {
		this._q.shift();
	}
};

/**
 * Execute callback
 * @method _execute
 * @private
 */
T.prototype._execute = function(callback) {
	this._running = callback._running = true;
	
	callback.iterations--;
	
	this.emit(T.EXECUTE, callback);
	
	var cont = this._running;
	
	this._running = callback._running = false;
	
	return cont;
};

/**
 * Schedule callback for delayed execution
 * @method _schedule
 * @private
 */
T.prototype._schedule = function(callback) {
	var canceled = false,
		exec = function() {
			if(!canceled && this._execute(callback)) {
				this.run();
			}
		};
	if(callback.timeout === 0) {
		this._running = true;
		process.nextTick(exec.bind(this));
	} else {
		this._running = {
			id: setTimeout(exec.bind(this), callback.timeout),
			cancel: function() {
				canceled = true;
				clearTimeout(id);
			}
		}
	}
	return false;
};

/**
 * Prepare callback for execution
 * @method _prepare
 * @private
 */
T.prototype._prepare = function(callback) {
	if(typeof callback === 'object' && callback._prepared) {
		return callback;
	}
	
	var wrapper = {
		until: function() {
			return this.until.apply(wrapper, arguments);
		}.bind(this),
		iterations: callback.iterations ? callback.iterations-- : this.iterations,
		timeout: callback.timeout || this.timeout,
		context: this,
		_prepared: true,
		fn: (typeof callback === 'function') ? callback : callback.fn,
		callback: function() {
			if(!wrapper._running) {
				wrapper.iterations--;
			}
			wrapper.fn.apply(wrapper.context, arguments);
		}.bind(this)
	};
	
	return wrapper;
};

/**
 * public
 */

T.prototype.next = function() {
	var callback;
	
	while(this._q.length) {
		callback = this._q[0] = this._prepare(this._q[0]);
		if(callback && callback.until()) {
			this.emit(T.SHIFT, callback);
			callback = null;
		} else {
			break;
		}
	}
	
	return callback || null;
};

T.prototype.run = function() {
	var callback,
		cont = true,
		first = function() {
			var _first = true;
			return function() {
				if(_first) {
					_first = false;
					return true;
				}
				return false;
			}
		}();
	
	for(callback = this.next(); cont && callback && !this.isRunning(); callback = this.next()) {
		cont = (callback.timeout < 0) ? this._execute(callback) : this._schedule(callback);
	}
	
	if(!callback) {
		this.emit(T.COMPLETE);
	}
	
	return this;
};

T.prototype.isRunning = function() {
	return !!this._running;
};

T.prototype.add = function() {
	this.emit(T.ADD, {callbacks: Array.prototype.slice.call(arguments)});
	return this;
};

T.prototype.pause = function() {
	var running = this._running;
	if(typeof running === 'object' || typeof running === 'function') {
		this._running.cancel();
	}
	
	this._running = false;
	
	return this;
};

T.prototype.stop = function() {

	this._q = [];
	
	return this.pause();
};

T.prototype.indexOf = function(callback) {
	var l = this._q.length,
		i, c;
	
	for(i=0; i < l; ++i) {
		c = this._q[i];
		if(c === callback || c.id === callback) {
			return i;
		}
	}
	
	return -1;
};

T.prototype.getCallback = function(id) {
	var i = this.indexOf(id);
	
	return (i > -1) ? this._q[i] : null;
};

T.prototype.promote = function(callback) {
	var e;
	
	if(this.isRunning()) {
		e = this.once(T.SHIFT, function() {
			this.emit(T.PROMOTE, callback);
		}.bind(this));
	} else {
		this.emit(T.PROMOTE, callback);
	}
	
	return this;
};

T.prototype.remove = function(callback) {
	var e;
	
	if(this.isRunning()) {
		e = this.once(T.SHIFT, function() {
			this.emit(T.REMOVE, callback);
		}.bind(this));
	} else {
		this.emit(T.REMOVE, callback);
	}
	
	return this;
};

T.prototype.size = function() {
	if(this.isRunning()){
		this.next();
	}
	return this._q.length;
};

T.prototype.until = function() {
	this.iterations |= 0;
	return this.iterations <= 0;
};

module.exports = T;
