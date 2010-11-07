# Contains all of the node classes for the syntax tree. Most
# nodes are created as the result of actions in the [grammar](grammar.html),
# but some are created by other nodes as a method of code generation. To convert
# the syntax tree into a string of JavaScript code, call `compile()` on the root.

{Scope} = require './scope'

exports.extend = (left, rite) -> left import all rite  # for parser

# Constant functions for nodes that don't need customization.
YES  = -> true
NO   = -> false
THIS = -> this

RETURN = -> @returns = true; this
NEGATE = -> @negated = not @negated; this

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
exports.Base = class Base

  # Common logic for determining whether to wrap this node in a closure before
  # compiling it, or to compile directly. We need to wrap if this node is a
  # *statement*, and it's not a *pureStatement*, and we're not at
  # the top level of a block (which would be unnecessary), and we haven't
  # already been asked to return the result (because statements know how to
  # return results).
  compile: (o, level) ->
    o        = {} import all o
    o.level  = level if level?
    node     = @unfoldSoak(o) or this
    node.tab = o.indent
    if o.level is LEVEL_TOP or node.isPureStatement() or not node.isStatement(o)
      code = node.compileNode o
      o.scope.free tmp for tmp of node.temps if node.temps
      code
    else
      node.compileClosure o

  # Statements converted into expressions via closure-wrapping share a scope
  # object with their parent closure, to preserve the expected lexical scope.
  compileClosure: (o) ->
    if @containsPureStatement()
      throw SyntaxError 'cannot include a pure statement in an expression.'
    Closure.wrap(this).compileNode o

  # If the code generation wishes to use the result of a complex expression
  # in multiple places, ensure that the expression is only ever evaluated once,
  # by assigning it to a temporary variable. Pass a level to precompile.
  cache: (o, level, reused) ->
    unless @isComplex()
      ref = if level then @compile o, level else this
      [ref, ref]
    else
      ref = new Literal reused or o.scope.temporary 'ref'
      sub = new Assign ref, this, '='
      if level then [sub.compile(o, level), ref.value] else [sub, ref]

  # Compile to a source/variable pair suitable for looping.
  compileLoopReference: (o, name) ->
    src = tmp = @compile o, LEVEL_LIST
    unless NUMBER.test(src) or IDENTIFIER.test(src) and o.scope.check(src)
      src = "#{ tmp = o.scope.temporary name } = #{src}"
    [src, tmp]

  # Construct a node that returns the current node's result.
  # Note that this is overridden for smarter behavior for
  # many statement nodes (eg If, For)...
  makeReturn: -> new Return this

  # Does this node, or any of its children, contain a node of a certain kind?
  # Recursively traverses down the *children* of the nodes, yielding to a block
  # and returning true when the block finds a match. `contains` does not cross
  # scope boundaries.
  contains: (pred) ->
    contains = false
    @traverseChildren false, ->
      if pred it
        contains := true
        return false
    contains

  # Is this node of a certain type, or does it contain the type?
  containsType: (type) ->
    this instanceof type or @contains -> it instanceof type

  # Convenience for the most common use of contains. Does the node contain
  # a pure statement?
  containsPureStatement: ->
    @isPureStatement() or @contains -> it.isPureStatement()

  # `toString` representation of the node, for inspecting the parse tree.
  # This is what `coco --nodes` prints out.
  toString: (idt = '', override) ->
    children = (child.toString idt + TAB for child of @collectChildren())
    name  = override or @constructor.name
    name += '?' if @soak
    '\n' + idt + name + children.join ''

  # Passes each child to a function, breaking when the function returns `false`.
  eachChild: (func) ->
    return this unless @children
    for name of @children when child = @[name]
      if 'length' in child
      then for node of child then return this if false is func node
      else                        return this if false is func child
    this

  collectChildren: ->
    nodes = []
    @eachChild -> nodes.push it
    nodes

  traverseChildren: (crossScope, func) ->
    @eachChild (child) ->
      return false if false is func child
      child.traverseChildren crossScope, func

  invert: -> new Op '!', this

  unwrapAll: ->
    node = this
    continue until node is node .= unwrap()
    node

  # Default implementations of the common node properties and methods. Nodes
  # will override these with custom logic, if needed.
  children: []

  isStatement     : NO
  isPureStatement : NO
  isComplex       : YES
  isChainable     : NO
  isAssignable    : NO

  unwrap       : THIS
  unfoldSoak   : NO
  unfoldAssign : NO

  # Is this node used to assign a certain variable?
  assigns: NO

#### Expressions

# The expressions body is the list of expressions that forms the body of an
# indented block of code -- the implementation of a function, a clause in an
# `if`, `switch`, or `try`, and so on...
exports.Expressions = class Expressions extends Base

  children: ['expressions']

  constructor: (node) ->
    return node if node instanceof Expressions
    @expressions = if node then [node] else []

  append  : -> @expressions.push    it; this
  prepend : -> @expressions.unshift it; this
  pop     : -> @expressions.pop()

  unwrap: -> if @expressions.length is 1 then @expressions[0] else this

  isEmpty: -> not @expressions.length

  isStatement: (o) ->
    for exp of @expressions when exp.isPureStatement() or exp.isStatement o
      return true
    false

  # An Expressions node does not return its entire body, rather it
  # ensures that the final expression is returned.
  makeReturn: ->
    for end, idx of @expressions by -1 when end not instanceof Comment
      @expressions[idx] = end.makeReturn()
      break
    this

  # An **Expressions** is the only node that can serve as the root.
  compile: (o = {}, level) ->
    if o.scope then super o, level else @compileRoot o

  compileNode: (o) ->
    @tab  = o.indent
    top   = o.level is LEVEL_TOP
    codes = []
    for node of @expressions
      node = (do node.=unwrapAll).unfoldSoak(o) or node
      if top
        node.front = true
        code = node.compile o
        codes.push if node.isStatement o then code else @tab + code + ';'
      else
        codes.push node.compile o, LEVEL_LIST
    return codes.join '\n' if top
    code = codes.join(', ') or 'void 0'
    if codes.length > 1 and o.level >= LEVEL_LIST then "(#{code})" else code

  # If we happen to be the top-level **Expressions**, wrap everything in
  # a safety closure, unless requested not to.
  # It would be better not to generate them in the first place, but for now,
  # clean up obvious double-parentheses.
  compileRoot: (o) ->
    o.indent = @tab = if o.bare then '' else TAB
    o.scope  = new Scope null, this, null
    o.level  = LEVEL_TOP
    code     = @compileWithDeclarations o
    code    .= replace TRAILING_WHITESPACE, ''
    if o.bare then code else "(function(){\n#{code}\n}).call(this);\n"

  # Compile the expressions body for the contents of a function, with
  # declarations of all inner variables pushed up to the top.
  compileWithDeclarations: (o) ->
    o.level = LEVEL_TOP
    code    = @compileNode o
    vars    = ''
    {scope} = o
    if not o.globals and scope.hasDeclarations this
      vars += scope.declaredVariables().join ', '
    if scope.hasAssignments this
      vars += ', ' if vars
      vars += multident scope.assignedVariables().join(', '), @tab
    code = @tab + "var #{vars};\n" + code if vars
    code

