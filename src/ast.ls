# Contains all of the node classes for the AST (abstract syntax tree).
# Most nodes are created as the result of actions in the [grammar](#grammar),
# but some are created by other nodes as a method of code generation.
# To convert the syntax tree into a string of JavaScript code,
# call `Block::compile-root`.

require! {
    'prelude-ls': {fold}
    './util': {name-from-path, strip-string}
    'source-map': {SourceNode, SourceMapGenerator}
}

sn = (node = {}, ...parts) ->
    try
        result = new SourceNode node.line, node.column, null, parts
        result.display-name = node.constructor.display-name
        result
    catch e
        console.dir parts
        throw e

sn-empty = (node) ->
    if node instanceof SourceNode
        for child in node.children
            unless sn-empty(child)
                return false
        true
    else
        !node
sn-safe = (code) ->
    if code instanceof SourceNode then code else code.to-string!
sn-remove-left = (node, count) ->
    for i til node.children.length
        child = node.children[i]
        if child instanceof SourceNode
            count = sn-remove-left child, count
        else
            child = child.to-string!
            node.children[i] = child.slice count
            count -= child.length
        if count <= 0
            return 0
    count

SourceNode::replace = (...args) ->
    new SourceNode @line, @column, @source, [..replace(...args) for @children], @name
SourceNode::set-file = (filename) ->
    @source = filename
    for child in @children when child instanceof SourceNode
        child.set-file filename
# Built-in version of this sucks, so replace it with our own
SourceNode::to-string-with-source-map = (...args) ->
    gen = new SourceMapGenerator ...args
    gen-line = 1
    gen-column = 0
    stack = []
    code = ''
    debug-output = ''
    debug-indent = ''
    debug-indent-str = '  '

    gen-for-node = (node) ->
        if node instanceof SourceNode
            debug-output += debug-indent + node.display-name
            # Block nodes should essentially "clear out" any effects
            # from parent nodes, so always add them to the stack
            valid = node.line and 'column' of node
            if valid
                stack.push node
                debug-output += '!'
            debug-output += " #{node.line}:#{node.column} #{gen-line}:#{gen-column}\n"

            debug-indent += debug-indent-str
            for child in node.children
                gen-for-node child
            debug-indent := debug-indent.slice 0, debug-indent.length - debug-indent-str.length

            if valid
                stack.pop!
        else
            debug-output += "#{debug-indent}#{ JSON.stringify node }\n"
            code += node
            cur = stack[*-1]
            if cur
                gen.add-mapping do
                    source: cur.source
                    original:
                        line: cur.line
                        column: cur.column
                    generated:
                        line: gen-line
                        column: gen-column
                    name: cur.name
            for i til node.length
                c = node.char-at i
                if c == "\n"
                    gen-column := 0
                    ++gen-line
                    if cur
                        gen.add-mapping do
                          source: cur.source
                          original:
                              line: cur.line
                              column: cur.column
                          generated:
                              line: gen-line
                              column: gen-column
                          name: cur.name
                else
                    ++gen-column

    gen-for-node(this)
    {code: code, map: gen, debug: debug-output}

/* # Use this to track down places where a SourceNode is being converted into a string and causing the location to be lost
tmp-to-string = SourceNode::to-string
SourceNode::to-string = (...args) ->
    console.log("toString(): ", new Error().stack)
    tmp-to-string.apply this, args
*/

### Node
# The abstract base class for all nodes in the syntax tree.
# Each subclass implements the `compile-node` method, which performs the
# code generation for that node. To compile a node to JavaScript,
# call `compile` on it, which wraps `compile-node` in some generic extra smarts.
# An options hash is passed and cloned throughout, containing information about
# the environment from higher in the tree (such as if a returned value is
# being requested by the surrounding function), information about the current
# scope, and indentation level.
(Node = -> ...):: =
    compile: (options, level) ->
        o = {} <<< options
        o.level? = level
        # If a statement appears within an expression, wrap it in a closure.
        return @compile-closure o if o.level and @is-statement!
        code = (this <<< tab: o.indent).compile-node o
        if @temps then for tmp in that then o.scope.free tmp
        code

    compile-closure: (o) ->
        # A statement that _jumps_ out of current context (like `return`) can't
        # be an expression via closure-wrapping, as its meaning will change.
        that.carp 'inconvertible statement' if @get-jump!
        fun = Fun [] Block this
        call = Call!
        fun.async = true if o.in-async
        fun.generator = true if o.in-generator
        var hasArgs, hasThis
        @traverse-children !->
            switch it.value
            | \this      => hasThis := true
            | \arguments => hasArgs := it.value = \args$
        if hasThis
            call.args.push Literal \this
            call.method = \.call
        if hasArgs
            call.args.push Literal \arguments
            fun.params.push Var \args$
        # Flag the function as `wrapper` so that it shares a scope
        # with its parent to preserve the expected lexical scope.
        out = Parens(Chain fun<<<{+wrapper, @void} [call]; true)
        if o.in-generator
            out = new Yield 'yieldfrom', out
        else if o.in-async
            out = new Yield 'await', out
        out.compile o

    # Compiles a child node as a block statement.
    compile-block: (o, node) ->
        unless sn-empty(code = node?compile o, LEVEL_TOP)
            sn(null, "{\n", code, "\n#{@tab}}")
        else
            sn(node, '{}')

    # Spreads a transformation over a list and compiles it.
    compile-spread-over: (o, list, transform) ->
        ob = list instanceof Obj
        them = list.items
        for node, i in them
            node.=it if sp = node instanceof Splat
            node.=val if ob and not sp
            node = transform node
            node = lat = Splat node if sp
            if ob and not sp then them[i].val = node else them[i] = node
        if not lat and (@void or not o.level)
            list = Block(if ob then [..val for them] else them) <<< {@front, +void}
        list.compile o, LEVEL_PAREN

    # If the code generation wishes to use the result of a complex expression
    # in multiple places, ensure that the expression is only ever evaluated once,
    # by assigning it to a temporary variable.
    cache: (o, once, level, temp-name) ->
        unless @is-complex!
            return [if level? then @compile o, level else this] * 2
        if ref = @get-ref! then sub = this
        else
            sub = Assign ref = Var(o.scope.temporary temp-name), this
            # If flagged as `once`, the tempvar will be auto-freed.
            if once then ref <<< {+temp} else tempvars = [ref.value]
        # Pass a `level` to precompile.
        if level?
            sub.=compile o, level
            o.scope.free ref.value if once and tempvars
            return [sub, ref.value]
        [sub, ref, tempvars]

    # Compiles to a variable/source pair suitable for looping.
    compile-loop-reference: (o, name, ret, safe-access) ->
        if this instanceof Var   and o.scope.check @value
        or this instanceof Unary and @op in <[ + - ]> and -1/0 < +@it.value < 1/0
        or this instanceof Literal and not @is-complex!
            code = @compile o, LEVEL_PAREN
            code = "(#code)" if safe-access and this not instanceof Var
            return [code] * 2
        asn = Assign Var(tmp = o.scope.temporary name), this
        ret or asn.void = true
        [tmp; asn.compile o, if ret then LEVEL_CALL else LEVEL_PAREN]

    # Passes each child to a function, returning its return value if exists.
    each-child: (fn) ->
        for name in @children when child = @[name]
            if \length of child
                for node, i in child then return that if fn(node, name, i)
            else
                return that if fn(child, name)?

    # Performs `each-child` on every descendant.
    # Overridden by __Fun__ not to cross scope by default.
    traverse-children: (fn, xscope) ->
        @each-child (node, name, index) ~>
            fn(node, this, name, index) ? node.traverse-children fn, xscope

    # Walks every descendent to expand notation like property shorthand and
    # slices. `assign` is true if this node is in a negative position, like
    # the right-hand side of an assignment. Overrides of this function can
    # return a value to be replaced in the tree.
    rewrite-shorthand: (o, assign) !->
        for name in @children when child = @[name]
            if \length of child
                for node, i in child
                    if node.rewrite-shorthand o, assign then child[i] = that
            else if child.rewrite-shorthand o, assign then @[name] = that

    # Performs anaphoric conversion if a `that` is found within `@aTargets`.
    anaphorize: ->
        @children = @aTargets
        if @each-child hasThat
            # Set a flag and deal with it in the Existence node (it's too
            # tricky here).
            if (base = this)[name = @a-source] instanceof Existence
                base[name].do-anaphorize = true
            # 'that = x' here is fine.
            else if base[name]value is not \that
                base[name] = Assign Var(\that), base[name]
        function hasThat
            it.value is \that or if it.a-source
            then hasThat that if it[that]
            else it.each-child hasThat
        delete @children
        @[@a-source] <<< {+cond}

    # Throws a syntax error, appending `@line` number to the message.
    carp: (msg, type = SyntaxError) !-> throw type "#msg #{@line-msg!}"

    warn: (msg) !-> console?warn "WARNING: #msg #{@line-msg!}"

    line-msg: -> "on line #{ @line or @traverse-children -> it.line }"

    # Defines delegators.
    delegate: !(names, fn) ->
        for let name in names
            @[name] = -> fn.call this, name, it

    # Default implementations of the common node properties and methods. Nodes
    # will override these with custom logic, if needed.
    children: []

    terminator: \;

    is-complex: YES

    is-statement  : NO
    is-assignable : NO
    is-callable   : NO
    is-empty      : NO
    is-array      : NO
    is-string     : NO
    is-regex      : NO

    is-matcher: -> @is-string! or @is-regex!

    # Do I assign any variables? (Returns a non-empty array if so.)
    assigns: NO

    # Picks up name(s) from LHS.
    rip-name: VOID

    # If this node will create a reference variable storing its entire value,
    # return it.
    get-ref: VOID

    unfold-soak   : VOID
    unfold-assign : VOID
    unparen       : THIS
    unwrap        : THIS
    maybe-key     : VOID
    var-name      : String
    get-accessors : VOID
    get-call      : VOID
    get-default   : VOID
    # Digs up a statement that jumps out of this node.
    get-jump      : VOID
    is-next-unreachable : NO

    # If this node can be used as a property shorthand, finds the implied key.
    # If the key is dynamic, this node may be mutated so that it refers to a
    # temporary reference that this function returns (whether a reference or
    # the declaration of the reference is returned depends on the value of the
    # assign parameter). Most of the interesting logic here is to be found in
    # Parens::extract-key-ref, which handles the dynamic case.
    extract-key-ref: (o, assign) -> @maybe-key! or
        @carp if assign then "invalid assign" else "invalid property shorthand"

    invert: -> Unary \! this, true

    invert-check: ->
        if it.inverted then @invert! else this

    add-else: (@else) -> this

    # Constructs a node that returns the current node's result.
    # If obj is true, interprets this node as a key-value pair to be
    # stored on ref. Otherwise, pushes this node into ref.
    make-return: (ref, obj) ->
        if obj then
            items = if this instanceof Arr
                if not @items.0? or not @items.1?
                    @carp 'must specify both key and value for object comprehension'
                @items
            else
                kv = \keyValue$
                for v, i in [Assign(Var(kv), this), Var(kv)]
                    Chain v .add Index Literal i
            Assign (Chain Var ref).add(Index items.0, \., true), items.1
        else if ref
            Call.make JS(ref + \.push), [this]
        else
            Return this

    # Extra info for `toString`.
    show: String

    # String representation of the node for inspecting the parse tree.
    # This is what `lsc --ast` prints out.
    to-string: (idt or '') ->
        tree  = \\n + idt + @constructor.display-name
        tree += ' ' + that if @show!
        @each-child !-> tree += it.toString idt + TAB
        tree

    # JSON serialization
    stringify: (space) -> JSON.stringify this, null space
    to-JSON: -> {type: @constructor.display-name, ...this}

# JSON deserialization
exports.parse    = (json) -> exports.from-JSON JSON.parse json
exports.from-JSON = function
    return it unless it and typeof it is \object
    if it.type
        node = ^^exports[that].prototype
        for key, val of it then node[key] = from-JSON val
        return node
    if it.length? then [from-JSON v for v in it] else it

#### Mixins

Negatable =
    show: -> @negated and \!
    invert: -> !=@negated; this

