var o, sources, compileScripts, compileScript, compileStdin, watch, writeJs, printTokens, repl, forkNode, help, version, __importAll = function(obj, src){ for (var key in src) obj[key] = src[key]; return obj }, __slice = [].slice, __bind = function(me, fn){ return function(){ return fn.apply(me, arguments) } };
global.Coco = __importAll(require('./coco'), require('events').EventEmitter.prototype);
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
  require: ['require a library before executing your script', 'FILE+'],
  bare: 'compile without the top-level function wrapper',
  lex: 'print the tokens the lexer produces',
  tokens: 'print the tokens the rewriter produces',
  nodes: 'print the parse tree the parser produces',
  nodejs: ['pass options through to the "node" binary', 'ARGS+', '-N'],
  version: 'display Coco version',
  help: 'display this help message'
});
o.run = !(o.compile || o.print);
o.print || (o.print = o.eval || o.stdin && o.compile);
o.compile || (o.compile = o.output);
sources = o.$args;
exports.run = function(){
  var that, filename, _ref;
  if (o.nodejs) {
    return forkNode();
  }
  if (o.version) {
    return version();
  }
  if (o.help) {
    return help();
  }
  require.paths.push(process.cwd());
  if (that = o.require) {
    filename = module.filename;
    module.filename = '.';
    that.forEach(require);
    module.filename = filename;
  }
  switch (false) {
  case !o.interactive:
    return repl();
  case !o.stdin:
    return compileStdin();
  case !o.eval:
    return compileScript('', sources.join('\n'));
  case !sources.length:
    (_ref = process.argv).splice.apply(_ref, [2, 9e9].concat(__slice.call(o.run
      ? sources.splice(1)
      : []), __slice.call(o.$literals)));
    return compileScripts();
  default:
    version();
    help();
    return repl();
  }
};
compileScripts = function(){
  sources.forEach(function(source){
    return path.exists(source, function(yes){
      yes || die("No such file or directory: " + source);
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
};
compileScript = function(file, input, base){
  var options, t;
  options = {
    filename: file,
    bare: o.bare
  };
  try {
    Coco.emit('compile', t = {
      file: file,
      input: input,
      options: options
    });
    switch (false) {
    case !(o.lex || o.tokens):
      return printTokens(Coco.tokens(input, {
        rewrite: !o.lex
      }));
    case !o.nodes:
      return say(Coco.nodes(input).toString().trim());
    case !o.run:
      return Coco.run(input, options);
    default:
      t.output = Coco.compile(input, options);
      Coco.emit('success', t);
      switch (false) {
      case !o.print:
        return say(t.output.trim());
      case !o.compile:
        return writeJs(file, t.output, base);
      }
    }
  } catch (e) {
    Coco.emit('failure', e, t);
    if (!Coco.listeners('failure').length) {
      return (o.watch ? warn : die)((typeof e != 'undefined' && e !== null ? e.stack : void 8) || e);
    }
  }
};
compileStdin = function(){
  var code, stdin;
  code = '';
  stdin = process.openStdin();
  stdin.on('data', function(it){
    if (it) {
      return code += it;
    }
  });
  return stdin.on('end', function(){
    return compileScript(null, code);
  });
};
watch = function(source, base){
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
};
writeJs = function(source, js, base){
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
      if (o.compile && o.watch) {
        return (function(){
          try {
            return require('util').log;
          } catch (_e) {
            return say;
          }
        }())("Compiled " + source);
      }
    });
  }
  return path.exists(dir, function(yes){
    if (yes) {
      return compile();
    } else {
      return require('child_process').exec("mkdir -p " + dir, compile);
    }
  });
};
printTokens = function(tokens){
  var lines, tag, val, lno, l, _i, _len, _ref, _results = [];
  lines = [];
  for (_i = 0, _len = tokens.length; _i < _len; ++_i) {
    _ref = tokens[_i], tag = _ref[0], val = _ref[1], lno = _ref[2];
    if (tag !== (val += '')) {
      tag += ':' + val;
    }
    (lines[lno] || (lines[lno] = [])).push(tag);
  }
  for (_i = 0, _len = lines.length; _i < _len; ++_i) {
    l = lines[_i];
    _results.push(say(l ? l.join(' ').replace(/\n/g, '\\n') : ''));
  }
  return _results;
};
repl = function(){
  var stdin, repl, buf;
  global.__defineGetter__('quit', function(){
    return process.exit(0);
  });
  repl = require('readline').createInterface(stdin = process.openStdin());
  buf = '';
  repl.on('line', function(it){
    var code;
    code = buf + '\n' + it;
    if ('\\' === code.slice(-1)) {
      buf = code.slice(0, -1);
      return;
    }
    buf = '';
    try {
      global._ = Coco.eval(code.slice(1), {
        bare: true,
        globals: true,
        filename: 'repl'
      });
      _ === void 8 || console.dir(_);
    } catch (e) {
      say(e);
    }
    return repl.prompt();
  });
  repl.on('close', __bind(stdin, stdin.destroy));
  stdin.on('data', __bind(repl, repl.write));
  process.on('uncaughtException', function(it){
    return say('\n' + ((it != null ? it.stack : void 8) || it));
  });
  repl.setPrompt('coco> ');
  return repl.prompt();
};
forkNode = function(){
  var args, i, arg;
  args = process.argv.slice(1);
  i = 0;
  while (arg = args[++i]) {
    if (arg === '-N' || arg === '--nodejs') {
      args.splice(i--, 2);
    }
  }
  return require('child_process').spawn(process.execPath, o.nodejs.join(' ').trim().split(/\s+/).concat(args), {
    cwd: process.cwd(),
    env: process.env,
    customFds: [0, 1, 2]
  });
};
help = function(){
  return say("Usage: coco [options] [files] [arguments]\n\nOptions:\n" + o);
};
version = function(){
  return say("Coco " + Coco.VERSION);
};