#### Literal

# Literals are static values that can be passed through directly into
# JavaScript without translation, such as: strings, numbers,
# `true`, `false`, `null`...
exports.Literal = class Literal extends Base

  constructor: (@value) ->

  makeReturn: -> if @isPureStatement() then this else new Return this

  # Break and continue must be treated as pure statements -- they lose their
  # meaning when wrapped in a closure.
  isPureStatement: -> @value of <[ break continue debugger ]>

  isAssignable: -> IDENTIFIER.test @value

  isComplex: NO

  assigns: -> it is @value

  compile: -> if @value.reserved then "\"#{@value}\"" else @value

  toString: -> ' "' + @value + '"'

#### Return

# A `return` is a *pureStatement* -- wrapping it in a closure wouldn't
# make sense.
exports.Return = class Return extends Base

  children: ['expression']

  isStatement     : YES
  isPureStatement : YES

  constructor: (@expression) ->

  makeReturn: THIS

  compile: (o, level) ->
    expr = @expression?.makeReturn()
    if expr and expr not instanceof Return then expr.compile o, level else super o, level

  compileNode: (o) ->
    o.level = LEVEL_PAREN
    @tab + "return#{ if @expression then ' ' + @expression.compile o else '' };"

#### Value

# A value, variable or literal or parenthesized, indexed or dotted into,
# or vanilla.
exports.Value = class Value extends Base

  children: <[ base properties ]>

  # A **Value** has a base and a list of property accesses.
  constructor: (base, props, tag) ->
    return base if not props and base instanceof Value
    @base       = base
    @properties = props or []
    @[tag]      = true if tag

  # Add a property access to the list.
  append: -> @properties.push it; this

  hasProperties: -> !!@properties.length

  # Some boolean checks for the benefit of other nodes.
  isArray      : -> not @properties.length and @base instanceof Arr
  isObject     : -> not @properties.length and @base instanceof Obj
  isComplex    : -> !!@properties.length or @base.isComplex()
  isAssignable : -> !!@properties.length or @base.isAssignable()

  isStatement : (o)    -> not @properties.length and @base.isStatement o
  assigns     : (name) -> not @properties.length and @base.assigns name

  makeReturn: -> if @properties.length then super() else @base.makeReturn()

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
    base = new Value @base, @properties.slice 0, -1
    if base.isComplex()  # `a().b`
      ref  = new Literal o.scope.temporary 'base'
      base = new Value new Parens new Assign ref, base, '='
      bref = new Value ref
      bref.temps = [ref.value]
    return [base, bref] unless name  # `a()`
    if name.isComplex()  # `a[b()]`
      ref  = new Literal o.scope.temporary 'name'
      name = new Index new Assign ref, name.index, '='
      nref = new Index ref
      nref.temps = [ref.value]
    [base.append(name), new Value(bref or base.base, [nref or name])]

  # We compile a value to JavaScript by compiling and joining each property.
  # Things get much more insteresting if the chain of properties has *soak*
  # operators `?.` interspersed. Then we have to take care not to accidentally
  # evaluate anything twice when building the soak chain.
  compileNode: (o) ->
    return asn.compile o if asn = @unfoldAssign o
    @base.front = @front
    v  = (@properties.length and @substituteStar o) or this
    ps = v.properties
    code  = v.base.compile o, if ps.length then LEVEL_ACCESS else null
    code += ' ' if ps[0] instanceof Accessor and SIMPLENUM.test code
    code += p.compile o for p of ps
    code

  substituteStar: (o) ->
    star = null
    find = ->
      return false if it instanceof Index
      if it instanceof Literal and it.value is '*'
        star := it
        false
    for prop, i of @properties when prop instanceof Index
      prop.traverseChildren false, find
      continue unless star
      [sub, ref] = new Value(@base, @properties.slice 0, i).cache o
      @temps = [ref.value] if sub isnt ref
      ref += ' ' if SIMPLENUM.test ref.=compile o
      star.value = ref + '.length'
      return new Value sub, @properties.slice i
    null

  # Unfold a soak into an `If`: `a?.b` -> `a.b if a?`
  unfoldSoak: (o) ->
    if ifn = @base.unfoldSoak o
      ifn.body.properties.push @properties...
      return ifn
    for prop, i of @properties when prop.soak
      prop.soak = false
      fst = new Value @base, @properties.slice 0, i
      snd = new Value @base, @properties.slice i
      if fst.isComplex()
        ref = new Literal o.scope.temporary 'ref'
        fst = new Parens new Assign ref, fst, '='
        snd.base = ref
      ifn = new If new Existence(fst), snd, soak: true
      ifn.temps = [ref.value] if ref
      return ifn
    null

  unfoldAssign: (o) ->
    if asn = @base.unfoldAssign o
      asn.value.properties.push @properties...
      return asn
    for prop, i of @properties when prop.assign
      prop.assign = false
      [lhs, rhs] = new Value(@base, @properties.slice 0, i).cacheReference o
      asn = new Assign lhs, new Value(rhs, @properties.slice i), '='
      asn.access = true
      return asn
    null

#### Comment

# Coco passes through block comments as JavaScript block comments
# at the same position.
exports.Comment = class Comment extends Base

  constructor: (@comment) ->

  isPureStatement : YES
  isStatement     : YES

  makeReturn: THIS

  compile: (o, level) ->
    code = '/*' + multident(@comment, o.indent) + '*/'
    code = o.indent + code if (level ? o.level) is LEVEL_TOP
    code

#### Call