#### Block
# A list of expressions that forms the body of an indented block of code.
class exports.Block extends Node
    (body || []) ~>
        if \length of body
            @lines = body
        else
            @lines = []
            @add body

    children: [\lines]

    to-JSON: -> delete @back; super!

    add: ->
        it.=unparen!
        switch
        | @back     => that.add it
        | it.lines  => @lines.push ...that
        | otherwise =>
            @lines.push it
            @back = that if delete it.back
        this

    prepend: ->
        @lines.splice @neck!, 0, ...arguments
        this

    pipe: (target, type) ->
        args = if type is \|> then @lines.pop! else target
        args = [args] if typeof! args isnt \Array
        switch type
        | \|>  => @lines.push Call.make(target,      args, pipe: true)
        | \<|  => @lines.push Call.make(@lines.pop!, args)
        this

    unwrap: -> if @lines.length is 1 then @lines.0 else this

    # Removes trailing comment nodes.
    chomp: ->
        {lines} = this
        i = lines.length
        while lines[--i] then break unless that.comment
        lines.length = i + 1
        this

    # Finds the right position for inserting variable declarations.
    neck: ->
        pos = 0
        for x in @lines
            break unless x.comment or x instanceof Literal
            ++pos
        pos

    is-complex: -> @lines.length > 1 or @lines.0?is-complex!

    ::delegate <[ isCallable isArray isString isRegex ]> -> @lines[*-1]?[it]!

    get-jump: -> for node in @lines then return that if node.get-jump it

    is-next-unreachable: ->
        for node in @lines then return true if node.is-next-unreachable!
        false

    # **Block** does not return its entire body, rather it
    # ensures that the final line is returned.
    make-return: ->
        @chomp!
        if @lines[*-1]?=make-return ...&
            --@lines.length if that instanceof Return and not that.it
        this

    compile: (o, level ? o.level) ->
        return @compile-expressions o, level if level
        o.block = this
        tab = o.indent
        codes = []
        for node in @lines
            node <<< {+void} unless node.eval-result
            node = that if node.rewrite-shorthand o
            continue if sn-empty(code = (node <<< {+front})compile o, level)
            codes.push tab
            codes.push code
            node.is-statement! or codes.push node.terminator
            codes.push \\n
        codes.pop!
        sn(null, ...codes)

    # **Block** is the only node that can serve as the root.
    compile-root: (options) ->
        o = {
            level: LEVEL_TOP
            scope: @scope = Scope.root = new Scope
            ...options
        }
        if delete o.saveScope
            # use savedScope as your scope
            @scope = Scope.root = o.scope = that.savedScope or= o.scope
        delete o.filename
        o.indent = if bare = delete o.bare then '' else TAB
        if /^\s*(?:#!|javascript:)/test @lines.0?code
            prefix = @lines.shift!code + \\n
        if @lines.0?code?0 is '/'
            comment = @lines.shift!code + \\n
        if delete o.eval and @chomp!lines.length
            if bare then @lines.push Parens(@lines.pop!) <<< {+eval-result} else @make-return!
        code = [(@compile-with-declarations o)]
        # Wrap everything in a safety closure unless requested not to.
        bare or code = ["(function(){\n", ...code, "\n}).call(this);\n"]
        sn null, prefix || [], options.header || [], comment || [], code

    # Compile to a function body.
    compile-with-declarations: (o) ->
        o.level = LEVEL_TOP
        pre = []
        if i = @neck!
            rest   = @lines.splice i, 9e9
            pre    = [(@compile o), "\n"]
            @lines = rest
        return sn(this, pre.0 || []) if sn-empty(post = @compile o)
        sn(null, ...pre, if @scope then that.emit post, o.indent else post)

    # Compile to a comma-separated list of expressions.
    compile-expressions: (o, level) ->
        {lines} = @chomp!
        i = -1
        while lines[++i] then lines.splice i-- 1 if that.comment
        lines.push Literal \void unless lines.length
        lines.0 <<< {@front}
        lines[*-1] <<< {@void}
        unless lines.1
            line = lines.0
            line = that if line.rewrite-shorthand o
            return line.compile o, level
        code = []
        last = lines.pop!
        for node in lines
            node = that if node.rewrite-shorthand o
            code.push (node <<< {+void})compile(o, LEVEL_PAREN), ', '
        last = that if last.rewrite-shorthand o
        code.push (last.compile o, LEVEL_PAREN)
        if level < LEVEL_LIST then sn(null, ...code) else sn(null, "(", ...code, ")")

    # Blocks rewrite shorthand line-by-line as they're compiled to conserve
    # shorthand temp variables.
    rewrite-shorthand: VOID

#### Atom
# An abstract node for simple values.
class Atom extends Node
    show: -> @value
    is-complex: NO

#### Literal
# `this`, `debugger`, regexes and primitives.
class exports.Literal extends Atom
    (@value) ~>
        return JS "#value" true if value.js
        return new Super        if value is \super

    is-empty    : -> @value in <[ void null ]>
    is-callable : -> @value in <[ this eval .. ]>
    is-string   : -> 0 <= '\'"'indexOf "#{@value}"char-at!
    is-regex    : -> "#{@value}"char-at! is \/
    is-complex  : -> @is-regex! or @value is \debugger
    is-what     : ->
        | @is-empty!    => \empty
        | @is-callable! => \callable
        | @is-string!   => \string
        | @is-regex!    => \regex
        | @is-complex!  => \complex
        | otherwise     => void

    var-name: -> if /^\w+$/test @value then \$ + @value else ''

    make-return: ->
        if not it and @value is 'debugger'
            this
        else
            super ...

    maybe-key: -> if ID.test @value then Key @value, @value not in <[arguments eval]> else this

    compile: (o, level ? o.level) ->
        switch val = "#{@value}"
        | \this      => return sn(this, o.scope.fun?bound or val)
        | \void      =>
            return sn(this, '') unless level
            val += ' 8'
            fallthrough
        | \null      => @carp 'invalid use of ' + @value if level is LEVEL_CALL
        | \on \yes   => val = 'true'
        | \off \no   => val = 'false'
        | \*         => @carp 'stray star'
        | \..        =>
            @carp 'stray reference' unless val = o.ref
            @cascadee or val.erred = true
        | \debugger  =>
            return sn(this, "(function(){ debugger; }())") if level
        sn(this, sn-safe(val))

#### Var
# Variables.
class exports.Var extends Atom
    (@value) ~>

    ::is-assignable = ::is-callable = YES

    assigns: -> [@value]

    maybe-key: -> Key(@value) <<< {@line}

    var-name: ::show

    compile: (o) -> sn(this, if @temp then o.scope.free @value else @value)

#### Key
# A property name in the form of `{key: _}` or `_.key`.
class exports.Key extends Node
    (name, @reserved or name.reserved) ~> @name = '' + name

    is-complex: NO

    assigns: -> [@name]

    maybe-key: THIS

    var-name: ->
        {name} = this
        if @reserved or name in <[ arguments eval ]> then "$#name" else name

    show: -> if @reserved then "'#{@name}'" else @name
    compile: -> sn(this, @show())

#### Index
# Dots and brackets to access an object's property.
class exports.Index extends Node
    (key, symbol or \., init) ~>
        if init and key instanceof Arr
            switch key.items.length
            | 1 => key = Parens k unless (k = key.items.0) instanceof Splat
        switch symbol
        | '[]' => @vivify = Arr
        | '{}' => @vivify = Obj
        | _    =>
            @assign = symbol.slice 1 if \= is symbol.slice -1
        this <<< {key, symbol}

    children: [\key]

    show: -> [\? if @soak] + @symbol

    is-complex: -> @key.is-complex! or @vivify?

    var-name: -> @key instanceof [Key, Literal] and @key.var-name!

    compile: (o) ->
        code = @key.compile o, LEVEL_PAREN
        if @key instanceof Key and \' is not code.to-string!.char-at 0
        then sn(this, ".", code) else sn(this, "[",code,"]")

#### Slice
# slices away at the target
class exports.Slice extends Node
    ({@type, @target, @from, @to}) ~>
        @from ?= Literal 0
        @to = Binary \+ @to, Literal \1 if @to and @type is \to

    children: [\target \from \to]

    show: -> @type

    compile-node: (o) ->
        @to = Binary \|| @to, Literal \9e9 if @to and @type is \to
        args = [@target, @from]
        args.push @to if @to
        Chain Var (util \slice) .add Index (Key \call), \. true .add Call args .compile o

#### Chain
# Acts as a container for property-access/function-call chains, by holding
# __Index__ or __Call__ instances as `@tails`.
class exports.Chain extends Node
    (head, tails) ~>
        return head if not tails and head instanceof Chain
        this <<< {head, tails or []}

    children: <[ head tails ]>

    add: ->
        if @tails.length
            last = @tails[*-1]
            # optimize `x |> f 1, _` to `f(1, x)`
            if last instanceof Call
            and last.partialized?length is 1
            and it.args.length is 1
                index = last.partialized.0.head.value # Chain Literal i
                delete last.partialized
                # extract the single arg from pipe call
                last.args[index] = it.args.0
                return this
        if @head instanceof Existence
            {@head, @tails} = Chain @head.it
            it.soak = true
        @tails.push it
        bi = if @head instanceof Parens and @head.it instanceof Binary
         and not @head.it.partial then @head.it
         else if @head instanceof Binary and not @head.partial then @head
        if @head instanceof Super
            if not @head.called and it instanceof Call and not it.method
                it.method = \.call
                it.args.unshift Literal \this
                @head.called = true
            else if not @tails.1 and it.key?name is \prototype
                @head.sproto = true
        else if it instanceof Call and @tails.length is 1
        and bi and bi.op in logics = <[ && || xor ]>
            call = it
            f = (x, key) ->
                y = x[key]
                if y instanceof Binary and y.op in logics
                then f y, \first; f y, \second
                else x[key] = Chain y .auto-compare call.args
            f bi, \first
            f bi, \second
            return bi
        this

    auto-compare: (target) ->
        test = @head unless @tails.length
        switch
        | test instanceof Literal
            Binary \===  test, target.0
        | test instanceof Unary and test.it instanceof Literal
            Binary \===  test, target.0
        | test instanceof Arr, test instanceof Obj
            Binary \==== test, target.0
        | test instanceof Var and test.value is \_
            Literal \true
        | otherwise
            this .add Call target or []

    flip-it: -> @flip = true; this

    # __Chain__ can be unwrapped as its inner node, if there are no subnodes.
    unwrap: -> if @tails.length then this else @head

    ::delegate <[ getJump assigns isStatement isString ]>
           , (it, arg) -> not @tails.length and @head[it] arg

    is-complex  : -> @tails.length or @head.is-complex!
    is-callable : ->
        if @tails[*-1] then not that.key?items else @head.is-callable!
    is-array    : ->
        if @tails[*-1] then that.key instanceof Arr else @head.is-array!
    is-regex    : ->
        @head.value is \RegExp and not @tails.1 and @tails.0 instanceof Call

    is-assignable: ->
        return @head.is-assignable! unless tail = @tails[*-1]
        return false if tail not instanceof Index
                     or tail.key instanceof List
                     or tail.symbol is \.~
        for tail in @tails when tail.assign then return false
        true

    # `@$` `o.0`
    is-simple-access: ->
        @tails.length is 1 and not @head.is-complex! and not @tails.0.is-complex!

    make-return: -> if @tails.length then super ... else @head.make-return ...&

    get-call: -> (tail = @tails[*-1]) instanceof Call and tail

    var-name: -> @tails[*-1]?var-name!

    # A reference has base part (`this` value) and name part.
    # We cache them separately for compiling complex expressions, so that e.g.
    #
    #     a()[b()] ||= c
    #
    # compiles to
    #
    #     (ref$ = a())[key$ = b()] || (ref$[key$] = c);
    #
    cache-reference: (o) ->
        name = @tails[*-1]
        # `a.b()`
        return @unwrap!cache o, true unless @is-assignable!
        # `a` `a.b`
        if @tails.length < 2 and not @head.is-complex! and not name?is-complex!
            return [this] * 2
        base = Chain @head, @tails.slice 0 -1
        # `a().b`
        if base.is-complex!
            [base, bref] = base.unwrap!cache o, true
            base = Chain base
        # `a{}`
        return [base, bref] unless name
        nref = name
        # `a{}b`
        if name.symbol isnt \.
            nref = name
            name = Index name.key, \.
        # `a[b()]`
        if name.is-complex!
            [key, nref.key] = name.key.unwrap!cache o, true void \key
            name = Index key
        [base.add name; Chain bref || base.head, [nref]]

    compile-node: (o) ->
        if @flip
            util \flip
            util \curry
        {head, tails} = this
        head <<< {@front, @newed}
        return head.compile o unless tails.length
        return that.compile o if @unfold-assign o
        for t in tails when t.partialized then has-partial = true; break
        if has-partial
            util \slice
            pre  = []
            rest = []
            for t in tails
                broken = broken or t.partialized?
                if   broken
                then rest.push t
                else pre .push t
            [partial, ...post] = rest if rest?
            @tails = pre
            context = if pre.length then Chain head, pre[til -1] else Literal \this
            return (Chain (Chain Var util \partialize
                .add Index Key \apply
                .add Call [context, Arr [this; Arr partial.args; Arr partial.partialized]]), post).compile o
        @carp 'invalid callee' if tails.0 instanceof Call and not head.is-callable!
        @expand-vivify!
        @expand-bind o
        @expand-splat o
        @expand-star o
        if @splatted-new-args
            idt = o.indent + TAB
            func = Chain @head, tails.slice 0 -1
            return sn(null, """
                (function(func, args, ctor) {
                #{idt}ctor.prototype = func.prototype;
                #{idt}var child = new ctor, result = func.apply(child, args), t;
                #{idt}return (t = typeof result)  == "object" || t == "function" ? result || child : child;
                #{TAB}})(""", (func.compile o), ", ", @splatted-new-args, """, function(){})
            """)
        return @head.compile o unless @tails.length
        base = [(@head.compile o, LEVEL_CALL)]
        news = []
        rest = []
        for t in @tails
            news.push 'new ' if t.new
            rest.push t.compile o
        base.push ' ' if \. is rest.join("").char-at 0 and SIMPLENUM.test base.0.to-string!
        sn(null, ...news, ...base, ...rest)

    # Unfolds a soak into an __If__: `a?.b` => `a.b if a?`
    unfold-soak: (o) ->
        if @head.unfold-soak o
            that.then.tails.push ...@tails
            return that
        for node, i in @tails when delete node.soak
            bust = Chain @head, @tails.splice 0 i
            node.carp 'invalid accessign' if node.assign and not bust.is-assignable!
            if i and (node.assign or node instanceof Call)
                [test, bust] = bust.cache-reference o
                if bust instanceof Chain
                    @tails.unshift ...bust.tails
                    bust.=head
                @head = bust
            else
                [test, @head] = bust.unwrap!cache o
            test = if node instanceof Call
                JS "typeof #{ test.compile o, LEVEL_OP } == 'function'"
            else
                Existence test
            return If(test, this) <<< {+soak, @cond, @void}

    unfold-assign: (o) ->
        if @head.unfold-assign o
            that.right.tails.push ...@tails
            return that
        for index, i in @tails then if op = index.assign
            index.assign = ''
            left = Chain @head, @tails.splice 0 i .unwrap!
            if left instanceof Arr
                # `[a, b].=reverse()` => `[a, b] = [a, b].reverse()`
                lefts = left.items
                {items: rites} = @head = Arr!
                for node, i in lefts
                    [rites[i], lefts[i]] = Chain node .cache-reference o
            else
                [left, @head] = Chain left .cache-reference o
            op = \:= if op is \=
            return Assign(left, this, op) <<< {+access}

    expand-splat: !(o) ->
        {tails} = this
        i = -1
        while call = tails[++i]
            continue unless args = call.args
            ctx = call.method is \.call and (args.=concat!)shift!
            continue unless !sn-empty(args = Splat.compile-array o, args, true)
            if call.new
                @splatted-new-args = args
            else
                if not ctx and tails[i-1] instanceof Index
                    [@head, ctx] = Chain(@head, tails.splice 0 i-1)cache o, true
                    i = 0
                call <<< method: \.apply, args: [ctx or Literal \null; JS args]

    expand-vivify: !->
        {tails} = this
        i = 0
        while i < tails.length when delete tails[i++]vivify
            @head = Assign Chain(@head, tails.splice 0, i), that!, \= \||
            i = 0

    expand-bind: !(o) ->
        {tails} = this
        i = -1
        while tails[++i]
            continue unless that.symbol is \.~
            that.symbol = ''
            obj   = Chain(@head, tails.splice 0 i)unwrap!
            {key} = tails.shift!
            call  = Call.make Util(\bind), [obj, key <<< {+reserved}]
            @head = if @newed then Parens call, true else call
            i = -1

    expand-star: !(o) ->
        {tails} = this
        i = -1
        while tails[++i]
            continue if that.args or that.stars or that.key instanceof Key
            stars = that.stars = []
            that.each-child seek
            continue unless stars.length
            [sub, ref, temps] = Chain(@head, tails.splice 0 i)unwrap!cache o
            value = Chain(ref, [Index Key \length])compile o
            for star in stars then star <<< {value, is-assignable: YES}
            @head = JS sub.compile(o, LEVEL_CALL) + tails.shift!compile o
            o.scope.free temps.0 if temps
            i = -1
        !function seek
            if it.value is \*               then stars.push it
            else unless it instanceof Index then it.each-child seek

    rewrite-shorthand: (o, assign) ->
        return that.rewrite-shorthand o, assign or that if @unfold-soak o
        @head = that if @head.rewrite-shorthand o
        last-i = @tails.length - 1
        for item, i in @tails
            @tails[i] = that if item.rewrite-shorthand(o, assign && i is last-i)
        @expand-slice o, assign
        @unwrap!

    # `a[x, y] = b{z} = c` => `[a[x], a[y]] = {z: b.z} = c`
    expand-slice: (o, assign) ->
        {tails} = this
        i = -1
        while tail = tails[++i] when tail.key?items
            tail.carp 'calling a slice' if tails[i+1] instanceof Call
            x = tails.splice 0 i+1
            x = x.pop!key.to-slice o, Chain(@head, x)unwrap!, tail.symbol, assign
            @head = x <<< {@front}
            i = -1
        this

    extract-key-ref: (o, assign) ->
        @tails[*-1]?key?extract-key-ref o, assign or super ...

#### Call
# `x(y)`
class exports.Call extends Node
    (args || []) ~>
        if args.length is 1 and (splat = args.0) instanceof Splat
            if splat.filler
                @method = \.call
                args <<< [Literal \this; Splat Literal \arguments]
            else if splat.it instanceof Arr
                args = splat.it.items
        else
            for a, i in args when a.value is \_
                args[i] = Chain Literal \void
                args[i].placeholder = true
                (@partialized ?= []).push Chain Literal i
        this <<< {args}

    children: [\args]

    show: -> [@new] + [@method] + [\? if @soak]

    compile: (o) ->
        code  =  [sn(this, (@method or ''), \() + (if @pipe then "\n#{o.indent}" else '')]
        for a, i in @args
            code.push (if i then ', ' else ''), a.compile o, LEVEL_LIST
        code.push sn(this, \))
        sn(null, ...code)
    @make = (callee, args, opts) ->
        call = Call args
        call <<< opts if opts
        Chain(callee)add call

    @block = (fun, args, method) ->
        Parens(Chain fun, [Call(args) <<< {method}]; true) <<< {+calling}

    @back = (params, node, bound, curried, hushed, generator) ->
        fun = Fun params,, bound, curried, hushed, generator
        if node instanceof Label
            fun <<< {name: node.label, +labeled}
            node.=it
        node.=it if not fun.hushed and fun.hushed = node.op is \!
        node.get-call!?partialized = null
        {args} = node.get-call! or (node = Chain node .add Call!)get-call!
        index = 0
        for a in args
            break if a.placeholder
            ++index
        node <<< back: (args[index] = fun)body

    @let = (args, body) ->
        has-yield = false
        has-await = false
        body.traverse-children (child) ->
            if child instanceof Yield
                switch child.op
                | \yield \yieldfrom => has-yield := true
                | \await            => has-await := true
            return true if has-yield and has-await
        params = for a, i in args
            if a.op is \= and not a.logic and a.right
                args[i] = that
                continue if i is 0 and gotThis = a.left.value is \this
                a.left
            else Var a.var-name! || a.carp 'invalid "let" argument'
        gotThis or args.unshift Literal \this
        body = @block Fun(params, body, null, null, null, has-yield, has-await), args, \.call
        if has-yield || has-await
            Block Yield if has-yield then \yieldfrom else \await, body
        else body

#### List
# An abstract node for a list of comma-separated items.
class List extends Node
    children: [\items]

    show  : -> @name
    named : (@name) -> this

    is-empty: -> not @items.length
    assigns: -> with [x for node in @items when node.assigns! for x in that]
        ..push that if @name

    @compile = (o, items, deep-eq) ->
        switch items.length
        | 0 => return ''
        | 1 => return items.0.compile o, LEVEL_LIST
        {indent, level} = o
        o <<< indent: indent + TAB, level: LEVEL_LIST
        code  = [items[i = 0]compile o]
        while items[++i]
            code.push ', '
            target = that
            if deep-eq
                if target instanceof Var and target.value is \_
                    target = Obj [Prop (Key \__placeholder__), Literal true]
                else if target instanceof [Obj, Arr]
                    target.deep-eq = true
            code.push target.compile o
        code  = ["\n#{o.indent}", ...code, "\n#indent"] if ~code.join("").indexOf \\n
        o <<< {indent, level}
        sn(this, ...code)

    # `base[x, ...y]` => `[base[x], ...base[y]]`
    # `base{x: y}` => `{x: base.y}`
    to-slice: (o, base, symbol, assign) ->
        {items} = this
        is-obj = this instanceof Obj
        if items.length > 1
        then [base, ref, temps] = base.cache o
        else ref = base
        for item, i in items when not item.comment
            if is-obj
                {val} = item
                unless val instanceof List
                    val.=maybe-key! or @carp "value in object slice is not a key"
            else
                val = item
                val.=it if splat = val instanceof Splat
                continue if val.is-empty!
            chain =
                if val instanceof List
                then val.to-slice o, base, symbol, assign
                else Chain base, [Index val, symbol]
            if is-obj
            then item.val = chain
            else items[i] = if splat then Splat chain else chain
            base = ref
        chain or @carp 'empty slice'
        @.[]temps.push temps.0 if temps
        this

    extract-key-ref: -> if @name? then Key that else super ...

#### Obj
# `{x: y}`
class exports.Obj extends List
    (@items or []) ~>

    as-obj: THIS

    compile-node: (o) ->
        @carp "unexpected label" if @name?
        {items} = this
        return sn(this, if @front then '({})' else '{}') unless items.length
        code = []
        idt = \\n + o.indent += TAB
        dic = {}
        for node, i in items
            if node.comment
                code.push idt, node.compile o
                continue
            if node.key instanceof [Splat, Parens]
                rest = items.slice i
                break
            if node.logic
                # `{@a or b}` => `{a: @a or b}`
                node.val = node.logic <<< first: node.val
            if @deep-eq
                if node.val instanceof Var and node.val.value is \_
                    node.val = Obj [Prop (Key \__placeholder__), Literal true]
                else if node.val instanceof [Obj, Arr]
                    node.val.deep-eq = true
            if multi then code.push \, else multi = true
            code.push idt
            {key, val} = node
            if node.accessor
                code.push (node.compile-accessor o, key.=compile o)
            else
                val.rip-name key
                code.push (key.=compile o), ": ", (val.compile o, LEVEL_LIST)
            # Canonicalize the key, e.g.: `0.0` => `0`
            ID.test key or key = do Function "return #key"
            node.carp "duplicate property \"#key\"" unless dic"#key." .^.= 1
        if code.join("") then code.push \\n + @tab
        code = sn(null, sn(this, "{"), ...code, sn(this, "}"))
        rest and code = Import(JS code; Obj rest)compile o <<< indent: @tab
        if @front and \{ is code.to-string!.char-at! then sn(null, "(", code, ")") else code

#### Prop
# `x: y`
class exports.Prop extends Node
    (@key, @val) ~>
        @key = Splat! if key?value is \...
        if val.get-accessors!
            @val = that
            for fun in that
                fun.x = if fun.hushed = fun.params.length then \s else \g
            this <<< {\accessor}

    children: <[ key val logic ]>

    show: -> @accessor

    assigns: -> @val.assigns?!

    compile-accessor: (o, key) ->
        funs = @val
        if funs.1 and funs.0.params.length + funs.1.params.length is not 1
            funs.0.carp 'invalid accessor parameter'

        code = []
        for fun in funs
            fun.accessor = true
            code.push fun.x, "et ", key, (fun.compile o, LEVEL_LIST .to-string!.slice 8), ',\n' + o.indent
        code.pop!
        sn(null, ...code)

    compile-descriptor: (o) ->
        obj = Obj!
        for fun in @val then obj.items.push Prop Key(fun.x + \et  ), fun
        obj.items.push Prop Key(\configurable), Literal true
        obj.items.push Prop Key(\enumerable  ), Literal true
        obj.compile o

    rewrite-shorthand: (o, assign) !->
        super ...

        # Special logic for `{a = b}` meaning the same thing as `{a ? b}`
        @val.=maybe-logic! if not @key? and @val instanceof Assign

        # `{+flag}`
        if not @key? and @val instanceof Unary and @val.op in <[+ -]>
            @key = @val.it.maybe-key! or @carp "invalid property flag shorthand"
            @val = Literal @val.op is \+

        # Pull logical operators out of the value so that, e.g., slicing
        # doesn't have to think about them
        if @val instanceof Binary and @val.get-default!
            @val.=first
            @logic = that <<< first: null

        @key ?= @val.extract-key-ref o, assign

#### Arr
# `[x, y]`
class exports.Arr extends List
    (@items or []) ~>

    is-array: YES

    as-obj: -> Obj([Prop Literal(i), item for item, i in @items])

    compile: (o) ->
        @carp "unexpected label" if @name?
        {items} = this
        return sn(this, '[]') unless items.length
        unless sn-empty(code = Splat.compile-array o, items)
            return if @newed then sn(this, "(", code, ")") else sn(this, code)
        sn(null, sn(this, "["), (List.compile o, items, @deep-eq), sn(this, "]"))

    @maybe = (nodes) ->
        return nodes.0 if nodes.length is 1 and nodes.0 not instanceof Splat
        constructor nodes

    @wrap = -> constructor [Splat it <<< is-array: YES]

class exports.Yield extends Node
    (@op, @it) ~>

    children: <[ it ]>

    show: -> switch @op
    | 'yield' => ''
    | 'yieldfrom' => 'from'
    | 'await' => 'await'

    ::delegate <[ isCallable ]> -> yes

    compile-node: (o) ->
        code = [(switch @op
        | 'yield' => 'yield'
        | 'yieldfrom' => 'yield*'
        | 'await' => 'await'
        )]
        if @it then code.push " #{@it.compile o, LEVEL_OP + PREC.unary}"
        sn(this, "(", ...code, ")")

#### Unary operators
class exports.Unary extends Node
    # `flag` denotes inversion or postcrement.
    (op, it, flag) ~>
        if it?
            if not flag and it.unaries
                that.push op
                return it
            switch op
            case \!
                break if flag
                return it <<< {+hushed} if it instanceof Fun and not it.hushed
                return it.invert!
            case \++ \-- then @post = true if flag
            case \new
                # `new C?` => `new C?()`
                if it instanceof Existence and not it.negated
                    it = Chain(it)add Call!
                it.newed = true
                for node in it.tails or '' when node instanceof Call and not node.new
                    node.args.shift! if node.method is \.call
                    node <<< {\new, method: ''}
                    return it
            case \~ then if it instanceof Fun and it.statement and not it.bound
                return it <<< bound: \this$
            case \do
                # `do f?` => `f?()`
                if it instanceof Existence and not it.negated
                    return Chain(it)add Call!

        this <<< {op, it}

    children: [\it]

    show: -> [\@ if @post] + @op

    is-callable: -> @op in <[ do new delete ]> or not @it?

    is-array: -> @it instanceof Arr   and @it.items.length
           or @it instanceof Chain and @it.is-array!

    is-string: -> @op in <[ typeof classof ]>

    invert: ->
        return @it if @op is \! and @it.op in <[ ! < > <= >= of instanceof ]>
        constructor \! this, true

    unfold-soak: (o) ->
        @op in <[ ++ -- delete jsdelete ]> and @it? and If.unfold-soak o, this, \it

    get-accessors: ->
        return unless @op is \~
        return [@it] if @it instanceof Fun
        if @it instanceof Arr
            {items} = @it
            return items if not items.2
                         and items.0 instanceof Fun
                         and items.1 instanceof Fun

    function crement then {'++':\in '--':\de}[it] + \crement

    compile-node: (o) ->
        return @compile-as-func o if not @it?
        return that if @compile-spread o
        {op, it} = this
        switch op
        case \!   then it.cond = true
        case \new then it.is-callable! or it.carp 'invalid constructor'
        case \do
            if o.level is LEVEL_TOP and it instanceof Fun and it.is-statement!
                return sn(this, (it.compile o), " ", (Unary \do Var it.name .compile o))
            x = Parens Call.make it
            return sn(this, (x <<< {@front, @newed})compile o)
        case \delete
            @carp 'invalid delete' if it instanceof Var or not it.is-assignable!
            return @compile-pluck o if o.level and not @void
        case \++ \--
            it.is-assignable! or @carp 'invalid ' + crement op
            if it instanceof Var and o.scope.checkReadOnly it.value
                @carp "#{ crement op } of #that \"#{it.value}\"" ReferenceError
            it{front} = this if @post
        case \^^ then return sn(this, (util \clone), "(", (it.compile o, LEVEL_LIST), ")")
        case \jsdelete then return sn(this, "delete ", (it.compile o, LEVEL_LIST))
        case \classof
            return sn(this, (util \toString), ".call(
              ", (it.compile o, LEVEL_LIST), ").slice(8, -1)")
        code = [(it.compile o, LEVEL_OP + PREC.unary)]
        if @post then code.push op else
            op += ' ' if op in <[ new typeof delete ]>
                or op in <[ + - ]> and op is code.join("").char-at!
            code.unshift op
        if o.level < LEVEL_CALL then sn(this, ...code) else sn(this, "(", ...code, ")")

    # `^delete ...o[p, ...q]` => `[^delete o[p], ...^delete o[q]]`
    # `^delete ...o{p, ...q}` => `{p: ^delete o[p], ...^delete o[q]}`
    compile-spread: (o) ->
        {it} = this
        ops = [this]
        while it instanceof constructor, it.=it then ops.push it
        return '' unless it instanceof Splat
                  and it.=it instanceof List

        @compile-spread-over o, it, (node) ->
            for op in ops by -1 then node = constructor op.op, node, op.post
            node.unfold-soak o or node

    # `v = delete o.k`
    compile-pluck: (o) ->
        [get, del] = Chain @it .cache-reference o
        code = [ref = o.scope.temporary!, " = \
            ", (get.compile o, LEVEL_LIST), ", delete \
            ", (del.compile o, LEVEL_LIST), ", \
            ", (o.scope.free ref)]
        if o.level < LEVEL_LIST then sn(this, ...code) else sn(this, "(", ...code, ")")

    compile-as-func: (o) ->
        if @op is \!
        then sn(this, util \not)
        else sn(this, "(", ((Fun [], Block Unary @op, Chain Var \it).compile o), ")")

    rewrite-shorthand: (o, assign) ->
        return that.rewrite-shorthand o, assign or that if @unfold-soak o
        super o, assign || @op in <[ ++ -- delete jsdelete ]>


#### Binary operators
class exports.Binary extends Node
    (op, first, second) ~>
        @partial = not first? or not second?
        if not @partial
            if \= is op.char-at op.length-1 and op.char-at(op.length-2) not in <[ = < > ! ]>
                return Assign first.unwrap!, second, op
            switch op
            | \in        => return new In first, second
            | \with      => return new Import (Unary \^^ first), second, false
            | \<<< \<<<< => return Import first, second, op is \<<<<
            | \<|        => return Block first .pipe second, op
            | \|>        => return Block second .pipe first, \<|
            | \. \.~     => return Chain first .add Index second, op
        this <<< {op, first, second}

    children: <[ first second ]>

    show: -> @op

    is-callable: ->
        @partial or @op in <[ && || ? << >> ]> and @first.is-callable! and @second.is-callable!

    is-array: -> switch @op | \* => @first .is-array!
                          | \/ => @second.is-matcher!

    is-string: -> switch @op
        | \+ \* => @first.is-string! or @second.is-string!
        | \-    => @second.is-matcher!

    COMPARER   = /^(?:[!=]=|[<>])=?$/
    INVERSIONS = '===':'!==' '!==':'===' '==':'!=' '!=':'=='

    invert: ->
        if not COMPARER.test @second.op and INVERSIONS[@op]
            @op = that
            @was-inverted = true
            return this
        Unary \! Parens(this), true

    invertIt: -> @inverted = true; this

    get-default: -> switch @op | \? \|| \&& => this

    assigns: -> @get-default!?first.assigns!

    xor-children: (test) ->
        return false unless (first = test @first) xor test @second
        return if first then [@first, @second] else [@second, @first]

    compile-node: (o) ->
        return @compilePartial o if @partial
        switch @op
        case \? then return @compileExistence o
        case \*
            return @compileJoin   o if @second.is-string!
            return @compileRepeat o if @first.is-string! or @first.is-array!
        case \-       then return @compileRemove o if @second.is-matcher!
        case \/       then return @compileSplit  o if @second.is-matcher!
        case \** \^   then return @compilePow o
        case \<? \>?  then return @compileMinMax o
        case \<< \>>  then return @compileCompose o
        case \++      then return @compileConcat o
        case \%%      then return @compileMod o
        case \xor     then return @compileXor o
        case \&& \||
            @second.void = true if top = @void or not o.level
            if top or @cond
                @first .cond = true
                @second.cond = true
        case \instanceof
            {items}:rite = @second
            if rite instanceof Arr
                return @compileAnyInstanceOf o, items if items.1
                @second = items.0 or rite
            @second.is-callable! or @second.carp 'invalid instanceof operand'
        case <[ ==== !=== ]>       then @op.=slice 0 3; fallthrough
        case <[ <== >== <<= >>= ]> then return @compileDeepEq o
        default
            if COMPARER.test @op
                if @op in [\=== \!==] and @xor-children (.is-regex!)
                    return @compileRegexEquals o, that
                if @op is \=== and (@first instanceof Literal and @second instanceof Literal)
                and @first.is-what! isnt @second.is-what!
                    @warn "strict comparison of two different types will always be false: #{@first.value} == #{@second.value}" if o.warn
            return @compileChain o if COMPARER.test @op and COMPARER.test @second.op
        @first <<< {@front}
        code = [(@first .compile o, level = LEVEL_OP + PREC[@op]), " ", (@mapOp @op), " ", (@second.compile o, level)]
        if o.level <= level then sn(this, ...code) else sn(this, "(", ...code, ")")

    mapOp: (op) ->
        | op.match //\.([&\|\^] | << | >>>?)\.// => that.1
        | op is \of                              => \in
        | otherwise                              => op

    # Mimic Python/Perl6's chained comparisons
    # when multiple comparison operators are used sequentially:
    #
    #     $ livescript -pe '50 < 65 === 9r72 > 10'
    #     true
    #
    # See <http://docs.python.org/reference/expressions.html#notin>.
    compileChain: (o) ->
        code = [(@first.compile o, level = LEVEL_OP + PREC[@op])]
        [sub, @second.first] = @second.first.cache o, true
        code.push " ", @op, " ", (sub.compile o, level), " && ", (@second.compile o, LEVEL_OP)
        if o.level <= LEVEL_OP then sn(this, ...code) else sn(this, "(", ...code, ")")

    compileExistence: (o) ->
        if @void or not o.level
            x = Binary \&& Existence(@first, true), Parens @second.unwrap!
            return (x <<< {+void})compile-node o
        x = @first.cache o, true
        sn(this, If(Existence x.0; x.1)add-else(@second)compile-expression o)

    # `x instanceof [A, B]` => `x instanceof A || x instanceof B`
    compileAnyInstanceOf: (o, items) ->
        [sub, ref, @temps] = @first.cache o
        test = Binary \instanceof sub, items.shift!
        for item in items then test = Binary \|| test, Binary \instanceof ref, item
        sn(this, Parens test .compile o)

    compileMinMax: (o) ->
        lefts = @first .cache o, true
        rites = @second.cache o, true
        x = Binary @op.char-at!, lefts.0, rites.0
        sn(this, If x, lefts.1 .add-else rites.1 .compile-expression o)

    compileMethod: (o, klass, method, arg) ->
        args = [@second] ++ (arg || [])
        if @first"is#klass"!
            sn(this, Chain(@first, [Index Key method; Call args])compile o)
        else
            args.unshift @first
            sn(this, Call.make(JS util(method) + \.call; args)compile o)

    compileJoin   : -> @compileMethod it, \Array  \join
    compileRemove : -> @compileMethod it, \String \replace JS "''"
    compileSplit  : -> @compileMethod it, \String \split

    compileRepeat: (o) ->
        {first: {items}:x, second: n} = this
        arr = x.is-array! and \Array
        if items and !sn-empty(arrCode = Splat.compile-array o, items)
            x     = JS arrCode
            items = null
        if arr and not items
        or not (n instanceof Literal and n.value < 0x20)
            return sn(this, (Call.make Util(\repeat + (arr or \String)), [x, n] .compile o))
        n = +n.value
        return sn(this, x.compile o) if 1 <= n < 2
        # `[x] * 2` => `[x, x]`
        if items
            if n < 1 then return sn(this, (Block items .add JS '[]' .compile o))
            refs = []
            for item, i in items then [items[i], refs.*] = item.cache o, 1x
            items.push JS! <<<
                compile: -> sn(this, ...(([", ", (List.compile o, refs)] * (n-1))slice 1))
            sn(this, x.compile o)
        # `'x' * 2` => `'xx'`
        else if x instanceof Literal
            sn(this, (q = (x.=compile o .to-string!)char-at!) + "#{ x.slice 1 -1 }" * n + q)
        # `"#{x}" * 2` => `(ref$ = "" + x) + ref$`
        else
            if n < 1 then return sn(this, Block(x.it)add(JS "''")compile o)
            x = (refs = x.cache o, 1, LEVEL_OP)0 + " + #{refs.1}" * (n-1)
            if o.level < LEVEL_OP + PREC\+ then sn(this, x) else sn(this, "(", x, ")")

    compilePow: (o) -> sn(null, Call.make(CopyL this, JS \Math.pow; [@first, @second])compile o)

    compileConcat: (o) ->
        f = (x) ->
            | x instanceof Binary and x.op is \++ =>
                (f x.first) ++ (f x.second)
            | otherwise                            => [x]
        sn(null, (Chain @first .add(CopyL this, Index (Key \concat), \., true) .add Call(f @second) .compile o))

    compileCompose: (o) ->
        op = @op
        functions = [@first]
        x = @second
        while x instanceof Binary and x.op is op and not x.partial
            functions.push x.first
            x = x.second
        functions.push x

        functions.reverse! if op is \<<

        sn(this, (Chain Var (util \compose) .add Call functions .compile o))

    compileMod: (o) ->
        ref = o.scope.temporary!
        code = [sn(this, "(("), (@first.compile o), sn(this, ") % ("), sn(this, ref, " = "), (@second.compile o), sn(this, ") + ", ref, ") % ", ref)]
        o.scope.free ref
        if o.level < LEVEL_OP + PREC\%
        then sn(null, ...code)
        else sn(null, "(", ...code, ")")

    compilePartial: (o) ->
        vit = Var \it
        switch
        case  not @first? and not @second?
            x = Var \x$
            y = Var \y$
            sn(this, (Fun [x, y], Block((Binary @op, x, y).invert-check this), false, true).compile o)
        case @first?
            sn(this, "(", ((Fun [vit], Block((Binary @op, @first, vit) .invert-check this), true).compile o), ")")
        default
            sn(this, "(", ((Fun [vit], Block((Binary @op, vit, @second).invert-check this), true).compile o), ")")

    compileRegexEquals: (o, [regex, target]) ->
        if @op is \===
            method = if @was-inverted then \test else \exec
            sn(this, (Chain regex .add Index Key method .add Call [target] .compile o))
        else
            sn(this, (Unary \! (Chain regex .add Index Key \test .add Call [target]) .compile o))

    compileDeepEq: (o) ->
        if @op in <[ >== >>= ]>
            [@first, @second] = [@second, @first]
            @op = if @op is \>== then \<== else \<<=
        if @op is \!==
            @op = \===
            negate = true
        for x in [@first, @second]
            x.deep-eq = true if x instanceof [Obj, Arr]
        r = Chain Var (util \deepEq) .add Call [@first, @second, Literal "'#{@op}'"]
        sn(this, (if negate then Unary \! r else r).compile o)

    compileXor: (o) ->
        left  = Chain @first  .cache-reference o
        right = Chain @second .cache-reference o
        sn(this, (Binary \&& (Binary \!== (Unary \! left.0), (Unary \! right.0))
             , (Parens Binary \|| left.1, right.1) .compile o))

    rewrite-shorthand: (o, assign) !->
        return super ... if @partial
        @first = that if @first.rewrite-shorthand o, assign
        @second = that if @second.rewrite-shorthand o

#### Assign
# Assignment to a variable/property.
class exports.Assign extends Node
    (@left, rite, @op or \=, @logic or @op.logic, @defParam) ~>
        @opLoc = @op
        @op += ''
        @[if rite instanceof Node then \right else \unaries] = rite

    children: <[ left right ]>

    show: -> [,]concat(@unaries)reverse!join(' ') + [@logic] + @op

    assigns: -> @left.assigns!

    get-ref: -> @left unless @left.is-complex!

    ::delegate <[ isCallable isRegex ]> -> @op in <[ = := ]> and @right and @right[it]!

    is-array: -> switch @op
        | \= \:= => @right and @right.is-array!
        | \/=    => @right and @right.is-matcher!

    is-string: -> switch @op
        | \= \:= \+= \*= => @right and @right.is-string!
        | \-=            => @right and @right.is-matcher!

    unfold-soak: (o) ->
        if @left instanceof Existence
            # `[a, b]? = c` => `[a, b] = c if c?`
            if delete (@left.=it)name
            then rite = @right; rite = Assign @right = Var(that), rite
            else [rite, @right, temps] = @right.cache o
            return If(Existence rite; this) <<< {+soak, temps, @cond, @void}
        If.unfold-soak o, this, \left

    unfold-assign: -> @access and this

    compile-node: (o) ->
        return that.compile o if @unfold-soak o
        return @compileSplice o if @left instanceof Slice and @op is \=
        left = @left
        left.=it if sp = @left instanceof Splat
        if sp
            left instanceof List or @left.carp 'invalid splat'
            return @compile-spread o, left
        unless @right
            left.is-assignable! or left.carp 'invalid unary assign'
            [left, @right] = Chain left .cache-reference o
            for op in @unaries then @right = Unary op, @right
        return sn(null, (Parens(@right) <<< {@front, @newed})compile o) if left.is-empty!
        if left.get-default!
            @right = Binary left.op, @right, left.second
            left.=first
        if left.soak
            @left = left.then
            left.then = this
            return left.compile o
        return @compileDestructuring o, left if left.items
        left.is-assignable! or left.carp 'invalid assign'
        return @compileConditional   o, left if @logic
        {op, right} = this
        return @compileMinMax  o, left, right if op in <[ <?= >?= ]>
        if op in <[ **= ^= %%= ++= |>= ]>
        or op is \*= and right.is-string!
        or op in <[ -= /= ]> and right.is-matcher!
            [left, reft] = Chain(left)cache-reference o
            right = Binary op.slice(0 -1), reft, right
            op    = \:=
        op = (op.slice 1 -2) + \= if op in <[ .&.= .|.= .^.= .<<.= .>>.= .>>>.= ]>
        (right.=unparen!)rip-name left.=unwrap!
        if left instanceof Chain
            # `a[]b = ...`
            left.expand-vivify!
            if left.=unwrap! instanceof Assign
                [left.left, @left] = Chain left.left .cache-reference o
                return Block [left, this with terminator: ''] .compile o
        sign = sn(@opLoc, " ", (op.replace \: ''), " ")
        name = ((left <<< {+front})compile o, LEVEL_LIST)
        if lvar = left instanceof Var
            if op is \=
                o.scope.declare name.to-string!, left,
                    (@const or not @defParam and o.const and \$ isnt name.to-string!.slice -1)
            else if o.scope.checkReadOnly name.to-string!
                left.carp "assignment to #that \"#name\"" ReferenceError
        if left instanceof Chain and right instanceof Fun
            proto-split = name.to-string!.split '.prototype.'
            dot-split = name.to-string!.split \.
            if proto-split.length > 1
                right.in-class = proto-split.0
            else if dot-split.length > 1
                right.in-class-static = dot-split[til -1].join ''
        code = if not o.level and right instanceof While and not right.else and
              (lvar or left instanceof Chain and left.is-simple-access!)
            # Optimize `a = while ...`.
            empty = if right.objComp then '{}' else '[]'
            [(res = o.scope.temporary \res), " = #empty;\n#{@tab}", (right.make-return(res)compile o), "\n#{@tab}", name, sign, o.scope.free res]
        else
            [name, sign, (right.compile o, LEVEL_LIST)]
        code = ["(", ...code, ")"] if o.level > LEVEL_LIST
        sn(null, ...code)

    compileConditional: (o, left) ->
        if left instanceof Var and @logic is \? and @op is \=
            o.scope.declare left.value, left
        [lcache, left] = Chain(left)cache-reference o
        # Deal with `a && b ||= c`.
        o.level += LEVEL_OP < o.level
        if @logic is \? and @op not in <[ = := ]>
            @logic = \&&
            lcache |>= Existence
        morph = Binary @logic, lcache, @<<<{-logic, left}
        sn(this, (morph <<< {@void})compile-node o)

    compileMinMax: (o, left, right) ->
        lefts = Chain(left)cache-reference o
        rites = right.cache o, true
        test  = Binary @op.replace(\? ''), lefts.0, rites.0
        put   = Assign lefts.1, rites.1, \:=
        # `a <?= b` => `a <= b || a = b `
        return Parens(Binary \|| test, put)compile o if @void or not o.level
        # `r = a <?= b` => `r = if a <= b then a else a = b`
        [test.first, left] = test.first.cache o, true
        sn(this, (If test, left .add-else put .compile-expression o))

    # Implementation of recursive destructuring,
    # when assigning to an array or object literal.
    # See <http://wiki.ecmascript.org/doku.php?id=harmony:destructuring>.
    compileDestructuring: (o, {{length: len}:items}:left) ->
        ret  = o.level and not @void
        rite = @right.compile o, if len is 1 then LEVEL_CALL else LEVEL_LIST
        if left.name
            cache = sn(this, that, " = ", rite)
            o.scope.declare rite = that, left
        else if (ret or len > 1) and (not ID.test rite.to-string! or if left.assigns! then rite.to-string! in that)
            cache = sn(this, (rref = o.scope.temporary!), " = ", rite)
            rite  = rref
        if rite.to-string! is \arguments and not ret
            destructure-args = true
            if left not instanceof Arr
                @carp 'arguments can only destructure to array'
        list = @"rend#{ left.constructor.display-name }" o, items, rite, destructure-args
        o.scope.free rref  if rref
        list.unshift cache if cache
        list.push rite     if ret or not list.length
        code = []
        sep = if destructure-args then '; ' else ', '
        for item in list
            code.push item, sep
        code.pop!
        if (o.level < LEVEL_OP and list.length < 2) or o.level < LEVEL_LIST then sn(this, ...code) else sn(this, "(", ...code, ")")

    compileSplice: (o) ->
        [from-exp-node, from-exp] = Chain @left.from .cache-reference o
        [right-node, right]       = Chain @right     .cache-reference o
        to-exp = Binary \- @left.to, from-exp
        sn(this, (Block [Chain Var (util \splice) .add Index (Key \apply), \. true
                .add Call [@left.target, (Chain Arr [from-exp-node, to-exp]
                .add Index (Key \concat), \. true .add Call [right-node])]; right]
            .compile o, LEVEL_LIST))

    compile-spread: (o, left) ->
        [rite, rref] =
            if @unaries then [that] * 2
            else if left.items.length <= 1 then [@right] * 2
            else @right.cache o, true

        @compile-spread-over o, left, ~>
            result = constructor it, rite, @op, @logic
            rite := rref
            result

    rendArr: (o, nodes, rite, destructure-args) ->
        ~function args-slice(begin, end)
            # [&[..] for from (begin) til (end)]
            new For {+ref, from: begin, op: \til, to: end}
                .make-comprehension (Chain Var \arguments .add Index Literal \..), []
        ret = []
        for node, i in nodes
            continue if node.is-empty!
            if node instanceof Splat
                len and node.carp 'multiple splat in an assignment'
                skip = (node.=it).is-empty!
                if i+1 is len = nodes.length
                    break if skip
                    if destructure-args
                        val = args-slice do # from i to &length
                            Literal(i)
                            (Chain Var \arguments .add Index Key \length)
                    else
                        val = Arr.wrap JS do
                            util(\slice) + \.call( + rite + if i then ", #i)" else \)
                else
                    val = ivar = "#rite.length - #{ len - i - 1 }"
                    # Optimize `[..., a] = b`.
                    continue if skip and i+2 is len
                    start = i+1
                    @.[]temps.push ivar = o.scope.temporary \i
                    val = switch
                    | skip
                        Arr.wrap JS "#i < (#ivar = #val) ? #i : (#ivar = #i)"
                    | destructure-args
                        args-slice do
                            JS "#i < (#ivar = #val) ? #i : (#ivar = #i)"
                            Var ivar
                    | _
                        Arr.wrap JS do
                            "#i < (#ivar = #val)
                            \ ? #{ util \slice }.call(#rite, #i, #ivar)
                            \ : (#ivar = #i, [])"
            else
                (inc = ivar) and start < i and inc += " + #{ i - start }"
                val = Chain rcache||=Literal(rite), [Index JS inc || i]
            if destructure-args
                if node not instanceof Var and val instanceof For
                    # avoid accidentally creating closure
                    @.[]temps.push tmp = o.scope.temporary \ref
                    vtmp = Var tmp
                    ret.push (this with {left: vtmp, right: val, +void})compile o, LEVEL_TOP
                    ret.push (this with {left: node, right: vtmp, +void})compile o, LEVEL_TOP
                else
                    ret.push (this with {left: node, right: val, +void})compile o, LEVEL_TOP
            else
                ret.push (this with {left: node, right: val, +void})compile o, LEVEL_PAREN
        ret

    rendObj: (o, nodes, rite) ->
        keys = []
        pairs = []
        rvar = Var rite
        for {key, val: lval, logic} in nodes
            lval.=unparen!
            if key instanceof Splat
                logic? and @carp "invalid assign"
                excludes = Obj [Prop ..extract-key-ref(o, true, this), Literal 0 for keys]
                val = Chain Var(util \copyWithout) .add Call [rvar, excludes]
            else
                keys.push key
                # `{a or b} = c` => `a = c.a or b`
                lval = logic <<< first: lval if logic
                val  = Chain rvar, [Index key]
            # Defer compilation because keys might be mutated by a later splat
            pairs.push [lval, val]
        for [left, right] in pairs
            (this with {left, right, +void, temps:[]})compile o, LEVEL_PAREN

    rewrite-shorthand: (o, assign) !->
        # Special logic for `[a = b] = c` meaning the same thing as `[a ? b] = c`
        if assign
            @carp "invalid assign" if this is bin = @maybe-logic!
            return bin.rewrite-shorthand(o, true) ? bin

        return that.rewrite-shorthand o, assign or that if @unfold-soak o
        @left = that if @left?rewrite-shorthand o, true
        @right = that if @right?rewrite-shorthand o

    maybe-logic: ->
        if @op is \= then Binary @logic || \? @left, @right else this

#### Import
# Copies properties from right to left.
class exports.Import extends Node
    (@left, @right, @all and \All) ~>
        if not all and left instanceof Obj and right.items
            return Obj left.items ++ right.as-obj!items

    children: <[ left right ]>

    show: -> @all

    ::delegate <[ isCallable isArray ]> -> @left[it]!

    unfold-soak: (o) ->
        {left} = this
        if left instanceof Existence and not left.negated
            if left.=it instanceof Var
                {value} = @left = left
                unless o.scope.check value, true
                    left = JS "typeof #value != 'undefined' && #value"
            else
                [left, @left, temps] = left.cache o
            return If(left, this) <<< {temps, +soak, @cond, @void}
        If.unfold-soak o, this, \left
        or @void and
        If.unfold-soak o, this, \right

    compile-node: (o) ->
        {right} = this
        unless @all
            if right instanceof Chain
                right = right.unfold-soak o
                     or right.unfold-assign o
                     or right
            return @compile-assign o, right.as-obj!items if right instanceof List
        (CopyL this, Call.make Util("import#{ @all or '' }"), [@left, right]) .compile-node o

    # If the right operand of `<<<` is an object or array literal,
    # expand it to a series of assignments.
    compile-assign: (o, items) ->
        return @left.compile o unless items.length
        top = not o.level
        if @proto or (items.length < 2 and (top or @void or items.0.key instanceof Splat))
            reft = @left
            reft = Parens reft if reft.is-complex!
        else [left, reft, @temps] = @left.cache o
        [delim, space] = if top then [\; \\n + @tab] else [\, ' ']
        delim += space
        code = if @temps then [left.compile(o, LEVEL_PAREN), delim] else []
        for node, i in items
            i and code.push if com then space else delim
            if com = node.comment
                code.push node.compile o
                continue
            {key, val, logic} = node
            if key instanceof Splat
                code.push (CopyL this, Import reft, val)compile o
                continue
            if node.accessor
                key = JS "'#{key.name}'" if key instanceof Key
                code.push "Object.defineProperty(", (reft.compile o, LEVEL_LIST), ", ", (key .compile o, LEVEL_LIST), ", ", (node.compile-descriptor o), ")"
                continue
            logic and val = logic <<< first: val
            code.push (Assign(Chain reft, [Index key]; val)compile o, LEVEL_PAREN)
        return sn(null, ...code) if top
        @void or key instanceof Splat or
            code.push (if com then ' ' else ', '), (reft.compile o, LEVEL_PAREN)
        if o.level < LEVEL_LIST then sn(null, ...code) else sn(null, "(", ...code, ")")

    rewrite-shorthand: (o, assign) !->
        return that.rewrite-shorthand o, assign or that if @unfold-soak o
        @left = that if @left?rewrite-shorthand o, assign
        @right = that if @right?rewrite-shorthand o

#### In
# Handles `in` operation that tests if the left operand is included within
# the right operand, arraywise.
class exports.In extends Node implements Negatable
    (@item, @array) ->

    children: <[ item array ]>

    compile-node: (o) ->
        {items} = array = @array
        if array not instanceof Arr
            return sn(this, (if @negated then \! else ''), (util \in), "(", (@item.compile o, LEVEL_LIST), ", ", (array.compile o, LEVEL_LIST), ")")
        if items.length == 0
            @warn "value can never be `in` an empty array" if o.warn
            value = "#{!!@negated}"
            return do
                if @item.is-complex!
                    sn(this, "(", (@item.compile o, LEVEL_LIST), ", ", value, ")")
                else
                    sn(this, value)
        code = []
        [sub, ref] = if items.length == 1 then [@item.compile o, LEVEL_PAREN]*2 else @item.cache o, false, LEVEL_PAREN
        [cmp, cnj] = if @negated then [' !== ' ' && '] else [' === ' ' || ']
        for test, i in items
            code.push cnj if code.length > 0
            if test instanceof Splat
                code.push (new In(Var ref; test.it) <<< {@negated})compile o, LEVEL_TOP
                code  = ["(#sub, ", ...code, ")"] unless i or sub is ref
            else
                code.push (if i or sub is ref then ref else "(#sub)"), cmp, (test.compile o, LEVEL_OP + PREC\== )
        sub is ref or o.scope.free ref
        if o.level < LEVEL_OP + PREC[if items.length == 1 then \=== else \||] then sn(this, ...code) else sn(this, "(", ...code, ")")

#### Existence
# Checks a value for existence--not `undefined` nor `null`.
class exports.Existence extends Node implements Negatable
    (@it, @negated) ~>

    children: [\it]

    compile-node: (o) ->
        node = @it.unwrap! <<< {@front}
        code = [(node.compile o, LEVEL_OP + PREC\==)]
        if @do-anaphorize
            o.scope.declare \that Var \that
        if node instanceof Var and not o.scope.check code.join(""), true
            [op, eq] = if @negated then <[ || = ]> else <[ && ! ]>
            if @do-anaphorize
                [anaph-pre, anaph-post] = if @negated
                    then [["(that = undefined) || "], []]
                    else [[], [" && (that = ", ...code, ", true)"]]
            code = ["typeof ", ...code, " #eq= 'undefined' #op ", ...code, " #eq== null"]
            code = that ++ code if anaph-pre?
            code = code ++ that if anaph-post?
        else
            code = ["(that = ", ...code, ")"] if @do-anaphorize
            code.push " #{ op = if @negated then \== else \!= } null"
        if o.level < LEVEL_OP + PREC[op] then sn(this, ...code) else sn(this, "(", code, ")")

#### Fun
# A function definition. This is the only node that creates a `new Scope`.
class exports.Fun extends Node
    (@params or [], @body or Block!, @bound and \this$, @curried or false, @hushed = false, @generator = false, @async = false) ~>

    children: <[ params body ]>

    show: -> [@name] + ["~#that" if @bound]

    named: -> this <<< {name: it, +statement}

    is-callable: YES

    is-statement: -> !!@statement

    # Short-circuit `traverse-children` method to prevent it
    # from crossing scope boundaries by default.
    traverse-children: (, xscope) -> super ... if xscope

    rewrite-shorthand: VOID

    make-return: -> if @statement then this <<< {+returns} else super ...

    rip-name: !-> @name ||= it.var-name!

    compile-node: (o) ->
        pscope = o.scope
        sscope = pscope.shared or pscope
        scope  = o.scope = @body.scope =
            new Scope (if @wrapper then pscope else sscope), @wrapper && sscope
        scope.fun = this
        scope.assign \prototype "#{ that.compile o }.prototype" if @proto
        scope.assign \constructor that                          if @cname
        o.indent = @tab = '' if inLoop = delete o.loop
        o.indent += TAB
        {body, name, tab} = this
        code = [\function]
        if @async
            @ctor and @carp "a constructor can't be async"
            o.in-async = true
            code.unshift 'async '
        else if not @wrapper
            o.in-async = false
        if @generator
            @ctor and @carp "a constructor can't be a generator"
            o.in-generator = true
            code.push \*
        else if not @wrapper
            o.in-generator = false
        if @bound is \this$
            if @ctor
                scope.assign \this$ 'this instanceof ctor$ ? this : new ctor$'
                body.lines.push Return Literal \this$
            else if sscope.fun?bound
            then @bound = that
            else if @uses-this!
            then sscope.assign \this$ \this
        if @statement
            name                    or @carp  'nameless function declaration'
            pscope is o.block.scope or @carp 'misplaced function declaration'
            @accessor              and @carp 'named accessor'
            pscope.add name, \function, this
        if @statement or name and @labeled
            code.push ' ', (scope.add name, \function, this)
        @hushed or @ctor or @newed or body.make-return!
        code.push "(", (@compile-params o, scope), ")"
        code = [sn(this, ...code)]
        code.push "{"
        code.push "\n", bodyCode, "\n#tab" unless sn-empty(bodyCode = body.compile-with-declarations o)
        code.push \}
        curry-code-check = ~>
            if @curried and @has-splats
                    @carp 'cannot curry a function with a variable number of arguments'
            if @curried and @params.length > 1 and not @class-bound
                if @bound
                    [(util \curry), "((", ...code, "), true)"]
                else
                    [(util \curry), "(", ...code, ")"]
            else code
        if inLoop then return pscope.assign pscope.temporary(\fn), sn(null, ...curry-code-check!)
        if @returns
            code.push "\n#{tab}return ", name, ";"
        else if @bound and @ctor
            code.push ' function ctor$(){} ctor$.prototype = prototype;'
        code = curry-code-check!
        if @front and not @statement then sn(null, "(", ...code, ")") else sn(null, ...code)

    compile-params: (o, scope) ->
        {{length}:params, body} = this
        # Remove trailing placeholders.
        for p in params by -1
            break unless p.is-empty! or p.filler
            --params.length
        for p, i in params
            if p.left instanceof Splat
                # splats + default/operator arguments = too ambiguous to support
                p.carp 'invalid splat'
            if p instanceof Splat
                @has-splats = true
                splace = i
            # `(a = x) ->` => `(a ? x) ->`
            else if p.op is \=
                params[i] = Binary (p.logic or \?), p.left, p.right
        # `(a, ...b, c) ->` => `(a) -> [[] ...b, c] = &`
        if splace?
            rest = params.splice splace, 9e9
        else if @accessor
            that.carp 'excess accessor parameter' if params.1
        else unless length or @wrapper
            params.0 = Var \it if body.traverse-children -> it.value is \it or null
        names   = []
        assigns = []
        for p in params
            vr = p
            vr.=first if df = vr.get-default!
            if vr.is-empty!
                vr = Var scope.temporary \arg
            else if vr.value is \..
                vr = Var o.ref = scope.temporary!
            else if vr not instanceof Var
                unaries = []
                while vr instanceof Unary
                    has-unary = true
                    unaries.push vr
                    vr.=it
                v = Var delete (vr.it || vr)name || vr.var-name! || scope.temporary \arg
                assigns.push Assign vr, switch
                    | df        => Binary p.op, v, p.second
                    | has-unary => fold ((x, y) -> y.it = x; y), v, unaries.reverse!
                    | otherwise => v
                vr = v
            else if df
                assigns.push Assign vr, p.second, \=, p.op, true
            names.push (scope.add vr.value, \arg, p), ', '
        if rest
            while splace-- then rest.unshift Arr!
            assigns.push Assign Arr(rest), Literal \arguments
        @body.prepend ...assigns if assigns.length
        names.pop!
        sn(null, ...names)

    uses-this: ->
        Node::traverse-children.call this, ->
            | it instanceof Literal and it.value is \this      => true
            | it instanceof Fun and it.bound and it.uses-this! => true

#### Class
class exports.Class extends Node
    ({@title, @sup, @mixins, body}) -> @fun = Fun [] body

    children: <[ title sup mixins fun ]>

    is-callable: YES

    rip-name: !-> @name = it.var-name!

    get-ref: -> Var that if @title?var-name! or @name

    compile: (o, level) ->
        {{{lines}:body}:fun, title} = this
        CopyL this, fun

        bound-funcs = []
        curried-bound-funcs = []
        decl = title?var-name!
        name = decl or @name
        if ID.test name || '' then fun.cname = name else name = \constructor
        proto = Var \prototype
        vname = fun.proto = Var fun.bound = name
        const ctor-name = \constructor$$
        var ctor, ctor-place
        import-proto-obj = (node, i) ->
            j = 0
            while j < node.items.length, j++
                prop = node.items[j]
                key = prop.key
                if (key instanceof Key and key.name is ctor-name)
                or (key instanceof Literal and key.value is "'#ctor-name'")
                    node.carp 'redundant constructor' if ctor
                    ctor := prop.val
                    node.items.splice j--, 1
                    ctor-place := i
                continue unless prop.val instanceof Fun or prop.accessor
                if key.is-complex!
                    key = Var o.scope.temporary \key
                    prop.key = Assign key, prop.key
                if prop.val.bound
                    if prop.val.curried
                        curried-bound-funcs.push prop.key
                    else
                        bound-funcs.push prop.key
                    prop.val.bound = false
                    # need to know whether bound param of curry$ should be true
                    prop.val.class-bound = true
                for v in [] ++ prop.val
                    v.meth = key
            if node.items.length
              Import(Chain vname .add Index Key \prototype; node) <<< {+proto}
            else Literal 'void'

        for node, i in lines
            if node instanceof Obj
                lines[i] = import-proto-obj node, i
            else if node instanceof Fun and not node.statement
                ctor and node.carp 'redundant constructor'
                ctor = node
            else if node instanceof Assign and node.left instanceof Chain
            and node.left.head.value is \this and node.right instanceof Fun
                node.right.stat = node.left.tails.0.key
            else
                node.traverse-children !->
                    if it instanceof Block
                        for child, k in it.lines when child instanceof Obj
                            it.lines[k] = import-proto-obj child, i

        ctor ||= lines.* = if @sup
                    then  Fun [] Block Chain(new Super).add Call [Splat Literal \arguments]
                    else Fun!
        unless ctor instanceof Fun
            lines.splice ctor-place + 1, 0, Assign (Var ctor-name), ctor
            lines.unshift ctor = Fun [] Block Return Chain(Var ctor-name).add Call [Splat \arguments true]
        ctor <<< {name, +ctor, +statement}
        for f in bound-funcs
            ctor.body.lines.unshift do
                Assign (Chain Literal \this .add Index f),
                       (Chain Var (util \bind)
                         .add Call [Literal \this; Literal "'#{f.name}'"; Var \prototype])

        for f in curried-bound-funcs
            ctor.body.lines.unshift do
                Assign (Chain Literal \this .add Index Key "_#{f.name}"),
                       (Chain Var (util \curry)
                         .add Call [Chain Var \prototype .add Index f; Var \true])
                Assign (Chain Literal \this .add Index f),
                       (Chain Var (util \bind)
                         .add Call [Literal \this; Literal "'_#{f.name}'"])


        lines.push vname
        args = []
        if @sup
            args.push that
            imports = Chain Import (Literal \this), Var \superclass
            fun.proto = Util.Extends (if fun.cname
                then Block [Assign (imports.add Index Key 'displayName'), Literal "'#name'"
                   ; Literal name]
                else imports)
                , fun.params.* = Var \superclass
        if @mixins
            imports = for args.* in that
                Import proto, JS("arguments[#{args.length-1}]"), true
            body.prepend ...imports
        body.prepend Literal "#name.displayName = '#name'" if fun.cname and not @sup
        clas = Parens Call.make(fun, args), true
        clas = Assign vname, clas if decl and title.is-complex!
        clas = Assign title, clas if title
        sn(null, (clas.compile o, level))

#### Super
# Reference to the parent method or constructor.
class exports.Super extends Node
    ->

    is-callable: YES

    compile: ({scope}:o) ->
        unless @sproto
            while not scope.get \superclass and scope.fun, scope.=parent
                result = that
                return sn(this, \superclass.prototype, (Index that .compile o)) if result.meth
                return sn(this, \superclass          , (Index that .compile o)) if result.stat
                if scope.fun.in-class
                    return sn(this, that, ".superclass.prototype.", scope.fun.name)
                else if scope.fun.in-class-static
                    return sn(this, that, ".superclass.", scope.fun.name)
            return sn(this, that, ".superclass") if o.scope.fun?name
        sn(this, \superclass)

    maybe-key: -> Key \super true

#### Parens
# An extra set of parentheses,
# specifying evaluation order and/or forcing expression.
class exports.Parens extends Node
    (@it, @keep, @string, @lb, @rb) ~>

    children: [\it]

    show: -> @string and '""'

    ::delegate <[ isComplex isCallable isArray isRegex isNextUnreachable getRef ]> -> @it[it]!

    is-string: -> @string or @it.is-string!

    unparen: -> if @keep then this else @it.unparen!

    compile: (o, level ? o.level) ->
        {it} = this
        it{cond, \void} ||= this
        it.head.hushed = true if @calling and (not level or @void)
        unless @keep or @newed or level >= LEVEL_OP + PREC[it.op]
            return ((it <<< {@front})compile o, level || LEVEL_PAREN)
        if it.is-statement!
        then it.compile-closure o
        else sn(null, sn(@lb, "("), (it.compile o, LEVEL_PAREN), sn(@rb, ")"))

    maybe-key: THIS

    extract-key-ref: (o, assign, temp-owner) ->
        # When assigning to an object splat, the lifetimes of the temporary
        # variables used for dynamic keys have to be extended.
        if temp-owner? and (v = @it) instanceof Var and delete v.temp
            temp-owner[]temps.push v.value
        if @it instanceof Chain and assign
            # `{(a.b.c)} = d` => `(ref$ = a.b).c = d[ref$.c]`
            [@it, ref] = @it.cache-reference o
            return Parens ref
        # `a{(++i)}` => `{(ref$ = ++i): a[ref$]}`
        [key, val] = @it.cache o, true
        # `a{(++i)} = b` => `{(ref$): a[ref$ = ++i]} = b`
        #                => `a[ref$ = ++i] = b[ref$]`
        [key, val] = [val, key] if assign
        @it = val.unparen!
        Parens key

    rewrite-shorthand: (o) !->
        # Intentionally not passing the second argument to rewrite-shorthand.
        # The contents of Parens are never in assign position.
        @it = that if @it.rewrite-shorthand o

#### Splat
# A splat, either as an argument to a call,
# the operand of a unary operator to be spread,
# or as part of a destructuring assignment.
class exports.Splat extends Node
    (@it, @filler) ~>

    ::{children, is-complex} = Parens::

    is-assignable: YES

    assigns: -> @it.assigns!

    compile: -> @carp 'invalid splat'

    # Compiles a list of nodes mixed with splats to a proper array.
    @compile-array = (o, list, apply) ->
        expand list
        index = 0
        for node in list
            break if node instanceof Splat
            ++index
        return sn(this, '') if index >= list.length
        unless list.1
            return sn(this, ((if apply then Object else ensure-array) list.0.it
             .compile o, LEVEL_LIST))
        args = []
        atoms = []
        for node in list.splice index, 9e9
            if node instanceof Splat
                args.push Arr atoms.splice 0, 9e9 if atoms.length
                args.push ensure-array node.it
            else atoms.push node
        args.push Arr atoms if atoms.length
        sn(null, (if index then Arr list else args.shift!)compile(o, LEVEL_CALL), sn(this, ".concat("), (List.compile o, args), sn(this, ")"))

    function expand nodes
        index = -1
        while node = nodes[++index] then if node instanceof Splat
            {it} = node
            if it.is-empty!
                nodes.splice index-- 1
            else if it instanceof Arr
                nodes.splice index, 1, ...expand it.items
                index += it.items.length - 1
        nodes

    function ensure-array node
        return node if node.is-array!
        util \slice
        Call.make Util(\arrayFrom), [node]

#### Jump
# `break` `continue`
class exports.Jump extends Node
    (@verb, @label) ->

    show: -> (@verb or '') + if @label then ' ' + that else ''

    is-statement : YES
    make-return  : THIS
    is-next-unreachable : YES

    get-jump: (ctx or {}) ->
        return this unless ctx[@verb]
        return that not in (ctx.labels ?= []) and this if @label

    compile-node: (o) ->
        if @label
        then that in (o.labels ?= []) or @carp "unknown label \"#that\""
        else o[@verb]          or @carp "stray #{@verb}"
        sn(this, @show! + \;)

    @extended = !(sub) ->
        sub::children = [\it]
        @[sub.display-name.toLowerCase!] = sub

#### Throw
class exports.Throw extends Jump
    (@it) ~>

    get-jump: VOID

    compile-node: (o) -> sn(this, "throw ", (@it?compile o, LEVEL_PAREN or \null), ";")

#### Return
class exports.Return extends Jump
    ~> if it and it.value is not \void then this <<< {it}

    get-jump: THIS

    compile-node: (o) ->
        sn(this, "return", ...(if @it then [' ', (that.compile o, LEVEL_PAREN)] else []), ";")

#### While
# The traditional `while`/`for`/`do` loop.
# Returns an array of values collected from the last expression when requested.
class exports.While extends Node
    (test, @un, mode) ->
        mode and if mode instanceof Node then @update = mode else @post = true
        # `while true` `until false` => `for (;;)`
        if @post or test.value is not ''+!un then this <<< {test}

    children: <[ test body update else ]>

    a-source: \test, aTargets: <[ body update ]>

    show: -> [\! if @un; \do if @post] * ''

    ::is-statement = ::is-array = YES

    make-comprehension: (toAdd, loops) ->
        @is-comprehension = true
        while loops.length
            toAdd = loops.pop!add-body Block toAdd
            toAdd <<< {+in-comprehension} if not toAdd.is-comprehension
        @add-body Block toAdd

    get-jump: (ctx or {}) ->
        ctx <<< {+\continue, +\break}
        for node in @body?.lines or [] then return node if node.get-jump ctx

    add-body: (@body) ->
        @body = Block If @guard, @body if @guard
        [top] = @body.lines
        @body.lines.length = 0 if top?verb is \continue and not top.label
        this

    add-guard: (@guard) -> this
    add-obj-comp: (@objComp = true) -> this

    make-return: ->
        return this if @has-returned
        if it
            if @objComp
                @body = Block @body.make-return it, true
            else
                unless @body or @index
                    @add-body Block Var @index = \ridx$
                last = @body.lines?[*-1]
                if (@is-comprehension or @in-comprehension) and not last?is-comprehension
                    @body.make-return ...&
                    @else?make-return ...&
                    @has-returned = true
                else
                    @res-var = it
                    @else?make-return ...&
        else
            @get-jump! or @returns = true
        this

    compile-node: (o) ->
        o.loop = true
        @test and if @un then @test.=invert! else @anaphorize!
        return sn(null, sn(this, 'do {'), @compile-body (o.indent += TAB; o)) if @post
        test = @test?compile o, LEVEL_PAREN or ''
        unless @update or @else
            head = unless sn-empty(test) then [sn(this, "while ("), test] else [sn(this, 'for (;;')]
        else
            head = [sn(this, 'for (')]
            head.push (@yet = o.scope.temporary \yet), " = true" if @else
            head.push sn(this, ";"), (test.to-string! and ' '), test, sn(this, ";")
            head.push ' ', (that.compile o, LEVEL_PAREN) if @update
        sn(null, ...head, sn(this, ') {'), (@compile-body (o.indent += TAB; o)))

    compile-body: (o) ->
        o.break = o.continue = true
        {body: {lines}, yet, tab} = this
        code = []
        ret = []
        mid = []
        empty = if @objComp then '{}' else '[]'
        var _result-name
        get-result-name = ~>
                _result-name ? _result-name := o.scope.temporary if @objComp
                                                         then 'resultObj'
                                                         else 'results'
        last = lines?[*-1]
        if not (@is-comprehension or @in-comprehension) or last?is-comprehension
            has-loop = false
            last?traverse-children !-> if it instanceof Block and it.lines[*-1] instanceof While
                has-loop := true
            if @returns and not @res-var
                @res-var = res = o.scope.assign get-result-name!, empty
            if @res-var and (last instanceof While or has-loop)
                temp = o.scope.temporary \lresult
                lines.unshift Assign (Var temp), (if lines[*-1].objComp then Obj! else Arr!), \=
                lines[*-1]?=make-return temp
                mid.push TAB, (Chain Var @res-var
                    .add Index (Key \push), \., true
                    .add Call [Chain Var temp] .compile o), ";\n#{@tab}"
            else
                @has-returned = true
                if @res-var
                    @body.make-return @res-var
        if @returns
            if (not last instanceof While and not @has-returned) or @is-comprehension or @in-comprehension
                lines[*-1]?=make-return (res = o.scope.assign get-result-name!, empty), @objComp
            ret.push "\n#{@tab}return ", (res or empty), ";"
            @else?make-return!
        yet and lines.unshift JS "#yet = false;"
        code.push "\n", bodyCode, "\n#tab" unless sn-empty(bodyCode = @body.compile o, LEVEL_TOP)
        code.push ...mid
        code.push \}
        code.push sn(this, " while ("), (@test.compile o<<<{tab} LEVEL_PAREN), sn(this, ");") if @post
        if yet
            code.push sn(this, " if ("), yet, sn(this, ") "), (@compile-block o, Block @else)
            o.scope.free yet
        sn(null, ...code, ...ret)

#### For
# LiveScript's replacements for the `for` loop are array, object or range iterators.
class exports.For extends While
    ->
        this <<<< it
        @item = null if @item instanceof Var and not @item.value
        for @kind or [] => @[..] = true
        @carp '`for own` requires `of`' if @own and not @object

    children: <[ item source from to step body ]>

    a-source: null

    show: -> ((@kind || []) ++ @index).join ' '

    add-body: (body) ->
        if @let
            @item = Literal \.. if delete @ref
            assignments = with []
                ..push Assign Var(that), Literal \index$$ if @index
                ..push Assign that,      Literal \item$$ if @item
            body = Block if @guard
                assigned = [Var name for assignments when ..assigns! for name in that]
                assignments.concat [If delete @guard, Call.let assigned, body]
            else
                Call.let assignments, body

        super body

        if @let
            delete @index
            delete @item
        this

    is-next-unreachable: NO

    compile-node: (o) ->
        o.loop = true
        temps = @temps = []
        if @object and @index
        then o.scope.declare idx = @index
        else temps.push idx = o.scope.temporary \i
        @add-body Block Var idx if not @body
        unless @object
            [pvar, step] = (@step or Literal 1)compile-loop-reference o, \step
            pvar is step or temps.push pvar
        if @from
            @item = Var idx if @ref
            [tvar, tail] = @to.compile-loop-reference o, \to
            fvar = @from.compile o, LEVEL_LIST
            vars = "#idx = #fvar"
            unless tail is tvar
                vars += ", #tail"
                temps.push tvar
            pvar = step = -1 if not @step and +fvar > +tvar
            eq   = if @op is \til then '' else \=
            cond = if +pvar
                then "#idx #{ '<>'char-at pvar < 0 }#eq #tvar"
                else "#pvar < 0 ? #idx >#eq #tvar : #idx <#eq #tvar"
        else
            @item = Var o.scope.temporary \x if @ref
            if @item or @object and @own or @let
                [svar, srcPart] = @source.compile-loop-reference o, \ref, not @object, true
                svar is srcPart or temps.push svar
            else
                svar = srcPart = @source.compile o, if @object then LEVEL_PAREN else LEVEL_CALL
            unless @object
                if 0 > pvar and ~~pvar is +pvar  # negative int
                    vars = "#idx = #srcPart.length - 1"
                    cond = "#idx >= 0"
                else
                    temps.push lvar = o.scope.temporary \len
                    vars = "#idx = 0, #lvar = #srcPart.length"
                    cond = "#idx < #lvar"
        @else and @yet = o.scope.temporary \yet
        head = [sn(this, 'for (')]
        head.push idx, " in " if @object
        head.push that, " = true, " if @yet
        if @object
            head.push srcPart
        else
            step is pvar or vars += ', ' + step
            head.push vars, "; ", cond, "; " + if 1 ~= Math.abs pvar
                then (if pvar < 0 then \-- else \++) + idx
                else idx + if pvar < 0
                    then ' -= ' + pvar.to-string!.slice 1
                    else ' += ' + pvar
        @own and head.push sn(this, ") if ("), (o.scope.assign \own$ '{}.hasOwnProperty'), ".call(", svar, ", ", idx, ")"
        head.push sn(this, ') {')
        if @let
            @body.traverse-children !->
                switch it.value
                | \index$$ => it.value = idx
                | \item$$  => it.value = "#svar[#idx]"
        o.indent += TAB
        if @index and not @object
            head.push \\n + o.indent, Assign(Var @index; JS idx).compile(o, LEVEL_TOP), \;
        if @item and not @item.is-empty! and not @from
            head.push \\n + o.indent, Assign(@item, JS "#svar[#idx]")compile(o, LEVEL_TOP), \;
        o.ref = @item.value if @ref
        body  = @compile-body o
        head.push \\n + @tab if (@item or (@index and not @object)) and \} is body.to-string!.char-at 0
        sn(null, ...head, body)

