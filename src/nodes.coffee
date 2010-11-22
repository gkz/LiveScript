# Contains all of the node classes for the syntax tree. Most
# nodes are created as the result of actions in the [grammar](grammar.html),
# but some are created by other nodes as a method of code generation. To convert
# the syntax tree into a string of JavaScript code, call `compile()` on the root.

{Scope} = require './scope'

#### Base
# The **Base** is the abstract base class for all nodes in the syntax tree.
# Each subclass implements the `compileNode` method, which performs the
# code generation for that node. To compile a node to JavaScript,
# call `compile` on it, which wraps `compileNode` in some generic extra smarts,
# to know when the generated code needs to be wrapped up in a closure.
# An options hash is passed and cloned throughout, containing information about
# the environment from higher in the tree (such as if a returned value is
# being requested by the surrounding function), information about the current
# scope, and indentation level.
class exports.Base
  # Common logic for determining whether to wrap this node in a closure before
  # compiling it, or to compile directly. We need to wrap if this node is a
  # *statement*, and it's not a *pureStatement*, and we're not at
  # the top level of a block (which would be unnecessary), and we haven't
  # already been asked to return the result (because statements know how to
  # return results).
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

  # Statements converted into expressions via closure-wrapping share a scope
  # object with their parent closure, to preserve the expected lexical scope.
  compileClosure: (o) ->
    if @containsPureStatement()
      throw SyntaxError 'cannot include a pure statement in an expression'
    args = []
    func = Code [], Expressions this
    func.wrapper = true
    if @contains(-> it.value is 'this' or it.bound)
      args.push Literal 'this'
      call = Value func, [Access Literal 'call']
    mentionsArgs = false
    @traverseChildren false, ->
      if it instanceof Literal and it.value is 'arguments'
        mentionsArgs := it.value = '_args'
    if mentionsArgs
      args.push Literal 'arguments'
      func.params.push Param Literal '_args'
    Parens(Call(call or func, args), true).compileNode o

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
      if level then [sub.compile(o, level), ref.value] else [sub, ref]

  # Compile to a source/variable pair suitable for looping.
  compileLoopReference: (o, name) ->
    src = tmp = @compile o, LEVEL_LIST
    unless -1/0 < +src < 1/0 or IDENTIFIER.test(src) and o.scope.check(src)
      src = "#{ tmp = o.scope.temporary name } = #{src}"
    [src, tmp]

  # Construct a node that returns the current node's result.
  # Note that this is overridden for smarter behavior for
  # many statement nodes (e.g. If, For etc.).
  makeReturn: (name) ->
    if name then Call Literal(name + '.push'), [this] else Return this

  # Does this node, or any of its children, contain a node of a certain kind?
  # Recursively traverses down the *children* of the nodes, yielding to a block
  # and returning true when the block finds a match. `contains` does not cross
  # scope boundaries.
  contains: (pred) ->
    contains = false
    @traverseChildren false, -> not contains := true if pred it
    contains

  # Convenience for the most common use of contains. Does the node contain
  # a pure statement?
  containsPureStatement: ->
    @isPureStatement() or @contains -> it.isPureStatement()

  # Passes each child to a function, breaking when the function returns `false`.
  eachChild: (func) ->
    for name of @children then if child = @[name]
      if 'length' in child
      then return this if false is func node for node of child
      else return this if false is func child
    this

  traverseChildren: (crossScope, func) ->
    @eachChild (child) ->
      return false if false is func child
      child.traverseChildren crossScope, func

  invert: -> Op '!', this

  unwrapAll: ->
    node = this
    continue until node is node.=unwrap()
    node

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

  assigns      : NO   # Is this node used to assign a certain variable?
  unfoldSoak   : NO
  unfoldAssign : NO
  unwrap       : THIS

  # `toString` representation of the node, for inspecting the parse tree.
  # This is what `coco --nodes` prints out.
  toString: (idt = '', name = @constructor.name) ->
    tree = '\n' + idt + name
    tree += '?' if @soak
    @eachChild -> tree += it.toString idt + TAB
    tree

