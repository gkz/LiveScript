(function(){
  var Coco, fs, missingTask, oparse, options, optparse, path, printTasks, switches, tasks;
  fs = require('fs');
  path = require('path');
  optparse = require('./optparse');
  Coco = require('./coco');
  tasks = {};
  options = {};
  switches = [];
  oparse = null;
  global.task = function(name, description, action){
    var _ref;
    if (!action) {
      _ref = [description, action], action = _ref[0], description = _ref[1];
    }
    return tasks[name] = {
      name: name,
      description: description,
      action: action
    };
  }, global.option = function(letter, flag, description){
    return switches.push([letter, flag, description]);
  }, global.invoke = function(name){
    if (!tasks[name]) {
      missingTask(name);
    }
    return tasks[name].action(options);
  };
  exports.run = function(){
    return path.exists('Cokefile', function(exists){
      var arg, args, _i, _len, _ref, _results = [];
      if (!exists) {
        throw new Error("Cokefile not found in " + process.cwd());
      }
      args = process.argv.slice(2);
      Coco.run(fs.readFileSync('Cokefile').toString(), {
        fileName: 'Cokefile'
      });
      oparse = new optparse.OptionParser(switches);
      if (!args.length) {
        return printTasks();
      }
      options = oparse.parse(args);
      for (_i = 0, _len = (_ref = options.arguments).length; _i < _len; ++_i) {
        arg = _ref[_i];
        _results.push(invoke(arg));
      }
      return _results;
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
  missingTask = function(task){
    console.log("No such task: \"" + task + "\"");
    return process.exit(1);
  };
}).call(this);
