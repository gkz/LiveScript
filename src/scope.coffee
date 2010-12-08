# The **Scope** class regulates lexical scoping within Coco. As you
# generate code, you create a tree of scopes in the same shape as the nested
# functions. Each scope knows about the function parameters and the variables
# declared within it, and has references to its parent/shared enclosing scopes.

(exports.Scope = (@parent, @shared) ->
  @variables = [{name: 'arguments', type: 'arguments'}]
  @positions = arguments: 0
  this
):: import
  # Adds a new variable or overrides an existing one.
  add: (name, type) ->
    if name of <[ arguments eval ]>
      throw SyntaxError "redefining \"#{name}\" is deprecated"
    if v = @variables[@positions[name]]
    then v import {type}
    else @positions[name] = -1 + @variables.push {name, type}
    this

  # Declares a variable unless declared already.
  declare: (name) ->
    scope = @shared or this
    scope.add name, 'var' unless scope.type(name) of <[ var param ]>
    this

  # Ensures that an assignment is made at the top of this scope.
  assign: (name, value) -> @add name, {value}

  # If we need to store an intermediate result, find an available name for a
  # compiler-generated variable. `_var`, `_var2`, and so on...
  temporary: (name) ->
    i = 0
    for ever
      temp = '_' + if name.length > 1
      then name + (if i++ then i else '')
      else (i++ + parseInt name, 36).toString 36
      break if @type(temp) of ['reuse', void]
    @add temp, 'var'
    temp

  # Reserves a variable name as a function parameter.
  parameter: -> @add it, 'param'

  # Allows a temporary variable to be reused.
  free     : -> @add it, 'reuse'

  # Checks to see if a variable has already been declared.
  # Walks up the scope if `above` flag is specified.
  check: (name, above) ->
    return found if (found = @positions[name] in @variables) or not above
    !!@parent?.check name, above

  # Gets the type of a variable from name.
  type: -> @variables[@positions[it]]?.type

  # Returns the list of variables declared in this scope.
  vars: ->
    usr = []; tmp = []; asn = []
    for {name, type} of @variables
      if type of <[ var reuse ]>
        (if name.charAt(0) is '_' then tmp else usr).push name
      else if type.value
        asn.push name + ' = ' + type.value
    usr.concat tmp, asn