#### Step slice
# Slices a list in steps
# Makes it possible to combine non-literals and the BY keyword in slices
# E.g. list[1 to 10][f() to x by (1+1)]
class exports.StepSlice extends For

    make-return: (@make-returnArg) -> super ...

    compile-node: (o) ->
        @index = o.scope.temporary \x
        [sub, ref, temps] = @target.unwrap!cache o
        @guard = Binary '<' (Literal @index), (Chain ref .add Index Key \length)
        @make-comprehension (Chain ref .add Index Literal @index), this
        if @make-returnArg? then @make-return @make-returnArg
        code = []
        if temps then code.push sub.compile(o), \; + \\n + o.indent
        code.push super ...
        sn(this, ...code)

#### Try
# Classic `try`-`catch`-`finally` block with optional `catch`.
class exports.Try extends Node
    (@attempt, @thrown, @recovery, @ensure) ->
        @recovery?lines.unshift Assign (@thrown or Var \e), Var \e$

    children: <[ attempt recovery ensure ]>

    show: -> @thrown

    is-statement: YES

    is-callable: -> @recovery?is-callable! and @attempt.is-callable!

    get-jump: -> @attempt.get-jump it or @recovery?get-jump it

    is-next-unreachable: -> @ensure?is-next-unreachable! or @attempt.is-next-unreachable! and (if @recovery? then that.is-next-unreachable! else true)

    make-return: ->
        @attempt .=make-return ...&
        @recovery?=make-return ...&
        this

    compile-node: (o) ->
        o.indent += TAB
        code = [sn(this, 'try '), (@compile-block o, @attempt)]
        if @recovery or not @ensure and JS ''
            code.push sn(that, ' catch (e$) '), (@compile-block o, that)
        if @ensure
            code.push sn(that, ' finally '), (@compile-block o, that)
        sn(null, ...code)

