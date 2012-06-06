var lexer, parser;
lexer = require('./lexer');
parser = require('./parser').parser;
parser.yy = require('./ast');
parser.lexer = {
  lex: function(){
    var tag, __ref;
    __ref = this.tokens[++this.pos] || [''], tag = __ref[0], this.yytext = __ref[1], this.yylineno = __ref[2];
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
exports.VERSION = '0.9.8c';
exports.compile = function(code, options){
  var that;
  try {
    return parser.parse(lexer.lex(code)).compileRoot(options);
  } catch (e) {
    if (that = options != null ? options.filename : void 8) {
      e.message += "\nat " + that;
    }
    throw e;
  }
};
exports.ast = function(it){
  return parser.parse(typeof it === 'string' ? lexer.lex(it) : it);
};
exports.tokens = lexer.lex;
exports.lex = function(it){
  return lexer.lex(it, {
    raw: true
  });
};
exports.run = function(code, options){
  var __ref;
  return Function(exports.compile(code, (__ref = {}, __import(__ref, options), __ref.bare = true, __ref)))();
};
exports.tokens.rewrite = lexer.rewrite;
__importAll(exports.ast, parser.yy);
if (require.extensions) {
  require('./node')(exports);
} else {
  exports.require = require;
  if ('' + this === '[object BackstagePass]') {
    this.EXPORTED_SYMBOLS = ['LiveScript'];
  }
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