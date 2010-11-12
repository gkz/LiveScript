# Contains all of the node classes for the syntax tree. Most
# nodes are created as the result of actions in the [grammar](grammar.html),
# but some are created by other nodes as a method of code generation. To convert
# the syntax tree into a string of JavaScript code, call `compile()` on the root.

{Scope} = require './scope'

exports.extend = (left, rite) -> left import all rite  # for parser

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
      throw SyntaxError 'cannot include a pure statement in an expression'
    args = []
    func = Code [], Expressions this
    func.wrapper = true
    if @contains @literalThis
      args.push Literal 'this'
      call = Value func, [Accessor Literal 'call']
    mentionsArgs = false
    @traverseChildren false, ->
      if it instanceof Literal and it.value is 'arguments'
        mentionsArgs := it.value = '_args'
    if mentionsArgs
      args.push Literal 'arguments'
      func.params.push Param Literal '_args'
    Parens(Call(call or func, args), true).compileNode o

  literalThis: -> it instanceof Literal and it.value is 'this' or
                  it instanceof Code    and it.bound

  # If the code generation wishes to use the result of a complex expression
  # in multiple places, ensure that the expression is only ever evaluated once,
  # by assigning it to a temporary variable. Pass a level to precompile.
  cache: (o, level, reused) ->
    unless @isComplex()
      ref = if level then @compile o, level else this
      [ref, ref]
    else
      ref = Literal reused or o.scope.temporary 'ref'
      sub = Assign ref, this, '='
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
  makeReturn: -> Return this

  # Does this node, or any of its children, contain a node of a certain kind?
  # Recursively traverses down the *children* of the nodes, yielding to a block
  # and returning true when the block finds a match. `contains` does not cross
  # scope boundaries.
  contains: (pred) ->
    contains = false
    @traverseChildren false, -> not contains := true if pred it
    contains

  # Is this node of a certain type, or does it contain the type?
  containsType: (type) ->
    this instanceof type or @contains -> it instanceof type

  # Convenience for the most common use of contains. Does the node contain
  # a pure statement?
  containsPureStatement: ->
    @isPureStatement() or @contains -> it.isPureStatement()

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

  invert: -> Op '!', this

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
  isArray         : NO
  isObject        : NO

  assigns      : NO   # Is this node used to assign a certain variable?
  unwrap       : THIS
  unfoldSoak   : NO
  unfoldAssign : NO

  # `toString` representation of the node, for inspecting the parse tree.
  # This is what `coco --nodes` prints out.
  @::toString = (idt = '', override) ->
    children = (child.toString idt + TAB for child of @collectChildren())
    name  = override or @constructor.name
    name += '?' if @soak
    '\n' + idt + name + children.join ''

#### Expressions

# The expressions body is the list of expressions that forms the body of an
# indented block of code -- the implementation of a function, a clause in an
# `if`, `switch`, or `try`, and so on...
class exports.Expressions extends Base
  (node) =>
    return node if node instanceof Expressions
    @expressions = if node then [node] else []

  children: ['expressions']

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
    o.expressions = this
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
class exports.Literal extends Base
  (@value) =>

  makeReturn: -> if @isPureStatement() then this else Return this

  # Break and continue must be treated as pure statements -- they lose their
  # meaning when wrapped in a closure.
  isPureStatement: -> @value of <[ break continue debugger ]>

  isAssignable: -> IDENTIFIER.test @value

  isComplex: NO

  assigns: -> it is @value

  compile: -> if @value.reserved then "\"#{@value}\"" else @value

  @::toString = -> ' "' + @value + '"'

#### Return

# A `return` is a *pureStatement* -- wrapping it in a closure wouldn't
# make sense.
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