#### Switch
# Compiles to the regular JS `switch`-`case`-`default`,
# but with forced `break` after each cases.
class exports.Switch extends Node
    (@type, @topic, @cases, @default) ->
        if type is \match
            @topic = Arr topic if topic
        else
            if topic
                throw "can't have more than one topic in switch statement" if topic.length > 1
                @topic.=0
        if @cases.length and (last = @cases[*-1]).tests.length is 1
        and last.tests.0 instanceof Var and last.tests.0.value is \_
            @cases.pop!
            @default = last.body

    children: <[ topic cases default ]>

    a-source: \topic, aTargets: <[ cases default ]>

    show: -> @type

    is-statement: YES

    is-callable: ->
        for c in @cases when not c.is-callable! then return false
        if @default then @default.is-callable! else true

    get-jump: (ctx or {}) ->
        ctx.break = true
        for c in @cases then return that if c.body.get-jump ctx
        @default?get-jump ctx

    is-next-unreachable: ->
        for c in @cases then return false unless c.body.is-next-unreachable!
        @default?is-next-unreachable!

    make-return: ->
        for c in @cases then c.make-return ...&
        @default?make-return ...&
        this

    compile-node: (o) ->
        {tab} = this
        topic = if @type is \match
            [target-node, target] = Chain @topic .cache-reference o if @topic
            t = if target then [target-node] else []
            Block (t ++ [Literal \false]) .compile o, LEVEL_PAREN
        else
            !!@topic and @anaphorize!compile o, LEVEL_PAREN
        code  = [sn(this, "switch (", sn-safe(topic), ") {\n")]
        stop  = @default or @cases.length - 1
        o.break = true
        for c, i in @cases
            code.push (c.compile-case o, tab, i is stop, (@type is \match or !topic), @type, target)
        if @default
            o.indent = tab + TAB
            code.push tab + "default:\n", that, "\n" if @default.compile o, LEVEL_TOP
        sn(null, ...code, tab + \})

