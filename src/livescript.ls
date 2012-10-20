# The main entry functions for
# [tokenizing](#lexer), [parsing](#grammar), and [compiling](#ast)
# LiveScript source into JavaScript.

lexer = require \./lexer

# Override Jison's default lexer, so that it can accept
# the generic stream of tokens our lexer produces.
{parser} = require \./parser
parser import
  yy    : require \./ast
  lexer :
    lex           : -> [tag, @yytext, @yylineno] = @tokens[++@pos] or ['']; tag
    setInput      : -> @pos = -1; @tokens = it
    upcomingInput : -> ''

exports import
  VERSION: \1.0.1

  # Compiles a string of LiveScript code to JavaScript.
  compile: (code, options) ->
    try parser.parse(lexer.lex code)compileRoot options catch
      e.message += "\nat #that" if options?filename
      throw e

  # Parses a string or tokens of LiveScript code,
  # returning the [AST](http://en.wikipedia.org/wiki/Abstract_syntax_tree).
  ast: -> parser.parse if typeof it is \string then lexer.lex it else it

  # Tokenizes a string of LiveScript code, returning the array of tokens.
  tokens: lexer.lex

  # Same as `tokens`, except that this skips rewriting.
  lex: -> lexer.lex it, {+raw}

  # Runs LiveScript code directly.
  run: (code, options) -> do Function exports.compile code, {...options, +bare}

exports.tokens{rewrite} = lexer

# Export AST constructors.
exports.ast import all parser.yy

if require.extensions
  # -> [node](#node)
  require(\./node) exports
else
  # Attach `require` for debugging.
  exports import {require}
  # Support Gecko JS Module.
  @EXPORTED_SYMBOLS = [\LiveScript] if ''+this is '[object BackstagePass]'