#### Expressions
# The expressions body is the list of expressions that forms the body of an
# indented block of code -- the implementation of a function, a clause in an
# `if`, `switch`, or `try`, and so on...
class exports.Expressions extends Base
  (node) =>
    return node if node instanceof Expressions
    @expressions = if node then [node] else []

  children: ['expressions']

  append: -> @expressions.push it; this
  unwrap: -> if @expressions.length is 1 then @expressions[0] else this

  isStatement: (o) ->
    return true if o and not o.level
    for exp of @expressions
      return true if exp.isPureStatement() or exp.isStatement o
    false

  # An Expressions node does not return its entire body, rather it
  # ensures that the final expression is returned.
  makeReturn: ->
    [node, i] = lastNonComment @expressions
    @expressions[i] = node.makeReturn it if node
    this

  # An **Expressions** is the only node that can serve as the root.
  compile: (o = {}, level) ->
    if o.scope then super.call this, o, level else @compileRoot o

  compileNode: (o) ->
    o.expressions = this
    @tab  = o.indent
    top   = not o.level
    codes = []
    for node of @expressions
      node = (do node.=unwrapAll).unfoldSoak(o) or node
      if top
        code = (node import front: true).compile o
        code = @tab + code + node.terminater unless node.isStatement o
      else
        code = node.compile o, LEVEL_LIST
      codes.push code
    return codes.join '\n' if top
    code = codes.join(', ') or 'void 8'
    if codes.length > 1 and o.level >= LEVEL_LIST then "(#{code})" else code

  # If we happen to be the top-level **Expressions**, wrap everything in
  # a safety closure, unless requested not to.
  # It would be better not to generate them in the first place, but for now,
  # clean up obvious double-parentheses.
  compileRoot: (o) ->
    o.indent = @tab = if bare = delete o.bare then '' else TAB
    o.scope  = new Scope null, this, null
    o.level  = LEVEL_TOP
    code = @compileWithDeclarations(o).replace /[^\n\S]+$/gm, ''
    if bare then code else "(function(){\n#{code}\n}).call(this);\n"

  # Compile the expressions body for the contents of a function, with
  # declarations of all inner variables pushed up to the top.
  compileWithDeclarations: (o) ->
    code = post = ''
    for exp, i of @expressions
      break unless exp.unwrap() instanceof [Comment, Literal]
    o.level = LEVEL_TOP
    if i
      rest = @expressions.splice i, 1/0
      code = @compileNode o
      @expressions = rest
    post = if @expressions.length then @compileNode o else ''
    if not o.globals and this is o.scope.expressions
      vars = o.scope.vars().join ', '
    code &&+= '\n' if post
    code += @tab + "var #{ multident vars, @tab };\n" if vars
    code + post

#### Literal
# Literals are static values that can be passed through directly into
# JavaScript without translation, such as identifiers, numbers, `this`, `break`
# and pretty much everything that doesn't fit in other nodes.
class exports.Literal extends Base
  (@value) =>
    # Break and continue must be treated as pure statements -- they lose their
    # meaning when wrapped in a closure.
    @isPureStatement = YES if value of <[ break continue debugger ]>

  makeReturn   : -> if @isPureStatement() then this else super ...
  isAssignable : -> IDENTIFIER.test @value
  assigns      : -> it is @value

  isComplex: NO

  compile: (o) ->
    return "\"#{@value}\"" if @value.reserved
    @terminater = '' if @value.js
    @value

  toString: -> ' "' + @value + '"'

#### Return
class exports.Return extends Base
  (@expression) =>

  children: ['expression']

  isStatement     : YES
  isPureStatement : YES

  makeReturn: THIS

  compile: (o, level) ->
    exp = @expression?.makeReturn()
    if exp and exp not instanceof Return
      exp.compile o, level
    else
      exp = exp?.expression or ''
      o.indent + "return#{ exp and ' ' + exp.compile o, LEVEL_PAREN };"