#### Case
class exports.Case extends Node
    (@tests, @body) ->

    children: <[ tests body ]>

    is-callable: -> @body.is-callable!

    make-return: ->
        @body.make-return ...& unless @body.lines[*-1]?value is \fallthrough
        this

    compile-case: (o, tab, nobr, bool, type, target) ->
        tests = []
        for test in @tests
            if test instanceof Arr and type isnt \match
                for t in test.items then tests.push t
            else tests.push test
        tests.length or tests.push Literal \void
        if type is \match
            for test, i in tests
                tar = Chain target .add Index (Literal i), \., true
                tests[i] = Parens (Chain test .auto-compare (if target then [tar] else null))
        if bool
            binary = if type is \match then \&& else \||
            [t] = tests
            i = 0
            while tests[++i] then t = Binary binary, t, that
            tests = [(@<<<{t, a-source: \t, aTargets: [\body]})anaphorize!invert!]
        code = []
        for t in tests then code.push tab, sn(t, "case ", (t.compile o, LEVEL_PAREN), ":\n")
        {lines} = @body
        last = lines[*-1]
        lines[*-1] = JS '// fallthrough' if ft = last?value is \fallthrough
        o.indent = tab += TAB
        code.push bodyCode, \\n     unless sn-empty(bodyCode = @body.compile o, LEVEL_TOP)
        code.push tab  + 'break;\n' unless nobr or ft or last?is-next-unreachable!
        sn(null, ...code)

