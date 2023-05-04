i = 5
list = while i -= 1
  i * 2
deep-equal [8,6,4,2], list

i = 5
list = [i * 3 while i -= 1]
deep-equal [12,9,6,3] list

i = 5
func   = -> i -= it
assert = -> unless 0 < i < 5 then ok false
results = while func 1
  assert()
  i
deep-equal [4,3,2,1] results

value = false
i = 0
results = until value
  value = true if i is 5
  i += 1

eq 6 i


i = 5
list = []
for ever
  i -= 1
  break if i is 0
  list.push i * 2

deep-equal [8 6 4 2] list

j = 5
list2 = []
loop
  j -= 1
  break if j is 0
  list2.push j * 2

deep-equal [8 6 4 2] list

#759: `if` within `while` condition
[2 while if 1 then 0]


# https://github.com/jashkenas/coffee-script/issues/843
eq void, do -> while 0 then return


# Basic array comprehensions.
nums    = for n in [1, 2, 3] then n * n if n .&. 1
results = [n * 2 for n in nums]

deep-equal [2,18] results

eq 11 [x for x to 10]length


# Basic 'of' comprehensions.
obj   = {one: 1, two: 2, three: 3}
names = [prop + '!' for prop of obj]
odds  = for prop, value of obj then prop + '!' if value .&. 1

deep-equal <[ one! two! three! ]> names
deep-equal <[ one! three! ]> odds


# Object comprehensions
result = {[key, val * 2] for key, val of obj}
deep-equal {one: 2, two: 4, three: 6}, result

result = {[val, key] for key, val of obj}
deep-equal {1: 'one', 2: 'two', 3: 'three'}, result

f = ->
  {[key, val * 2] for key, val of {a:1, b:2}}
obj = f!
deep-equal {a: 2, b: 4} obj

r = {[key, val] for key, val of {a:1, b:2} when val isnt 2}
deep-equal {a: 1} r
ok not r.b?

input =
  a: b: 1, c: 2
  d: e: 3, f: 4
result = { ["#{k1}#{k2}", v] for k1, x of input for k2, v of x }
deep-equal {ab: 1, ac: 2, de: 3, df: 4} result
eq \Object typeof! result

result = [ { ["#{k1}#{k2}", v] for k2, v of x } for k1, x of input ]
deep-equal [ { ab: 1, ac: 2 } { de: 3, df: 4} ] result
eq \Array typeof! result
eq \Object typeof! result.0

result = { ["#k#x", x + v] for x from 0 to 1 for k, v of {a: 1, b: 2} }
deep-equal { a0: 1, a1: 2, b0: 2, b1: 3 } result
eq \Object typeof! result

result = { ["#k#x", x + v] for k, v of {a: 1, b: 2} for x from 0 to 1 }
deep-equal { a0: 1, a1: 2, b0: 2, b1: 3 } result
eq \Object typeof! result

result = { ["#k#x", x] for k in <[ a b ]> for x from 0 to 1 }
deep-equal { a0: 0, a1: 1, b0: 0, b1: 1 } result
eq \Object typeof! result

# obj comp [livescript#639](https://github.com/gkz/LiveScript/issues/639)
i = 0
f = ->
  i++
  true

o = {[k, v] for k, v of {a: 1} when f!}
deep-equal {a: 1} o
eq 1 i

i = 0
{a} = {[k, v] for k, v of {a: 1} when f!}
eq 1 i
eq 1 a

i = 0
o = null
g = -> o := it
g {[k, v] for k, v of {a: 1} when f!}
deep-equal {a: 1} o
eq 1 i

i = 0
a = {[k, v] for k, v of {a: 1} when f!}.a
eq 1 i
eq 1 a

i = 0
g = ->
  {[k, v] for k, v of {a: 1} when f!}
deep-equal {a: 1} g!
eq 1 i

# Basic range comprehensions.
nums = [i * 3 for i from 1 to 3]
negs = [x for x from -14 to -5*2]
four = [4 for x to 3]
deep-equal [3,6,9] nums
deep-equal [-14,-13,-12,-11,-10] negs
deep-equal [4,4,4,4] four

