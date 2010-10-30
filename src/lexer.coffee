# The CoffeeScript Lexer. Uses a series of token-matching regexes to attempt
# matches against the beginning of the source code. When a match is found,
# a token is produced, we consume the match, and start again. Tokens are in the
# form:
#
#     [tag, value, lineNumber]
#
# Which is a format that can be fed directly into [Jison](http://github.com/zaach/jison).

{Rewriter} = require './rewriter'

# Import the helpers we need.
{count, last} = require './helpers'

# The Lexer Class
# ---------------

# The Lexer class reads a stream of CoffeeScript and divvys it up into tagged
# tokens. Some potential ambiguity in the grammar has been avoided by
# pushing some extra smarts into the Lexer.
exports.Lexer = class Lexer

  # **tokenize** is the Lexer's main method. Scan by attempting to match tokens
  # one at a time, using a regular expression anchored at the start of the
  # remaining code, or a custom recursive token-matching method
  # (for interpolations). When the next token has been recorded, we move forward
  # within the code past the token, and begin again.
  #
  # Each tokenizing method is responsible for returning the number of characters
  # it has consumed.
  #
  # Before returning the token stream, run it through the [Rewriter](rewriter.html)
  # unless explicitly asked not to.
  tokenize: (code, options) ->
    code     = code.replace(/\r/g, '').replace TRAILING_SPACES, ''
    o        = options or {}
    @code    = code         # The remainder of the source code.
    @line    = o.line or 0  # The current line.
    @indent  = 0            # The current indentation level.
    @indebt  = 0            # The over-indentation at the current level.
    @outdebt = 0            # The under-outdentation at the current level.
    @indents = []           # The stack of all current indentation levels.
    @tokens  = []           # Stream of parsed tokens in the form ['TYPE', value, line]
    # Flags for distinguishing FORIN/FOROF/FROM/TO.
    @seenFor = @seenFrom = false
    # At every position, run through this list of attempted matches,
    # short-circuiting if any of them succeed. Their order determines precedence:
    # `@literalToken` is the fallback catch-all.
    i = 0
    while @chunk = code.slice i
      i += do @identifierToken or
           do @commentToken    or
           do @whitespaceToken or
           do @lineToken       or
           do @heredocToken    or
           do @stringToken     or
           do @numberToken     or
           do @regexToken      or
           do @wordsToken      or
           do @jsToken         or
           do @literalToken
    @closeIndentation()
    return @tokens if o.rewrite is false
    (new Rewriter).rewrite @tokens

  # Tokenizers
  # ----------

  # Matches identifying literals: variables, keywords, method names, etc.
  # Check to ensure that JavaScript reserved words aren't being used as
  # identifiers. Because CoffeeScript reserves a handful of keywords that are
  # allowed in JavaScript, we're careful not to tag them as keywords when
  # referenced as property names here, so you can still do `jQuery.is()` even
  # though `is` means `===` otherwise.
  identifierToken: ->
    return 0 unless match = IDENTIFIER.exec @chunk
    [input, id, colon] = match
    if id is 'all' and @tag() in ['FOR', 'IMPORT']
      @token 'ALL', id
      return id.length
    if id is 'from' and @tag(1) is 'FOR'
      @seenFor  = false
      @seenFrom = true
      @token 'FROM', id
      return id.length
    if id is 'to' and @seenFrom
      @seenFrom = false
      @token 'TO', id
      return id.length
    if at = id.charAt(0) is '@'
      id .= slice 1
      tag = 'THISPROP'
    else
      tag = 'IDENTIFIER'
    forcedIdentifier = at or colon or if prev = last @tokens
      if prev[1].colon2
        @token 'ACCESS', '.'
      else
        prev[0] is 'ACCESS'
    if id in JS_FORBIDDEN
      if forcedIdentifier
        id = new String id
        id.reserved = true
      else if id in RESERVED
        throw SyntaxError "Reserved word \"#{id}\" on line #{ @line + 1 }"
    if not id.reserved      and id in     JS_KEYWORDS or
       not forcedIdentifier and id in COFFEE_KEYWORDS
      tag = id.toUpperCase()
      if tag is 'WHEN' and @tag() in <[ INDENT OUTDENT TERMINATOR ]>
        tag = 'LEADING_WHEN'
      else if tag is 'FOR'
        @seenFor = true
      else if tag in <[ NEW DO TYPEOF DELETE ]>
        tag = 'UNARY'
      else if tag in <[ IN OF INSTANCEOF ]>
        if tag isnt 'INSTANCEOF' and @seenFor
          tag = 'FOR' + tag
          @seenFor = false
        else
          tag = 'RELATION'
          if @value() is '!'
            @tokens.pop()
            id = '!' + id
    unless forcedIdentifier
      id  = COFFEE_ALIASES[id] if COFFEE_ALIASES.hasOwnProperty id
      tag = if id is '!'                        then 'UNARY'
      else  if id in <[ == != ]>                then 'COMPARE'
      else  if id in <[ && || ]>                then 'LOGIC'
      else  if id in <[ true false null void ]> then 'BOOL'
      else  tag
    @token tag, id
    @token ':', ':' if colon
    input.length

  # Matches numbers, including decimals, hex, and exponential notation.
  # Be careful not to interfere with ranges-in-progress.
  numberToken: ->
    return 0 unless match = NUMBER.exec @chunk
    number = match[0]
    @token 'NUMBER', number
    number.length

  # Matches strings, including multi-line strings. Ensures that quotation marks
  # are balanced within the string's contents, and within nested interpolations.
  stringToken: ->
    switch @chunk.charAt 0
      when "'"
        return 0 unless match = SIMPLESTR.exec @chunk
        @token 'STRING', (string = match[0]).replace MULTILINER, '\\\n'
      when '"'
        return 0 unless string = @balancedString @chunk, [<[ " " ]>, <[ #{ } ]>]
        if 0 < string.indexOf '#{', 1
        then @interpolateString string.slice 1, -1
        else @token 'STRING', @escapeLines string
      else
        return 0
    @line += count string, '\n'
    string.length

  # Matches heredocs, adjusting indentation to the correct level, as heredocs
  # preserve whitespace, but ignore indentation to the left.
  heredocToken: ->
    return 0 unless match = HEREDOC.exec @chunk
    heredoc = match[0]
    quote = heredoc.charAt 0
    doc = @sanitizeHeredoc match[2], {quote, indent: null}
    if quote is '"' and 0 <= doc.indexOf '#{'
    then @interpolateString doc, heredoc: true
    else @token 'STRING', @makeString doc, quote, true
    @line += count heredoc, '\n'
    heredoc.length

  # Matches and consumes comments.
  commentToken: ->
    return 0 unless match = @chunk.match COMMENT
    [comment, here] = match
    @line += count comment, '\n'
    if here
      @token 'HERECOMMENT', @sanitizeHeredoc here,
        herecomment: true, indent: Array(@indent + 1).join(' ')
      @token 'TERMINATOR', '\n'
    comment.length

  # Matches JavaScript interpolated directly into the source via backticks.
  jsToken: ->
    return 0 unless @chunk.charAt(0) is '`' and match = JSTOKEN.exec @chunk
    @token 'JS', (script = match[0]).slice 1, -1
    script.length

  # Matches regular expression literals. Lexing regular expressions is difficult
  # to distinguish from division, so we borrow some basic heuristics from
  # JavaScript and Ruby.
  regexToken: ->
    return 0 if @chunk.charAt(0) isnt '/'
    return @heregexToken match if match = HEREGEX.exec @chunk
    # Tokens which a regular expression will never immediately follow, but which
    # a division operator might.
    #
    # See: http://www.mozilla.org/js/language/js20-2002-04/rationale/syntax.html#regular-expressions
    #
    # Our list is shorter, due to sans-parentheses method calls.
    return 0 if @tag() in <[ NUMBER REGEX BOOL ++ -- ]>
    return 0 unless match = REGEX.exec @chunk
    [regex] = match
    @token 'REGEX', if regex is '//' then '/(?:)/' else regex
    regex.length

  # Matches experimental, multiline and extended regular expression literals.
  heregexToken: (match) ->
    [heregex, body, flags] = match
    if 0 > body.indexOf '#{'
      re = body.replace(HEREGEX_OMIT, '').replace(/\//g, '\\/')
      @token 'REGEX', "/#{ re or '(?:)' }/#{flags}"
      return heregex.length
    @token 'IDENTIFIER', 'RegExp'
    @tokens.push <[ CALL_START ( ]>
    tokens = []
    for [tag, value] in @interpolateString(body, regex: true)
      if tag is 'TOKENS'
        tokens.push value...
      else
        continue unless value = value.replace HEREGEX_OMIT, ''
        value = value.replace /\\/g, '\\\\'
        tokens.push ['STRING', @makeString(value, '"', true)]
      tokens.push <[ + + ]>
    tokens.pop()
    @tokens.push <[ STRING "" ]>, <[ + + ]> unless tokens[0]?[0] is 'STRING'
    @tokens.push tokens...
    @tokens.push <[ , , ]>, ['STRING', '"' + flags + '"'] if flags
    @token ')', ')'
    heregex.length

  # Matches words literal, a syntax sugar for an array of strings.
  wordsToken: ->
    return 0 unless match = WORDS.exec @chunk
    [words] = match
    @token '[', '['
    for word in words.slice(2, -2).match(/\S+/g) or ['']
      @tokens.push ['STRING', @makeString word, '"'], <[ , , ]>
    @token ']', ']'
    @line += count words, '\n'
    words.length

  # Matches newlines, indents, and outdents, and determines which is which.
  # If we can detect that the current line is continued onto the the next line,
  # then the newline is suppressed:
  #
  #     elements
  #       .each( ... )
  #       .map( ... )
  #
  # Keeps track of the level of indentation, because a single outdent token
  # can close multiple indents, so we need to know how far in we happen to be.
  lineToken: ->
    return 0 unless match = MULTI_DENT.exec @chunk
    indent = match[0]
    @line += count indent, '\n'
    prev = last @tokens, 1
    size = indent.length - 1 - indent.lastIndexOf '\n'
    noNewlines = @unfinished()
    if size - @indebt is @indent
      if noNewlines then @suppressNewlines() else @newlineToken()
      return indent.length
    if size > @indent
      if noNewlines
        @indebt = size - @indent
        @suppressNewlines()
        return indent.length
      diff = size - @indent + @outdebt
      @token 'INDENT', diff
      @indents.push diff
      @outdebt = @indebt = 0
    else
      @indebt = 0
      @outdentToken @indent - size, noNewlines
    @indent = size
    indent.length

  # Record an outdent token or multiple tokens, if we happen to be moving back
  # inwards past several recorded indents.
  outdentToken: (moveOut, noNewlines, close) ->
    while moveOut > 0
      len = @indents.length - 1
      if len not of @indents
        moveOut = 0
      else if @indents[len] is @outdebt
        moveOut -= @outdebt
        @outdebt = 0
      else if @indents[len] < @outdebt
        @outdebt -= @indents[len]
        moveOut  -= @indents[len]
      else
        dent = @indents.pop() - @outdebt
        moveOut -= dent
        @outdebt = 0
        @token 'OUTDENT', dent
    @outdebt -= moveOut if dent
    @token 'TERMINATOR', '\n' unless @tag() is 'TERMINATOR' or noNewlines
    this

  # Matches and consumes non-meaningful whitespace. Tag the previous token
  # as being "spaced", because there are some cases where it makes a difference.
  whitespaceToken: ->
    return 0 unless (match = WHITESPACE.exec @chunk) or
                    (nline = @chunk.charAt(0) is '\n')
    prev = last @tokens
    prev[if match then 'spaced' else 'newLine'] = true if prev
    if match then match[0].length else 0

  # Generate a newline token. Consecutive newlines get merged together.
  newlineToken: ->
    @token 'TERMINATOR', '\n' unless @tag() is 'TERMINATOR'
    this

  # Use a `\` at a line-ending to suppress the newline.
  # The slash is removed here once its job is done.
  suppressNewlines: ->
    @tokens.pop() if @value() is '\\'
    this

  # We treat all other single characters as a token. Eg.: `( ) , . !`
  # Multi-character operators are also literal tokens, so that Jison can assign
  # the proper order of operations. There are some symbols that we tag specially
  # here. `;` and newlines are both treated as a `TERMINATOR`, we distinguish
  # parentheses that indicate a method call from regular parentheses, and so on.
  literalToken: ->
    if match = OPERATOR.exec @chunk
      [value] = match
      @tagParameters() if CODE.test value
    else
      value = @chunk.charAt 0
    tag  = value
    prev = last @tokens
    if value is '=' and prev
      pid = prev[1]
      if not pid.reserved and pid in JS_FORBIDDEN
        throw SyntaxError \
          "Reserved word \"#{pid}\" on line #{ @line + 1 } cannot be assigned"
      if pid in <[ || && ]>
        prev[0]  = 'COMPOUND_ASSIGN'
        prev[1] += '='
        return value.length
    if      value in <[ ! ~ ]>             then tag = 'UNARY'
    else if value in <[ . ?. .= ]>         then tag = 'ACCESS'
    else if value in <[ * / % ]>           then tag = 'MATH'
    else if value in <[ == != <= < > >= ]> then tag = 'COMPARE'
    else if value in <[ && || & | ^ ]> or value is '?' and prev?.spaced \
                                           then tag = 'LOGIC'
    else if value in <[ << >> >>> ]>       then tag = 'SHIFT'
    else if value in <[ -= += ||= &&= ?= /= *= %= <<= >>= >>>= &= ^= |= ]> \
                                           then tag = 'COMPOUND_ASSIGN'
    else if value in <[ ?[ [= ]>           then tag = 'INDEX_START'
    else if value is '@'                   then tag = 'THIS'
    else if value is ';'                   then tag = 'TERMINATOR'
    else if value is '::'
      id = new String 'prototype'
      id.colon2 = true
      @tokens.push ['ACCESS', '.', @line], ['IDENTIFIER', id, @line]
      return value.length
    else if prev and not prev.spaced
      if value is '(' and prev[0] in CALLABLE
        prev[0] = 'FUNC_EXIST' if prev[0] is '?'
        tag = 'CALL_START'
      else if value is '[' and prev[0] in INDEXABLE
        tag = 'INDEX_START'
    @token tag, value
    value.length

  # Token Manipulators
  # ------------------

  # Sanitize a heredoc or herecomment by
  # erasing all external indentation on the left-hand side.
  sanitizeHeredoc: (doc, options) ->
    {indent, herecomment} = options
    return doc if herecomment and 0 > doc.indexOf '\n'
    unless herecomment
      while match = HEREDOC_INDENT.exec doc
        attempt = match[1]
        indent  = attempt if indent is null or 0 < attempt.length < indent.length
    doc = doc.replace /// \n #{indent} ///g, '\n' if indent
    doc = doc.replace /^\n/, '' unless herecomment
    doc

  # A source of ambiguity in our grammar used to be parameter lists in function
  # definitions versus argument lists in function calls. Walk backwards, tagging
  # parameters specially in order to make things easier for the parser.
  tagParameters: ->
    return this if @tag() isnt ')'
    {tokens} = this
    level = 0
    i = tokens.length
    tokens[--i][0] = 'PARAM_END'
    while tok = tokens[--i]
      switch tok[0]
        when ')' then ++level
        when '(', 'CALL_START'
          if level then --level
          else
            tok[0] = 'PARAM_START'
            return this
    this

  # Close up all remaining open blocks at the end of the file.
  closeIndentation: ->
    @outdentToken @indent

  # Matches a balanced group such as a single or double-quoted string. Pass in
  # a series of delimiters, all of which must be nested correctly within the
  # contents of the string. This method allows us to have strings within
  # interpolations within strings, ad infinitum.
  balancedString: (str, delimited, options = {}) ->
    levels = []
    i = 0
    slen = str.length
    while i < slen
      if levels.length and str.charAt(i) is '\\'
        i += 2
        continue
      for pair in delimited
        [open, close] = pair
        if levels.length and last(levels) is pair and
           close is str.substr i, close.length
          levels.pop()
          i += close.length - 1
          i += 1 unless levels.length
          break
        if open is str.substr i, open.length
          levels.push pair
          i += open.length - 1
          break
      break if not levels.length
      i += 1
    if levels.length
      throw SyntaxError "Unterminated #{levels.pop()[0]} starting on line #{@line + 1}"
    i and str.slice 0, i

  # Expand variables and expressions inside double-quoted strings using
  # Ruby-like notation for substitution of arbitrary expressions.
  #
  #     "Hello #{name.capitalize()}."
  #
  # If it encounters an interpolation, this method will recursively create a
  # new Lexer, tokenize the interpolated contents, and merge them into the
  # token stream.
  interpolateString: (str, options = {}) ->
    {heredoc, regex} = options
    tokens = []
    pi = 0
    i  = -1
    while letter = str.charAt i += 1
      if letter is '\\'
        i += 1
        continue
      unless letter is '#' and str.charAt(i+1) is '{' and
             (expr = @balancedString str.slice(i+1), [<[ { } ]>])
        continue
      tokens.push ['TO_BE_STRING', str.slice(pi, i)] if pi < i
      inner = expr.slice(1, -1).replace(LEADING_SPACES, '').replace(TRAILING_SPACES, '')
      if inner.length
        nested = new Lexer().tokenize inner, line: @line, rewrite: false
        nested.pop()
        if nested.length > 1
          nested.unshift <[ ( ( ]>
          nested.push    <[ ) ) ]>
        tokens.push ['TOKENS', nested]
      i += expr.length
      pi = i + 1
    tokens.push ['TO_BE_STRING', str.slice pi] if i > pi < str.length
    return tokens if regex
    return @token 'STRING', '""' unless tokens.length
    tokens.unshift ['', ''] unless tokens[0][0] is 'TO_BE_STRING'
    @token '(', '(' if interpolated = tokens.length > 1
    for [tag, value], i in tokens
      @token '+', '+' if i
      if tag is 'TOKENS'
      then @tokens.push value...
      else @token 'STRING', @makeString value, '"', heredoc
    @token ')', ')' if interpolated
    tokens

  # Helpers
  # -------

  # Add a token to the results, taking note of the line number.
  token: (tag, value) ->
    @tokens.push [tag, value, @line]

  # Peek at a tag/value in the current token stream.
  tag  : (index, tag) ->
    (tok = last @tokens, index) and if tag? then tok[0] = tag else tok[0]
  value: (index, val) ->
    (tok = last @tokens, index) and if val? then tok[1] = val else tok[1]

  # Are we in the midst of an unfinished expression?
  unfinished: ->
    LINE_CONTINUER.test(@chunk) or
    (prev = last @tokens, 1) and prev[0] isnt 'ACCESS' and
      (value = @value()) and not value.reserved and
      NO_NEWLINE.test(value) and not CODE.test(value) and not ASSIGNED.test(@chunk)

  # Converts newlines for string literals.
  escapeLines: (str, heredoc) ->
    str.replace MULTILINER, if heredoc then '\\n' else ''

  # Constructs a string token by escaping quotes and newlines.
  makeString: (body, quote, heredoc) ->
    return quote + quote unless body
    body = body.replace /\\([\s\S])/g, (match, contents) ->
      if contents in ['\n', quote] then contents else match
    body = body.replace /// #{quote} ///g, '\\$&'
    quote + @escapeLines(body, heredoc) + quote

# Constants
# ---------

# Keywords that CoffeeScript shares in common with JavaScript.
JS_KEYWORDS = <[
  true false null this void super
  new do delete typeof in instanceof import
  return throw break continue debugger
  if else switch for while try catch finally class extends
]>

# CoffeeScript-only keywords.
COFFEE_KEYWORDS = <[ then unless until loop of by when ]>
COFFEE_KEYWORDS.push op for all op of COFFEE_ALIASES =
  and  : '&&'
  or   : '||'
  is   : '=='
  isnt : '!='
  not  : '!'

# The list of keywords that are reserved by JavaScript, but not used, or are
# used by CoffeeScript internally. We throw an error when these are encountered,
# to avoid having a JavaScript error at runtime.
RESERVED = <[ case default function var with const let enum export native ]>

# The superset of both JavaScript keywords and reserved words, none of which may
# be used as identifiers or properties.
JS_FORBIDDEN = JS_KEYWORDS.concat RESERVED

# Token matching regexes.
IDENTIFIER = /// ^
  ( @?[$A-Za-z_][$\w]* )
  ( [^\n\S]* : (?!:) )?  # Is this a property name?
///
NUMBER     = /^0x[\da-f]+|^(?:\d+(\.\d+)?|\.\d+)(?:e[+-]?\d+)?/i
HEREDOC    = /^("""|''')([\s\S]*?)(?:\n[ \t]*)?\1/
OPERATOR   = /// ^ (
  ?: [-=]>              # function
   | [-+*/%<>&|^?.[=!]= # compound assign / compare
   | >>>=?              # zero-fill right shift
   | ([-+:])\1          # {in,de}crement / prototype
   | ([&|<>])\2=?       # logic / shift
   | \?[.[]             # soak access
   | \.{3}              # splat
) ///
WHITESPACE = /^[ \t]+/
COMMENT    = /^###([^#][\s\S]*?)(?:###[ \t]*\n|(?:###)?$)|^(?:\s*#(?!##[^#]).*)+/
CODE       = /^[-=]>/
MULTI_DENT = /^(?:\n[ \t]*)+/
SIMPLESTR  = /^'[^\\']*(?:\\.[^\\']*)*'/
JSTOKEN    = /^`[^\\`]*(?:\\.[^\\`]*)*`/
WORDS      = /^<\[[\s\S]*?]>/

# Regex-matching-regexes.
REGEX = /// ^
  / (?! \s )       # disallow leading whitespace
  [^ [ / \n \\ ]*  # every other thing
  (?:
    (?: \\[\s\S]   # anything escaped
      | \[         # character class
           [^ \] \n \\ ]*
           (?: \\[\s\S] [^ \] \n \\ ]* )*
         ]
    ) [^ [ / \n \\ ]*
  )*
  / [imgy]{0,4} (?![A-Za-z])
///
HEREGEX      = /^\/{3}([\s\S]+?)\/{3}([imgy]{0,4})(?![A-Za-z])/
HEREGEX_OMIT = /\s+(?:#.*)?/g

# Token cleaning regexes.
MULTILINER      = /\n/g
HEREDOC_INDENT  = /\n+([ \t]*)/g
ASSIGNED        = /^\s*@?[$A-Za-z_][$\w]*[ \t]*?[:=][^:=>]/
LINE_CONTINUER  = /// ^ \s* (?: , | \??\.(?!\.) | :: ) ///
LEADING_SPACES  = /^\s+/
TRAILING_SPACES = /\s+$/
NO_NEWLINE      = /// ^ (?:            # non-capturing group
  [-+*&|/%=<>!.\\][<>=&|]* |           # symbol operators
  and | or | is(?:nt)? | n(?:ot|ew) |  # word operators
  delete | typeof | instanceof
) $ ///

# Tokens which could legitimately be invoked or indexed. A opening
# parentheses or bracket following these tokens will be recorded as the start
# of a function invocation or indexing operation.
CALLABLE  = <[ IDENTIFIER THISPROP STRING REGEX ) ] } ? THIS SUPER ]>
INDEXABLE = CALLABLE.concat <[ NUMBER BOOL ]>