#### If
# The `if`/`else` structure that acts as both statement and expression.
class exports.If extends Node
    (@if, @then, @un) ~>

    children: <[ if then else ]>

    a-source: \if, aTargets: [\then]

    show: -> @un and \!

    terminator: ''

    ::delegate <[ isCallable isArray isString isRegex isNextUnreachable ]> ->
        @else?[it]! and @then[it]!

    get-jump: -> @then.get-jump it or @else?get-jump it

    make-return: ->
        @then.=make-return ...&
        @else?=make-return ...&
        this

    compile-node: (o) ->
        if @un then @if.=invert! else @soak or @anaphorize!
        if o.level then @compile-expression o else @compile-statement o

    compile-statement: (o) ->
        code = [sn(this, "if (", (@if.compile o, LEVEL_PAREN), ") ")]
        o.indent += TAB
        code.push (@compile-block o, Block @then)
        return sn(null, ...code) unless els = @else
        sn(null, ...code, sn(els, ' else '), (if els instanceof constructor
            then els.compile o <<< indent: @tab, LEVEL_TOP
            else @compile-block o, els))

    compile-expression: (o) ->
        {then: thn, else: els or Literal \void} = this
        @void and thn.void = els.void = true
        if not @else and (@cond or @void)
            return Parens Binary \&& @if, (Parens thn.unwrap!) .compile o
        code = [sn(this, @if.compile o, LEVEL_COND)]
        pad  = if els.is-complex! then \\n + o.indent += TAB else ' '
        code.push "#pad", sn(thn, "? "), (thn.compile o, LEVEL_LIST), "#pad", sn(els, ": "), (els.compile o, LEVEL_LIST)
        if o.level < LEVEL_COND then sn(null, ...code) else sn(null, "(", code, ")")

    # Unfolds a node's child if soak,
    # then tuck the node under the created **If**.
    @unfold-soak = (o, parent, name) ->
        if parent[name]unfold-soak o
            parent[name] = that.then
            that <<< {parent.cond, parent.void, then: Chain parent}

