# The Lexer Object
# ----------------
# Reads a string of LiveScript code and divvies it up into tagged tokens.
# Tokens are in the form:
#
# ['TAG', 'value', line, column]
#
# which is a format that can be fed directly into
# [Jison](http://github.com/zaach/jison) generated [parser](../lib/parser.js).
# Some potential ambiguity in the grammar has been avoided by
# pushing some extra smarts into Lexer.

exports <<<
    #### Public Methods

    # The entry point.
    lex: (
        # LiveScript source to be parsed into an array of tokens.
        code
        # - `.raw`  <br> Suppresses token rewriting if truthy.
        # - `.line` <br> Specifies the starting line. Default `0`.
        options
    # Copy, set, go!
    ) -> (^^exports).tokenize code||'' options||{}

    # Rewrites the token stream in multiple passes, one logical filter at a time.
    # The order of these passes matters--indentation must be
    # corrected before implicit parentheses can be wrapped around blocks of code.
    rewrite: (it || @tokens) ->
        first-pass it
        add-implicit-indentation it
        rewrite-blockless it
        add-implicit-parentheses it
        expand-literals it
        add-implicit-braces it
        it.shift! if it.0?.0 is 'NEWLINE'
        it

    #### Main Loop

    tokenize: (code, o) ->
        @inter or code.=replace /[\r\u2028\u2029\uFEFF]/g ''
        # Prepend a newline to handle leading INDENT.
        code = '\n' + code
        # Stream of parsed tokens,
        # initialized with a NEWLINE token to ensure `@last` always exists.
        @tokens = [@last = ['NEWLINE' '\n' 0 0]]
        # The current line number. Starts from -1 to setoff the prepended newline.
        @line = ~-o.line
        # The index into `code` of the start of the current line.
        # Used to reliably calculate the current column.
        @column = o.column || 0
        # The stack of all current indentation levels.
        @dents = []
        # The stack for pairing tokens.
        @closes = []
        # The stack for tagging parameters.
        @parens = []
        # The stack of flags per nesting level.
        @flags = []
        # Call tokenizers based on the character at current `i`ndex.
        # Each tokenizing method is responsible for
        # returning the number of characters it has consumed.
        i = 0
        prev-index = i
        @chars-counted = 0
        @is-at-prefix = true

        while c = code.char-at i
            chars-consumed = i - prev-index
            prev-index = i

            if @chars-counted > chars-consumed
                throw new Error 'Location information out-of-sync in lexer'
            @column += chars-consumed - @chars-counted
            @chars-counted = 0

            switch c
            | ' '          => i += @do-space code, i
            | '\n'         => i += @do-line code, i
            | '\\'         => i += @do-backslash code, i
            | '\'' '"'     => i += @do-string code, i, c
            | ['0' to '9'] => i += @do-number code, i
            | '/'          =>
                switch code.char-at i + 1
                | '*' => i += @do-comment code, i
                | '/' => i += @do-heregex code, i
                | _   => i += @do-regex code, i or @do-literal code, i
            | '`' =>
                if '`' is code.char-at i + 1
                then i += @do-JS code, i
                else i += @do-literal code, i
            | otherwise => i += @do-ID code, i or @do-literal code, i or @do-space code, i
        # Close up all remaining open blocks.
        @dedent @dent
        @carp "missing `#that`" if @closes.pop!
        if @inter
            @rest ? @carp 'unterminated interpolation'
        else
            @last.spaced = true
            @newline!
        # Rewrite the token stream unless explicitly asked not to.
        o.raw or @rewrite!

        @tokens

    # The current indentation level.
    dent: 0

    # Map of all Identifiers
    identifiers: {}

    # Resets state of lexer
    # Design to be called by external system that needs to reuse lexer
    # e.g. editor plugin checking multiple livescript files for errors
    reset: !-> this <<< dent:0 identifiers: {}

    has-own: Object.prototype.has-own-property

    # Checks for consistent use of Identifiers with dashes
    # Raises an error if two different identifiers mangle into the same camelCased id
    check-consistency: (camel, id) ->
        if @has-own.call(@identifiers, camel) and @identifiers[camel] isnt id
            throw new ReferenceError do
                "Inconsistent use of #{camel} as #{id} on line #{-~@line}"
        else
            @identifiers[camel] = id

    #### Tokenizers

    # Matches an identifying literal: variables, keywords, accessors, etc.
    do-ID: (code, index) ->
        [input] = regex-match = (ID <<< last-index: index).exec code
        return 0 unless input
        id = camelize regex-match.1
        @check-consistency id, regex-match.1 if /-/.test regex-match.1
        if NONASCII.test id
            try Function "var #id" catch then @carp "invalid identifier '#id'"
        {last} = this
        # `id:_` `_.id` `@id`
        if regex-match.2 or last.0 is 'DOT' or @adi!
            @token 'ID' if id in JS_KEYWORDS then Object(id) <<< {+reserved} else id
            @token ':' ':' if regex-match.2
            return input.length
        # keywords
        switch id
        case <[ true false on off yes no null void arguments debugger ]>
            tag = 'LITERAL'
        case <[ new do typeof delete ]>
            tag = 'UNARY'
        case 'yield' 'await'
            tag = 'YIELD'
        case 'return' 'throw'
            tag = 'HURL'
        case 'break' 'continue'
            tag = 'JUMP'
        case 'this' 'eval' 'super'
            return @token 'LITERAL' id, true .length
        case 'for'
            id = []
            @fset 'for' true
            @fset 'to' false
            @fset 'by' true
        case 'then'
            @fset 'for' false
            @fset 'to' false
        case 'catch' 'function'
            id = ''
        case 'in' 'of'
            if @fget 'for'
                @fset 'for' false
                if id is 'in'
                    @fset 'by' true
                    id = ''
                    if last.0 is 'ID' and @tokens[*-2].0 in <[ , ] } ]>
                        id = @tokens.pop!1
                        @tokens.pop! if @tokens[*-1].0 is ','
                break
            fallthrough
        case 'instanceof'
            id = @tokens.pop!1 + id if last.1 is '!'
            tag = if @tokens[*-1].0 is '(' then 'BIOPR' else 'RELATION'
        case 'not'
            return (last.1 = '!=='; 3) if last.alias and last.1 is '==='
            tag = 'UNARY'
            id = '!'
        case 'and' 'or' 'xor' 'is' 'isnt'
            @unline!
            tag = if id in <[ is isnt ]> then 'COMPARE' else 'LOGIC'
            tag = 'BIOP' if last.0 is '('
            @token tag, switch id
            | 'is'   => '==='
            | 'isnt' => '!=='
            | 'or'   => '||'
            | 'and'  => '&&'
            | 'xor'  => 'xor'
            @last.alias = true
            return id.length
        case 'unless'
            tag = 'IF'
        case 'until'
            tag = 'WHILE'
        case 'import'
            if last.0 is '('
                id = '<<<'
                tag = 'BIOP'
            else
                if able @tokens then id = '<<<' else tag = 'DECL'
        case 'export' 'const' 'var' then tag = 'DECL'
        case 'with'
            tag = | able @tokens  => 'CLONEPORT'
                  | last.0 is '(' => 'BIOP'
                  | otherwise     => 'WITH'
        case 'when'
            tag = 'CASE'
            fallthrough
        case 'case'
            return input.length if @do-case!
        case 'match' then tag = 'SWITCH'
        case 'loop'
            @token 'WHILE'     id
            @token 'LITERAL' 'true'
            return input.length
        case 'let' 'own'
            if last.0 is 'FOR' and id not in last.1
                last.1.push id
                return 3
            fallthrough
        default
            break if id in KEYWORDS_SHARED
            @carp "reserved word '#id'" if id in KEYWORDS_UNUSED
            if not last.1 and last.0 in <[ FUNCTION GENERATOR LABEL ]>
                last <<< {1: id, -spaced}
                return input.length
            tag = 'ID'
            # contextual keywords (reserved only in specific places)
            switch id
            case 'otherwise'
                if last.0 in <[ CASE | ]>
                    last.0 = 'DEFAULT'
                    return id.length
            case 'all'
                if last.1 is '<<<' and '<'
                or last.1 is 'import' and 'All'
                    last.1 += that
                    return 3
            case 'from'
                if last.1 is 'yield'
                    last.1 += 'from'
                    return 4
                @forange! and tag = 'FROM'
            case 'to' 'til'
                @forange! and @tokens.push do
                    ['FROM' '' @line, @column] ['STRNUM' '0' @line, @column]
                if @fget 'from'
                    @fset 'from' false
                    @fset 'by' true
                    tag = 'TO'
                else if not last.callable and last.0 is 'STRNUM' and @tokens[*-2].0 is '['
                    last <<< 0:'RANGE' op: id
                    return id.length
                else if ']' in @closes
                    @token 'TO' id
                    return id.length
            case 'by'
                if last.0 is 'STRNUM'
                and @tokens[*-2].0 is 'RANGE'
                and @tokens[*-3].0 is '['
                then tag = 'RANGE_BY'
                else if ']' in @closes
                    tag = 'BY'
                else if @fget 'by' and last.0 is not 'FOR'
                    tag = 'BY'
                    @fset 'by' false
            case 'ever' then if last.0 is 'FOR'
                @fset 'for' false
                last.0 = 'WHILE'
                tag = 'LITERAL'
                id = 'true'
        tag ||= regex-match.1.to-upper-case!
        if tag in <[ COMPARE LOGIC RELATION ]> and last.0 is '('
            tag = if tag is 'RELATION' then 'BIOPR' else 'BIOP'
        if tag in <[ THEN IF WHILE ]>
            @fset 'for' false
            @fset 'by' false
        @unline! if tag in <[ RELATION THEN ELSE CASE DEFAULT CATCH FINALLY
                              IN OF FROM TO BY EXTENDS IMPLEMENTS WHERE ]>
        @token tag, id
        input.length

    # Matches a number, including decimal, hex and exponential notation.
    do-number: (code, NUMBER.last-index) ->
        return 0 unless input = (regex-match = NUMBER.exec code).0
        {last} = this
        # `. 0.0` => `. 0 . 0`
        if regex-match.5 and (last.0 is 'DOT' or @adi!)
            @token 'STRNUM' regex-match.4.replace NUMBER_OMIT, ''
            return regex-match.4.length
        if radix = regex-match.1
            num = parse-int rnum = regex-match.2.replace(NUMBER_OMIT, ''), radix
            bound = false
            if radix > 36 or radix < 2
                if rnum is /[0-9]/
                    @carp "invalid number base #radix (with number #rnum),
                                 base must be from 2 to 36"
                else
                    bound = true
            if is-NaN num or num is parse-int rnum.slice(0 -1), radix
                @strnum regex-match.1
                @token 'DOT' '.~'
                @token 'ID' regex-match.2
                return input.length
            num += ''
        else
            num = (regex-match.3 or input).replace NUMBER_OMIT, ''
            if regex-match.3 and num.char-at! is '0' and num.char-at(1) not in ['' '.']
                @carp "deprecated octal literal #{regex-match.4}"
        if not last.spaced and last.0 is '+-'
            last.0 = 'STRNUM'
            last.1 += num
            return input.length
        @strnum num
        input.length

    # Matches a string literal.
    do-string: (code, index, q) ->
        if q is code.char-at index + 1
            return if q is code.char-at index + 2
                   then @do-heredoc code, index, q
                   else @strnum q + q; 2
        if q is '"'
            parts = @interpolate code, index, q
            @add-interpolated parts, unlines
            return parts.size
        str = (SIMPLESTR <<< last-index: index).exec code .0 or @carp 'unterminated string'
        @strnum unlines @string q, str.slice 1 -1
        @count-lines str .length

    # Matches heredocs, adjusting indentation to the correct level,
    # as they ignore indentation to the left.
    do-heredoc: (code, index, q) ->
        if q is '\''
            ~(end = code.index-of q + q + q, index + 3) or @carp 'unterminated heredoc'
            raw = code.slice index + 3 end
            # Remove trailing indent.
            doc = raw.replace LASTDENT, ''
            @strnum enlines @string q, lchomp detab doc, heretabs doc
            return @count-lines(raw).length + 6
        parts = @interpolate code, index, q + q + q
        tabs = heretabs code.slice(index + 3, (index + parts.size - 3)).replace LASTDENT, ''
        for t, i in parts then if t.0 is 'S'
            t.1.=replace LASTDENT, '' if i + 1 is parts.length
            t.1 = detab t.1, tabs
            t.1 = lchomp t.1 if i is 0
        @add-interpolated parts, enlines
        parts.size

    # Matches block comments.
    do-comment: (code, index) ->
        comment = if ~end = code.index-of '*/' index + 2
                  then code.slice index, end + 2
                  else code.slice(index) + '*/'
        if @last.0 in <[ NEWLINE INDENT THEN ]>
            @token 'COMMENT' detab comment, @dent
            @token 'NEWLINE' '\n'
        @count-lines(comment).length

    # Matches embedded JavaScript.
    do-JS: (code, JSTOKEN.last-index) ->
        js = JSTOKEN.exec code .0 or @carp 'unterminated JS literal'
        @token 'LITERAL' Object(detab js.slice(2 -2), @dent) <<< {+js}, true
        @count-lines(js).length

    # Matches a regular expression literal aka _regex_,
    # disambiguating from division operators.
    do-regex: (code, index) ->
        # To coexist with implicit call and ACI,
        # disallow leading space or equal sign when applicable.
        #
        #  f /re/ 9 /ex/     # f(/re/, 9, /ex/)
        #  a /= b / c / d    # division
        #
        if divisible = able @tokens or @last.0 is 'CREMENT'
            return 0 if not @last.spaced or code.char-at(index + 1) in [' ' '=']
        [input, body, flag] = (REGEX <<< last-index: index).exec code
        if input
            @regex body, flag
        else if not divisible and @last.0 isnt '('
            @carp 'unterminated regex'
        input.length

    # Matches a multiline, extended regex literal.
    do-heregex: (code, index) ->
        {tokens, last} = this
        parts = @interpolate code, index, '//'
        rest = code.slice index + parts.size
        flag = @validate /^(?:[gimy]{1,4}|[?$]?)/.exec(rest).0
        if parts.1
            if flag is '$'
                @adi!
                @token '(' '"'
            else
                tokens.push ['ID' 'RegExp' last.2, last.3] ['CALL(' '' last.2, last.3]
                if flag is '?'
                    for t, i in parts by -1 then if t.0 is 'TOKENS'
                        dynaflag = parts.splice i, 1 .0.1
                        break
            for t, i in parts
                if t.0 is 'TOKENS'
                    tokens.push ...t.1
                else
                    val = deheregex t.1
                    continue if one and not val
                    one = tokens.push t <<< ['STRNUM' @string '\'' enslash val]
                tokens.push ['+-' '+' tokens[*-1].2, tokens[*-1].3]
            --tokens.length
            if dynaflag or flag >= 'g'
                @token ',' ','
                if dynaflag then tokens.push ...dynaflag else @token 'STRNUM' "'#flag'"
            @token (if flag is '$' then ')' else ')CALL'), ''
        else
            @regex reslash(deheregex parts.0.1), flag
        parts.size + flag.length

    # Matches a word literal, or ignores a sequence of whitespaces.
    do-backslash: (code, BSTOKEN.last-index) ->
        [input, word] = BSTOKEN.exec code
        if word then @strnum @string '\'' word else @count-lines input
        input.length

    # Matches newlines and {in,de}dents, determining which is which.
    # If we can detect that the current line is continued onto the next line,
    # then the newline is suppressed:
    #
    # elements
    #   .map -> ...
    #   .get()
    #
    # Keeps track of the level of indentation, because a single dedent
    # can close multiple indents, so we need to know how far in we happen to be.
    do-line: (code, index) ->
        [input, tabs] = (MULTIDENT <<< last-index: index).exec code
        {length} = @count-lines input
        {last} = this
        last <<< {+eol, +spaced}
        return length if index + length >= code.length
        if tabs and (@emender ||= //[^#{ tabs.char-at! }]//).exec tabs
            @carp "contaminated indent #{ escape that }"
        if 0 > delta = tabs.length - @dent
            @dedent -delta
            @newline!
        else
            [tag, val] = last
            if tag is 'ASSIGN' and val + '' not in <[ = := += ]>
            or tag is 'CREMENT' and val is '++' and @tokens[*-2].spaced
            or tag in <[ +- PIPE BACKPIPE COMPOSE DOT LOGIC MATH COMPARE RELATION
                         SHIFT IN OF TO BY FROM EXTENDS IMPLEMENTS ]>
                return length
            if delta then @indent delta else @newline!
        @fset 'for' false
        @fset 'by' false
        length

    # Consumes non-newline whitespaces and/or a line comment.
    do-space: (code, SPACE.last-index) ->
        @last.spaced = true if input = SPACE.exec(code).0
        input.length

    # Used from both do-literal (|) and do-ID (case): adds switch if required
    do-case: ->
        @fset 'for' false
        if @last.0 in <[ ASSIGN -> : ]>
        or (@last.0 is 'INDENT' and @tokens[*-2].0 in <[ ASSIGN -> : ]>)
            @token 'SWITCH' 'switch'
            @token 'CASE' 'case'

    # We treat all other single characters as a token. e.g.: `( ) , . !`
    # Multi-character operators are also literal tokens, so that Jison can assign
    # the proper order of operations. There are some symbols that we tag specially
    # here. `;` and newlines are both treated as a NEWLINE, we distinguish
    # parentheses that indicate a method call from regular parentheses, and so on.
    do-literal: (code, index) ->
        return 0 unless sym = (SYMBOL <<< last-index: index).exec(code).0
        switch tag = val = sym
        case '|'
            tag = 'CASE'
            return sym.length if @do-case!
        case '|>'
            tag = 'PIPE'
        case '`'
            tag = 'BACKTICK'
        case '<<' '>>'
            tag = 'COMPOSE'
        case '<|'
            tag = 'BACKPIPE'
        case '+' '-'
            tag = '+-'
        case '&&' '||'
            tag = 'LOGIC'
        case '.&.' '.|.' '.^.'
            tag = 'BITWISE'
        case '^^'
            tag = 'CLONE'
        case '**' '^'
            tag = 'POWER'
        case '?'
            if @last.0 is '('
                @token 'PARAM(' '('
                @token ')PARAM' ')'
                @token '->'         '->'
                @token 'ID'         'it'
            else
                tag = 'LOGIC' if @last.spaced
        case '/' '%' '%%'
            tag = 'MATH'
        case '++' '--'
            tag = 'CREMENT'
        case '<<<' '<<<<'
            tag = 'IMPORT'
        case ';'
            tag = 'NEWLINE'
            @fset 'by' false
        case '..'
            @token 'LITERAL' '..' true
            return 2
        case '.'
            @last.0 = '?' if @last.1 is '?'
            tag = 'DOT'
        case ','
            switch @last.0
            | ',' '[' '(' 'CALL(' => @token 'LITERAL' 'void'
            | 'FOR' 'OWN'         => @token 'ID' ''
        case '!=' '~='
            unless able @tokens or @last.0 in ['(' 'CREMENT']
                @tokens.push (if val is '!=' then ['UNARY' '!' @line, @column] else ['UNARY' '~' @line, @column]), ['ASSIGN' '=' @line, @column]
                return 2
            fallthrough
        case '!~=' '=='
            val = switch val
                | '~='  => '=='
                | '!~=' => '!='
                | '=='  => '==='
                | '!='  => '!=='
            tag = 'COMPARE'
        case <[ === !== ]>
            val += '='
            fallthrough
        case <[ < > <= >= <== >== >>= <<= ]> then tag = 'COMPARE'
        case <[ .<<. .>>. .>>>. <? >? ]> then tag = 'SHIFT'
        case '('
            unless @last.0 in <[ FUNCTION GENERATOR LET ]> or @able true or @last.1 is '.@'
                @token '(' '('
                @closes.push ')'
                @parens.push @last
                return 1
            tag = 'CALL('
            @closes.push ')CALL'
        case '[' '{'
            @adi!
            @closes.push ']}'char-at val is '{'
        case '}'
            if @inter and val is not @closes[*-1]
                @rest = code.slice index + 1
                return 9e9
            fallthrough
        case ']' ')'
            if tag is ')' and @last.0 in <[ +- COMPARE LOGIC MATH POWER SHIFT BITWISE
                                            CONCAT COMPOSE RELATION PIPE BACKPIPE IMPORT
                                            CLONEPORT ASSIGN ]>
                @tokens[*-1].0 = switch @last.0
                    | 'RELATION' => 'BIOPR'
                    | 'PIPE'     => @parameters false, -1; 'BIOPP'
                    | otherwise  => 'BIOP'
            @lpar = @parens.pop! if ')' is tag = val = @pair val
        case <[ = : ]>
            if val is ':'
                switch @last.0
                | 'ID' 'STRNUM' ')' => break
                | '...'             => @last.0 = 'STRNUM'
                | otherwise =>
                        tag = 'LABEL'
                        val = ''
                @token tag, val
                return sym.length
            fallthrough
        case <[ := += -= *= /= %= %%= <?= >?= **= ^= .&.= .|.= .^.= .<<.= .>>.= .>>>.= ++= |>= ]>
            if @last.1 is '.' or @last.0 is '?' and @adi!
                @last.1 += val
                return val.length
            if @last.0 is 'LOGIC'
                (val = Object val).logic = @tokens.pop!1
            else if val in <[ += -= ]> and not able @tokens and @last.0 not in <[ +- UNARY LABEL ]>
                @token 'UNARY' val.char-at!
                val = '='
            tag = 'ASSIGN'
        case '::='
            @token 'DOT' '.'
            @token 'ID' 'prototype'
            @token 'IMPORT' '<<'
            return sym.length
        case '*'
            if @last.0 is 'FUNCTION'
                @last.0 = 'GENERATOR'
                return sym.length
            if @last.0 in <[ NEWLINE INDENT THEN => ]> and
                 (INLINEDENT <<< last-index: index + 1).exec code .0.length
                @tokens.push ['LITERAL' 'void' @line, @column] ['ASSIGN' '=' @line, @column]
                @indent index + that - 1 - @dent - code.last-index-of '\n' index-1
                return that
            tag = if able @tokens
                  or @last.0 is 'CREMENT' and able @tokens, @tokens.length-1
                  or @last.0 is '('
                  then 'MATH' else 'STRNUM'
        case '@'
            @adi!
            if @last.0 is 'DOT' and @last.1 is '.'
            and @tokens[*-2].0 is 'ID'
            and @tokens[*-2].1 is 'constructor'
                @tokens.pop!
                @tokens.pop!
                @token 'LITERAL' 'this' true
                @adi!
                @token 'ID' 'constructor' true
            else
                @token 'LITERAL' 'this' true
            return 1
        case '@@'
            @adi!
            @token 'ID' 'constructor' true
            return 2
        case '&'
            @token 'LITERAL' 'arguments'
            return 1
        case '!'
            switch then unless @last.spaced
                if @last.1 is 'require'
                    @last.0 = 'REQUIRE'
                    @last.1 = 'require!'
                else if able @tokens, null true
                    @token 'CALL(' '!'
                    @token ')CALL' ')'
                else if @last.1 is 'typeof'
                    @last.1 = 'classof'
                else if @last.1 is 'delete'
                    @last.1 = 'jsdelete'
                else break
                return 1
            tag = 'UNARY'
        case '|' then tag = 'BITWISE'
        case '~'
            return 1 if @dotcat val
            tag = 'UNARY'
        case '::'
            @adi!
            val = 'prototype'
            tag = 'ID'
        case '=>'
            @unline!
            @fset 'for' false
            tag = 'THEN'
        default
            if /^!?(?:--?|~~?)>>?\*?$/.test val # function arrow
                @parameters tag = '->'
            else if /^\*?<(?:--?|~~?)!?$/.test val # backcall
                @parameters tag = '<-'
            else
                switch val.char-at 0
                case '('
                    @token 'CALL(' '('
                    tag = ')CALL'
                    val = ')'
                case '<'
                    @carp 'unterminated words' if val.length < 4
                    @token 'WORDS', val.slice(2, -2), @adi!
                    return @count-lines val .length
        if tag in <[ +- COMPARE LOGIC MATH POWER SHIFT BITWISE CONCAT
                     RELATION PIPE BACKPIPE COMPOSE IMPORT ]> and @last.0 is '('
            tag = if tag is 'BACKPIPE' then 'BIOPBP' else 'BIOP'
        @unline! if tag in <[ , CASE PIPE BACKPIPE COMPOSE DOT LOGIC
                              COMPARE MATH POWER IMPORT SHIFT BITWISE ]>
        @token tag, val
        sym.length


    #### Token Manipulators

    # Adds a token to the results,
    # taking note of the line number and returning `value`.
    token: (tag, value, callable) ->
        @tokens.push @last = [tag, value, @line, @column]
        @last.callable = true if callable
        value

    # Records an INDENT.
    indent: !(delta) ->
        @dent += delta
        @dents .push @token 'INDENT' delta
        @closes.push 'DEDENT'

    # Records DEDENTs against matching INDENTs.
    dedent: !(debt) ->
        @dent -= debt
        while debt > 0 and dent = @dents.pop!
            if debt < dent and not @inter
                @carp "unmatched dedent (#debt for #dent)"
            @pair 'DEDENT'
            debt -= if typeof dent is 'number' then @token 'DEDENT' dent else dent

    # Generates a newline token. Consecutive newlines get merged together.
    newline: !->
        unless @last.0 is 'NEWLINE' and @last.1 is '\n'
            @tokens.push @last = ['NEWLINE' '\n' @line, @column] <<< {+spaced}

    # Cancels an immediate newline.
    unline: !->
        return unless @tokens.1
        switch @last.0
        # Mark the last indent as dummy.
        | 'INDENT'  => @dents[*-1] += ''; fallthrough
        | 'NEWLINE' => @tokens.length--

    # (Re)tags function parameters.
    parameters: !(arrow, offset) ->
        if @last.0 is ')' is @last.1
            @lpar.0 = 'PARAM('
            @last.0 = ')PARAM'
            return
        if arrow is '->' then @token 'PARAM(' '' else
            for t, i in @tokens by -1 when t.0 in <[ NEWLINE INDENT THEN => ( ]> then break
            @tokens.splice (i + 1), 0 ['PARAM(' '' t.2, t.3]
        if offset
        then @tokens.splice (@tokens.length + offset), 0 [')PARAM' '' t.2, t.3]
        else @token ')PARAM' ''

    # Expands variables and expressions inside double-quoted strings or heregexes
    # using Ruby-like notation for substitution of arbitrary expressions.
    #
    # "Hello #{name.capitalize()}."
    #
    # Will recursively create a new lexer for each interpolation,
    # tokenizing the contents and merging them into the token stream.
    interpolate: !(str, idx, end) ->
        parts = []
        end0 = end.char-at 0
        pos = 0
        i = -1
        str.=slice idx + end.length
        [old-line, old-column] = [@line, @column]
        @count-lines end
        while ch = str.char-at ++i
            switch ch
            case end0
                continue unless end is str.slice i, i + end.length
                parts.push ['S'; @count-lines str.slice 0 i; old-line; old-column]
                @count-lines end
                return parts <<< size: pos + i + end.length*2
            case '#'
                c1 = str.char-at i + 1
                id = c1 in <[ @ ]> and c1 or (ID <<< last-index: i + 1).exec str .1
                continue unless id or c1 is '{'
            case '\\' then ++i; fallthrough
            default continue
            # `"#a#{b || c}"` => `a + "" + (b || c)`
            if i or nested and not stringified
                stringified = parts.push ['S'; @count-lines str.slice 0 i; old-line; old-column]
                [old-line, old-column] = [@line, @column]
            if id
                {length} = id
                id = 'this' if id is '@'
                if id in <[ this ]>
                    tag = 'LITERAL'
                else
                    id = camelize id
                    try Function "'use strict'; var #id" catch
                        @carp "invalid variable interpolation '#id'"
                    tag = 'ID'
                str.=slice delta = i + 1 + length
                parts.push ['TOKENS' nested = [[tag, id, @line, @column]]]
            else
                clone = exports with {+inter, @emender}
                nested = clone.tokenize str.slice(i + 2), {@line, column: @column + 2, +raw}
                delta = str.length - clone.rest.length
                @count-lines str.slice(i, delta)
                {rest: str} = clone
                while nested.0?.0 is 'NEWLINE' then nested.shift!
                if nested.length
                    nested.unshift ['(' '(' old-line, old-column]
                    nested.push        [')' ')' @line, @column-1]
                    parts.push ['TOKENS' nested]
                [old-line, old-column] = [@line, @column]
            pos += delta
            i = -1
        @carp "missing `#end`"

    # Merges `@interpolate`d strings.
    add-interpolated: !(parts, nlines) ->
        return @strnum nlines @string '"' parts.0.1 unless parts.1
        {tokens, last} = this
        [left, right, joint] = if not last.spaced and last.1 is '%'
            --tokens.length
            @last = last = tokens[*-1]
            ['[' ']' [','    ',']]
        else
            ['(' ')' ['+-' '+']]
        callable = @adi!
        tokens.push [left, '"', last.2, last.3]
        for t, i in parts
            if t.0 is 'TOKENS'
                tokens.push ...t.1
            else
                continue if i > 1 and not t.1
                tokens.push ['STRNUM' nlines @string '"' t.1; t.2, t.3]
            tokens.push joint ++ tokens[*-1].2 ++ tokens[*-1].3
        --tokens.length
        @token right, '', callable

    # Records a string/number token, supplying implicit dot if applicable.
    strnum: !-> @token 'STRNUM' it, @adi! || @last.0 is 'DOT'

    # Records a regex token.
    regex: (body, flag) ->
        try RegExp body catch then @carp e.message
        return @strnum @string '\'' enslash body if flag is '$'
        @token 'LITERAL' "/#{ body or '(?:)' }/#{ @validate flag }"

    # Supplies an implicit DOT if applicable.
    adi: ->
        return if @last.spaced
        unless able @tokens
            return
        @token 'DOT' '.'

    # Resolves `.~` etc.
    dotcat: -> @last.1 += it if @last.1 is '.' or @adi!

    # Pairs up a closing token.
    pair: ->
        unless it is (wanted = @closes[*-1]) or ')CALL' is wanted and it is ')'
            @carp "unmatched `#it`" unless 'DEDENT' is wanted
            # Auto-close DEDENT to support code like:
            #
            # [ a
            #   b ]
            #
            @dedent @dents[*-1]
            return @pair it
        @unline!
        @fclear!
        @closes.pop!

    #### Helpers

    # Checks if the last token is
    #
    # - `f()`: `call`able via explicit parentheses
    # - `x''`: indexable via implicit brackets
    able: (call) -> not @last.spaced and able @tokens, null call

    # Increments `@line` by the number in newlines in a string.
    count-lines: ->
        # Each time we find a newline, reset the column to the correct value should there be no more newlines
        # Take care if we are before the first line, because it might not start at zero
        @column += it.length unless @is-at-prefix
        while pos = 1 + it.index-of '\n' pos
            @column = 0 unless @is-at-prefix
            @column += it.length - pos
            ++@line
            @is-at-prefix = false
        # Mark these characters as consumed, so that the main loop doesn't re-count them
        @chars-counted += it.length
        it

    # Checks FOR for FROM/TO.
    forange: ->
        if @tokens[* - 2 - (@last.0 in <[NEWLINE INDENT]>)]?.0 is 'FOR' or @last.0 is 'FOR'
            @fset 'for' false
            @fset 'from' true
            true
        else
            false


    # Complains on bad regex flag.
    validate: (flag) ->
        if flag and /(.).*\1/.exec flag
            @carp "duplicate regex flag `#{that.1}`"
        flag

    # Gets/Sets a per-nest flag
    fget: (key) ->
        @flags[@closes.length]?[key]

    fset: (key, val) !->
        @flags{}[@closes.length][key] = val

    fclear: !->
        @flags.splice @closes.length

    # Throws a syntax error with the current line number.
    carp: !-> carp it, @line

    string: (q, body) -> string q, body, @line

#### Helpers

function carp msg, lno then throw SyntaxError "#msg on line #{-~lno}"

# Checks whether or not the previous token is {index,`call`}able.
function able tokens, i ? tokens.length, call
    [tag] = token = tokens[i-1]
    tag in <[ ID ] ? ]> or if call
        then token.callable or tag in <[ ) )CALL BIOPBP ]> and token.1
        else tag in <[ } ) )CALL STRNUM LITERAL WORDS ]>