#### Value
# Container for property access chains, by holding `Access`/`Index` instances
# wihtin `@properties`.
class exports.Value extends Base
  # A **Value** has a base and a list of property accesses.
  (base, props, tag) =>
    return base if not props and base instanceof Value
    @base       = base
    @properties = props or []
    @[tag]      = true if tag

  children: <[ base properties ]>

  append: -> @properties.push it; this

  hasProperties: -> !!@properties.length

  assigns      : -> not @properties.length and @base.assigns it
  isStatement  : -> not @properties.length and @base.isStatement it
  isArray      : -> not @properties.length and @base instanceof Arr
  isObject     : -> not @properties.length and @base instanceof Obj
  isComplex    : -> !!@properties.length or @base.isComplex()
  isAssignable : -> !!@properties.length or @base.isAssignable()

  makeReturn: ->
    if @properties.length then super ... else @base.makeReturn it

  # The value can be unwrapped as its inner node, if there are no attached
  # properties.
  unwrap: -> if @properties.length then this else @base

  # A reference has base part (`this` value) and name part.
  # We cache them separately for compiling complex expressions.
  # `a()[b()] ?= c` -> `(_base = a())[_name = b()] ? _base[_name] = c`
  cacheReference: (o) ->
    name = @properties[*-1]
    if @properties.length < 2 and not @base.isComplex() and not name?.isComplex()
      return [this, this]  # `a` `a.b`
    base = Value @base, @properties.slice 0, -1
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
    [base.append(name), Value(bref or base.base, [nref or name])]

  # We compile a value to JavaScript by compiling and joining each property.
  # Things get much more insteresting if the chain of properties has *soak*
  # operators `?.` interspersed. Then we have to take care not to accidentally
  # evaluate anything twice when building the soak chain.
  compileNode: (o) ->
    return asn.compile o if asn = @unfoldAssign o
    return val.compile o if val = @unfoldBind   o
    @base import {@front}
    val = (@properties.length and @substituteStar o) or this
    ps  = val.properties
    code  = val.base.compile o, if ps.length then LEVEL_ACCESS else null
    code += ' ' if ps[0] instanceof Access and SIMPLENUM.test code
    code += p.compile o for p of ps
    code

  substituteStar: (o) ->
    star = null
    find = ->
      switch
      case it.value is '*'     then star := it; fallthrough
      case it instanceof Index then false
    for prop, i of @properties then if prop instanceof Index
      prop.traverseChildren false, find
      continue unless star
      [sub, ref] = Value(@base, @properties.slice 0, i).cache o
      @temps = [ref.value] if sub isnt ref
      ref += ' ' if SIMPLENUM.test ref.=compile o
      star.value = ref + '.length'
      return Value sub, @properties.slice i
    null

  # Unfold a soak into an `If`: `a?.b` -> `a.b if a?`
  unfoldSoak: (o) ->
    if ifn = @base.unfoldSoak o
      ifn.then.properties.push @properties...
      return ifn
    for prop, i of @properties then if prop.soak
      prop.soak = false
      fst = Value @base, @properties.slice 0, i
      snd = Value @base, @properties.slice i
      if fst.isComplex()
        ref = Literal o.scope.temporary 'ref'
        fst = Parens Assign ref, fst
        snd.base = ref
      ifn = If Existence(fst), snd, soak: true
      ifn.temps = [ref.value] if ref
      return ifn
    null

  unfoldAssign: (o) ->
    if asn = @base.unfoldAssign o
      asn.right.properties.push @properties...
      return asn
    for prop, i of @properties then if prop.assign
      prop.assign = false
      [lhs, rhs] = Value(@base, @properties.slice 0, i).cacheReference o
      return Assign(lhs, Value rhs, @properties.slice i) import {access: true}
    null

  unfoldBind: (o) ->
    for p, i of ps = @properties then if p.bind
      p.bind = false
      [ctx, ref] = Value(@base, ps.slice 0, i).cache o
      fun = Value ref, [p]
      fun.temps = [ref.value] if ctx isnt ref
      return Value Call(Literal(utility 'bind'), [ctx, fun]), ps.slice i+1
    null

#### Comment
# Coco passes through block comments as JavaScript block comments
# at the same position.
class exports.Comment extends Base
  (@comment) =>

  isPureStatement : YES
  isStatement     : YES
  makeReturn      : THIS

  compile: (o, level) ->
    code = '/*' + multident(@comment, o.indent) + '*/'
    if level ? o.level then code else o.indent + code

#### Call
# Node for a function invocation.
class exports.Call extends Base
  (@callee, @args, open) =>
    @args or= (@splat = true; [Literal('this'), Literal('arguments')])
    @soak   = true if open is '?('

  children: <[ callee args ]>

  # List up a chain of calls from bottom. Used for unfolding `?.` and `.=`.
  digCalls: ->
    list = [call = this]
    list.push call while call.=callee.base instanceof Call
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
      call.callee.base = ifn if ifn
      ifn = If.unfoldSoak o, call, 'callee'
    ifn

  unfoldAssign: (o) ->
    for call of @digCalls()
      call.callee.base = asn if asn
      if asn = call.callee.unfoldAssign o
        call.callee = asn.right; asn.right = Value call
    asn

  compileNode: (o) ->
    return asn.compile o if asn = @unfoldAssign o
    @callee import {@front}
    if @splat
      return @compileSplat o, @args[1].value if @new
      return @callee.compile(o, LEVEL_ACCESS) +
             ".apply(#{@args[0].value}, #{@args[1].value})"
    return @compileSplat o, args if args = Splat.compileArray o, @args, true
    (@new or '') + @callee.compile(o, LEVEL_ACCESS) +
    "(#{ (arg.compile o, LEVEL_LIST for arg of @args).join ', ' })"

  # If you call a function with a splat, it's converted into a JavaScript
  # `.apply()` call to allow an array of arguments to be passed.
  # If it's a constructor, then things get real tricky. We have to inject an
  # inner constructor in order to be able to pass the varargs.
  compileSplat: (o, args) ->
    if @new
      idt = @tab + TAB
      return """
        (function(func, args, ctor){
        #{idt}ctor.prototype = func.prototype;
        #{idt}var child = new ctor, result = func.apply(child, args);
        #{idt}return result === Object(result) ? result : child;
        #{@tab}}(#{ @callee.compile o, LEVEL_LIST }, #{args}, function(){}))
      """
    base = @callee
    if (name = base.properties.pop()) and base.isComplex()
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
# Node to extend an object's prototype with an ancestor object.
class exports.Extends extends Base
  (@child, @parent) =>

  children: <[ child parent ]>

  compile: (o) ->
    Call(Value(Literal utility 'extends'), [@child, @parent]).compile o