# A value, variable or literal or parenthesized, indexed or dotted into,
# or vanilla.
class exports.Value extends Base
  # A **Value** has a base and a list of property accesses.
  (base, props, tag) =>
    return base if not props and base instanceof Value
    @base       = base
    @properties = props or []
    @[tag]      = true if tag

  children: <[ base properties ]>

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
    base = Value @base, @properties.slice 0, -1
    if base.isComplex()  # `a().b`
      ref  = Literal o.scope.temporary 'base'
      base = Value Parens Assign ref, base, '='
      bref = Value ref
      bref.temps = [ref.value]
    return [base, bref] unless name  # `a()`
    if name.isComplex()  # `a[b()]`
      ref  = Literal o.scope.temporary 'name'
      name = Index Assign ref, name.index, '='
      nref = Index ref
      nref.temps = [ref.value]
    [base.append(name), Value(bref or base.base, [nref or name])]

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
      [sub, ref] = Value(@base, @properties.slice 0, i).cache o
      @temps = [ref.value] if sub isnt ref
      ref += ' ' if SIMPLENUM.test ref.=compile o
      star.value = ref + '.length'
      return Value sub, @properties.slice i
    null

  # Unfold a soak into an `If`: `a?.b` -> `a.b if a?`
  unfoldSoak: (o) ->
    if ifn = @base.unfoldSoak o
      ifn.body.properties.push @properties...
      return ifn
    for prop, i of @properties when prop.soak
      prop.soak = false
      fst = Value @base, @properties.slice 0, i
      snd = Value @base, @properties.slice i
      if fst.isComplex()
        ref = Literal o.scope.temporary 'ref'
        fst = Parens Assign ref, fst, '='
        snd.base = ref
      ifn = If Existence(fst), snd, soak: true
      ifn.temps = [ref.value] if ref
      return ifn
    null

  unfoldAssign: (o) ->
    if asn = @base.unfoldAssign o
      asn.value.properties.push @properties...
      return asn
    for prop, i of @properties when prop.assign
      prop.assign = false
      [lhs, rhs] = Value(@base, @properties.slice 0, i).cacheReference o
      asn = Assign lhs, Value(rhs, @properties.slice i), '='
      asn.access = true
      return asn
    null

#### Comment

# Coco passes through block comments as JavaScript block comments
# at the same position.
class exports.Comment extends Base
  (@comment) =>

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
class exports.Call extends Base
  (variable, @args = [], @soak) =>
    @new      = ''
    @isSuper  = variable is 'super'
    @variable = if @isSuper then null else variable

  children: <[ variable args ]>

  # Tag this invocation as creating a new instance.
  newInstance: -> @new = 'new '; this

  # Grab the reference to the superclass' implementation of the current method.
  superReference: (o) ->
    {method} = o.scope
    throw SyntaxError 'cannot call super outside of a function' unless method
    {name, clas} = method
    throw SyntaxError 'cannot call super on an anonymous function' unless name
    if clas
    then clas + '.superclass.prototype.' + name
    else name + '.superclass'

  unfoldSoak: (o) ->
    if @soak
      if @variable
        return ifn if ifn = If.unfoldSoak o, this, 'variable'
        [left, rite] = Value(@variable).cacheReference o
      else
        left = Literal @superReference o
        rite = Value left
      rite = Call rite, @args
      rite.new = @new
      left = Literal "typeof #{ left.compile o } == \"function\""
      return If left, Value(rite), soak: true
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
          asn.value = Value call
      return asn.compile o if asn
      vr.front = @front
    return @compileSplat o, code if code = Splat.compileArray o, @args, true
    args = (arg.compile o, LEVEL_LIST for arg of @args).join ', '
    if @isSuper
    then @superReference(o) + ".call(this#{ args and ', ' + args })"
    else @new + @variable.compile(o, LEVEL_ACCESS) + "(#{args})"

  # If you call a function with a splat, it's converted into a JavaScript
  # `.apply()` call to allow an array of arguments to be passed.
  # If it's a constructor, then things get real tricky. We have to inject an
  # inner constructor in order to be able to pass the varargs.
  compileSplat: (o, splatargs) ->
    return @superReference(o) + ".apply(this, #{splatargs})" if @isSuper
    if @new
       idt = @tab + TAB
       return """
         (function(func, args, ctor){
         #{idt}ctor.prototype = func.prototype;
         #{idt}var child = new ctor, result = func.apply(child, args);
         #{idt}return result === Object(result) ? result : child;
         #{@tab}}(#{ @variable.compile o, LEVEL_LIST }, #{splatargs}, function(){}))
       """
    base = Value @variable
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
    "#{fun}.apply(#{ref}, #{splatargs})"