deep-equal [1,2,3], [i for i from 1 til 4     ]
deep-equal [0,3,6], [i for i from 0 til 9 by 3]


# Auto-descend when obvious.
deep-equal [0,-1,-2] [i for i til -3]


# Almost never mess with binary `in`/`of` and variable `by`.
all = from = to = by = 1

for i to 0
  ok 0 of [0]
  ok 0 in [0]
  ok by = true

for by in [1] then by
ok by
for by til 1 then by
ok not by


# With range comprehensions, you can loop in steps.
deep-equal [0 3 6 9] [x for x from 0 to 9 by  3]
deep-equal [9 6 3 0] [x for x from 9 to 0 by -3]
deep-equal [9 6 3 0] [x for x from 3*3 to 0*0 by 0-3]


# Multiline array comprehension with filter.
evens =
  for num in [1, 2, 3, 4, 5, 6] then if num % 2 is 0
    num *= -1
    num -=  2
    num * -1
deep-equal [4 6 8] evens


# Backward traversing.
odds = [num for num in [0, 1, 2, 3, 4, 5] by -2]
deep-equal [5 3 1] odds

# Multiline nested loops result in nested output
eq 9 (for x from 3 to 5
  for y from 3 to 5
    x * y).0.0

multiLiner =
  for x from 3 to 5
    for y from 3 to 5
      x * y

singleLiner = [x * y for y from 3 to 5 for x from 3 to 5]

eq 3 multiLiner.length
eq 9 singleLiner.length

eq 25,  multiLiner[*-1][*-1]
eq 25, singleLiner[*-1]

xs = for x to 5
  for y to 5
    if x is y
      for z to 2
        x + y + z
    else
      for z from 10 to 15
        x + y + z
eq 6 xs.length
eq 6 xs.0.length
eq 3 xs.0.0.length
eq 6 xs.0.1.length

# Nested comprehensions.
comp = ["#x#y" for x in [1 2 3] for y in [\a \b \c]]
deep-equal <[ 1a 1b 1c 2a 2b 2c 3a 3b 3c ]> comp

pythagoreanTriples = [[x,y,z] for x in [1 to 20] for y in [x to 20] for z in [y to 20] when x^2 + y^2 == z^2]
eq "#{ pythagoreanTriples * \_ }", '3,4,5_5,12,13_6,8,10_8,15,17_9,12,15_12,16,20'


# Comprehensions in comprehensions
zs = [[x + y for y til 5] for x til 5]
eq 5 zs.length
eq 8 zs.4.4

obs = [{[x, i + y] for x, i in <[ one two ]>} for y to 5]
eq 6 obs.length
eq 0 obs.0.one
eq 6 obs[*-1].two

# Object comprehension in comprehension, see:
# https://github.com/gkz/LiveScript/issues/538
obs = [{[key + i, val] for key, val of obj} for obj, i in [{+a, +b}, {-a, -b}]]
deep-equal [{a0: true, b0: true},  {a1: false, b1: false}] obs
ok typeof! obs[0] is \Object

# Object and list comprehensions in the same scope should not share an empty value:
# https://github.com/gkz/LiveScript/issues/294
using-if = -> if it
  {[key, value] for key, value of {a:1}}
else
  [value for value in [1]]

deep-equal {a:1} using-if true
eq \Object typeof! using-if true
deep-equal [1] using-if false
eq \Array  typeof! using-if false

using-switch = -> switch it
| true  => {[key, value] for key, value of {}}
| false => [value for value in []]

eq \Object typeof! using-switch true
eq \Array  typeof! using-switch false

# super nested comprehensions
crazy = [{[y, [{[k + y, x + 1] for k, v of {a: 1}} for x from 1 to 2]] for y in <[ x y ]>} for z to 1]
deep-equal [
    * x: [{ax: 2}, {ax: 3}]
      y: [{ay: 2}, {ay: 3}]
    * x: [{ax: 2}, {ax: 3}]
      y: [{ay: 2}, {ay: 3}]
], crazy

# Comprehensions returned
xs = do -> [[x + y for x to 1] for y to 1]
deep-equal [[0 1], [1 2]] xs
eq 2 xs.length
eq 2 xs.1.length

