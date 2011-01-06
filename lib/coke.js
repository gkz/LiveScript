var Tasks, Aliases, Flags, printTasks, __slice = [].slice;
Tasks = {
  __proto__: null
};
Aliases = {
  __proto__: null
};
Flags = {};
global.Coco = require('./coco');
global.fs = require('fs');
global.path = require('path');
global.task = function(name, description, action){
  var abbr, _ref;
  if (!action) {
    _ref = [description], action = _ref[0], description = _ref[1];
  }
  abbr = name.split(/\W+/).filter(String).map(function(it){
    return it[0];
  }).join('');
  Aliases[abbr] || (Aliases[abbr] = name);
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
  return task.action(this);
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
    var optparse, options;
    if (!it) {
      console.error('no "%s" in %s', fileName, process.cwd());
      process.exit(1);
    }
    Coco.run(slurp(fileName), {
      fileName: fileName
    });
    optparse = require('./optparse');
    if (!args.length) {
      return printTasks(optparse);
    }
    options = optparse(Flags, args);
    return options.$args.forEach(invoke, options);
  });
};
printTasks = function(optparse){
  var width, pad, name, task, desc, _ref;
  say('');
  width = Math.max.apply(Math, Object.keys(Tasks).map(function(it){
    return it.length;
  }));
  pad = Array(width >> 1).join('  ');
  for (name in _ref = Tasks) {
    task = _ref[name];
    desc = task.description ? task.description : '';
    say("coke " + (name + pad).slice(0, width) + "  " + desc);
  }
  if (Flags.length) {
    say('\n' + optparse(Flags, []));
  }
  return say('\nCoke options:\n  -f, --cokefile FILE  use FILE as the Cokefile');
};