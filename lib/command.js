(function(){
  var BANNER, Coco, EventEmitter, SWITCHES, compileOptions, compileScript, compileScripts, compileStdio, exec, fs, lint, optionParser, optparse, opts, parseOptions, path, printTokens, sources, spawn, usage, version, watch, writeJs, _ref, __importAll = function(obj, src){
    for (var key in src) obj[key] = src[key];
    return obj;
  };
  fs = require('fs');
  path = require('path');
  optparse = require('./optparse');
  Coco = require('./coco');
  _ref = require('child_process'), spawn = _ref.spawn, exec = _ref.exec;
  EventEmitter = require('events').EventEmitter;
  __importAll((global.Coco = Coco), new EventEmitter);
  BANNER = 'coco compiles Coco source files into JavaScript.\n\nUsage:\n  coco path/to/script';
  SWITCHES = [['-c', '--compile', 'compile to JavaScript and save as .js files'], ['-i', '--interactive', 'run an interactive Coco REPL'], ['-o', '--output [DIR]', 'set the directory for compiled JavaScript'], ['-w', '--watch', 'watch scripts for changes, and recompile'], ['-p', '--print', 'print the compiled JavaScript to stdout'], ['-l', '--lint', 'pipe the compiled JavaScript through JSLint'], ['-s', '--stdio', 'listen for and compile scripts over stdio'], ['-e', '--eval', 'compile a string from the command line'], ['-r', '--require [FILE*]', 'require a library before executing your script'], ['-b', '--bare', 'compile without the top-level function wrapper'], ['-t', '--tokens', 'print the tokens that the lexer produces'], ['-n', '--nodes', 'print the parse tree that Jison produces'], ['-v', '--version', 'display Coco version'], ['-h', '--help', 'display this help message']];
  opts = {};
  sources = [];
  optionParser = null;
  exports.run = function(){
    var flags, separator;
    parseOptions();
    if (opts.help) {
      return usage();
    }
    if (opts.version) {
      return version();
    }
    if (opts.interactive) {
      return require('./repl');
    }
    if (opts.stdio) {
      return compileStdio();
    }
    if (opts.eval) {
      return compileScript('', sources[0]);
    }
    if (!sources.length) {
      return require('./repl');
    }
    separator = sources.indexOf('--');
    flags = [];
    if (separator >= 0) {
      flags = sources.splice(separator + 1);
      sources.pop();
    }
    if (opts.run) {
      flags = sources.splice(1).concat(flags);
    }
    process.ARGV = process.argv = flags;
    return compileScripts();
  };
  compileScripts = function(){
    var compile, source, _i, _len, _ref, _result;
    compile = function(source, topLevel){
      return path.exists(source, function(exists){
        if (!exists) {
          throw Error("File not found: " + source);
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
            if (opts.watch) {
              return watch(source, base);
            }
          }
        });
      });
    };
    _ref = sources;
    _result = [];
    for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
      source = _ref[_i];
      _result.push(compile(source, true));
    }
    return _result;
  };
  compileScript = function(file, input, base){
    var o, options, req, t, task, _i, _len, _ref;
    o = opts;
    options = compileOptions(file);
    if (o.require) {
      _ref = o.require;
      for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
        req = _ref[_i];
        require(req.charAt(0) === '.' ? fs.realpathSync(req) : req);
      }
    }
    try {
      t = task = {
        file: file,
        input: input,
        options: options
      };
      Coco.emit('compile', task);
      switch (false) {
      case !o.tokens:
        return printTokens(Coco.tokens(t.input));
      case !o.nodes:
        return console.log(Coco.nodes(t.input).toString().trim());
      case !o.run:
        return Coco.run(t.input, t.options);
      default:
        t.output = Coco.compile(t.input, t.options);
        Coco.emit('success', task);
        switch (false) {
        case !o.print:
          return console.log(t.output.trim());
        case !o.compile:
          return writeJs(t.file, t.output, base);
        case !o.lint:
          return lint(t.file, t.output);
        }
      }
    } catch (err) {
      Coco.emit('failure', err, task);
      if (Coco.listeners('failure').length) {
        return;
      }
      if (o.watch) {
        return console.log(err.message);
      }
      console.error(err.stack);
      return process.exit(1);
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
      return compileScript('stdio', code);
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
          throw err;
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
    dir = opts.output ? path.join(opts.output, baseDir) : srcDir;
    jsPath = path.join(dir, filename);
    compile = function(){
      return fs.writeFile(jsPath, js || ' ', function(err){
        return err ? console.log(err.message) : opts.compile && opts.watch ? console.log("Compiled " + source) : void 0;
      });
    };
    return path.exists(dir, function(exists){
      return exists ? compile() : exec("mkdir -p " + dir, compile);
    });
  };
  lint = function(file, js){
    var conf, jsl, printIt;
    printIt = function(it){
      return console.log(file + ':\t' + it.toString().trim());
    };
    conf = __dirname + '/../extras/jsl.conf';
    jsl = spawn('jsl', ['-nologo', '-stdin', '-conf', conf]);
    jsl.stdout.on('data', printIt);
    jsl.stderr.on('data', printIt);
    jsl.stdin.write(js);
    return jsl.stdin.end();
  };
  printTokens = function(tokens){
    var strings, tag, value, _i, _len, _ref, _result;
    strings = (function(){
      _result = [];
      for (_i = 0, _len = tokens.length; _i < _len; ++_i) {
        _ref = tokens[_i], tag = _ref[0], value = _ref[1];
        _result.push("[" + tag + " " + value.toString().replace(/\n/, '\\n') + "]");
      }
      return _result;
    }());
    return console.log(strings.join(' '));
  };
  parseOptions = function(){
    var o;
    optionParser = new optparse.OptionParser(SWITCHES, BANNER);
    o = opts = optionParser.parse(process.argv.slice(2));
    o.compile || (o.compile = !!o.output);
    o.run = !(o.compile || o.print || o.lint);
    o.print = !!(o.print || o.eval || o.stdio && o.compile);
    return sources = o.arguments;
  };
  compileOptions = function(fileName){
    return {
      fileName: fileName,
      bare: opts.bare
    };
  };
  usage = function(){
    console.log(optionParser.help());
    return process.exit(0);
  };
  version = function(){
    console.log("Coco version " + Coco.VERSION);
    return process.exit(0);
  };
}).call(this);
