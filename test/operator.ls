{filter, even, map, fold} = require 'prelude-ls'

# Newline suppression for binary operators.
eq 32,
  1 *
  2 +
  3 -
  4 .<<.
  5

if  false
or  true
and null
?   true
  eq 3 1
     .&. 2
     .|. 3
else ok 0 'leading logical/bitwise operators should continue lines'


# Chained Comparisons
ok 500 > 50 > 5 > -5

ok 0 is 0 is not 50 is 50

ok 10 < 20 > 10

ok 50 > 10 > 5 is parseInt('5', 10)

eq 1, 1 .|. 2 < 3 < 4

ok 1 == 1 <= 1, '`x == y <= z` should become `x == y && y <= z`'

i = 0
ok 1 > i++ < 1, 'chained operations should evaluate each value only once'

# [coffee#891](https://github.com/jashkenas/coffee-script/issues/891)
eq 1, (1 unless 1 < 0 == 0)


# (In)equality
a = 1
b = '1'
ok a ~= b
ok not a !~= b
ok not (a == b)
ok not (a is  b)
ok a !=  b
ok a is not b
ok a isnt b

ok true is     true
ok true is not false
ok true isnt false


# `and`/`or` closes implicit calls,
eq('1', String 0 and String 1)
eq('0', String 0 or  String 1)
# unless it's inside block.
eq 3, if 0 or 1 then 2 and 3


ok 'a' of obj = a: true
ok 'b' not of obj, 'allow `x not of y`'


ok new String instanceof String
ok new Number not instanceof String, 'allow `x not instanceof Y`'

eq true, []    instanceof [String, Number and Array]
eq true, 0 not instanceof [String, Array  or Number]


eq true, 2 in [0 or 1, 2, 3]
eq true, 2 in array = [1, 2, 3]
eq true, 4 not in array
eq true, 1 not in []
eq true, [3]pop() in [0, ...array]
eq true, [4]pop() in [...array, 4]

eq 1, +( 0 in [0])
eq 0, +(10 in [ ])

ok array[0]++ in [0, 1] 'should cache testee'

a = [1 2 3]
ok not ("2" in a)
ok not ("2" in [1 2 3])

# Non-spaced values still work.
x = 10
y = -5
eq x-9, 1
eq y+9, 4
eq x*-y, 50
eq x*+y, -50


# Conditional assignments.
one = 1
two = 0
one || = 2
two || = 2

eq one, 1
eq two, 2

zero = 0
zero &&= 'one'
one  &&= 'one'

eq zero, 0
eq one , 'one'

n  ?= void
n  ?= true
eq n, true


# does not work in REPL if not on first line
never-used-before ?= 3

eq never-used-before, 3


# Conditional assignments should be careful about caching variables.
count = 0
list = []

list[++count] ||= 1
eq list[1], 1
eq count, 1

list[++count] ?= 2
eq list[2], 2
eq count, 2

list[count++] &&= 'two'
eq list[2], 'two'
eq count, 3

base = -> ++count; base

base().four ||= 4
eq base.four, 4
eq count, 4

base().five ?= 5
eq base.five, 5
eq count, 5

# Ensure that RHS is treated as a group.
a = b = false
a &&= b or true
eq a, false

# Conditional assignments with implicit objects.
obj = void
obj ?= one: 1
eq obj.one, 1

obj &&=
  two: 2

ok not obj.one
eq obj.two, 2


# Compound assignment as a sub expression.
[a, b, c] = [1, 2, 3]
eq (a + b += c), 6
eq a, 1
eq b, 5
eq c, 3


# Bitwise operators:
eq (10 .&.   3), 2
eq (10 .|.   3), 11
eq (10 .^.   3), 9
eq (10 .<<.  3), 80
eq (10 .>>.  3), 1
eq (10 .>>>. 3), 1

num = 10; eq (num .<<.=  3), 80
num = 10; eq (num .>>.=  3), 1
num = 10; eq (num .>>>.= 3), 1
num = 10; eq (num .&.=   3), 2
num = 10; eq (num .^.=   3), 9
num = 10; eq (num .|.=   3), 11

# [coffee#737](https://github.com/jashkenas/coffee-script/issues/737)
eq 1, 1 in [1] && 1

# [coffee#768](https://github.com/jashkenas/coffee-script/issues/768)
share = 0
a = -> share++ if share is 0
b = -> share++ if share is 1
c = -> share++ if share is 2
ok a() not in [b(),c()] and share is 3


