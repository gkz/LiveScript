#!/usr/bin/env node
var Tasks, Aliases, Flags, Options, __slice = [].slice;
Tasks = {
  __proto__: null
};
Aliases = {
  __proto__: null
};
Flags = {};
Options = {};
global.Coco = require('./coco');
global.fs = require('fs');
global.path = require('path');
global.task = function(name, description, action){
  var _ref, _key;
  if (!action) {
    _ref = [description, ''], action = _ref[0], description = _ref[1];
  }
  Aliases[_key = name.split(/\W+/).filter(String).map(function(it){
    return it[0];
  }).join('')] || (Aliases[_key] = name);
  return Tasks[name] = {
    name: name,
    description: description,
    action: action
  };
};
global.option = function(){
  var name, spec;
  name = arguments[0], spec = __slice.call(arguments, 1);
  return Flags[name] = spec;
};
global.invoke = function(name){
  var task;
  if (!(task = Tasks[name] || Tasks[Aliases[name]])) {
    console.error('no such task: "%s"', name);
    process.exit(1);
  }
  return task.action(Options);
};
global.say = function(it){
  return process.stdout.write(it + '\n');
};
global.slurp = function(){
  return '' + fs.readFileSync.apply(this, arguments);
};
global.spit = fs.writeFileSync;
global.dir = fs.readdirSync;
(function(){
  var args, filename, _ref;
  args = process.argv.slice(2);
  if ((_ref = args[0]) === '-f' || _ref === '--cokefile') {
    filename = args.splice(0, 2)[1];
  }
  return path.exists(filename || (filename = 'Cokefile'), function(it){
    if (!it) {
      console.error('no "%s" in %s', filename, process.cwd());
      process.exit(1);
    }
    require.paths.push(process.cwd());
    Coco.run(slurp(filename), {
      filename: filename
    });
    Options = require('./optparse')(Flags, args);
    if (args.length) {
      return Options.$args.forEach(invoke);
    } else {
      return printTasks();
    }
  });
})();
function printTasks(){
  var width, pad, name, task, that, _ref;
  say('Usage: coke [coke options] [task options] [tasks]\n\nTasks:');
  width = Math.max.apply(Math, Object.keys(Tasks).map(function(it){
    return it.length;
  }));
  pad = Array(width >> 1).join('  ');
  for (name in _ref = Tasks) {
    task = _ref[name];
    say("  " + (name + pad).slice(0, width) + "  " + task.description);
  }
  if (that = Options.toString()) {
    say('\nTask options:\n' + that);
  }
  return say('\nCoke options:\n  -f, --cokefile FILE  use FILE as the Cokefile');
}