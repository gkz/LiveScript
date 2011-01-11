var Tasks, Aliases, Flags, Options, printTasks, __slice = [].slice;
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
  var _ref, _name;
  if (!action) {
    _ref = [description, ''], action = _ref[0], description = _ref[1];
  }
  Aliases[_name = name.split(/\W+/).filter(String).map(function(it){
    return it[0];
  }).join('')] || (Aliases[_name] = name);
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
exports.run = function(){
  var args, fileName, _ref;
  args = process.argv.slice(2);
  if ((_ref = args[0]) === '-f' || _ref === '--cokefile') {
    fileName = args.splice(0, 2)[1];
  }
  return path.exists(fileName || (fileName = 'Cokefile'), function(it){
    if (!it) {
      console.error('no "%s" in %s', fileName, process.cwd());
      process.exit(1);
    }
    Coco.run(slurp(fileName), {
      fileName: fileName
    });
    Options = require('./optparse')(Flags, args);
    if (args.length) {
      Options.$args.forEach(invoke);
    } else {
      printTasks();
    }
  });
};
printTasks = function(){
  var width, pad, name, task, _ref, _;
  say('');
  width = Math.max.apply(Math, Object.keys(Tasks).map(function(it){
    return it.length;
  }));
  pad = Array(width >> 1).join('  ');
  for (name in _ref = Tasks) {
    task = _ref[name];
    say("coke " + (name + pad).slice(0, width) + "  " + task.description);
  }
  for (_ in Flags) {
    say('\n' + Options);
    break;
  }
  return say('\nCoke options:\n  -f, --cokefile FILE  use FILE as the Cokefile');
};