# Operators should respect new lines as spaced.
a = (123) +
456
eq a, 579

a = "1#{2}3" +
"456"
eq a, '123456'


# [coffee#2506](https://github.com/jashkenas/coffee-script/issues/2506)
a = 0
eq false, false && a ||= 1
eq a, 0


### Unary `+`/`-`
eq  0, +[]
eq -1, -true

# Should space themselves when repeated.
eq(+ +1, - -1)
eq (-1), - --[2]0


### `throw`
throws 'up' -> throw Error 'up'

# from anywhere.
try [throw 0] catch
  eq e, 0

# `null` when empty.
try throw catch
  eq e, null


### `do`
eq '', do do do -> -> -> do String
eq 1, do -> 1
eq @, do ~> @

eq 1, do then 0; 1
eq 3, do
  2
  3

a = Array do
  a: 0, b: 1
  2, 3
eq 1, a.0.b
eq 3, a.2

fn = null
eq void fn? do then 4;5


### `import`
x = 'xx'
o = (-> {} import {42, '', x, @X, (x), ...([0])}).call {X: 'XX'}
eq o[42], 42
eq o[''], ''
eq o.x, 'xx'
eq o.X, 'XX'
eq o.xx, 'xx'
eq o[0], 0

o import all new class then deep: 'copy'
eq o.deep, 'copy'

o import all: \base
eq o.all, \base

i = 0
++i import {}
eq i, 1

x = {}; a = 0; b = 1; c = null; i = 0
x <<< {a || 1, b && 2, c ? 3, (i++) or 4}
eq x.a, 1
eq x.b, 2
eq x.c, 3
eq x.0, 4

eq ',1,2,3' "#{ [] <<< [void 1 2 3] }"
eq ',1,2,3' "#{ [] <<< (^^{0}<<<{1}) <<<< (^^{2}<<<{3}) }"

eq '''
({
  a: a,
  b: b,
  c: c
});
''', LiveScript.compile '{a}<<<{b}<<<{c}', {+bare,-header}

ok ok.isPrototypeOf new []= (->) <<< prototype: ok

f = ->
  import it
<<< new: -> new this it
o = f.new {2, 3}
eq o.2 * o.3, 6

o = q = null
eq o?p <<< q?r, void

o = p: {}
eq o?p <<< q?r, o.p

q = r: s: \t
o?p <<< q?r
eq o.p.s, \t

o = null
eq o? <<< {4}, void

o = {}
eq o? <<< {4}, o
eq 4 o.4

# Declaration Form
new
  import life: 2, (universe: 3)
  import all
    everything: 7
    new class then answer: 42
  eq @life * @universe * @everything, @answer


### {in,de}crement
a = [0]
ok ++a.0

# Don't confuse with concat op
f = -> it
x = 4
eq 5, f ++x

# Can be spaced.
eq(-- a[0], a[0] ++)
eq 1 a.0

# Infix after postcrement.
eq a.0++ *  2, 2
eq a.0-- /  2, 1
ok a.0++ != 2

compileThrows 'increment of undeclared "C"' 1 'C++'
compileThrows 'invalid decrement'           1 'q.=p--'


### `delete`
i = 0
O = ->
  switch ++i
  case 1 then {7}
  case 2 then new String 7
  default ok 0, 'returning delete should cache correctly'
eq delete (o = new O)[new O], 7
eq o[7], void

compileThrows 'invalid delete' 1 'delete a'
compileThrows 'invalid delete' 1 'delete a.=b'

# [#273](https://github.com/gkz/LiveScript/issues/273)
a = b = ^^{0} <<< [1]
a = delete a.0
eq 1 a
eq 0 b.0

### `jsdelete`

x =
    a: 1

ok delete! x.1
ok not delete! Math.PI


### [[Class]] sniffing
eq \RegExp typeof! /^/


### Pow
eq -256, -2**2**3  # -((2)**(2**3))
eq -256, -2^2^3
eq 17, 1+2*2**3  # 1+(2*(2**3))
eq 32, 2*4**2
eq 32, 2*4^2

a = [2]; i = 0
a[i++] **= 3
eq a.0, 8


### Min/Max
eq 0, 0 <? 0
eq 1, 1 >? 1
eq 2, 2 <? 3
eq 3, 4 <? 3
eq 4, 3 >? 4
eq 5, 5 >? 4