#### Import
# Handles the `import` operation that copies properties from right to left.
class exports.Import extends Base
  (@left, @right, own) => @util = if own then 'import' else 'importAll'

  children: <[ left right ]>

  compileNode: (o) ->
    unless @util is 'import' and @right.isObject()
      return Call(Value(Literal utility @util), [@left, @right]).compile o
    top   = not o.level
    nodes = @right.unwrap().properties
    if top and nodes.length < 2
    then  sub = lref  = @left.compile o, LEVEL_LIST
    else [sub , lref] = @left.cache   o, LEVEL_LIST
    [delim, space] = if top
    then [';', '\n' + @tab]
    else [',', ' ']
    delim += space
    @temps = []
    code   = ''
    for node of nodes
      code += if com then space else delim
      if com = node instanceof Comment
        code += node.compile o, LEVEL_LIST
        continue
      if node instanceof Splat
        code += Import(Literal(lref), node.name, true).compile o, LEVEL_TOP
        continue
      if node instanceof Assign
        {right: val, left: base: acc} = node
        key  = acc.compile o, LEVEL_PAREN
        val.name = key if val instanceof [Code, Class] and IDENTIFIER.test key
        val .= compile o, LEVEL_LIST
      else
        if node.this
          key = (acc = node.properties[0].name).value
          key = '"' + key + '"' if key.reserved
          val = node.compile o, LEVEL_LIST
        else
          [key, val] = (acc = node.base or node).cache o, LEVEL_LIST, ref
          @temps.push ref = val if key isnt val
      key = if acc instanceof Literal and IDENTIFIER.test key
      then '.' + key
      else '[' + key + ']'
      code += lref + key + ' = ' + val
    code = if sub is lref then code.slice delim.length else sub + code
    return code if top
    code += (if com then ' ' else ', ') + lref unless node instanceof Splat
    if o.level < LEVEL_LIST then code else "(#{code})"

#### Access
# `.` accesses into a property of a value.
class exports.Access extends Base
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
# `[ ... ]` indexed access.
class exports.Index extends Base
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
# `{}`
class exports.Obj extends Base
  (props) => @objects = @properties = props or []

  children: ['properties']

  isObject: YES

  assigns: (name) ->
    return true if prop.assigns name for prop of @properties
    false

  compileNode: (o) ->
    props = @properties
    return (if @front then '({})' else '{}') unless props.length
    for prop, i of props
      if prop instanceof Splat or (prop.left or prop).base instanceof Parens
        rest = props.splice i, 1/0
        break
    [last] = lastNonComment props
    idt    = o.indent += TAB
    code   = ''
    for prop of props
      if prop instanceof Comment
        code += prop.compile(o, LEVEL_TOP) + '\n'
        continue
      code += idt + if prop.this
        prop.properties[0].name.value + ': ' +
        prop.compile o, LEVEL_LIST
      else if prop instanceof Assign
      then prop.compile o
      else (c = prop.compile o, LEVEL_LIST) + ': ' + c
      code += ',' unless prop is last
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
# `[]`
class exports.Arr extends Base
  (@objects = []) =>

  children: ['objects']

  isArray: YES

  assigns: (name) ->
    return true if obj.assigns name for obj of @objects
    false

  compileNode: (o) ->
    return '[]' unless @objects.length
    return code if code = Splat.compileArray o, @objects
    o.indent += TAB
    code = (obj.compile o, LEVEL_LIST for obj of @objects).join ', '
    if 0 < code.indexOf '\n'
    then "[\n#{o.indent}#{code}\n#{@tab}]"
    else "[#{code}]"

#### Class
# The Coco class definition.
class exports.Class extends Base
  (@title, @parent, @body = Expressions()) =>

  children: <[ title parent body ]>

  compileNode: (o) ->
    if @title
      decl = if @title instanceof Value
      then @title.properties[*-1].name?.value
      else @title.value
      if decl
        if decl.reserved
          throw SyntaxError "reserved word \"#{decl}\" cannot be a class name"
        decl = '' unless IDENTIFIER.test decl
    name  = decl or @name or '_Class'
    lname = Literal name
    proto = Value lname, [Access Literal 'prototype']
    @body.traverseChildren false, ->
      if it.value is 'this'
        it.value = name
      else if it instanceof Code
        it.clas    = name
        it.bound &&= name
    for node, i of exps = @body.expressions
      if node.isObject()
        exps[i] = Import proto, node, true
      else if node instanceof Code
        throw SyntaxError 'more than one constructor in a class' if ctor
        ctor = node
    unless ctor
      exps.unshift ctor = Code()
      ctor.body.append Call Super() if @parent
    ctor import {name, 'ctor', 'statement', clas: null}
    exps.unshift Extends lname, @parent if @parent
    exps.push lname
    clas = Parens Call(Code([], @body), []), true
    clas = Assign lname , clas if decl and @title?.isComplex()
    clas = Assign @title, clas if @title
    clas.compile o

