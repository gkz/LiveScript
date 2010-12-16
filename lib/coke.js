var OptionParser, Tasks, Aliases, Switches, printTasks, __slice = [].slice;
OptionParser = require('./optparse').OptionParser;
Tasks = {
  __proto__: null
};
Aliases = {
  __proto__: null
};
Switches = [];
global.Coco = require('./coco');
global.fs = require('fs');
global.path = require('path');
global.task = function(name, description, action){
  var aliases, _ref;
  if (!action) {
    _ref = [description], action = _ref[0], description = _ref[1];
  }
  _ref = [].concat(name), name = _ref[0], aliases = __slice.call(_ref, 1);
  aliases.forEach(function(it){
    return Aliases[it] = name;
  });
  return Tasks[name] = {
    name: name,
    description: description,
    action: action,
    aliases: aliases
  };
};
global.option = function(){
  return Switches.push(__slice.call(arguments));
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
  return path.exists(fileName || (fileName = 'Cokefile'), function(exists){
    var oparser, options;
    if (!exists) {
      console.error('no "%s" in %s', fileName, process.cwd());
      process.exit(1);
    }
    Coco.run(slurp(fileName), {
      fileName: fileName
    });
    oparser = OptionParser(Switches);
    if (!args.length) {
      return printTasks(oparser);
    }
    options = oparser.parse(args);
    return options.arguments.forEach(invoke, options);
  });
};
printTasks = function(oparser){
  var width, pad, name, task, desc, _ref;
  say('');
  width = Math.max.apply(Math, Object.keys(Tasks).map(function(it){
    return it.length;
  }));
  pad = Array(width >> 1).join('  ');
  for (name in _ref = Tasks) {
    task = _ref[name];
    desc = task.description ? '# ' + task.description : '';
    say("coke " + (name + pad).slice(0, width) + " " + desc);
  }
  if (Switches.length) {
    say('\n' + oparser.help());
  }
  return say('\nCoke options:\n  -f, --cokefile [FILE]   use FILE as the Cokefile');
};