# Contains all of the node classes for the syntax tree. Most
# nodes are created as the result of actions in the [grammar](#grammar),
# but some are created by other nodes as a method of code generation. To convert
# the syntax tree into a string of JavaScript code, call `compileRoot`.

{Scope} = require './scope'

#### Node
# The **Node** is the abstract base class for all nodes in the syntax tree.
# Each subclass implements the `compileNode` method, which performs the
# code generation for that node. To compile a node to JavaScript,
# call `compile` on it, which wraps `compileNode` in some generic extra smarts,
# to know when the generated code needs to be wrapped up in a closure.
# An options hash is passed and cloned throughout, containing information about
# the environment from higher in the tree (such as if a returned value is
# being requested by the surrounding function), information about the current
# scope, and indentation level.
class Node
  # Common logic for determining whether to wrap this node in a closure before
  # compiling it, or to compile directly. We need to wrap if it's
  # a non-_pure_ _statement_, and we're not at the top level of a block.
  compile: (options, level) ->
    o = {}; continue for key, o[key] in options
    o import {level} if level?
    node = @unfoldSoak(o) or this
    if o.level and not node.isPureStatement() and node.isStatement(o)
      return node.compileClosure o
    node.tab = o.indent
    code = node.compileNode o
    o.scope.free tmp for tmp of node.temps if node.temps
    code

  # Statements are converted into expressions via closure-wrapping.
  compileClosure: (o) ->
    if @containsPureStatement()
      throw SyntaxError 'cannot include a pure statement in an expression'
    args = []
    func = Code [], Lines this
    # The wrapper shares a scope with its parent closure
    # to preserve the expected lexical scope.
    func.wrapper = true
    if @contains(-> it.value is 'this')
      args.push Literal 'this'
      val = Value func, [Access Literal 'call']
    mentionsArgs = false
    @traverseChildren ->
      mentionsArgs := it.value = '_args' if it.value is 'arguments'
      null
    if mentionsArgs
      args.push Literal 'arguments'
      func.params.push Param Literal '_args'
    Call(val or func, args).compileNode o

  # If the code generation wishes to use the result of a complex expression
  # in multiple places, ensure that the expression is only ever evaluated once,
  # by assigning it to a temporary variable. Pass a level to precompile.
  cache: (o, level, reused) ->
    unless @isComplex()
      ref = if level then @compile o, level else this
      [ref, ref]
    else
      ref = Literal reused or o.scope.temporary 'ref'
      sub = Assign ref, this
      if level then [sub.compile o, level; ref.value] else [sub, ref]

  # Compiles to a source/variable pair suitable for looping.
  compileLoopReference: (o, name) ->
    src = tmp = @compile o, LEVEL_LIST
    unless -1/0 < +src < 1/0 or IDENTIFIER.test(src) and o.scope.check(src)
      src = "#{ tmp = o.scope.temporary name } = #{src}"
    [src, tmp]

  # Constructs a node that returns the current node's result.
  # Note that this is overridden for smarter behavior by
  # many statement nodes (`If`, `For` etc.).
  makeReturn: (name) ->
    if name then Call Literal(name + '.push'), [this] else Return this

  # Passes each child to a function, returning its return value if exists.
  eachChild: (fn) ->
    for name of @children then if child = @[name]
      if 'length' in child
      then return v if (v = fn node )? for node of child
      else return v if (v = fn child)?
    null

  # Performs `eachChild` on every descendant.
  # Overridden by `Code` not to cross scope by default.
  traverseChildren: (fn, xscope) ->
    @eachChild -> if (v = fn it)? then v else it.traverseChildren fn, xscope

  # Do I, or any of my children, contain a node of a certain kind?
  # Recursively traverses down the nodes' descendants and passess them to
  # `pred`, returning `true` when it finds a match.
  # Does not cross scope boundaries.
  contains: (pred) -> !!@traverseChildren -> pred(it) or null

  containsPureStatement: ->
    @isPureStatement() or @contains -> it.isPureStatement()

  invert: -> Op '!', this

  unwrapAll: -> node = this; continue until node is node.=unwrap(); node

  # Default implementations of the common node properties and methods. Nodes
  # will override these with custom logic, if needed.
  children: []

  terminater: ';'

  isComplex       : YES
  isStatement     : NO
  isPureStatement : NO
  isAssignable    : NO
  isArray         : NO
  isObject        : NO

  # Is this node used to assign a certain variable?
  assigns      : NO
  unfoldSoak   : NO
  unfoldAssign : NO
  unwrap       : THIS

  # `toString` representation of the node, for inspecting the parse tree.
  # This is what `coco --nodes` prints out.
  toString: (idt = '', name = @constructor.name) ->
    tree = '\n' + idt + name
    tree += '?' if @soak
    @eachChild -> tree += it.toString idt + TAB; null
    tree

#### Lines
# A list of expressions that forms the body of an
# indented block of code--the implementation of a function, a clause in an
# `if`, `switch`, or `try`, and so on.
class exports.Lines extends Node
  (node) =>
    return node if node instanceof Lines
    @lines = if node then [node] else []

  children: ['lines']

  add    : -> @lines.push it; this
  unwrap : -> if @lines.length is 1 then @lines[0] else this

  isComplex: -> @lines.length > 1 or !!@lines[0]?.isComplex()

  isStatement: (o) ->
    return true if o and not o.level
    for exp of @lines
      return true if exp.isPureStatement() or exp.isStatement o
    false

  # **Lines** does not return its entire body, rather it
  # ensures that the final line is returned.
  makeReturn: ->
    [node, i] = lastNonComment @lines
    @lines[i] = node.makeReturn it if node
    this

  compileNode: (o) ->
    o.lines = this
    top   = not o.level
    codes = []
    for node of @lines
      node = (do node.=unwrapAll).unfoldSoak(o) or node
      if top
        code = (node import front: true).compile o
        code = o.indent + code + node.terminater unless node.isStatement o
      else
        code = node.compile o, LEVEL_LIST
      codes.push code
    return codes.join '\n' if top
    code = codes.join(', ') or 'void 8'
    if codes.length > 1 and o.level >= LEVEL_LIST then "(#{code})" else code

  # **Lines** is the only node that can serve as the root.
  compileRoot: (o = {}) ->
    o.indent = @tab = if bare = delete o.bare then '' else TAB
    o.scope  = @scope = Scope.root = new Scope
    o.level  = LEVEL_TOP
    code = @compileWithDeclarations(o).replace /[^\n\S]+$/gm, ''
    # If we happen to be the top-level **Lines**, wrap everything in
    # a safety closure, unless requested not to.
    if bare then code else "(function(){\n#{code}\n}).call(this);\n"

  # Compile the expressions body for the contents of a function, with
  # declarations of all inner variables pushed up to the top.
  compileWithDeclarations: (o) ->
    code = post = ''
    for exp, i of @lines
      break unless exp.unwrap() instanceof [Comment, Literal]
    o.level = LEVEL_TOP
    if i
      rest   = @lines.splice i, 1/0
      code   = @compileNode o
      @lines = rest
    post = if @lines.length then @compileNode o else ''
    code &&+= '\n' if post
    if not o.globals and vars = @scope?.vars().join ', '
      code += o.indent + "var #{ multident vars, o.indent };\n"
    code + post

