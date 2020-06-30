# Can assign a conditional statement.
getX = -> 10

if x = getX() then 100

eq x, 10

x = if getX() then 100

eq x, 100


# _thisprop_ assignment
tester = ->
  @example = ok
  this

eq ok, new tester().example


num = 10
num -= 5
eq num, 5

num *= 10
eq num, 50

num /= 10
eq num, 5

num %= 3
eq num, 2

val = false
val ||= 'value'
val ||= 'eulav'
eq val, 'value'

val &&= 'rehto'
val &&= 'other'
eq val, 'other'

val = null
val ?= 'value'
val ?= 'eulav'
eq val, 'value'


for nonref, i in <[ 0 f() this true ]>
  throws 'invalid assign on line ' + (i+1), ->
    x = if i then nonref else \... + nonref
    LiveScript.compile \\n * i + "[#{x}, y] = z"

compileThrows 'assignment to undeclared "Math"' 1 'Math ||:= 0'

# Power
x = 2
x **= 2
eq 4 x
x ^= 2
eq 16 x

# Concat
a = [1 2 3]
a ++= [4 5]
eq '1,2,3,4,5' String a

a ++= 6
eq '1,2,3,4,5,6' String a

# Pipe
x = 3
x |>= (+ 7)
eq 10 x

# obj ::= obj2 as alias to obj::<<<obj2
lala = ->
lala ::= prop: true

fafa = new lala

ok lala::prop
ok !lala::other

ok fafa.prop
ok !fafa.other

lala ::= other: true

ok lala::other
ok fafa.other

compileThrows 'invalid assign'    1 'f() ?=x'
compileThrows 'invalid accessign' 1 'f()?= x'


# Empty assignments
{} = -> /* will be front and should be wrapped */

eq 1, [] = 1
eq 9, 3 * [] = 2 + 1
eq ok, new []=(-> -> ok)()

i = 0
[{}] = ++i
eq i, 1

{}p   = 0
[{}p] = 1
{}p++
ok 'LHS should take care frontness'

# Compound assign with logic
new
  @a = 2
  @a &&+= 10
  eq 12 @a

  @a = 0
  @a &&+= 10
  eq 0 @a

  @a ?+= 5
  eq 5 @a

  @b ?+= 5
  ok \b not of this

  neg = -> -it
  @a ?|>= neg
  eq -5 @a

  @b ?|>= neg
  ok \b not of this


### Destructuring

# simple variable swapping
a = -1
b = -2
[a, b] = [b, a]
eq a, -2
eq b, -1

eq "#{ do -> [a, b] := [b, a] }", '-1,-2'
eq a, -1
eq b, -2

a = [0 1]
[a, b] = a
eq a, 0
eq b, 1

eq (onetwo = [1, 2]), [a, b] = [c, d] = onetwo
ok a is c is 1 and b is d is 2


# fancy swapping
a = [0 1]; i = 2
[a[--i], a[--i]].=reverse!
eq 1 a.0
eq 0 a.1


# with splats
[x, ...y, z] = [1, 2, 3, 4, 5]
eq x, 1
eq y.length, 3
eq z, 5

[...heads, [head, ...tails], tail] = [1,2,3, [4, 5,6], 7]
eq head, 4
eq tail, 7
eq heads + '', '1,2,3'
eq tails + '', '5,6'


# objects
{a: a, b} = {a: 0, b: 1}
eq a, 0
eq b, 1

{name: a, family: {'elder-brother': {addresses: [one, {city: b}]}}} =
  name  : 'Moe'
  family:
    'elder-brother':
       addresses: [
         'first'
         street: '101 Deercreek Ln.'
         city  : 'Moquasset NY, 10021'
       ]
eq a, 'Moe'
eq b, 'Moquasset NY, 10021'

{person: {address: [ignore, ...addr]}} =
  person:
    address:
      "------"
      "Street 101"
      "Apt 101"
      "City 101"
eq addr.join(', '), 'Street 101, Apt 101, City 101'

a = {\a \b}
{a, b} = a
eq a+b, \ab


# with object shorthand
{name, age, dogs: [first, second]} =
  name: 'Bob'
  age :  26
  dogs: ['Prince', 'Bowie']
