var __split = ''.split;
module.exports = function(LiveScript){
  var fs, path;
  fs = require('fs');
  path = require('path');
  LiveScript.run = function(code, options, js){
    var filename, main, dirname, __ref;
    if (options != null) {
      filename = options.filename;
    }
    main = require.main;
    if (filename) {
      dirname = path.dirname(fs.realpathSync(filename = process.argv[1] = path.resolve(filename)));
    } else {
      dirname = filename = '.';
    }
    main.paths = main.constructor._nodeModulePaths(dirname);
    main.filename = filename;
    js || (code = LiveScript.compile(code, (__ref = {}, __import(__ref, options), __ref.bare = true, __ref)));
    try {
      return main._compile(code, filename);
    } catch (e) {
      throw hackTrace(e, code, filename);
    }
  };
  __importAll(LiveScript, require('events').EventEmitter.prototype);
  require.extensions['.ls'] = function(module, filename){
    var js;
    js = LiveScript.compile(fs.readFileSync(filename, 'utf8'), {
      filename: filename,
      bare: true
    });
    try {
      return module._compile(js, filename);
    } catch (e) {
      throw hackTrace(e, js, filename);
    }
  };
};
function hackTrace(error, js, filename){
  var stack, traces, i, trace, index, lno, end, length, lines, n, __len, __ref;
  if (error != null) {
    stack = error.stack;
  }
  if (!stack) {
    return error;
  }
  traces = __split.call(stack, '\n');
  if (!(traces.length > 1)) {
    return error;
  }
  for (i = 0, __len = traces.length; i < __len; ++i) {
    trace = traces[i];
    if (0 > (index = trace.indexOf("(" + filename + ":"))) {
      continue;
    }
    lno = (/:(\d+):/.exec(trace.slice(index + filename.length)) || '')[1];
    if (!(lno = +lno)) {
      continue;
    }
    length = ('' + (end = lno + 4)).length;
    lines || (lines = __split.call(js, '\n'));
    for (n = 1 > (__ref = lno - 4) ? 1 : __ref; n <= end; ++n) {
      traces[i] += "\n" + ('    ' + n).slice(-length) + "" + '|+'.charAt(n === lno) + " " + [lines[n - 1]];
    }
  }
  return error.stack = traces.join('\n'), error;
}
function __import(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}
function __importAll(obj, src){
  for (var key in src) obj[key] = src[key];
  return obj;
}