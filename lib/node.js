var __importAll = function(obj, src){ for (var key in src) obj[key] = src[key]; return obj };
module.exports = function(Coco){
  var fs, path;
  fs = require('fs');
  path = require('path');
  Coco.run = function(code, options){
    var root, that;
    options || (options = {});
    root = module;
    while (root.parent) {
      root = root.parent;
    }
    root.moduleCache && (root.moduleCache = {});
    root.filename = (that = options.filename) ? (root.paths = root.constructor._nodeModulePaths(path.dirname(that)), process.argv[1] = path.resolve(that)) : '.';
    options.js || (code = Coco.compile(code, options));
    return root._compile(code, root.filename);
  };
  __importAll(Coco, require('events').EventEmitter.prototype);
  return require.extensions['.co'] = function(module, filename){
    return module._compile(Coco.compile(fs.readFileSync(filename, 'utf8'), {
      filename: filename,
      bare: true
    }), filename);
  };
};