# The **Scope** class regulates lexical scoping within Coco. As you
# generate code, you create a tree of scopes in the same shape as the nested
# function bodies. Each scope knows about the variables declared within it,
# and has a reference to its parent enclosing scope. In this way, we know which
# variables are new and need to be declared with `var`, and which are shared
# with the outside.

# Initialize a scope with its parent, for lookups up the chain,
# as well as a reference to the **Expressions** node it belongs to, which is
# where it should declare its variables, and a reference to the function that
# it wraps.
(exports.Scope = (@parent, @expressions, @method) ->
  @variables = [{name: 'arguments', type: 'arguments'}]
  @positions = arguments: 0
  # The top-level **Scope** object.
  @constructor.root = this unless @parent
  this
):: import

  # Adds a new variable or overrides an existing one.
  add: (name, type) ->
    if name of <[ arguments eval ]>
      throw SyntaxError "redefining \"#{name}\" is deprecated"
    if v = @variables[pos = @positions[name]]
      if 'function' of [type, v.type]
        throw SyntaxError "redeclaration of \"#{name}\""
      @variables[pos].type = type
    else
      @positions[name] = -1 + @variables.push {name, type}
    this

  # Declare a variable unless declared already.
  declare: (name) ->
    scope = @shared or this
    scope.add name, 'var' unless scope.type(name) of <[ var param ]>
    this

  # Reserve a variable name as originating from a function parameter for this
  # scope. No `var` required for internal references.
  parameter: -> @add it, 'param'

  # Allow a temporary variable to be reused.
  free     : -> @add it, 'reuse'

  # Just check to see if a variable has already been declared, without reserving,
  # walks up to the root scope.
  check: (name, above) ->
    found = @positions[name] in @variables
    return found if found or not above
    !!@parent?.check name, above

  # Generate a temporary variable name at the given index.
  pickTemp: (name, index) ->
    '_' + if name.length > 1
    then name + (if index > 1 then index else '')
    else (index + parseInt name, 36).toString(36).replace /\d/g, 'a'

  # Gets the type of a variable.
  type: (name) -> @variables[@positions[name]]?.type

  # If we need to store an intermediate result, find an available name for a
  # compiler-generated variable. `_var`, `_var2`, and so on...
  temporary: (name) ->
    i = 0
    i++ until @type(temp = @pickTemp name, i) of ['reuse', void]
    @add temp, 'var'
    temp

  # Ensure that an assignment is made at the top of this scope
  assign: (name, value) -> @add name, {value, assigned: true}

  # Return the list of variables declared in this scope.
  vars: ->
    usr = []; tmp = []; asn = []
    for {name, type} of @variables
      if type of <[ var reuse ]>
        (if name.charAt(0) is '_' then tmp else usr).push name
      else if type.assigned
        asn.push name + ' = ' + type.value
    usr.sort().concat tmp.sort(), asn
