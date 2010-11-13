(function(){
  var Coco, FS, OptionParser, Path, Switches, Tasks, printTasks;
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
  }, global.option = function(letter, flag, description){
    return Switches.push([letter, flag, description]);
  }, global.invoke = function(name){
    if (!(name in Tasks)) {
      console.error("no such task: \"" + name + "\"");
      process.exit(1);
    }
    return Tasks[name].action(this);
  };
  exports.run = function(){
    var args, fileName, _ref;
    args = process.argv.slice(2);
    if ((_ref = args[0]) === "-f" || _ref === "--cokefile") {
      fileName = args.splice(0, 2)[1];
    }
    return Path.exists(fileName || (fileName = 'Cokefile'), function(exists){
      var oparser, options;
      if (!exists) {
        console.error("no \"" + fileName + "\" in " + process.cwd());
        process.exit(1);
      }
      Coco.run("" + FS.readFileSync(fileName), {
        fileName: fileName
      });
      oparser = new OptionParser(Switches);
      if (!args.length) {
        return printTasks(oparser);
      }
      options = oparser.parse(args);
      return options.arguments.forEach(invoke, options);
    });
  };
  printTasks = function(oparser){
    var desc, name, pad, task, width, _ref;
    console.log('');
    width = Math.max.apply(Math, Object.keys(Tasks).map(function(it){
      return it.length;
    }));
    pad = Array(width >> 1).join('  ');
    for (name in _ref = Tasks) {
      task = _ref[name];
      desc = task.description ? '# ' + task.description : '';
      console.log("coke " + (name + pad).slice(0, width) + " " + desc);
    }
    console.log(Switches.length ? oparser.help() : '');
    return console.log('Coke options:\n  -f, --cokefile [FILE]   use FILE as the Cokefile');
  };
}).call(this);
