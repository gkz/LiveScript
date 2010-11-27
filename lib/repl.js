(function(){
  var Coco, repl, stdin, __bind = function(me, fn){ return function(){ return fn.apply(me, arguments); }; };
  Coco = require('./coco');
  global.say = function(it){
    process.stdout.write(it + '\n');
    return;
  };
  global.__defineGetter__('quit', function(){
    return process.exit(0);
  });
  repl = require('readline').createInterface(stdin = process.openStdin());
  stdin.on('data', __bind(repl, repl.write));
  repl.on('close', __bind(stdin, stdin.destroy));
  repl.on('line', function(it){
    var r;
    try {
      r = Coco.eval("" + it, {
        bare: true,
        globals: true,
        fileName: 'repl'
      });
    } catch (e) {
      r = (typeof e != "undefined" && e !== null ? e.stack : void 8) || e;
    }
    if (r !== void 8) {
      say(r);
    }
    return repl.prompt();
  });
  repl.setPrompt('coco> ');
  repl.prompt();
}).call(this);
