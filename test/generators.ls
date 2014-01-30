# Generators
# -----------------
#
# * Generator Definition

# generator as argument
ok ->* 1

# named generator function
ok <| :fn ->* 2

# generator definition
x = ->*
  yield 0
  yield 1
  yield 2

# YIELD FROM ?
y = x!
z = y.next!
eq z.value, 0
eq z.done, false
z = y.next!
eq z.value, 1
eq z.done, false
z = y.next!
eq z.value, 2
eq z.done, false
z = y.next!
eq z.value, undefined
eq z.done, true

# function* ?

# bound generator
obj =
  bound: ->
    do ~>*
      return this
  unbound: ->
    do ->*
      return this

eq obj, obj.bound().next().value
ok obj isnt obj.unbound().next().value