#### Label
# A labeled block or statement.
class exports.Label extends Node
    (@label or \_, @it) ->
        @carp "can't use label with a curried function (attempted label '#{@label}')" if @it.curried
        if fun = it instanceof [Fun, Class] and it or
             it.calling and it.it.head
            fun.name or fun <<< {name: @label, +labeled}
            return it

    ::{children, is-callable, is-array} = Parens::

    show: -> @label

    is-statement: YES

    get-jump: (ctx or {}) ->
        (ctx.labels ?= []).push @label
        @it.get-jump ctx <<< {+\break}

    make-return: -> @it.=make-return ...&; this

    compile-node: (o) ->
        {label, it} = this
        labels = o.labels = [...o.labels or []]
        @carp "duplicate label \"#label\"" if label in labels
        labels.push label
        it.is-statement! or it = Block it
        sn(null, sn(this, label, ": "), (if it instanceof Block
            then o.indent += TAB; @compile-block o, it
            else it.compile o))

#### Cascade
class exports.Cascade extends Node
    (@input, @output, @prog1) ~>

    show: -> @prog1

    children: <[ input output ]>

    terminator: ''

    ::delegate <[ isCallable isArray isString isRegex ]> ->
        @[if @prog1 then \input else \output][it]!

    get-jump: -> @output.get-jump it

    make-return: (@ret) -> this

    compile-node: ({level}:o) ->
        {input, output, prog1, ref} = this
        if prog1 and (\ret of this or level and not @void)
            output.add (Literal(\..) <<< {+cascadee})
        if \ret of this
            output.=make-return @ret
        if ref
        then prog1 or output = Assign Var(ref), output
        else ref = o.scope.temporary \x
        if input instanceof Cascade
        then input <<< {ref}
        else input &&= Assign Var(ref), input
        o.level &&= LEVEL_PAREN
        code = [(input.compile o)]
        out  = Block output .compile o <<< ref: new String ref
        @carp "unreferred cascadee" if prog1 is \cascade and not o.ref.erred
        return sn(null, ...code, input.terminator, "\n", out) unless level
        code.push ", ", out
        if level > LEVEL_PAREN then sn(null, "(", ...code, ")") else sn(null, ...code)

