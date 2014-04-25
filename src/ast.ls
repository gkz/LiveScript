# Contains all of the node classes for the AST (abstract syntax tree).
# Most nodes are created as the result of actions in the [grammar](#grammar),
# but some are created by other nodes as a method of code generation.
# To convert the syntax tree into a string of JavaScript code,
# call `Block::compileRoot`.

require! {
  'prelude-ls': {fold}
  path
}

### Node
# The abstract base class for all nodes in the syntax tree.
# Each subclass implements the `compileNode` method, which performs the
# code generation for that node. To compile a node to JavaScript,
# call `compile` on it, which wraps `compileNode` in some generic extra smarts.
# An options hash is passed and cloned throughout, containing information about
# the environment from higher in the tree (such as if a returned value is
# being requested by the surrounding function), information about the current
# scope, and indentation level.
(Node = -> ...):: =
  compile: (options, level) ->
    o = {} <<< options
    o.level? = level
    node = @unfoldSoak o or this
    # If a statement appears within an expression, wrap it in a closure.
    return node.compileClosure o if o.level and node.isStatement!
    code = (node import tab: o.indent)compileNode o
    if node.temps then for tmp in that then o.scope.free tmp
    code

  compileClosure: (o) ->
    # A statement that _jumps_ out of current context (like `return`) can't be
    # an expression via closure-wrapping, as its meaning will change.
    that.carp 'inconvertible statement' if @getJump!
    fun = Fun [] Block this; call = Call!
    var hasArgs, hasThis
    @traverseChildren !->
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
    Parens(Chain fun<<<{+wrapper, @void} [call]; true)compile o

  # Compiles a child node as a block statement.
  compileBlock: (o, node) ->
    if node?compile o, LEVEL_TOP then "{\n#that\n#{@tab}}" else '{}'

  # If the code generation wishes to use the result of a complex expression
  # in multiple places, ensure that the expression is only ever evaluated once,
  # by assigning it to a temporary variable.
  cache: (o, once, level) ->
    unless @isComplex!
      return [if level? then @compile o, level else this] * 2
    sub = Assign ref = Var(o.scope.temporary!), this
    # Pass a `level` to precompile.
    if level?
      sub.=compile o, level
      o.scope.free ref.value if once
      return [sub, ref.value]
    # If flagged as `once`, the tempvar will be auto-freed.
    if once then [sub, ref <<< {+temp}] else [sub, ref, [ref.value]]

  # Compiles to a variable/source pair suitable for looping.
  compileLoopReference: (o, name, ret) ->
    if this instanceof Var   and o.scope.check @value
    or this instanceof Unary and @op in <[ + - ]> and -1/0 < +@it.value < 1/0
    or this instanceof Literal and not @isComplex!
      return [@compile o] * 2
    asn = Assign Var(tmp = o.scope.temporary name), this
    ret or asn.void = true
    [tmp; asn.compile o, if ret then LEVEL_CALL else LEVEL_PAREN]

  # Passes each child to a function, returning its return value if exists.
  eachChild: (fn) ->
    for name in @children when child = @[name]
      if \length of child
        for node, i in child then return that if fn(node, name, i)
      else return that if fn(child, name   )?

  # Performs `eachChild` on every descendant.
  # Overridden by __Fun__ not to cross scope by default.
  traverseChildren: (fn, xscope) ->
    @eachChild (node, name, index) ~>
      fn(node, this, name, index) ? node.traverseChildren fn, xscope

  # Performs anaphoric conversion if a `that` is found within `@aTargets`.
  anaphorize: ->
    @children = @aTargets
    if @eachChild hasThat
      if (base = this)[name = @aSource] instanceof Existence
        base.=[name]; name = \it
      unless base[name]value is \that
        base[name] = Assign Var(\that), base[name]
    function hasThat
      it.value is \that or if it.aSource
      then hasThat that if it[that]
      else it.eachChild hasThat
    delete @children
    @[@aSource] <<< {+cond}

  # Throws a syntax error, appending `@line` number to the message.
  carp: (msg, type = SyntaxError) ->
    throw type "#msg on line #{ @line or @traverseChildren -> it.line }"

  # Defines delegators.
  delegate: !(names, fn) ->
    for let name in names
      @[name] = -> fn.call this, name, it

  # Default implementations of the common node properties and methods. Nodes
  # will override these with custom logic, if needed.
  children: []

  terminator: \;

  isComplex: YES

  isStatement  : NO
  isAssignable : NO
  isCallable   : NO
  isEmpty      : NO
  isArray      : NO
  isString     : NO
  isRegex      : NO

  isMatcher: -> @isString! or @isRegex!

  # Do I assign a certain variable?
  assigns: NO

  # Picks up name(s) from LHS.
  ripName: VOID

  unfoldSoak   : VOID
  unfoldAssign : VOID
  unparen      : THIS
  unwrap       : THIS
  maybeKey     : THIS
  expandSlice  : THIS
  varName      : String
  getAccessors : VOID
  getCall      : VOID
  getDefault   : VOID
  # Digs up a statement that jumps out of this node.
  getJump      : VOID

  invert: -> Unary \! this, true

  invertCheck: ->
    if it.inverted then @invert! else this

  addElse: (@else) -> this

  # Constructs a node that returns the current node's result.
  makeReturn: (arref) ->
    if arref then Call.make JS(arref + \.push), [this] else Return this

  makeObjReturn: (arref) ->
    if arref
      base = this.lines.0
      base.=then.lines.0 if this.lines.0 instanceof If
      items = base.items
      if not items.0? or not items.1?
        @carp 'must specify both key and value for object comprehension'
      Assign (Chain Var arref).add(Index items.0, \., true), items.1
    else Return this

  # Extra info for `toString`.
  show: String

  # String representation of the node for inspecting the parse tree.
  # This is what `livescript --ast` prints out.
  toString: (idt or '') ->
    tree  = \\n + idt + @constructor.displayName
    tree += ' ' + that if @show!
    @eachChild !-> tree += it.toString idt + TAB
    tree

  # JSON serialization
  stringify : (space) -> JSON.stringify this, null space
  toJSON    : -> {type: @constructor.displayName, ...this}

# JSON deserialization
exports.parse    = (json) -> exports.fromJSON JSON.parse json
exports.fromJSON = function
  return it unless it and typeof it is \object
  if it.type
    node = ^^exports[that]::
    for key, val of it then node[key] = fromJSON val
    return node
  if it.length? then [fromJSON v for v in it] else it

#### Mixins