#### Literal
# Literals are static values that can be passed through directly into
# JavaScript without translation, such as identifiers, numbers, `this`, `break`
# and pretty much everything that doesn't fit in other nodes.
class exports.Literal extends Node
  (@value) =>
    # Break and continue must be treated as pure statements--they lose their
    # meaning when wrapped in a closure.
    @isPureStatement = YES if value of <[ break continue debugger ]>

  makeReturn   : -> if @isPureStatement() then this else super ...
  isAssignable : -> IDENTIFIER.test @value
  assigns      : -> it is @value

  isComplex: NO

  compile: (o, level) ->
    switch val = @value
    case 'this' then return o.scope.method?.bound or val
    case 'void' then val += ' 8'; fallthrough
    case 'null'
      if (level ? o.level) is LEVEL_ACCESS
        throw SyntaxError 'invalid use of ' + @value
      return val
    switch
    case val.reserved  then return '"' + val + '"'
    case val.js        then @terminater = ''
    val

  toString: -> ' "' + @value + '"'

#### Throw
class exports.Throw extends Node
  (@it) =>

  children: ['it']

  verb: 'throw'

  isStatement: YES

  makeReturn: THIS

  compile: (o) ->
    exp = @it?.compile o, LEVEL_PAREN
    o.indent + @verb + (if exp then ' ' + exp else '') + ';'

#### Return
class exports.Return extends Throw
  (@it) =>

  verb: 'return'

  isPureStatement: YES

#### Value
# Acts as a container for property access chains, by holding
# *Access*/*Index* instances within `@tails`.
class exports.Value extends Node
  (head, tails, at) =>
    return head if not tails and head instanceof Value
    this import {head, tails: tails || [], at}

  children: <[ head tails ]>

  add: -> @tails.push it; this

  hasProperties: -> !!@tails.length

  assigns      : -> not @tails.length and @head.assigns it
  isStatement  : -> not @tails.length and @head.isStatement it
  isArray      : -> not @tails.length and @head instanceof Arr
  isObject     : -> not @tails.length and @head instanceof Obj
  isComplex    : -> !!@tails.length or @head.isComplex()
  isAssignable : -> !!@tails.length or @head.isAssignable()

  makeReturn: ->
    if @tails.length then super ... else @head.makeReturn it

  # The value can be unwrapped as its inner node, if there are no accessors.
  unwrap: -> if @tails.length then this else @head

  # A reference has base part (`this` value) and name part.
  # We cache them separately for compiling complex expressions. So that
  #
  #     a()[b()] ?= c
  # compiles to:
  #
  #     (_base = a())[_name = b()] ? _base[_name] = c
  cacheReference: (o) ->
    name = @tails[*-1]
    if @tails.length < 2 and not @head.isComplex() and not name?.isComplex()
      return [this, this]  # `a` `a.b`
    base = Value @head, @tails.slice 0, -1
    if base.isComplex()  # `a().b`
      ref  = Literal o.scope.temporary 'base'
      base = Value Parens Assign ref, base
      bref = Value ref
      bref.temps = [ref.value]
    return [base, bref] unless name  # `a()`
    if name.isComplex()  # `a[b()]`
      ref  = Literal o.scope.temporary 'name'
      name = Index Assign ref, name.index
      nref = Index ref
      nref.temps = [ref.value]
    [base.add name; Value bref or base.head, [nref or name]]

  # We compile a value to JavaScript by compiling and joining each property.
  compileNode: (o) ->
    # Things get much more insteresting if the chain of accessors has *soak*
    # (`?.`) or *binding* (`&.`) interspersed.
    return asn.compile o if asn = @unfoldAssign o
    return val.compile o if val = @unfoldBind   o
    @head import {@front}
    val = (@tails.length and @substituteStar o) or this
    ps  = val.tails
    code  = val.head.compile o, if ps.length then LEVEL_ACCESS else null
    code += ' ' if ps[0] instanceof Access and SIMPLENUM.test code
    code += p.compile o for p of ps
    code

  substituteStar: (o) ->
    find = ->
      switch
      case it.value is '*'     then it
      case it instanceof Index then false
    for prop, i of @tails
      continue unless prop instanceof Index and
                      star = prop.traverseChildren find
      [sub, ref] = Value(@head, @tails.slice 0, i).cache o
      @temps = [ref.value] if sub isnt ref
      ref += ' ' if SIMPLENUM.test ref.=compile o
      star.value = ref + '.length'
      return Value sub, @tails.slice i
    null

  # Unfold a soak into an *If*: `a?.b` -> `a.b if a?`
  unfoldSoak: (o) ->
    if ifn = @head.unfoldSoak o
      ifn.then.tails.push ...@tails
      return ifn
    for prop, i of @tails then if prop.soak
      prop.soak = false
      fst = Value @head, @tails.slice 0, i
      snd = Value @head, @tails.slice i
      if fst.isComplex()
        ref = Literal o.scope.temporary 'ref'
        fst = Parens Assign ref, fst
        snd.head = ref
      ifn = If Existence(fst), snd, soak: true
      ifn.temps = [ref.value] if ref
      return ifn
    null

  unfoldAssign: (o) ->
    if asn = @head.unfoldAssign o
      asn.right.tails.push ...@tails
      return asn
    for prop, i of @tails then if prop.assign
      prop.assign = false
      [lhs, rhs] = Value(@head, @tails.slice 0, i).cacheReference o
      return Assign(lhs; Value rhs, @tails.slice i) import access: true
    null

  unfoldBind: (o) ->
    for p, i of ps = @tails then if p.bind
      p.bind = false
      [ctx, ref] = Value(@head, ps.slice 0, i).cache o
      fun = Value ref, [p]
      fun.temps = [ref.value] if ctx isnt ref
      return Value Call(Literal utility 'bind'; [ctx, fun]), ps.slice i+1
    null

