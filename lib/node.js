var split$ = ''.split;
module.exports = function(LiveScript){
  var fs, path;
  fs = require('fs');
  path = require('path');
  LiveScript.run = function(code, options, js){
    var filename, main, dirname, ref$, e;
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
    js || (code = LiveScript.compile(code, (ref$ = {}, import$(ref$, options), ref$.bare = true, ref$)));
    try {
      return main._compile(code, filename);
    } catch (e$) {
      e = e$;
      throw hackTrace(e, code, filename);
    }
  };
  importAll$(LiveScript, require('events').EventEmitter.prototype);
  require.extensions['.ls'] = function(module, filename){
    var js, e;
    js = LiveScript.compile(fs.readFileSync(filename, 'utf8'), {
      filename: filename,
      bare: true
    });
    try {
      return module._compile(js, filename);
    } catch (e$) {
      e = e$;
      throw hackTrace(e, js, filename);
    }
  };
};
function hackTrace(error, js, filename){
  var stack, traces, i, len$, trace, index, lno, end, length, lines, n, ref$;
  if (error != null) {
    stack = error.stack;
  }
  if (!stack) {
    return error;
  }
  traces = split$.call(stack, '\n');
  if (!(traces.length > 1)) {
    return error;
  }
  for (i = 0, len$ = traces.length; i < len$; ++i) {
    trace = traces[i];
    if (0 > (index = trace.indexOf("(" + filename + ":"))) {
      continue;
    }
    lno = (/:(\d+):/.exec(trace.slice(index + filename.length)) || '')[1];
    if (!(lno = +lno)) {
      continue;
    }
    length = ('' + (end = lno + 4)).length;
    lines || (lines = split$.call(js, '\n'));
    for (n = 1 > (ref$ = lno - 4) ? 1 : ref$; n <= end; ++n) {
      traces[i] += "\n" + ('    ' + n).slice(-length) + "" + '|+'.charAt(n === lno) + " " + [lines[n - 1]];
    }
  }
  return error.stack = traces.join('\n'), error;
}
function import$(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}
function importAll$(obj, src){
  for (var key in src) obj[key] = src[key];
  return obj;
}