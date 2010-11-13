(function(){
  var Coco, fs, oparse, options, path, printTasks, switches, tasks;
  fs = require('fs');
  path = require('path');
  oparse = require('./optparse');
  Coco = require('./coco');
  tasks = {};
  options = {};
  switches = [];
  global.task = function(name, description, action){
    var _ref;
    if (!action) {
      _ref = [description], action = _ref[0], description = _ref[1];
    }
    return tasks[name] = {
      name: name,
      description: description,
      action: action
    };
  }, global.option = function(letter, flag, description){
    return switches.push([letter, flag, description]);
  }, global.invoke = function(name){
    if (!(name in tasks)) {
      console.error("no such task: \"" + task + "\"");
      process.exit(1);
    }
    return tasks[name].action(options);
  };
  exports.run = function(){
    return path.exists('Cokefile', function(exists){
      var args;
      if (!exists) {
        console.error("no Cokefile in " + process.cwd());
        process.exit(1);
      }
      args = process.argv.slice(2);
      Coco.run(fs.readFileSync('Cokefile').toString(), {
        fileName: 'Cokefile'
      });
      oparse = new oparse.OptionParser(switches);
      if (!args.length) {
        return printTasks();
      }
      options = oparse.parse(args);
      return options.arguments.forEach(invoke);
    });
  };
  printTasks = function(){
    var desc, name, pad, task, width, _ref;
    console.log('');
    width = Math.max.apply(Math, (function(){
      var _results = [];
      for (name in tasks) {
        _results.push(name.length);
      }
      return _results;
    }()));
    pad = Array(width).join(' ');
    for (name in _ref = tasks) {
      task = _ref[name];
      desc = task.description ? '# ' + task.description : '';
      console.log("coke " + (name + pad).slice(0, width) + " " + desc);
    }
    if (switches.length) {
      return console.log(oparse.help());
    }
  };
}).call(this);
