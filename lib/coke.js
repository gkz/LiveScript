(function(){
  var FS, Path, Coco, OptionParser, Tasks, Switches, printTasks, __slice = Array.prototype.slice;
  FS = require('fs');
  Path = require('path');
  Coco = require('./coco');
  OptionParser = require('./optparse').OptionParser;
  Tasks = {};
  Switches = [];
  global.task = function(name, description, action){
    var _ref;
    if (!action) {
      _ref = [description], action = _ref[0], description = _ref[1];
    }
    return Tasks[name] = {
      name: name,
      description: description,
      action: action
    };
  };
  global.option = function(){
    return Switches.push(__slice.call(arguments));
  };
  global.invoke = function(name){
    if (!(name in Tasks)) {
      console.error('no such task: "%s"', name);
      process.exit(1);
    }
    return Tasks[name].action(this);
  };
  global.say = function(it){
    return process.stdout.write(it + '\n');
  };
  global.slurp = function(){
    return '' + FS.readFileSync.apply(this, arguments);
  };
  global.spit = FS.writeFileSync;
  global.dir = FS.readdirSync;
  global.fs = FS;
  global.path = Path;
  exports.run = function(){
    var args, fileName, _ref;
    args = process.argv.slice(2);
    if ((_ref = args[0]) === '-f' || _ref === '--cokefile') {
      fileName = args.splice(0, 2)[1];
    }
    return Path.exists(fileName || (fileName = 'Cokefile'), function(exists){
      var oparser, options;
      if (!exists) {
        console.error('no "%s" in %s', fileName, process.cwd());
        process.exit(1);
      }
      Coco.run("" + FS.readFileSync(fileName), {
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
}).call(this);