#### String Manipulators
# Constructs a string literal by (un)escaping quotes etc.
string = let do
    re = // ['"] |
        \\ (?: ([0-3]?[0-7]{2} | [1-7] | 0(?=[89]))
                 | x[\dA-Fa-f]{2} | u[\dA-Fa-f]{4} | ([xu])
                 | [\\0bfnrtv] | [^\n\S] | ([\w\W])
             )? //g
then (q, body, lno) ->
    body.=replace re, (it, oct, xu, rest) ->
        return '\\' + it if it in [q, '\\']
        # Convert octal to hex for strict mode.
        return \\\x + (0x100 + parse-int oct, 8).to-string 16 .slice 1 if oct
        carp 'malformed character escape sequence' lno if xu
        if not rest or q is rest then it else rest
    q + body + q

# Detects the minimum indent count for a heredoc, ignoring empty lines.
function heretabs doc
    dent = 0/0
    while TABS.exec doc then dent <?= that.0.length - 1
    dent
TABS = /\n(?!$)[^\n\S]*/mg

# Erases all external indentations up to specified length.
function detab str, len
    if len then str.replace detab[len]||=//\n[^\n\S]{1,#len}//g '\n' else str

# Erases all newlines and indentations.
unlines = (.replace /\n[^\n\S]*/g '')