# Node for a function invocation. Takes care of converting `super()` calls into
# calls against the prototype's function of the same name.
exports.Call = class Call extends Base

  children: <[ variable args ]>

  constructor: (variable, @args = [], @soak) ->
    @new      = ''
    @isSuper  = variable is 'super'
    @variable = if @isSuper then null else variable

  # Tag this invocation as creating a new instance.
  newInstance: ->
    @new = 'new '
    this

  # Grab the reference to the superclass' implementation of the current method.
  superReference: (o) ->
    {method} = o.scope
    throw SyntaxError 'cannot call super outside of a function.' unless method
    {name} = method
    throw SyntaxError 'cannot call super on an anonymous function.' unless name
    if method.clas
    then "#{method.clas}.__super__.#{name}"
    else "#{name}.__super__.constructor"

  unfoldSoak: (o) ->
    if @soak
      if @variable
        return ifn if ifn = If.unfoldSoak o, this, 'variable'
        [left, rite] = new Value(@variable).cacheReference o
      else
        left = new Literal @superReference o
        rite = new Value left
      rite = new Call rite, @args
      rite.new = @new
      left = new Literal "typeof #{ left.compile o } == \"function\""
      return new If left, new Value(rite), soak: true
    for call of @digCalls()
      if ifn
        if call.variable instanceof Call
        then call.variable      = ifn
        else call.variable.base = ifn
      ifn = If.unfoldSoak o, call, 'variable'
    ifn

  # List up a chain of calls from bottom. Used for unfolding `?.` and `.=`.
  digCalls: ->
    call = this
    list = []
    loop
      if call.variable instanceof Call
        list.push call
        call .= variable
        continue
      break unless call.variable instanceof Value
      list.push call
      break unless call .= variable.base instanceof Call
    list.reverse()

  # Compile a vanilla function call.
  compileNode: (o) ->
    if vr = @variable
      for call of @digCalls()
        if asn
          if call.variable instanceof Call
          then call.variable      = asn
          else call.variable.base = asn
        if asn = call.variable.unfoldAssign o
          call.variable = asn.value
          asn.value = new Value call
      return asn.compile o if asn
      vr.front = @front
    return @compileSplat o, code if code = Splat.compileArray o, @args, true
    args = (arg.compile o, LEVEL_LIST for arg of @args).join ', '
    if @isSuper
    then @compileSuper args, o
    else @new + @variable.compile(o, LEVEL_ACCESS) + "(#{args})"

  # `super()` is converted into a call against the superclass's implementation
  # of the current function.
  compileSuper: (args, o) ->
    "#{@superReference(o)}.call(this#{ if args.length then ', ' else '' }#{args})"

  # If you call a function with a splat, it's converted into a JavaScript
  # `.apply()` call to allow an array of arguments to be passed.
  # If it's a constructor, then things get real tricky. We have to inject an
  # inner constructor in order to be able to pass the varargs.
  compileSplat: (o, splatargs) ->
    return "#{ @superReference o }.apply(this, #{splatargs})" if @isSuper
    unless @new
      base = new Value @variable
      if (name = base.properties.pop()) and base.isComplex()
        ref = o.scope.temporary 'ref'
        fun = "(#{ref} = #{ base.compile o, LEVEL_LIST })#{ name.compile o }"
        o.scope.free ref
      else
        fun = ref = base.compile o, LEVEL_ACCESS
        fun += name.compile o if name
      return "#{fun}.apply(#{ref}, #{splatargs})"
    idt = @tab + TAB
    """
    (function(func, args, ctor){
    #{idt}ctor.prototype = func.prototype;
    #{idt}var child = new ctor, result = func.apply(child, args);
    #{idt}return typeof result == "object" ? result : child;
    #{@tab}}(#{ @variable.compile o, LEVEL_LIST }, #{splatargs}, function(){}))
    """

#### Extends

# Node to extend an object's prototype with an ancestor object.
# After `goog.inherits` from the
# [Closure Library](http://closure-library.googlecode.com/svn/docs/closureGoogBase.js.html).
exports.Extends = class Extends extends Base

  children: <[ child parent ]>

  constructor: (@child, @parent) ->

  # Hooks one constructor into another's prototype chain.
  compile: (o) ->
    new Call(new Value(new Literal utility 'extends'), [@child, @parent]).compile o

#### Import

exports.Import = class Import extends Base

  children: <[ left right ]>

  constructor: (@left, @right, own) ->
    @util = if own then 'import' else 'importAll'

  compile: (o) ->
    new Call(new Value(new Literal utility @util), [@left, @right]).compile o

#### Accessor