#### Comment
# Coco passes through block comments as JavaScript block comments
# at the same position.
class exports.Comment extends Node
  (@comment) =>

  isPureStatement : YES
  isStatement     : YES
  makeReturn      : THIS

  compile: (o, level) ->
    code = '/*' + multident(@comment, o.indent) + '*/'
    if level ? o.level then code else o.indent + code

#### Call
# A function invocation.
class exports.Call extends Node
  (@callee, @args, open) =>
    @args or= (@splat = true; [Literal 'this'; Literal 'arguments'])
    @soak   = true if open is '?('

  children: <[ callee args ]>

  # List up a chain of calls from bottom. Used for unfolding `?.` and `.=`.
  digCalls: ->
    list = [call = this]
    list.push call while call.=callee.head instanceof Call
    list.reverse()

  unfoldSoak: (o) ->
    if @soak
      return ifn if ifn = If.unfoldSoak o, this, 'callee'
      [left, rite] = @callee.cacheReference o
      rite = Call rite, @args
      rite import {@new}
      left = Literal "typeof #{ left.compile o } == \"function\""
      return If left, Value(rite), soak: true
    for call of @digCalls()
      call.callee.head = ifn if ifn
      ifn = If.unfoldSoak o, call, 'callee'
    ifn

  unfoldAssign: (o) ->
    for call of @digCalls()
      call.callee.head = asn if asn
      if asn = call.callee.unfoldAssign o
        call.callee = asn.right; asn.right = Value call
    asn

  compileNode: (o) ->
    return asn.compile o if asn = @unfoldAssign o
    unless fun = (@callee.head or @callee) instanceof Code
      @callee import {@front}
    if @splat
      return @compileSplat o, @args[1].value if @new
      return @callee.compile(o, LEVEL_ACCESS) +
             ".apply(#{ @args[0].compile o }, #{@args[1].value})"
    return @compileSplat o, args if args = Splat.compileArray o, @args, true
    code = (@new or '') + @callee.compile(o, LEVEL_ACCESS) +
           "(#{ (arg.compile o, LEVEL_LIST for arg of @args).join ', ' })"
    if fun then "(#{code})" else code

  # If you call a function with a splat, it's converted into a JavaScript
  # `.apply()` call to allow an array of arguments to be passed.
  compileSplat: (o, args) ->
    if @new
      # If it's a constructor, we have to inject an inner constructor.
      idt = @tab + TAB
      return """
        (function(func, args, ctor){
        #{idt}ctor.prototype = func.prototype;
        #{idt}var child = new ctor, result = func.apply(child, args);
        #{idt}return result === Object(result) ? result : child;
        #{@tab}}(#{ @callee.compile o, LEVEL_LIST }, #{args}, function(){}))
      """
    base = @callee
    if (name = base.tails.pop()) and base.isComplex()
      ref = o.scope.temporary 'ref'
      fun = "(#{ref} = #{ base.compile o, LEVEL_LIST })#{ name.compile o }"
      o.scope.free ref
    else
      fun = base.compile o, LEVEL_ACCESS
      if name
        ref  = fun
        fun += name.compile o
      else
        ref  = 'null'
    "#{fun}.apply(#{ref}, #{args})"

#### Extends
# An operator that emulates class-ical inheritance.
class exports.Extends extends Node
  (@child, @parent) =>

  children: <[ child parent ]>

  compile: (o) ->
    Call(Value Literal utility 'extends'; [@child, @parent]).compile o

#### Import
# Operators that copy properties from right to left.
class exports.Import extends Node
  (@left, @right, own) => @util = if own then 'import' else 'importAll'

  children: <[ left right ]>

  compileNode: (o) ->
    unless @util is 'import' and @right.isObject()
      return Call(Value Literal utility @util; [@left, @right]).compile o
    top = not o.level
    {items} = @right.unwrap()
    if top and items.length < 2
    then  sub = lref  = @left
    else [sub , lref] = @left.cache o
    [delim, space] = if top then [';', '\n' + @tab] else [',', ' ']
    delim += space
    @temps = []
    code   = ''
    for node of items
      code += if com then space else delim
      if com = node instanceof Comment
        code += node.compile o, LEVEL_LIST
        continue
      if node instanceof Splat
        code += Import(lref, node.it, true).compile o, LEVEL_TOP
        continue
      dyna = false
      if node instanceof Assign
        {right: val, left: key} = node
      else if node.at
        key = (val = node).tails[0].name
      else
        dyna = node.=unwrap() instanceof Parens
        [key, val] = node.cache o
      acc = key instanceof Literal and IDENTIFIER.test key.value
      asn = Assign Value(lref, [(if acc then Access else Index) key]), val
      asn.temps = [val.value] if dyna and key isnt val
      code += asn.compile o, LEVEL_PAREN
    if sub is lref
      code.=slice delim.length
    else
      code = sub.compile(o, LEVEL_PAREN) + code
      o.scope.free lref.value
    return code if top
    unless node instanceof Splat
      code += (if com then ' ' else ', ') + lref.compile o, LEVEL_LIST
    if o.level < LEVEL_LIST then code else "(#{code})"

