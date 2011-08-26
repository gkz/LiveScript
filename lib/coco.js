var lex, parser, __import = function(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}, __importAll = function(obj, src){ for (var key in src) obj[key] = src[key]; return obj };
lex = require('./lexer').lex;
parser = require('./parser').parser;
parser.yy = require('./ast');
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
exports.VERSION = '0.6.2';
exports.compile = function(code, options){
  var that;
  try {
    return parser.parse(lex(code)).compileRoot(options);
  } catch (e) {
    if (that = options != null ? options.filename : void 8) {
      e.message += "\nat " + that;
    }
    throw e;
  }
};
exports.ast = function(it){
  return parser.parse(typeof it === 'string' ? lex(it) : it);
};
exports.tokens = lex;
exports.lex = function(it){
  return lex(it, {
    raw: true
  });
};
exports.run = function(code, options){
  var _ref;
  return Function(exports.compile(code, (_ref = {}, __import(_ref, options), _ref.bare = true, _ref)))();
};
__importAll(exports.ast, parser.yy);
if (require.extensions) {
  require('./node')(exports);
} else {
  exports.require = require;
  if ('' + this === '[object BackstagePass]') {
    this.EXPORTED_SYMBOLS = ['Coco'];
  }
}