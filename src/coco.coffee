# The main entry functions for
# [tokenizing](#lexer), [parsing](#grammar), and [compiling](#nodes)
# Coco source into JavaScript.

(Coco = exports).VERSION = '0.1.3+'

{Lexer} = require './lexer'

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

# Compile a string of Coco code to JavaScript, using the Coco/Jison compiler.
Coco.compile = (code, options) ->
  try
    (parser.parse new Lexer().tokenize code).compileRoot options
  catch err
    err.message = "In #{options.fileName}, #{err.message}" if options?.fileName
    throw err

# Tokenize a string of Coco code, and return the array of tokens.
Coco.tokens = (code, options) -> new Lexer().tokenize code, options

# Parse a string or tokens of Coco code, and return the AST.
Coco.nodes = (source, options) ->
  parser.parse if typeof source is 'string'
  then new Lexer().tokenize source, options
  else source

return 0 unless (fs = require 'fs') and (path = require 'path')

# Compile and execute a string of Coco on __node.js__, correctly
# setting `__filename`, `__dirname`, and relative `require`.
Coco.run = (code, options) ->
  root = module
  root.=parent while root.parent
  root.filename = fs.realpathSync options?.fileName or '.'
  root.moduleCache &&= {}
  if require.extensions or path.extname(root.filename) not of <[ .co .coffee ]>
    code = Coco.compile code, options
  root._compile code, root.filename

# Compile and evaluate a string of Coco on __node.js__.
# The Coco REPL uses this to run the input.
Coco.eval = (code, options) ->
  __dirname = path.dirname __filename = options?.fileName
  eval Coco.compile code, options

if require.extensions
  require.extensions['.co'] = require.extensions['.coffee'] =
  (module, filename) ->
    code = Coco.compile fs.readFileSync filename, 'utf8'
    module._compile code, filename
# __TODO__: Remove `registerExtension` when fully deprecated.
else if require.registerExtension
  require.registerExtension '.co'    , Coco.compile
  require.registerExtension '.coffee', Coco.compile