#### Assign
# Used to assign a local variable to value, or to set the
# property of an object -- including within object literals.
class exports.Assign extends Base
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
      right.name ||= match[2]
    val = right.compile o, LEVEL_LIST
    return name + ': ' + val if @op is ':'
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
    Op(@logic, left, Assign(rite, @right, @op)).compile o

  # Implementation of recursive destructuring, when assigning array or
  # object literals to a value. Peeks at their properties to assign inner names.
  # See <http://wiki.ecmascript.org/doku.php?id=harmony:destructuring>.
  compileDestructuring: (o) ->
    {objects} = left = @left.unwrap()
    return @right.compile o unless olen = objects.length
    rite = @right.compile o, if olen is 1 then LEVEL_ACCESS else LEVEL_LIST
    if (olen > 1 or o.level) and
       (not IDENTIFIER.test(rite) or left.assigns(rite))
      cache = "#{ rref = o.scope.temporary 'ref' } = #{rite}"
      rite  = rref
    list = if left instanceof Arr
    then @destructArr o, objects, rite
    else @destructObj o, objects, rite
    o.scope.free rref  if rref
    list.unshift cache if cache
    list.push rite     if o.level
    code = list.join ', '
    if o.level < LEVEL_LIST then code else "(#{code})"

  destructArr: (o, nodes, rite) ->
    list = []
    iinc = ''
    for node, i of nodes
      if node instanceof Splat
        if iinc then throw SyntaxError \
          "multiple splats in an assignment: " + node.compile o
        if i is endi = nodes.length - 1
          val = utility('slice') + ".call(#{rite}" +
                if i then ", #{i})" else ')'
        else
          val = "#{nodes.length} <= #{rite}.length" +
                " ? #{ utility 'slice' }.call(#{rite}, #{i}"
          val += if rest = endi - i
            ivar = o.scope.temporary 'i'
            ", #{ivar} = #{rite}.length - #{rest}) : (#{ivar} = #{i}, [])"
          else
            ') : []'
          iinc = ivar + '++'
        val = Literal val
      else
        val = Value lr ||= Literal(rite), [Index Literal iinc or i]
      list.push Assign(node, val, @op).compile o, LEVEL_TOP
    o.scope.free ivar if ivar
    list

  destructObj: (o, nodes, rite) ->
    for node of nodes
      node .= name if splat = node instanceof Splat
      if dyna = (node.base or node) instanceof Parens
        [node, key] = Value(node.unwrapAll()).cacheReference o
      else if node instanceof Assign
        {right: node, left: base: key} = node
      else
        key = if node.this then node.properties[0].name else node
      acc = not dyna and IDENTIFIER.test key.unwrap().value or 0
      val = Value lr ||= Literal(rite), [(if acc then Access else Index) key]
      val = Import Obj(), val, true if splat
      Assign(node, val, @op).compile o, LEVEL_TOP

  toString: (idt) -> super.call this, idt, @constructor.name + ' ' + @op

