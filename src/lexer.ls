# The Lexer Object
# ----------------
# Reads a string of LiveScript code and divvies it up into tagged tokens.
# Tokens are in the form:
#
#     ['TAG', 'value', lineNumber = 0]
#
# which is a format that can be fed directly into
# [Jison](http://github.com/zaach/jison) generated [parser](../lib/parser.js).
# Some potential ambiguity in the grammar has been avoided by
# pushing some extra smarts into Lexer.

exports import
  #### Public Methods

  # The entry point.
  lex: (
    # LiveScript source to be parsed into an array of tokens.
    code
    #  - `.raw`  <br> Suppresses token rewriting if truthy.
    #  - `.line` <br> Specifies the starting line. Default `0`.
    options
  # Copy, set, go!
  ) -> (^^exports)tokenize code||'' options||{}

  # Rewrites the token stream in multiple passes, one logical filter at a time.
  # The order of these passes matters--indentation must be
  # corrected before implicit parentheses can be wrapped around blocks of code.
  rewrite: (it || @tokens) ->
    addImplicitIndentation it
    tagPostfixConditionals it
    addImplicitParentheses it
    addImplicitBraces      it
    expandLiterals         it
    it.shift! if it.0?0 is \NEWLINE
    it

  #### Main Loop

  tokenize: (code, o) ->
    @inter or code.=replace /[\r\u2028\u2029\uFEFF]/g ''
    # Prepend a newline to handle leading INDENT.
    code = \\n + code
    # Stream of parsed tokens,
    # initialized with a NEWLINE token to ensure `@last` always exists.
    @tokens = [@last = [\NEWLINE \\n 0]]
    # The current line number. Starts from -1 to setoff the prepended newline.
    @line = ~-o.line
    # The stack of all current indentation levels.
    @dents = []
    # The stack for pairing tokens.
    @closes = []
    # The stack for tagging parameters.
    @parens = []
    # Call tokenizers based on the character at current `i`ndex.
    # Each tokenizing method is responsible for
    # returning the number of characters it has consumed.
    i = 0
    while c = code.charAt i
      switch c
      | ' '         => i += @doSpace     code, i
      | \\n         => i += @doLine      code, i
      | \\          => i += @doBackslash code, i
      | \' \"       => i += @doString    code, i, c
      | [\0 to \9]  => i += @doNumber    code, i
      | \/          =>
        switch code.charAt i+1
        | \*        => i += @doComment code, i
        | \/        => i += @doHeregex code, i
        | otherwise =>      i += @doRegex code, i or @doLiteral code, i
      | otherwise => i += @doID code, i or @doLiteral code, i or @doSpace code, i
    # Close up all remaining open blocks.
    @dedent @dent
    @carp "missing `#that`" if @closes.pop!
    if @inter
    then @rest ? @carp 'unterminated interpolation'
    else @last.spaced = true; @newline!
    # Rewrite the token stream unless explicitly asked not to.
    o.raw or @rewrite!
    @tokens

  # The current indentation level.
  dent: 0

  #### Tokenizers

  # Matches an identifying literal: variables, keywords, accessors, etc.
  doID: (code, index) ->
    [input] = match = (ID <<< lastIndex: index)exec code
    return 0 unless input
    id = match.1.replace /-+([a-zA-Z0-9$_])/g, -> it.1.toUpperCase!
    if NONASCII.test id
      try Function "var #id" catch @carp "invalid identifier \"#id\""
    {last} = this
    # `id:_` `_.id` `@id`
    if match.4 or last.0 is \DOT or @adi!
      @token \ID if id in KEYWORDS then Object(id) <<< {+reserved} else id
      @token \: \: if match.4
      return input.length
    # keywords
    switch id
    case <[ true false on off yes no null void undefined arguments debugger ]> 
      tag = \LITERAL
    case \new \do \typeof \delete                      then tag = \UNARY
    case \return \throw                                then tag = \HURL
    case \break  \continue                             then tag = \JUMP
    case \this \eval \super then return @token(\LITERAL id, true)length
    case \for  then @seenFor = true; fallthrough
    case \then then @wantBy  = false
    case \catch \function then id = ''
    case \in \of
      if @seenFor
        @seenFor = false
        # OF holds the index variable.
        if id is \in
          id = ''; @wantBy = true
          if last.0 is \ID and @tokens[*-2]0 is not \FOR
            id = @tokens.pop!1
            @tokens.pop! if @tokens[*-1]0 is \,
        break
      fallthrough
    case \instanceof
      id  = @tokens.pop!1 + id if last.1 is \!
      tag = if @tokens[*-1].0 is \( then \BIOPR else \RELATION
    case \not
      return (last.1 = \!==; 3) if last.alias and last.1 is \===
      tag = \UNARY; id = \!
    case \and \or \is \isnt
      @unline!
      tag = if id in <[  is isnt ]> then \COMPARE else \LOGIC
      tag = \BIOP if last.0 is \(
      @token tag, switch id
      | \is     => \===   
      | \isnt   => \!==
      | \or     => \||
      | \and    => \&&
      @last.alias = true
      return id.length
    case \unless then tag = \IF
    case \until  then tag = \WHILE
    case \import
      id = \<<<
      if last.0 is \(
        tag = \BIOP
      else 
        able @tokens or @token \LITERAL \this
    case \when
      tag = \CASE; fallthrough
    case \case
      return input.length if @doCase!
    case \loop
      @token \WHILE   id
      @token \LITERAL \true
      return input.length
    default
      break if id in KEYWORDS_SHARED
      @carp "reserved word \"#id\"" if id in KEYWORDS_UNUSED
      if not last.1 and last.0 in <[ CATCH FUNCTION LABEL ]>
        last <<< {1: id, -spaced}
        return id.length
      tag = \ID
      # contextual keywords (reserved only in specific places)
      switch id
      case \own then tag = \OWN if last.0 is \FOR
      case \otherwise 
        if last.0 in <[ CASE | ]>
          last.0 = \DEFAULT
          return 9
      case \all then if last.1 is \<<<
        last.1 += \<
        return 4
      case \from then @forange! and tag = \FROM
      case \to \til
        @forange! and @tokens.push [\FROM '' @line] [\STRNUM \0 @line]
        if @seenFrom
          import {-seenFrom, +wantBy}
          tag = \TO
        else if not last.callable and last.0 is \STRNUM and @tokens[*-2]0 is \[
          last <<< 0:\RANGE op: id
          return id.length
        else if \] in @closes
          @token \TO id
          return id.length
      case \by
        if last.0 is \STRNUM 
        and @tokens[*-2]0 is \RANGE 
        and @tokens[*-3]0 is \[
        then tag = \RANGE_BY
        else if \] in @closes then tag = \BY
        else @wantBy &&= !tag = \BY
      case \ever then if last.0 is \FOR
        @seenFor = false; last.0 = \WHILE; tag = \LITERAL; id = \true
    tag ||= match.1.toUpperCase!
    if tag in <[ COMPARE LOGIC RELATION ]> and last.0 is \(
      tag = if tag is \RELATION then \BIOPR else \BIOP
    @unline! if tag in <[ RELATION THEN ELSE CASE DEFAULT CATCH FINALLY
                          IN OF FROM TO BY EXTENDS ]>
    @token tag, id
    input.length

  # Matches a number, including decimal, hex and exponential notation.
  doNumber: (code, NUMBER.lastIndex) ->
    return 0 unless input = (match = NUMBER.exec code)0
    {last} = this
    # `. 0.0` => `. 0 . 0`
    if match.5 and (last.0 is \DOT or @adi!)
      @token \STRNUM match.4.replace NUMBER_OMIT, ''
      return match.4.length
    if radix = match.1
      num = parseInt rnum = match.2.replace(NUMBER_OMIT, ''), radix
      if radix > 36 or radix < 2
        @carp "invalid number base #radix (with number #rnum), 
               base must be from 2 to 36"
      if isNaN num or num is parseInt rnum.slice(0 -1), radix
        @carp "invalid number #rnum in base #radix"
      num += ''
    else
      num = (match.3 or input)replace NUMBER_OMIT, ''
      if match.3 and num.charAt! is \0 and num.charAt(1) not in ['' \.]
        @carp "deprecated octal literal #{match.4}"
    if not last.spaced and last.0 is \+-
      last.0 = \STRNUM; last.1 += num
      return input.length
    @strnum num
    input.length

  # Matches a string literal.
  doString: (code, index, q) ->
    if q is code.charAt index+1
      return if q is code.charAt index+2
             then @doHeredoc code, index, q
             else @strnum q+q; 2
    if q is \"
      parts = @interpolate code, index, q
      @addInterpolated parts, unlines
      return 1 + parts.size
    str = (SIMPLESTR <<< lastIndex: index)exec code .0
          or @carp 'unterminated string'
    @strnum unlines string q, str.slice 1 -1
    @countLines(str)length

  # Matches heredocs, adjusting indentation to the correct level,
  # as they ignore indentation to the left.
  doHeredoc: (code, index, q) ->
    if q is \'
      ~(end = code.indexOf q+q+q, index+3) or @carp 'unterminated heredoc'
      raw = code.slice index+3 end
      # Remove trailing indent.
      doc = raw.replace LASTDENT, ''
      @strnum enlines string q, lchomp detab doc, heretabs doc
      return @countLines(raw)length + 6
    parts = @interpolate code, index, q+q+q
    tabs  = heretabs code.slice(index+3 index+parts.size)replace LASTDENT, ''
    for t, i in parts then if t.0 is \S
      t.1.=replace LASTDENT, '' if i+1 is parts.length
      t.1 = detab  t.1, tabs
      t.1 = lchomp t.1 if i is 0
    @addInterpolated parts, enlines
    3 + parts.size

  # Matches block comments.
  doComment: (code, index) ->
    comment = if ~end = code.indexOf \*/ index+2
              then code.slice index, end+2
              else code.slice(index) + \*/
    if @last.0 in <[ NEWLINE INDENT THEN => ]>
    then @token \COMMENT detab comment, @dent; @token \NEWLINE \\n
    else @last.spaced = true
    @countLines(comment)length

  # Matches a regular expression literal aka _regex_,
  # disambiguating from division operators.
  doRegex: (code, index) ->
    # To coexist with implicit call and ACI,
    # disallow leading space or equal sign when applicable.
    #
    #     f /re/ 9 /ex/   # f(/re/, 9, /ex/)
    #     a /= b / c / d  # division
    #
    if divisible = able @tokens or @last.0 is \CREMENT
      return 0 if not @last.spaced or code.charAt(index+1) in [' ' \=]
    [input, body, flag] = (REGEX <<< lastIndex: index)exec code
    if input
    then @regex body, flag
    else if not divisible and @last.0 isnt \( then @carp 'unterminated regex'
    input.length

  # Matches a multiline, extended regex literal.
  doHeregex: (code, index) ->
    {tokens, last} = this
    parts = @interpolate code, index, \//
    rest  = code.slice index + 2 + parts.size
    flag  = @validate /^(?:[gimy]{1,4}|[?$]?)/exec(rest)0
    if parts.1
      if flag is \$
        @adi!; @token \( \"
      else
        tokens.push [\ID \RegExp last.2] [\CALL( '' last.2]
        if flag is \?
          for t, i in parts by -1 then if t.0 is \TOKENS
            dynaflag = parts.splice(i, 1).0.1
            break
      for t, i in parts
        if t.0 is \TOKENS
          tokens.push ...t.1
        else
          val = t.1.replace HEREGEX_OMIT, ''
          continue if one and not val
          one = tokens.push t <<< [\STRNUM string \' enslash val]
        tokens.push [\+- \+ tokens[*-1]2]
      --tokens.length
      if dynaflag or flag >= \g
        @token \, \,
        if dynaflag then tokens.push ...dynaflag else @token \STRNUM "'#flag'"
      @token (if flag is \$ then \) else \)CALL), ''
    else @regex reslash(parts.0.1.replace HEREGEX_OMIT, ''), flag
    2 + parts.size + flag.length

  # Matches a word literal, or ignores a sequence of whitespaces.
  doBackslash: (code, BSTOKEN.lastIndex) ->
    [input, word] = BSTOKEN.exec code
    if word then @strnum string \' word else @countLines input
    input.length

  # Matches newlines and {in,de}dents, determining which is which.
  # If we can detect that the current line is continued onto the next line,
  # then the newline is suppressed:
  #
  #     elements
  #     .map -> ...
  #     .get()
  #
  # Keeps track of the level of indentation, because a single dedent
  # can close multiple indents, so we need to know how far in we happen to be.
  doLine: (code, index) ->
    [input, tabs] = (MULTIDENT <<< lastIndex: index)exec code
    {length} = @countLines input
    {last} = this; last <<< {+eol, +spaced}
    return length if index + length >= code.length
    if 0 > delta = tabs.length - @dent
      @dedent -delta
      @newline!
    else
      if tabs and (@emender ||= //[^#{ tabs.charAt 0 }]//)exec tabs
        @carp "contaminated indent #{ escape that }"
      if (tag = last.0) is \ASSIGN and ''+last.1 not in <[ = := += ]>
      or tag in <[ +- PIPE BACKPIPE DOT LOGIC MATH COMPARE RELATION SHIFT BITWISE
                   IN OF TO BY FROM EXTENDS ]>
        return length
      if delta then @indent delta else @newline!
    @wantBy = false
    length

  # Consumes non-newline whitespaces and/or a line comment.
  doSpace: (code, SPACE.lastIndex) ->
    @last.spaced = true if input = SPACE.exec(code)0
    input.length

  # Used from both doLiteral (|) and doID (case): adds swtich if required
  doCase: ->
    if @last.0 in <[ ASSIGN -> : ]>
    or (@last.0 is \INDENT and @tokens[*-2].0 in <[ ASSIGN -> : ]>)
      @token \SWITCH \switch
      @line++
      @token \CASE   \case

  # We treat all other single characters as a token. e.g.: `( ) , . !`
  # Multi-character operators are also literal tokens, so that Jison can assign
  # the proper order of operations. There are some symbols that we tag specially
  # here. `;` and newlines are both treated as a NEWLINE, we distinguish
  # parentheses that indicate a method call from regular parentheses, and so on.
  doLiteral: (code, index) ->
    return 0 unless sym = (SYMBOL <<< lastIndex: index)exec(code)0
    switch tag = val = sym
    case \=>             then tag = \THEN; @unline!
    case \|              
      tag = \CASE
      return sym.length if @doCase! 
    case \|> \|>>        then tag = \PIPE
    case \`              then tag = \BACKTICK
    case \<< \>>         then tag = \COMPOSE
    case \<|             then tag = \BACKPIPE
    case \+ \-           then tag = \+-
    case \&              then tag = \CONCAT
    case \&& \||         then tag = \LOGIC
    case \&&& \||| \^^^  then tag = \BITWISE
    case \^^             then tag = \CLONE
    case \** \^          then tag = \POWER
    case \?  \!?         then tag = \LOGIC if @last.spaced
    case \/ \% \%%       then tag = \MATH
    case \+++            then tag = \CONCAT
    case \++ \--         then tag = \CREMENT
    case \<<< \<<<<      then tag = \IMPORT
    case \;              then tag = \NEWLINE; @wantBy = false
    case \.
      @last.0 = \? if @last.1 is \?
      tag = \DOT
    case \,
      switch @last.0
      | \, \[ \( \CALL( => @token \LITERAL \void
      | \FOR \OWN       => @token \ID ''
    case \!=
      unless able @tokens or @last.0 in [\( \CREMENT]
        @tokens.push [\UNARY \! @line] [\ASSIGN \= @line]
        return 2
      fallthrough
    case <[ === !== == ]> 
      val = switch val
        | \=== => \==
        | \!== => \!=
        | \==  => \===
        | \!=  => \!==
      tag = \COMPARE
    case <[ < > <= >= ]> then tag = \COMPARE
    case <[ <<<<<  >>>>  >>>>>  <?  >? ]> then tag = \SHIFT
    case \(
      unless @last.0 in <[ FUNCTION LET ]> or @able true or @last.1 is \.@
        @token \( \(
        @closes.push \)
        @parens.push @last
        return 1
      tag = \CALL(
      @closes.push \)CALL
    case \[ \{
      @adi!
      @closes.push ']}'charAt val is \{
    case \}
      if @inter and val is not @closes[*-1]
        @rest = code.slice index+1
        return 9e9
      fallthrough
    case \] \)
      if tag is \) and @last.0 in <[ +- COMPARE LOGIC MATH POWER SHIFT BITWISE
                                     CONCAT COMPOSE RELATION PIPE BACKPIPE IMPORT ]>
        @tokens[*-1].0 = if @last.0 is \RELATION then \BIOPR else \BIOP
      @lpar = @parens.pop! if \) is tag = val = @pair val
    case <[ = : ]>
      # change id@! to calls (id! already makes calls)
      if @last.0 is \UNARY and @last.1 is \! and @tokens[*-2].1 in [\.@ \this]
        @tokens.pop!
        @token \CALL( \(
        @token \)CALL \)
      if @last.0 is \)CALL
        tag = \ASSIGN if val is \=
        arrow = \->
        @tokens.pop! # remove the )CALL
        @token \)PARAM \) # add )PARAM
        for t, i in @tokens by -1 when t.0 is \CALL( then break # find opening CALL
        # remove opening call, replace with assign and param
        @tokens.splice i, 1, [tag, val, @line], [\PARAM( \( @line]
        # if 'id@(params) = something' then 'id = (params) ~> something'
        if @tokens[i-1].1 in <[ .@ this ]>
          @tokens.splice i-1, 1
          arrow = \~>
          i-- # we have one less token now
        # if '!id(params)=' or '!id(params):' then disable func return
        if @tokens[i-2].1 is \! 
          @tokens.splice i-2, 1
          @tokens.splice i, 0, [\UNARY \! @line]
        else if @tokens[i-2].1 is \.
        and     @tokens[i-3].1 is \) 
        and     @tokens[i-4].1 is \! 
        and     @tokens[i-5].1 is \this
          @tokens.splice i-4, 2
          @tokens.splice i-1, 0, [\UNARY \! @line]
        @token \-> (arrow.charAt 0) + arrow
        return sym.length
      if val is \:
        if @last.0 not in <[ ID STRNUM ) ]> then tag = \LABEL; val = ''
        @token tag, val
        return sym.length
      fallthrough
    case <[ := += -= *= /= %= %%= <?= >?= **= ^= ]>
      if @last.1 is \. or @last.0 is \? and @adi!
        @last.1 += val
        return val.length
      if @last.0 is \LOGIC
        (val = Object val)logic = @tokens.pop!1
      else if val in <[ += -= ]> and not able @tokens and
              @last.0 not in <[ +- UNARY LABEL ]>
        @token \UNARY val.charAt!; val = \=
      tag = \ASSIGN
    case \::=
      @token \DOT \.
      @token \ID \prototype
      @token \IMPORT \<<
      return sym.length
    case \*
      if @last.0 in <[ NEWLINE INDENT THEN => ]> and
         (INLINEDENT <<< lastIndex: index+1)exec code .0.length
        @tokens.push [\LITERAL \void @line] [\ASSIGN \= @line]
        @indent index + that - 1 - @dent - code.lastIndexOf \\n index-1
        return that
      tag = if able @tokens
            or @last.0 is \CREMENT and able @tokens, @tokens.length-1
            or @last.0 is \(
            then \MATH else \STRNUM
    case \@ \@@
      @dotcat val or if val is \@
        then @token \LITERAL \this true
        else @token \LITERAL \arguments
      return val.length
    case \!
      switch then unless @last.spaced
        if able @tokens, null true
          @token \CALL( \!
          @token \)CALL \)
        else if @last.1 is \typeof
          @last.1 = \classof
        else break
        return 1
      tag = \UNARY
    case \~
      return 1 if @dotcat val
      tag = \UNARY
    case \-> \~> \--> \~~> then up = \->; fallthrough
    case \<- \<~ then @parameters tag = up || \<-
    case \::     then up = \prototype; fallthrough
    case \..     then @adi!; tag = \ID; val = up || \constructor
    default switch val.charAt 0
    case \( then @token \CALL( \(; tag = \)CALL; val = \)
    case \<
      @carp 'unterminated words' if val.length < 4
      @adi!; tag = \WORDS; val.=slice 2 -2
    if tag in <[ +- COMPARE LOGIC MATH POWER SHIFT BITWISE CONCAT 
                 COMPOSE RELATION PIPE BACKPIPE IMPORT ]> and @last.0 is \(
      tag = \BIOP
    @unline! if tag in <[ , CASE PIPE BACKPIPE DOT LOGIC COMPARE 
                          MATH POWER IMPORT SHIFT BITWISE ]>
    @token tag, val
    sym.length

  #### Token Manipulators

  # Adds a token to the results,
  # taking note of the line number and returning `value`.
  token: (tag, value, callable) ->
    @tokens.push @last = [tag, value, @line]
    @last.callable = true if callable
    value

  # Records an INDENT.
  indent: !(delta) ->
    @dent += delta
    @dents .push @token \INDENT delta
    @closes.push \DEDENT

  # Records DEDENTs against matching INDENTs.
  dedent: !(debt) ->
    @dent -= debt
    while debt > 0 and dent = @dents.pop!
      if debt < dent and not @inter
        @carp "unmatched dedent (#debt for #dent)"
      @pair \DEDENT
      debt -= if typeof dent is \number then @token \DEDENT dent else dent

  # Generates a newline token. Consecutive newlines get merged together.
  newline: !-> @last.1 is \\n or
               @tokens.push @last = [\NEWLINE \\n @line] <<< {+spaced}

  # Cancels an immediate newline.
  unline: !->
    return unless @tokens.1
    switch @last.0
    # Mark the last indent as dummy.
    | \INDENT  => @dents[*-1] += ''; fallthrough
    | \NEWLINE => @tokens.length--

  # (Re)tags function parameters.
  parameters: !(arrow) ->
    if @last.0 is \) is @last.1
      @lpar.0 = \PARAM(
      @last.0 = \)PARAM
      return
    if arrow is \-> then @token \PARAM( '' else
      for t, i in @tokens by -1 when t.0 in <[ NEWLINE INDENT THEN => ( ]> then break
      @tokens.splice i+1 0 [\PARAM( '' t.2]
    @token \)PARAM ''

  # Expands variables and expressions inside double-quoted strings or heregexes
  # using Ruby-like notation for substitution of arbitrary expressions.
  #
  #     "Hello #{name.capitalize()}."
  #
  # Will recursively create a new lexer for each interpolation,
  # tokenizing the contents and merging them into the token stream.
  interpolate: !(str, idx, end) ->
    parts = []; end0 = end.charAt 0; pos = 0; i = -1
    str.=slice idx + end.length
    while ch = str.charAt ++i
      switch ch
      case end0
        continue unless end is str.slice i, i + end.length
        parts.push [\S; @countLines str.slice 0 i; @line]
        return parts <<< size: pos + i + end.length
      case \#
        if id = (ID <<< lastIndex: i+1)exec(str)1
          break if id is \this or id not in KEYWORDS
          i += id.length
          continue
        continue unless \{ is str.charAt i+1
      case \\ then ++i; fallthrough
      default continue
      # `"#a#{b || c}"` => `a + "" + (b || c)`
      if i or nested and not stringified
        stringified = parts.push [\S; @countLines str.slice 0 i; @line]
      if id
        str.=slice delta = i + 1 + id.length
        parts.push [\TOKENS nested = [[\ID id, @line]]]
      else
        clone  = ^^exports <<< {+inter, @emender}
        nested = clone.tokenize str.slice(i+2), {@line, +raw}
        delta  = str.length - clone.rest.length
        {rest: str, @line} = clone
        while nested.0?0 is \NEWLINE then nested.shift! 
        if nested.length
          nested.unshift [\( \( nested.0.2]
          nested.push    [\) \) @line]
          parts.push [\TOKENS nested]
      pos += delta; i = -1
    @carp "missing `#end`"

  # Merges `@interpolate`d strings.
  addInterpolated: !(parts, nlines) ->
    return @strnum nlines string \" parts.0.1 unless parts.1
    {tokens, last} = this
    [left, right, joint] = if not last.spaced and last.1 is \%
      --tokens.length
      @last = last = tokens[*-1]
      [\[ \] [\,  \,]]
    else
      [\( \) [\+- \+]]
    callable = @adi!
    tokens.push [left, \", last.2]
    for t, i in parts
      if t.0 is \TOKENS
        tokens.push ...t.1
      else
        continue if i > 1 and not t.1
        tokens.push [\STRNUM; nlines string \" t.1; t.2]
      tokens.push joint +++ tokens[*-1]2
    --tokens.length
    @token right, '', callable

  # Records a string/number token, supplying implicit dot if applicable.
  strnum: !-> @token \STRNUM it, @adi! || @last.0 is \DOT

  # Records a regex token.
  regex: (body, flag) ->
    try RegExp body catch @carp e.message
    return @strnum string \' enslash body if flag is \$
    @token \LITERAL "/#{ body or '(?:)' }/#{ @validate flag }"

  # Supplies an implicit DOT if applicable.
  adi: ->
    return if @last.spaced
    if @last.0 is \!?
      @last.0 = \CALL(; @tokens.push [\)CALL '' @line] [\? \? @line]
    @token \DOT \. if able @tokens

  # Resolves `.~` etc.
  dotcat: -> @last.1 += it if @last.1 is \. or @adi!

  # Pairs up a closing token.
  pair: ->
    unless it is (wanted = @closes[*-1]) or \)CALL is wanted and it is \)
      @carp "unmatched `#it`" unless \DEDENT is wanted
      # Auto-close DEDENT to support code like:
      #
      #     [ a
      #       b ]
      #
      @dedent @dents[*-1]
      return @pair it
    @unline!
    @closes.pop!

  #### Helpers

  # Checks if the last token is
  #
  # - `f()`: `call`able via explicit parentheses
  # - `x''`: indexable via implicit brackets
  able: (call) -> not @last.spaced and able @tokens, null call

  # Increments `@line` by the number in newlines in a string.
  countLines: -> (while pos = 1 + it.indexOf \\n pos then ++@line); it

  # Checks FOR for FROM/TO.
  forange: -> @tokens[*-2]?0 is \FOR and import {-seenFor, +seenFrom}

  # Complains on duplicate flag.
  validate: (flag) ->
    if flag and /(.).*\1/exec flag
      @carp "duplicate regex flag `#{that.1}`"
    flag

  # Throws a syntax error with the current line number.
  carp: !-> carp it, @line

#### Helpers

function carp msg, lno then throw SyntaxError "#msg on line #{-~lno}"

# Checks whether or not the previous token is {index,`call`}able.
function able tokens, i ? tokens.length, call
  [tag] = token = tokens[i-1]
  tag in <[ ID ] ? ]> or if call
    then token.callable or tag in <[ ) )CALL ]> and token.1
    else tag in <[ } ) )CALL STRNUM LITERAL WORDS ]>

#### String Manipulators

# Constructs a string literal by (un)escaping quotes and newlines.
string = let do
  escaped = // \\ (?: ([0-3]?[0-7]{2} | [1-7] | 0(?=[89]))
                    | [\\0bfnrtuvx] | [^\n\S] | ([\w\W])   )? //g
  descape = (it, oct, rest) ->
    # Convert octal to hex for strict mode.
    return \\\x + (0x100 + parseInt oct, 8)toString 16 .slice 1 if oct
    rest or if it is \\ then \\\\ else it
  qs = "'":/'/g '"':/"/g
