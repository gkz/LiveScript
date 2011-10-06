#!/usr/bin/env node
var o, that, $args, argv, filename, __join = [].join;
global.Coco = require('./coco');
global.fs = require('fs');
global.path = require('path');
global.util = require('util');
global.say = function(it){
  return process.stdout.write(it + '\n');
};
global.warn = function(it){
  return process.stderr.write(it + '\n');
};
global.die = function(it){
  warn(it);
  return process.exit(1);
};
global.p = function(){
  return [].forEach.call(arguments, console.dir);
};
global.pp = function(x, showHidden, depth){
  return say(util.inspect(x, showHidden, depth, !process.env.NODE_DISABLE_COLORS));
};
global.ppp = function(it){
  return pp(it, true, null);
};
o = require('./optparse')({
  interactive: 'start REPL; use ^J for multiline input',
  compile: 'compile to JavaScript and save as .js files',
  output: ['compile into the specified directory', 'DIR'],
  watch: 'watch scripts for changes, and repeat',
  print: 'print the compiled JavaScript to stdout',
  stdin: 'read stdin',
  eval: 'read command line arguments as script',
  require: ['require libraries before executing', 'FILE+'],
  bare: 'compile without the top-level function wrapper',
  lex: 'print the tokens the lexer produces',
  tokens: 'print the tokens the rewriter produces',
  ast: 'print the syntax tree the parser produces',
  json: 'print/compile as JSON',
  nodejs: ['pass options through to the "node" binary', 'ARGS+'],
  version: 'display version',
  help: 'display this'
});
if (that = __join.call(o.$unknowns, ' ')) {
  die("Unrecognized option(s): " + that + "\n\n" + help());
}
switch (false) {
case !o.nodejs:
  forkNode();
  break;
case !o.version:
  say(version());
  break;
case !o.help:
  say(help());
  break;
default:
  o.compile || (o.compile = o.output);
  o.run = !(o.compile || o.print);
  o.print || (o.print = o.eval || o.stdin && o.compile);
  o.bare || (o.bare = o.run || o.json);
  $args = o.$args;
  argv = process.argv;
  process.execPath = argv[0] = argv[1];
  argv.splice(2, 9e9);
  argv.push.apply(argv, o.stdin
    ? $args
    : o.run
      ? $args.splice(1, 9e9)
      : []);
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
    compileScript('', __join.call($args, '\n'));
    break;
  case !$args.length:
    compileScripts();
    break;
  default:
    say(version() + '\n' + help() + '\n');
    repl();
  }
}
function fshoot(name, arg, callback){
  return fs[name](arg, function(e, result){
    if (e) {
      die(e.stack || e);
    }
    return callback(result);
  });
}
function compileScripts(){
  $args.forEach(function(it){
    return walk(it, void 8, true);
  });
  function walk(source, base, top){
    base == null && (base = path.normalize(source));
    return fs.stat(source, function(e, stats){
      if (e) {
        if (top) {
          return walk(source + ".co");
        }
        die(e);
      }
      if (stats.isDirectory()) {
        return fshoot('readdir', source, function(it){
          return it.forEach(function(it){
            return walk(path.join(source, it), base);
          });
        });
      } else if (top || path.extname(source).toLowerCase() === '.co') {
        if (o.watch) {
          watch(source, base);
        }
        return fshoot('readFile', source, function(it){
          return compileScript(source, it + "", base);
        });
      }
    });
  }
}
function compileScript(file, input, base){
  var t, e, _ref;
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
      say(o.json
        ? t.ast.stringify(2)
        : ''.trim.call(t.ast));
      throw null;
    }
    Coco.emit('compile', t);
    t.output = t.ast.compileRoot(t.options);
    if (o.run) {
      Coco.emit('run', t);
      if (o.eval) {
        global.module = module;
        global.require = require;
        console.log(('indirect', eval)(t.output));
      } else {
        Coco.run(t.output, (_ref = t.options, _ref.js = true, _ref));
      }
    } else {
      if (o.json) {
        t.output = JSON.stringify(('indirect', eval)(t.output), null, 2) + '\n';
      }
      Coco.emit('write', t);
      if (o.print) {
        say(t.output.trimRight());
      } else {
        writeJS(t.file, t.output, base);
      }
    }
  } catch (e) {
    if (e != null) {
      if (Coco.listeners('failure').length) {
        Coco.emit('failure', e, t);
      } else {
        if (file) {
          warn("Failed at: " + file);
        }
        if (!(e instanceof SyntaxError || /^Parse error /.test(e.message))) {
          e = e.stack || e;
        }
        (o.watch ? warn : die)(e);
      }
      return;
    }
  }
  return Coco.emit('success', t);
}
function compileStdin(){
  (function(){
    var code;
    code = '';
    this.on('data', function(it){
      return code += it;
    });
    this.on('end', function(){
      return compileScript(null, code);
    });
  }.call(process.openStdin()));
}
function watch(source, base){
  return fs.watchFile(source, {
    persistent: true,
    interval: 500
  }, function(curr, prev){
    if (curr.size === prev.size && +curr.mtime === +prev.mtime) {
      return;
    }
    return fshoot('readFile', source, function(buf){
      return compileScript(source, buf.toString(), base);
    });
  });
}
function writeJS(source, js, base){
  var filename, dir, that, jsPath;
  filename = path.basename(source).replace(/(?:(\.\w+)?\.\w+)?$/, function(){
    return arguments[1] || (o.json ? '.json' : '.js');
  });
  dir = path.dirname(source);
  if (that = o.output) {
    dir = path.join(that, dir.slice(base === '.'
      ? 0
      : base.length));
  }
  jsPath = path.join(dir, filename);
  function compile(){
    return fs.writeFile(jsPath, js || '\n', function(e){
      if (e) {
        return warn(e);
      }
      if (o.watch) {
        return util.log(source + " => " + jsPath);
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
  var lines, tag, val, lno, l, _i, _len, _ref;
  lines = [];
  for (_i = 0, _len = tokens.length; _i < _len; ++_i) {
    _ref = tokens[_i], tag = _ref[0], val = _ref[1], lno = _ref[2];
    (lines[lno] || (lines[lno] = [])).push(tag.toLowerCase() === val
      ? tag
      : tag + ":" + val);
  }
  for (_i = 0, _len = lines.length; _i < _len; ++_i) {
    l = lines[_i];
    say(l ? l.join(' ').replace(/\n/g, '\\n') : '');
  }
}
function repl(){
  var repl, code, cont, stdin, reset, prompt, vm, context, _ref;
  code = '';
  cont = false;
  stdin = process.openStdin();
  repl = require('readline').createInterface(stdin, process.stdout);
  reset = function(){
    repl.line = code = '';
    return repl.prompt();
  };
  prompt = 'coco';
  if (o.compile) {
    prompt += " -c" + (o.bare ? 'b' : '');
  }
  if (!o.compile) {
    module.paths = module.constructor._nodeModulePaths(module.filename = process.cwd() + '/repl');
    vm = require('vm');
    context = vm.createContext();
    __import(context, global);
    context.module = module;
    context.require = require;
    context.global = context;
    repl.completer = __bind(_ref = (_ref = __clone(require('repl').REPLServer.prototype), _ref.context = context, _ref.commands = [], _ref), _ref.complete);
  }
  repl._ttyWrite = function(char){
    cont = char === '\n';
    return this.__proto__._ttyWrite.apply(this, arguments);
  };
  repl.on('attemptClose', function(){
    if (repl.line || code) {
      say('');
      return reset();
    } else {
      return repl.close();
    }
  });
  repl.on('close', __bind(stdin, stdin.destroy));
  repl.on('line', function(it){
    var _;
    if (cont) {
      code += it + '\n';
      repl.output.write(__repeatString('.', prompt.length) + '. ');
      return;
    }
    code += it;
    try {
      if (o.compile) {
        say(Coco.compile(code, {
          bare: o.bare
        }));
      } else {
        _ = vm.runInContext(Coco.compile(code, {
          bare: true,
          repl: true
        }), context, 'repl');
        if (_ !== void 8) {
          pp(context._ = _);
          if (typeof _ === 'function') {
            say(_);
          }
        }
      }
    } catch (e) {
      say(e);
    }
    return reset();
  });
  process.on('uncaughtException', function(it){
    return say("\n" + ((it != null ? it.stack : void 8) || it));
  });
  repl.setPrompt(prompt + "> ");
  return repl.prompt();
}
function forkNode(){
  var args, i, that;
  args = process.argv.slice(1);
  i = 0;
  while (that = args[++i]) {
    if (that === '-n' || that === '--nodejs') {
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
  return "Usage: coco [options] [files] [arguments]\n\nOptions:\n" + o;
}
function version(){
  return "Coco " + Coco.VERSION;
}
function __import(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}
function __bind(me, fn){ return function(){ return fn.apply(me, arguments) } }
function __clone(it){
  function fn(){ if (this.__proto__ !== it) this.__proto__ = it }
  return fn.prototype = it, new fn;
}
function __repeatString(str, n){
  for (var r = ''; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;
  return r;
}