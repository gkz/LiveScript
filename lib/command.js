#!/usr/bin/env node
(function(){
  var argv, o, $args, that, filename, __join = [].join;
  argv = process.argv;
  global.LiveScript = require('./livescript');
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
  $args = (o = require('./optparse')({
    interactive: 'start REPL; use ^J for multiline input',
    compile: 'compile to JavaScript and save as .js files',
    output: ['compile into the specified directory', 'DIR'],
    watch: 'watch scripts for changes, and repeat',
    stdin: 'read stdin',
    eval: 'read command line arguments as script',
    require: ['require libraries before executing', 'FILE+'],
    bare: 'compile without the top-level function wrapper',
    print: 'print the result to stdout',
    lex: 'print the tokens the lexer produces',
    tokens: 'print the tokens the rewriter produces',
    ast: 'print the syntax tree the parser produces',
    json: 'print/compile as JSON',
    nodejs: ['pass options through to the "node" binary', 'ARGS+'],
    version: 'display version',
    help: 'display this'
  })).$args;
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
    o.run = !(o.compile || (o.compile = o.output));
    o.print || (o.print = o.compile && (o.eval || o.stdin));
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
    case !o.eval:
      argv[1] = 'eval';
      compileScript('', __join.call($args, '\n'));
      break;
    case !o.stdin:
      compileStdin();
      break;
    case !$args.length:
      compileScripts();
      break;
    case !process.stdin.readable:
      compileStdin();
      break;
    default:
      o.interactive || say(version() + '\n' + help() + '\n');
      repl();
    }
  }
  function fshoot(name, arg, callback){
    fs[name](arg, function(e, result){
      if (e) {
        die(e.stack || e);
      }
      callback(result);
    });
  }
  function compileScripts(){
    $args.forEach(function(it){
      walk(it, void 8, true);
    });
    function walk(source, base, top){
      base == null && (base = path.normalize(source));
      function work(){
        fshoot('readFile', source, function(it){
          compileScript(source, it + "", base);
        });
      }
      fs.stat(source, function(e, stats){
        if (e) {
          if (top) {
            return walk(source + ".ls");
          }
          die(e);
        }
        if (stats.isDirectory()) {
          fshoot('readdir', source, function(it){
            it.forEach(function(it){
              walk(path.join(source, it), base);
            });
          });
        } else if (top || path.extname(source).toLowerCase() === '.ls') {
          if (o.watch) {
            watch(source, work);
          } else {
            work();
          }
        }
      });
    }
  }
  function compileScript(file, input, base){
    var t, e;
    t = {
      file: file,
      input: input,
      options: {
        filename: file,
        bare: !!o.bare
      }
    };
    try {
      LiveScript.emit('lex', t);
      t.tokens = LiveScript.tokens(t.input, {
        raw: o.lex
      });
      if (o.lex || o.tokens) {
        printTokens(t.tokens);
        throw null;
      }
      LiveScript.emit('parse', t);
      t.ast = LiveScript.ast(t.tokens);
      if (o.ast) {
        say(o.json
          ? t.ast.stringify(2)
          : ''.trim.call(t.ast));
        throw null;
      }
      LiveScript.emit('compile', t);
      t.options.bare = o.json || o.run;
      if (o.json || o.run && o.print) {
        t.ast.makeReturn();
      }
      t.output = t.ast.compileRoot(t.options);
      if (o.json || o.run) {
        LiveScript.emit('run', t);
        t.result = LiveScript.run(t.output, t.options, true);
      }
      if (o.json) {
        t.output = JSON.stringify(t.result, null, 2) + '\n';
      }
      if (o.run) {
        switch (false) {
        case !o.json:
          process.stdout.write(t.output);
          break;
        case !o.print:
          console.log(t.result);
        }
        throw null;
      }
      LiveScript.emit('write', t);
      if (o.print) {
        say(t.output.trimRight());
      } else {
        writeJS(t.file, t.output, base);
      }
    } catch (e) {
      if (e != null) {
        if (LiveScript.listeners('failure').length) {
          LiveScript.emit('failure', e, t);
        } else {
          if (file) {
            warn("Failed at: " + file);
          }
          if (!(e instanceof SyntaxError || /^Parse error /.test(e.message))) {
            e = e.stack || e;
          }
          if (o.watch) {
            warn(e + '\x07');
          } else {
            die(e);
          }
        }
        return;
      }
    }
    LiveScript.emit('success', t);
  }
  function compileStdin(){
    argv[1] = 'stdin';
    (function(){
      var code;
      code = '';
      this.on('data', function(it){
        code += it;
      });
      this.on('end', function(){
        compileScript('', code);
      });
    }.call(process.openStdin()));
  }
  function watch(source, action){
    (function loop(ptime){
      fshoot('stat', source, function(__arg){
        var mtime;
        mtime = __arg.mtime;
        if (ptime ^ mtime) {
          action();
        }
        setTimeout(loop, 500, mtime);
      });
    }.call(this, 0));
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
      fs.writeFile(jsPath, js || '\n', function(e){
        if (e) {
          return warn(e);
        }
        if (o.watch) {
          util.log(source + " => " + jsPath);
        }
      });
    }
    fs.stat(dir, function(e){
      if (!e) {
        return compile();
      }
      require('child_process').exec("mkdir " + [!/^win/.test(process.platform) ? '-p' : void 8] + " " + dir, compile);
    });
  }
  function printTokens(tokens){
    var lines, tag, val, lno, l, __i, __len, __ref;
    lines = [];
    for (__i = 0, __len = tokens.length; __i < __len; ++__i) {
      __ref = tokens[__i], tag = __ref[0], val = __ref[1], lno = __ref[2];
      (lines[lno] || (lines[lno] = [])).push(tag.toLowerCase() === val
        ? tag
        : tag + ":" + val);
    }
    for (__i = 0, __len = lines.length; __i < __len; ++__i) {
      l = lines[__i];
      say(l ? l.join(' ').replace(/\n/g, '\\n') : '');
    }
  }
  function repl(){
    var repl, code, cont, reset, prompt, vm, server, _ttyWrite, __ref;
    argv[1] = 'repl';
    code = '';
    cont = false;
    repl = require('readline').createInterface(process.stdin, process.stdout);
    reset = function(){
      repl.line = code = '';
      return repl.prompt();
    };
    (_ttyWrite = repl._ttyWrite, repl)._ttyWrite = function(char){
      cont = char === '\n';
      return _ttyWrite.apply(this, arguments);
    };
    prompt = 'livescript';
    if (o.compile) {
      prompt += " -c" + (o.bare ? 'b' : '');
    }
    if (!o.compile) {
      module.paths = module.constructor._nodeModulePaths(module.filename = process.cwd() + '/repl');
      vm = require('vm');
      global.module = module;
      global.exports = exports;
      global.require = require;
      server = (__ref = __clone(require('repl').REPLServer.prototype), __ref.context = global, __ref.commands = [], __ref.useGlobal = true, __ref.eval = function(code, __arg, __arg1, cb){
        var res, err;
        try {
          res = vm.runInThisContext(code, 'repl');
        } catch (e) {
          err = e;
        }
        cb(err, res);
      }, __ref);
      repl.completer = __bind(server, 'complete');
    }
    repl.on('attemptClose', function(){
      if (repl.line || code) {
        say('');
        reset();
      } else {
        repl.close();
      }
    });
    repl.on('close', __bind(process.stdin, 'destroy'));
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
          say(LiveScript.compile(code, {
            bare: o.bare
          }));
        } else {
          _ = vm.runInThisContext(LiveScript.compile(code, {
            'eval': 'eval',
            bare: o.bare
          }), 'repl');
          _ != null && (global._ = _);
          pp(_);
          if (typeof _ === 'function') {
            say(_);
          }
        }
      } catch (e) {
        say(e);
      }
      reset();
    });
    process.on('uncaughtException', function(it){
      say("\n" + ((it != null ? it.stack : void 8) || it));
    });
    repl.setPrompt(prompt + "> ");
    repl.prompt();
  }
  function forkNode(){
    var args, i, that;
    args = argv.slice(1);
    i = 0;
    while (that = args[++i]) {
      if (that == '-n' || that == '--nodejs') {
        args.splice(i--, 2);
      }
    }
    require('child_process').spawn(process.execPath, o.nodejs.join(' ').trim().split(/\s+/).concat(args), {
      cwd: process.cwd(),
      env: process.env,
      customFds: [0, 1, 2]
    });
  }
  function help(){
    return "Usage: livescript [options] [files] [arguments]\n\nOptions:\n" + o;
  }
  function version(){
    return "LiveScript " + LiveScript.VERSION;
  }
  function __clone(it){
    function fun(){} fun.prototype = it;
    return new fun;
  }
  function __bind(obj, key){
    return function(){ return obj[key].apply(obj, arguments) };
  }
  function __repeatString(str, n){
    for (var r = ''; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;
    return r;
  }
}).call(this);
