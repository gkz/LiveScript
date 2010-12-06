# The Coco Lexer. Uses a series of token-matching regexes to attempt
# matches against the beginning of the source code. When a match is found,
# a token is produced, we consume the match, and start again.
# Tokens are in the form:
#
#     ['TAG', 'value', lineNumber = 0]
#
# which is a format that can be fed directly into
# [Jison](http://github.com/zaach/jison) generated [parser](../lib/parser.js).

# The Lexer Class
# ---------------
# Reads a stream of Coco code and divvies it up into tagged tokens.
# Some potential ambiguity in the grammar has been avoided by
# pushing some extra smarts into the Lexer.
class exports.Lexer
  # `tokenize` is the Lexer's main method. Scan by attempting to match tokens
  # one at a time, using a regular expression anchored at the start of the
  # remaining code, or a custom recursive token-matching method
  # (for interpolations). When the next token has been recorded,
  # we move forward within the code past the token, and begin again.
  tokenize: (code, o = {}) ->
    # Stream of parsed tokens,
    # initialized with a DUMMY token to ensure `@last` always exists.
    @tokens = [@last = ['DUMMY', '', 0]]
    # The current line.
    @line = o.line or 0
    # The current indentation level, over-indentation and under-outdentation.
    @indent = @indebt = @outdebt = 0
    # The stack of all current indentation levels.
    @indents = []
    # Flags for distinguishing FORIN/FOROF/FROM/TO/BY.
    @seenFor = @seenFrom = @seenRange = false
    # Check the first character of current `@chunk`, then call appropriate
    # tokenizers based on it. Each tokenizing method is responsible for
    # returning the number of characters it has consumed.
    code.=replace(/\r/g, '').replace(/\s+$/, ''); i = 0
    while @chunk = code.slice i
      switch code.charAt i
      case ' ' then i += do @spaceToken
      case '\n'then i += do @lineToken
      case "'" then i += @heredocToken("'") or @singleStringToken()
      case '"' then i += @heredocToken('"') or @doubleStringToken()
      case '<'
        i += if '[' is code.charAt i+1 then @wordsToken() else @literalToken()
      case '/'
        i += if '//' is code.substr i+1, 2
        then do @heregexToken
        else do @regexToken or do @literalToken
      case '#' then i += do @spaceToken or do @commentToken
      case '`' then i += do @jsToken
      default i += do @identifierToken or do @numberToken or
                   do @literalToken    or do @spaceToken
    # Close up all remaining open blocks.
    @outdent @indent
    # Dispose dummy.
    @tokens.shift()
    # [Rewrite](#rewriter) the token stream unless explicitly asked not to.
    require('./rewriter').rewrite @tokens unless o.rewrite is false
    @tokens

  #### Tokenizers

  # Matches an identifying literal: variables, keywords, accessors, etc.
  # Check to ensure that JavaScript reserved words aren't being used as
  # identifiers. Because Coco reserves a handful of keywords that are
  # allowed in JavaScript, we're careful not to tag them as keywords when
  # referenced as property names here, so you can still do `jQuery.is()` even
  # though `is` means `===` otherwise.
  identifierToken: ->
    return 0 unless match = IDENTIFIER.exec @chunk
    switch id = match[1]
    case 'own'
      break unless @last[0] is 'FOR' and @last[1]
      @last[1] = ''
      return id.length
    case 'from'
      break unless @tokens[*-2]?[0] is 'FOR'
      @seenFor  = false
      @seenFrom = true
      return @token('FROM', id).length
    case 'ever'
      break unless @last[0] is 'FOR'
      @seenFor = false
      return @token('EVER', id).length
    case <[ to til ]>
      break unless @seenFrom
      @seenFrom  = false
      @seenRange = true
      return @token('TO', id).length
    case 'by'
      break unless @seenRange
      @seenRange = false
      return @token('BY', id).length
    case 'all'
      break unless @last[0] is 'IMPORT' and @last[1]
      @last[1] = ''
      return id.length
    tag = if at = id.charAt(0) is '@'
    then id.=slice 1; 'THISPROP'
    else              'IDENTIFIER'
    {0: input, 2: colon} = match
    forcedIdentifier = at or colon or
      if not (prev = @last).spaced and prev[1].colon2
      then @token<[ ACCESS . ]>
      else prev[0] is 'ACCESS'
    if forcedIdentifier
      (id = new String id).reserved = true if id of JS_FORBIDDEN
    else if id of COCO_KEYWORDS
      switch tag = id.toUpperCase()
      case 'FOR'                         then @seenFor = true
      case 'UNLESS'                      then tag = 'IF'
      case 'UNTIL'                       then tag = 'WHILE'
      case <[ NEW DO TYPEOF DELETE    ]> then tag = 'UNARY'
      case <[ TRUE FALSE NULL VOID    ]> then tag = 'LITERAL'
      case <[ BREAK CONTINUE DEBUGGER ]> then tag = 'STATEMENT'
      case <[ IN OF INSTANCEOF ]>
        if tag isnt 'INSTANCEOF' and @seenFor
          @seenRange = true if tag is 'OF'
          @seenFor   = false
          tag = 'FOR' + tag
          break
        if @last[1] is '!'
          @tokens.pop()
          id = '!' + id
        tag = 'RELATION'
      @seenRange = false if @seenRange and tag of <[ FOR THEN ]>
    else if COCO_ALIASES.hasOwnProperty id
      switch id = COCO_ALIASES[id]
      case '!'         then tag = 'UNARY'
      case <[ && || ]> then tag = 'LOGIC'
      default               tag = 'COMPARE'
    else if id of RESERVED
      @carp "reserved word \"#{id}\""
    @token tag, id
    @token<[ : : ]> if colon
    input.length

  # Matches a number, including decimal, hex and exponential notation.
  numberToken: ->
    return 0 unless match = NUMBER.exec @chunk
    [num, radix, rnum] = match
    if radix
      @carp "invalid radix #{radix}" unless 2 <= radix <= 36
      num = parseInt rnum, radix
      if isNaN(num) or num is parseInt rnum.slice(0, -1), radix
        @carp "invalid number #{rnum} in base #{radix}"
    @token 'STRNUM', num
    match[0].length

  # Matches a normal string. Ensures that quotation marks are balanced within
  # the string's contents, and within nested interpolations.
  singleStringToken: ->
    @carp 'unterminated string' unless string = SIMPLESTR.exec @chunk
    @token 'STRNUM', (string[=0]).replace MULTILINER, '\\\n'
    @countLines(string).length

  doubleStringToken: ->
    string = @balancedString @chunk, [<[ " " ]>, <[ #{ } ]>]
    if 0 < string.indexOf '#{', 1
    then @interpolateString string.slice(1, -1), ''
    else @token 'STRNUM', string.replace MULTILINER, ''
    @countLines(string).length

  # Matches heredocs, adjusting indentation to the correct level, as heredocs
  # preserve whitespace, but ignore indentation to the left.
  heredocToken: (q) ->
    return 0 unless @chunk.slice(1, 3) is q+q and
                    ~end = @chunk.indexOf q+q+q, 3
    txt = @chunk.slice 3, end
    lnl = txt isnt doc = txt.replace /\n[^\n\S]*$/, ''
    if ~doc.indexOf '\n'
      tabs = /\n[^\n\S]*(?!$)/mg  # non-empty bol
      dent = 0/0
      dent = len unless dent <= len = m[0].length - 1 while m = tabs.exec doc
      doc  = @dedent doc, dent
      if doc.charAt(0) is '\n'
        doc.=slice 1
        ++@line
    if q is '"' and ~doc.indexOf '#{'
      @interpolateString doc, '\\n'
    else
      @token 'STRNUM', @string doc, q, '\\n'
      @countLines doc
    ++@line if lnl
    txt.length + 6

  # Matches block comments.
  commentToken: ->
    text = @chunk.slice 3, if ~end = @chunk.indexOf '###', 3 then end else 1/0
    @token 'COMMENT', @dedent text, @indent
    @token<[ TERMINATOR \n ]>
    @countLines(text).length + 6

  # Matches JavaScript interpolated directly into the source via backticks.
  jsToken: ->
    @carp 'unterminated JS literal' unless js = JSTOKEN.exec @chunk
    (js = new String js[0].slice 1, -1).js = true
    @countLines(@token 'LITERAL', js).length + 2

  # Matches a regular expression literal, aka regex.
  # Lexing regexes is difficult to distinguish from division,
  # so we borrow some basic heuristics from JavaScript.
  regexToken: ->
    # We distinguish it from the division operator using a list of tokens that
    # a regex never immediately follows.
    # Our list becomes shorter when spaced, due to sans-parentheses calls.
    return 0 if (prev = @last)[0] of <[ STRNUM LITERAL CREMENT ]> or
                not prev.spaced and prev[0] of CALLABLE or
                not regex = REGEX.exec @chunk
    @token 'LITERAL', if regex[=0] is '//' then '/(?:)/' else regex
    @countLines(regex).length

  # Matches a multiline and extended regex literal.
  heregexToken: ->
    @carp 'unterminated heregex' unless match = HEREGEX.exec @chunk
    [heregex, body, flags] = match
    if 0 > body.indexOf '#{'
      body.=replace(HEREGEX_OMIT, '').replace(/\//g, '\\/')
      @token 'LITERAL', "/#{ body or '(?:)' }/#{flags}"
      return @countLines(heregex).length
    @token<[ IDENTIFIER RegExp ]>
    @token<[ CALL_START (      ]>
    {tokens} = this
    for token, i of @interpolateString body
      if token[0] is 'TOKENS'
        tokens.push ...token[1]
      else
        val = token[1].replace HEREGEX_OMIT, ''
        continue if i and not val
        val.=replace bs ||= /\\/g, '\\\\'
        tokens.push ['STRNUM'; @string val, "'", '\\n'; token[2]]
      tokens.push ['PLUS_MINUS', '+', tokens[*-1][2]]
    tokens.pop()
    if flags then @token<[ , , ]>; @token 'STRNUM', "'#{flags}'"
    @token<[ ) ) ]>
    heregex.length

  # Matches a words literal, a syntax sugar for a list of strings.
  wordsToken: ->
    @carp 'unterminated words' unless ~end = @chunk.indexOf ']>', 2
    if call = not @last.spaced and @last[0] of CALLABLE
    then @token<[ CALL_START ( ]> else @token<[ [ [ ]>
    for line of @chunk.slice(2, end).split '\n'
      if words = line.match re ||= /\S+/g then for word of words
        @tokens.push ['STRNUM'; @string word, "'"; @line], [',', ',', @line]
      ++@line
    --@line
    if word then @tokens.pop()   else @token<[ STRNUM '' ]>
    if call then @token<[ ) ) ]> else @token<[ ] ] ]>
    end + 2

  # Matches newlines, indents, and outdents, and determines which is which.
  # If we can detect that the current line is continued onto the next line,
  # then the newline is suppressed:
  #
  #     elements
  #       .each( ... )
  #       .map( ... )
  #
  # Keeps track of the level of indentation, because a single outdent token
  # can close multiple indents, so we need to know how far in we happen to be.
  lineToken: ->
    return 0 unless indent = MULTIDENT.exec @chunk
    @countLines indent[=0]
    @last.eol  = true
    @seenRange = false
    size = indent.length - 1 - indent.lastIndexOf '\n'
    noNewline = LINE_CONTINUER.test(@chunk) or @last[0] of
      <[ ACCESS INDEX_START ASSIGN COMPOUND_ASSIGN IMPORT
         LOGIC PLUS_MINUS MATH COMPARE RELATION SHIFT     ]>
    if size - @indebt is @indent
      @newline() unless noNewline
      return indent.length
    if size > @indent
      if noNewline
        @indebt = size - @indent
        return indent.length
      @indents.push @token 'INDENT', size - @indent + @outdebt
      @outdebt = @indebt = 0
    else
      @indebt = 0
      @outdent @indent - size, noNewline
    @indent = size
    indent.length

  # Consumes non-newline whitespaces and a line comment after them if any.
  spaceToken: ->
    return 0 unless match = SPACE.exec @chunk
    # Tag the previous token as being `.spaced`,
    # because there are cases where it makes a difference.
    @last.spaced = true
    match[0].length

  # We treat all other single characters as a token. e.g.: `( ) , . !`
  # Multi-character operators are also literal tokens, so that Jison can assign
  # the proper order of operations. There are some symbols that we tag specially
  # here. `;` and newlines are both treated as a TERMINATOR, we distinguish
  # parentheses that indicate a method call from regular parentheses, and so on.
  literalToken: ->
    [value] = SYMBOL.exec @chunk
    switch tag = value
    case ')'
      @last[0] = 'CALL_START' if @last[0] is '('
    case <[ -> => ]>
      @tagParameters()
      tag = 'FUNC_ARROW'
    case '*'
      tag = if @last[0] of <[ INDEX_START ( ]> then 'LITERAL' else 'MATH'
    case <[ = := += -= *= /= %= &= ^= |= <<= >>= >>>= ]>
      tag = if value of <[ = := ]> then 'ASSIGN' else 'COMPOUND_ASSIGN'
      if @last[0] is 'LOGIC'
        @tokens.pop()
        (value = new String value).logic = @last[1]
    case <[ ! ~ ]>          then tag = 'UNARY'
    case <[ . ?. &. .= ]>   then tag = 'ACCESS'
    case <[ + - ]>          then tag = 'PLUS_MINUS'
    case <[ === !== <= < > >= == != ]> \
                            then tag = 'COMPARE'
    case <[ && || & | ^ ]>  then tag = 'LOGIC'
    case <[ / % ]>          then tag = 'MATH'
    case <[ ++ -- ]>        then tag = 'CREMENT'
    case <[ << >> >>> ]>    then tag = 'SHIFT'
    case <[ ?[ &[ [= ]>     then tag = 'INDEX_START'
    case '@'                then tag = 'THIS'
    case ';'                then tag = 'TERMINATOR'
    case '?'                then tag = 'LOGIC' if @last.spaced
    case '\\\n'
      return value.length
    case '::'
      (id = new String 'prototype').colon2 = true
      @token<[ ACCESS . ]>
      @token 'IDENTIFIER', id
      return value.length
    default
      if value.charAt(0) is '@'
        @token<[ IDENTIFIER arguments ]>
        @token<[ INDEX_START [ ]>
        @token 'STRNUM', value.slice 1
        @token<[ INDEX_END   ] ]>
        return value.length
      unless (prev = @last).spaced
        if value is '(' and prev[0] of CALLABLE
          if prev[0] is '?'
            prev[0]  = 'CALL_START'
            prev[1] += '('
            return value.length
          tag = 'CALL_START'
        else if value is '[' and prev[0] of INDEXABLE
          tag = 'INDEX_START'
    @token(tag, value).length

  #### Token Manipulators

  # Record an outdent token, or multiple tokens if we happen to be moving back
  # inwards past several recorded indents.
  outdent: (moveOut, noNewline) ->
    while moveOut > 0
      unless idt = @indents[*-1]
        moveOut = 0
      else if idt <= @outdebt
        moveOut  -= idt
        @outdebt -= idt
      else
        moveOut -= @token 'OUTDENT', @indents.pop() - @outdebt
        @outdebt = 0
    @outdebt -= moveOut
    @newline() unless noNewline

  # Generates a newline token. Consecutive newlines get merged together.
  newline: -> @token<[ TERMINATOR \n ]> unless @last[0] is 'TERMINATOR'

  # A source of ambiguity in our grammar used to be parameter lists in function
  # definitions versus argument lists in function calls. Walk backwards, tagging
  # parameters specially in order to make things easier for the parser.
  tagParameters: ->
    return this if @last[0] isnt ')'
    {tokens} = this
    level = 0
    i = tokens.length
    tokens[--i][0] = 'PARAM_END'
    while tok = tokens[--i]
      switch tok[0]
      case ')' then ++level
      case <[ ( CALL_START ]>
        break if level--
        tok[0] = 'PARAM_START'
        return this
    this

  # Matches a balanced group such as a double-quoted string. Pass in
  # a series of delimiters, all of which must be nested correctly within the
  # contents of the string. This method allows us to have strings within
  # interpolations within strings, ad infinitum.
  balancedString: (str, delimited) ->
    stack = [delimited[0]]
    for i from 1 til str.length
      switch str.charAt i
      case '\\'
        ++i
        continue
      case stack[*-1][1]
        stack.pop()
        return str.slice 0, i+1 unless stack.length
        continue
      for pair of delimited
        continue unless (open = pair[0]) is str.substr i, open.length
        stack.push pair
        i += open.length - 1
        break
    @carp "unterminated #{ stack.pop()[0] }"

  # Expand variables and expressions inside double-quoted strings using
  # Ruby-like notation for substitution of arbitrary expressions.
  #
  #     "Hello #{name.capitalize()}."
  #
  # If it encounters an interpolation, this method will recursively create a
  # new Lexer, tokenize the interpolated contents, and merge them into the
  # token stream.
  interpolateString: (str, newline) ->
    {line} = this
    ts = []; pi = 0; i = -1
    while chr = str.charAt ++i
      if chr is '\\'
        ++i
        continue
      continue unless chr is '#' and str.charAt(i+1) is '{'
      if pi < i
        ts.push ['S'; s = str.slice pi, i; @line]
        @countLines s
      code = @balancedString str.slice(i+1), [<[ { } ]>]
      pi   = 1 + i += code.length
      continue unless code.=slice 1, -1
      nested = new Lexer().tokenize code, {@line, rewrite: false}
      nested.pop()
      nested.shift() if nested[0]?[0] is 'TERMINATOR'
      if nested.length > 1
        nested.unshift ['(', '(', nested[ 0 ][2]]
        nested.push    [')', ')', nested[*-1][2]]
      ts.push ['TOKENS', nested]
      @countLines code
    if pi < str.length
      ts.push ['S'; s = str.slice pi; @line]
      @countLines s
    ts.unshift ['S', '', line] if ts[0]?[0] isnt 'S'
    return ts unless newline?
    {tokens} = this
    tokens.push ['(', '(', line]
    for t, i of ts
      tokens.push ['PLUS_MINUS', '+', tokens[*-1][2]] if i
      if t[0] is 'TOKENS'
      then tokens.push ...t[1]
      else tokens.push ['STRNUM'; @string t[1], '"', newline; t[2]]
    @token<[ ) ) ]>
    ts

  #### Helpers

  # Add a token to the results,
  # taking note of the line number and returning `value`.
  token: (tag, value) -> @tokens.push @last = [tag, value, @line]; value

  # Constructs a string token by escaping quotes and newlines.
  string: (body, quote, newline) ->
    return quote + quote unless body
    body.=replace /\\([\s\S])/g, (match, escaped) ->
      if escaped of ['\n', quote] then escaped else match
    body.=replace /// #{quote} ///g, '\\$&'
    body.=replace MULTILINER, newline if newline?
    quote + body + quote

  # Counts the number of lines in a string and add it to `@line`.
  countLines: (str) ->
    pos = 0
    ++@line while pos = 1 + str.indexOf '\n', pos
    str

  # Erases all external indentation on the left-hand side.
  dedent: (str, num) ->
    if num then str.replace /// \n [^\n\S]{#{num}} ///g, '\n' else str

  # Throws a syntax error with the current line number.
  carp: -> throw SyntaxError "#{it} on line #{ @line + 1 }"

#### Constants

# Keywords that Coco shares in common with JavaScript.
JS_KEYWORDS = <[
  true false null this void super
  if else for while switch case default try catch finally class extends
  return throw break continue debugger
  new do delete typeof in instanceof import function
]>

# Coco-only keywords.
COCO_KEYWORDS = JS_KEYWORDS.concat<[ then unless until of ]>
COCO_ALIASES  = not: '!', and: '&&', or: '||',  is: '===', isnt : '!=='

# The list of keywords that are reserved by JavaScript, but not used.
# We throw a syntax error for these to avoid a JavaScript error at runtime.
RESERVED = <[ var with const let enum export native ]>

# The superset of both JavaScript keywords and reserved words, none of which may
# be used as identifiers or properties.
JS_FORBIDDEN = JS_KEYWORDS.concat RESERVED

# Token matching regexes.
IDENTIFIER = /// ^
  ( @? [$A-Za-z_][$\w]* )
  ( [^\n\S]* : (?![:=]) )?  # Is this a property name?
///
NUMBER = ///
  ^ 0x[\da-f]+                                # hex
| ^ ([1-9]\d*) r ([\da-z]+)                   # any radix
| ^ (?: \d+(\.\d+)? | \.\d+ ) (?:e[+-]?\d+)?  # decimal
///i
SYMBOL = /// ^ (?:
  [-+*/%&|^:.[<>]=  | # compound assign / comparison
  ([-+&|:])\1       | # {in,de}crement / logic / prototype access
  [!=]==?           | # strict equality
  [-=]>             | # function
  \.{3}             | # splat
  [?&][.[]          | # soak/bind access
  @\d+              | # argument shorthand
  \\\n              | # continued line
  <<=?              | # left shift
  >>>?=?            | # rite shift
  \S
) ///
SPACE     = /^(?=.)[^\n\S]*(?:#(?!##[^#]).*)?/
MULTIDENT = /^(?:\s*#(?!##[^#]).*)*(?:\n[^\n\S]*)+/
SIMPLESTR = /^'[^\\']*(?:\\.[^\\']*)*'/
JSTOKEN   = /^`[^\\`]*(?:\\.[^\\`]*)*`/

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
  / [imgy]{0,4} (?!\w)
///
HEREGEX      = /// ^ /{3} ([\s\S]+?) /{3} ([imgy]{0,4}) (?!\w) ///
HEREGEX_OMIT = /\s+(?:#.*)?/g

MULTILINER      = /\n/g
LINE_CONTINUER  = /// ^ \s* (?: , | [?&]?\.(?!\.) | :: ) ///

# Tokens which could legitimately be invoked or indexed.
# An opening parenthesis or bracket following these tokens will be recorded as
# the start of a function invocation or property indexing operation.
CALLABLE  = <[ IDENTIFIER THISPROP ) ] SUPER THIS ]>
INDEXABLE = CALLABLE.concat<[ STRNUM LITERAL } ]>
CALLABLE.push '?'
