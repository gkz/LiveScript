(function(){
  var Lexer, fs, lexer, parser, path;
  fs = require('fs');
  path = require('path');
  Lexer = require('./lexer').Lexer;
  parser = require('./parser').parser;
  exports.VERSION = '0.1';
  exports.compile = function(code, options){
    options == null && (options = {});
    try {
      return parser.parse(lexer.tokenize(code)).compile(options);
    } catch (err) {
      if (options.fileName) {
        err.message = "In " + options.fileName + ", " + err.message;
      }
      throw err;
    }
  };
  exports.tokens = function(code, options){
    return lexer.tokenize(code, options);
  };
  exports.nodes = function(source, options){
    if (typeof source === 'string') {
      return parser.parse(lexer.tokenize(source, options));
    } else {
      return parser.parse(source);
    }
  };
  exports.run = function(code, options){
    var root, _ref;
    root = module;
    while (root.parent) {
      root = root.parent;
    }
    root.filename = fs.realpathSync(options.fileName || '.');
    root.moduleCache && (root.moduleCache = {});
    if (require.extensions || ((_ref = path.extname(root.filename)) !== ".co" && _ref !== ".coffee")) {
      code = exports.compile(code, options);
    }
    return root._compile(code, root.filename);
  };
  exports.eval = function(code, options){
    var __dirname, __filename;
    __filename = options.fileName;
    __dirname = path.dirname(__filename);
    return eval(exports.compile(code, options));
  };
  lexer = new Lexer;
  parser.lexer = {
    lex: function(){
      var tag, _ref;
      _ref = this.tokens[this.pos++] || [''], tag = _ref[0], this.yytext = _ref[1], this.yylineno = _ref[2];
      return tag;
    },
    setInput: function(tokens){
      this.tokens = tokens;
      return this.pos = 0;
    },
    upcomingInput: function(){
      return '';
    }
  };
  parser.yy = require('./nodes');
  if (require.extensions) {
    require.extensions['.co'] = require.extensions['.coffee'] = function(module, filename){
      var code;
      code = exports.compile(fs.readFileSync(filename, 'utf8'));
      return module._compile(code, filename);
    };
  } else if (require.registerExtension) {
    require.registerExtension('.co', exports.compile);
    require.registerExtension('.coffee', exports.compile);
  }
}).call(this);
