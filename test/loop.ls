{flatten} = require 'prelude-ls'

i = 5
list = while i -= 1
  i * 2
eq '' + list, '8,6,4,2'

i = 5
list = [i * 3 while i -= 1]
eq '' + list, '12,9,6,3'

i = 5
func   = -> i -= it
assert = -> unless 0 < i < 5 then ok false
results = while func 1
  assert()
  i
eq '' + results, '4,3,2,1'

value = false
i = 0
results = until value
  value = true if i is 5
  i += 1

ok i is 6


i = 5
list = []
for ever
  i -= 1
  break if i is 0
  list.push i * 2

ok list.join(' ') is '8 6 4 2'

j = 5
list2 = []
loop
  j -= 1
  break if j is 0
  list2.push j * 2

ok list2.join(' ') is '8 6 4 2'

#759: `if` within `while` condition
[2 while if 1 then 0]


# https://github.com/jashkenas/coffee-script/issues/843
eq void, do -> while 0 then return


# Basic array comprehensions.
nums    = for n in [1, 2, 3] then n * n if n .&. 1
results = [n * 2 for n in nums]

eq results + '', '2,18'

eq 11 [x for x to 10]length


# Basic 'of' comprehensions.
obj   = {one: 1, two: 2, three: 3}
names = [prop + '!' for prop of obj]
odds  = for prop, value of obj then prop + '!' if value .&. 1

eq names.join(' '), 'one! two! three!'
eq odds. join(' '), 'one! three!'


# Object comprehensions
result = {[key, val * 2] for key, val of obj}
eq 2 result.one
eq 4 result.two
eq 6 result.three

result = {[val, key] for key, val of obj}
eq \one   result.1
eq \two   result.2
eq \three result.3

f = ->
  {[key, val * 2] for key, val of {a:1, b:2}}
obj = f!
eq 2 obj.a
eq 4 obj.b

r = {[key, val] for key, val of {a:1, b:2} when val isnt 2}
eq 1 r.a
ok not r.b?


# Basic range comprehensions.
nums = [i * 3 for i from 1 to 3]
negs = [x for x from -20 to -5*2]
four = [4 for x to 3]
eq '3,6,9,-20,-19,-18,4,4,4,4', '' + nums.concat negs.slice(0, 3), four

eq '123', [i for i from 1 til 4     ].join ''
eq '036', [i for i from 0 til 9 by 3].join ''


# Auto-descend when obvious.
eq '0,-1,-2' String [i for i til -3]


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
eq "#{ [x for x from 0 to 9 by  3] }", '0,3,6,9'
eq "#{ [x for x from 9 to 0 by -3] }", '9,6,3,0'
eq "#{ [x for x from 3*3 to 0*0 by 0-3] }", '9,6,3,0'


# Multiline array comprehension with filter.
evens =
  for num in [1, 2, 3, 4, 5, 6] then if num % 2 is 0
    num *= -1
    num -=  2
    num * -1
eq evens + '', '4,6,8'


# Backward traversing.
odds = [num for num in [0, 1, 2, 3, 4, 5] by -2]
eq odds + '', '5,3,1'

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
eq "#comp", '1a,1b,1c,2a,2b,2c,3a,3b,3c'

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
obs = [{[key, val] for key, val of obj} for obj in [{+a, +b}, {+a, +b}]]
ok typeof! obs[0] is \Object


# Comprehensions returned

xs = do -> [[x for x to 1] for y to 1]
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
eq '0,1,1,2' String zs

# Comprehensions with cascade
eq '3,4,5' String [.. + 2 for [1 2 3]]
eq '3,5'   String [.. + 2 for [1 2 3] when .. % 2 isnt 0]
eq '5,4,3' String [.. + 2 for [1 2 3] by -1]
eq '5,3'   String [.. + 2 for [1 2 3] by -1 when .. % 2 isnt 0]

list-of-obj =
  * ha: 1
    mo: 8
  * ha: 4
    la: 2

eq '1,4' String [..ha for list-of-obj]

ys = [\A to \D] ++ [\H to \K] ++ [\Z]
eq 'A,B,C,D,H,I,J,K,Z' String [.. for [\A to \Z] when .. in ys]

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

xs = for i to 9
  while 0 => while 0 =>
  i

eq 0 xs.0

xs = for x to 1
  [y] = [z for z from 1 to 2]
  y
eq 2 xs.length
eq 1 xs.0
eq 1 xs.1


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
eq '5,3,1', '' + odds

r = for i from 0 to 2
  switch i
  case 0 then continue
  case 1 then i
  default break
eq r + '', '1'

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

(-> eq '4,2,0' ''+it) do
  i * 2
while i--


### Post condition with when
i = 0
list = [1 to 5]
do
  list[i] = list[i] + 1
until ++i > 3 when i isnt 2
eq '2,3,3,5,5', ''+list

i = 0
list = [1 to 5]
do
  list[i] = list[i] + 1
while ++i < 3 when i isnt 2
eq '2,3,3,4,5', ''+list


### Update clause
i = 0; evens = [i while i < 9, i += 2]
eq '0,2,4,6,8' ''+evens

i = 1; odds = until i > 9, ++i
  continue unless i .&. 1
  i
eq '1,3,5,7,9' ''+odds

a = [1 2 3]
b = []
while a.pop(), b.push that => continue
eq '3,2,1' ''+b


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

eq '2,6' flatten(r).to-string!

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