#### Code
# A function definition. This is the only node that creates a new `Scope`.
# When for the purposes of walking the contents of a function body, the Code
# has no *children* -- they're within the inner scope.
class exports.Code extends Base
  (@params = [], @body = Expressions(), arrow) =>
    @bound = 'this' if arrow is '=>'

  children: <[ params body ]>

  isStatement: -> !!@statement

  makeReturn: ->
    if @statement then this import returns: true else super ...

  # Compilation creates a new scope unless explicitly asked to share with the
  # outer scope. Handles splat parameters in the parameter list by peeking at
  # the JavaScript `arguments` objects. If the function is bound with the `=>`
  # arrow, generates a wrapper that saves the current value of `this` through
  # a closure.
  compileNode: (o) ->
    pscope = o.scope
    sscope = pscope.shared or pscope
    scope  = o.scope = new Scope (if @wrapper then pscope else sscope), @body, this
    scope.shared = sscope if @wrapper
    delete o.globals
    o.indent += TAB
    {params, body, name, statement, tab} = this
    code = 'function'
    if @ctor and @bound
      code += """
         _ctor(){} _ctor.prototype = #{name}.prototype;
        #{tab}function
      """
      scope.assign '_this', 'new _ctor'
      Base::traverseChildren.call this, false, ->
        switch
        case it.value is 'this'   then it.value   = '_this'
        case it instanceof Code   then it.bound &&= '_this'
        case it instanceof Return then it.expression ||= Literal '_this'
      body.append Return Literal '_this'
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
      else
        ref = param
        if param.value
          asns.push Op '&&', Literal(ref.name.value + ' == null'),
                             Assign param.name, param.value
      vars.push ref unless splats
    wasEmpty = not (exps = body.expressions).length
    asns.unshift splats if splats
    exps.unshift asns... if asns.length
    scope.parameter vars[i] = v.compile o for v, i of vars unless splats
    vars[0] = 'it' if not vars.length and body.contains (-> it.value is 'it')
    body.makeReturn() unless wasEmpty or @ctor
    if statement
      unless name
        throw SyntaxError 'cannot declare a nameless function'
      unless o.expressions is pscope.expressions
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
    return utility('bind') + "(#{@bound}, #{code})" if @bound
    if @front then "(#{code})" else code

  # Short-circuit `traverseChildren` method to prevent it
  # from crossing scope boundaries unless `crossScope`.
  traverseChildren: -> super ... if it

#### Param
# A parameter in a function definition with an arbitrary LHS and
# an optional default value.
class exports.Param extends Base
  (@name, @value, @splat) =>

  children: <[ name value ]>

  compile: (o) -> @name.compile o, LEVEL_LIST

  asReference: (o) ->
    return @reference if @reference
    node = @name
    if node.this
      node .= properties[0].name
      node  = Literal '$' + node.value if node.value.reserved
    else if node.isComplex()
      node  = Literal o.scope.temporary 'arg'
    node = Value node
    node = Splat node if @splat
    @reference = node

  isComplex: -> @name.isComplex()

#### Splat
# A splat, either as a parameter to a function, an argument to a call,
# or as part of a destructuring assignment.
class exports.Splat extends Base
  (name) => @name = if name.compile then name else Literal name

  children: ['name']

  isAssignable: YES

  assigns: -> @name.assigns it

  compile: -> @name.compile arguments...

  # Utility function that converts arbitrary number of elements, mixed with
  # splats, to a proper array.
  @compileArray = (o, list, apply) ->
    index = -1
    continue while (node = list[++index]) and node not instanceof Splat
    return '' if index >= list.length
    if list.length is 1
      code = list[0].compile o, LEVEL_LIST
      return code if apply
      return utility('slice') + ".call(#{code})"
    args = list.slice index
    for node, i of args
      code = node.compile o, LEVEL_LIST
      args[i] = if node instanceof Splat
      then utility('slice') + ".call(#{code})"
      else "[#{code}]"
    return args[0] + ".concat(#{ args.slice(1).join ', ' })" if index is 0
    base = (node.compile o, LEVEL_LIST for node of list.slice 0, index)
    "[#{ base.join ', ' }].concat(#{ args.join ', ' })"

