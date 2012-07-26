ok not mySpecialVariable?

mySpecialVariable = false

ok mySpecialVariable?


# Existential assignment.
a = null
a ?= 10
eq a, 10


# Binary form.
z = null
eq 1, z ? 1


# Evaluate only once.
i = 9
func = -> i += 1
result = func() ? 101
eq 10, result
eq 10, i

counter = 0
getNextNode = ->
  throw "up" if counter
  counter++
eq true, getNextNode()?


# Existence chains, soaking up undefined properties.
obj =
  prop: "hello"

eq obj?.prop, "hello"
eq obj?.'prop', "hello"
eq obj.prop?.length, 5
eq obj?.prop?.'length', 5
eq void,
  obj? .prop?. nonexistent? .property


# Soak and cache method calls as well.
arr = ["--", "----"]

eq arr.pop()?.length, 4
eq arr.pop()?.length, 2
eq arr.pop()?.length, void
eq arr.pop()?.length?.non?.existent()?.property, void


# Soak method calls safely.
value = null
eq value?.toString().toLowerCase(), void

value = 10
eq value?.toString().toLowerCase(), '10'

eq ''.nothing?.property() || 101, 101

counter = 0
func = ->
  counter += 1
  'prop'
obj =
  prop : -> this
  value: 5

eq 5, obj[func()]()[func()]()[func()]()?.value
eq 3, counter


ident = (obj) -> obj
eq ident(non?.existent().method()), void, 'soaks inner values'


# Soak constructor invocations.
a = 0
class Foo
  -> a += 1
  bar: "bat"

eq (new Foo())?.bar, 'bat'
eq a, 1


ok not value?.property?, 'safely checks existence true soaks'


eq nothing?.value, void, 'safely calls values false of non-existent variables'
eq !nothing?.value && 1, 1,  'corresponding operators work as expected'


# Assign to the result of an exsitential operation with a minus.
eq null ? - 1, -1


# Things that compile to ternaries should force parentheses, like operators do.
duration = if options?.animated then 150 else 0
eq duration, 0


### Soak Call
plus1 = (x) -> x + 1
count = 0
obj = {
  counter: -> count += 1; this
  returnThis: -> this
}

eq plus1?(41), 42
eq (plus1? 41), 42
eq plus2?(41), void
eq (plus2? 41), void
eq obj.returnThis?(), obj
eq obj.returnSelf?(), void
eq obj.returnThis?().flag = true, true
eq obj.returnSelf?().flag = true, void
eq obj.counter().counter().returnThis?(), obj
eq count, 2

maybe_close = (f, arg) -> if typeof f is 'function' then -> f(arg) else -1

eq maybe_close(plus1, 41)?(), 42
eq (maybe_close plus1, 41)?(), 42
eq (maybe_close 'string', 41)?(), void

eq JSON?(3), void
eq new Number?(42) .|. 0, 42
eq new Bumper?(42) .|. 0, 0


# [coffee#726](https://github.com/jashkenas/coffee-script/issues/726)
eq calendar?.(Date()), void


# [coffee#733](https://github.com/jashkenas/coffee-script/issues/733)
a = b: {c: null}
eq a.b?.c?(), void

a.b?.c ||= (it) -> it
eq a.b?.c?(1), 1
eq a.b?.c?(...[2, 3]), 2


# [coffee#756](https://github.com/jashkenas/coffee-script/issues/756)
a = null
ok isNaN a?.b.c +  1
eq void, a?.b.c += 1
eq void, ++a?.b.c
eq void, delete a?.b.c

a = b: {c: 0}
eq 1, a?.b.c +  1
eq 1, a?.b.c += 1
eq 2, ++a?.b.c
eq 2, delete a?.b.c


eq (1 or 0)?, true, 'postfix `?` should unwrap correctly'


# [coffee#1424](https://github.com/jashkenas/coffee-script/issues/1424)
A = -> ok
eq ok, new A?
eq ok, do  A?

A = null
eq void new A?
eq void do  A?


# [coffee#1513](https://github.com/jashkenas/coffee-script/issues/1513)
{}frontness?


### Soak Assign
a = [0 null]

b? = a.0
b? = a.1
eq b, 0

let [x, y?]? = a, {z}? = a.1
  eq x, 0
  eq y, void
  eq z, void