# A `.` accessor into a property of a value, or the `::` shorthand for
# an accessor into the object's prototype.
exports.Accessor = class Accessor extends Base

  children: ['name']

  constructor: (@name, symbol) ->
    switch symbol
    case '?.' then @soak   = true
    case '.=' then @assign = true

  compile: (o) ->
    if (name = @name.compile o).charAt(0) of <[ \" \' ]>
    then "[#{name}]"
    else ".#{name}"

  isComplex: NO

  toString: (idt) -> super idt, @constructor.name + if @assign then '=' else ''

#### Index

# A `[ ... ]` indexed accessor into an array or object.
exports.Index = class Index extends Base

  children: ['index']

  constructor: (@index, symbol) ->
    switch symbol
    case '?[' then @soak   = true
    case '[=' then @assign = true

  compile: (o) -> "[#{ @index.compile o, LEVEL_PAREN }]"

  isComplex: -> @index.isComplex()

  toString: Accessor::toString

#### Obj

# An object literal, nothing fancy.
exports.Obj = class Obj extends Base

  children: ['properties']

  constructor: (props) -> @objects = @properties = props or []

  compileNode: (o) ->
    props = @properties
    return (if @front then '({})' else '{}') unless props.length
    for prop, i of props
      if prop instanceof Splat or (prop.variable or prop).base instanceof Parens
        rest = props.splice i
        break
    lastIndex = props.length - 1
    for prop of props by -1 when prop not instanceof Comment
      lastNonComment = prop
      break
    code = ''
    idt  = o.indent += TAB
    for prop, i of props
      code += idt unless prop instanceof Comment
      code += if prop instanceof Value and prop.this
      then new Assign(prop.properties[0].name, prop, ':').compile o
      else if prop not instanceof [Assign, Comment]
      then new Assign(prop, prop, ':').compile o
      else prop.compile o, LEVEL_TOP
      code += if i is lastIndex
      then ''
      else if prop is lastNonComment or prop instanceof Comment
      then '\n'
      else ',\n'
    code = "{#{ code and '\n' + code + '\n' + @tab }}"
    return @compileDynamic o, code, rest if rest
    if @front then "(#{code})" else code

  compileDynamic: (o, code, props) ->
    @temps = []
    for prop, i of props
      if sp = prop instanceof Splat
        impt = new Import(new Literal(oref or code), prop.name, true).compile o
        code = if oref then code + ', ' + impt else impt
        continue
      if prop instanceof Comment
        code += ' ' + prop.compile o, LEVEL_LIST
        continue
      unless oref
        @temps.push oref = o.scope.temporary 'obj'
        code = oref + ' = ' + code
      if prop instanceof Assign
        acc = prop.variable.base
        key = acc.compile o, LEVEL_PAREN
        val = prop.value.compile o, LEVEL_LIST
      else
        acc = prop.base
        [key, val] = acc.cache o, LEVEL_LIST, ref
        @temps.push ref = val if key isnt val
      key = if acc instanceof Literal and IDENTIFIER.test key
      then '.' + key
      else '[' + key + ']'
      code += ', ' + oref + key + ' = ' + val
    code += ', ' + oref unless sp
    if o.level <= LEVEL_PAREN then code else "(#{code})"

  assigns: (name) ->
    return true for prop of @properties when prop.assigns name
    false

#### Arr

# An array literal.
exports.Arr = class Arr extends Base

  children: ['objects']

  constructor: (@objects = []) ->

  compileNode: (o) ->
    return '[]' unless @objects.length
    o.indent += TAB
    return code if code = Splat.compileArray o, @objects
    code = (obj.compile o, LEVEL_LIST for obj of @objects).join ', '
    if 0 < code.indexOf '\n'
    then "[\n#{o.indent}#{code}\n#{@tab}]"
    else "[#{code}]"

  assigns: (name) ->
    return true for obj of @objects when obj.assigns name
    false

#### Class

# The Coco class definition.
exports.Class = class Class extends Base

  children: <[ variable parent properties ]>

  isStatement: YES

  # Initialize a **Class** with its name, an optional superclass, and a
  # list of prototype property assignments.
  constructor: (@variable, @parent, @properties = []) ->

  makeReturn: RETURN

  # Instead of generating the JavaScript string directly, we build up the
  # equivalent syntax tree and compile that, in pieces. You can see the
  # constructor, property assignments, and inheritance getting built out below.
  compileNode: (o) ->
    variable   = @variable or new Literal o.scope.temporary 'ctor'
    extension  = @parent  and new Extends variable, @parent
    props      = new Expressions
    me         = null
    className  = variable.compile o

    if @parent
      applied = new Value @parent, [new Accessor new Literal 'apply']
      ctor    = new Code [], new Expressions \
        new Call applied, [new Literal('this'), new Literal('arguments')]
    else
      ctor = new Code [], new Expressions new Return new Literal 'this'

    for prop of @properties
      {variable: pvar, value: func} = prop
      if pvar and pvar.base.value is 'constructor'
        if func not instanceof Code
          [func, ref] = func.cache o
          props.append func if func isnt ref
          apply = new Call new Value(ref, [new Accessor new Literal 'apply']),
                           [new Literal('this'), new Literal('arguments')]
          func  = new Code [], new Expressions apply
        throw SyntaxError 'cannot define a constructor as a bound function.' if func.bound
        func.name = className
        func.body.append new Return new Literal 'this'
        variable = new Value variable
        ctor = func
        ctor.comment = props.pop() if props.expressions[*-1] instanceof Comment
        continue
      if func instanceof Code and func.bound
        if prop.context is 'this'
          func.context = className
        else
          func.bound = false
          pname = pvar.compile o
          ctor.body.append new Return new Literal 'this' if ctor.body.isEmpty()
          val = new Value new Literal('this'), [new Accessor pvar]
          ctor.body.prepend new Assign \
            val, new Call new Literal(utility 'bind'), [val, new Literal 'this']
      if pvar
        accs = if prop.context is 'this'
        then [pvar.properties[0]]
        else [new Accessor(new Literal 'prototype'), new Accessor(pvar)]
        prop = new Assign new Value(variable, accs), func, '='
      props.append prop

    ctor.className = className.match /[$\w]+$/
    ctor.body.prepend new Literal "#{me} = this" if me
    code  = @tab + new Assign(variable, ctor).compile(o) + ';'
    code += '\n' + @tab + extension.compile(o) + ';' if extension
    code += '\n' + props.compile o                   if !props.isEmpty()
    code += '\n' + new Return(variable).compile o    if @returns
    code

#### Assign

# The **Assign** is used to assign a local variable to value, or to set the
# property of an object -- including within object literals.
exports.Assign = class Assign extends Base

  children: <[ variable value ]>

  # Omit @context to declare a variable with it.
  constructor: (@variable, @value, @context) ->

  assigns: (name) ->
    @[if @context is ':' then 'value' else 'variable'].assigns name

  unfoldSoak: (o) -> If.unfoldSoak o, this, 'variable'

  unfoldAssign: -> @access and this

  compileNode: (o) ->
    {variable, value} = this
    if isValue = variable instanceof Value
      return @compileDestructuring o if variable.isArray() or variable.isObject()
      return @compileConditional   o if @context of <[ ||= &&= ?= ]>
    name = variable.compile o, LEVEL_LIST
    # Keep track of the name of the base object
    # we've been assigned to, for correct internal references.
    if value instanceof Code and match = METHOD_DEF.exec name
      {1: value.clas, 2: value.name} = match
    val = value.compile o, LEVEL_LIST
    return name + ': ' + val if @context is ':'
    unless variable.isAssignable()
      throw ReferenceError "\"#{ @variable.compile o }\" cannot be assigned."
    unless isValue and variable.hasProperties()
      if @context
        unless o.scope.check name, true
          throw ReferenceError "assignment to undeclared variable \"#{name}\""
      else
        o.scope.declare name
    name += " #{ @context or '=' } " + val
    if o.level <= LEVEL_LIST then name else "(#{name})"

  # Brief implementation of recursive destructuring, when assigning array or
  # object literals to a value. Peeks at their properties to assign inner names.
  # See the [ECMAScript Harmony Wiki](http://wiki.ecmascript.org/doku.php?id=harmony:destructuring)
  # for details.
  compileDestructuring: (o) ->
    top       = o.level is LEVEL_TOP
    {value}   = this
    {objects} = @variable.base
    return value.compile o unless olen = objects.length
    isObject = @variable.isObject()
    if top and olen is 1 and (obj = objects[0]) not instanceof Splat
      # Unroll simplest cases: `{v} = x` -> `v = x.v`
      if obj instanceof Assign
        {variable: {base: idx}, value: obj} = obj
      else
        if obj.base instanceof Parens
          [obj, idx] = new Value(obj.unwrapAll()).cacheReference o
        else
          idx = if isObject
          then (if obj.this then obj.properties[0].name else obj)
          else new Literal 0
      acc = IDENTIFIER.test idx.unwrap().value or 0
      val = new Value(value).append new (if acc then Accessor else Index) idx
      return new Assign(obj, val, @context).compile o
    vvar    = value.compile o, LEVEL_LIST
    assigns = []
    splat   = false
    if not IDENTIFIER.test(vvar) or @variable.assigns(vvar)
      assigns.push "#{ ref = o.scope.temporary 'ref' } = #{vvar}"
      vvar = ref
    for obj, i of objects
      # A regular array pattern-match.
      idx = i
      if isObject
        if obj instanceof Assign
          # A regular object pattern-match.
          {variable: {base: idx}, value: obj} = obj
        else
          # A shorthand `{a, b, @c} = val` pattern-match.
          if obj.base instanceof Parens
          then [obj, idx] = new Value(obj.unwrapAll()).cacheReference o
          else idx = if obj.this then obj.properties[0].name else obj
      if not splat and obj instanceof Splat
        val = "#{olen} <= #{vvar}.length ? #{ utility 'slice' }.call(#{vvar}, #{i}"
        if rest = olen - i - 1
          ivar = o.scope.temporary 'i'
          val += ", #{ivar} = #{vvar}.length - #{rest}) : (#{ivar} = #{i}, [])"
        else
          val += ") : []"
        val   = new Literal val
        splat = "#{ivar}++"
      else
        if obj instanceof Splat
          obj .= name.compile o
          throw SyntaxError \
            "multiple splats are disallowed in an assignment: #{obj} ..."
        acc = if typeof idx is 'number'
          idx = new Literal splat or idx
          false
        else
          isObject and IDENTIFIER.test idx.unwrap().value or 0
        val = new Value new Literal(vvar),
                        [new (if acc then Accessor else Index) idx]
      assigns.push new Assign(obj, val, @context).compile o, LEVEL_LIST
    o.scope.free ref if ref
    assigns.push vvar unless top
    code = assigns.join ', '
    if o.level < LEVEL_LIST then code else "(#{code})"

  # When compiling a conditional assignment, take care to ensure that the
  # operands are only evaluated once, even though we have to reference them
  # more than once.
  compileConditional: (o) ->
    [left, rite] = @variable.cacheReference o
    new Op(@context.slice(0, -1), left, new Assign(rite, @value, '=')).compile o

#### Code

# A function definition. This is the only node that creates a new Scope.
# When for the purposes of walking the contents of a function body, the Code
# has no *children* -- they're within the inner scope.
exports.Code = class Code extends Base

  children: <[ params body ]>

  constructor: (@params = [], @body = new Expressions, tag) ->
    @context = 'this' if @bound = tag is '=>'

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
    delete o.bare
    delete o.globals
    o.indent += TAB
    vars = []
    exps = []
    for param of @params when param.splat
      splats = new Assign new Value(new Arr(p.asReference o for p of @params)),
                          new Value new Literal 'arguments'
      break
    for param of @params
      if param.isComplex()
        val = ref = param.asReference o
        val = new Op '?', ref, param.value if param.value
        exps.push new Assign new Value(param.name), val
      else
        ref = param
        if param.value
          exps.push new Op '&&',
            new Literal(ref.name.value + ' == null'),
            new Assign new Value(param.name), param.value
      vars.push ref unless splats
    wasEmpty = @body.isEmpty()
    exps.unshift splats if splats
    @body.expressions.unshift exps... if exps.length
    @body.makeReturn() unless wasEmpty or @noReturn
    scope.parameter vars[i] = v.compile o for v, i of vars unless splats
    vars[0] = 'it' if not vars.length and @body.contains (-> it.value is 'it')
    comm = if @comment then @comment.compile(o) + '\n' else ''
    idt  = o.indent
    o.indent += TAB if @className
    code = if @body.isEmpty() then '' else
      "\n#{ @body.compileWithDeclarations o }\n"
    if @className
      open  = "(function(){\n#{comm}#{idt}function #{@className}"
      close = "#{ code and idt }}\n#{idt}return #{@className};\n#{@tab}}())"
    else
      open  = 'function'
      close = "#{ code and @tab }}"
    func = open + '(' + vars.join(', ') + '){' + code + close
    return utility('bind') + "(#{func}, #{@context})" if @bound
    if @front then "(#{func})" else func

  # Short-circuit `traverseChildren` method to prevent it from crossing scope boundaries
  # unless `crossScope` is `true`.
  traverseChildren: (crossScope, func) -> super crossScope, func if crossScope

#### Param

# A parameter in a function definition. Beyond a typical Javascript parameter,
# these parameters can also attach themselves to the context of the function,
# as well as be a splat, gathering up a group of parameters into an array.
exports.Param = class Param extends Base

  children: <[ name value ]>

  constructor: (@name, @value, @splat) ->

  compile: (o) -> @name.compile o, LEVEL_LIST

  asReference: (o) ->
    return @reference if @reference
    node = if @isComplex() then new Literal o.scope.temporary 'arg' else @name
    node = new Value node
    node = new Splat node if @splat
    @reference = node

  isComplex: -> @name.isComplex()

#### Splat

# A splat, either as a parameter to a function, an argument to a call,
# or as part of a destructuring assignment.
exports.Splat = class Splat extends Base

  children: ['name']

  isAssignable: YES

  constructor: (name) ->
    @name = if name.compile then name else new Literal name

  assigns: -> @name.assigns it

  compile: -> @name.compile arguments...

  # Utility function that converts arbitrary number of elements, mixed with
  # splats, to a proper array.
  @compileArray: (o, list, apply) ->
    index = -1
    continue while (node = list[++index]) and node not instanceof Splat
    return '' if index >= list.length
    if list.length is 1
      code = list[0].compile o, LEVEL_LIST
      return code if apply
      return "#{ utility 'slice' }.call(#{code})"
    args = list.slice index
    for node, i of args
      code = node.compile o, LEVEL_LIST
      args[i] = if node instanceof Splat
      then "#{ utility 'slice' }.call(#{code})"
      else "[#{code}]"
    return args[0] + ".concat(#{ args.slice(1).join ', ' })" if index is 0
    base = (node.compile o, LEVEL_LIST for node of list.slice 0, index)
    "[#{ base.join ', ' }].concat(#{ args.join ', ' })"

#### While

# A while loop, the only sort of low-level loop exposed by Coco. From
# it, all other loops can be manufactured. Useful in cases where you need more
# flexibility or more speed than a comprehension can provide.
exports.While = class While extends Base

  children: <[ condition guard body ]>

  isStatement: YES

  constructor: (cond, options = {}) ->
    @condition = if options.name is 'until' then cond.invert() else cond
    {@guard}   = options

  addBody: (@body) -> this

  makeReturn: RETURN

  containsPureStatement: ->
    {expressions} = @body
    i = expressions.length
    return true if expressions[--i]?.containsPureStatement()
    ret = -> it instanceof Return
    return true while i when expressions[--i].contains ret
    false

  # The main difference from a JavaScript *while* is that the Coco
  # *while* can be used as a part of a larger expression -- while loops may
  # return an array containing the computed result of each iteration.
  compileNode: (o) ->
    o.indent += TAB
    code   = @condition.compile o, LEVEL_PAREN
    set    = ''
    {body} = this
    if body.isEmpty()
      body = ''
    else
      if o.level > LEVEL_TOP or @returns
        rvar = o.scope.temporary 'result'
        set  = "#{@tab}#{rvar} = [];\n"
        body = Push.wrap rvar, body if body
      body = new If @guard, body, {'statement'} if @guard
      body = "\n#{ body.compile o, LEVEL_TOP }\n#{@tab}"
    code  = set + @tab + if code is 'true' then 'for (;;' else "while (#{code}"
    code += ") {#{body}}"
    if @returns
      o.indent = @tab
      code += '\n' + new Return(new Literal rvar).compile o
    o.scope.free rvar if rvar
    code

#### Op

# Simple Arithmetic and logical operations. Performs some conversion from
# Coco operations into their JavaScript equivalents.
exports.Op = class Op extends Base

  # The map of invertible operators.
  INVERSIONS:
    '!==': '==='
    '===': '!=='
    '!=' : '=='
    '==' : '!='

  children: <[ first second ]>

  constructor: (op, first, second, flip) ->
    return new Of first, second if op is 'of'
    if op is 'do'
      if first instanceof Code and first.bound
        first.bound = false
        first = new Value first, [new Accessor new Literal 'call']
        args  = [new Literal 'this']
      return new Call first, args
    if op is 'new'
      return first.newInstance() if first instanceof Call
      first = new Parens first   if first instanceof Code and first.bound
      first.keep = true
    @operator = op
    @first    = first
    @second   = second
    @flip     = !!flip

  isUnary: -> not @second

  # Am I capable of
  # [Python-style comparison chaining](http://docs.python.org/reference/expressions.html#notin)?
  isChainable: -> @operator of <[ < > >= <= === !== == != ]>

  invert: ->
    if op = @INVERSIONS[@operator]
      @operator = op
      this
    else if @second
    then new Parens(this).invert()
    else super()

  unfoldSoak: (o) ->
    @operator of <[ ++ -- delete ]> and If.unfoldSoak o, this, 'first'

  compileNode: (o) ->
    return @compileUnary     o if @isUnary()
    return @compileChain     o if @isChainable() and @first.isChainable()
    return @compileExistence o if @operator is '?'
    return @compileMultiIO   o if @operator is 'instanceof' and @second.isArray()
    @first.front = @front
    "#{ @first.compile o, LEVEL_OP } #{@operator} #{ @second.compile o, LEVEL_OP }"

  # Mimic Python's chained comparisons when multiple comparison operators are
  # used sequentially. For example:
  #
  #     coco -e 'console.log 50 < 65 > 10'
  #     true
  compileChain: (o) ->
    [@first.second, shared] = @first.second.cache o
    fst  = @first.compile o, LEVEL_OP
    fst .= slice 1, -1 if fst.charAt(0) is '('
    code  = "#{fst} && #{ shared.compile o } #{@operator} "
    code += @second.compile o, LEVEL_OP
    o.scope.free shared.value if @first.second isnt shared
    if o.level < LEVEL_OP then code else "(#{code})"

  compileExistence: (o) ->
    if @first.isComplex()
      ref = tmp = o.scope.temporary 'ref'
      fst = new Parens new Assign new Literal(ref), @first, '='
    else
      fst = @first
      ref = fst.compile o
    code  = new Existence(fst).compile o
    code += ' ? ' + ref + ' : ' + @second.compile o, LEVEL_LIST
    o.scope.free tmp if tmp
    code

  # Compile a unary **Op**.
  compileUnary: (o) ->
    parts = [op = @operator]
    parts.push ' ' if op of <[ new typeof delete void ]> or
                      op of <[ + - ]> and @first.operator is op
    parts.push @first.compile o, LEVEL_OP
    parts.reverse() if @flip
    code = parts.join ''
    if o.level <= LEVEL_OP then code else "(#{code})"

  compileMultiIO: (o) ->
    [sub, ref] = @first.cache o, LEVEL_OP
    tests = for item, i of @second.base.objects
      (if i then ref else sub) + ' instanceof ' + item.compile o
    o.scope.free ref if sub isnt ref
    code = tests.join ' || '
    if o.level < LEVEL_OP then code else "(#{code})"

  toString: (idt) -> super idt, @constructor.name + ' ' + @operator

#### Of
exports.Of = class Of extends Base

  children: <[ object array ]>

  constructor: (@object, @array) ->

  invert: NEGATE

  compileNode: (o) ->
    if @array instanceof Value and @array.isArray()
    then @compileOrTest   o
    else @compileLoopTest o

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
    super idt, @constructor.name + if @negated then '!' else ''

#### Try

# A classic *try/catch/finally* block.
exports.Try = class Try extends Base

  children: <[ attempt recovery ensure ]>

  isStatement: YES

  constructor: (@attempt, @error, @recovery, @ensure) ->

  makeReturn: ->
    @attempt  = @attempt .makeReturn() if @attempt
    @recovery = @recovery.makeReturn() if @recovery
    this

  # Compilation is more or less as you would expect -- the *finally* clause
  # is optional, the *catch* is not.
  compileNode: (o) ->
    o.indent += TAB
    errorPart = if @error then " (#{ @error.compile o }) " else ' '
    catchPart = if @recovery
      " catch#{errorPart}{\n#{ @recovery.compile o, LEVEL_TOP }\n#{@tab}}"
    else unless @ensure or @recovery
      ' catch (_e) {}'
    """
    #{@tab}try {
    #{ @attempt.compile o, LEVEL_TOP }
    #{@tab}}#{ catchPart or '' }
    """ + if @ensure then " finally {\n#{ @ensure.compile o, LEVEL_TOP }\n#{@tab}}" else ''

#### Throw

# Simple node to throw an exception.
exports.Throw = class Throw extends Base

  children: ['expression']

  isStatement: YES

  constructor: (@expression) ->

  # A **Throw** is already a return, of sorts...
  makeReturn: THIS

  compileNode: (o) -> @tab + "throw #{ @expression.compile o };"

#### Existence

# Checks a variable for existence -- not *null* and not *undefined*. This is
# similar to `.nil?` in Ruby, and avoids having to consult a JavaScript truth
# table.
exports.Existence = class Existence extends Base

  children: ['expression']

  constructor: (@expression) ->

  invert: NEGATE

  compileNode: (o) ->
    code = @expression.compile o
    if IDENTIFIER.test(code) and not o.scope.check code, true
      code = if @negated
      then "typeof #{code} == \"undefined\" || #{code} === null"
      else "typeof #{code} != \"undefined\" && #{code} !== null"
    else
      code += " #{ if @negated then '=' else '!' }= null"
    if o.level <= LEVEL_COND then code else "(#{code})"

#### Parens

# An extra set of parentheses, specified explicitly in the source. At one time
# we tried to clean up the results by detecting and removing redundant
# parentheses, but no longer -- you can put in as many as you please.
#
# Parentheses are a good way to force any statement to become an expression.
exports.Parens = class Parens extends Base

  children: ['expression']

  constructor: (@expression, @keep) ->

  unwrap    : -> @expression
  isComplex : -> @expression.isComplex()
  makeReturn: -> @expression.makeReturn()

  compileNode: (o) ->
    expr = @expression
    expr.front = @front
    return expr.compile o if not @keep and
      (expr instanceof [Value, Call, Code, Parens] or
       o.level < LEVEL_OP and expr instanceof Op)
    code = expr.compile o, LEVEL_PAREN
    if expr.isStatement() then code else "(#{code})"

#### For

# Coco's replacement for the *for* loop is our array and object
# comprehensions, that compile into *for* loops here. They also act as an
# expression, able to return the result of each filtered iteration.
#
# Unlike Python array comprehensions, they can be multi-line, and you can pass
# the current index of the loop as a second parameter. Unlike Ruby blocks,
# you can map and filter in a single pass.
exports.For = class For extends Base

  children: <[ body source guard step from to ]>

  isStatement: YES

  constructor: (body, head) ->
    if head.index instanceof Value
      throw SyntaxError 'invalid index variable: ' + head.index.compile o, LEVEL_LIST
    this import all head
    @body    = new Expressions body
    @step  or= new Literal 1 unless @object
    @returns = false

  makeReturn: RETURN

  containsPureStatement: While::containsPureStatement

  compileReturnValue: (o, val) ->
    return '\n' + new Return(new Literal val).compile o if @returns
    return '\n' + val if val
    ''

  # Welcome to the hairiest method in all of Coco. Handles the inner
  # loop, filtering, stepping, and result saving for array, object, and range
  # comprehensions. Some of the generated code can be shared in common, and
  # some cannot.
  compileNode: (o) ->
    {scope} = o
    {body}  = this
    @temps  = []
    pattern = @name instanceof Value
    name    = not pattern and @name?.compile o
    index   = @index?.compile o
    varPart = guardPart = defPart = retPart = ''
    idt     = o.indent + TAB
    scope.declare name  if name
    scope.declare index if index
    @temps.push ivar = scope.temporary 'i' unless ivar = index
    [step, pvar] = @step.compileLoopReference o, 'step' if @step
    @temps.push pvar if step isnt pvar
    if @from
      eq = if @op is 'til' then '' else '='
      [tail, tvar] = @to.compileLoopReference o, 'to'
      vars = ivar + ' = ' + @from.compile o
      if tail isnt tvar
        vars += ', ' + tail
        @temps.push tvar
      cond = if +pvar
      then "#{ivar} #{ if pvar < 0 then '>' else '<' }#{eq} #{tvar}"
      else "#{pvar} < 0 ? #{ivar} >#{eq} #{tvar} : #{ivar} <#{eq} #{tvar}"
    else
      if name or @object and not @raw
        [sourcePart, svar] = @source.compileLoopReference o, 'ref'
        @temps.push svar if sourcePart isnt svar
      else
        sourcePart = svar = @source.compile o, LEVEL_PAREN
      namePart = if pattern
        new Assign(@name, new Literal "#{svar}[#{ivar}]").compile o, LEVEL_TOP
      else if name
        "#{name} = #{svar}[#{ivar}]"
      unless @object
        if 0 > pvar and (pvar | 0) is +pvar  # negative int
          vars = "#{ivar} = #{svar}.length - 1"
          cond = "#{ivar} >= 0"
        else
          @temps.push lvar = scope.temporary 'len'
          vars = "#{ivar} = 0, #{lvar} = #{svar}.length"
          cond = "#{ivar} < #{lvar}"
    if @object
      forPart   = ivar + ' in ' + sourcePart
      guardPart = if @raw then '' else
        idt + "if (!#{ utility 'owns' }.call(#{svar}, #{ivar})) continue;\n"
    else
      vars   += ', ' + step if step isnt pvar
      defPart = @tab + sourcePart + ';\n' if svar isnt sourcePart
      forPart = vars + "; #{cond}; " + switch +pvar
      case  1 then '++' + ivar
      case -1 then '--' + ivar
      default ivar + if pvar < 0 then ' -= ' + pvar.slice 1 else ' += ' + pvar
    varPart  = idt + namePart + ';\n' if namePart
    defPart += @pluckDirectCalls o, body, name, index unless pattern
    code = guardPart + varPart
    unless body.isEmpty()
      if o.level > LEVEL_TOP or @returns
        @temps.push rvar = scope.temporary 'result'
        defPart += @tab + rvar + ' = [];\n'
        retPart  = @compileReturnValue o, rvar
        body     = Push.wrap rvar, body
      body     = new If @guard, body, {'statement'} if @guard
      o.indent = idt
      code    += body.compile o, LEVEL_TOP
    code = '\n' + code + '\n' + @tab if code
    defPart + @tab + "for (#{forPart}) {#{code}}" + retPart

  pluckDirectCalls: (o, body, name, index) ->
    defs = ''
    for exp, idx of body.expressions when (exp = do exp.unwrapAll) instanceof Call
      val = do exp.variable.unwrapAll
      continue unless \
        val instanceof Code and not exp.args.length or
          val instanceof Value and val.base instanceof Code and
          val.properties.length is 1 and
          val.properties[0].name?.value is 'call'
      @temps.push ref = o.scope.temporary 'fn'
      fn   = val.base or val
      base = new Value ref = new Literal ref
      args = [].concat name or [], index or []
      args.reverse() if @object
      fn.params.push new Param args[i] = new Literal a for a, i of args
      if val.base
        [val.base, base] = [base, val]
        args.unshift new Literal 'this'
      body.expressions[idx] = new Call base, args
      defs += @tab + new Assign(ref, fn, '=').compile(o, LEVEL_TOP) + ';\n'
    defs

#### Switch

# A JavaScript *switch* statement. Converts into a returnable expression on-demand.
exports.Switch = class Switch extends Base

  children: <[ subject cases otherwise ]>

  isStatement: YES

  constructor: (@subject, @cases, @otherwise) ->
    return if @subject
    @subject = new Literal false
    cs.tests = (test.invert() for test of cs.tests) for cs of @cases

  makeReturn: ->
    cs.body.makeReturn() for cs of @cases
    @otherwise?.makeReturn()
    this

  compileNode: (o) ->
    o.indent += TAB
    {tab} = this
    code  = tab + "switch (#{ @subject.compile o, LEVEL_PAREN }) {\n"
    lastIndex = if @otherwise then -1 else @cases.length - 1
    for cs, i of @cases
      code += cs.compile o, tab
      break if i is lastIndex
      for exp of cs.body.expressions by -1 when exp not instanceof Comment
        code += o.indent + 'break;\n' unless exp instanceof Return
        break
    code += tab + "default:\n#{ @otherwise.compile o, LEVEL_TOP }\n" if @otherwise
    code +  tab + '}'

#### Case

exports.Case = class Case extends Base

  children: <[ tests body ]>

  constructor: (@tests, @body) ->

  compile: (o, tab) ->
    code = ''
    add  = -> code += tab + "case #{ it.compile o, LEVEL_PAREN }:\n"
    for test of @tests
      if test.=unwrap() instanceof Arr
      then add c for c of test.objects
      else add test
    code += body + '\n' if body = @body.compile o, LEVEL_TOP
    code

#### If

# *If/else* statements. Acts as an expression by pushing down requested returns
# to the last line of each clause.
#
# Single-expression **Ifs** are compiled into conditional operators if possible,
# because ternaries are already proper expressions, and don't need conversion.
exports.If = class If extends Base

  children: <[ condition body elseBody ]>

  constructor: (cond, @body, options = {}) ->
    @condition = if options.name is 'unless' then cond.invert() else cond
    @elseBody  = null
    @isChain   = false
    {@soak, @statement} = options

  bodyNode     : -> @body    ?.unwrap()
  elseBodyNode : -> @elseBody?.unwrap()

  # Rewrite a chain of **Ifs** to add a default case as the final *else*.
  addElse: (elseBody) ->
    if @isChain
      @elseBodyNode().addElse elseBody
    else
      @isChain  = elseBody instanceof If
      @elseBody = new Expressions elseBody
    this

  # The **If** only compiles into a statement if either of its bodies needs
  # to be a statement. Otherwise a conditional operator is safe.
  isStatement: (o) ->
    @statement or o?.level is LEVEL_TOP or
      @bodyNode().isStatement(o) or @elseBodyNode()?.isStatement(o)

  compileNode: (o) ->
    if @isStatement o then @compileStatement o else @compileExpression o

  makeReturn: ->
    @body     and= new Expressions @body    .makeReturn()
    @elseBody and= new Expressions @elseBody.makeReturn()
    this

  # Compile the **If** as a regular *if-else* statement. Flattened chains
  # force inner *else* bodies into statement form.
  compileStatement: (o) ->
    child = del o, 'chainChild'
    cond  = @condition.compile o, LEVEL_PAREN
    o.indent += TAB
    body   = new Expressions(@body).compile o
    body   = "\n#{body}\n#{@tab}" if body
    ifPart = "if (#{cond}) {#{body}}"
    ifPart = @tab + ifPart unless child
    return ifPart unless @elseBody
    ifPart + ' else ' + if @isChain
      o.indent     = @tab
      o.chainChild = true
      @elseBody.unwrap().compile o, LEVEL_TOP
    else
      "{\n#{ @elseBody.compile o, LEVEL_TOP }\n#{@tab}}"

  # Compile the If as a conditional operator.
  compileExpression: (o) ->
    code = @condition .compile(o, LEVEL_COND) + ' ? ' +
           @bodyNode().compile(o, LEVEL_LIST) + ' : ' +
           (@elseBodyNode()?.compile(o, LEVEL_LIST) or 'void 0')
    if o.level >= LEVEL_COND then "(#{code})" else code

  unfoldSoak: -> @soak and this

  # Unfold a node's child if soak, then tuck the node under created `If`
  @unfoldSoak: (o, parent, name) ->
    return unless ifn = parent[name].unfoldSoak o
    parent[name] = ifn.body
    ifn.body     = new Value parent
    ifn

# Faux-Nodes
# ----------
# Faux-nodes are never created by the grammar, but are used during code
# generation to generate other combinations of nodes.

#### Push

# The **Push** creates the tree for `array.push(value)`,
# which is helpful for recording the result arrays from comprehensions.
Push =
  wrap: (name, exps) ->
    return exps if exps.isEmpty() or exps.expressions[*-1].containsPureStatement()
    exps.append new Call \
      new Value(new Literal(name), [new Accessor new Literal 'push']), [exps.pop()]

#### Closure

# A faux-node used to wrap an expressions body in a closure.
Closure =

  # Wrap the expressions body, unless it contains a pure statement,
  # in which case, no dice. If the body mentions `this` or `arguments`,
  # then make sure that the closure wrapper preserves the original values.
  wrap: (expressions, statement, noReturn) ->
    return expressions if expressions.containsPureStatement()
    func = new Code [], new Expressions expressions
    func.wrapper = true
    args = []
    if (mentionsArgs = expressions.contains @literalArgs) or
       (               expressions.contains @literalThis)
      meth = new Literal if mentionsArgs then 'apply' else 'call'
      args = [new Literal 'this']
      args.push new Literal 'arguments' if mentionsArgs
      func = new Value func, [new Accessor meth]
      func.noReturn = noReturn
    call = new Parens new Call(func, args), true
    if statement then new Expressions call else call

  literalArgs: -> it instanceof Literal and it.value is 'arguments'
  literalThis: -> it instanceof Literal and it.value is 'this' or
                  it instanceof Code    and it.bound

# Constants
# ---------

UTILITIES =

  # Correctly set up a prototype chain for inheritance, including a reference
  # to the superclass for `super()` calls. See:
  # [goog.inherits](http://closure-library.googlecode.com/svn/docs/closureGoogBase.js.source.html#line1206).
  extends: '''
    function(child, parent){
      function ctor(){ this.constructor = child; }
      ctor.prototype = parent.prototype;
      child.prototype = new ctor;
      if (typeof parent.extended == "function") parent.extended(child);
      child.__super__ = parent.prototype;
    }
  '''

  # Create a function bound to the current value of "this".
  bind: '''
    function(func, context){
      return function(){ return func.apply(context, arguments); };
    }
  '''

  # Discover if an item is in an array.
  indexOf: '''
    Array.prototype.indexOf || function(item){
      for (var i = 0, l = this.length; i < l; ++i)
        if (this[i] === item) return i;
      return -1;
    }
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
  owns  : 'Object.prototype.hasOwnProperty'
  slice : 'Array.prototype.slice'

# Levels indicates a node's position in the AST.
LEVEL_TOP    = 0  # ...;
LEVEL_PAREN  = 1  # (...)
LEVEL_LIST   = 2  # [...]
LEVEL_COND   = 3  # ... ? x : y
LEVEL_OP     = 4  # !...
LEVEL_ACCESS = 5  # ...[0]

# Tabs are two spaces for pretty printing.
TAB = '  '

# Trim out all trailing whitespace, so that the generated code plays nice
# with Git.
TRAILING_WHITESPACE = /[ \t]+$/gm

IDENTIFIER = /^[$A-Za-z_][$\w]*$/
NUMBER     = /// ^ -? (?: 0x[\da-f]+ | (?:\d+(\.\d+)?|\.\d+)(?:e[+-]?\d+)? ) $ ///i
SIMPLENUM  = /^\d+$/
METHOD_DEF = /^(?:(\S+)\.prototype\.)?([$A-Za-z_][$\w]*)$/

# Utility Functions
# -----------------

# Helper for ensuring that utility functions are assigned at the top level.
utility = (name) ->
  ref = "__#{name}"
  Scope.root.assign ref, UTILITIES[name]
  ref

# Delete a key from an object, returning the value.
del = (obj, key) ->
  val =  obj[key]
  delete obj[key]
  val

multident = (code, tab) -> code.replace /\n/g, '$&' + tab