# Converts newlines/backslashes to their quoted form.
enlines = (.replace /\n/g '\\n')
enslash = (.replace /\\/g \\\\)

# Quotes slashes unless already quoted.
reslash = (.replace /(\\.)|\//g -> &1 or \\\/)

# Transforms hyphenated-words to camelCase.
camelize = (.replace /-[a-z]/ig -> it.char-at 1 .to-upper-case!)

# ESifies a heregex.
deheregex = (.replace do
  /\s+(?:#.*)?|(\\[\s\S])/g
  (, bs || '') -> if \\n is bs.charAt 1 then \\\n else bs
)

# Deletes the first character if newline.
function lchomp then it.slice 1 + it.last-index-of '\n' 0

function decode val, lno
    return [+val] unless is-NaN val
    val = if val.length > 8 then 'ng' else do Function 'return ' + val
    val.length is 1 or carp 'bad string in range' lno
    [val.char-code-at!, true]

function uxxxx then \"\\u + ('000' + it.to-string 16).slice(-4) + '"'
character = if not JSON? then uxxxx else ->
    switch it | 0x2028 0x2029 => uxxxx it
    default JSON.stringify String.from-char-code it

#### Rewriters

# The LiveScript language has a good deal of optional, implicit, and/or shorthand
# syntax. This can greatly complicate a grammar and bloat the resulting parse
# table. Instead of making the parser handle it all, we take a series of passes
# over the token stream, convert shorthand into the unambiguous long form,
# add implicit indentation and parentheses, and generally clean things up.

# Pass before the other rewriting
!function first-pass tokens
    prev = ['NEWLINE' '\n' 0]
    i = 0
    while token = tokens[++i]
        [tag, val, line, column] = token
        switch tag
        case 'ASSIGN'
            if prev.1 in LS_KEYWORDS and tokens[i-2].0 isnt 'DOT'
                carp "cannot assign to reserved word '#{prev.1}'" line
        case 'DOT'
            switch
            case prev.0 is ']' and tokens[i-2].0 is '[' and tokens[i-3].0 is 'DOT'
                tokens.splice i-2, 3
                tokens[i-3].1 = '[]'
                i -= 3
            case prev.0 is '}' and tokens[i-2].0 is '{' and tokens[i-3].0 is 'DOT'
                tokens.splice i-2, 3
                tokens[i-3].1 = '{}'
                i -= 3
            case val is '.' and token.spaced and prev.spaced
                tokens[i] = ['COMPOSE' '<<' line, column]
            default
                next = tokens[i + 1]
                if prev.0 is '(' and next.0 is ')'
                    tokens[i].0 = 'BIOP'
                else if prev.0 is '('
                    tokens.splice i, 0,
                        * 'PARAM(' '('  line, column
                        * ')PARAM' ')'  line, column
                        * '->'     '~>' line, column
                        * 'ID'     'it' line, column
                else if next.0 is ')'
                    tokens.splice i + 1, 0,
                        ['['    '['    line, column]
                        ['ID' 'it' line, column]
                        [']'    ']'    line, column]
                    parens = 1
                    :LOOP for j from i + 1 to 0 by -1
                        switch tokens[j].0
                        | ')' => ++parens
                        | '(' =>
                            if --parens is 0
                                tokens.splice j + 1, 0,
                                    ['PARAM(' '('  line, column]
                                    ['ID'     'it' line, column]
                                    [')PARAM' ')'  line, column]
                                    ['->'     '~>' line, column]
                                break LOOP
        case 'CREMENT'
            break unless val is '++' and next = tokens[i + 1]
            ts = <[ ID LITERAL STRNUM ]>
            if prev.spaced and token.spaced
            or not (prev.spaced or token.spaced) and prev.0 in ts and next.0 in ts
                tokens[i].0 = 'CONCAT'
            if prev.0 is '(' and next.0 is ')'
            or prev.0 is '(' and token.spaced
            or next.0 is ')' and prev.spaced
                tokens[i].0 = 'BIOP'
        case 'ID'
            break unless val is 'async'
            next = tokens[i + 1]
            if next.0 in <[ FUNCTION GENERATOR ]> then token.0 = 'ASYNC'
        prev = token
        continue

# - Tag postfix conditionals.
# - Fill in empty blocks for bodyless `class`es.
!function rewrite-blockless tokens
    i = -1
    while token = tokens[++i]
        [tag] = token
        detect-end tokens, i + 1, ok, go if tag in <[ IF CLASS CATCH ]>
    function ok then it.0 in <[ NEWLINE INDENT ]>
    !function go it, i
        if tag is 'IF'
            token.0 = 'POST_IF' if it.0 is not 'INDENT'
                                or not it.1 and not it.then
                                or tokens[i-1].0 in BLOCK_USERS
        else unless it.0 is 'INDENT'
            tokens.splice i, 0 ['INDENT' 0 lno = tokens[i-1].2, cno = tokens[i-1].3] ['DEDENT' 0 lno, cno]

# that lack ending delimiters.
!function add-implicit-indentation tokens
    i = 0
    while token = tokens[++i]
        [tag] = token
        continue unless tag in
            <[ -> THEN ELSE DEFAULT TRY FINALLY DECL ]>
        switch next = tokens[i + 1].0
        case 'IF' then continue if tag is 'ELSE'
        case 'INDENT' 'THEN'
            tokens.splice i-- 1 if tag is 'THEN'
            continue
        indent = ['INDENT' 0 token.2, token.3]; dedent = ['DEDENT' 0]
        if tag is 'THEN'
        then (tokens[i] = indent).then = true
        else tokens.splice ++i, 0 indent
        switch
        case tag is 'DECL' then break
        # ->,
        case next in <[ DOT ? , PIPE BACKPIPE ]> then --i; fallthrough
        # -> 0,
        case next in <[ ID STRNUM LITERAL ]> and ',' is tokens[i + 2]?.0
            go 0 i += 2
            ++i
            continue
        # -> [0],
        case next in <[ ( [ { ]>
         and ',' is tokens[idx = 1 + index-of-pair tokens, i + 1]?.0
            go 0 idx
            ++i
            continue
        detect-end tokens, i + 1, ok, go
    function ok [t0]:token, i
        # Handle nesting intuitively:
        #     `try try a finally b` => `try (try a finally b)`
        t = tag
        tag := '' if tag is t0 or tag is 'THEN' and t0 is 'SWITCH'
        switch t0
        case 'NEWLINE'        then token.1 is not ';'
        case 'DOT' '?' ',' 'PIPE' 'BACKPIPE' then tokens[i-1].eol
        case 'ELSE'           then t is 'THEN'
        case 'CATCH'          then t is 'TRY'
        case 'FINALLY'        then t in <[ TRY CATCH THEN ]>
        case 'CASE' 'DEFAULT' then t in <[ CASE THEN ]>
    !function go [] i
        prev = tokens[i-1]
        tokens.splice if prev.0 is ',' then i-1 else i, 0, dedent <<< {prev.2, prev.3}

# Functions may be optionally called without parentheses for simple cases.
# Insert the missing parentheses here to aid the parser.
!function add-implicit-parentheses tokens
    i = 0
    brackets = []
    while token = tokens[++i]
        if token.1 is 'do' and tokens[i + 1].0 is 'INDENT'
            endi = index-of-pair tokens, i + 1
            if tokens[endi + 1].0 is 'NEWLINE' and tokens[endi + 2]?.0 is 'WHILE'
                token.0 = 'DO'
                tokens[endi + 2].done = true
                tokens.splice endi + 1 1
            else
                (token = tokens[1 + i]).0 = '('
                (tpair = tokens[endi]).0 = ')'
                token.doblock = true
                tokens.splice i, 1
        [tag] = token
        prev = tokens[i-1]
        tag is '[' and brackets.push prev.0 is 'DOT'
        if prev.0 is ']'
            if brackets.pop! then prev.index = true else continue
        continue unless prev.0 in <[ FUNCTION GENERATOR LET WHERE ]>
                     or prev.spaced and able tokens, i, true
        if token.doblock
            token.0 = 'CALL('
            tpair.0 = ')CALL'
            continue
        continue unless exp token
        if tag is 'CREMENT'
            continue if token.spaced or tokens[i + 1]?.0 not in CHAIN
        skip-block = seen-switch = false
        tokens.splice i++, 0 ['CALL(' '' token.2, token.3]
        detect-end tokens, i, ok, go
    # Does the token start an expression?
    function exp [tag]:token
        tag in ARG or not token.spaced and tag in <[ +- CLONE ]>
    function ok token, i
        tag = token.0
        return true if tag in <[ POST_IF PIPE BACKPIPE ]>
        unless skip-block
            return true if token.alias and token.1 in <[ && || xor ]>
                        or tag in <[ TO BY IMPLEMENTS ]>
        pre = tokens[i-1]
        switch tag
        case 'NEWLINE'
            return pre.0 is not ','
        case 'DOT' '?'
            return not skip-block and (pre.spaced or pre.0 is 'DEDENT')
        case 'SWITCH'
            seen-switch := true; fallthrough
        case 'IF' 'CLASS' 'FUNCTION' 'GENERATOR' 'LET' 'WITH' 'CATCH'
            skip-block := true
        case 'CASE'
            if seen-switch then skip-block := true else return true
        case 'INDENT'
            return skip-block := false if skip-block
            return pre.0 not in BLOCK_USERS
        case 'WHILE'
            return false if token.done
            fallthrough
        case 'FOR'
            skip-block := true
            return able tokens, i or pre.0 is 'CREMENT' or pre.0 is '...' and pre.spaced
        false
    !function go token, i then tokens.splice i, 0 [')CALL' '' tokens[i-1].2, tokens[i-1].3]

# Object literals may be written without braces for simple cases.
# Insert the missing braces here to aid the parser.
!function add-implicit-braces tokens
    stack = []
    i = 0
    while token = tokens[++i]
        unless ':' is tag = token.0
            switch
            case tag in CLOSERS then start = stack.pop!
            case tag in OPENERS
                tag = '{' if tag is 'INDENT' and tokens[i-1].0 is '{'
                stack.push [tag, i]
            continue
        paren = tokens[i-1].0 is ')'
        index = if paren then start.1 else i-1
        pre = tokens[index-1]
        continue unless pre.0 in <[ : ASSIGN IMPORT ]> or stack[*-1]?.0 is not '{'
        stack.push ['{']
        inline = not pre.doblock and pre.0 not in <[ NEWLINE INDENT ]>
        while tokens[index-2]?.0 is 'COMMENT' then index -= 2
        tokens.splice index, 0 ['{' '{' tokens[index].2, tokens[index].3]
        detect-end tokens, ++i + 1, ok, go
    function ok token, i
        switch tag = token.0
        | ','                     => break
        | 'NEWLINE'               => return true if inline
        | 'DEDENT'                => return true
        | 'POST_IF' 'FOR' 'WHILE' => return inline
        | otherwise               => return false
        t1 = tokens[i + 1]?.0
        t1 is not (if tag is ',' then 'NEWLINE' else 'COMMENT') and
        ':' is not tokens[if t1 is '(' then 1 + index-of-pair tokens, i + 1 else i + 2]?.0
    !function go token, i then tokens.splice i, 0 ['}' '' token.2, token.3]

# - Slip unary {pl,min}uses off signed numbers.
# - Expand ranges and words.
# - Insert `()` after each `function`/`let` facing a block.
# - Insert `, ` after each non-callable token facing an argument token.
!function expand-literals tokens
    i = 0
    var from-num
    while token = tokens[++i]
        switch token.0
        case 'STRNUM'
            if ~'-+'index-of sig = token.1.char-at 0
                token.1.=slice 1
                tokens.splice i++ 0 ['+-' sig, token.2, token.3]
            continue if token.callable
        case 'TO' 'TIL'
            unless tokens[i-1].0 is '['
            and ((tokens[i + 2].0 is ']'
                and (tokens[i + 1].1.char-at(0) in ['\'' '"']
                    or +tokens[i + 1].1 >= 0))
                or (tokens[i + 2].0 is 'BY'
                and tokens[i + 3]?.0 is 'STRNUM'
                and tokens[i + 4]?.0 is ']'))
                continue

            if tokens[i + 2].0 is 'BY'
                tokens[i + 2].0 = 'RANGE_BY'
            token.op = token.1
            from-num = 0
            fallthrough
        case 'RANGE'
            lno = token.2
            cno = token.3
            if from-num? or (tokens[i-1].0 is '['
            and tokens[i + 1].0 is 'STRNUM'
            and ((tokens[i + 2].0 is ']'
                and (tokens[i + 1].1.char-at(0) in ['\'' '"']
                    or +tokens[i + 1].1 >= 0))
                or (tokens[i + 2].0 is 'RANGE_BY'
                and tokens[i + 3]?.0 is 'STRNUM'
                and tokens[i + 4]?.0 is ']')))
                unless from-num?
                    [from-num, char] = decode token.1, lno
                [to-num, tochar] = decode tokens[i + 1].1, lno
                carp 'bad "to" in range' lno if not to-num? or char .^. tochar
                by-num = 1
                if byp = tokens[i + 2]?.0 is 'RANGE_BY'
                    carp 'bad "by" in range' tokens[i + 2].2 unless by-num = +tokens[i + 3]?.1
                else if from-num > to-num
                    by-num = -1
                ts = []
                enc = if char then character else String
                add = !->
                     if 0x10000 < ts.push ['STRNUM' enc n; lno, cno] [',' ',' lno, cno]
                         carp 'range limit exceeded' lno
                if token.op is 'to'
                    for n from from-num to to-num by by-num then add!
                else
                    for n from from-num til to-num by by-num then add!
                ts.pop! or carp 'empty range' lno
                tokens.splice i, 2 + 2 * byp, ...ts
                i += ts.length - 1
            else
                token.0 = 'STRNUM'
                if tokens[i + 2]?.0 is 'RANGE_BY'
                    tokens.splice i + 2, 1, ['BY' 'by' lno, cno]
                tokens.splice i + 1, 0, ['TO', token.op, lno, cno]
            from-num = null
        case 'WORDS'
            ts = [['[' '[' lno = token.2, cno = token.3]]
            for word in token.1.match /\S+/g or ''
                ts.push ['STRNUM' string '\'', word, lno; lno, cno] [',' ',' lno, cno]
            tokens.splice i, 1, ...ts, [']' ']' lno, cno]
            i += ts.length
        case 'INDENT'
            if tokens[i-1]
                if that.1 is 'new'
                    tokens.splice i++ 0 \
                        ['PARAM(' '' token.2, token.3] [')PARAM' '' token.2, token.3] ['->' '' token.2, token.3]
                else if that.0 in <[ FUNCTION GENERATOR LET ]>
                    tokens.splice i, 0 ['CALL(' '' token.2, token.3] [')CALL' '' token.2, token.3]
                    i += 2
            continue
        case 'LITERAL' '}' then break
        case ')' ')CALL' then continue if token.1
        case ']'                then continue if token.index
        case 'CREMENT'    then continue unless able tokens, i
        case 'BIOP'
            if not token.spaced and token.1 in <[ + - ]> and tokens[i + 1].0 isnt ')'
                tokens[i].0 = '+-'
            continue
        default continue
        if token.spaced and tokens[i + 1].0 in ARG
            tokens.splice ++i, 0 [',' ',' token.2, token.3]

# Seeks `tokens` from `i`ndex and `go` for a token of the same level
# that's `ok` or an unmatched closer.
!function detect-end tokens, i, ok, go
    levels = 0
    while token = tokens[i], ++i
        return go token, i if not levels and ok token, i
        [tag] = token
        return go token, i if 0 > levels += tag in OPENERS or -(tag in CLOSERS)

function index-of-pair tokens, i
    level = 1
    end = INVERSES[start = tokens[i].0]
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
    if else for while switch case default try catch finally
    function class extends implements new do delete typeof in instanceof
    let with var const import export debugger yield
]>

# The list of keywords that are reserved by JavaScript, but not used.
# We throw a syntax error for these to avoid runtime errors.
KEYWORDS_UNUSED =
    <[ enum interface package private protected public static ]>

JS_KEYWORDS = KEYWORDS_SHARED ++ KEYWORDS_UNUSED

LS_KEYWORDS = <[ xor match where ]>

##### Regexes
# Some of these are given `g` flag and made sure to match empty string
# so that they can lex from any index by receiving `.last-index` beforehand.
ID = //
    ( (?!\s)[a-z_$\xAA-\uFFDC](?:(?!\s)[\w$\xAA-\uFFDC]|-[a-z])* )
    ( [^\n\S]* : (?![:=]) )?    # Is this a property name?
|//ig
SYMBOL = //
  [-/^]= | [%+:*]{1,2}= | \|>=  # compound assign
| \.(?:[&\|\^] | << | >>>?)\.=? # bitwise and shifts
| \.{1,3}                       # dot / cascade / splat/placeholder/yada*3
| \^\^                          # clone
| \*?<(?:--?|~~?)!?             # backcall
| !?(?:--?|~~?)>>?\*?           # function, bound function
| ([-+&|:])\1                   # crement / logic / `prototype`
| %%                            # mod
| &                             # arguments
| \([^\n\S]*\)                  # call
| [!=]==?                       # strict equality, deep equals
| !?\~=                         # fuzzy equality
| @@?                           # this / constructor
| <\[(?:[\s\S]*?\]>)?           # words
| <<<<?                         # import
| <\|                           # backpipe
| [<>]== | <<= | >>=            # deep {less,greater}-than-(or-equal-to)
| << | >>                       # compose
| [<>]\??=?                     # {less,greater}-than-(or-equal-to) / min/max
| \|>                           # pipe
| \|                            # case
| =>                            # then
| \*\* | \^                     # pow
| `                             # backticks
| [^\s#]?
//g
SPACE = /[^\n\S]*(?:#.*)?/g
MULTIDENT = /(?:\s*#.*)*(?:\n([^\n\S]*))*/g
SIMPLESTR = /'[^\\']*(?:\\[\s\S][^\\']*)*'|/g
JSTOKEN = /``[^\\`]*(?:\\[\s\S][^\\`]*)*``|/g
BSTOKEN = // \\ (?:
  (\S[^\s,;)}\]]*)          # word literal
| (?: #{SPACE.source}\n? )* # whitespace (including line comments)
)//g

NUMBER = //
  0x[\dA-Fa-f][\dA-Fa-f_]*                                # hex
| (\d*) ~ ([\dA-Za-z]\w*)                                 # number with base
| ( (\d[\d_]*)(\.\d[\d_]*)? (?:e[+-]?\d[\d_]*)? ) [$\w]*
|//g
NUMBER_OMIT = /_+/g

REGEX = //
  /( [^ [ / \n \\ ]*                                # every other thing
     (?: (?: \\.                                    # anything escaped
           | \[ [^\]\n\\]* (?:\\.[^\]\n\\]*)* \]    # or character class
         ) [^ [ / \n \\ ]*                          # every other thing again
     )*
  )/ ([gimy]{1,4}|\$?)
|//g
HEREGEX_OMIT = /\s+(?:#.*)?/g

LASTDENT = /\n[^\n\S]*$/
INLINEDENT = /[^\n\S]*[^#\s]?/g

NONASCII = /[\x80-\uFFFF]/

##### Tokens

# Tokens that signal the start/end of a balanced pair.
OPENERS = <[ ( [ { CALL( PARAM( INDENT ]>
CLOSERS = <[ ) ] } )CALL )PARAM DEDENT ]>

# The inverse mappings of {OPEN,CLOS}ERS to look things up from either end.
INVERSES = {[o, CLOSERS[i]] for o, i in OPENERS} <<< {[c, OPENERS[i]] for c, i in CLOSERS}

# Tokens that can start a dot/call chain.
CHAIN = <[ ( { [ ID STRNUM LITERAL LET WITH WORDS ]>

# Tokens that can start an argument list.
ARG = CHAIN ++ <[ ... UNARY YIELD CREMENT PARAM( FUNCTION GENERATOR
                  IF SWITCH TRY CLASS RANGE LABEL DECL DO BIOPBP ]>

# Tokens that expect INDENT on the right.
BLOCK_USERS = <[ , : -> ELSE ASSIGN IMPORT UNARY DEFAULT TRY FINALLY
                 HURL DECL DO LET FUNCTION GENERATOR ... ]>
