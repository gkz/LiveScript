var __importAll = function(obj, src){ for (var key in src) obj[key] = src[key]; return obj };
module.exports = function(Coco){
  var fs;
  fs = require('fs');
  Coco.run = function(code, options){
    var root, that, _ref;
    options || (options = {});
    root = module;
    while (root.parent) {
      root = root.parent;
    }
    root.filename = process.argv[1] = (that = (_ref = options.filename, delete options.filename, _ref)) ? fs.realpathSync(that) : '.';
    root.moduleCache && (root.moduleCache = {});
    options.js || (code = Coco.compile(code, options));
    return root._compile(code, root.filename);
  };
  __importAll(Coco, require('events').EventEmitter.prototype);
  return require.extensions['.co'] = function(module, filename){
    return module._compile(Coco.compile(fs.readFileSync(filename, 'utf8'), {
      bare: true
    }), filename);
  };
};