eq \a, \a <? \b
eq \b, \a >? \b

u = 42
eq u, u*1 <? u+2 <? u*3
eq u, u*1 >? u-2 >? u/3

u <?= 9
u >?= 0
eq 9, u

eq 99, u >?= 33*3
eq 99, u <?= 33*4
eq 99, u

o = a: 9, b: 0
eq 5, o.a <?= o.b >?= 5
ok o.a is o.b is 5

o.c <?= 2
o.c <?= 3
o.d >?= 5
o.d >?= 7
eq o.c * o.d, 14


### Pipe
reverse = -> it.split '' .reverse! * ''
upCase  = -> it.toUpperCase!

eq \OLLEH ('hello' |> reverse |> upCase)

eq \OLLEH (upCase <| reverse <| \hello)

eq 8 ((+ 2) << (* 2) <| 3)

x = 3 |> (- 2) |> ([\a \b \c].)
eq \b x

x = [1, 2, 3, 4, 5] |> filter even |> map (* 2) |> fold (+), 0
eq 12 x

# Pipe and assign
result1 = 'hello' |> reverse |> upCase
eq 'OLLEH', result1

result2 = upCase <| reverse <| \hello
eq 'OLLEH', result2

### Unary spread
eq 'number,string' ''+ typeof do [Number, String]
eq 'number,string' ''+ typeof
  0
  \1

o = {2: [3 4], 5: 6}
a = delete o[5 ...2]
eq '6,3,4' "#a"
eq 3 a.length
ok o.2 is o.5 is void

eq '8,9' ''+ -~[7 8]


### Overloaded
a = b = [0 1]

#### Join
eq '0==1' a * \==
eq '0101' [... a] * 2 * ''
eq '(01)' <[( )]> * "#{a * ''}"
eq '0@@1' (-> arguments * \@@) 0 1
eq '0.1' b *= \.
eq '0.1' b

#### Remove
eq '01'  b - \.
eq \.    b -= /\d/g
eq '0.1' b = 0.1 - //#{2}//

#### Split
eq '0,1' String a / \,
eq 2 (/abc/ / /[^/]+/)length
eq "#{ x = ''+ Math.random() }"/'.'*'.' x
eq '0,1' ''+ b /= /\D/
eq '0,1' ''+ b

### Repeat
x = \x
n = 4
eq ''    'x'*0
eq \x    'x'*1
eq \xx   "x"*2
eq \xxx  \x *3
eq \xxxx \x *n
eq ''    "#{x}" * 0
eq \x    "#{x}" * 1
eq \xx   "#{x}" * 2
eq \xxx  "#{x}" * 3
eq \xxxx "#{x}" * n

i = -1
eq ''    ''+ [i++]*0
eq '0'   ''+ [i++]*1
eq '1,1' ''+ [i++]*2
eq '2,3,2,3,2,3' ''+ [i++, i++] * 3
eq '4,5,4,5,4,5' ''+ [i++, i++] * (n-1)

a = [1]
eq '0,1,0,1' ''+ [0 ...a] * 2
eq '1,1,1,1' ''+ [  ...a] * n
eq '1,1,1,1' ''+ a[0 , 0] * 2
eq '1,1,1,1' ''+ a[0 ...] * n

eq '0,1,0,1' ''+ [i for i to 1] * 2
eq '0,0,0,0' ''+ [i for i to 0] * n

##### ++ concat
a = [0 1]
c = [2 3]

eq '0,1,5'   String a++5
eq '0,1,5'   String a ++ 5
eq '0,1,2,3' String a++c
eq '0,1,2,3' String a ++ c
eq '0,1,2,3' String a ++
  c

### Mod
eq -3, -3 % 4
eq 1, -3 %% 4
eq 1, 7 % 2
eq -1, 7 %% -2

x = 7; x %%= -2
eq -1 x

eq '9', (-1 %% 10).toString!

### Partially applied binary ops
addTwo = (+ 2)
eq 5 addTwo 3
eq 7 (+) 3, 4
eq 3 (+)(1) 2
eq 3 (1+) 2

eq 2 (-)(4) 2
eq 4 (- 5) 9
eq -4 (5-) 9

eq -2 (-2) # not spaced, not paritally applied
eq 2 (+2)

ok (~=) '2' 2
ok (!~= 2) 9

ok (2 ==) 2
ok (!=) 2 '2'
ok (2!=) 3
ok (!=2) 3