#### While
# A while loop, the only sort of low-level loop exposed by Coco.
class exports.While extends Base
  (@condition, name) => @condition.=invert() if name is 'until'

  children: <[ condition body ]>

  isStatement: YES

  containsPureStatement: ->
    {expressions} = @body
    return false unless i = expressions.length
    return true if expressions[--i]?.containsPureStatement()
    ret = -> it instanceof Return
    return true if expressions[--i].contains ret while i
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
    [last, i] = lastNonComment exps = body.expressions
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
class exports.Op extends Base
  (op, first, second, post) =>
    return Of first, second if op is 'of'
    if op is 'do'
      if first instanceof Code and first.bound
        first.bound = ''
        first = Value first, [Access Literal 'call']
        args  = [Literal 'this']
      return Call first, args or []
    if op is 'new'
      if (call = first.base or first) instanceof Call
        call.new = 'new '
        return first
      first = Parens first, true if first instanceof Code and first.bound
    this import {op, first, second, post}

  # Map of comparison operators which are both invertible and chainable.
  COMPARERS = '===':'!==', '==':'!=', '>':'<=', '<':'>='
  COMPARERS[val] = key for key, val in COMPARERS

  children: <[ first second ]>

  invert: ->
    if op = COMPARERS[@op]
      @op = op
      this
    else if @second
    then Parens(this).invert()
    else if @op is '!' and (fst = @first.unwrap()) instanceof Op and
            fst.op of <[ ! in instanceof ]>
    then fst
    else Op '!', this

  unfoldSoak: (o) ->
    @op of <[ ++ -- delete ]> and If.unfoldSoak o, this, 'first'

  compileNode: (o) ->
    return @compileUnary o if not @second
    return @compileChain o if @first instanceof Op and
                              @op in COMPARERS and @first.op in COMPARERS
    return @compileExistence o if @op is '?'
    return @compileMultiIO   o if @op is 'instanceof' and @second.isArray()
    @first import {@front}
    code = @first .compile(o, LEVEL_OP) + " #{@op} " +
           @second.compile(o, LEVEL_OP)
    if o.level <= LEVEL_OP then code else "(#{code})"

  # Mimic Python's chained comparisons when multiple comparison operators are
  # used sequentially. For example:
  #     coco -e 'console.log 50 < 65 > 10'
  #     true
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

  # Compile a unary **Op**.
  compileUnary: (o) ->
    {op} = this
    return @compileDelete o if op is 'delete' and o.level
    code = @first.compile o, LEVEL_OP
    code = if @post
    then code + op
    else if op of <[ new typeof delete void ]> or
            op of <[ + - ]> and @first.op is op
    then op + ' ' + code
    else op + code
    if o.level <= LEVEL_OP then code else "(#{code})"

  compileMultiIO: (o) ->
    [sub, ref] = @first.cache o, LEVEL_OP
    tests = for item, i of @second.base.objects
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
class exports.Of extends Base
  (@object, @array) =>

  children: <[ object array ]>

  invert: NEGATE

  compileNode: (o) ->
    if @array.isArray() then @compileOrTest o else @compileLoopTest o

  compileOrTest: (o) ->
    [sub, ref] = @object.cache o, LEVEL_OP
    [cmp, cnj] = if @negated then [' !== ', ' && '] else [' === ', ' || ']
    tests = for item, i of @array.base.objects
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
class exports.Try extends Base
  (@attempt, @thrown, @recovery, @ensure) =>

  children: <[ attempt recovery ensure ]>

  isStatement: YES

  makeReturn: ->
    @attempt  &&= @attempt .makeReturn it
    @recovery &&= @recovery.makeReturn it
    this

  # Compilation is more or less as you would expect -- the *finally* clause
  # is optional, the *catch* is not.
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

#### Throw
# Simple node to throw an exception.
class exports.Throw extends Base
  (@expression) =>

  children: ['expression']

  isStatement: YES

  makeReturn: THIS

  compile: (o) -> o.indent + "throw #{ @expression.compile o, LEVEL_PAREN };"

#### Existence
# Checks a value for existence --  not `undefined` and not `null`.
class exports.Existence extends Base
  (@expression) =>

  children: ['expression']

  invert: NEGATE

  compileNode: (o) ->
    code = @expression.compile o, LEVEL_OP
    if IDENTIFIER.test(code) and not o.scope.check code, true
      code = 'typeof ' + code + if @negated
      then " == \"undefined\" || #{code} === null"
      else " != \"undefined\" && #{code} !== null"
    else
      code += " #{ if @negated then '=' else '!' }= null"
    if o.level <= LEVEL_COND then code else "(#{code})"

#### Parens
# An extra set of parentheses, specified explicitly in the source.
# Parentheses are a good way to force any statement to become an expression.
class exports.Parens extends Base
  (@expressions, @keep) =>

  children: ['expressions']

  unwrap          : -> @expressions
  makeReturn      : -> @expressions.makeReturn it
  isComplex       : -> @expressions.isComplex()
  isStatement     : -> @expressions.isStatement()
  isPureStatement : -> @expressions.isPureStatement()

  compileNode: (o) ->
    (expr = @expressions.unwrap()) import {@front}
    return expr.compile o if not @keep and
      (expr instanceof [Value, Call, Code, Parens] or
       o.level < LEVEL_OP and expr instanceof Op)
    code = expr.compile o, LEVEL_PAREN
    if expr.isStatement() then code else "(#{code})"

#### For
# Coco's replacement for the `for` loop is our array and object
# comprehensions, that compile into `for` loops here. They also act as an
# expression, able to return the result of each filtered iteration.
class exports.For extends While
  =>

  children: <[ source name from to step body ]>

  compileNode: (o) ->
    if @index instanceof Base and not @index.=unwrap().value
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
    head  = @pluckDirectCalls o, @body.expressions, @name, idx
    head += @tab + "for (#{forPart}) #{ ownPart or '' }{"
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

  pluckDirectCalls: (o, exps, name, index) ->
    defs = ''
    for exp, idx of exps then if exp.=unwrapAll() instanceof Call
      val = exp.callee.unwrapAll()
      continue unless \
        val instanceof Code and not exp.args.length or
          val instanceof Value and val.base instanceof Code and
          val.properties.length is 1 and
          val.properties[0].name?.value is 'call'
      @temps.push ref = o.scope.temporary 'fn'
      fn   = val.base or val
      base = Value ref = Literal ref
      args = []
      if val.base
        args.push exp.args[0]
        base = val import {base}
      if index
        args.push li = Literal index
        fn.params.push Param li
      if name
        @temps.push @nref = o.scope.temporary 'ref' unless @nref
        args.push Literal @nref
        fn.params.push Param name
      exps[idx] = Call base, args
      defs += @tab + Assign(ref, fn).compile(o, LEVEL_TOP) + ';\n'
    defs

