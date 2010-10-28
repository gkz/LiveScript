(function() {
  var CoffeeScript, readline, repl, run, stdio;
  var __import = function(obj, src, own) {
    if (own) own = Object.prototype.hasOwnProperty;
    for (var key in src) if (!own || own.call(src, key)) obj[key] = src[key];
    return obj;
  };
  CoffeeScript = require('./coffee-script');
  readline = require('readline');
  stdio = process.openStdin();
  __import(global, {
    quit: function() {
      return process.exit(0);
    }
  }, true);
  run = function(buffer) {
    var val;
    try {
      val = CoffeeScript.eval(buffer.toString(), {
        bare: true,
        globals: true,
        fileName: 'repl'
      });
      if (val !== undefined) {
        console.log(val);
      }
    } catch (err) {
      console.error(err.stack || err.toString());
    }
    return repl.prompt();
  };
  repl = readline.createInterface(stdio);
  repl.setPrompt('coco> ');
  stdio.on('data', function(buffer) {
    return repl.write(buffer);
  });
  repl.on('close', function() {
    return stdio.destroy();
  });
  repl.on('line', run);
  repl.prompt();
}).call(this);
