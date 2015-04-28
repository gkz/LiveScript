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

# yield as expression, yield precendence
f1 = ->*
    x = yield "foo"
    yield x + 2
g1 = f1!
eq "foo" g1.next!.value
eq 5 g1.next(3).value

# generator returns
f2 = ->*
    yield 1
    2
g2 = f2!
eq 1 g2.next!.value
eq 2 g2.next!.value

# backcall
test-val = 0
do
    f3 = (gen) ->
        g3 = gen!
        test-val := g3.next!.value

    *<- f3
    yield 1
eq 1 test-val

# don't spread
f4 = ->*
    yield [1, 2]
g4 = f4!
deep-equal [1, 2] g4.next!.value

# parens, consumer yield
f5 = ->*
    if (yield) and not (yield)
        ok true
    else
        ok false
g5 = f5!
g5.next!
g5.next true
g5.next false

# calling a yield
is-two = -> it == 2
f6 = ->*
    is-two yield 1
g6 = f6!
eq 1 g6.next(2).value

# in switch
f7 = (x) ->*
    y = switch x
    | true => yield 1
    | _    => yield 2
    y
g7 = f7 true
eq 1 g7.next!.value
