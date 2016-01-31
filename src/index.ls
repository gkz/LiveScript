require! {
    './lexer'
    './parser': {parser}
    './ast'
    'source-map': {SourceNode}
    path
}

# Override Jison's default lexer, so that it can accept
# the generic stream of tokens our lexer produces.
parser <<<
    yy: ast
    lexer:
        lex: ->
            [tag, @yytext, first_line, first_column] = @tokens[++@pos] or [''];
            [,, last_line, last_column] = @tokens[@pos+1] or [''];
            @yylineno = first_line
            @yylloc =
                first_line: first_line
                first_column: first_column
                last_line: last_line
                last_column: last_column
            tag
        set-input: ->
            @pos = -1
            @tokens = it
        upcoming-input: -> ''

exports <<<
    VERSION: '1.4.0'

    # Compiles a string of LiveScript code to JavaScript.
    compile: (code, options = {}) ->
      options.header ?= true
      try
          if options.json
              result = do Function exports.compile code, {+bare, +run, +print}
              "#{ JSON.stringify result, null, 2 }\n"
          else
              ast = parser.parse lexer.lex code
              ast.make-return! if options.run and options.print
              output = ast.compile-root options
              if options.header
                  output = new SourceNode null, null, null, [
                      "// Generated by LiveScript #{exports.VERSION}\n", output
                  ]
              if options.map? and options.map isnt 'none'
                  {filename, output-filename} = options
                  unless filename
                      filename = "unnamed-#{ Math.floor(Math.random! * 4294967296).to-string 16 }.ls"

                  output.set-file filename
                  result = output.to-string-with-source-map!
                  if options.map is 'embedded'
                      result.map.set-source-content filename, code
                  if options.map in <[ linked debug ]>
                      map-path = "#output-filename.map"
                      result.code += "\n//# sourceMappingURL=#map-path\n"
                  else
                      result.code += "\n//# sourceMappingURL=data:application/json;base64,#{ new Buffer result.map.to-string! .to-string 'base64' }\n"
                  result
              else
                  output.to-string!
      catch
          e.message += "\nat #that" if options.filename
          throw e

    # Parses a string or tokens of LiveScript code,
    # returning the [AST](http://en.wikipedia.org/wiki/Abstract_syntax_tree).
    ast: -> parser.parse (if typeof it is 'string' then lexer.lex it else it)

    # Tokenizes a string of LiveScript code, returning the array of tokens.
    tokens: lexer.lex

    # Same as `tokens`, except that this skips rewriting.
    lex: -> lexer.lex it, {+raw}

    # Runs LiveScript code directly.
    run: (code, options) ->
        output = exports.compile code, {...options, +bare}
        do Function (if !options.map? or options.map is 'none' then output else output.code)

exports.tokens.rewrite = lexer.rewrite

# Export AST constructors.
exports.ast <<<< parser.yy

if require.extensions
    (require './node') exports
else
    # Attach `require` for debugging.
    exports <<< {require}
