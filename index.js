'use strict';

function once(fn, scope) {
  return function fnWrapper() {
    if (fnWrapper.hookCalled) {
      return;
    }
    fnWrapper.hookCalled = true;
    var ret = fn.apply(scope, arguments);
    if (ret && ret.then) {
      ret.then(function() {}, function() {});
    }
  };
}

var hooks = {};

/**
 *  Declares a new hook to which you can add pres and posts
 *  @param {String} name of the function
 *  @param {Function} fn - the method
 *  @param {Function} errorCb - the error handler callback
 */
hooks.hook = function(name, fn, errorCb) {
  if (arguments.length === 1 && typeof name === 'object') {
    for (var k in name) { /* `name` is a hash of hookName->hookFn */
      this.hook(k, name[k]);
    }
    return;
  }

  var proto = this.prototype || this;
  var pres = proto._pres = proto._pres || {};
  var posts = proto._posts = proto._posts || {};
  pres[name] = pres[name] || [];
  posts[name] = posts[name] || [];

  proto[name] = function() {
    var self = this;
    var hookArgs; /* arguments eventually passed to the hook - are mutable */
    var lastArg = arguments[arguments.length - 1];
    var pres = this._pres[name];
    var posts = this._posts[name];
    var _total = pres.length;
    var _current = -1;
    var _asyncsLeft = proto[name].numAsyncPres;

    function _asyncsDone(err) {
      if (err) {
        return handleError(err);
      }

      _asyncsLeft--;
      if (!_asyncsLeft) {
        _done.apply(self, hookArgs);
      }
    }

    function handleError(err) {
      if (typeof lastArg === 'function') {
        return lastArg(err);
      }
      if (errorCb) {
        return errorCb.call(self, err);
      }
      throw err;
    }

    function _next() {
      if (arguments[0] instanceof Error) {
        return handleError(arguments[0]);
      }

      var _args = Array.prototype.slice.call(arguments);
      if (_args.length && !(arguments[0] == null && typeof lastArg === 'function')) {
        hookArgs = _args;
      }

      _current++;
      if (_current < _total) {
        var currPre = pres[_current];
        if (currPre.isAsync && currPre.length < 2) {
          throw new Error('Your pre must have next and done arguments -- e.g., function(next, done, ...)');
        }
        if (currPre.length < 1) {
          throw new Error('Your pre must have a next argument -- e.g., function(next, ...)');
        }

        var preArgs = (currPre.isAsync ?
                    [once(_next), once(_asyncsDone)]
                    : [once(_next)]).concat(hookArgs);
        return currPre.apply(self, preArgs);
      }

      if (!_asyncsLeft) {
        return _done.apply(self, hookArgs);
      }
    }

    function _done() {
      var args_ = Array.prototype.slice.call(arguments);
      var total_, current_, done_, postArgs;

      if (_current === _total) {
        var next_ = function() {
          if (arguments[0] instanceof Error) {
            return handleError(arguments[0]);
          }
          var args_ = Array.prototype.slice.call(arguments, 1);
          if (args_.length) {
            hookArgs = args_;
          }
          if (++current_ < total_) {
            var currPost = posts[current_];
            if (currPost.length < 1) {
              throw new Error('Your post must have a next argument -- e.g., function (next, ...)');
            }
            var postArgs = [once(next_)].concat(hookArgs);
            return currPost.apply(self, postArgs);
          } else if (typeof lastArg === 'function') {
            /* All post handlers are done, call original callback function */
            return lastArg.apply(self, arguments);
          }
        };

        // We are assuming that if the last argument provided to the wrapped function is a function, it was expecting
        // a callback.  We trap that callback and wait to call it until all post handlers have finished.
        if (typeof lastArg === 'function') {
          args_[args_.length - 1] = once(next_);
        }

        total_ = posts.length;
        current_ = -1;
        /* Execute wrapped function, post handlers come afterward */
        var ret = fn.apply(self, args_);

        if (total_ && typeof lastArg !== 'function') {
          return next_();  // no callback provided, execute next_() manually
        }
        return ret;
      }
    }

    return _next.apply(this, arguments);
  };
  proto[name].numAsyncPres = 0;
  return this;
};

hooks.pre = function(name, isAsync, fn, errorCb) {
  if (typeof arguments[1] !== 'boolean') {
    errorCb = fn;
    fn = isAsync;
    isAsync = false;
  }
  var proto = this.prototype || this;
  var pres = proto._pres = proto._pres || {};

  this._lazySetupHooks(proto, name, errorCb);

  if (fn.isAsync = isAsync) {
    proto[name].numAsyncPres++;
  }

  (pres[name] = pres[name] || []).push(fn);
  return this;
};

hooks.post = function(name, isAsync, fn) {
  if (arguments.length === 2) {
    fn = isAsync;
    isAsync = false;
  }
  var proto = this.prototype || this;
  var posts = proto._posts = proto._posts || {};
  this._lazySetupHooks(proto, name);
  (posts[name] = posts[name] || []).push(fn);
  return this;
};

hooks.removePre = function(name, fnToRemove) {
  var proto = this.prototype || this;
  var pres = proto._pres || (proto._pres || {});
  if (!pres[name]) {
    return this;
  }
  if (arguments.length === 1) {
    /* Remove all pre callbacks for hook `name` */
    pres[name].length = 0;
  } else {
    pres[name] = pres[name].filter(function(currFn) {
      return currFn !== fnToRemove;
    });
  }
  return this;
};

hooks.removePost = function(name, fnToRemove) {
  var proto = this.prototype || this;
  var posts = proto._posts || (proto._posts || {});
  if (!posts[name]) {
    return this;
  }
  if (arguments.length === 1) {
    /* Remove all post callbacks for hook `name` */
    posts[name].length = 0;
  } else {
    posts[name] = posts[name].filter(function(currFn) {
      return currFn !== fnToRemove;
    });
  }
  return this;
};

hooks._lazySetupHooks = function(proto, methodName, errorCb) {
  if (typeof proto[methodName].numAsyncPres === 'undefined') {
    this.hook(methodName, proto[methodName], errorCb);
  }
};

module.exports = hooks;