eq name   , 'Bob'
eq age    , 26
eq first  , 'Prince'
eq second , 'Bowie'


# on `for`
persons =
  George     : {name: 'Bob'  }
  Bob        : {name: 'Alice'}
  Christopher: {name: 'Stan' }
join1 = ["#{key}: #{name}" for key, {name} of persons]

eq join1.join(' / '), 'George: Bob / Bob: Alice / Christopher: Stan'

persons = [
  {name: 'Bob'  , parent: {name: 'George'     }}
  {name: 'Alice', parent: {name: 'Bob'        }}
  {name: 'Stan' , parent: {name: 'Christopher'}}
]
join2 = ["#{parent}: #{name}" for {name, parent: {name: parent}} in persons]

eq join1.join(' '), join2.join(' ')

persons = [['Bob', ['George']], ['Alice', ['Bob']], ['Stan', ['Christopher']]]
join3 = ["#{parent}: #{name}" for [name, [parent]] in persons]

eq join2.join(' '), join3.join(' ')


[x] = {0: y} = {'0': z} = [Math.random()]
ok x is y is z, 'destructuring in multiple'


# into properties
obj =
  func: (list, object) ->
    [@one, @two] = list
    {@a, @b} = object
    {@a} = object
    null
obj.func [1, 2], a: 'a', b: 'b'
eq obj.one, 1
eq obj.two, 2
eq obj.a, 'a'
eq obj.b, 'b'


x = 'y'
{(x)} = y: 0xc0c0
eq x, 49344


# [coffee#870](https://github.com/jashkenas/coffee-script/issues/870)
[void, null, v] = [1 to 3]
eq v, 3


# [coffee#1108](https://github.com/jashkenas/coffee-script/issues/1108)
[z] = [0] ? [1]
eq 0 z

# [coffee#1188](https://github.com/jashkenas/coffee-script/issues/1188)
coffee1188 = coffee1188 := ok ok


### Accessign
parent = child: str: 'test'

parent.child.str.=replace /./, 'b'
eq 'best', parent.child.str

parent.child.str.='replace' /./, 'r'
parent.=child.valueOf().str
eq 'rest', parent

parent.+=slice 1
eq 'restest', parent

a = b: c: d: \e
a.b.c?.=d
eq \e a.b.c

a.=b <<< {\c}
eq \c a.c

compileThrows 'assignment to undeclared "a"' 1 'a.=b'


### Subdestructuring
a = []
a[0 [] [2]] = [0 1 [2]]
eq a.0, 0
eq a.2, 2

i = 0; j = 2
a[i, j] = a[j, i]
eq '2,,0' ''+a

o = {}; k = \v
o{k, 0, \1, (2), three: 3, (2*2): 4} =
 {k, 0, \1, (2), three: 3, (2*2): 4}
eq o.k, \v
eq o.0, 0
eq o.1, \1
eq o.2, 2
eq o.3, 3
eq o.4, 4

(i = 5; o){(i++), (i++)} = {5 6}
eq o.5, 5
eq o.6, 6

o{a: [7 8], o: {9 \a}} = a: [7 8], o: {9 \a}
eq o.7, 7
eq o.8, 8
eq o.9, 9
eq o.a, \a

o[\b, ...\c, \d] = [0 to 3]
eq o.b, 0
eq o.c+'' '1,2'
eq o.d, 3

a = [0 1]; i = 2
a.reverse![--i, --i].=reverse!
eq 0 a.0
eq 1 a.1

# Splats in object destructuring taking unused keys, as discussed here:
# https://github.com/gkz/LiveScript/issues/941
keys = <[a b c d e f]>
k = (i) -> if delete keys[i] then that else fail "dynamic key was not cached"
t = {}
o = g: 1 b: 2 c:{d: 3 e: 4 b: 5 f: 6} f: 7 a: 8 h: 9
t{g: (k 0), (k 1), (k 2):{(k 3), (k 4), ...h}, (k 5):i, ...j} = o
eq 1 t.a
eq 2 t.b
eq 3 t.d
eq 4 t.e
eq 5 t.h.b
eq 6 t.h.f
eq 7 t.i
eq 8 t.j.a
eq 9 t.j.h
ok not t.c?
ok not t.h.d?
ok not t.j.b?
ok not t.j.g?