ys = let
  for y to 1
    for x to 1
      x
eq 2 ys.length
eq 2 ys.1.length

zs = do -> [x + y for x to 1 for y to 1]
eq 4 zs.length
deep-equal [0,1,1,2] zs

# Comprehensions with cascade
deep-equal [3,4,5] [.. + 2 for [1 2 3]]
deep-equal [3,5]   [.. + 2 for [1 2 3] when .. % 2 isnt 0]
deep-equal [5,4,3] [.. + 2 for [1 2 3] by -1]
deep-equal [5,3]   [.. + 2 for [1 2 3] by -1 when .. % 2 isnt 0]
deep-equal [3,4,5] [.. + 2 for from 1 to 3]
deep-equal [3,5]   [.. + 2 for from 1 to 3 when .. % 2 isnt 0]
deep-equal [5,4,3] [.. + 2 for from 3 to 1 by -1]
deep-equal [5,3]   [.. + 2 for from 3 to 1 by -1 when .. % 2 isnt 0]

# gkz/LiveScript#854
deep-equal [2,3,4,5] [.. + 2 for [to 3]]

list-of-obj =
  * ha: 1
    mo: 8
  * ha: 4
    la: 2

deep-equal [1,4] [..ha for list-of-obj]

ys = [\A to \D] ++ [\H to \K] ++ [\Z]
deep-equal <[ A B C D H I J K Z ]> [.. for [\A to \Z] when .. in ys]

# Cascade comprehension doesn't prevent from using `in` later
[.. for [0]]
ok 0 in [0]

# Comprehensions in loops
xs = for x to 5
  [x + y for y to 5]
eq 6 xs.length
eq 10 xs[*-1][*-1]

xs = for x to 5
  if x % 2 is 0
    [x + y for y to 2]
  else
    [x + y for y to 5]
eq 6 xs.length
eq 6 xs[*-2][*-1]
eq 10 xs[*-1][*-1]

xs = for x to 5
  if x % 2 is 0
    w = [x + y for y to 2]
    w
  else
    v = [x + y for y to 5]
    v
eq 6 xs.length
eq 6 xs[*-2][*-1]
eq 10 xs[*-1][*-1]

xs = for i to 5
  while 0 => while 0 =>
  i

deep-equal [0,1,2,3,4,5] xs

xs = for x to 3
  [y] = [z for z from 1 to 2]
  y + x
deep-equal [1 2 3 4] xs


# Multiline comprehensions
res = [x + y for x to 4
             for y to 3]
eq 7 res[*-1]

res = [x + y for x to 4
             for y to 3
]
eq 7 res[*-1]

res = [x + y + z for x to 4
                 for y to 3
                 for z to 2]
eq 9 res[*-1]
res = [x + y + z for x to 4
                 for y to 3
                 for z to 2
]
eq 9 res[*-1]

res = [(
  a = 1
  b = a + 2
  a + b + x + y + z
  ) for x to 4
    for y to 3
    for z to 2]
eq 13 res[*-1]

# Comprehensions within parentheses.
result = null
store = -> result := it
store [x * 2 for x in [3, 2, 1]]

ok result.join(' ') is '6 4 2'


# Closure-wrapped comprehensions that refer to the "arguments" object.
expr = ->
  result = [item * item for item in arguments]

ok expr(2, 4, 8).join(' ') is '4 16 64'


# Fast object comprehensions over all properties, including prototypal ones.
class Cat
  -> @name = 'Whiskers'
  breed: 'tabby'
  hair:  'cream'

whiskers = new Cat
own = [value for own key, value of whiskers]
all = [value for key, value of whiskers]

ok own.join(' ') is 'Whiskers'
ok all.sort().join(' ') is 'Whiskers cream tabby'


f = -> [-> ok false, 'should cache source']
for k of [f] = f() then ok true


# Allow non-last lines to have `continue` or `break`.
func = ->
  for i from 1 to 2
    break if i is 2
    for j in [3] then i * j
eq func!0.0, 3

i = 6
odds = while i--
  continue unless i .&. 1
  i
