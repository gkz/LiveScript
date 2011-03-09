var Coco, lex, parser, ast, _ref;
Coco = exports;
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
Coco.VERSION = '0.4.0b';
Coco.compile = function(code, options){
  return parser.parse(lex(code)).compileRoot(options);
};
Coco.ast = function(it){
  return parser.parse(typeof it === 'string' ? lex(it) : it);
};
Coco.tokens = lex;
Coco.lex = function(it){
  return lex(it, {
    raw: true
  });
};
Coco.run = function(code, options){
  options || (options = {});
  return Function(Coco.compile(code, (options.bare = true, options)))();
};
(_ref = Coco.ast).parse = ast.parse, _ref.fromJSON = ast.fromJSON;
if (require.extensions) {
  require('./node')(Coco);
} else {
  Coco.require = require;
  if ("" + this === '[object BackstagePass]') {
    this.EXPORTED_SYMBOLS = ['Coco'];
  }
}