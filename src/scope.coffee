# The **Scope** class regulates lexical scoping within Coco. As you
# generate code, you create a tree of scopes in the same shape as the nested
# functions. Each scope knows about the function parameters and the # variables
# declared within it, and has a reference to its parent enclosing scope.

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
    if v = @variables[@positions[name]]
      if 'function' of [type, v.type]
        throw SyntaxError "redeclaration of \"#{name}\""
      v import {type}
    else
      @positions[name] = -1 + @variables.push {name, type}
    this

  # Declare a variable unless declared already.
  declare: (name) ->
    scope = @shared or this
    scope.add name, 'var' unless scope.type(name) of <[ var param ]>
    this

  # Ensure that an assignment is made at the top of this scope
  assign: (name, value) -> @add name, {value, assigned: true}

  # If we need to store an intermediate result, find an available name for a
  # compiler-generated variable. `_var`, `_var2`, and so on...
  temporary: (name) ->
    i = 0
    continue until @type(temp = @pickTemp name, i++) of ['reuse', void]
    @add temp, 'var'
    temp

  # Reserve a variable name as a function parameter.
  parameter: -> @add it, 'param'

  # Allow a temporary variable to be reused.
  free     : -> @add it, 'reuse'

  # Just check to see if a variable has already been declared.
  # Walks up the scope if `above` flag is specified.
  check: (name, above) ->
    return found if (found = @positions[name] in @variables) or not above
    !!@parent?.check name, above

  # Generate a temporary variable name at the given index.
  pickTemp: (name, index) ->
    '_' + if name.length > 1
    then name + (if index > 1 then index else '')
    else (index + parseInt name, 36).toString(36).replace /\d/g, 'a'

  # Gets the type of a variable.
  type: (name) -> @variables[@positions[name]]?.type

  # Return the list of variables declared in this scope.
  vars: ->
    usr = []; tmp = []; asn = []
    for {name, type} of @variables
      if type of <[ var reuse ]>
        (if name.charAt(0) is '_' then tmp else usr).push name
      else if type.assigned
        asn.push name + ' = ' + type.value
    usr.sort().concat tmp.sort(), asn.sort()
