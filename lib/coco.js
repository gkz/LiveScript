var Coco, lex, parser, fs, path;
Coco = exports;
lex = require('./lexer').lex;
parser = require('./parser').parser;
parser.yy = require('./nodes');
parser.lexer = {
  lex: function(){
    var tag, _ref;
    _ref = this.tokens[++this.pos] || [''], tag = _ref[0], this.yytext = _ref[1], this.yylineno = _ref[2];
    return tag;
  },
  setInput: function(it){
    this.pos = -1;
    return this.tokens = it;
  },
  upcomingInput: function(){
    return '';
  }
};
Coco.VERSION = '0.3.0';
Coco.compile = function(code, options){
  return parser.parse(lex(code)).compileRoot(options);
};
Coco.nodes = function(it){
  return parser.parse(typeof it === 'string' ? lex(it) : it);
};
Coco.tokens = lex;
Coco.lex = function(it){
  return lex(it, {
    rewrite: false
  });
};
if ((fs = require('fs')) && (path = require('path'))) {
  Coco.run = function(code, options){
    var root, that;
    options || (options = {});
    root = module;
    while (root.parent) {
      root = root.parent;
    }
    root.filename = (that = options.filename) ? fs.realpathSync(that) : '.';
    root.moduleCache && (root.moduleCache = {});
    if (!options.js) {
      if (require.extensions || path.extname(root.filename).toLowerCase() !== '.co') {
        code = Coco.compile(code, options);
      }
    }
    return root._compile(code, root.filename);
  };
  Coco.eval = function(code, options){
    var __filename, __dirname;
    __dirname = path.dirname(__filename = module.filename = options != null ? options.filename : void 8);
    return eval(Coco.compile(code, options));
  };
  if (require.extensions) {
    require.extensions['.co'] = function(module, filename){
      return module._compile(Coco.compile(fs.readFileSync(filename, 'utf8')), filename);
    };
  } else if (require.registerExtension) {
    require.registerExtension('.co', Coco.compile);
  }
} else {
  Coco.eval = function(code, options){
    return (0, eval)(Coco.compile(code, options));
  };
  Coco.run = function(code, options){
    options || (options = {});
    Function(Coco.compile(code, (options.bare = true, options)))();
  };
  Coco.require = require;
  if (toString() === '[object BackstagePass]') {
    this.EXPORTED_SYMBOLS = ['Coco'];
  }
}