then (q, body) -> q + body.replace(escaped, descape)replace(qs[q], \\\$&) + q

# Detects the minimum indent count for a heredoc, ignoring empty lines.
function heretabs doc
  dent = 0/0
  while TABS.exec doc then dent <?= that.0.length - 1 
  dent
TABS = /\n[^\n\S]*(?!$)/mg

# Erases all external indentations up to specified length.
function detab str, len
  if len then str.replace detab[len]||=//\n[^\n\S]{1,#len}//g \\n else str

function replacer re, to then -> it.replace re, to

# Erases all newlines and indentations.
unlines = replacer /\n[^\n\S]*/g ''

# Converts newlines/backslashes to their quoted form.
enlines = replacer /\n/g \\\n
enslash = replacer /\\/g \\\\

# Quotes slashes unless already quoted.
reslash = replacer /(\\.)|\//g -> @@1 or \\\/

# Deletes the first character if newline.
function lchomp then it.slice 1 + it.lastIndexOf \\n 0

function decode val, lno
  return [+val] unless isNaN val
  val = if val.length > 8 then \ng else do Function \return + val
  val.length is 1 or carp 'bad string in range' lno
  [val.charCodeAt!, true]

function uxxxx then \"\\u + (\000 + it.toString 16)slice(-4) + \"
character = if JSON!? then uxxxx else ->
  switch it | 0x2028 0x2029 => uxxxx it
  default JSON.stringify String.fromCharCode it

