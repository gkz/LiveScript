var Coco, fs, path, oparser, o, sources, compileScripts, compileScript, compileStdin, watch, writeJs, printTokens, repl, forkNode, help, version, __importAll = function(obj, src){ for (var key in src) obj[key] = src[key]; return obj }, __slice = [].slice, __bind = function(me, fn){ return function(){ return fn.apply(me, arguments) } };
Coco = __importAll(require('./coco'), require('events').EventEmitter.prototype);
fs = require('fs');
path = require('path');
oparser = require('./optparse').OptionParser([['-c', '--compile', 'compile to JavaScript and save as .js files'], ['-i', '--interactive', 'run an interactive Coco REPL'], ['-o', '--output DIR', 'set the directory for compiled JavaScript'], ['-w', '--watch', 'watch scripts for changes, and recompile'], ['-p', '--print', 'print the compiled JavaScript to stdout'], ['-s', '--stdin', 'listen for and compile scripts over stdin'], ['-e', '--eval', 'compile a string from the command line'], ['-r', '--require FILE*', 'require a library before executing your script'], ['-b', '--bare', 'compile without the top-level function wrapper'], ['-l', '--lex', 'print the tokens the lexer produces'], ['-t', '--tokens', 'print the tokens the rewriter produces'], ['-n', '--nodes', 'print the parse tree the parser produces'], ['-N', '--nodejs ARGS*', 'pass options through to the "node" binary'], ['-v', '--version', 'display Coco version'], ['-h', '--help', 'display this help message']]);
o = oparser.parse(process.argv.slice(2));
sources = o.arguments;
o.run = !(o.compile || o.print);
o.print = !!(o.print || o.eval || o.stdin && o.compile);
o.compile || (o.compile = !!o.output);
global.say = function(it){
  return process.stdout.write(it + '\n');
};
global.warn = function(it){
  return process.binding('stdin').writeError(it + '\n');
};
global.die = function(it){
  warn(it);
  return process.exit(1);
};
exports.run = function(){
  var _ref;
  if (o.nodejs) {
    return forkNode();
  }
  if (o.version) {
    return version();
  }
  if (o.help) {
    return help();
  }
  if (o.interactive) {
    return repl();
  }
  if (o.stdin) {
    return compileStdin();
  }
  if (o.eval) {
    return compileScript('', sources[0]);
  }
  if (!sources.length) {
    return (version(), help(), repl());
  }
  (_ref = process.argv).splice.apply(_ref, [2, 9e9].concat(__slice.call(o.run
    ? sources.splice(1).concat(o.literals)
    : o.literals)));
  return compileScripts();
};
compileScripts = function(){
  var compile, source, _i, _ref, _len, _results = [];
  compile = function(source, topLevel){
    return path.exists(source, function(exists){
      if (!exists) {
        die("File not found: " + source);
      }
      return fs.stat(source, function(err, stats){
        var base;
        if (stats.isDirectory()) {
          return fs.readdir(source, function(err, files){
            var file, _i, _len;
            for (_i = 0, _len = files.length; _i < _len; ++_i) {
              file = files[_i];
              compile(path.join(source, file));
            }
          });
        } else if (topLevel || path.extname(source).toLowerCase() === '.co') {
          base = path.join(source);
          fs.readFile(source, function(err, buf){
            return compileScript(source, buf.toString(), base);
          });
          if (o.watch) {
            return watch(source, base);
          }
        }
      });
    });
  };
  for (_i = 0, _len = (_ref = sources).length; _i < _len; ++_i) {
    source = _ref[_i];
    _results.push(compile(source, true));
  }
  return _results;
};
compileScript = function(file, input, base){
  var options, req, t, _i, _ref, _len;
  options = {
    fileName: file,
    bare: o.bare
  };
  if (o.require) {
    for (_i = 0, _len = (_ref = o.require).length; _i < _len; ++_i) {
      req = _ref[_i];
      require(req[0] === '.' ? fs.realpathSync(req) : req);
    }
  }
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
    return fs.readFile(source, function(err, code){
      if (err) {
        die(err.stack || err);
      }
      return compileScript(source, code.toString(), base);
    });
  });
};
writeJs = function(source, js, base){
  var filename, srcDir, baseDir, dir, jsPath, compile;
  filename = path.basename(source, path.extname(source)) + '.js';
  srcDir = path.dirname(source);
  baseDir = srcDir.slice(base.length);
  dir = o.output ? path.join(o.output, baseDir) : srcDir;
  jsPath = path.join(dir, filename);
  compile = function(){
    return fs.writeFile(jsPath, js || ' ', function(err){
      if (err) {
        return warn(err);
      } else if (o.compile && o.watch) {
        return (function(){
          try {
            return require('util').log;
          } catch (e) {
            return say;
          }
        }())("Compiled " + source);
      }
    });
  };
  return path.exists(dir, function(exists){
    if (exists) {
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
    (lines[lno] || (lines[lno] = [])).push(tag + ("," + val).replace(/\n/g, '\\n'));
  }
  for (_i = 0, _len = lines.length; _i < _len; ++_i) {
    l = lines[_i];
    _results.push(say(l ? l.join(' ') : ''));
  }
  return _results;
};
repl = function(){
  var stdin, repl;
  global.__defineGetter__('quit', function(){
    return process.exit(0);
  });
  repl = require('readline').createInterface(stdin = process.openStdin());
  stdin.on('data', __bind(repl, repl.write));
  repl.on('close', __bind(stdin, stdin.destroy));
  repl.on('line', function(it){
    try {
      global._ = Coco.eval("" + it, {
        bare: true,
        globals: true,
        fileName: 'repl'
      });
      if (_ !== void 8) {
        console.dir(_);
      }
    } catch (e) {
      say(e);
    }
    return repl.prompt();
  });
  process.on('uncaughtException', function(it){
    return say('\n' + ((typeof it != 'undefined' && it !== null ? it.stack : void 8) || it));
  });
  repl.setPrompt('coco> ');
  return repl.prompt();
};
forkNode = function(){
  var args, i, arg;
  args = process.argv.slice(1);
  i = 0;
  while (arg = args[++i]) {
    if (arg === '-j' || arg === '--nodejs') {
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
  return say('Usage: coco [options] [files]\n\n' + oparser.help());
};
version = function(){
  return say("Coco " + Coco.VERSION);
};