ok (<) 2 3
ok (2<) 3
ok (<3) 2

ok (<=) 2 2
ok (2<=) 4
ok (<=2) 2

ok (>) 3 2
ok (3>) 2
ok (>2) 3

ok (>=) 2 2
ok (2>=) 1
ok (>=1) 1

ok (&&) true true
ok not ((and false) true)
ok (true and) true

ok (or) false true
ok (false or) true
ok (or true) false
ok (or)(true) false

eq 6 (*) 2 3
eq 6 (2*) 3
eq 6 (*3) 2

eq 2 (/) 6 3
eq 2 (6/) 3
eq 2 (/3) 6

eq 0 (%) 4 2
eq 0 (4%) 2
eq 0 (%2) 4

eq -1 (%%) 7 -2
eq -1 (7%%) -2
eq -1 (%%-2) 7

eq 8 (^) 2 3
eq 8 (2**) 3
eq 8 (^3) 2

eq '1,2,3' "#{ (++) [1] [2 3] }"
eq '1,2,3' "#{ ([1] ++) [2 3]  }"
eq '1,2,3' "#{ (++ [2 3]) [1]  }"

eq 2 (>?) 2 1
eq 2 (2 >?) 1
eq 2 (>? 1) 2

eq 1 (<?) 2 1
eq 1 (2 <?) 1
eq 1 (<? 1) 2

ok (instanceof) (new String \h), String
ok (instanceof String) (new String \h)
ok ((new String \h) instanceof) String

ok not (not instanceof) (new String \h), String
ok not (not instanceof String) (new String \h)
ok not ((new String \h) not instanceof) String

ok (in) 5 [1 to 10]
ok (in [1 to 5]) 3
ok (3 in) [1 to 5]

ok (not in) 0 [1 to 10]
ok (not in [1 to 5]) 7
ok (7 not in) [1 to 5]

obj = {}
(<<<) obj, a: 1
(<<< b:2) obj
(obj <<<) c: 3

eq 1 obj.a
eq 2 obj.b
eq 3 obj.c

obj-with = (obj with)
obj2 = obj-with a: 9

eq 1 obj.a
eq 9 obj2.a
eq 2 obj2.b

withObj2 = (with obj2)
obj3 = withObj2 d: 6

ok not obj2.d?
eq 6 obj3.d
eq 9 obj3.a

f-with = (with)
obj4 = (with) obj, {a: 0}

eq 1 obj.a
eq 0 obj4.a
eq 2 obj4.b


eq 5 (<|) (+ 2), 3
eq 5 (<| 3) (+ 2)
eq 5 ((+ 2) <|) 3

eq 5 (|>) 3 (+ 2)
eq 5 (|> (+ 2)) 3
eq 5 (3 |>) (+ 2)

eq 5 (<| 3 2 ) (+)
eq 5 (3 2 |>) (+)

eq 2 (.&.) 10 3
eq 2 (10 .&.) 3
eq 2 (.&. 3) 10

x = 2
(x +=) 2
eq 4 x

(x -=) 3
eq 1 x

(x :=) 5
eq 5 x

eq \--- (\- *) 3
eq '4,2' "#{ (/ '') 42 }"

x = 10
eq 12 (x +) 2

a = [1 2]
eq '1,2,3,4' String (++) a, [3 4]
eq '3,4,1,2' String (++ a) [3 4]
eq '1,2,3,4' String (a ++) [3 4]

# Unary ops as functions
ok (not) false
ok (!).call(null, false)

x = 3
eq 2 (--) x

eq '1,3,5' "#{ filter (not) << even, [1 to 5] }"

eq '1,3,5' "#{filter ((<<) (not), even), [1 to 5] }"

### cloneport
personA =
  name: \matias
  age:  20
  job:  'a cool job'

personB = personA with name: \john

eq \john   personB.name
eq \matias personA.name

personC = personA with
  name: \amy
  age:  19
  hair: \blonde

eq \amy    personC.name
eq 19      personC.age
eq \blonde personC.hair
eq \matias personA.name
eq 20      personA.age
ok not personA.hair?


### xor
ok not (0 xor 0)
ok not (1 xor 1)
ok (0 xor 1)
ok (1 xor 0)

x = -> 1
y = -> 0
ok not (y! xor y!)
ok not (x! xor x!)
ok (y! xor x!)
ok (x! xor y!)

ok (x 0 xor y!)

