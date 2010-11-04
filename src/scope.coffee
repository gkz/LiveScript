# The **Scope** class regulates lexical scoping within Coco. As you
# generate code, you create a tree of scopes in the same shape as the nested
# function bodies. Each scope knows about the variables declared within it,
# and has a reference to its parent enclosing scope. In this way, we know which
# variables are new and need to be declared with `var`, and which are shared
# with the outside.

exports.Scope = class Scope

  # The top-level **Scope** object.
  @root: null

  # Initialize a scope with its parent, for lookups up the chain,
  # as well as a reference to the **Expressions** node is belongs to, which is
  # where it should declare its variables, and a reference to the function that
  # it wraps.
  constructor: (@parent, @expressions, @method) ->
    @variables = [{name: 'arguments', type: 'arguments'}]
    @positions = {}
    Scope.root = this unless @parent

  # Adds a new variable or overrides an existing one.
  add: (name, type) ->
    if typeof (pos = @positions[name]) is 'number'
    then @variables[pos].type = type
    else @positions[name]     = -1 + @variables.push {name, type}

  # Look up a variable name in lexical scope, and declare it if it does not
  # already exist.
  find: (name, above) ->
    return true if @check name, above
    @add name, 'var'
    false

  # Test variables and return `true` the first time `fn(v)` returns `true`
  any: (fn) ->
    return true for v in @variables when fn v
    false

  # Reserve a variable name as originating from a function parameter for this
  # scope. No `var` required for internal references.
  parameter: -> @add it, 'param'

  # Allow a temporary variable to be reused.
  free     : -> @add it, 'reuse'

  # Just check to see if a variable has already been declared, without reserving,
  # walks up to the root scope.
  check: (name, above) ->
    found = !!@type name
    return found if found or not above
    !!@parent?.check name, above

  # Generate a temporary variable name at the given index.
  pickTemp: (name, index) ->
    '_' + if name.length > 1
    then name + (if index > 1 then index else '')
    else (index + parseInt name, 36).toString(36).replace /\d/g, 'a'

  # Gets the type of a variable.
  type: (name) ->
    return v.type for v in @variables when v.name is name
    null

  # If we need to store an intermediate result, find an available name for a
  # compiler-generated variable. `_var`, `_var2`, and so on...
  temporary: (name) ->
    index = 0
    index++ while @check(temp = @pickTemp name, index) and
                  @type(temp) isnt 'reuse'
    @add temp, 'var'
    temp

  # Ensure that an assignment is made at the top of this scope
  assign: (name, value) -> @add name, value: value, assigned: true

  # Does this scope reference any variables that need to be declared in the
  # given function body?
  hasDeclarations: (body) ->
    body is @expressions and @any -> it.type in <[ var reuse ]>

  # Does this scope reference any assignments that need to be declared at the
  # top of the given function body?
  hasAssignments: (body) ->
    body is @expressions and @any -> it.type.assigned

  # Return the list of variables first declared in this scope.
  declaredVariables: ->
    usr = []
    tmp = []
    for v in @variables when v.type in <[ var reuse ]>
      (if v.name.charAt(0) is '_' then tmp else usr).push v.name
    usr.sort().concat tmp.sort()

  # Return the list of assignments that are supposed to be made at the top
  # of this scope.
  assignedVariables: ->
    v.name + ' = ' + v.type.value for v in @variables when v.type.assigned
