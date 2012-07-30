var Tasks, Aliases, Flags, Options, args, ref$, filename, slice$ = [].slice;
Tasks = {
  __proto__: null
};
Aliases = {
  __proto__: null
};
Flags = {};
Options = {};
global.LiveScript = require('./livescript');
global.fs = require('fs');
global.path = require('path');
global.task = function(name, description, action){
  var ref$, key$;
  if (!action) {
    ref$ = [description, ''], action = ref$[0], description = ref$[1];
  }
  Aliases[key$ = name.split(/\W+/).filter(String).map(function(it){
    return it[0];
  }).join('')] || (Aliases[key$] = name);
  return Tasks[name] = {
    name: name,
    description: description,
    action: action
  };
};
global.option = function(name){
  var spec;
  spec = slice$.call(arguments, 1);
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
args = process.argv.slice(2);
filename = ((ref$ = args[0]) == '-f' || ref$ == '--slakefile') && args.splice(0, 2)[1] || 'Slakefile';
fs.exists(filename, function rec(affirmative){
  var optparse;
  if (!affirmative) {
    if (process.cwd() === '/') {
      console.error('no "%s"', filename);
      process.exit(1);
    }
    process.chdir('..');
    return fs.exists(filename, rec);
  }
  optparse = require('./optparse');
  LiveScript.run(slurp(filename), {
    filename: filename
  });
  Options = optparse(Flags, args);
  if (args.length) {
    return Options.$args.forEach(invoke);
  } else {
    return printTasks();
  }
});
function printTasks(){
  var width, pad, name, ref$, task, that;
  say('Usage: slake [slake options] [task options] [tasks]\n\nTasks:');
  width = Math.max.apply(Math, Object.keys(Tasks).map(function(it){
    return it.length;
  }));
  pad = repeatString$(' ', width);
  for (name in ref$ = Tasks) {
    task = ref$[name];
    say("  " + (name + pad).slice(0, width) + "  " + task.description);
  }
  if (that = Options.toString()) {
    say('\nTask options:\n' + that);
  }
  return say('\nSlake options:\n  -f, --slakefile FILE  use FILE as the Slakefile');
}
function repeatString$(str, n){
  for (var r = ''; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;
  return r;
}