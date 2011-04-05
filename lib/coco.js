var lex, parser, ast, _ref;
lex = require('./lexer').lex;
parser = require('./parser').parser;
parser.yy = ast = require('./ast');
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
exports.VERSION = '0.4.2';
exports.compile = function(code, options){
  return parser.parse(lex(code)).compileRoot(options);
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
  options || (options = {});
  return Function(exports.compile(code, (options.bare = true, options)))();
};
(_ref = exports.ast).parse = ast.parse, _ref.fromJSON = ast.fromJSON;
if (require.extensions) {
  require('./node')(exports);
} else {
  exports.require = require;
  if ("" + this === '[object BackstagePass]') {
    this.EXPORTED_SYMBOLS = ['Coco'];
  }
}