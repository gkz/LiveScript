#!/usr/bin/env node
var o, $args, argv, that, filename, _ref, __slice = [].slice, __import = function(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}, __bind = function(me, fn){ return function(){ return fn.apply(me, arguments) } };
global.Coco = require('./coco');
global.fs = require('fs');
global.path = require('path');
global.say = function(it){
  return process.stdout.write(it + '\n');
};
global.warn = function(it){
  return process.binding('stdio').writeError(it + '\n');
};
global.die = function(it){
  warn(it);
  return process.exit(1);
};
o = require('./optparse')({
  compile: 'compile to JavaScript and save as .js files',
  interactive: 'run an interactive Coco REPL',
  output: ['set the directory for compiled JavaScript', 'DIR'],
  watch: 'watch scripts for changes, and recompile',
  print: 'print the compiled JavaScript to stdout',
  stdin: 'listen for and compile scripts over stdin',
  eval: 'compile a string from the command line',
  require: ['require libraries before executing', 'FILE+'],
  bare: 'compile without the top-level function wrapper',
  lex: 'print the tokens the lexer produces',
  tokens: 'print the tokens the rewriter produces',
  ast: 'print the syntax tree the parser produces',
  json: 'print the syntax tree as JSON',
  nodejs: ['pass options through to the "node" binary', 'ARGS+'],
  version: 'display Coco version',
  help: 'display this help message'
});
if (o.$unknowns.length) {
  say("Unrecognized option(s): " + o.$unknowns.join(' ') + "\n");
  help();
  process.exit(1);
}
o.run = !(o.compile || o.print);
o.print || (o.print = o.eval || o.stdin && o.compile);
o.compile || (o.compile = o.output);
o.bare || (o.bare = o.eval && o.run);
switch (false) {
case !o.nodejs:
  forkNode();
  break;
case !o.version:
  version();
  break;
case !o.help:
  help();
  break;
default:
  $args = o.$args;
  argv = process.argv;
  argv[0] = argv[1];
  if (that = o.require) {
    (filename = module.filename, module).filename = '.';
    that.forEach(require);
    module.filename = filename;
  }
  switch (false) {
  case !o.interactive:
    argv[1] = 'repl';
    repl();
    break;
  case !o.stdin:
    argv[1] = 'stdin';
    compileStdin();
    break;
  case !o.eval:
    argv[1] = 'eval';
    compileScript('', $args.join('\n'));
    break;
  case !$args.length:
    (_ref = process.argv).splice.apply(_ref, [2, 9e9].concat(__slice.call(o.run
      ? $args.splice(1)
      : []), __slice.call(o.$literals)));
    compileScripts();
    break;
  default:
    version();
    help();
    repl();
  }
}
function compileScripts(){
  $args.forEach(function(source){
    return path.exists(source, function(it){
      it || die("No such file or directory: " + source);
      return walk(source, path.normalize(source), true);
    });
  });
  function walk(source, base, top){
    return fs.stat(source, function(e, stats){
      if (stats.isDirectory()) {
        return fs.readdir(source, function(e, files){
          return files.forEach(function(it){
            return walk(path.join(source, it), base);
          });
        });
      } else if (top || path.extname(source).toLowerCase() === '.co') {
        if (o.watch) {
          watch(source, base);
        }
        return fs.readFile(source, function(e, buf){
          return compileScript(source, buf.toString(), base);
        });
      }
    });
  }
}
function compileScript(file, input, base){
  var t, _ref;
  t = {
    file: file,
    input: input,
    options: {
      filename: file,
      bare: !!o.bare
    }
  };
  try {
    Coco.emit('lex', t);
    t.tokens = Coco.tokens(t.input, {
      raw: o.lex
    });
    if (o.lex || o.tokens) {
      printTokens(t.tokens);
      throw null;
    }
    Coco.emit('parse', t);
    t.ast = Coco.ast(t.tokens);
    if (o.ast) {
      say(t.ast.toString().trim());
      throw null;
    }
    if (o.json) {
      say(t.ast.stringify(1));
      throw null;
    }
    Coco.emit('compile', t);
    t.output = t.ast.compileRoot(t.options);
    if (o.run) {
      Coco.emit('run', t);
      if (o.eval) {
        console.log((0, eval)(t.output));
      } else {
        Coco.run(t.output, (_ref = t.options, _ref.js = true, _ref));
      }
    } else {
      Coco.emit('write', t);
      if (o.print) {
        say(t.output.trimRight());
      } else {
        writeJS(t.file, t.output, base);
      }
    }
  } catch (e) {
    if (typeof e != 'undefined' && e !== null) {
      if (Coco.listeners('failure').length) {
        Coco.emit('failure', e, t);
      } else {
        if (file) {
          warn("Failed at: " + file + "\n");
        }
        (o.watch ? warn : die)(e.stack || e);
      }
      return;
    }
  }
  return Coco.emit('success', t);
}
function compileStdin(){
  var code;
  code = '';
  return function(){
    this.on('data', function(it){
      return code += it;
    });
    return this.on('end', function(){
      return compileScript(null, code);
    });
  }.call(process.openStdin());
}
function watch(source, base){
  return fs.watchFile(source, {
    persistent: true,
    interval: 500
  }, function(curr, prev){
    if (curr.size === prev.size && +curr.mtime === +prev.mtime) {
      return;
    }
    return fs.readFile(source, function(e, code){
      e && die(e.stack || e);
      return compileScript(source, code.toString(), base);
    });
  });
}
function writeJS(source, js, base){
  var filename, srcDir, that, dir, jsPath;
  filename = path.basename(source, path.extname(source)) + '.js';
  srcDir = path.dirname(source);
  dir = (that = o.output) ? path.join(that, srcDir.slice((base === '.' ? 0 : base.length))) : srcDir;
  jsPath = path.join(dir, filename);
  function compile(){
    return fs.writeFile(jsPath, js || '\n', function(e){
      if (e) {
        return warn(e);
      }
      if (o.watch) {
        return require('util').log(source + " => " + jsPath);
      }
    });
  }
  return path.exists(dir, function(it){
    if (it) {
      return compile();
    } else {
      return require('child_process').exec("mkdir -p " + dir, compile);
    }
  });
}
function printTokens(tokens){
  var lines, tag, val, lno, l, _i, _len, _ref, _results = [];
  lines = [];
  for (_i = 0, _len = tokens.length; _i < _len; ++_i) {
    _ref = tokens[_i], tag = _ref[0], val = _ref[1], lno = _ref[2];
    (lines[lno] || (lines[lno] = [])).push(tag.toLowerCase() === val ? tag : tag + ":" + val);
  }
  for (_i = 0, _len = lines.length; _i < _len; ++_i) {
    l = lines[_i];
    _results.push(say(l ? l.join(' ').replace(/\n/g, '\\n') : ''));
  }
  return _results;
}
function repl(){
  var repl, Script, context, buf, readline, stdin, prompt, _ref;
  module.filename = process.cwd() + '/repl';
  Script = process.binding('evals').Script;
  context = (_ref = Script.createContext(), __import(_ref, global), _ref.module = module, _ref.require = require, _ref);
  buf = '';
  readline = require('readline');
  stdin = process.openStdin();
  repl = readline.createInterface(stdin, process.stdout);
  repl.on('close', __bind(stdin, stdin.destroy));
  repl.on('line', function(it){
    var code, _;
    if ('\\' === it.slice(-1)) {
      buf += (buf && '\n') + it.slice(0, -1);
      return;
    }
    code = (buf && '\n') + it;
    buf = '';
    try {
      if (o.compile) {
        say(Coco.compile(code, {
          bare: o.bare
        }));
      } else {
        _ = Script.runInContext(Coco.compile(code, {
          bare: true,
          repl: true
        }), context);
        _ === void 8 || console.dir(context._ = _);
      }
    } catch (e) {
      say(e);
    }
    return repl.prompt();
  });
  process.on('uncaughtException', function(it){
    return say('\n' + ((it != null ? it.stack : void 8) || it));
  });
  prompt = 'coco';
  if (o.compile) {
    prompt += " -c" + (o.bare ? 'b' : '');
  }
  repl.setPrompt(prompt + '> ');
  return repl.prompt();
}
function forkNode(){
  var args, i, that;
  args = process.argv.slice(1);
  i = 0;
  while (that = args[++i]) {
    if (that === '-N' || that === '--nodejs') {
      args.splice(i--, 2);
    }
  }
  return require('child_process').spawn(process.execPath, o.nodejs.join(' ').trim().split(/\s+/).concat(args), {
    cwd: process.cwd(),
    env: process.env,
    customFds: [0, 1, 2]
  });
}
function help(){
  return say("Usage: coco [options] [files] [arguments]\n\nOptions:\n" + o);
}
function version(){
  return say("Coco " + Coco.VERSION);
}