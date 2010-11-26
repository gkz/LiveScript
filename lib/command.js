(function(){
  var BANNER, Coco, OptionParser, SWITCHES, compileScript, compileScripts, compileStdio, die, exec, fs, o, oparser, parseOptions, path, printTokens, say, sources, spawn, usage, version, watch, writeJs, _ref, __importAll = function(obj, src){
    for (var key in src) obj[key] = src[key];
    return obj;
  };
  Coco = __importAll(require('./coco'), require('events').EventEmitter.prototype);
  fs = require('fs');
  path = require('path');
  OptionParser = require('./optparse').OptionParser;
  _ref = require('child_process'), spawn = _ref.spawn, exec = _ref.exec;
  BANNER = 'Usage: coco [options] [files]';
  SWITCHES = [['-c', '--compile', 'compile to JavaScript and save as .js files'], ['-i', '--interactive', 'run an interactive Coco REPL'], ['-o', '--output [DIR]', 'set the directory for compiled JavaScript'], ['-w', '--watch', 'watch scripts for changes, and recompile'], ['-p', '--print', 'print the compiled JavaScript to stdout'], ['-s', '--stdio', 'listen for and compile scripts over stdio'], ['-e', '--eval', 'compile a string from the command line'], ['-r', '--require [FILE*]', 'require a library before executing your script'], ['-b', '--bare', 'compile without the top-level function wrapper'], ['-t', '--tokens', 'print the tokens that the lexer produces'], ['-n', '--nodes', 'print the parse tree the parser produces'], ['-v', '--version', 'display Coco version'], ['-h', '--help', 'display this help message']];
  oparser = o = null;
  sources = [];
  say = function(it){
    return process.stdout.write(it + '\n');
  };
  exports.run = function(){
    var args, separator;
    parseOptions();
    if (o.version) {
      return version();
    }
    if (o.help) {
      return usage();
    }
    if (o.interactive) {
      return require('./repl');
    }
    if (o.stdio) {
      return compileStdio();
    }
    if (o.eval) {
      return compileScript('', sources[0]);
    }
    if (!sources.length) {
      version();
      usage();
      return require('./repl');
    }
    args = ~(separator = sources.indexOf('--'))
      ? sources.splice(separator, 1 / 0).slice(1)
      : [];
    if (o.run) {
      args.unshift.apply(args, sources.splice(1, 1 / 0));
    }
    process.ARGV = process.argv = args;
    return compileScripts();
  };
  compileScripts = function(){
    var compile, source, _i, _len, _ref, _results = [];
    compile = function(source, topLevel){
      return path.exists(source, function(exists){
        if (!exists) {
          die("File not found: " + source);
        }
        return fs.stat(source, function(err, stats){
          var base, _ref;
          if (stats.isDirectory()) {
            return fs.readdir(source, function(err, files){
              var file, _i, _len;
              for (_i = 0, _len = files.length; _i < _len; ++_i) {
                file = files[_i];
                compile(path.join(source, file));
              }
              return null;
            });
          } else if (topLevel || ((_ref = path.extname(source)) === ".co" || _ref === ".coffee")) {
            base = path.join(source);
            fs.readFile(source, function(err, code){
              return compileScript(source, code.toString(), base);
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
    var options, req, t, _i, _len, _ref;
    options = {
      fileName: file,
      bare: o.bare
    };
    if (o.require) {
      for (_i = 0, _len = (_ref = o.require).length; _i < _len; ++_i) {
        req = _ref[_i];
        require(req.charAt(0) === '.' ? fs.realpathSync(req) : req);
      }
    }
    try {
      Coco.emit('compile', t = {
        file: file,
        input: input,
        options: options
      });
      switch (false) {
      case !o.tokens:
        return printTokens(Coco.tokens(t.input));
      case !o.nodes:
        return say(Coco.nodes(t.input).toString().trim());
      case !o.run:
        return Coco.run(t.input, t.options);
      default:
        t.output = Coco.compile(t.input, t.options);
        Coco.emit('success', t);
        switch (false) {
        case !o.print:
          return say(t.output.trim());
        case !o.compile:
          return writeJs(t.file, t.output, base);
        }
      }
    } catch (err) {
      Coco.emit('failure', err, t);
      if (Coco.listeners('failure').length) {
        return;
      }
      if (o.watch) {
        return console.error(err);
      }
      return die(err.stack);
    }
  };
  compileStdio = function(){
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
      if (curr.size === prev.size && curr.mtime.getTime() === prev.mtime.getTime()) {
        return;
      }
      return fs.readFile(source, function(err, code){
        if (err) {
          die(err.stack);
        }
        return compileScript(source, code.toString(), base);
      });
    });
  };
  writeJs = function(source, js, base){
    var baseDir, compile, dir, filename, jsPath, srcDir;
    filename = path.basename(source, path.extname(source)) + '.js';
    srcDir = path.dirname(source);
    baseDir = srcDir.slice(base.length);
    dir = o.output ? path.join(o.output, baseDir) : srcDir;
    jsPath = path.join(dir, filename);
    compile = function(){
      return fs.writeFile(jsPath, js || ' ', function(err){
        if (err) {
          return console.error(err);
        } else if (o.compile && o.watch) {
          return say("Compiled " + source);
        }
      });
    };
    return path.exists(dir, function(exists){
      if (exists) {
        return compile();
      } else {
        return exec("mkdir -p " + dir, compile);
      }
    });
  };
  printTokens = function(tokens){
    var strings, tag, value;
    strings = (function(){
      var _i, _len, _ref, _ref2, _results = [];
      for (_i = 0, _len = (_ref = tokens).length; _i < _len; ++_i) {
        _ref2 = _ref[_i], tag = _ref2[0], value = _ref2[1];
        _results.push("[" + tag + " " + value.toString().replace(/\n/, '\\n') + "]");
      }
      return _results;
    }());
    return say(strings.join(' '));
  };
  parseOptions = function(){
    oparser = new OptionParser(SWITCHES, BANNER);
    o = oparser.parse(process.argv.slice(2));
    sources = o.arguments;
    o.run = !(o.compile || o.print);
    o.print = !!(o.print || o.eval || o.stdio && o.compile);
    return o.compile || (o.compile = !!o.output);
  };
  usage = function(){
    return say(oparser.help());
  };
  version = function(){
    return say("Coco " + Coco.VERSION);
  };
  die = function(it){
    console.error(it);
    return process.exit(1);
  };
}).call(this);