#### Access
# `x.y`
class exports.Access extends Node
  (@name, symbol) =>
    switch symbol
    case '?.' then @soak   = true
    case '&.' then @bind   = true
    case '.=' then @assign = true

  children: ['name']

  compile: (o) ->
    if (name = @name.compile o).charAt(0) of <[ \" \' ]>
    then "[#{name}]"
    else ".#{name}"

  isComplex: NO

  toString: (idt) ->
    super.call this, idt, @constructor.name + if @assign then '=' else ''

#### Index
# `x[y]`
class exports.Index extends Node
  (@index, symbol) =>
    switch symbol
    case '?[' then @soak   = true
    case '&[' then @bind   = true
    case '[=' then @assign = true

  children: ['index']

  compile: (o) -> "[#{ @index.compile o, LEVEL_PAREN }]"

  isComplex: -> @index.isComplex()

  toString: Access::toString

#### Obj
# `{x: y}`
class exports.Obj extends Node
  (@items = []) =>

  children: ['items']

  isObject: YES

  assigns: ->
    return true if node.assigns it for node of @items
    false

  compileNode: (o) ->
    {items} = this
    return (if @front then '({})' else '{}') unless items.length
    for node, i of items
      if node instanceof Splat or (node.left or node) instanceof Parens
        rest = items.splice i, 1/0
        break
    [last] = lastNonComment items
    idt    = o.indent += TAB
    dic    = {}
    code   = ''
    for node of items
      if node instanceof Comment
        code += node.compile(o, LEVEL_TOP) + '\n'
        continue
      code += idt + if node.at
        key = node.tails[0].name.compile o
        key + ': ' + node.compile o, LEVEL_LIST
      else if node instanceof Assign
        key = node.left.compile o
        node.compile o
      else (key = node.compile o, LEVEL_LIST) + ': ' + key
      throw SyntaxError 'duplicated property name: ' + key if dic[key + 0]
      dic[key + 0] = 1
      code += ',' unless node is last
      code += '\n'
    code = "{#{ code and '\n' + code + @tab }}"
    return @compileDynamic o, code, rest if rest
    if @front then "(#{code})" else code

  compileDynamic: (o, code, props) ->
    o.indent = @tab
    code = (oref = o.scope.temporary 'obj') + ' = ' + code + ', ' +
           Import(Literal(oref), Obj(props), true).compile o, LEVEL_PAREN
    o.scope.free oref
    if o.level < LEVEL_LIST then code else "(#{code})"

#### Arr
# `[x, y]`
class exports.Arr extends Node
  (@items = []) =>

  children: ['items']

  isArray: YES

  assigns: Obj::assigns

  compileNode: (o) ->
    return '[]' unless @items.length
    return code if code = Splat.compileArray o, @items
    o.indent += TAB
    code = (obj.compile o, LEVEL_LIST for obj of @items).join ', '
    if 0 < code.indexOf '\n'
    then "[\n#{o.indent}#{code}\n#{@tab}]"
    else "[#{code}]"

#### Class
class exports.Class extends Node
  (@title, @parent, body) => @code = Code [], body

  children: <[ title parent code ]>

  compileNode: (o) ->
    if @title
      decl = if @title instanceof Value
      then @title.tails[*-1].name?.value
      else @title.value
      if decl and decl.reserved
        throw SyntaxError "reserved word \"#{decl}\" cannot be a class name"
    name  = decl or @name
    name  = '_Class' unless name and IDENTIFIER.test name
    lname = Literal @code.bound = name
    proto = Value lname, [Access Literal 'prototype']
    @code.body.traverseChildren -> it.clas = name if it instanceof Code; null
    for node, i of exps = @code.body.lines
      if node.isObject()
        exps[i] = Import proto, node, true
      else if node instanceof Code
        throw SyntaxError 'more than one constructor in a class' if ctor
        ctor = node
    unless ctor
      exps.unshift ctor = Code()
      ctor.body.add Call Super() if @parent
    ctor import {name, 'ctor', 'statement', clas: null}
    exps.unshift Extends lname, @parent if @parent
    exps.push lname
    clas = Call @code, []
    clas = Assign lname , clas if decl and @title?.isComplex()
    clas = Assign @title, clas if @title
    clas.compile o

#### Assign
# Assignment to a local variable or the property of an object,
# including `:` within object literals.
class exports.Assign extends Node
  (@left, @right, @op = '=', @logic = @op.logic) => @op += ''

  children: <[ left right ]>

  assigns: (name) ->
    @[if @op is ':' then 'right' else 'left'].assigns name

  unfoldSoak: (o) -> If.unfoldSoak o, this, 'left'

  unfoldAssign: -> @access and this

  compileNode: (o) ->
    {left} = this
    if left.isArray() or left.isObject()
      return @compileDestructuring o unless @logic
      throw SyntaxError 'conditional assignment cannot be destructuring'
    return @compileConditional o if @logic
    name = left.compile o, LEVEL_LIST
    # Keep track of the name of the base object
    # we've been assigned to, for correct internal references.
    {right} = this
    if right instanceof [Code, Class] and match = METHOD_DEF.exec name
      right.clas   = match[1] if match[1]
      right.name ||= match[2] or match[3]
    val = right.compile o, LEVEL_LIST
    if @op is ':'
      throw SyntaxError 'invalid property name: ' + name if left.isComplex()
      return name + ': ' + val
    unless left.isAssignable()
      throw SyntaxError "\"#{ @left.compile o }\" cannot be assigned"
    if IDENTIFIER.test name
      if @op is '='
        o.scope.declare name
      else unless o.scope.check name, true
        throw SyntaxError "assignment to undeclared variable \"#{name}\""
    code = name + " #{ if @op is ':=' then '=' else @op } " + val
    if o.level < LEVEL_COND then code else "(#{code})"

  # When compiling a conditional assignment, take care to ensure that the
  # operands are only evaluated once, even though we have to reference them
  # more than once.
  compileConditional: (o) ->
    [left, rite] = Value(@left).cacheReference o
    Op(@logic, left, Assign rite, @right, @op).compile o

  # Implementation of recursive destructuring,
  # when assigning to an array or object literal.
  # See <http://wiki.ecmascript.org/doku.php?id=harmony:destructuring>.
  compileDestructuring: (o) ->
    {items} = left = @left.unwrap()
    return @right.compile o unless olen = items.length
    rite = @right.compile o, if olen is 1 then LEVEL_ACCESS else LEVEL_LIST
    if (olen > 1 or o.level) and
       (not IDENTIFIER.test(rite) or left.assigns(rite))
      cache = "#{ rref = o.scope.temporary 'ref' } = #{rite}"
      rite  = rref
    list = if left instanceof Arr
    then @destructArr o, items, rite
    else @destructObj o, items, rite
    o.scope.free rref  if rref
    list.unshift cache if cache
    list.push rite     if o.level
    code = list.join ', '
    if o.level < LEVEL_LIST then code else "(#{code})"

  destructArr: (o, nodes, rite) ->
    iinc = ''
    for node, i of nodes
      if node instanceof Splat
        if iinc then throw SyntaxError \
          "multiple splats in an assignment: " + node.compile o
        len = nodes.length
        val = utility('slice') + '.call(' + rite
        val = if i is len - 1
           val + if i then ", #{i})" else ')'
        else
          @temps = [ivar = o.scope.temporary 'i']
          iinc   = ivar + '++'
          "#{len} <= #{rite}.length" +
          " ? #{val}, #{i}, #{ivar} = #{rite}.length - #{len - i - 1})" +
          " : (#{ivar} = #{i}, [])"
        val = Literal val
      else
        val = Value lr ||= Literal(rite), [Index Literal iinc or i]
      Assign(node, val, @op).compile o, LEVEL_TOP

  destructObj: (o, nodes, rite) ->
    for node of nodes
      node.=it if splat = node instanceof Splat
      if dyna = (node.head or node) instanceof Parens
        [node, key] = Value(node.unwrapAll()).cacheReference o
      else if node instanceof Assign
        {right: node, left: key} = node
      else
        key = if node.at then node.tails[0].name else node
      acc = not dyna and IDENTIFIER.test key.unwrap().value or 0
      val = Value lr ||= Literal(rite), [(if acc then Access else Index) key]
      val = Import Obj(), val, true if splat
      Assign(node, val, @op).compile o, LEVEL_TOP

  toString: (idt) -> super.call this, idt, @constructor.name + ' ' + @op

#### Code
# A function definition. This is the only node that creates a `new Scope`.
class exports.Code extends Node
  (@params = [], @body = Lines(), arrow) =>
    @bound = '_this' if arrow is '=>'

  children: <[ params body ]>

  # Short-circuit `traverseChildren` method to prevent it
  # from crossing scope boundaries unless `xscope`.
  traverseChildren: (_, xscope) -> super ... if xscope

  isStatement: -> !!@statement

  makeReturn: -> if @statement then this import returns: true else super ...

  compileNode: (o) ->
    pscope = o.scope
    sscope = pscope.shared or pscope
    scope  = o.scope = @body.scope =
      new Scope (if @wrapper then pscope else sscope), @wrapper and sscope
    scope.method = this
    delete o.globals
    o.indent += TAB
    {params, body, name, statement, tab} = this
    code = 'function'
    if @bound is '_this'
      if @ctor
        scope.assign '_this', 'new _ctor'
        code += """
           _ctor(){} _ctor.prototype = #{name}.prototype;
          #{tab}function
        """
        body.add Return Literal '_this'
      else if b = sscope.method?.bound
      then @bound = b
      else sscope.assign '_this', 'this'
    vars = []
    asns = []
    for param of params then if param.splat
      splats = Assign Arr(p.asReference o for p of params), Literal 'arguments'
      break
    for param of params
      if param.isComplex()
        val = ref = param.asReference o
        val = Op '?', ref, param.value if param.value
        asns.push Assign param.name, val
      else if (ref = param).value
        asns.push Op '&&', Literal(ref.name.value + ' == null'),
                           Assign ref.name, ref.value
      vars.push ref unless splats
    wasEmpty = not (exps = body.lines).length
    asns.unshift splats  if splats
    exps.unshift ...asns if asns.length
    scope.parameter vars[i] = v.compile o for v, i of vars unless splats
    vars[0] = 'it' if not vars.length and body.contains(-> it.value is 'it')
    body.makeReturn() unless wasEmpty or @ctor
    if statement
      unless name
        throw SyntaxError 'cannot declare a nameless function'
      unless o.lines.scope is pscope
        throw SyntaxError 'cannot declare a function under a statement'
      scope .add name, 'function'
      pscope.add name, 'function' unless @returns
      code += ' ' + name
    code += '(' + vars.join(', ') + '){'
    code += "\n#{ body.compileWithDeclarations o }\n#{tab}" if exps.length
    code += '}'
    if statement and name.charAt(0) isnt '_'
      code += " #{name}.name = \"#{name}\";"
    code += "\n#{tab}return #{name};" if @returns
    return tab + code if statement
    if @front then "(#{code})" else code

#### Param
# A parameter in a function definition with an arbitrary LHS expression and
# an optional default value.
class exports.Param extends Node
  (@name, @value, @splat) =>

  children: <[ name value ]>

  compile: (o) -> @name.compile o, LEVEL_LIST

  asReference: (o) ->
    return @reference if @reference
    node = @name
    if node.at
      node .= tails[0].name
      node  = Literal '$' + node.value if node.value.reserved
    else if node.isComplex()
      node  = Literal o.scope.temporary 'arg'
    @reference = if @splat then Splat node else node

  isComplex: -> @name.isComplex()

#### Splat
# A splat, either as a parameter to a function, an argument to a call,
# or as part of a destructuring assignment.
class exports.Splat extends Node
  => @it = if it instanceof Node then it else Literal it

  children: ['it']

  isAssignable: YES

  assigns: -> @it.assigns it

  compile: -> @it.compile ...arguments

  # Compiles a list of nodes mixed with splats to a proper array.
  @compileArray = (o, list, apply) ->
    break if node instanceof Splat for node, index of list
    return '' if index >= list.length
    if list.length is 1
      code = list[0].compile o, LEVEL_LIST
      return if apply then code else utility('slice') + ".call(#{code})"
    args = list.slice index
    for node, i of args
      code = node.compile o, LEVEL_LIST
      args[i] = if node instanceof Splat
      then utility('slice') + ".call(#{code})"
      else "[#{code}]"
    return args[0] + ".concat(#{ args.slice(1).join ', ' })" unless index
    base = (node.compile o, LEVEL_LIST for node of list.slice 0, index)
    "[#{ base.join ', ' }].concat(#{ args.join ', ' })"

#### While
# A while loop, the only sort of low-level loop exposed by Coco.
class exports.While extends Node
  (@condition, name) => @condition.=invert() if name is 'until'

  children: <[ condition body ]>

  isStatement: YES

  containsPureStatement: ->
    {lines} = @body
    return false unless i = lines.length
    return true if lines[--i]?.containsPureStatement()
    ret = -> it instanceof Return
    return true if lines[--i].contains ret while i
    false

  addBody: (@body) -> this

  makeReturn: ->
    if it
      @body.makeReturn it
    else unless @containsPureStatement()
      @returns = true
    this

  compileNode: (o) ->
    code = @condition?.compile(o, LEVEL_PAREN) or 'true'
    code = @tab + if code is 'true' then 'for (;;' else 'while (' + code
    o.indent += TAB
    code + ') {' + @compileBody o

  compileBody: (o) ->
    {body} = this
    [last, i] = lastNonComment exps = body.lines
    if last?.value is 'continue'
      exps.splice i, 1
      [last, i] = lastNonComment exps
    ret = ''
    if @returns
      if last and last not instanceof Throw
        o.scope.assign res = '_results', '[]'
        exps[i] = last.makeReturn res
      ret = "\n#{@tab}return #{ res or '[]' };"
    return '}' + ret unless exps.length
    code = '\n'
    code + body.compile(o, LEVEL_TOP) + "\n#{@tab}}" + ret

#### Op
# Simple Arithmetic and logical operations, with some special conversions.
class exports.Op extends Node
  (op, first, second, post) =>
    return Of first, second if op is 'of'
    return Call first, []   if op is 'do'
    if op is 'new'
      {head} = first
      if head instanceof Call
        head.digCalls()[0].new = 'new '
        return first
      head.keep = true if head instanceof Parens
    this import {op, first, second, post}

  EQUALITY = /^[!=]==?$/
  COMPARER = /^(?:[!=]=|[<>])=?$/

  children: <[ first second ]>

  invert: ->
    if EQUALITY.test(op = @op) and not COMPARER.test(@first.op)
      @op = '!='.charAt(op.indexOf '=') + op.slice 1
      return this
    return Op '!', Parens this if @second
    return fst if op is '!' and
                  (fst = @first.unwrap()).op of <[ ! in instanceof < > <= >= ]>
    Op '!', this

  unfoldSoak: (o) ->
    @op of <[ ++ -- delete ]> and If.unfoldSoak o, this, 'first'

  compileNode: (o) ->
    return @compileUnary o if not @second
    return @compileChain o if COMPARER.test(@op) and COMPARER.test(@first.op)
    return @compileExistence o if @op is '?'
    return @compileMultiIO   o if @op is 'instanceof' and @second.isArray()
    @first import {@front}
    code = @first .compile(o, LEVEL_OP) + " #{@op} " +
           @second.compile(o, LEVEL_OP)
    if o.level <= LEVEL_OP then code else "(#{code})"

  # Mimic Python's chained comparisons when multiple comparison operators are
  # used sequentially. For example:
  #
  #     $ coco -e 'console.log 50 < 65 === 9r72 > 10'
  #     true
  #
  # See <http://docs.python.org/reference/expressions.html#notin>.
  compileChain: (o) ->
    [sub, ref] = @first.second.cache o
    @first.second = sub
    code  = @first.compile o, LEVEL_OP
    code .= slice 1, -1 if code.charAt(0) is '('
    code += " && #{ ref.compile o } #{@op} #{ @second.compile o, LEVEL_OP }"
    o.scope.free ref.value if sub isnt ref
    if o.level < LEVEL_OP then code else "(#{code})"

  compileExistence: (o) ->
    if @first.isComplex()
      ref = tmp = o.scope.temporary 'ref'
      fst = Parens Assign Literal(ref), @first
    else
      fst = @first
      ref = fst.compile o
    code  = Existence(fst).compile o
    code += ' ? ' + ref + ' : ' + @second.compile o, LEVEL_LIST
    o.scope.free tmp if tmp
    code

  compileUnary: (o) ->
    {op} = this
    return @compileDelete o if op is 'delete' and o.level
    code = @first.compile o, LEVEL_OP
    code = if @post
    then code + op
    else if op of <[ new typeof delete ]> or
            op of <[ + - ]> and @first.op is op
    then op + ' ' + code
    else op + code
    if o.level <= LEVEL_OP then code else "(#{code})"

  compileMultiIO: (o) ->
    [sub, ref] = @first.cache o, LEVEL_OP
    tests = for item, i of @second.head.items
      (if i then ref else sub) + ' instanceof ' + item.compile o
    o.scope.free ref if sub isnt ref
    code = tests.join ' || '
    if o.level < LEVEL_OP then code else "(#{code})"

  compileDelete: (o) ->
    code = ref = o.scope.temporary 'ref'
    [get, del] = Value(@first).cacheReference o
    code += ' = ' + get.compile(o, LEVEL_LIST) + ', delete ' +
                    del.compile(o, LEVEL_LIST) + ', ' + ref
    o.scope.free ref
    if o.level < LEVEL_LIST then code else "(#{code})"

  toString: Assign::toString

#### Of
# Handles `of` operation that test if the left operand is included within
# the right operand, arraywise.
class exports.Of extends Node
  (@object, @array) =>

  children: <[ object array ]>

  invert: NEGATE

  compileNode: (o) ->
    if @array.isArray() then @compileOrTest o else @compileLoopTest o

  compileOrTest: (o) ->
    [sub, ref] = @object.cache o, LEVEL_OP
    [cmp, cnj] = if @negated then [' !== ', ' && '] else [' === ', ' || ']
    tests = for item, i of @array.head.items
      (if i then ref else sub) + cmp + item.compile o, LEVEL_OP
    o.scope.free ref if sub isnt ref
    code = tests.join cnj
    if o.level < LEVEL_OP then code else "(#{code})"

  compileLoopTest: (o) ->
    [sub, ref] = @object.cache o, LEVEL_LIST
    code = utility('indexOf') +
           ".call(#{ @array.compile o, LEVEL_LIST }, #{ref}) " +
           if @negated then '< 0' else '>= 0'
    return code if sub is ref
    o.scope.free ref
    code = sub + ', ' + code
    if o.level < LEVEL_LIST then code else "(#{code})"

  toString: (idt) ->
    super.call this, idt, @constructor.name + if @negated then '!' else ''

#### Try
# Classic `try`-`catch`-`finally` block with optional `catch`.
class exports.Try extends Node
  (@attempt, @thrown, @recovery, @ensure) =>

  children: <[ attempt recovery ensure ]>

  isStatement: YES

  makeReturn: ->
    @attempt  &&= @attempt .makeReturn it
    @recovery &&= @recovery.makeReturn it
    this

  compileNode: (o) ->
    o.indent += TAB
    code = @tab + "try {\n#{ @attempt.compile o, LEVEL_TOP }\n#{@tab}}"
    if @recovery
      reco  = @recovery.compile o, LEVEL_TOP
      code += " catch (#{@thrown}) {\n#{reco}\n#{@tab}}"
    else unless @ensure
      code += ' catch (_e) {}'
    code += " finally {\n#{ @ensure.compile o, LEVEL_TOP }\n#{@tab}}" if @ensure
    code

#### Existence
# Checks a value for existence--not `undefined` nor `null`.
class exports.Existence extends Node
  (@it) =>

  children: ['it']

  invert: NEGATE

  compileNode: (o) ->
    code = @it.compile o, LEVEL_OP
    if IDENTIFIER.test(code) and not o.scope.check code, true
      code = 'typeof ' + code + if @negated
      then " == \"undefined\" || #{code} === null"
      else " != \"undefined\" && #{code} !== null"
    else
      code += " #{ if @negated then '=' else '!' }= null"
    if o.level <= LEVEL_COND then code else "(#{code})"

#### Parens
# An extra set of parentheses, specifying explicitly in the source.
class exports.Parens extends Node
  (@lines, @keep) =>

  children: ['lines']

  unwrap          : -> @lines
  makeReturn      : -> @lines.makeReturn it
  isComplex       : -> @lines.isComplex()
  isStatement     : -> @lines.isStatement()
  isPureStatement : -> @lines.isPureStatement()

  compileNode: (o) ->
    (expr = @lines.unwrap()) import {@front}
    return expr.compile o if not @keep and
      (expr instanceof [Value, Call, Code, Parens] or
       o.level < LEVEL_OP and expr instanceof Op)
    code = expr.compile o, LEVEL_PAREN
    if expr.isStatement() then code else "(#{code})"

#### For
# Coco's replacement for the `for` loop are array, object or range iterators.
# They also act as an expression, collecting values from the last expression
# and returning them as an array.
class exports.For extends While
  =>

  children: <[ source name from to step body ]>

  compileNode: (o) ->
    if @index instanceof Node and not @index.=unwrap().value
      throw SyntaxError 'invalid index variable: ' + head.index
    {scope} = o
    @temps = []
    if idx = @index
    then scope.declare idx
    else @temps.push idx = scope.temporary 'i'
    unless @object
      [step, pvar] = (@step || Literal 1).compileLoopReference o, 'step'
      @temps.push pvar if step isnt pvar
    if @from
      eq = if @op is 'til' then '' else '='
      [tail, tvar] = @to.compileLoopReference o, 'to'
      vars = idx + ' = ' + @from.compile o
      if tail isnt tvar
        vars += ', ' + tail
        @temps.push tvar
      cond = if +pvar
      then "#{idx} #{ if pvar < 0 then '>' else '<' }#{eq} #{tvar}"
      else "#{pvar} < 0 ? #{idx} >#{eq} #{tvar} : #{idx} <#{eq} #{tvar}"
    else
      if @name or @object and @own
        [srcPart, svar] = @source.compileLoopReference o, 'ref'
        @temps.push svar if srcPart isnt svar
      else
        srcPart = svar = @source.compile o, LEVEL_PAREN
      unless @object
        srcPart = "(#{srcPart})" if srcPart isnt svar
        if 0 > pvar and (pvar | 0) is +pvar  # negative int
          vars = "#{idx} = #{srcPart}.length - 1"
          cond = "#{idx} >= 0"
        else
          @temps.push lvar = scope.temporary 'len'
          vars = "#{idx} = 0, #{lvar} = #{srcPart}.length"
          cond = "#{idx} < #{lvar}"
    if @object
      forPart = idx + ' in ' + srcPart
      ownPart = "if (#{ utility 'owns' }.call(#{svar}, #{idx})) " if @own
    else
      vars   += ', ' + step if step isnt pvar
      forPart = vars + "; #{cond}; " + switch +pvar
      case  1 then '++' + idx
      case -1 then '--' + idx
      default idx + if pvar < 0 then ' -= ' + pvar.slice 1 else ' += ' + pvar
    @pluckDirectCalls o
    head = @tab + "for (#{forPart}) #{ ownPart or '' }{"
    o.indent += TAB
    if @name
      head += '\n' + o.indent
      item  = svar + "[#{idx}]"
      if @nref
        head += @nref + ' = ' + item + ', '
        item  = @nref
      head += Assign(@name, Literal item).compile(o, LEVEL_TOP) + ';'
    body  = @compileBody o
    head += '\n' + @tab if @name and body.charAt(0) is '}'
    head + body

  pluckDirectCalls: (o) ->
    @body.eachChild dig = =>
      unless it instanceof Call and
             (fn = it.callee.unwrapAll()) instanceof Code and
             fn.params.length is it.args.length
        return if it instanceof [Code, For] then null else it.eachChild dig
      if @index
        fn.params.push Param it.args[*] = Literal @index
      if name = @name
        it.args.push Literal if name.isComplex()
        then @nref ||= @temps[*] = o.scope.temporary 'ref'
        else name.value
        fn.params.push Param name
      it.callee = Value Literal ref = o.scope.temporary 'fn'
      o.scope.assign ref, fn.compile o import {indent: ''}, LEVEL_LIST
      o.indent = @tab
      null

#### Switch
# Compiles to the regular JS `switch`-`case`-`default`,
# but with forced `break` after each cases.
class exports.Switch extends Node
  (@switch, @cases, @default) =>
    tests[i].=invert() for own i in tests for {tests} of cases unless $switch

  children: <[ switch cases default ]>

  isStatement: YES

  makeReturn: ->
    cs.makeReturn it for cs of @cases
    @default?.makeReturn it
    this

  compileNode: (o) ->
    {tab} = this
    code  = tab + "switch (#{ @switch?.compile(o, LEVEL_PAREN) or false }) {\n"
    stop  = @default or @cases.length - 1
    code += cs.compileCase o, tab, i is stop for cs, i of @cases
    if @default
      o.indent = tab + TAB
      def   = @default.compile o, LEVEL_TOP
      code += tab + "default:#{ def and '\n' + def  }\n"
    code + tab + '}'

#### Case
# Convinient container node for `case` blocks.
class exports.Case extends Node
  (@tests, @body) =>

  children: <[ tests body ]>

  makeReturn: ->
    [last] = lastNonComment @body.lines
    @body.makeReturn it if last and last.head?.value isnt 'fallthrough'

  compileCase: (o, tab, nobr) ->
    code = br = ''
    add  = -> code += tab + "case #{ it.compile o, LEVEL_PAREN }:\n"
    for test of @tests
      if test.=unwrap() instanceof Arr
      then add t for t of test.items
      else add test
    [last, i] = lastNonComment exps = @body.lines
    exps[i] = Comment ' fallthrough ' if ft = last.head?.value is 'fallthrough'
    o.indent = tab + TAB
    code += body + '\n' if body = @body.compile o, LEVEL_TOP
    code += o.indent + 'break;\n' unless nobr or ft or
      last instanceof Throw or last.value of <[ continue break ]>
    code

#### If
# The `if`/`else` structure that acts as both statement and expression.
class exports.If extends Node
  (@if, @then, {@statement, @soak, name} = {}) =>
    @if.=invert() if name is 'unless'

  children: <[ if then else ]>

  # Rewrite a chain of **If**s to add a default case as the final `else`.
  addElse: ->
    if @chain
      @else.addElse it
    else
      @chain = it instanceof If
      @else  = it
    this

  # An **If** only compiles into a statement if either of its bodies needs
  # to be a statement. Otherwise a conditional operator is safe.
  isStatement: (o) ->
    @statement or o and not o.level or
    @then.isStatement(o) or @else?.isStatement(o)

  makeReturn: ->
    @then.=makeReturn it
    @else.=makeReturn it if @else
    this

  compileNode: (o) ->
    if @isStatement o then @compileStatement o else @compileExpression o

  compileStatement: (o) ->
    code  = if delete o.chainChild then '' else @tab
    code += "if (#{ @if.compile o, LEVEL_PAREN }) {"
    o.indent += TAB
    code += "\n#{body}\n" + @tab if body = Lines(@then).compile o
    code += '}'
    return code unless @else
    code + ' else ' + if @chain
    then @else.compile (o import indent: @tab, chainChild: true), LEVEL_TOP
    else if body = @else.compile o, LEVEL_TOP
    then "{\n#{body}\n#{@tab}}"
    else '{}'

  # Compile me as a conditional operator.
  compileExpression: (o) ->
    code = @if.compile o, LEVEL_COND
    pad  = if @else?.isComplex() and @then.isComplex()
    then '\n' + o.indent += TAB else ' '
    code += pad + '? ' +  @then .compile(o, LEVEL_LIST) +
            pad + ': ' + (@else?.compile(o, LEVEL_LIST) or 'void 8')
    if o.level < LEVEL_COND then code else "(#{code})"

  unfoldSoak: -> @soak and this

  # Unfold a node's child if soak, then tuck the node under the created **If**.
  @unfoldSoak = (o, parent, name) ->
    return unless ifn = parent[name].unfoldSoak o
    parent[name] = ifn.then; ifn.then = Value parent
    ifn

#### Super
# Reference to the parent method.
class exports.Super extends Node
  =>

  isAssignable: YES

  compile: (o) ->
    {method} = o.scope.shared or o.scope
    throw SyntaxError 'cannot call super outside of a function' unless method
    {name, clas} = method
    if name
      if clas
        return clas + '.superclass.prototype' +
               if IDENTIFIER.test name then '.' + name else '[' + name + ']'
      else if IDENTIFIER.test name
        return name + '.superclass'
    throw SyntaxError 'cannot call super on an anonymous function'

# Export `import all` for use in [parser](../lib/parser.js),
# where the operator doesn't work.
exports import all mix: __importAll

##### Constants

function YES  -> true
function NO   -> false
function THIS -> this

function NEGATE -> @negated ^= 1; this

UTILITIES =
  # Correctly set up a prototype chain for inheritance, including a reference
  # to the superclass for `super()` calls.
  extends: '''
    function(sub, sup){
      function ctor(){} ctor.prototype = (sub.superclass = sup).prototype;
      return (sub.prototype = new ctor).constructor = sub;
    }
  '''

  # Create a function bound to the current value of "this".
  bind: '''
    function(me, fn){ return function(){ return fn.apply(me, arguments) } }
  '''

  # Copies properties from right to left.
  import: '''
    function(obj, src){
      var own = Object.prototype.hasOwnProperty;
      for (var key in src) if (own.call(src, key)) obj[key] = src[key];
      return obj;
    }
  '''
  importAll: '''
    function(obj, src){ for (var key in src) obj[key] = src[key]; return obj }
  '''

  # Shortcuts to speed up the lookup time for native functions.
  owns    : 'Object.prototype.hasOwnProperty'
  slice   : 'Array.prototype.slice'
  indexOf : '''
    Array.prototype.indexOf || function(x){
      for (var i = this.length; i-- && this[i] !== x;); return i;
    }
  '''

# Levels indicates a node's position in the AST.
LEVEL_TOP    = 0  # ...;
LEVEL_PAREN  = 1  # (...)
LEVEL_LIST   = 2  # [...]
LEVEL_COND   = 3  # ... ? x : y
LEVEL_OP     = 4  # !...
LEVEL_ACCESS = 5  # ...[0]

# Tabs are two spaces for pretty printing.
TAB = '  '

IDENTIFIER = /^[$A-Za-z_][$\w]*$/
SIMPLENUM  = /^\d+$/
METHOD_DEF = /// ^
  (?: (\S+)\.prototype(?=\.) | \S*? )
  (?: (?:\.|^)([$A-Za-z_][$\w]*) | \[( ([\"\']).+?\4 | \d+ )])
$ ///

##### Helpers

# Declares a utility function at the top level.
utility = (name) ->
  Scope.root.assign ref = '__' + name, UTILITIES[name]
  ref

multident = (code, tab) -> code.replace /\n/g, '$&' + tab

lastNonComment = (nodes) ->
  break if node not instanceof Comment for node, i of nodes by -1
  [i >= 0 and node, i]
