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
eq z.value, void
eq z.done, true

# function declaration generator
function* f
  yield 0
  yield 1
  yield 2

y = f!
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
eq z.value, void
eq z.done, true

# yield from
first = ->*
  i = 0
  loop => yield i++
second = ->*
  yield from first!
list = second!
for i to 3 
  {value} = list.next!
  eq value, i

# curried bound generators
class A
  val: 5
  curried: (x, y) ~~>*
    yield @val + x + y
fn = (new A).curried
yield-add = fn 2
y = yield-add 3
z = y.next!
eq z.value, 10
eq z.done, false
z = y.next!
eq z.value, void
eq z.done, true

# bound generator
obj =
  bound: ->
    do ~>*
      yield this
  unbound: ->
    do ->*
      yield this

eq obj, obj.bound().next().value
ok obj isnt obj.unbound().next().value
