var __importAll = function(obj, src){ for (var key in src) obj[key] = src[key]; return obj };
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
      main.paths = main.constructor._nodeModulePaths(path.dirname(that));
      filename = process.argv[1] = path.resolve(that);
    }
    main.filename = filename;
    options.js || (code = Coco.compile(code, options));
    return main._compile(code, filename);
  };
  __importAll(Coco, require('events').EventEmitter.prototype);
  return require.extensions['.co'] = function(module, filename){
    return module._compile(Coco.compile(fs.readFileSync(filename, 'utf8'), {
      filename: filename,
      bare: true
    }), filename);
  };
};