deep-equal [5,3,1], odds

r = for i from 0 to 2
  switch i
  case 0 then continue
  case 1 then i
  default break
deep-equal [1], r

eq (while 1 then break; 1).length, 0


copy = {}
for k, copy[k] of [4, 2] then continue
eq copy.0 * copy.1, 8


new -> do ~>
  me = this
  [] = for ever
    eq me, this
    eq me, do ~> this
    break
    1


compileThrows 'stray break'    1 \break
compileThrows 'stray continue' 1 \continue


# Play nice with implicit calls.
ok true, while 0 then
ok [] = for i to 0 then

for i from Number 2 to Number 3 by Number 4 then void
eq 2 i

let i, j = i
  eq ...for k to 1 then i

# Non-variable assignees.
o = i: 0, count: -> @i++

for o.p, i in [0] then eq o.p, +i
for i, o.p of [0] then eq o.p, +i

for o.count!_ in [1 2] then continue
eq o.i, 2

for, o.count!_ of [1 2] then continue
eq o.i, 4


# [#195](https://github.com/satyr/coco/issues/195)
for [0]
  ok 0 of {0}
  for [1] then ok 1 in [1]
  for [2] =>   ok 2 in [2]
  ok 3 not of []


### Line folding before/after `for` prepositions
for x
of   {2}
  for y
  in [3]
    for z
    from
      5
    to
      7 by
      11
      eq x*y*z, 30


### Function Plucking
# Function literals in loops are defined outside.
them = []
until them.1 then them.push(->)
eq ...them

them = []
until them.1 then them.push((x, y) --> x + y)
eq 5 them.1(2) 3


### Post-`for` chains
eq "#{
  [a * b * c * d         \
  for a of {1}          \
  for b in [2]          \
  for c in [3, 4] by -1 \
  for d from 5 to 6     \
  for _ of {7}]
}", '40,48,30,36'


### Anaphoric
while 1
  for ever => break
  eq that, 1
  break


### Destructuring `for`-`of`
r = 0
for [a, b] i in [[2 3] [5 7]] then r += a * b * i
for {a, b} i in [{\a \b}] then r += a + b + i
eq r, '35ab0'


### Post condition
i = 0
do
  do
    ++i
  until true
while ++i < 2
eq i, 2

(-> deep-equal [4,2,0] it) do
  i * 2
while i--


### Post condition with when
i = 0
list = [1 to 5]
do
  list[i] = list[i] + 1
until ++i > 3 when i isnt 2
deep-equal [2,3,3,5,5], list

i = 0
list = [1 to 5]
do
  list[i] = list[i] + 1
while ++i < 3 when i isnt 2
deep-equal [2,3,3,4,5], list


### Update clause
i = 0; evens = [i while i < 9, i += 2]
deep-equal [0,2,4,6,8] evens

i = 1; odds = until i > 9, ++i
  continue unless i .&. 1
  i
deep-equal [1,3,5,7,9] odds

a = [1 2 3]
b = []
while a.pop(), b.push that => continue
deep-equal [3,2,1] b


### `else` clause
for cond in [true false]
  while cond
    break
  else
    ok not cond

r = for i from 0 to 9
  while i .&. 1
    break
  else if i .&. 2
    i

deep-equal [[],[],[2],[],[],[],[6],[],[],[]] r

r = for i til 1 then i else [9]
eq 0 r.0

r = for i til 0 then i else [9]
eq 9 r.0

### Omission of `for`'s first assignment
for    , i in [0] => eq i, 0
for    , v of {1} => eq v, 1
for own, v of {2} => eq v, 2

### When
evens = [x for x from 1 to 10 | x % 2 is 0]
eq 5 evens.length
eq 4 evens.1

for x in <[ amy bibs ashley charlie danny alex ]> when x.charAt(0) is \a
  ok x in <[ amy ashley alex ]>

while i < evens.length, ++i when evens[i] * 2 is 8
  eq 4 evens[i]

eq '1 3 7 9' [y for y from 1 to 10 when y isnt 5 by 2].join ' '

### No vars at all
i = 0
f = -> i++

for til 2 then f!
eq 2 i