### Destructuring Default
new
  [x ? 2, [y] || [3], @p && 5] = [null, false, true]
  eq x * y * @p, 30

  @p = @q = void
  [x = 2, [y] ||= [3], @p &&= 5] = [null, false, true]
  eq x * y * @p, 30

  {a or 2, _: b or 3, @p or 5} = {}
  eq a * b * @p, 30

  @a = @b = @c = void
  @{a ? 2, \b ? 3, d: ([\c]) ? 5} = {}
  eq @a * @b * @c, 30

  @a = @b = @c = void
  @{a = 2, \b = 3, ([\c]) = 5} = {}
  eq @a * @b * @c, 30

  @a = @b = @c = void
  @{a && 2, b || 3} = {a: 99}
  eq @a * @b, 6

  @a = @b = @c = void
  @{a &&= 2, b ||= 3} = {a: 99}
  eq @a * @b, 6

  i = 0
  f = -> ++i
  [@a or {(f!)}] = [false]
  eq @a.1, 1

compile-throws 'invalid assign' 1 'o{...(a) ? b} = c'

### Compound/Conditional Destructuring
a = b = c = null

[a, b] += [2 3]
[b, c] ?= [4 5]
eq '2,3,5' String [a,b,c]

o = d: 0, e: 1
o{d, e} &&*= d: 2, e: 3
eq 0 o.d
eq 3 o.e

# https://github.com/gkz/LiveScript/issues/1096
[{a}?] = [a: 1]
eq 1 a
a = null
[{a}?] = []
eq null a
[[[a]?]?] = []
eq null a


### Named Destructuring
[b, c]:a = [0 1]
eq b, a.0
eq c, a.1

f = ({p, q}: o?) ->
  if o?
    eq p, o.p
    eq q, o.q
  else
    eq p, void
    eq q, void
f {2 3}
f (   )

o = a: {\b \c}
{{b, c}:a, [d]:e ? [{}]} = o
eq a, o.a
eq b, \b
eq c, \c
eq d, e.0

o = {}
p = x: 1
{x: o.a} = p
eq 1 o.a
{y: o.a ? 2} = p
eq 2 o.a

new
  o = a: {b: 1 c: 2}
  @{a: {b: d, c: e}:f} = o
  eq 1 @d
  eq 2 @e
  eq 1 f.b
  eq 2 f.c

  g = b: 3 c: 4
  @{{b: d, c: e}:f ? g} = o
  eq 3 @d
  eq 4 @e
  eq 3 f.b
  eq 4 f.c

  @{{b: d, c: e}:a ? g} = o
  eq 1 @d
  eq 2 @e
  eq 1 a.b
  eq 2 a.c


### Unary Assign
o = {}
eq 1,  -~=o.0
eq false, !=o
eq -0,    -=o
eq 1,  ! += o
eq true, !!=o


## Dash to camel
hello-world = 2
eq hello-world, 2

a = 2
b = 3
aB = 99
eq 1  a-1
eq 1  4-b
eq 99 a-b

obj =
  ha-ha: 2

eq 2 obj.ha-ha
eq 2 obj.haHa

green = 5
eq 4 --green
green--
eq 3 green

eq 6, green-- * a

eq \HELLO 'hello'.to-upper-case!

### Ill-shadow Protection
compileThrows 'accidental shadow of "a"' 4 '''
  a = 1
  let
    a := 2
    a  = 3
'''

## Function redfines iteself
change-me = ->
  change-me := 2
eq \function typeof changeMe
eq 2 changeMe!
eq 2 changeMe

## Error when assigning to reserved LS word
compileThrows 'cannot assign to reserved word \'match\'' 1 '''
  match = 1
'''

# [LiveScript#1027](https://github.com/gkz/LiveScript/issues/1027)
a = [9 9]
i = 0
a[i = 1] = 2
eq ''+a, '9,2'
eq i, 1

a[i += 1] = 3
eq ''+a, '9,2,3'
eq i, 2
