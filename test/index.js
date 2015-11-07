'use strict';

var hooks = require('../');
var expect = require('chai').expect;
var _ = require('underscore');

/* TODO Add in test for making sure all pres get called if pre is defined directly on an instance. */
/* TODO Test for calling `done` twice or `next` twice in the same function counts only once */
describe('hooks', function() {
  it('should be able to assign multiple hooks at once', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook({
      hook1: function(a) {},
      hook2: function(b) {}
    });
    var a = new A();
    expect(a.hook1).to.be.a('function');
    expect(a.hook2).to.be.a('function');
  });

  it('should run without pres and posts when not present', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('save', function() {
      this.value = 1;
    });
    var a = new A();
    a.save();
    expect(a.value).to.equal(1);
  });

  it('should run with pres when present', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('save', function() {
      this.value = 1;
    });
    A.pre('save', function(next) {
      this.preValue = 2;
      next();
    });
    var a = new A();
    a.save();
    expect(a.value).to.equal(1);
    expect(a.preValue).to.equal(2);
  });

  it('should run with posts when present', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('save', function() {
      this.value = 1;
    });
    A.post('save', function(next) {
      this.value = 2;
      next();
    });
    var a = new A();
    a.save();
    expect(a.value).to.equal(2);
  });

  it('should run pres and posts when present', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('save', function() {
      this.value = 1;
    });
    A.pre('save', function(next) {
      this.preValue = 2;
      next();
    });
    A.post('save', function(next) {
      this.value = 3;
      next();
    });
    var a = new A();
    a.save();
    expect(a.value).to.equal(3);
    expect(a.preValue).to.equal(2);
  });

  it('should run posts after pres', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('save', function() {
      this.value = 1;
    });
    A.pre('save', function(next) {
      this.override = 100;
      next();
    });
    A.post('save', function(next) {
      this.override = 200;
      next();
    });
    var a = new A();
    a.save();
    expect(a.value).to.equal(1);
    expect(a.override).to.equal(200);
  });

  it('should not run a hook if a pre fails', function() {
    var A = function() {};
    _.extend(A, hooks);
    var counter = 0;
    A.hook('save', function() {
      this.value = 1;
    }, function(err) {
      counter++;
    });
    A.pre('save', true, function(next, done) {
      next(new Error());
    });
    var a = new A();
    a.save();
    expect(counter).to.equal(1);
    expect(a.value).to.be.undefined;
  });

  it('should be able to run multiple pres', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('save', function() {
      this.value = 1;
    });
    A.pre('save', function(next) {
      this.v1 = 1;
      next();
    }).pre('save', function(next) {
      this.v2 = 2;
      next();
    });
    var a = new A();
    a.save();
    expect(a.v1).to.equal(1);
    expect(a.v2).to.equal(2);
  });

  it('should run multiple pres until a pre fails and not call the hook', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('save', function() {
      this.value = 1;
    }, function(err) {});
    A.pre('save', function(next) {
      this.v1 = 1;
      next();
    }).pre('save', function(next) {
      next(new Error());
    }).pre('save', function(next) {
      this.v3 = 3;
      next();
    });
    var a = new A();
    a.save();
    expect(a.v1).to.equal(1);
    expect(a.v3).to.be.undefined;
    expect(a.value).to.be.undefined;
  });

  it('should be able to run multiple posts', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('save', function() {
      this.value = 1;
    });
    A.post('save', function(next) {
      this.value = 2;
      next();
    }).post('save', function(next) {
      this.value = 3.14;
      next();
    }).post('save', function(next) {
      this.v3 = 3;
      next();
    });
    var a = new A();
    a.save();
    expect(a.value).to.eq(3.14);
    expect(a.v3).to.eq(3);
  });

  it('should run only posts up until an error', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('save', function() {
      this.value = 1;
    }, function(err) {});
    A.post('save', function(next) {
      this.value = 2;
      next();
    }).post('save', function(next) {
      this.value = 3;
      next(new Error());
    }).post('save', function(next) {
      this.value = 4;
      next();
    });
    var a = new A();
    a.save();
    expect(a.value).to.equal(3);
  });

  it('should fall back first to the hook method\'s last argument as the error handler if it is a function of arity 1 or 2', function() {
    var A = function() {};
    _.extend(A, hooks);
    var counter = 0;
    A.hook('save', function(callback) {
      this.value = 1;
    });
    A.pre('save', true, function(next, done) {
      next(new Error());
    });
    var a = new A();
    a.save(function(err) {
      if (err instanceof Error) counter++;
    });
    expect(counter).to.equal(1);
    expect(a.value).to.be.undefined;
  });

  it('should fall back second to the default error handler if specified', function() {
    var A = function() {};
    _.extend(A, hooks);
    var counter = 0;
    A.hook('save', function(callback) {
      this.value = 1;
    }, function(err) {
      if (err instanceof Error) counter++;
    });
    A.pre('save', true, function(next, done) {
      next(new Error());
    });
    var a = new A();
    a.save();
    expect(counter).to.equal(1);
    expect(a.value).to.be.undefined;
  });

  it('fallback default error handler should scope to the object', function() {
    var A = function() {
      this.counter = 0;
    };
    _.extend(A, hooks);
    var counter = 0;
    A.hook('save', function(callback) {
      this.value = 1;
    }, function(err) {
      if (err instanceof Error) this.counter++;
    });
    A.pre('save', true, function(next, done) {
      next(new Error());
    });
    var a = new A();
    a.save();
    expect(a.counter).to.equal(1);
    expect(a.value).to.be.undefined;
  });

  it('should fall back last to throwing the error', function() {
    var A = function() {};
    _.extend(A, hooks);
    var counter = 0;
    A.hook('save', function(err) {
      if (err instanceof Error) return counter++;
      this.value = 1;
    });
    A.pre('save', true, function(next, done) {
      next(new Error());
    });
    var a = new A();
    var didCatch = false;
    try {
      a.save();
    } catch (e) {
      didCatch = true;
      expect(e).to.be.an.instanceof(Error);
      expect(counter).to.equal(0);
      expect(a.value).to.be.undefined;
    }
    expect(didCatch).to.be.true;
  });

  it('should proceed without mutating arguments if `next(null|undefined)` is called in a serial pre, and the last argument of the target method is a callback with node-like signature function (err, obj) {...} or function (err) {...}', function() {
    var A = function() {};
    _.extend(A, hooks);
    var counter = 0;
    A.prototype.save = function(callback) {
      this.value = 1;
      callback();
    };
    A.pre('save', function(next) {
      next(null);
    });
    A.pre('save', function(next) {
      next(undefined);
    });
    var a = new A();
    a.save(function(err) {
      if (err instanceof Error) counter++;
      else counter--;
    });
    expect(counter).to.equal(-1);
    expect(a.value).to.eql(1);
  });

  it('should proceed with mutating arguments if `next(null|undefined)` is callback in a serial pre, and the last argument of the target method is not a function', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.prototype.set = function(v) {
      this.value = v;
    };
    A.pre('set', function(next) {
      next(undefined);
    });
    A.pre('set', function(next) {
      next(null);
    });
    var a = new A();
    a.set(1);
    expect(a.value).to.be.null;
  });

  it('should not run any posts if a pre fails', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('save', function() {
      this.value = 2;
    }, function(err) {});
    A.pre('save', function(next) {
      this.value = 1;
      next(new Error());
    }).post('save', function(next) {
      this.value = 3;
      next();
    });
    var a = new A();
    a.save();
    expect(a.value).to.equal(1);
  });

  it('can pass the hook\'s arguments verbatim to pres', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('set', function(path, val) {
      this[path] = val;
    });
    A.pre('set', function(next, path, val) {
      expect(path).to.equal('hello');
      expect(val).to.equal('world');
      next();
    });
    var a = new A();
    a.set('hello', 'world');
    expect(a.hello).to.equal('world');
  });
  //  "can pass the hook's arguments as an array to pres": function () {
  //    // Great for dynamic arity - e.g., slice(...)
  //    var A = function () {};
  //    _.extend(A, hooks);
  //    A.hook('set', function (path, val) {
  //      this[path] = val;
  //    });
  //    A.pre('set', function (next, hello, world) {
  //      hello.should.equal('hello');
  //      world.should.equal('world');
  //      next();
  //    });
  //    var a = new A();
  //    a.set('hello', 'world');
  //    assert.equal(a.hello, 'world');
  //  },
  it('can pass the hook\'s arguments verbatim to posts', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('set', function(path, val) {
      this[path] = val;
    });
    A.post('set', function(next, path, val) {
      expect(path).to.equal('hello');
      expect(val).to.equal('world');
      next();
    });
    var a = new A();
    a.set('hello', 'world');
    expect(a.hello).to.eq('world');
  });
  //  "can pass the hook's arguments as an array to posts": function () {
  //    var A = function () {};
  //    _.extend(A, hooks);
  //    A.hook('set', function (path, val) {
  //      this[path] = val;
  //    });
  //    A.post('set', function (next, halt, args) {
  //      assert.equal(args[0], 'hello');
  //      assert.equal(args[1], 'world');
  //      next();
  //    });
  //    var a = new A();
  //    a.set('hello', 'world');
  //    assert.equal(a.hello, 'world');
  //  },
  it('pres should be able to modify and pass on a modified version of the hook\'s arguments', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('set', function(path, val) {
      this[path] = val;
      expect(arguments[2]).to.eq('optional');
    });
    A.pre('set', function(next, path, val) {
      next('foo', 'bar');
    });
    A.pre('set', function(next, path, val) {
      expect(path).to.eq('foo');
      expect(val).to.eq('bar');
      next('rock', 'says', 'optional');
    });
    A.pre('set', function(next, path, val, opt) {
      expect(path).to.eq('rock');
      expect(val).to.eq('says');
      expect(opt).to.eq('optional');
      next();
    });
    var a = new A();
    a.set('hello', 'world');
    expect(a.hello).to.be.undefined;
    expect(a.rock).to.equal('says');
  });
  it('posts should see the modified version of arguments if the pres modified them', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('set', function(path, val) {
      this[path] = val;
    });
    A.pre('set', function(next, path, val) {
      next('foo', 'bar');
    });
    A.post('set', function(next, path, val) {
      expect(path).to.equal('foo');
      expect(val).to.equal('bar');
    });
    var a = new A();
    a.set('hello', 'world');
    expect(a.hello).to.be.undefined;
    expect(a.foo).to.equal('bar');
  });

  it('should pad missing arguments (relative to expected arguments of the hook) with null', function() {
    // Otherwise, with hookFn = function (a, b, next, ),
    // if we use hookFn(a), then because the pre functions are of the form
    // preFn = function (a, b, next, ), then it actually gets executed with
    // preFn(a, next, ), so when we call next() from within preFn, we are actually
    // calling ()

    var A = function() {};
    _.extend(A, hooks);
    A.hook('set', function(path, val, opts) {
      this[path] = val;
    });
    A.pre('set', function(next, path, val, opts) {
      next('foo', 'bar');
      expect(opts).to.be.undefined;
    });
    var a = new A();
    a.set('hello', 'world');
  });

  it('should not invoke the target method until all asynchronous middleware have invoked dones', function() {
    var counter = 0;
    var A = function() {};
    _.extend(A, hooks);
    A.hook('set', function(path, val) {
      counter++;
      this[path] = val;
      counter.should.equal(7);
    });
    A.pre('set', function(next, path, val) {
      counter++;
      next();
    });
    A.pre('set', true, function(next, done, path, val) {
      counter++;
      setTimeout(function() {
        counter++;
        done();
      }, 1000);
      next();
    });
    A.pre('set', function(next, path, val) {
      counter++;
      next();
    });
    A.pre('set', true, function(next, done, path, val) {
      counter++;
      setTimeout(function() {
        counter++;
        done();
      }, 500);
      next();
    });
    var a = new A();
    a.set('hello', 'world');
  });

  it('invoking a method twice should run its async middleware twice', function() {
    var counter = 0;
    var A = function() {};
    _.extend(A, hooks);
    A.hook('set', function(path, val) {
      this[path] = val;
      if (path === 'hello') counter.should.equal(1);
      if (path === 'foo') counter.should.equal(2);
    });
    A.pre('set', true, function(next, done, path, val) {
      setTimeout(function() {
        counter++;
        done();
      }, 1000);
      next();
    });
    var a = new A();
    a.set('hello', 'world');
    a.set('foo', 'bar');
  });

  it('calling the same done multiple times should have the effect of only calling it once', function() {
    var A = function() {
      this.acked = false;
    };
    _.extend(A, hooks);
    A.hook('ack', function() {
      console.log('UH OH, YOU SHOULD NOT BE SEEING THIS');
      this.acked = true;
    });
    A.pre('ack', true, function(next, done) {
      next();
      done();
      done();
    });
    A.pre('ack', true, function(next, done) {
      next();
      // Notice that done() is not invoked here
    });
    var a = new A();
    a.ack();
    setTimeout(function() {
      expect(a.acked).to.be.false;
    }, 1000);
  });

  it('calling the same next multiple times should have the effect of only calling it once', function() {
    var A = function() {
      this.acked = false;
    };
    _.extend(A, hooks);
    A.hook('ack', function() {
      console.log('UH OH, YOU SHOULD NOT BE SEEING THIS');
      this.acked = true;
    });
    A.pre('ack', function(next) {
      // force a throw to re-exec next()
      try {
        next(new Error('bam'));
      } catch (err) {
        next();
      }
    });
    A.pre('ack', function(next) {
      next();
    });
    var a = new A();
    a.ack();
    expect(a.acked).to.be.falthy;
  });

  it('asynchronous middleware should be able to pass an error via `done`, stopping the middleware chain', function() {
    var counter = 0;
    var A = function() {};
    _.extend(A, hooks);
    A.hook('set', function(path, val, fn) {
      counter++;
      this[path] = val;
      fn(null);
    });
    A.pre('set', true, function(next, done, path, val, fn) {
      setTimeout(function() {
        counter++;
        done(new Error());
      }, 1000);
      next();
    });
    var a = new A();
    a.set('hello', 'world', function(err) {
      expect(err).to.be.an.instanceof(Error);
      expect(a['hello']).to.be.undefined;
      expect(counter).to.eql(1);
    });
  });

  it('should be able to remove a particular pre', function() {
    var A = function() {};
    var preTwo;
    _.extend(A, hooks);
    A.hook('save', function() {
      this.value = 1;
    });
    A.pre('save', function(next) {
      this.preValueOne = 2;
      next();
    });
    A.pre('save', preTwo = function(next) {
      this.preValueTwo = 4;
      next();
    });
    A.removePre('save', preTwo);
    var a = new A();
    a.save();
    expect(a.value).to.equal(1);
    expect(a.preValueOne).to.equal(2);
    expect(a.preValueTwo).to.be.undefined;
  });

  it('should be able to remove all pres associated with a hook', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('save', function() {
      this.value = 1;
    });
    A.pre('save', function(next) {
      this.preValueOne = 2;
      next();
    });
    A.pre('save', function(next) {
      this.preValueTwo = 4;
      next();
    });
    A.removePre('save');
    var a = new A();
    a.save();
    expect(a.value).to.equal(1);
    expect(a.preValueOne).to.be.undefined;
    expect(a.preValueTwo).to.be.undefined;
  });

  it('should be able to remove a particular post', function() {
    var A = function() {}
      , postTwo;
    _.extend(A, hooks);
    A.hook('save', function() {
      this.value = 1;
    });
    A.post('save', function(next) {
      this.postValueOne = 2;
      next();
    });
    A.post('save', postTwo = function(next) {
      this.postValueTwo = 4;
      next();
    });
    A.removePost('save', postTwo);
    var a = new A();
    a.save();
    expect(a.value).to.equal(1);
    expect(a.postValueOne).to.equal(2);
    expect(a.postValueTwo).to.be.undefined;
  });

  it('should be able to remove all posts associated with a hook', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('save', function() {
      this.value = 1;
    });
    A.post('save', function(next) {
      this.postValueOne = 2;
      next();
    });
    A.post('save', function(next) {
      this.postValueTwo = 4;
      next();
    });
    A.removePost('save');
    var a = new A();
    a.save();
    expect(a.value).to.be.equal(1);
    expect(a.postValueOne).to.be.undefined;
    expect(a.postValueTwo).to.be.undefined;
  });

  it('#pre should lazily make a method hookable', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.prototype.save = function() {
      this.value = 1;
    };
    A.pre('save', function(next) {
      this.preValue = 2;
      next();
    });
    var a = new A();
    a.save();
    expect(a.value).to.equal(1);
    expect(a.preValue).to.equal(2);
  });

  it('#pre lazily making a method hookable should be able to provide a default errorHandler as the last argument', function() {
    var A = function() {};
    var preValue = '';
    _.extend(A, hooks);
    A.prototype.save = function() {
      this.value = 1;
    };
    A.pre('save', function(next) {
      next(new Error);
    }, function(err) {
      preValue = 'ERROR';
    });
    var a = new A();
    a.save();
    expect(a.value).to.be.undefined;
    expect(preValue).to.equal('ERROR');
  });

  it('#post should lazily make a method hookable', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.prototype.save = function() {
      this.value = 1;
    };
    A.post('save', function(next) {
      this.value = 2;
      next();
    });
    var a = new A();
    a.save();
    expect(a.value).to.be.equal(2);
  });

  it('a lazy hooks setup should handle errors via a method\'s last argument, if it\'s a callback', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.prototype.save = function(fn) {};
    A.pre('save', function(next) {
      next(new Error('hi there'));
    });
    var a = new A();
    a.save(function(err) {
      expect(err).to.be.an.instanceof(Error);
    });
  });

  it('should intercept method callbacks for post handlers', function() {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('save', function(val, callback) {
      this.value = val;
      callback();
    });
    A.post('save', function(next) {
      expect(a.value).to.eq(2);
      this.value += 2;
      setTimeout(next, 10);
    }).post('save', function(next) {
      expect(a.value).to.eq(4);
      this.value += 3;
      setTimeout(next, 10);
    }).post('save', function(next) {
      expect(a.value).to.eq(7);
      this.value2 = 3;
      setTimeout(next, 10);
    });
    var a = new A();
    a.save(2, function() {
      expect(a.value).to.eq(7);
      expect(a.value2).to.eq(3);
    });
  });

  it('should handle parallel followed by serial', function(done) {
    var A = function() {};
    _.extend(A, hooks);
    A.hook('save', function(val, callback) {
      this.value = val;
      callback();
    });
    A.pre('save', true, function(next, done) {
      process.nextTick(function() {
        done();
      });
      next();
    }).pre('save', function(done) {
      process.nextTick(function() {
        done();
      });
    });
    var a = new A();
    a.save(2, function() {
      done();
    });
  });
});
