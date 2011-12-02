var __split = ''.split;
module.exports = function(Coco){
  var fs, path;
  fs = require('fs');
  path = require('path');
  Coco.run = function(code, options){
    var main, filename, that;
    options || (options = {});
    main = require.main;
    main.moduleCache && (main.moduleCache = {});
    filename = '.';
    if (that = options.filename) {
      try {
        that = fs.readlinkSync(that);
      } catch (_e) {}
      main.paths = main.constructor._nodeModulePaths(path.dirname(that));
      filename = process.argv[1] = path.resolve(that);
    }
    main.filename = filename;
    options.js || (code = Coco.compile(code, {
      filename: filename,
      bare: true
    }));
    try {
      return main._compile(code, filename);
    } catch (e) {
      throw hackTrace(e, code, filename);
    }
  };
  __importAll(Coco, require('events').EventEmitter.prototype);
  return require.extensions['.co'] = function(module, filename){
    var js;
    js = Coco.compile(fs.readFileSync(filename, 'utf8'), {
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
  var traces, i, trace, index, lno, end, length, lines, n, _len, _ref;
  traces = __split.call(error != null ? error.stack : void 8, '\n');
  if (!(traces.length > 1)) {
    return error;
  }
  for (i = 0, _len = traces.length; i < _len; ++i) {
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
    for (n = 1 > (_ref = lno - 4) ? 1 : _ref; n <= end; ++n) {
      traces[i] += "\n" + ('    ' + n).slice(-length) + "" + '|+'.charAt(n === lno) + " " + [lines[n - 1]];
    }
  }
  return error.stack = traces.join('\n'), error;
}
function __importAll(obj, src){
  for (var key in src) obj[key] = src[key];
  return obj;
}