eq 'moo' (0 xor 'moo')

### Regex overloaded ==
if /[aeuio]*/ == 'ee'
then eq 'ee' that.0
else ok 0

if /^e(.*)/ == 'enter'
then ok 'enter,nter' String that
else ok 0

if /^e(.*)/ == 'zx'
then ok 0
else ok 1

if /moo/ != 'loo'
then ok 1
else ok 0

switch
| /moo/ != 'loo' => ok 1
| _              => ok 0

### Deep Equals
NaN === NaN
/moo/gi === /moo/gi

xs  = [1 to 5]
obj = {+opt, -goo, inp: \haha}

ok [1 2 3 4 5] === xs
ok not ([1 2 8 4 5] === xs)
ok not ([1 2 3 4 6] === xs)

ok not ([1 2 3 4 5] !== xs)
ok [1 2 8 4 5] !== xs
ok [1 2 3 4 6] !== xs

ok not ([1 2 3 4 5] <<= xs)
ok [1 2 3] <<= xs

ok [1 2 3] <== xs
ok [1 2 3 4 5] <== xs
ok not ([1 2 3 4 5 6] <== xs)

ok [1 2 3 4 5 6] >== xs
ok [1 2 3 4 5] >== xs
ok not ([1 2 3 4] >== xs)

ok not ([1 2 3 4 5] >>= xs)
ok [1 2 3 4 5 6] >>= xs

ok {opt: true, goo: false, inp: 'haha'} === obj
ok not ({opt: false, goo: false, inp: 'haha'} === obj)
ok not ({opt: true, goo: false} === obj)
ok not ({opt: true, goo: false, inp: 'haha', da: 4} === obj)

ok not ({opt: true, goo: false, inp: 'haha'} !== obj)
ok {opt: false, goo: false, inp: 'haha'} !== obj
ok {opt: true, goo: false} !== obj
ok {opt: true, goo: false, inp: 'haha', da: 4} !== obj

ok {opt: true, goo: false} <<= obj
ok not ({opt: true, goo: false, inp: 'haha'} <<= obj)

ok {opt: true, goo: false} <== obj
ok {opt: true, goo: false, inp: 'haha'} <== obj
ok not ({opt: true, goo: false, inp: 'haha', da: 6} <== obj)

ok {opt: true, goo: false, inp: 'haha', moo: 45} >>= obj
ok not ({opt: true, goo: false, inp: 'haha'} >>= obj)

ok {opt: true, goo: false, inp: 'haha', moo: 45} >== obj
ok {opt: true, goo: false, inp: 'haha'} >== obj
ok not ({opt: true, goo: false} >== obj)

ok [[4, 3] {name: \moo, k: [NaN]} /[ae]/g] === [[4, 3] {name: \moo, k: [NaN]} /[ae]/g]
ok !([[4, 3] {name: \mooo, k: [NaN]} /[ae]/g] === [[4, 3] {name: \moo, k: [NaN]} /[ae]/g])

ok [[4, 3] {name: \noo, k: [NaN]} /[ae]/g] <== [[4, 3] {name: \noo, k: [NaN]} /[ae]/g]
ok [[4, 3] {name: \loo, k: [NaN]}] <== [[4, 3] {name: \loo, k: [NaN]} /[ae]/g]

ok [[4, 3] {name: \koo, k: [NaN]}] <<= [[4, 3] {name: \koo, k: [NaN]} /[ae]/g]
ok !([[4, 3] {name: \moo, k: [NaN]} /[ae]/g] <<= [[4, 3] {name: \moo, k: [NaN]} /[ae]/g])

ok [1, _, 3]      === [1 2 3]
ok {a: 1, b:_}    === {a: 1, b: 2}
ok {a: [1, _, 3]} === {a: [1 4 3]}
ok {a: {b: _}}    === {a: {b: 9}}
ok [9 [1, _, 3]]  === [9 [1 4 3]]


### Calling binary logic
f = (- 1)
g = (+ 1)
h = (- 1)
even = -> it % 2 == 0
odd = (not) . even

eq 2 (f or g) 1
eq 1 (f or g) 2
ok not (f and g) 1
eq 2 (f or h or g) 1
ok (even or 1) 2
ok (odd or 2) 2
ok not (even or 1) 3
ok ((.length > 4) or [1 2 3]) [1 2 3]

eq 8 ((-> &0 + &1 is 5) and (**)) 2 3
