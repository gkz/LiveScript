(function(){
  var Coco, Lexer, parser, fs, path;
  (Coco = exports).VERSION = '0.1.3+';
  Lexer = require('./lexer').Lexer;
  parser = require('./parser').parser;
  parser.yy = require('./nodes');
  parser.lexer = {
    lex: function(){
      var tag, _ref;
      _ref = this.tokens[this.pos++] || [''], tag = _ref[0], this.yytext = _ref[1], this.yylineno = _ref[2];
      return tag;
    },
    setInput: function(it){
      this.pos = 0;
      return this.tokens = it;
    },
    upcomingInput: function(){
      return '';
    }
  };
  Coco.compile = function(code, options){
    try {
      return parser.parse(new Lexer().tokenize(code)).compileRoot(options);
    } catch (err) {
      if (options != null ? options.fileName : void 8) {
        err.message = "In " + options.fileName + ", " + err.message;
      }
      throw err;
    }
  };
  Coco.tokens = function(code, options){
    return new Lexer().tokenize(code, options);
  };
  Coco.nodes = function(source, options){
    return parser.parse(typeof source === 'string' ? new Lexer().tokenize(source, options) : source);
  };
  if (!((fs = require('fs')) && (path = require('path')))) {
    return;
  }
  Coco.run = function(code, options){
    var root, _ref;
    root = module;
    while (root.parent) {
      root = root.parent;
    }
    root.filename = fs.realpathSync((options != null ? options.fileName : void 8) || '.');
    root.moduleCache && (root.moduleCache = {});
    if (require.extensions || ((_ref = path.extname(root.filename)) !== '.co' && _ref !== '.coffee')) {
      code = Coco.compile(code, options);
    }
    return root._compile(code, root.filename);
  };
  Coco.eval = function(code, options){
    var __filename, __dirname;
    __dirname = path.dirname(__filename = options != null ? options.fileName : void 8);
    return eval(Coco.compile(code, options));
  };
  if (require.extensions) {
    require.extensions['.co'] = require.extensions['.coffee'] = function(module, filename){
      var code;
      code = Coco.compile(fs.readFileSync(filename, 'utf8'));
      return module._compile(code, filename);
    };
  } else if (require.registerExtension) {
    require.registerExtension('.co', Coco.compile);
    require.registerExtension('.coffee', Coco.compile);
  }
}).call(this);
