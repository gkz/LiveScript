(function(){
  var CoffeeScript, readline, repl, run, stdio;
  CoffeeScript = require('./coffee-script');
  readline = require('readline');
  stdio = process.openStdin();
  global.quit = function(){
    return process.exit(0);
  };
  run = function(buffer){
    var val;
    try {
      val = CoffeeScript.eval(buffer.toString(), {
        bare: true,
        globals: true,
        fileName: 'repl'
      });
      if (val !== void 0) {
        console.log(val);
      }
    } catch (err) {
      console.error("" + (err.stack || err));
    }
    return repl.prompt();
  };
  repl = readline.createInterface(stdio);
  repl.setPrompt('coco> ');
  stdio.on('data', function(buffer){
    return repl.write(buffer);
  });
  repl.on('close', function(){
    return stdio.destroy();
  });
  repl.on('line', run);
  repl.prompt();
}).call(this);