Negatable =
  show   : -> @negated and \!
  invert : -> !=@negated; this

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

  toJSON: -> delete @back; super!

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
    {lines} = this; i = lines.length
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

  isComplex: -> @lines.length > 1 or @lines.0?isComplex!

  ::delegate <[ isCallable isArray isString isRegex ]> -> @lines[*-1]?[it]!

  getJump: -> for node in @lines then return that if node.getJump it

  # **Block** does not return its entire body, rather it
  # ensures that the final line is returned.
  makeReturn: ->
    @chomp!
    if @lines[*-1]?=makeReturn it
      --@lines.length if that instanceof Return and not that.it
    this

  compile: (o, level ? o.level) ->
    return @compileExpressions o, level if level
    o.block = this; tab = o.indent
    codes = for node in @lines
      node = node.unfoldSoak o or node
      continue unless code = (node <<< {+front})compile o, level
      node.isStatement! or code += node.terminator
      tab + code
    codes.join \\n

  # **Block** is the only node that can serve as the root.
  compileRoot: (options) ->
    o = {level: LEVEL_TOP, scope: @scope = Scope.root = new Scope, ...options}
    if saveTo = delete o.saveScope
       o.scope = saveTo.savedScope or= o.scope # use savedScope as your scope
    delete o.filename
    o.indent = if bare = delete o.bare then '' else TAB
    if /^\s*(?:[/#]|javascript:)/test @lines.0?code
      prefix = @lines.shift!code + \\n
    if delete o.eval and @chomp!lines.length
      if bare then @lines.push Parens @lines.pop! else @makeReturn!
    code = @compileWithDeclarations o
    # Wrap everything in a safety closure unless requested not to.
    bare or code = "(function(){\n#code\n}).call(this);\n"
    [prefix] + code

  # Compile to a function body.
  compileWithDeclarations: (o) ->
    o.level = LEVEL_TOP
    pre = ''
    if i = @neck!
      rest   = @lines.splice i, 9e9
      pre    = @compile o
      @lines = rest
    return pre unless post = @compile o
    (pre and "#pre\n") + if @scope then that.emit post, o.indent else post

  # Compile to a comma-separated list of expressions.
  compileExpressions: (o, level) ->
    {lines} = @chomp!; i = -1
    while lines[++i] then lines.splice i-- 1 if that.comment
    lines.push Literal \void unless lines.length
    lines.0 <<< {@front}; lines[*-1] <<< {@void}
    return lines.0.compile o, level unless lines.1
    code = ''; last = lines.pop!
    for node in lines then code += (node <<< {+void})compile(o, LEVEL_PAREN) + ', '
    code += last.compile o, LEVEL_PAREN
    if level < LEVEL_LIST then code else "(#code)"

#### Atom
# An abstract node for simple values.
class Atom extends Node
  show      : -> @value
  isComplex : NO

#### Literal
# `this`, `debugger`, regexes and primitives.
class exports.Literal extends Atom
  (@value) ~>
    return JS "#value" true if value.js
    return new Super        if value is \super

  isEmpty    : -> @value in <[ void null ]>
  isCallable : -> @value in <[ this eval .. ]>
  isString   : -> 0 <= '\'"'indexOf "#{@value}"charAt!
  isRegex    : -> "#{@value}"charAt! is \/
  isComplex  : -> @isRegex! or @value is \debugger
  isWhat     : ->
    | @isEmpty!    => \empty
    | @isCallable! => \callable
    | @isString!   => \string
    | @isRegex!    => \regex
    | @isComplex!  => \complex
    | otherwise    => void

  varName: -> if /^\w+$/test @value then \$ + @value else ''

  make-return: ->
    if not it and @value is 'debugger'
      this
    else
      super ...

  compile: (o, level ? o.level) ->
    switch val = "#{@value}"
    | \this      => return o.scope.fun?bound or val
    | \void      =>
      return '' unless level
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
      return "(function(){ debugger; }())" if level
    val

#### Var
# Variables.
class exports.Var extends Atom
  (@value) ~>

  ::isAssignable = ::isCallable = YES

  assigns: -> it is @value

  maybeKey: -> Key(@value) <<< {@line}

  varName: ::show

  compile: (o) -> if @temp then o.scope.free @value else @value

#### Key
# A property name in the form of `{key: _}` or `_.key`.
class exports.Key extends Node
  (name, @reserved or name.reserved) ~> @name = '' + name

  isComplex: NO

  assigns: -> it is @name

  varName: ->
    {name} = this
    if @reserved or name in <[ arguments eval ]> then "$#name" else name

  compile: ::show = -> if @reserved then "'#{@name}'" else @name

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
    import {key, symbol}

  children: [\key]

  show: -> [\? if @soak] + @symbol

  isComplex: -> @key.isComplex!

  varName: -> @key instanceof [Key, Literal] and @key.varName!

  compile: (o) ->
    code = @key.compile o, LEVEL_PAREN
    if @key instanceof Key and \' is not code.charAt 0
    then ".#code" else "[#code]"

#### Slice
# slices away at the target
class exports.Slice extends Node
  ({@type, @target, @from, @to}) ~>
    @from ?= Literal 0
    @to = Binary \+ @to, Literal \1 if @to and @type is \to

  children: [\target \from \to]

  show: -> @type

  compileNode: (o) ->
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
    import {head, tails or []}

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
        last.args[index] = it.args.0 # extract the single arg from pipe call
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
    else if delete it.vivify
      @head = Assign Chain(@head, @tails.splice 0, 9e9), that!, \= \||
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
        test = this.head
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

  flipIt: -> @flip = true; this

  # __Chain__ can be unwrapped as its inner node, if there are no subnodes.
  unwrap: -> if @tails.length then this else @head

  ::delegate <[ getJump assigns isStatement isString ]>
           , (it, arg) -> not @tails.length and @head[it] arg

  isComplex  : -> @tails.length or @head.isComplex!
  isCallable : ->
    if @tails[*-1] then not that.key?items else @head.isCallable!
  isArray    : ->
    if @tails[*-1] then that.key instanceof Arr else @head.isArray!
  isRegex    : ->
    @head.value is \RegExp and not @tails.1 and @tails.0 instanceof Call

  isAssignable: ->
    return @head.isAssignable! unless tail = @tails[*-1]
    return false if tail not instanceof Index
                 or tail.key instanceof List
                 or tail.symbol is \.~
    for tail in @tails when tail.assign then return false
    true

  # `@$` `o.0`
  isSimpleAccess: ->
    @tails.length is 1 and not @head.isComplex! and not @tails.0.isComplex!

  makeReturn: -> if @tails.length then super ... else @head.makeReturn it

  getCall: -> (tail = @tails[*-1]) instanceof Call and tail

  varName: -> @tails[*-1]?varName!

  # A reference has base part (`this` value) and name part.
  # We cache them separately for compiling complex expressions, so that e.g.
  #
  #     a()[b()] ||= c
  #
  # compiles to
  #
  #     (ref$ = a())[key$ = b()] || (ref$[key$] = c);
  #
  cacheReference: (o) ->
    name = @tails[*-1]
    # `a.b()`
    return @unwrap!cache o, true unless @isAssignable!
    # `a` `a.b`
    if @tails.length < 2 and not @head.isComplex! and not name?isComplex!
      return [this] * 2
    base = Chain @head, @tails.slice 0 -1
    # `a().b`
    if base.isComplex!
      ref  = o.scope.temporary!
      base = Chain Assign Var(ref), base
      bref = Var(ref) <<< {+temp}
    # `a{}`
    return [base, bref] unless name
    # `a[b()]`
    if name.isComplex!
      ref  = o.scope.temporary \key
      name = Index Assign Var(ref), name.key
      nref = Index Var(ref) <<< {+temp}
    [base.add name; Chain bref || base.head, [nref or name]]

  compileNode: (o) ->
    if @flip
      util \flip
      util \curry
    {head, tails} = this; head <<< {@front, @newed}
    return head.compile o unless tails.length
    return that.compile o if @unfoldAssign o
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
    @carp 'invalid callee' if tails.0 instanceof Call and not head.isCallable!
    @expandSlice o; @expandBind o; @expandSplat o; @expandStar o
    if @splatted-new-args
      idt = o.indent + TAB
      func = Chain @head, tails.slice 0 -1
      return """
        (function(func, args, ctor) {
        #{idt}ctor.prototype = func.prototype;
        #{idt}var child = new ctor, result = func.apply(child, args), t;
        #{idt}return (t = typeof result)  == "object" || t == "function" ? result || child : child;
        #{TAB}})(#{ func.compile o}, #{@splatted-new-args}, function(){})
      """
    return @head.compile o unless @tails.length
    base = @head.compile o, LEVEL_CALL; news = rest = ''
    for t in @tails
      news += 'new ' if t.new
      rest += t.compile o
    base += ' ' if \. is rest.charAt 0 and SIMPLENUM.test base
    news + base + rest

  # Unfolds a soak into an __If__: `a?.b` => `a.b if a?`
  unfoldSoak: (o) ->
    if @head.unfoldSoak o
      that.then.tails.push ...@tails
      return that
    for node, i in @tails when delete node.soak
      bust = Chain @head, @tails.splice 0 i
      node.carp 'invalid accessign' if node.assign and not bust.isAssignable!
      if i and (node.assign or node instanceof Call)
        [test, bust] = bust.cacheReference o
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

  unfoldAssign: (o) ->
    if @head.unfoldAssign o
      that.right.tails.push ...@tails
      return that
    for index, i in @tails then if op = index.assign
      index.assign = ''
      left = Chain @head, @tails.splice 0 i .expandSlice o .unwrap!
      if left instanceof Arr
        # `[a, b].=reverse()` => `[a, b] = [a, b].reverse()`
        lefts = left.items; {items: rites} = @head = Arr!
        for node, i in lefts
          [rites[i], lefts[i]] = Chain node .cacheReference o
      else
        [left, @head] = Chain left .cacheReference o
      op = \:= if op is \=
      return Assign(left, this, op) <<< {+access}

  expandSplat: !(o) ->
    {tails} = this; i = -1; while call = tails[++i]
      continue unless args = call.args
      ctx = call.method is \.call and (args.=concat!)shift!
      continue unless args = Splat.compileArray o, args, true
      if call.new
        @splatted-new-args = args
      else
        if not ctx and tails[i-1] instanceof Index
          [@head, ctx] = Chain(@head, tails.splice 0 i-1)cache o, true
          i = 0
        call <<< method: \.apply, args: [ctx or Literal \null; JS args]

  expandBind: !(o) ->
    {tails} = this; i = -1; while tails[++i]
      continue unless that.symbol is \.~
      that.symbol = ''
      obj   = Chain(@head, tails.splice 0 i)unwrap!
      {key} = tails.shift!
      call  = Call.make Util(\bind), [obj, key <<< {+reserved}]
      @head = if @newed then Parens call, true else call
      i = -1

  expandStar: !(o) ->
    {tails} = this; i = -1; while tails[++i]
      continue if that.args or that.stars or that.key instanceof Key
      stars = that.stars = []
      that.eachChild seek
      continue unless stars.length
      [sub, ref, temps] = Chain(@head, tails.splice 0 i)unwrap!cache o
      value = Chain(ref, [Index Key \length])compile o
      for star in stars then star <<< {value, isAssignable: YES}
      @head = JS sub.compile(o, LEVEL_CALL) + tails.shift!compile o
      o.scope.free temps.0 if temps
      i = -1
    !function seek
      if it.value is \*               then stars.push it
      else unless it instanceof Index then it.eachChild seek

  # `a[x, y] = b{z} = c` => `[a[x], a[y]] = {z: b.z} = c`
  expandSlice: (o, assign) ->
    {tails} = this; i = -1
    while tail = tails[++i] when tail.key?items
      tail.carp 'calling a slice' if tails[i+1] instanceof Call
      x = tails.splice 0 i+1
      x = x.pop!key.toSlice o, Chain(@head, x)unwrap!, tail.symbol, assign
      @head = x <<< {@front}
      i = -1
    this

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
    import {args}

  children: [\args]

  show: -> [@new] + [@method] + [\? if @soak]

  compile: (o) ->
    code  =  (@method or '') + \( + (if @pipe then "\n#{o.indent}" else '')
    for a, i in @args then code += (if i then ', ' else '') + a.compile o, LEVEL_LIST
    code + \)
  @make = (callee, args, opts) ->
    call = Call args
    call <<< opts if opts
    Chain(callee)add call

  @block = (fun, args, method) ->
    Parens(Chain fun, [Call(args) <<< {method}]; true) <<< {+calling}

  @back = (params, node, bound, curried) ->
    fun = Fun params,, bound, curried
    node.=it if fun.hushed = node.op is \!
    if node instanceof Label
      fun <<< {name: node.label, +labeled}
      node.=it
    node.=it if not fun.hushed and fun.hushed = node.op is \!
    node.getCall!?partialized = null
    {args} = node.getCall! or (node = Chain node .add Call!)getCall!
    index = 0
    for a in args
      break if a.placeholder
      ++index
    node <<< back: (args[index] = fun)body

  @let = (args, body) ->
    params = for a, i in args
      if a.op is \= and not a.logic and a.right
        args[i] = that
        continue if i is 0 and gotThis = a.left.value is \this
        a.left
      else Var a.varName! || a.carp 'invalid "let" argument'
    gotThis or args.unshift Literal \this
    @block Fun(params, body), args, \.call

#### List
# An abstract node for a list of comma-separated items.
class List extends Node
  children: [\items]

  show  : -> @name
  named : (@name) -> this

  isEmpty : -> not @items.length
  assigns : -> for node in @items then return true if node.assigns it

  @compile = (o, items, deepEq) ->
    switch items.length
    | 0 => return ''
    | 1 => return items.0.compile o, LEVEL_LIST
    {indent, level} = o
    o <<< indent: indent + TAB, level: LEVEL_LIST
    code  = items[i = 0]compile o
    while items[++i]
      code += ', '
      target = that
      if deepEq
        if target instanceof Var and target.value is \_
          target = Obj [Prop (Key \__placeholder__), Literal true]
        else if target instanceof [Obj, Arr]
          target.deepEq = true
      code += target.compile o
    code  = "\n#{o.indent}#code\n#indent" if ~code.indexOf \\n
    o <<< {indent, level}
    code

#### Obj
# `{x: y}`
class exports.Obj extends List
  (@items or []) ~>

  asObj: THIS

  # `base{x: y}` => `{x: base.y}`
  toSlice: (o, base, symbol, assign) ->
    {items} = this
    if items.length > 1 then [base, ref, temps] = base.cache o else ref = base
    for node, i in items
      continue if node.comment
      if node instanceof [Prop, Splat]
        node[name = node.children[*-1]] =
          chain = Chain base, [Index node[name]maybeKey!]
      else
        # `o{k or v}` => `{k: a.k or v}`
        node.=first if logic = node.getDefault!
        if node instanceof Parens
          # `a{(++i)}` => `{(ref$ = ++i): a[ref$]}`
          [key, node] = node.cache o, true
          # `a{(++i)} = b` => `{(ref$): a[ref$ = ++i]} = b`
          #                => `a[ref$ = ++i] = b[ref$]`
          [key, node] = [node, key] if assign
          key = Parens key
        else key = node
        val = chain = Chain base, [Index node.maybeKey!, symbol]
        val = logic <<< first: val if logic
        items[i] = Prop key, val
      base = ref
    chain or @carp 'empty slice'
    (chain.head = Var temps.0)temp = true if temps
    this

  compileNode: (o) ->
    {items} = this
    return (if @front then '({})' else '{}') unless items.length
    code = ''; idt = \\n + o.indent += TAB; dic = {}
    for node, i in items
      if node.comment
        code += idt + node.compile o
        continue
      node.=first if logic = node.getDefault!
      if node instanceof Splat or (node.key or node) instanceof Parens
        rest = items.slice i
        break
      if logic
        # `{@a or b}` => `{a: @a or b}`
        if node instanceof Prop
        then node.val = logic <<< first: node.val
        else node = Prop node, logic <<< first: node
      if @deepEq and node instanceof Prop
        if node.val instanceof Var and node.val.value is \_
        then node.val = Obj [Prop (Key \__placeholder__), Literal true]
        else if node.val instanceof [Obj, Arr] then node.val.deepEq = true
      if multi then code += \, else multi = true
      code += idt + if node instanceof Prop
        {key, val} = node
        if node.accessor
          node.compileAccessor o, key.=compile o
        else
          val.ripName key
          "#{ key.=compile o }: #{ val.compile o, LEVEL_LIST }"
      else
        "#{ key = node.compile o }: #key"
      # Canonicalize the key, e.g.: `0.0` => `0`
      ID.test key or key = do Function "return #key"
      node.carp "duplicate property \"#key\"" unless dic"#key." .^.= 1
    code = "{#{ code and code + \\n + @tab }}"
    rest and code = Import(JS code; Obj rest)compile o <<< indent: @tab
    if @front and \{ is code.charAt! then "(#code)" else code

#### Prop
# `x: y`
class exports.Prop extends Node
  (@key, @val) ~>
    return Splat @val if key.value is \...
    if val.getAccessors!
      @val = that
      for fun in that
        fun.x = if fun.hushed = fun.params.length then \s else \g
      import {\accessor}

  children: <[ key val ]>

  show: -> @accessor

  assigns: -> @val.assigns? it

  compileAccessor: (o, key) ->
    funs = @val
    if funs.1 and funs.0.params.length + funs.1.params.length is not 1
      funs.0.carp 'invalid accessor parameter'
    do
      for fun in funs
        fun.accessor = true
        "#{fun.x}et #key#{ fun.compile o, LEVEL_LIST .slice 8 }"
    .join ',\n' + o.indent

  compileDescriptor: (o) ->
    obj = Obj!
    for fun in @val then obj.items.push Prop Key(fun.x + \et  ), fun
    obj.items.push Prop Key(\configurable), Literal true
    obj.items.push Prop Key(\enumerable  ), Literal true
    obj.compile o

#### Arr
# `[x, y]`
class exports.Arr extends List
  (@items or []) ~>

  isArray: YES

  asObj: -> Obj([Prop Literal(i), item for item, i in @items])

  # `base[x, ...y]` => `[base[x], ...base[y]]`
  toSlice: (o, base, symbol) ->
    {items} = this
    if items.length > 1 then [base, ref] = base.cache o else ref = base
    for item, i in items
      item.=it if splat = item instanceof Splat
      continue if item.isEmpty!
      chain = Chain base, [Index item, symbol]
      items[i] = if splat then Splat chain else chain
      base = ref
    chain or @carp 'empty slice'
    this

  compile: (o) ->
    {items} = this
    return '[]' unless items.length
    if code = Splat.compileArray o, items
      return if @newed then "(#code)" else code
    "[#{ List.compile o, items, @deepEq }]"

  @maybe = (nodes) ->
    return nodes.0 if nodes.length is 1 and nodes.0 not instanceof Splat
    constructor nodes

  @wrap = -> constructor [Splat it <<< isArray: YES]

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
        for node in it.tails or ''
          if node instanceof Call and not node.new
            node.args.shift! if node.method is \.call
            node <<< {\new, method: ''}
            return it
      case \~ then if it instanceof Fun and it.statement and not it.bound
        return it <<< bound: \this$
    import {op, it}

  children: [\it]

  show: -> [\@ if @post] + @op

  isCallable: -> @op in <[ do new delete ]> or not @it?

  isArray: -> @it instanceof Arr   and @it.items.length
           or @it instanceof Chain and @it.isArray!

  isString: -> @op in <[ typeof classof ]>

  invert: ->
    return @it if @op is \! and @it.op in <[ ! < > <= >= of instanceof ]>
    constructor \! this, true

  unfoldSoak: (o) ->
    @op in <[ ++ -- delete ]> and @it? and If.unfoldSoak o, this, \it

  getAccessors: ->
    return unless @op is \~
    return [@it] if @it instanceof Fun
    if @it instanceof Arr
      {items} = @it
      return items if not items.2
                   and items.0 instanceof Fun
                   and items.1 instanceof Fun

  function crement then {'++':\in '--':\de}[it] + \crement

  compileNode: (o) ->
    return @compileAsFunc o if not @it?
    return that if @compileSpread o
    {op, it} = this
    switch op
    case \!   then it.cond = true
    case \new then it.isCallable! or it.carp 'invalid constructor'
    case \do
      # `do f?` => `f?()`
      if o.level is LEVEL_TOP and it instanceof Fun and it.is-statement!
        return "#{ it.compile o } #{ Unary \do Var it.name .compile o }"
      x = Parens if it instanceof Existence and not it.negated
                 then Chain(it)add Call!
                 else Call.make it
      return (x <<< {@front, @newed})compile o
    case \delete
      @carp 'invalid delete' if it instanceof Var or not it.isAssignable!
      return @compilePluck o if o.level and not @void
    case \++ \--
      it.isAssignable! or @carp 'invalid ' + crement op
      if it instanceof Var and o.scope.checkReadOnly it.value
        @carp "#{ crement op } of #that \"#{it.value}\"" ReferenceError
      it{front} = this if @post
    case \^^ then return "#{ util \clone }(#{ it.compile o, LEVEL_LIST })"
    case \jsdelete then return "delete #{ it.compile o, LEVEL_LIST }"
    case \classof
      return "#{ util \toString }.call(
              #{ it.compile o, LEVEL_LIST }).slice(8, -1)"
    code = it.compile o, LEVEL_OP + PREC.unary
    if @post then code += op else
      op = 'yield* ' if op is \yieldfrom
      op += ' ' if op in <[ new typeof delete yield ]>
                or op in <[ + - ]> and op is code.charAt!
      code = op + code
    if o.level < LEVEL_CALL then code else "(#code)"

  # `^delete o[p, ...q]` => `[^delete o[p], ...^delete o[q]]`
  compileSpread: (o) ->
    {it} = this; ops = [this]
    while it instanceof constructor, it.=it then ops.push it
    return '' unless it.=expandSlice(o)unwrap! instanceof Arr
                 and (them = it.items)length
    for node, i in them
      node.=it if sp = node instanceof Splat
      for op in ops by -1 then node = constructor op.op, node, op.post
      them[i] = if sp then lat = Splat node else node
    if not lat and (@void or not o.level)
      it = Block(them) <<< {@front, +void}
    it.compile o, LEVEL_PAREN

  # `v = delete o.k`
  compilePluck: (o) ->
    [get, del] = Chain @it .cacheReference o
    code = "#{ ref = o.scope.temporary!  } = \
            #{ get.compile o, LEVEL_LIST }, delete \
            #{ del.compile o, LEVEL_LIST }, \
            #{ o.scope.free ref }"
    if o.level < LEVEL_LIST then code else "(#code)"

  compileAsFunc: (o) ->
    if @op is \!
    then util \not
    else "(#{ (Fun [], Block Unary @op, Chain Var \it).compile o })"


#### Binary operators
class exports.Binary extends Node
  (op, first, second, destructuring) ~>
    if destructuring
      logic = op.logic
      logic = destructuring if typeof! destructuring is \String
      op = | logic    => that
           | op is \= => \?
           | _        => \=
    @partial = not first? or not second?
    if not @partial
      if \= is op.charAt op.length-1 and op.charAt(op.length-2) not in <[ = < > ! ]>
        return Assign first.unwrap!, second, op
      switch op
      | \in        => return new In first, second
      | \with      => return new Import (Unary \^^ first), second, false
      | \<<< \<<<< => return Import first, second, op is \<<<<
      | \<|        => return Block first .pipe second, op
      | \|>        => return Block second .pipe first, \<|
      | \. \.~     => return Chain first .add Index second, op
    import {op, first, second}

  children: <[ first second ]>

  show: -> @op

  isCallable: ->
    @partial or @op in <[ && || ? << >> ]> and @first.isCallable! and @second.isCallable!

  isArray: -> switch @op | \* => @first .isArray!
                         | \/ => @second.isMatcher!

  isString: -> switch @op
    | \+ \* => @first.isString! or @second.isString!
    | \-    => @second.isMatcher!

  COMPARER   = /^(?:[!=]=|[<>])=?$/
  INVERSIONS = '===':'!==' '!==':'===' '==':'!=' '!=':'=='

  invert: ->
    if not COMPARER.test @second.op and INVERSIONS[@op]
      @op = that
      @was-inverted = true
      return this
    Unary \! Parens(this), true

  invertIt: -> @inverted = true; this

  getDefault: -> switch @op | \? \|| \&& => this

  xorChildren: (test) ->
    return false unless (first = test @first) xor test @second
    return if first then [@first, @second] else [@second, @first]

  compileNode: (o) ->
    return @compilePartial o if @partial
    switch @op
    case \? then return @compileExistence o
    case \*
      return @compileJoin   o if @second.isString!
      return @compileRepeat o if @first.isString! or @first.isArray!
    case \-       then return @compileRemove o if @second.isMatcher!
    case \/       then return @compileSplit  o if @second.isMatcher!
    case \** \^   then return @compilePow o
    case \<? \>?  then return @compileMinMax o
    case \<< \>>  then return @compileCompose o
    case \++ then return @compileConcat o
    case \%%      then return @compileMod o
    case \xor     then return @compileXor o
    case \&& \||
      @second.void = true if top = @void or not o.level
      if top or @cond
        @first .cond = true
        @second.cond = true
    case \instanceof
      {items}:rite = @second.expandSlice(o)unwrap!
      if rite instanceof Arr
        return @compileAnyInstanceOf o, items if items.1
        @second = items.0 or rite
      @second.isCallable! or @second.carp 'invalid instanceof operand'
    case <[ ==== !=== ]>       then @op.=slice 0 3; fallthrough
    case <[ <== >== <<= >>= ]> then return @compileDeepEq o
    default
      if COMPARER.test @op
        if @op in [\=== \!==] and @xorChildren (.isRegex!)
          return @compileRegexEquals o, that
        if @op is \=== and (@first instanceof Literal and @second instanceof Literal)
        and @first.isWhat! isnt @second.isWhat!
          console?.warn "WARNING: strict comparison of two different types will always be false: #{@first.value} == #{@second.value}"
      return @compileChain o if COMPARER.test @op and COMPARER.test @second.op
    @first <<< {@front}
    code = "#{ @first .compile o, level = LEVEL_OP + PREC[@op] } #{@mapOp @op} \
            #{ @second.compile o, level }"
    if o.level <= level then code else "(#code)"

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
    code = @first.compile o, level = LEVEL_OP + PREC[@op]
    [sub, @second.first] = @second.first.cache o, true
    code += " #{@op} #{ sub    .compile o, level    } && \
                     #{ @second.compile o, LEVEL_OP }"
    if o.level <= LEVEL_OP then code else "(#code)"

  compileExistence: (o) ->
    if @void or not o.level
      x = Binary \&& Existence(@first, true), @second
      return (x <<< {+void})compileNode o
    x = @first.cache o, true
    If(Existence x.0; x.1)addElse(@second)compileExpression o

  # `x instanceof [A, B]` => `x instanceof A || x instanceof B`
  compileAnyInstanceOf: (o, items) ->
    [sub, ref, @temps] = @first.cache o
    test = Binary \instanceof sub, items.shift!
    for item in items then test = Binary \|| test, Binary \instanceof ref, item
    Parens test .compile o

  compileMinMax: (o) ->
    lefts = @first .cache o, true
    rites = @second.cache o, true
    x = Binary @op.charAt!, lefts.0, rites.0
    If x, lefts.1 .addElse rites.1 .compileExpression o

  compileMethod: (o, klass, method, arg) ->
    args = [@second] ++ (arg || [])
    if @first"is#klass"!
      Chain(@first, [Index Key method; Call args])compile o
    else
      args.unshift @first
      Call.make(JS util(method) + \.call; args)compile o

  compileJoin   : -> @compileMethod it, \Array  \join
  compileRemove : -> @compileMethod it, \String \replace JS "''"
  compileSplit  : -> @compileMethod it, \String \split

  compileRepeat: (o) ->
    {first: x, second: n} = this
    {items} = x.=expandSlice o .unwrap!
    arr = x.isArray! and \Array
    if items and Splat.compileArray o, items
      x     = JS that
      items = null
    if arr and not items
    or not (n instanceof Literal and n.value < 0x20)
      return Call.make Util(\repeat + (arr or \String)), [x, n] .compile o
    n = +n.value
    return x.compile o if 1 <= n < 2
    # `[x] * 2` => `[x, x]`
    if items
      if n < 1 then return Block items .add JS '[]' .compile o
      refs = []
      for item, i in items then [items[i], refs.*] = item.cache o, 1x
      items.push JS! <<<
        compile: -> (", #{ List.compile o, refs }" * (n-1))slice 2
      x.compile o
    # `'x' * 2` => `'xx'`
    else if x instanceof Literal
      (q = (x.=compile o)charAt!) + "#{ x.slice 1 -1 }" * n + q
    # `"#{x}" * 2` => `(ref$ = "" + x) + ref$`
    else
      if n < 1 then return Block(x.it)add(JS "''")compile o
      x = (refs = x.cache o, 1, LEVEL_OP)0 + " + #{refs.1}" * (n-1)
      if o.level < LEVEL_OP + PREC\+ then x else "(#x)"

  compilePow: (o) -> Call.make(JS \Math.pow; [@first, @second])compile o

  compileConcat: (o) ->
    f = (x) ->
      | x instanceof Binary and x.op is \++ =>
        (f x.first) ++ (f x.second)
      | otherwise                            => [x]
    Chain @first .add Index (Key \concat), \., true .add Call(f @second) .compile o

  compileCompose: (o) ->
    op = @op
    functions = [@first]
    x = @second
    while x instanceof Binary and x.op is op
      functions.push x.first
      x = x.second
    functions.push x

    functions.reverse! if op is \<<

    first = functions.shift!
    n = Chain first .add Index (Key \apply) .add Call [Literal 'this'; Literal 'arguments']

    for f in functions
      n = Chain f .add Call [n]

    Fun [], Block [n] .compile o

  compileMod: (o) ->
    ref = o.scope.temporary!
    code = "((#{@first.compile o}) % (#ref = #{@second.compile o}) + #ref) % #ref"
    o.scope.free ref
    code

  compilePartial: (o) ->
    vit = Var \it
    switch
    case  not @first? and not @second?
      x = Var \x$; y = Var \y$
      (Fun [x, y], Block((Binary @op, x, y).invertCheck this), false, true).compile o
    case @first?
      "(#{ (Fun [vit], Block((Binary @op, @first, vit) .invertCheck this)).compile o })"
    default
      "(#{ (Fun [vit], Block((Binary @op, vit, @second).invertCheck this)).compile o })"

  compileRegexEquals: (o, [regex, target]) ->
    if @op is \===
      method = if @was-inverted then \test else \exec
      Chain regex .add Index Key method .add Call [target] .compile o
    else
      Unary \! (Chain regex .add Index Key \test .add Call [target]) .compile o

  compileDeepEq: (o) ->
    if @op in <[ >== >>= ]>
      [@first, @second] = [@second, @first]
      @op = if @op is \>== then \<== else \<<=
    if @op is \!==
      @op = \===
      negate = true
    for x in [@first, @second]
      x.deepEq = true if x instanceof [Obj, Arr]
    r = Chain Var (util \deepEq) .add Call [@first, @second, Literal "'#{@op}'"]
    (if negate then Unary \! r else r).compile o

  compileXor: (o) ->
    left  = Chain @first  .cacheReference o
    right = Chain @second .cacheReference o
    Binary \&& (Binary \!== (Unary \! left.0), (Unary \! right.0))
             , (Parens Binary \|| left.1, right.1) .compile o

#### Assign
# Assignment to a variable/property.
class exports.Assign extends Node
  (@left, rite, @op or \=, @logic or @op.logic, @defParam) ~>
    @op += ''
    @[if rite instanceof Node then \right else \unaries] = rite

  children: <[ left right ]>

  show: -> [,]concat(@unaries)reverse!join(' ') + [@logic] + @op

  assigns: -> @left.assigns it

  ::delegate <[ isCallable isRegex ]> -> @op in <[ = := ]> and @right[it]!

  isArray: -> switch @op
    | \= \:= => @right.isArray!
    | \/=    => @right.isMatcher!

  isString: -> switch @op
    | \= \:= \+= \*= => @right.isString!
    | \-=            => @right.isMatcher!

  unfoldSoak: (o) ->
    if @left instanceof Existence
      # `[a, b]? = c` => `[a, b] = c if c?`
      if delete (@left.=it)name
      then rite = @right; rite = Assign @right = Var(that), rite
      else [rite, @right, temps] = @right.cache o
      return If(Existence rite; this) <<< {temps, @cond, @void}
    If.unfoldSoak o, this, \left

  unfoldAssign: -> @access and this

  compileNode: (o) ->
    return @compileSplice o if @left instanceof Slice and @op is \=
    left = @left.expandSlice(o, true)unwrap!
    unless @right
      left.isAssignable! or left.carp 'invalid unary assign'
      [left, @right] = Chain left .cacheReference o
      for op in @unaries then @right = Unary op, @right
    return (Parens(@right) <<< {@front, @newed})compile o if left.isEmpty!
    if left.getDefault!
      @right = Binary left.op, @right, left.second
      left.=first
    return @compileDestructuring o, left if left.items
    left.isAssignable! or left.carp 'invalid assign'
    return @compileConditional   o, left if @logic
    {op, right} = this
    return @compileMinMax  o, left, right if op in <[ <?= >?= ]>
    if op in <[ **= ^= %%= ++= |>= ]>
    or op is \*= and right.isString!
    or op in <[ -= /= ]> and right.isMatcher!
      [left, reft] = Chain(left)cacheReference o
      right = Binary op.slice(0 -1), reft, right
      op    = \:=
    op = (op.slice 1 -2) + \= if op in <[ .&.= .|.= .^.= .<<.= .>>.= .>>>.= ]>
    (right.=unparen!)ripName left.=unwrap!
    sign = op.replace \: ''
    name = (left <<< {+front})compile o, LEVEL_LIST
    if lvar = left instanceof Var
      if op is \=
        o.scope.declare name, left,
          (@const or not @defParam and o.const and \$ isnt name.slice -1)
      else if o.scope.checkReadOnly name
        left.carp "assignment to #that \"#name\"" ReferenceError
    if left instanceof Chain and right instanceof Fun
      proto-split = name.split '.prototype.'
      dot-split = name.split \.
      if proto-split.length > 1
        right.in-class = proto-split.0
      else if dot-split.length > 1
        right.in-class-static = dot-split[til -1].join ''
    code = if not o.level and right instanceof While and not right.else and
              (lvar or left instanceof Chain and left.isSimpleAccess!)
      # Optimize `a = while ...`.
      empty = if right.objComp then '{}' else '[]'
      """#{ res = o.scope.temporary \res } = #empty;
         #{@tab}#{ right.makeReturn(res)compile o }
         #{@tab}#name #sign #{ o.scope.free res }"""
    else
      "#name #sign " + right.compile o, LEVEL_LIST
    code = "(#code)" if o.level > LEVEL_LIST
    code

  compileConditional: (o, left) ->
    if left instanceof Var and @logic in <[ ? ]> and @op is \=
      o.scope.declare left.value, left
    lefts = Chain(left)cacheReference o
    # Deal with `a && b ||= c`.
    o.level += LEVEL_OP < o.level
    morph = Binary @logic, lefts.0, @<<<{-logic, left: lefts.1}
    (morph <<< {@void})compileNode o

  compileMinMax: (o, left, right) ->
    lefts = Chain(left)cacheReference o
    rites = right.cache o, true
    test  = Binary @op.replace(\? ''), lefts.0, rites.0
    put   = Assign lefts.1, rites.1, \:=
    # `a <?= b` => `a <= b || a = b `
    return Parens(Binary \|| test, put)compile o if @void or not o.level
    # `r = a <?= b` => `r = if a <= b then a else a = b`
    [test.first, left] = test.first.cache o, true
    If test, left .addElse put .compileExpression o

  # Implementation of recursive destructuring,
  # when assigning to an array or object literal.
  # See <http://wiki.ecmascript.org/doku.php?id=harmony:destructuring>.
  compileDestructuring: (o, {{length: len}:items}:left) ->
    ret  = o.level and not @void
    rite = @right.compile o, if len is 1 then LEVEL_CALL else LEVEL_LIST
    if left.name
      cache = "#that = #rite"
      o.scope.declare rite = that, left
    else if (ret or len > 1) and (not ID.test rite or left.assigns rite)
      cache = "#{ rref = o.scope.temporary! } = #rite"
      rite  = rref
    list = @"rend#{ left.constructor.displayName }" o, items, rite
    o.scope.free rref  if rref
    list.unshift cache if cache
    list.push rite     if ret or not list.length
    code = list.join ', '
    if list.length < 2 or o.level < LEVEL_LIST then code else "(#code)"

  compileSplice: (o) ->
    [from-exp-node, from-exp] = Chain @left.from .cacheReference o
    [right-node, right]       = Chain @right     .cacheReference o
    to-exp = Binary \- @left.to, from-exp
    Block [Chain Var (util \splice) .add Index (Key \apply), \. true
        .add Call [@left.target, (Chain Arr [from-exp-node, to-exp]
                        .add Index (Key \concat), \. true .add Call [right-node])]; right]
      .compile o, LEVEL_LIST

  rendArr: (o, nodes, rite) ->
    for node, i in nodes
      continue if node.isEmpty!
      if node instanceof Splat
        len and node.carp 'multiple splat in an assignment'
        skip = (node.=it)isEmpty!
        if i+1 is len = nodes.length
          break if skip
          val = Arr.wrap JS \
            util(\slice) + \.call( + rite + if i then ", #i)" else \)
        else
          val = ivar = "#rite.length - #{ len - i - 1 }"
          # Optimize `[..., a] = b`.
          continue if skip and i+2 is len
          start = i+1; @temps = [ivar = o.scope.temporary \i]
          val = if skip then node = Var ivar; Var val else
            Arr.wrap JS "#i < (#ivar = #val)
                       \ ? #{ util \slice }.call(#rite, #i, #ivar)
                       \ : (#ivar = #i, [])"
      else
        (inc = ivar) and start < i and inc += " + #{ i - start }"
        val = Chain rcache||=Literal(rite), [Index JS inc || i]
      if node instanceof Assign
        node = Binary node.op, node.left, node.right, (node.logic or true)
      (this with {left: node, right: val, +void})compile o, LEVEL_PAREN

  rendObj: (o, nodes, rite) ->
    for node in nodes
      node.=it if splat = node instanceof Splat
      # `{a or b} = c` => `a = c.a or b`
      node.=first if logic = node.getDefault!
      if node instanceof Parens
        [node, key] = Chain(node.it)cacheReference o
      else if node instanceof Prop
      then node = ({key} = node)val
      else key  = node
      node = Var node.name if node instanceof Key
      node = logic <<< first: node if logic
      val  = Chain rcache||=Var(rite), [Index key.maybeKey!]
      val  = Import Obj!, val if splat
      (this with {left: node, right: val, +void})compile o, LEVEL_PAREN

#### Import
# Copies properties from right to left.
class exports.Import extends Node
  (@left, @right, @all and \All) ~>
    if not all and left instanceof Obj and right.items
      return Obj left.items ++ right.asObj!items

  children: <[ left right ]>

  show: -> @all

  ::delegate <[ isCallable isArray ]> -> @left[it]!

  unfoldSoak: (o) ->
    {left} = this
    if left instanceof Existence and not left.negated
      if left.=it instanceof Var
        {value} = @left = left
        unless o.scope.check value, true
          left = JS "typeof #value != 'undefined' && #value"
      else
        [left, @left, temps] = left.cache o
      return If(left, this) <<< {temps, +soak, @cond, @void}
    If.unfoldSoak o, this, \left
    or (@void or not o.level) and
    If.unfoldSoak o, this, \right

  compileNode: (o) ->
    {right} = this
    unless @all
      if right instanceof Chain
        right = right.unfoldSoak   o
             or right.unfoldAssign o
             or right.expandSlice  o .unwrap!
      return @compileAssign o, right.asObj!items if right instanceof List
    Call.make Util("import#{ @all or '' }"), [@left, right] .compileNode o

  # If the right operand of `<<<` is an object or array literal,
  # expand it to a series of assignments.
  compileAssign: (o, items) ->
    return @left.compile o unless items.length
    top = not o.level
    if items.length < 2 and (top or @void or items.0 instanceof Splat)
      reft = @left
      reft = Parens reft if reft.isComplex!
    else [left, reft, @temps] = @left.cache o
    [delim, space] = if top then [\; \\n + @tab] else [\, ' ']
    delim += space
    code = if @temps then left.compile(o, LEVEL_PAREN) + delim else ''
    for node, i in items
      i and code += if com then space else delim
      if com = node.comment
        code += node.compile o
        continue
      if node instanceof Splat
        code += Import(reft, node.it)compile o
        continue
      node.=first if logic = node.getDefault!
      if dyna = node instanceof Parens
        [key, val] = node.it.cache o, true
      else if node instanceof Prop
        {key, val} = node
        if node.accessor
          key = JS "'#{key.name}'" if key instanceof Key
          code += "Object.defineProperty(#{ reft.compile o, LEVEL_LIST }
                                       , #{ key .compile o, LEVEL_LIST }
                                       , #{ node.compileDescriptor o })"
          continue
      else key = val = node
      dyna  or  key.=maybeKey!
      logic and val = logic <<< first: val
      code += Assign(Chain reft, [Index key]; val)compile o, LEVEL_PAREN
    return code if top
    @void or node instanceof Splat or
      code += (if com then ' ' else ', ') + reft.compile o, LEVEL_PAREN
    if o.level < LEVEL_LIST then code else "(#code)"

#### In
# Handles `in` operation that tests if the left operand is included within
# the right operand, arraywise.
class exports.In extends Node implements Negatable
  (@item, @array) ->

  children: <[ item array ]>

  compileNode: (o) ->
    {items} = array = @array.expandSlice(o)unwrap!
    if array not instanceof Arr or items.length < 2
      return "#{ if @negated then \! else '' }#{ util \in }
             (#{ @item.compile o, LEVEL_LIST }
            , #{ array.compile o, LEVEL_LIST })"
    code = ''
    [sub, ref] = @item.cache o, false, LEVEL_PAREN
    [cmp, cnj] = if @negated then [' !== ' ' && '] else [' === ' ' || ']
    for test, i in items
      code &&+= cnj
      if test instanceof Splat
        code += (new In(Var ref; test.it) <<< {@negated})compile o, LEVEL_TOP
        code  = "(#sub, #code)" unless i or sub is ref
      else
        code += (if i or sub is ref then ref else "(#sub)") +
                cmp + test.compile o, LEVEL_OP + PREC\==
    sub is ref or o.scope.free ref
    if o.level < LEVEL_OP + PREC\|| then code else "(#code)"

#### Existence
# Checks a value for existence--not `undefined` nor `null`.
class exports.Existence extends Node implements Negatable
  (@it, @negated) ~>

  children: [\it]

  compileNode: (o) ->
    node = @it.unwrap! <<< {@front}
    code = node.compile o, LEVEL_OP + PREC\==
    if node instanceof Var and not o.scope.check code, true
      [op, eq] = if @negated then <[ || = ]> else <[ && ! ]>
      code = "typeof #code #eq= 'undefined' #op #code #eq== null"
    else
      code += " #{ op = if @negated then \== else \!= } null"
    if o.level < LEVEL_OP + PREC[op] then code else "(#code)"

#### Fun
# A function definition. This is the only node that creates a `new Scope`.
class exports.Fun extends Node
  (@params or [], @body or Block!, @bound and \this$, @curried or false, @hushed = false, @generator = false) ~>

  children: <[ params body ]>

  show: -> [@name] + ["~#that" if @bound]

  named: -> import {name: it, +statement}

  isCallable: YES

  isStatement: -> !!@statement

  # Short-circuit `traverseChildren` method to prevent it
  # from crossing scope boundaries by default.
  traverseChildren: (, xscope) -> super ... if xscope

  makeReturn: -> if @statement then import {+returns} else super ...

  ripName: !-> @name ||= it.varName!

  compileNode: (o) ->
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
    code = \function
    if @generator
      @ctor and @carp "a constructor can't be a generator"
      @hushed and @carp "a generator is hushed by default"
      code += \*
    if @bound is \this$
      if @ctor
        scope.assign \this$ 'this instanceof ctor$ ? this : new ctor$'
        body.lines.push Return Literal \this$
      else if sscope.fun?bound
      then @bound = that
      else sscope.assign \this$ \this
    if @statement
      name                    or @carp  'nameless function declaration'
      pscope is o.block.scope or @carp 'misplaced function declaration'
      @accessor              and @carp 'named accessor'
      pscope.add name, \function, this
    if @statement or name and @labeled
      code += ' ' + scope.add name, \function, this
    @hushed or @ctor or @newed or @generator or body.makeReturn!
    code += "(#{ @compileParams o, scope }){"
    code += "\n#that\n#tab" if body.compileWithDeclarations o
    code += \}
    curry-code-check = ~>
      if @curried and @has-splats
          @carp 'cannot curry a function with a variable number of arguments'
      if @curried and @params.length > 1 and not @class-bound
        "#{ util \curry }" + if @bound
          "((#code), true)"
        else
          "(#code)"
      else code
    if inLoop then return pscope.assign pscope.temporary(\fn), curry-code-check!
    if @returns
      code += "\n#{tab}return #name;"
    else if @bound and @ctor
      code += ' function ctor$(){} ctor$.prototype = prototype;'
    code = curry-code-check!
    if @front and not @statement then "(#code)" else code

  compileParams: (o, scope) ->
    {{length}:params, body} = this
    # Remove trailing placeholders.
    for p in params by -1
      break unless p.isEmpty! or p.filler
      --params.length
    for p, i in params
      if p instanceof Splat
        @has-splats = true
        splace = i
      # `(a = x) ->` => `(a ? x) ->`
      else if p.op is \=
        params[i] = Binary (p.logic or \?), p.left, p.right
    # `(a, ...b, c) ->` => `(a) -> [[] ...b, c] = @@`
    if splace?
      rest = params.splice splace, 9e9
    else if @accessor
      that.carp 'excess accessor parameter' if params.1
    else unless length or @wrapper
      params.0 = Var \it if body.traverseChildren -> it.value is \it or null
    names   = []
    assigns = []
    if params.length
      dic = {}
      for p in params
        vr = p
        vr.=first if df = vr.getDefault!
        if vr.isEmpty!
          vr = Var scope.temporary \arg
        else if vr.value is \..
          vr = Var o.ref = scope.temporary!
        else if vr not instanceof Var
          unaries = []
          while vr instanceof Unary
            has-unary = true
            unaries.push vr
            vr.=it
          v = Var delete (vr.it || vr)name || vr.varName! ||
                  scope.temporary \arg
          assigns.push Assign vr, switch
            | df        => Binary p.op, v, p.second
            | has-unary => fold ((x, y) -> y.it = x; y), v, unaries.reverse!
            | otherwise => v
          vr = v
        else if df
          assigns.push Assign vr, p.second, \=, p.op, true
        names.push scope.add vr.value, \arg, p
    if rest
      while splace-- then rest.unshift Arr!
      assigns.push Assign Arr(rest), Literal \arguments
    @body.prepend ...assigns if assigns.length
    names.join ', '

#### Class
class exports.Class extends Node
  ({@title, @sup, @mixins, body}) -> @fun = Fun [] body

  children: <[ title sup mixins fun ]>

  isCallable: YES

  ripName: !-> @name = it.varName!

  compile: (o, level) ->
    {{{lines}:body}:fun, title} = this
    bound-funcs = []
    curried-bound-funcs = []
    decl = title?varName!
    name = decl or @name
    if ID.test name || '' then fun.cname = name else name = \constructor
    proto = Var \prototype
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
        if key.isComplex!
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
      if node.items.length then Import proto, node else Literal 'void'

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
        node.traverseChildren !->
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


    lines.push vname = fun.proto = Var fun.bound = name
    args = []
    if @sup
      args.push that
      imports = Chain Import (Literal \this), Var \superclass
      fun.proto = Util.Extends (if fun.cname
        then Block [Assign (imports.add Index Key \displayName), Literal "'#name'"
                   ; Literal name]
        else imports)
        , fun.params.* = Var \superclass
    if @mixins
      imports = for args.* in that
        Import proto, JS("arguments[#{args.length-1}]"), true
      body.prepend ...imports
    body.prepend Literal "#name.displayName = '#name'" if fun.cname and not @sup
    clas = Parens Call.make(fun, args), true
    clas = Assign vname, clas if decl and title.isComplex!
    clas = Assign title, clas if title
    clas.compile o, level

#### Super
# Reference to the parent method or constructor.
class exports.Super extends Node
  ->

  isCallable: YES

  compile: ({scope}:o) ->
    unless @sproto
      while not scope.get \superclass and scope.fun, scope.=parent
        result = that
        return \superclass.prototype + Index that .compile o if result.meth
        return \superclass           + Index that .compile o if result.stat
        if scope.fun.in-class
          return "#that.superclass.prototype.#{scope.fun.name}"
        else if scope.fun.in-class-static
          return "#that.superclass.#{scope.fun.name}"
      return "#that.superclass" if o.scope.fun?name
    \superclass

#### Parens
# An extra set of parentheses,
# specifying evaluation order and/or forcing expression.
class exports.Parens extends Node
  (@it, @keep, @string) ~>

  children: [\it]

  show: -> @string and '""'

  ::delegate <[ isComplex isCallable isArray isRegex ]> -> @it[it]!

  isString: -> @string or @it.isString!

  unparen: -> if @keep then this else @it.unparen!

  compile: (o, level ? o.level) ->
    {it} = this
    it{cond, \void} ||= this
    it.head.hushed = true if @calling and (not level or @void)
    unless @keep or @newed or level >= LEVEL_OP + PREC[it.op]
      return (it <<< {@front})compile o, level || LEVEL_PAREN
    if it.isStatement!
    then it.compileClosure o
    else "(#{ it.compile o, LEVEL_PAREN })"

#### Splat
# A splat, either as an argument to a call
# or as part of a destructuring assignment.
class exports.Splat extends Node
  (@it, @filler) ~>

  ::{children, isComplex} = Parens::

  isAssignable: YES

  assigns: -> @it.assigns it

  compile: -> @carp 'invalid splat'

  # Compiles a list of nodes mixed with splats to a proper array.
  @compileArray = (o, list, apply) ->
    expand list
    index = 0
    for node in list
      break if node instanceof Splat
      ++index
    return '' if index >= list.length
    unless list.1
      return (if apply then Object else ensureArray) list.0.it
             .compile o, LEVEL_LIST
    args = []; atoms = []
    for node in list.splice index, 9e9
      if node instanceof Splat
        args.push Arr atoms.splice 0, 9e9 if atoms.length
        args.push ensureArray node.it
      else atoms.push node
    args.push Arr atoms if atoms.length
    (if index then Arr list else args.shift!)compile(o, LEVEL_CALL) +
    ".concat(#{ List.compile o, args })"

  function expand nodes
    index = -1
    while node = nodes[++index] then if node instanceof Splat
      {it} = node
      if it.isEmpty!
        nodes.splice index-- 1
      else if it instanceof Arr
        nodes.splice index, 1, ...expand it.items
        index += it.items.length - 1
    nodes

  function ensureArray node
    return node if node.isArray!
    Call.make JS(util(\slice) + \.call), [node]

#### Jump
# `break` `continue`
class exports.Jump extends Node
  (@verb, @label) ->

  show: -> (@verb or '') + if @label then ' ' + that else ''

  isStatement : YES
  makeReturn  : THIS

  getJump: (ctx or {}) ->
    return this unless ctx[@verb]
    return that not in (ctx.labels ?= []) and this if @label

  compileNode: (o) ->
    if @label
    then that in (o.labels ?= []) or @carp "unknown label \"#that\""
    else o[@verb]          or @carp "stray #{@verb}"
    @show! + \;

  @extended = !(sub) ->
    sub::children = [\it]
    @[sub.displayName.toLowerCase!] = sub

#### Throw
class exports.Throw extends Jump
  (@it) ~>

  getJump: VOID

  compileNode: (o) -> "throw #{ @it?compile o, LEVEL_PAREN or \null };"

#### Return
class exports.Return extends Jump
  ~> if it and it.value is not \void then import {it}

  getJump: THIS

  compileNode: (o) ->
    "return#{ if @it then ' ' + that.compile o, LEVEL_PAREN else '' };"

#### While
# The traditional `while`/`for`/`do` loop.
# Returns an array of values collected from the last expression when requested.
class exports.While extends Node
  (test, @un, mode) ->
    mode and if mode instanceof Node then @update = mode else @post = true
    # `while true` `until false` => `for (;;)`
    if @post or test.value is not ''+!un then import {test}

  children: <[ test body update else ]>

  aSource: \test, aTargets: <[ body update ]>

  show: -> [\! if @un; \do if @post] * ''

  ::isStatement = ::isArray = YES

  makeComprehension: (toAdd, loops) ->
    @is-comprehension = true
    while loops.length
      toAdd = loops.pop!addBody Block toAdd
      toAdd <<< {+in-comprehension} if not toAdd.is-comprehension
    @addBody Block toAdd

  getJump: (ctx or {}) ->
    ctx <<< {+\continue, +\break}
    for node in @body?.lines or [] then return node if node.getJump ctx

  addBody: (@body) ->
    @body = Block If @guard, @body if @guard
    [top] = @body.lines
    @body.lines.length = 0 if top?verb is \continue and not top.label
    this

  addGuard:   (@guard)          -> this
  addObjComp: (@objComp = true) -> this

  makeReturn: ->
    return this if @has-returned
    if it
      if @objComp
        @body = Block @body.makeObjReturn it
        @body = If @guard, @body if @guard
      else
        unless @body or @index
          @addBody Block Var @index = \ridx$
        last = @body.lines?[*-1]
        if (@is-comprehension or @in-comprehension) and not last?is-comprehension
          @body.makeReturn it
          @else?makeReturn it
          @has-returned = true
        else
          @res-var = it
          @else?makeReturn it
    else
      @getJump! or @returns = true
    this

  compileNode: (o) ->
    o.loop = true
    @test and if @un then @test.=invert! else @anaphorize!
    return 'do {' + @compileBody (o.indent += TAB; o) if @post
    test = @test?compile o, LEVEL_PAREN or ''
    unless @update or @else
      head = if test then "while (#test" else 'for (;;'
    else
      head = 'for ('
      head += "#{ @yet = o.scope.temporary \yet } = true" if @else
      head += ";#{ test and ' ' + test };"
      head += ' ' + that.compile o, LEVEL_PAREN if @update
    head + ') {' + @compileBody (o.indent += TAB; o)

  compileBody: (o) ->
    o.break = o.continue = true
    {body: {lines}, yet, tab} = this
    code = ret = mid = ''
    empty = if @objComp then '{}' else '[]'
    last = lines?[*-1]
    unless (@is-comprehension or @in-comprehension) and not last?is-comprehension
      var has-loop
      last?traverseChildren !-> if it instanceof Block and it.lines[*-1] instanceof While
        has-loop := true
      if @returns and not @res-var
        @res-var = res = o.scope.assign \results$ empty
      if @res-var and (last instanceof While or has-loop)
        temp = o.scope.temporary \lresult
        lines.unshift Assign (Var temp), Arr!, \=
        lines[*-1]?=makeReturn temp
        mid += "#TAB#{Chain Var @res-var
          .add Index (Key \push), \., true
          .add Call [Chain Var temp] .compile o };\n#{@tab}"
      else
        @has-returned = true
        if @res-var
          @body.makeReturn @res-var
    if @returns
      @body = Block @body.makeObjReturn \results$ if @objComp
      @body = If @guard, @body if @guard and @objComp
      if (not last instanceof While and not @has-returned) or @is-comprehension or @in-comprehension
        lines[*-1]?=makeReturn res = o.scope.assign \results$ empty
      ret += "\n#{@tab}return #{ res or empty };"
      @else?makeReturn!
    yet and lines.unshift JS "#yet = false;"
    code += "\n#that\n#tab" if @body.compile o, LEVEL_TOP
    code += mid
    code += \}
    code += " while (#{ @test.compile o<<<{tab} LEVEL_PAREN });" if @post
    if yet
      code += " if (#yet) #{ @compileBlock o, Block @else }"
      o.scope.free yet
    code + ret

#### For
# LiveScript's replacements for the `for` loop are array, object or range iterators.
class exports.For extends While
  ->
    import all it
    @item = null if @item instanceof Var and not @item.value
    for @kind or [] => @[..] = true
    @carp '`for own` requires `of`' if @own and not @object

  children: <[ item source from to step body ]>

  aSource: null

  show: -> (@kind ++ @index)join ' '

  addBody: (body) ->
    if @let
      @item = Literal \.. if delete @ref
      body = Block Call.let do
        with []
          ..push Assign Var(that), Literal \index$$ if @index
          ..push Assign that,      Literal \item$$ if @item
        body

    super body

    if @guard and @let and (@index or @item)
      @body.lines[0].if.traverse-children !~>
        if it instanceof Var
          if @index and it.value is @index
            it.value = \index$$
          if @item and it.value is @item.value
            it.value = \item$$
    if @let
      delete @index
      delete @item
    this

  compileNode: (o) ->
    o.loop = true
    temps = @temps = []
    if @object and @index
    then o.scope.declare idx = @index
    else temps.push idx = o.scope.temporary \i
    @addBody Block Var idx if not @body
    unless @object
      [pvar, step] = (@step or Literal 1)compileLoopReference o, \step
      pvar is step or temps.push pvar
    if @from
      [tvar, tail] = @to.compileLoopReference o, \to
      fvar = @from.compile o, LEVEL_LIST
      vars = "#idx = #fvar"
      unless tail is tvar
        vars += ", #tail"
        temps.push tvar
      pvar = step = -1 if not @step and +fvar > +tvar
      eq   = if @op is \til then '' else \=
      cond = if +pvar
        then "#idx #{ '<>'charAt pvar < 0 }#eq #tvar"
        else "#pvar < 0 ? #idx >#eq #tvar : #idx <#eq #tvar"
    else
      @item = Var o.scope.temporary \x if @ref
      if @item or @object and @own
        [svar, srcPart] = @source.compileLoopReference o, \ref, not @object
        svar is srcPart or temps.push svar
      else
        svar = srcPart = @source.compile o, LEVEL_PAREN
      unless @object
        if 0 > pvar and ~~pvar is +pvar  # negative int
          vars = "#idx = #srcPart.length - 1"
          cond = "#idx >= 0"
        else
          temps.push lvar = o.scope.temporary \len
          vars = "#idx = 0, #lvar = #srcPart.length"
          cond = "#idx < #lvar"
    @else and @yet = o.scope.temporary \yet
    head = 'for ('
    head += "#idx in " if @object
    head += "#that = true, " if @yet
    if @object
      head += srcPart
    else
      step is pvar or vars += ', ' + step
      head += "#vars; #cond; " + if 1 ~= Math.abs pvar
        then (if pvar < 0 then \-- else \++) + idx
        else idx + if pvar < 0
          then ' -= ' + pvar.slice 1
          else ' += ' + pvar
    @own and head += ") if (#{ o.scope.assign \own$ '{}.hasOwnProperty' }
                            .call(#svar, #idx)"
    head += ') {'
    if @let
      @body.traverseChildren !->
        switch it.value
        | \index$$ => it.value = idx
        | \item$$  => it.value = "#svar[#idx]"
    o.indent += TAB
    if @index and not @object
      head += \\n + o.indent +
        Assign(Var @index; JS idx).compile(o, LEVEL_TOP) + \;
    if @item and not @item.isEmpty!
      head += \\n + o.indent +
        Assign(@item, JS "#svar[#idx]")compile(o, LEVEL_TOP) + \;
    o.ref = @item.value if @ref
    body  = @compileBody o
    head += \\n + @tab if (@item or (@index and not @object)) and \} is body.charAt 0
    head + body

#### Try
# Classic `try`-`catch`-`finally` block with optional `catch`.
class exports.Try extends Node
  (@attempt, @thrown, @recovery, @ensure) ->
    @recovery?lines.unshift Assign (@thrown or Var \e), Var \e$

  children: <[ attempt recovery ensure ]>

  show: -> @thrown

  isStatement: YES

  isCallable: -> @recovery?isCallable! and @attempt.isCallable!

  getJump: -> @attempt.getJump it or @recovery?getJump it

  makeReturn: ->
    @attempt .=makeReturn it
    @recovery?=makeReturn it
    this

  compileNode: (o) ->
    o.indent += TAB
    code = 'try ' + @compileBlock o, @attempt
    if @recovery or not @ensure and JS ''
      code += ' catch (e$) ' + @compileBlock o, that
    if @ensure
      code += ' finally '    + @compileBlock o, that
    code

#### Switch
# Compiles to the regular JS `switch`-`case`-`default`,
# but with forced `break` after each cases.
class exports.Switch extends Node
  (@type, @topic, @cases, @default) ->
    if type is \match
      @target = Arr topic if topic
      @topic = null
    else
      if topic
        throw "can't have more than one topic in switch statement" if topic.length > 1
        @topic.=0
    if @cases.length and (last = @cases[*-1]).tests.length is 1
    and last.tests.0 instanceof Var and last.tests.0.value is \_
      @cases.pop!
      @default = last.body

  children: <[ topic cases default ]>

  aSource: \topic, aTargets: [\cases]

  show: -> @type

  isStatement: YES

  isCallable: ->
    for c in @cases when not c.isCallable! then return false
    if @default then @default.isCallable! else true

  getJump: (ctx or {}) ->
    ctx.break = true
    for c in @cases then return that if c.body.getJump ctx
    @default?getJump ctx

  makeReturn: ->
    for c in @cases then c.makeReturn it
    @default?makeReturn it
    this

  compileNode: (o) ->
    {tab} = this
    [target-node, target] = Chain @target .cacheReference o if @target
    topic = if @type is \match
      t = if target then [target-node] else []
      Block (t ++ [Literal \false]) .compile o, LEVEL_PAREN
    else
      !!@topic and @anaphorize!compile o, LEVEL_PAREN
    code  = "switch (#topic) {\n"
    stop  = @default or @cases.length - 1
    o.break = true
    for c, i in @cases
      code += c.compileCase o, tab, i is stop, (@type is \match or !topic), @type, target
    if @default
      o.indent = tab + TAB
      code += tab + "default:\n#that\n" if @default.compile o, LEVEL_TOP
    code + tab + \}

#### Case
class exports.Case extends Node
  (@tests, @body) ->

  children: <[ tests body ]>

  isCallable: -> @body.isCallable!

  makeReturn: ->
    @body.makeReturn it unless @body.lines[*-1]?value is \fallthrough
    this

  compileCase: (o, tab, nobr, bool, type, target) ->
    tests = []
    for test in @tests
      test.=expandSlice(o)unwrap!
      if test instanceof Arr and type isnt \match
        for t in test.items then tests.push t
      else tests.push test
    tests.length or tests.push Literal \void
    if type is \match
      for test, i in tests
        tar = Chain target .add Index (Literal i), \., true
        tests[i] = Chain test .auto-compare (if target then [tar] else null)
    if bool
      binary = if type is \match then \&& else \||
      [t] = tests; i = 0; while tests[++i] then t = Binary binary, t, that
      tests = [(@<<<{t, aSource: \t, aTargets: [\body]})anaphorize!invert!]
    code = ''
    for t in tests then code += tab + "case #{ t.compile o, LEVEL_PAREN }:\n"
    {lines} = @body; last = lines[*-1]
    lines[*-1] = JS '// fallthrough' if ft = last?value is \fallthrough
    o.indent = tab += TAB
    code += that + \\n        if @body.compile o, LEVEL_TOP
    code += tab  + 'break;\n' unless nobr or ft or last instanceof Jump
    code

#### If
# The `if`/`else` structure that acts as both statement and expression.
class exports.If extends Node
  (@if, @then, @un) ~>

  children: <[ if then else ]>

  aSource: \if, aTargets: [\then]

  show: -> @un and \!

  terminator: ''

  ::delegate <[ isCallable isArray isString isRegex ]> ->
    @else?[it]! and @then[it]!

  getJump: -> @then.getJump it or @else?getJump it

  makeReturn: ->
    @then.=makeReturn it
    @else?=makeReturn it
    this

  compileNode: (o) ->
    if @un then @if.=invert! else @soak or @anaphorize!
    if o.level then @compileExpression o else @compileStatement o

  compileStatement: (o) ->
    code = "if (#{ @if.compile o, LEVEL_PAREN }) "
    o.indent += TAB
    code += @compileBlock o, Block @then
    return code unless els = @else
    code + ' else ' + if els instanceof constructor
      then els.compile o <<< indent: @tab, LEVEL_TOP
      else @compileBlock o, els

  compileExpression: (o) ->
    {then: thn, else: els or Literal \void} = this
    @void and thn.void = els.void = true
    if not @else and (@cond or @void)
      return Parens Binary \&& @if, thn .compile o
    code = @if.compile o, LEVEL_COND
    pad  = if els.isComplex! then \\n + o.indent += TAB else ' '
    code += "#pad? #{ thn.compile o, LEVEL_LIST }
             #pad: #{ els.compile o, LEVEL_LIST }"
    if o.level < LEVEL_COND then code else "(#code)"

  # Unfolds a node's child if soak,
  # then tuck the node under the created **If**.
  @unfoldSoak = (o, parent, name) ->
    if parent[name]unfoldSoak o
      parent[name] = that.then
      that <<< {parent.cond, parent.void, then: Chain parent}

#### Label
# A labeled block or statement.
class exports.Label extends Node
  (@label or \_, @it) ->
    if fun = it instanceof [Fun, Class] and it or
             it.calling and it.it.head
      fun.name or fun <<< {name: @label, +labeled}
      return it

  ::{children, isCallable, isArray} = Parens::

  show: -> @label

  isStatement: YES

  getJump: (ctx or {}) ->
    (ctx.labels ?= []).push @label
    @it.getJump ctx <<< {+\break}

  makeReturn: -> @it.=makeReturn it; this

  compileNode: (o) ->
    {label, it} = this
    labels = o.labels = [...o.labels or []]
    @carp "duplicate label \"#label\"" if label in labels
    labels.push label
    it.isStatement! or it = Block it
    "#label: " + if it instanceof Block
      then o.indent += TAB; @compileBlock o, it
      else it.compile o

#### Cascade
class exports.Cascade extends Node
  (@input, @output, @prog1) ~>

  show: -> @prog1

  children: <[ input output ]>

  terminator: ''

  ::delegate <[ isCallable isArray isString isRegex ]> ->
    @[if @prog1 then \input else \output][it]!

  getJump: -> @output.getJump it

  makeReturn: (@ret) -> this

  compileNode: ({level}:o) ->
    {input, output, prog1, ref} = this
    if prog1 and (\ret of this or level and not @void)
      output.add (Literal(\..) <<< {+cascadee})
    if \ret of this
      output.=makeReturn @ret
    if ref
    then prog1 or output = Assign Var(ref), output
    else ref = o.scope.temporary \x
    if input instanceof Cascade
    then input <<< {ref}
    else input &&= Assign Var(ref), input
    o.level &&= LEVEL_PAREN
    code = input.compile o
    out  = Block output .compile o <<< ref: new String ref
    @carp "unreferred cascadee" if prog1 is \cascade and not o.ref.erred
    return "#code#{input.terminator}\n#out" unless level
    code += ", #out"
    if level > LEVEL_PAREN then "(#code)" else code

#### JS
# Embedded JavaScript snippets.
class exports.JS extends Node
  (@code, @literal, @comment) ~>

  show: -> if @comment then @code else "`#{@code}`"

  terminator: ''

  ::isAssignable = ::isCallable = -> not @comment

  compile: -> if @literal then entab @code, it.indent else @code

#### Require
class exports.Require extends Node
  (@body) ~>

  children: <[ body ]>

  compile: (o) ->
    strip-string = (val) ->
      if val == //^['"](.*)['"]$// then that.1 else val

    get-file-name = (val) ->
      (path.basename strip-string val)
        .split '.' .0
        .replace /-[a-z]/ig, -> it.char-at 1 .to-upper-case!

    get-value = (item) ~>
      | item instanceof Key     => item.name
      | item instanceof Var     => item.value
      | item instanceof Literal => item.value
      | item instanceof Index   => get-value item.key
      | otherwise               => item

    process-item = (item) ->
      [asg, value] = switch
      | item instanceof Prop    => [item.val, item.key]
      | otherwise               => [item, item]
      asg-value = get-value asg
      to-asg = if typeof! asg-value is 'String' then Var get-file-name asg-value else asg
      value = strip-string get-value value

      main = Chain Var 'require' .add Call [Literal "'#value'"]
      Assign to-asg, main .compile o

    if @body.items?
      [process-item item for item in @body.items].join ";\n#{o.indent}"
    else
      process-item @body

#### Util
# A wrapper node for utility functions.
class exports.Util extends Node
  (@verb) ~>

  {(Jump::)show}

  isCallable: YES

  compile: -> util @verb

  ##### Util.Extends
  # An operator that sets up class-ical inheritance between two constructors,
  # returning the left one.
  @Extends = -> Call.make Util(\extend), &[0 1]

#### Vars
# Declares uninitialized variables.
class exports.Vars extends Node
  (@vars) ~>

  children: [\vars]

  makeReturn: THIS

  compile: (o, level) ->
    for {value}:v in @vars
      v.carp 'invalid variable declaration' unless v instanceof Var
      v.carp "redeclaration of \"#value\"" if o.scope.check value
      o.scope.declare value, v
    Literal \void .compile o, level

#### Parser Utils
# Helpers for modifying nodes in [parser](../lib/parser.js).

exports.L = (yylineno, node) -> node import line: yylineno + 1

exports.Decl = (type, nodes, lno) ->
  throw SyntaxError "empty #type on line #lno" unless nodes.0
  DECLS[type] nodes

DECLS =
  export: (lines) ->
    i = -1; out = Util \out
    while node = lines[++i]
      if node instanceof Block
        lines.splice i-- 1 ...node.lines
        continue
      if node instanceof Fun and node.name
        lines.splice i++ 0 Assign Chain(out, [Index Key that]), Var that
        continue
      lines[i] =
        if node.varName!
        or node instanceof Assign and node.left. varName!
        or node instanceof Class  and node.title?varName!
        then Assign Chain(out, [Index Key that]), node
        else Import out, node
    Block lines

  import: (lines, all) ->
    for line, i in lines then lines[i] = Import Literal(\this), line, all
    Block lines

  importAll: -> @import it, true

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
    scope.add name, (if constant then \const else \var), node

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
  checkReadOnly: (name) ->
    return that if @READ_ONLY[@check name, true]
    @variables"#name." ||= \upvar
    ''

  # Concatenates the declarations in this scope.
  emit: (code, tab) ->
    vrs = []; asn = []; fun = []
    for name, type of @variables
      name.=slice 0 -1
      if type in <[ var const reuse ]>
        vrs.push name
      else if type.value
        if ~(val = entab that, tab)lastIndexOf \function( 0
        then fun.push "function #name#{ val.slice 8 }"
        else asn.push "#name = #val"
    code = "#{tab}var #that;\n#code" if vrs.concat asn .join ', '
    if fun.join "\n#tab" then "#code\n#tab#that" else code

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
  importAll: '''function(obj, src){
    for (var key in src) obj[key] = src[key];
    return obj;
  }'''

  repeatString: '''function(str, n){
    for (var r = ''; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;
    return r;
  }'''
  repeatArray: '''function(arr, n){
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

  # modified version of underscore.js's _.isEqual and eq functions
  deepEq: '''function(x, y, type){
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

  # Shortcuts to speed up the lookup time for native methods.
  split    : "''.split"
  replace  : "''.replace"
  toString : '{}.toString'
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