#### Switch
# The regular JavaScript `switch`-`case`-`default`,
# but with forced `break` after each cases.
class exports.Switch extends Base
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
class exports.Case extends Base
  (@tests, @body) =>

  children: <[ tests body ]>

  makeReturn: ->
    [last] = lastNonComment @body.expressions
    @body.makeReturn it if last and last.base?.value isnt 'fallthrough'

  compileCase: (o, tab, nobr) ->
    code = br = ''
    add  = -> code += tab + "case #{ it.compile o, LEVEL_PAREN }:\n"
    for test of @tests
      if test.=unwrap() instanceof Arr
      then add c for c of test.objects
      else add test
    [last, i] = lastNonComment exps = @body.expressions
    exps[i] = Comment ' fallthrough ' if ft = last.base?.value is 'fallthrough'
    o.indent = tab + TAB
    code += body + '\n' if body = @body.compile o, LEVEL_TOP
    code += o.indent + 'break;\n' unless nobr or ft or
      last instanceof [Return, Throw] or last.value of <[ continue break ]>
    code

#### If
# The `if`/`else` structure that acts as both statement and expression.
class exports.If extends Base
  (@if, @then, {@statement, @soak, name} = {}) =>
    @if.=invert() if name is 'unless'

  children: <[ if then else ]>

  # Rewrite a chain of **Ifs** to add a default case as the final *else*.
  addElse: ->
    if @chain
      @else.addElse it
    else
      @chain = it instanceof If
      @else  = it
    this

  # The **If** only compiles into a statement if either of its bodies needs
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
    code += "\n#{body}\n" + @tab if body = Expressions(@then).compile o
    code += '}'
    return code unless @else
    code + ' else ' + if @chain
    then @else.compile (o import indent: @tab, chainChild: true), LEVEL_TOP
    else if body = @else.compile o, LEVEL_TOP
    then "{\n#{body}\n#{@tab}}"
    else '{}'

  # Compile the If as a conditional operator.
  compileExpression: (o) ->
    code = @if   .compile(o, LEVEL_COND) + ' ? ' +
           @then .compile(o, LEVEL_LIST) + ' : ' +
          (@else?.compile(o, LEVEL_LIST) or 'void 8')
    if o.level < LEVEL_COND then code else "(#{code})"

  unfoldSoak: -> @soak and this

  # Unfold a node's child if soak, then tuck the node under created `If`
  @unfoldSoak = (o, parent, name) ->
    return unless ifn = parent[name].unfoldSoak o
    parent[name] = ifn.then; ifn.then = Value parent
    ifn

#### Super
# A simple node to lookup a reference to the parent method.
class exports.Super extends Base
  =>

  isAssignable: YES

  compile: (o) ->
    {method} = o.scope.shared or o.scope
    throw SyntaxError 'cannot call super outside of a function' unless method
    {name, clas} = method
    throw SyntaxError 'cannot call super on an anonymous function' unless name
    if clas
    then clas + '.superclass.prototype.' + name
    else name + '.superclass'

# Export `import all` for use in parser, where the operator doesn't work.
exports import all mix: __importAll

# Constants
# ---------

function YES  -> true
function NO   -> false
function THIS -> this

function NEGATE -> @negated ^= 1; this

UTILITIES =
  # Correctly set up a prototype chain for inheritance, including a reference
  # to the superclass for `super()` calls.
  extends: '''
    function(child, parent){
      function ctor(){ this.constructor = child; }
      ctor.prototype = parent.prototype;
      child.prototype = new ctor;
      child.superclass = parent;
      return child;
    }
  '''

  # Create a function bound to the current value of "this".
  bind: '''
    function(me, fn){ return function(){ return fn.apply(me, arguments); }; }
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
    function(obj, src){
      for (var key in src) obj[key] = src[key];
      return obj;
    }
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
METHOD_DEF = /^(?:(\S+)\.prototype\.|\S*?)\b([$A-Za-z_][$\w]*)$/

# Utility Functions
# -----------------

# Helper for ensuring that utility functions are assigned at the top level.
utility = (name) ->
  Scope.root.assign ref = '__' + name, UTILITIES[name]
  ref

multident = (code, tab) -> code.replace /\n/g, '$&' + tab

lastNonComment = (nodes) ->
  break if node not instanceof Comment for node, i of nodes by -1
  [i >= 0 and node, i]