#### Extends

# Node to extend an object's prototype with an ancestor object.
# After `goog.inherits` from the
# [Closure Library](http://closure-library.googlecode.com/svn/docs/closureGoogBase.js.html).
class exports.Extends extends Base
  (@child, @parent) =>

  children: <[ child parent ]>

  compile: (o) ->
    Call(Value(Literal utility 'extends'), [@child, @parent]).compile o

#### Import

class exports.Import extends Base
  (@left, @right, own) =>
    @util = if own then 'import' else 'importAll'

  children: <[ left right ]>

  compile: (o) ->
    Call(Value(Literal utility @util), [@left, @right]).compile o

#### Accessor

# A `.` accessor into a property of a value, or the `::` shorthand for
# an accessor into the object's prototype.
class exports.Accessor extends Base
  (@name, symbol) =>
    switch symbol
    case '?.' then @soak   = true
    case '.=' then @assign = true

  children: ['name']

  compile: (o) ->
    if (name = @name.compile o).charAt(0) of <[ \" \' ]>
    then "[#{name}]"
    else ".#{name}"

  isComplex: NO

  @::toString = (idt) ->
    super idt, @constructor.name + if @assign then '=' else ''

#### Index

# A `[ ... ]` indexed accessor into an array or object.
class exports.Index extends Base
  (@index, symbol) =>
    switch symbol
    case '?[' then @soak   = true
    case '[=' then @assign = true

  children: ['index']

  compile: (o) -> "[#{ @index.compile o, LEVEL_PAREN }]"

  isComplex: -> @index.isComplex()

  @::toString = Accessor::toString

#### Obj

# An object literal, nothing fancy.
class exports.Obj extends Base
  (props) => @objects = @properties = props or []

  children: ['properties']

  isObject: YES

  assigns: (name) ->
    return true for prop of @properties when prop.assigns name
    false

  compileNode: (o) ->
    props = @properties
    return (if @front then '({})' else '{}') unless props.length
    for prop, i of props
      if prop instanceof Splat or (prop.variable or prop).base instanceof Parens
        rest = props.splice i, 1/0
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
      then Assign(prop.properties[0].name, prop, ':').compile o
      else if prop not instanceof [Assign, Comment]
      then Assign(prop, prop, ':').compile o
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
        impt = Import(Literal(oref or code), prop.name, true).compile o
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

#### Arr

# An array literal.
class exports.Arr extends Base
  (@objects = []) =>

  children: ['objects']

  isArray: YES

  assigns: (name) ->
    return true for obj of @objects when obj.assigns name
    false

  compileNode: (o) ->
    return '[]' unless @objects.length
    o.indent += TAB
    return code if code = Splat.compileArray o, @objects
    code = (obj.compile o, LEVEL_LIST for obj of @objects).join ', '
    if 0 < code.indexOf '\n'
    then "[\n#{o.indent}#{code}\n#{@tab}]"
    else "[#{code}]"

#### Class

# The Coco class definition.
class exports.Class extends Base
  (@variable, @parent, @body = Expressions()) =>

  children: <[ variable parent body ]>

  compileNode: (o) ->
    if @variable
      decl = if last = @variable.properties[*-1]
      then last instanceof Accessor and last.name.value
      else @variable.base.value
      decl and= IDENTIFIER.test(decl) and decl
    name  = decl or @name or '_Class'
    lname = Literal name
    proto = Value lname, [Accessor Literal 'prototype']
    @body.traverseChildren false, ->
      if it.value is 'this'
        it.value = name
      else if it instanceof Code
        it.clas  = name
        it.bound and= name
    for node, i of exps = @body.expressions
      if node.isObject()
        exps[i] = Import proto, node
      else if node instanceof Code
        throw SyntaxError 'more than one constructor in a class' if ctor
        ctor = node
    unless ctor
      exps.unshift ctor = Code()
      if @parent
        ctor.body.append Call 'super', [Splat Literal 'arguments']
    ctor.ctor = ctor.statement = true
    ctor.name = name
    ctor.clas = null
    exps.unshift Extends lname, @parent if @parent
    exps.push lname
    clas = Parens Call(Code [], @body), true
    clas = Assign lname, clas if decl and @variable?.isComplex()
    clas = Assign @variable, clas if @variable
    clas.compile o

#### Assign

# The **Assign** is used to assign a local variable to value, or to set the
# property of an object -- including within object literals.
class exports.Assign extends Base
  # Omit @context to declare a variable with it.
  (@variable, @value, @context) =>

  children: <[ variable value ]>

  assigns: (name) ->
    @[if @context is ':' then 'value' else 'variable'].assigns name

  unfoldSoak: (o) -> If.unfoldSoak o, this, 'variable'

  unfoldAssign: -> @access and this

  compileNode: (o) ->
    {variable, value} = this
    return @compileDestructuring o if variable.isArray() or variable.isObject()
    return @compileConditional   o if @context of <[ ||= &&= ?= ]>
    name = variable.compile o, LEVEL_LIST
    # Keep track of the name of the base object
    # we've been assigned to, for correct internal references.
    if value instanceof [Code, Class] and match = METHOD_DEF.exec name
      value.clas   = match[1] if match[1]
      value.name or= match[2]
    val = value.compile o, LEVEL_LIST
    return name + ': ' + val if @context is ':'
    unless variable.isAssignable()
      throw ReferenceError "\"#{ @variable.compile o }\" cannot be assigned."
    unless variable instanceof Value and variable.hasProperties()
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
    {objects} = @variable.unwrap()
    return value.compile o unless olen = objects.length
    isObject = @variable.isObject()
    if top and olen is 1 and (obj = objects[0]) not instanceof Splat
      # Unroll simplest cases: `{v} = x` -> `v = x.v`
      if obj instanceof Assign
        {variable: {base: idx}, value: obj} = obj
      else
        if obj.base instanceof Parens
          [obj, idx] = Value(obj.unwrapAll()).cacheReference o
        else
          idx = if isObject
          then (if obj.this then obj.properties[0].name else obj)
          else Literal 0
      acc = IDENTIFIER.test idx.unwrap().value or 0
      val = Value(value).append (if acc then Accessor else Index) idx
      return Assign(obj, val, @context).compile o
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
          then [obj, idx] = Value(obj.unwrapAll()).cacheReference o
          else idx = if obj.this then obj.properties[0].name else obj
      if not splat and obj instanceof Splat
        val = "#{olen} <= #{vvar}.length ? #{ utility 'slice' }.call(#{vvar}, #{i}"
        if rest = olen - i - 1
          ivar = o.scope.temporary 'i'
          val += ", #{ivar} = #{vvar}.length - #{rest}) : (#{ivar} = #{i}, [])"
        else
          val += ") : []"
        val   = Literal val
        splat = "#{ivar}++"
      else
        if obj instanceof Splat
          obj .= name.compile o
          throw SyntaxError \
            "multiple splats are disallowed in an assignment: #{obj} ..."
        acc = if typeof idx is 'number'
          idx = Literal splat or idx
          false
        else
          isObject and IDENTIFIER.test idx.unwrap().value or 0
        val = Value Literal(vvar), [(if acc then Accessor else Index) idx]
      assigns.push Assign(obj, val, @context).compile o, LEVEL_LIST
    o.scope.free ref if ref
    assigns.push vvar unless top
    code = assigns.join ', '
    if o.level < LEVEL_LIST then code else "(#{code})"

  # When compiling a conditional assignment, take care to ensure that the
  # operands are only evaluated once, even though we have to reference them
  # more than once.
  compileConditional: (o) ->
    [left, rite] = @variable.cacheReference o
    Op(@context.slice(0, -1), left, Assign(rite, @value, '=')).compile o

#### Code

# A function definition. This is the only node that creates a new Scope.
# When for the purposes of walking the contents of a function body, the Code
# has no *children* -- they're within the inner scope.
class exports.Code extends Base
  (@params = [], @body = Expressions(), tag) =>
    @bound = 'this' if tag is '=>'

  children: <[ params body ]>

  isStatement: -> !!@statement

  makeReturn: ->
    if @statement
      @returns = true
      this
    else
      Return this

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
    {params, body, name, statement, tab} = this
    code = 'function'
    if @ctor and @bound
      code += """
         _ctor(){}
        #{tab}_ctor.prototype = #{name}.prototype;
        #{tab}function
      """
      scope.assign '_this', 'new _ctor'
      Base::traverseChildren.call this, false, ->
        switch
        case it.value is 'this'   then it.value        = '_this'
        case it instanceof Code   then it.bound     and= '_this'
        case it instanceof Return then it.expression or= Literal '_this'
      body.append Literal 'return _this'
    vars = []
    exps = []
    for param of params when param.splat
      splats = Assign Arr(p.asReference o for p of params), Literal 'arguments'
      break
    for param of params
      if param.isComplex()
        val = ref = param.asReference o
        val = Op '?', ref, param.value if param.value
        exps.push Assign param.name, val
      else
        ref = param
        if param.value
          exps.push Op '&&',
            Literal(ref.name.value + ' == null'),
            Assign param.name, param.value
      vars.push ref unless splats
    wasEmpty = body.isEmpty()
    exps.unshift splats if splats
    body.expressions.unshift exps... if exps.length
    scope.parameter vars[i] = v.compile o for v, i of vars unless splats
    vars[0] = 'it' if not vars.length and body.contains (-> it.value is 'it')
    body.makeReturn() unless wasEmpty or @ctor
    if statement
      unless name
        throw SyntaxError 'cannot declare a nameless function'
      unless o.expressions is pscope.expressions
        throw SyntaxError 'cannot declare a function under a statement'
      pscope.add name, 'function' unless @returns
      code += ' ' + name
    code += '(' + vars.join(', ') + '){'
    code += "\n#{ body.compileWithDeclarations o }\n#{tab}" unless body.isEmpty()
    code += '}'
    if statement and name.charAt(0) isnt '_'
      code += "\n#{tab}#{name}.name = \"#{name}\";"
    code += "\n#{tab}return #{name};" if @returns
    return tab + code if statement
    return utility('bind') + "(#{code}, #{@bound})" if @bound
    if @front then "(#{code})" else code

  # Short-circuit `traverseChildren` method to prevent it from crossing scope boundaries
  # unless `crossScope` is `true`.
  traverseChildren: (crossScope, func) -> super crossScope, func if crossScope

#### Param

# A parameter in a function definition. Beyond a typical Javascript parameter,
# these parameters can also attach themselves to the context of the function,
# as well as be a splat, gathering up a group of parameters into an array.
class exports.Param extends Base
  (@name, @value, @splat) =>

  children: <[ name value ]>

  compile: (o) -> @name.compile o, LEVEL_LIST

  asReference: (o) ->
    return @reference if @reference
    node = if @isComplex() then Literal o.scope.temporary 'arg' else @name
    node = Value node
    node = Splat node if @splat
    @reference = node

  isComplex: -> @name.isComplex()

#### Splat

# A splat, either as a parameter to a function, an argument to a call,
# or as part of a destructuring assignment.
class exports.Splat extends Base
  (name) =>
    @name = if name.compile then name else Literal name

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
class exports.While extends Base
  (cond, options = {}) =>
    @condition = if options.name is 'until' then cond.invert() else cond
    {@guard}   = options

  children: <[ condition guard body ]>

  isStatement: YES

  addBody: (@body) -> this

  makeReturn: -> @returns = true; this

  makePush: (o, body) ->
    exps = body.expressions
    if (last = exps[*-1]) and not last.containsPureStatement() and
       last not instanceof Throw
      o.scope.assign '_results', '[]'
      exps[*-1] = Call Literal('_results.push'), [last]
      res = '_results'
    "\n#{@tab}return #{ res or '[]' };"

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
      ret  = @makePush o, body if @returns
      body = If @guard, body, {'statement'} if @guard
      body = "\n#{ body.compile o, LEVEL_TOP }\n#{@tab}"
    code  = set + @tab + if code is 'true' then 'for (;;' else "while (#{code}"
    code += ") {#{body}}"
    code += ret if ret
    code

#### Op

# Simple Arithmetic and logical operations. Performs some conversion from
# Coco operations into their JavaScript equivalents.
class exports.Op extends Base
  (op, first, second, flip) =>
    return Of first, second if op is 'of'
    if op is 'do'
      if first instanceof Code and first.bound
        first.bound = ''
        first = Value first, [Accessor Literal 'call']
        args  = [Literal 'this']
      return Call first, args
    if op is 'new'
      return first.newInstance()     if first instanceof Call
      first = Parens first, true if first instanceof Code and first.bound
    @operator = op
    @first    = first
    @second   = second
    @flip     = !!flip

  children: <[ first second ]>

  # The map of invertible operators.
  INVERSIONS:
    '!==':'==='
    '===':'!=='
    '!=' : '=='
    '==' : '!='
    '>'  : '<='
    '<=' : '>'
    '<'  : '>='
    '>=' : '<'

  isUnary: -> not @second

  # Am I capable of
  # [Python-style comparison chaining](http://docs.python.org/reference/expressions.html#notin)?
  isChainable: -> @operator of <[ < > >= <= === !== == != ]>

  invert: ->
    if op = @INVERSIONS[@operator]
      @operator = op
      this
    else if @second
    then Parens(this).invert()
    else Op '!', this

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
      fst = Parens Assign Literal(ref), @first, '='
    else
      fst = @first
      ref = fst.compile o
    code  = Existence(fst).compile o
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

  @::toString = (idt) -> super idt, @constructor.name + ' ' + @operator

#### Of
class exports.Of extends Base
  (@object, @array) =>

  children: <[ object array ]>

  invert: NEGATE

  compileNode: (o) ->
    if @array.isArray()
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

  @::toString = (idt) ->
    super idt, @constructor.name + if @negated then '!' else ''

#### Try

# A classic *try/catch/finally* block.
class exports.Try extends Base
  (@attempt, @thrown, @recovery, @ensure) =>

  children: <[ attempt recovery ensure ]>

  isStatement: YES

  makeReturn: ->
    @attempt  and= @attempt .makeReturn()
    @recovery and= @recovery.makeReturn()
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

  # A **Throw** is already a return, of sorts...
  makeReturn: THIS

  compile: (o) -> o.indent + "throw #{ @expression.compile o, LEVEL_PAREN };"

#### Existence

# Checks a variable for existence -- not *null* and not *undefined*. This is
# similar to `.nil?` in Ruby, and avoids having to consult a JavaScript truth
# table.
class exports.Existence extends Base
  (@expression) =>

  children: ['expression']

  invert: NEGATE

  compileNode: (o) ->
    code = @expression.compile o, LEVEL_OP
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
class exports.Parens extends Base
  (@expression, @keep) =>

  children: ['expression']

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
class exports.For extends While
  (body, head) =>
    if head.index instanceof Value
      throw SyntaxError 'invalid index variable: ' + head.index.compile o, LEVEL_LIST
    this import all head
    @body    = Expressions body
    @step  or= Literal 1 unless @object
    @returns = false

  children: <[ body source guard step from to ]>

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
        Assign(@name, Literal "#{svar}[#{ivar}]").compile o, LEVEL_TOP
      else if name
        "#{name} = #{svar}[#{ivar}]"
      unless @object
        sourcePart = "(#{sourcePart})" if sourcePart isnt svar
        if 0 > pvar and (pvar | 0) is +pvar  # negative int
          vars = "#{ivar} = #{sourcePart}.length - 1"
          cond = "#{ivar} >= 0"
        else
          @temps.push lvar = scope.temporary 'len'
          vars = "#{ivar} = 0, #{lvar} = #{sourcePart}.length"
          cond = "#{ivar} < #{lvar}"
    if @object
      forPart   = ivar + ' in ' + sourcePart
      guardPart = if @raw then '' else
        idt + "if (!#{ utility 'owns' }.call(#{svar}, #{ivar})) continue;\n"
    else
      vars   += ', ' + step if step isnt pvar
      forPart = vars + "; #{cond}; " + switch +pvar
      case  1 then '++' + ivar
      case -1 then '--' + ivar
      default ivar + if pvar < 0 then ' -= ' + pvar.slice 1 else ' += ' + pvar
    varPart  = idt + namePart + ';\n' if namePart
    defPart += @pluckDirectCalls o, body, name, index unless pattern
    code = guardPart + varPart
    unless body.isEmpty()
      retPart  = @makePush o, body if @returns
      body     = If @guard, body, {'statement'} if @guard
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
      base = Value ref = Literal ref
      args = [].concat name or [], index or []
      args.reverse() if @object
      fn.params.push Param args[i] = Literal a for a, i of args
      if val.base
        [val.base, base] = [base, val]
        args.unshift Literal 'this'
      body.expressions[idx] = Call base, args
      defs += @tab + Assign(ref, fn, '=').compile(o, LEVEL_TOP) + ';\n'
    defs

#### Switch

# A JavaScript *switch* statement. Converts into a returnable expression on-demand.
class exports.Switch extends Base
  (@subject, @cases, @otherwise) =>
    return if @subject
    @subject = Literal false
    cs.tests = (test.invert() for test of cs.tests) for cs of @cases

  children: <[ subject cases otherwise ]>

  isStatement: YES

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

class exports.Case extends Base
  (@tests, @body) =>

  children: <[ tests body ]>

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
class exports.If extends Base
  (cond, @body, options = {}) =>
    @condition = if options.name is 'unless' then cond.invert() else cond
    @elseBody  = null
    @isChain   = false
    {@soak, @statement} = options

  children: <[ condition body elseBody ]>

  bodyNode     : -> @body    ?.unwrap()
  elseBodyNode : -> @elseBody?.unwrap()

  # Rewrite a chain of **Ifs** to add a default case as the final *else*.
  addElse: (elseBody) ->
    if @isChain
      @elseBodyNode().addElse elseBody
    else
      @isChain  = elseBody instanceof If
      @elseBody = Expressions elseBody
    this

  # The **If** only compiles into a statement if either of its bodies needs
  # to be a statement. Otherwise a conditional operator is safe.
  isStatement: (o) ->
    @statement or o?.level is LEVEL_TOP or
      @bodyNode().isStatement(o) or @elseBodyNode()?.isStatement(o)

  compileNode: (o) ->
    if @isStatement o then @compileStatement o else @compileExpression o

  makeReturn: ->
    @body     and= Expressions @body    .makeReturn()
    @elseBody and= Expressions @elseBody.makeReturn()
    this

  # Compile the **If** as a regular *if-else* statement. Flattened chains
  # force inner *else* bodies into statement form.
  compileStatement: (o) ->
    child = del o, 'chainChild'
    cond  = @condition.compile o, LEVEL_PAREN
    o.indent += TAB
    body   = Expressions(@body).compile o
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
  @unfoldSoak = (o, parent, name) ->
    return unless ifn = parent[name].unfoldSoak o
    parent[name] = ifn.body
    ifn.body     = Value parent
    ifn

# Constants
# ---------

function YES  -> true
function NO   -> false
function THIS -> this

function NEGATE -> @negated = not @negated; this

UTILITIES =

  # Correctly set up a prototype chain for inheritance, including a reference
  # to the superclass for `super()` calls. See:
  # [goog.inherits](http://closure-library.googlecode.com/svn/docs/closureGoogBase.js.source.html#line1206).
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
METHOD_DEF = /^(?:(\S+)\.prototype\.|\S+?)?\b([$A-Za-z_][$\w]*)$/

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
