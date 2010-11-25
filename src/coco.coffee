# The main entry functions for tokenizing, parsing, and compiling
# Coco source into JavaScript.

(Coco = exports).VERSION = '0.1.1.1'

# The real Lexer produces a generic stream of tokens. This object provides a
# thin wrapper around it, compatible with the Jison API. We can then pass it
# directly as a "Jison lexer".
{parser} = require './parser'
parser import
  yy    : require './nodes'
  lexer :
    lex           : -> [tag, @yytext, @yylineno] = @tokens[@pos++] or ['']; tag
    setInput      : -> @pos = 0; @tokens = it
    upcomingInput : -> ''

{Lexer} = require './lexer'

# Compile a string of Coco code to JavaScript, using the Coco/Jison compiler.
exports.compile = (code, options = {}) ->
  try
    (parser.parse new Lexer().tokenize code).compile options
  catch err
    err.message = "In #{options.fileName}, #{err.message}" if options.fileName
    throw err

# Tokenize a string of Coco code, and return the array of tokens.
exports.tokens = (code, options) -> new Lexer().tokenize code, options

# Tokenize and parse a string of Coco code, and return the AST. You can
# then compile it by calling `.compile()` on the root, or traverse it by using
# `.traverse()` with a callback.
exports.nodes = (source, options) ->
  parser.parse if typeof source is 'string'
  then new Lexer().tokenize source, options
  else source

return unless (fs = require 'fs') and (path = require 'path')

# Compile and execute a string of Coco on __node.js__, correctly
# setting `__filename`, `__dirname`, and relative `require()`.
exports.run = (code, options) ->
  root = module
  root.=parent while root.parent
  root.filename = fs.realpathSync options.fileName or '.'
  root.moduleCache &&= {}
  if require.extensions or path.extname(root.filename) not of <[ .co .coffee ]>
    code = exports.compile code, options
  root._compile code, root.filename

# Compile and evaluate a string of Coco on __node.js__.
# The Coco REPL uses this to run the input.
exports.eval = (code, options) ->
  __filename = options.fileName
  __dirname  = path.dirname __filename
  eval exports.compile code, options

# TODO: Remove registerExtension when fully deprecated
if require.extensions
  require.extensions['.co'] = require.extensions['.coffee'] = (module, filename) ->
    code = exports.compile fs.readFileSync filename, 'utf8'
    module._compile code, filename
else if require.registerExtension
  require.registerExtension '.co'    , exports.compile
  require.registerExtension '.coffee', exports.compile