i = 0
for from 2 to 5 then f!
eq 4 i

i = 0
eq '0 1 2 3' [f! for til 4].join ' '

i = 0
eq '2 4 6' [f! for til 4 when f!].join ' '

x = []
for <[one two three]> by -1 then x.push ..
eq 'three two one' x.join ' '

x = [.. for <[one two three]> by -1]
eq 'three two one' x.join ' '

# index var outside loop
for v, k in [1]
  void
ok v
ok not k

# for-let
i = v = 7
for let v, k in [0]
  ok true
for let k, v of {a: \b}
  ok true
ok 7 is i is v

fns = for let <[foo bar]>
  for let x in [6 7 8 9] when x % 2 == 0
      -> .. + x
eq \foo6 fns.0.0!
eq \bar8 fns.1.1!

xs = for let x, i in [1 to 10] by 2 when x % 3 == 0
  -> i + x
eq 5, xs[0]!
eq 17, xs[1]!

xs = for own let key, value of {a: 1, b: 2, c: 3, d: 4} when value % 2 == 0
  -> key + value
eq 'b2', xs[0]!
eq 'd4', xs[1]!

arr = [1,3,5,7]
o = for let i in (if true => arr else arr) => i
eq "1,3,5,7", o.join ','

i = 0
inc = ->
  i += 1
  [1 3 5]
o = for let x in inc() => x
eq "1,3,5", o.join ','
eq 1, i

o = { [k, -> v] for let k, v of {a: 1, b: 2} }
eq 1 o.a!
eq 2 o.b!

# interactions of guards+let, see #992
arr = [0,1,2,3]
r = []
for let k in arr when k
  r.push k
eq "1,2,3", r.join ','

# interaction of guards+let, when destructuring is used, see #992
arr =
  * letter: 'a' valueOf: -> 0
  * letter: 'b' valueOf: -> 1
  * letter: 'c' valueOf: -> 2
r = []
for let {letter}:guard-o in arr when guard-o > 0
  r.push letter
eq "b,c", r.join ','

r = []
for let {letter, valueOf} in arr when valueOf! > 0
  r.push letter
eq "b,c", r.join ','

# more of the above, with extra nesting and complications
arr =
  * [true  {b: \alpha x: 0} {d: 1}]
  * [false {b: \bravo}      {d: 2}]
  * [true  {}               {d: 3}]
  * [true  {b: \delta}      {d: 0}]
  * [true  {b: false}       {d: 5}]
fns = for let [a, {b ? \default}:c, {d: e}] in arr when a and b and e
  -> {b, c, e}
r = for f in fns then f!
expected =
  * b: \alpha c: {b: \alpha x: 0} e: 1
  * b: \default c: {} e: 3
deep-equal expected, r

# Unreported for-let regression
arr =
  * x: 6 y: 7
  * x: 8 y: 9
o = x: \x y: \y
i = 0
f = -> i++; o
fns = for let {(f!x), (f!y)} in arr
  t = o{x, y}
  o.x = \x
  o.y = \y
  -> t
r = for f in fns then f!
deep-equal arr, r
eq 4 i

# Certain literals could result in illegal JavaScript if not carefully
# handled. These are all nonsensical use cases and could just as easily
# be LiveScript syntax errors. The thing to avoid is for them to be JavaScript
# syntax errors; lsc should never produce illegal JavaScript on any input,
# silly or otherwise.
deep-equal [] [0 for x in 42]
deep-equal [] [0 for x in -42]
throws "Cannot read properties of null (reading 'length')" -> [0 for x in null]
throws "Cannot read properties of undefined (reading 'length')" -> [0 for x in void]

# [LiveScript#1035](https://github.com/gkz/LiveScript/issues/1035)
for [1 2 3] then 1 else 0

# [LiveScript#1039](https://github.com/gkz/LiveScript/issues/1039)
arr = [3 2 1 0]
x = for arr case .. in [1 2] => 1
eq '1,1' x.join \,

v = 1
b = [1]
x = for arr | v in b => 1
eq '1,1,1,1' x.join \,

x = [1 for arr case .. in [1 2]]
eq '1,1' x.join \,