#### Rewriters

# The LiveScript language has a good deal of optional syntax, implicit syntax,
# and shorthand syntax. This can greatly complicate a grammar and bloat
# the resulting parse table. Instead of making the parser handle it all,
# we take a series of passes over the token stream,
# convert shorthand into the unambiguous long form, add implicit indentation
# and parentheses, and generally clean things up.

# Tag postfix conditionals as such, so that we can parse them with a
# different precedence.
!function tagPostfixConditionals tokens
  for token, i in tokens when token.0 is \IF then detectEnd tokens, i+1, ok, go 
  function  ok then it.0 in <[ NEWLINE INDENT ]>
  !function go then it.0 is \INDENT and (it.1 or it.then) or token.0 = \POST_IF

# Wrap single-line blocks with regular INDENT/DEDENT pairs.
# Because our grammar is LALR(1), it can't handle some sequences
# that lack ending delimiters.
!function addImplicitIndentation tokens
  i = 0
  while token = tokens[++i]
    [tag] = token
    continue unless tag in <[ -> THEN ELSE DEFAULT TRY CATCH FINALLY ]>
    switch next = tokens[i+1]0
    case \IF then continue if tag is \ELSE
    case \INDENT \THEN
      tokens.splice i-- 1 if tag is \THEN
      continue
    indent = [\INDENT 0 token.2]; dedent = [\DEDENT 0]
    if tag is \THEN
    then (tokens[i] = indent)then = true
    else tokens.splice ++i, 0 indent
    switch
    # ->,
    case next in <[ DOT ? , PIPE BACKPIPE ]> then --i; fallthrough
    # -> 0,
    case next in <[ ID STRNUM LITERAL ]> and \, is tokens[i+2]?0
      go 0 i+=2; ++i
    # -> [0],
    case next in <[ ( [ { ]>
     and \, is tokens[idx = 1 + indexOfPair tokens, i+1]?0
      go 0 idx; ++i
    default
      seenSwitch = false
      detectEnd tokens, i+1, ok, go
  function ok token, i
    switch token.0
    | \NEWLINE         => token.1 is not \;
    | \DOT \? \, \PIPE \BACKPIPE => tokens[i-1]eol
    | \ELSE            => tag is \THEN
    | \CATCH           => tag is \TRY
    | \FINALLY         => tag in <[ TRY CATCH THEN ]>
    | \SWITCH          => not seenSwitch := true
    | \CASE \DEFAULT   => not seenSwitch
  !function go [] i
    prev = tokens[i-1]
    tokens.splice if prev.0 is \, then i-1 else i, 0, dedent <<< {prev.2}

# Functions may be optionally called without parentheses for simple cases.
# Insert the missing parentheses here to aid the parser.
!function addImplicitParentheses tokens
  i = 0; brackets = []
  while token = tokens[++i]
    if token.1 is \do and tokens[i+1]?0 is \INDENT
      endi = indexOfPair tokens, i+1
      if tokens[endi+1]0 is \NEWLINE and tokens[endi+2]?0 is \WHILE
        token.0 = \DO
        tokens[endi+2]done = true
        tokens.splice endi+1 1
      else
        (token = tokens[1+ i])0 = \(
        (tpair = tokens[endi])0 = \)
        token.doblock = true
        tokens.splice i, 1
    [tag] = token; prev = tokens[i-1]
    brackets.push prev.0 is \DOT if tag is \[
    if prev.0 is \]
      if brackets.pop! then prev.index = true else continue
    continue unless prev.0 in <[ FUNCTION LET ]>
                 or prev.spaced and able tokens, i, true
    if token.doblock
      token.0 = \CALL(
      tpair.0 = \)CALL
      continue
    continue unless tag in ARG or not token.spaced and tag in <[ +- CLONE ]>
    if tag is \CREMENT
      continue if token.spaced or tokens[i+1]?0 not in CHAIN
    skipBlock = seenSwitch = false
    tokens.splice i++, 0 [\CALL( '' token.2]
    detectEnd tokens, i, ok, go
  function ok token, i
    tag = token.0
    return true if tag in <[ POST_IF PIPE BACKPIPE ]>
                or not skipBlock and token.alias and token.1 in <[ && || ]>
    pre = tokens[i-1]
    switch tag
    case \NEWLINE
      return pre.0 is not \,
    case \DOT \?
      return not skipBlock and (pre.spaced or pre.0 is \DEDENT)
    case \SWITCH                         then seenSwitch := true; fallthrough
    case \IF \CLASS \FUNCTION \LET \WITH then skipBlock  := true
    case \CASE
      if seenSwitch then skipBlock := true else return true
    case \INDENT
      return skipBlock := false if skipBlock
      return pre.0 not in <[
        { [ , -> : ELSE ASSIGN IMPORT UNARY DEFAULT TRY CATCH FINALLY HURL DO
      ]>
    case \WHILE
      return false if token.done
      fallthrough
    case \FOR
      skipBlock := true
      return able tokens, i or pre.0 is \CREMENT
    false
  !function go token, i then tokens.splice i, 0 [\)CALL '' tokens[i-1]2]

# Object literals may be written without braces for simple cases.
# Insert the missing braces here to aid the parser.
!function addImplicitBraces tokens
  stack = []; i = 0
  while token = tokens[++i]
    unless \: is tag = token.0
      switch
      case tag in CLOSERS then start = stack.pop!
      case tag in OPENERS
        tag = \{ if tag is \INDENT and tokens[i-1]0 is \{
        stack.push [tag, i]
      continue
    paren = tokens[i-1]0 is \)
    index = if paren then start.1 else i-1
    pre   = tokens[index-1]
    continue unless pre.0 in <[ : ASSIGN IMPORT ]> or stack[*-1]?0 is not \{
    stack.push [\{]
    inline = not pre.doblock and pre.0 not in <[ NEWLINE INDENT ]>
    while tokens[index-2]?0 is \COMMENT then index -= 2 
    tokens.splice index, 0 [\{ \{ tokens[index]2]
    detectEnd tokens, ++i+1, ok, go
  function ok token, i
    switch tag = token.0
    | \,                   => break
    | \NEWLINE             => return true if inline
    | \DEDENT              => return true
    | \POST_IF \FOR \WHILE => return inline
    | otherwise            => return false
    t1 = tokens[i+1]?0
    t1 is not (if tag is \, then \NEWLINE else \COMMENT) and
    \: is not tokens[if t1 is \( then 1 + indexOfPair tokens, i+1 else i+2]?0
  !function go token, i then tokens.splice i, 0 [\} '' token.2]

# - Slip unary {pl,min}uses off signed numbers.
# - Expand ranges and words.
# - Insert `()` after each `function`/`let` facing a block.
# - Insert `, ` after each non-callable token facing an argument token.
!function expandLiterals tokens
  i = 0
  while token = tokens[++i]
    switch token.0
    case \STRNUM
      if ~'-+'indexOf sig = token.1.charAt 0
        token.1.=slice 1
        tokens.splice i++ 0 [\+- sig, token.2]
      continue if token.callable
    case \RANGE
      lno = token.2
      if   tokens[i-1]0 is \[
      and  tokens[i+1]0 is \STRNUM
      and (tokens[i+2]0 is \] 
      or  (tokens[i+2]0 is \RANGE_BY
      and  tokens[i+3]?0 is \STRNUM
      and  tokens[i+4]?0 is \]))
        [fromNum, char] = decode token.1, lno
        [toNum, tochar] = decode tokens[i+1].1, lno
        carp 'bad "to" in range' if char ^^^ tochar
        if byNum = tokens[i+2]?0 is \RANGE_BY
          carp 'bad "by" in range' if isNaN byNum = tokens[i+3]?1
        ts = []; toNum -= token.op is \til and 1e-15
        for n from fromNum to toNum by +byNum or 1
          carp 'range limit exceeded' lno if 0x10000 < ts.push \
            [\STRNUM, if char then character n else "#n", lno] [\, \, lno]
        ts.pop! or carp 'empty range' lno
        tokens.splice i, if byNum then 4 else 2, ...ts
        i += ts.length - 1
      else
        token.0 = \STRNUM
        if tokens[i+2]?0 is \RANGE_BY
          tokens.splice i+2, 1, [\BY \by lno]
        tokens.splice i+1, 0, [\TO, token.op, lno]
    case \WORDS
      ts = [[\[ \[ lno = token.2]]
      for word in token.1.match /\S+/g or ''
        ts.push [\STRNUM; string \' word; lno] [\, \, lno]
      tokens.splice i, 1, ...ts, [\] \] lno]
      i += ts.length
    case \INDENT
      if tokens[i-1]
        if that.1 is \new
          tokens.splice i++ 0 \
            [\PARAM( '' token.2] [\)PARAM '' token.2] [\-> '' token.2]
        else if that.0 in <[ FUNCTION LET ]>
          tokens.splice i, 0 [\CALL( '' token.2] [\)CALL '' token.2]
          i += 2
      continue
    case \LITERAL \} \!? then break
    case \) \)CALL then continue if token.1
    case \]        then continue if token.index
    case \CREMENT  then continue unless able tokens, i
    case \BIOP     
      if not token.spaced and token.1 in <[ + - ]> and tokens[i+1].0 isnt \)  
        tokens[i].0 = \+- 
      continue
    case \DOT
      if token.spaced and tokens[i-1].spaced
        tokens[i] = [\COMPOSE \<< token.2]
      continue
    default continue
    if token.spaced and tokens[i+1]0 in ARG
      tokens.splice ++i, 0 [\, \, token.2]

# Seeks `tokens` from `i`ndex and `go` for a token of the same level
# that's `ok` or an unmatched closer.
!function detectEnd tokens, i, ok, go
  levels = 0
  while token = tokens[i], ++i
    return go token, i if not levels and ok token, i
    [tag] = token
    return go token, i if 0 > levels += tag in OPENERS or -(tag in CLOSERS)

function indexOfPair tokens, i
  level = 1; end = INVERSES[start = tokens[i]0]
  while tokens[++i]
    switch that.0
    | start => ++level
    | end   => return i unless --level
  -1

#### Constants

##### Keywords

# Keywords that LiveScript shares in common with JavaScript.
KEYWORDS_SHARED = <[
  true false null this void super return throw break continue
  if else for while switch case default try catch finally class extends
  new do delete typeof in instanceof import function
  let with debugger export
]>

# The list of keywords that are reserved by JavaScript, but not used.
# We throw a syntax error for these to avoid runtime errors.
KEYWORDS_UNUSED = <[ var  const enum  implements interface
                     package private protected public static yield ]>

KEYWORDS = KEYWORDS_SHARED +++ KEYWORDS_UNUSED

##### Regexes
# Some of these are given `g` flag and made sure to match empty string
# so that they can lex from any index by receiving `.lastIndex` beforehand.
ID = // ( (?!\d)(?:(?!\s)[\w$\xAA-\uFFDC])+((\-[a-zA-Z]+)?)* )
        ( [^\n\S]* : (?![:=]) )?  # Is this a property name?
    |//g
SYMBOL = //
  [-+*/^]= | %%?= | ::?=      # compound assign
| \.{1,3}                     # dot / `constructor` / splat/placeholder/yada*3
| &&& | \|\|\| | \^\^\^       # bitwise
| \^\^                          # clone
| \+\+\+                      # list concat 
| --> | ~~>                   # curry
| ([-+&|:])\1                 # crement / logic / `prototype`
| %%                          # mod
| &                           # cons
| \([^\n\S]*\)                # call
| [-~]>                       # function, bound function
| <[-~]                       # backcall
| [!=]==?                     # equality
| @@                          # `arguments`
| <\[(?:[\s\S]*?\]>)?         # words
| <<<<< | >>>>>?              # shifts
| <<<<?                       # import
| <\|                         # backpipe
| << | >>                     # compose
| [<>]\??=?                   # {less,greater}-than-(or-equal-to) / min/max
| !\?                         # inexistence
| \|>>?                       # pipe
| \|                          # case
| =>                          # then
| \*\*=? | \^                 # pow
| `                           # backtick
| [^\s#]?
//g
SPACE     = /[^\n\S]*(?:#.*)?/g
MULTIDENT = /(?:\s*#.*)*(?:\n([^\n\S]*))+/g
SIMPLESTR = /'[^\\']*(?:\\[\s\S][^\\']*)*'|/g
BSTOKEN   = // \\ (?: (\S[^\s,;)}\]]*) | \s* ) //g

NUMBER = //
  0x[\dA-Fa-f][\dA-Fa-f_]*                # hex
| (\d*) ~ ([\dA-Za-z]\w*)                 # number with base
| ( (\d[\d_]*)(\.\d[\d_]*)? (?:e[+-]?\d[\d_]*)? ) [$\w]*
|//g
NUMBER_OMIT = /_+/g

REGEX = //
  /( [^ [ / \n \\ ]*                              # every other thing
     (?: (?: \\.                                  # anything escaped
           | \[ [^\]\n\\]* (?:\\.[^\]\n\\]*)* \]  # or character class
         ) [^ [ / \n \\ ]*                        # every other thing again
     )*
  )/ ([gimy]{1,4}|\$?)
|//g
HEREGEX_OMIT = /\s+(?:#.*)?/g

LASTDENT   = /\n[^\n\S]*$/
INLINEDENT = /[^\n\S]*[^#\s]?/g

NONASCII = /[\x80-\uFFFF]/

##### Tokens

# Tokens that signal the start/end of a balanced pair.
OPENERS = <[ ( [ { CALL( PARAM( INDENT ]>
CLOSERS = <[ ) ] } )CALL )PARAM DEDENT ]>

# The inverse mappings of {OPEN,CLOS}ERS to look things up from either end.
INVERSES = new -> for o, i in OPENERS then import (c = CLOSERS[i]): o, (o): c 

# Tokens that can start a dot/call chain.
CHAIN = <[ ( { [ ID STRNUM LITERAL LET WITH WORDS ]>

# Tokens that can start an argument list.
ARG = CHAIN +++ <[ ... UNARY CREMENT PARAM( FUNCTION
                      IF SWITCH TRY CLASS RANGE LABEL DO ]>