#### JS
# Embedded JavaScript snippets.
class exports.JS extends Node
    (@code, @literal, @comment) ~>

    show: -> if @comment then @code else "`#{@code}`"

    terminator: ''

    ::is-assignable = ::is-callable = -> not @comment

    compile: -> sn(this, sn-safe(if @literal then entab @code, it.indent else @code))

#### Require
class exports.Require extends Node
    (@body) ~>

    children: <[ body ]>

    compile: (o) ->
        get-value = (item, throw-error) ~>
            | item instanceof Key     => item.name
            | item instanceof Var     => item.value
            | item instanceof Literal => item.value
            | otherwise               => if throw-error
                                   then @carp 'invalid require! argument'
                                   else item

        process-item = (item) ->
            [asg, value] = switch
            | item instanceof Prop    => [item.val, item.key ? item.val]
            | otherwise               => [item, item]
            asg-value = get-value asg
            to-asg = if typeof! asg-value is 'String' then CopyL asg, Var name-from-path asg-value else asg
            value = strip-string get-value value, true

            main = Chain (CopyL this, Var 'require') .add Call [Literal "'#value'"]

            sn(item, (Assign to-asg, main .compile o))

        if @body.items?
            code = []
            for item in @body.items
                code.push (process-item item), ";\n#{o.indent}"
            code.pop!
            sn(null, ...code)
        else
            sn(null, process-item @body)

#### Util
# A wrapper node for utility functions.
class exports.Util extends Node
    (@verb) ~>

    {(Jump::)show}

    is-callable: YES

    compile: -> sn(this, util @verb)

    ##### Util.Extends
    # An operator that sets up class-ical inheritance between two constructors,
    # returning the left one.
    @Extends = -> Call.make Util(\extend), &[0 1]

#### Vars
# Declares uninitialized variables.
class exports.Vars extends Node
    (@vars) ~>

    children: [\vars]

    make-return: THIS

    compile: (o, level) ->
        for {value}:v in @vars
            v.carp 'invalid variable declaration' unless v instanceof Var
            v.carp "redeclaration of \"#value\"" if o.scope.check value
            o.scope.declare value, v
        sn(this, (Literal \void .compile o, level))

#### Parser Utils
# Helpers for modifying nodes in [parser](../lib/parser.js).

exports.L = (a, b, node) ->
    if node && typeof node == "object"
        node <<<
            first_line: a.first_line+1
            first_column: a.first_column
            last_line: b.last_line+1
            last_column: b.last_column
            line: a.first_line+1
            column: a.first_column
    node

exports.CopyL = CopyL = (a, node) ->
    if node && typeof node == "object"
        node <<<
            first_line: a.first_line
            first_column: a.first_column
            last_line: a.last_line
            last_column: a.last_column
            line: a.line
            column: a.column
    node

exports.Box = (v) ->
    if typeof v == "object"
        v
    else
        new v.constructor(v)

exports.Decl = (type, nodes, lno) ->
    throw SyntaxError "empty #type on line #lno" unless nodes.0
    DECLS[type] nodes

DECLS =
    export: (lines) ->
        i = -1
        out = Util \out
        while node = lines[++i]
            if node instanceof Block
                lines.splice i-- 1 ...node.lines
                continue
            if node instanceof Fun and node.name
                lines.splice i++ 0 Assign Chain(out, [Index Key that]), Var that
                continue
            lines[i] =
                if node.var-name!
                or node instanceof Assign and node.left. var-name!
                or node instanceof Class  and node.title?var-name!
                then Assign Chain(out, [Index Key that]), node
                else Import out, node
        Block lines

    import: (lines, all) ->
        for line, i in lines then lines[i] = Import Literal(\this), line, all
        Block lines

    import-all: -> @import it, true

    const: (lines) ->
        for node in lines
            node.op is \= or node.carp 'invalid constant variable declaration'
            node.const = true
        Block lines

    var: Vars

##### Scope
# Regulates lexical scoping within LiveScript. As you
# generate code, you create a tree of scopes in the same shape as the nested
# functions. Each scope knows about the function parameters and the variables
# declared within it, and has references to its parent/shared enclosing scopes.
!function Scope @parent, @shared
    @variables = {}
Scope ::=
    READ_ONLY: const:\constant function:\function undefined:\undeclared

    # Adds a new variable or overrides an existing one.
    add: (name, type, node) ->
        if node and t = @variables"#name."
            if @READ_ONLY[t] or @READ_ONLY[type]
                node.carp "redeclaration of #that \"#name\""
            else if t is type is \arg
                node.carp "duplicate parameter \"#name\""
            else if t is \upvar
                node.carp "accidental shadow of \"#name\""
            return name if t in <[ arg function ]>
        # Dot-suffix to bypass `Object::` members.
        @variables"#name." = type
        name

    get: (name) -> @variables"#name."

    # Declares a variable unless declared already.
    declare: (name, node, constant) ->
        if @shared
            return if @check name
            scope = that
        else
            scope = this
        scope.add name, (if constant and name != "that" then \const else \var), node

    # Ensures that an assignment is made at the top of this scope.
    assign: (name, value) -> @add name, {value}

    # If we need to store an intermediate result, find an available name for a
    # compiler-generated variable. `var$`, `var1$`, and so on.
    temporary: (name || \ref) ->
        until @variables"#name\$." in [\reuse void]
            name = if name.length < 2 and name < \z
                then String.fromCharCode name.charCodeAt! + 1
                else name.replace /\d*$/ -> ++it
        @add name + \$, \var

    # Allows a variable to be reused.
    free: (name) -> @add name, \reuse

    # Checks to see if a variable has already been declared.
    # Walks up the scope if `above` flag is specified.
    check: (name, above) ->
        return type if (type = @variables"#name.") or not above
        @parent?check name, above

    # Checks if a variable can be reassigned.
    check-read-only: (name) ->
        return that if @READ_ONLY[@check name, true]
        @variables"#name." ||= \upvar
        ''

    # Concatenates the declarations in this scope.
    emit: (code, tab) ->
        vrs = []
        asn = []
        fun = []
        for name, type of @variables
            name.=slice 0 -1
            if type in <[ var const reuse ]>
                vrs.push name, ", "
            else if type.value
                if ~(val = entab that, tab).to-string!.last-index-of \function( 0
                    if val instanceof SourceNode
                        sn-remove-left(val, 8)
                    else
                        val = val.slice(8)
                    fun.push "function ", name, val, "\n#tab"
                else
                    asn.push name, " = ", val, ", "
        declCode = vrs.concat asn
        declCode.pop!
        fun.pop!
        code = sn(this, "#{tab}var ", ...declCode, ";\n", code) if declCode.length > 0
        if fun.length > 0 then sn(this, code, "\n#tab", ...fun) else sn(this, code)

##### Constants

function YES  then true
function NO   then false
function THIS then this
function VOID then void

UTILS =
    # Creates an object's prototypal child, ensuring `__proto__`.
    clone: '''function(it){
      function fun(){} fun.prototype = it;
      return new fun;
    }'''
    # Sets up `.prototype` between a pair of constructors
    # as well as `.constructor` and `.superclass` references.
    extend: '''function(sub, sup){
      function fun(){} fun.prototype = (sub.superclass = sup).prototype;
      (sub.prototype = new fun).constructor = sub;
      if (typeof sup.extended == 'function') sup.extended(sub);
      return sub;
    }'''

    # Creates a bound method.
    bind: '''function(obj, key, target){
      return function(){ return (target || obj)[key].apply(obj, arguments) };
    }'''

    # Copies properties from right to left.
    import: '''function(obj, src){
      var own = {}.hasOwnProperty;
      for (var key in src) if (own.call(src, key)) obj[key] = src[key];
      return obj;
    }'''
    import-all: '''function(obj, src){
      for (var key in src) obj[key] = src[key];
      return obj;
    }'''
    copy-without: '''function(src, ex){
      var obj = {}, own = {}.hasOwnProperty;
      for (var key in src) if (own.call(src, key) && !own.call(ex, key)) obj[key] = src[key];
      return obj;
    }'''

    repeat-string: '''function(str, n){
      for (var r = ''; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;
      return r;
    }'''
    repeat-array: '''function(arr, n){
      for (var r = []; n > 0; (n >>= 1) && (arr = arr.concat(arr)))
        if (n & 1) r.push.apply(r, arr);
      return r;
    }'''

    in: '''function(x, xs){
      var i = -1, l = xs.length >>> 0;
      while (++i < l) if (x === xs[i]) return true;
      return false;
    }'''

    out: '''typeof exports != 'undefined' && exports || this'''

    curry: '''function(f, bound){
      var context,
      _curry = function(args) {
        return f.length > 1 ? function(){
          var params = args ? args.concat() : [];
          context = bound ? context || this : this;
          return params.push.apply(params, arguments) <
              f.length && arguments.length ?
            _curry.call(context, params) : f.apply(context, params);
        } : f;
      };
      return _curry();
    }'''

    flip: '''function(f){
      return curry$(function (x, y) { return f(y, x); });
    }'''

    partialize: '''function(f, args, where){
      var context = this;
      return function(){
        var params = slice$.call(arguments), i,
            len = params.length, wlen = where.length,
            ta = args ? args.concat() : [], tw = where ? where.concat() : [];
        for(i = 0; i < len; ++i) { ta[tw[0]] = params[i]; tw.shift(); }
        return len < wlen && len ?
          partialize$.apply(context, [f, ta, tw]) : f.apply(context, ta);
      };
    }'''
    not: '''function(x){ return !x; }'''
    compose: '''function() {
      var functions = arguments;
      return function() {
        var i, result;
        result = functions[0].apply(this, arguments);
        for (i = 1; i < functions.length; ++i) {
          result = functions[i](result);
        }
        return result;
      };
    }'''

    # modified version of underscore.js's _.isEqual and eq functions
    deep-eq: '''function(x, y, type){
      var toString = {}.toString, hasOwnProperty = {}.hasOwnProperty,
          has = function (obj, key) { return hasOwnProperty.call(obj, key); };
      var first = true;
      return eq(x, y, []);
      function eq(a, b, stack) {
        var className, length, size, result, alength, blength, r, key, ref, sizeB;
        if (a == null || b == null) { return a === b; }
        if (a.__placeholder__ || b.__placeholder__) { return true; }
        if (a === b) { return a !== 0 || 1 / a == 1 / b; }
        className = toString.call(a);
        if (toString.call(b) != className) { return false; }
        switch (className) {
          case '[object String]': return a == String(b);
          case '[object Number]':
            return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
          case '[object Date]':
          case '[object Boolean]':
            return +a == +b;
          case '[object RegExp]':
            return a.source == b.source &&
                   a.global == b.global &&
                   a.multiline == b.multiline &&
                   a.ignoreCase == b.ignoreCase;
        }
        if (typeof a != 'object' || typeof b != 'object') { return false; }
        length = stack.length;
        while (length--) { if (stack[length] == a) { return true; } }
        stack.push(a);
        size = 0;
        result = true;
        if (className == '[object Array]') {
          alength = a.length;
          blength = b.length;
          if (first) {
            switch (type) {
            case '===': result = alength === blength; break;
            case '<==': result = alength <= blength; break;
            case '<<=': result = alength < blength; break;
            }
            size = alength;
            first = false;
          } else {
            result = alength === blength;
            size = alength;
          }
          if (result) {
            while (size--) {
              if (!(result = size in a == size in b && eq(a[size], b[size], stack))){ break; }
            }
          }
        } else {
          if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) {
            return false;
          }
          for (key in a) {
            if (has(a, key)) {
              size++;
              if (!(result = has(b, key) && eq(a[key], b[key], stack))) { break; }
            }
          }
          if (result) {
            sizeB = 0;
            for (key in b) {
              if (has(b, key)) { ++sizeB; }
            }
            if (first) {
              if (type === '<<=') {
                result = size < sizeB;
              } else if (type === '<==') {
                result = size <= sizeB
              } else {
                result = size === sizeB;
              }
            } else {
              first = false;
              result = size === sizeB;
            }
          }
        }
        stack.pop();
        return result;
      }
    }'''

    array-from: 'Array.from || function(x){return slice$.call(x);}'

    # Shortcuts to speed up the lookup time for native methods.
    split    : "''.split"
    replace  : "''.replace"
    to-string: '{}.toString'
    join     : '[].join'
    slice    : '[].slice'
    splice   : '[].splice'

# Each level indicates a node's position in the AST.
LEVEL_TOP    = 0  # ...;
LEVEL_PAREN  = 1  # (...)
LEVEL_LIST   = 2  # [...]
LEVEL_COND   = 3  # ... ? x : y
LEVEL_OP     = 4  # !...
LEVEL_CALL   = 5  # ...()

# Operator precedences.
let @ = PREC = {unary: 0.9}
    @\&& = @\|| = @\xor                             = 0.2
    @\.&.  = @\.^.  = @\.|.                         = 0.3
    @\== = @\!= = @\~= = @\!~= = @\=== = @\!==      = 0.4
    @\<  = @\>  = @\<=  = @\>= = @of = @instanceof  = 0.5
    @\<<= = @\>>= = @\<== = @\>== = @\++            = 0.5
    @\.<<. = @\.>>. = @\.>>>.                       = 0.6
    @\+  = @\-                                      = 0.7
    @\*  = @\/  = @\%                               = 0.8

TAB = ' ' * 2

ID = /^(?!\d)[\w$\xAA-\uFFDC]+$/

SIMPLENUM = /^\d+$/

##### Helpers

# Declares a utility function at the top level.
function util then Scope.root.assign it+\$ UTILS[it]

function entab code, tab then code.replace /\n/g \\n + tab
