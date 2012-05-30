# Newline suppression for binary operators.
eq 32,
  1 *
  2 +
  3 -
  4 <<<<<
  5

if  false
or  true
and null
?   false
!?  true
  eq 3 1
     &&& 2
     ||| 3
else ok 0 'leading logical/bitwise operators should continue lines'


# Chained Comparisons
ok 500 > 50 > 5 > -5

ok 0 is 0 is not 50 is 50

ok 10 < 20 > 10

ok 50 > 10 > 5 is parseInt('5', 10)

eq 1, 1 ||| 2 < 3 < 4

ok 1 == 1 <= 1, '`x == y <= z` should become `x == y && y <= z`'

i = 0
ok 1 > i++ < 1, 'chained operations should evaluate each value only once'

# [coffee#891](https://github.com/jashkenas/coffee-script/issues/891)
eq 1, (1 unless 1 < 0 == 0)


# (In)equality
a = 1
b = '1'
ok a === b
ok not a !== b
ok not (a == b)
ok not (a is  b)
ok a !=  b
ok a is not b
ok a isnt b

ok true is     true
ok true is not false
ok true isnt false


# (In)existence
let a = void
  eq a?, false
  eq a!? true

(ok !? ok) true


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
eq true, void in length: 1

eq 1, +( 0 in [0])
eq 0, +(10 in [ ])

ok array[0]++ in [0, 1] 'should cache testee'


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

n = m = null
n  ?= void
n  ?= true
m !?= true
eq n, true
eq m, null


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
eq (10 &&&   3), 2
eq (10 |||   3), 11
eq (10 ^^^   3), 9
eq (10 <<<<< 3), 80
eq (10 >>>>  3), 1
eq (10 >>>>> 3), 1

num = 10; eq (num = num ^^^ 3), 9

#coffee-737: `in` should have higher precedence than logical operators.
eq 1, 1 in [1] && 1

#coffee-768: `in` should preserve evaluation order.
share = 0
a = -> share++ if share is 0
b = -> share++ if share is 1
c = -> share++ if share is 2
ok a() not in [b(),c()] and share is 3

# `in` with cache and `__indexOf` should work in commaed lists.
eq [Object() in Array()].length, 1


# Operators should respect new lines as spaced.
a = (123) +
456
eq a, 579

a = "1#{2}3" +
"456"
eq a, '123456'


### Unary `+`/`-`
eq  0, +[]
eq -1, -true

# Should space themselves when repeated.
eq(+ +1, - -1)
eq (-1), - --[2]0


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
''', LiveScript.compile '{a}<<<{b}<<<{c}', {+bare}

ok ok.isPrototypeOf new []= (->) <<< prototype: ok

new
  import life: 2, universe: 3, everything: 7
  eq @life * @universe * @everything, 42

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


### {in,de}crement
a = [0]
ok ++a.0

# Can be spaced.
eq(-- a[0], a[0] ++)
eq 1 a.0

# ACI applies on postcrement.
eq a.0 ++  -- a.0
eq 1 i

throws 'increment of undeclared variable "C" on line 1' -> LiveScript.compile 'C++'
throws 'invalid decrement on line 1' -> LiveScript.compile 'q.=p--'


### `delete`
i = 0
O = ->
  switch ++i
  case 1 then {7}
  case 2 then new String 7
  default ok 0, 'returning delete should cache correctly'
eq delete (o = new O)[new O], 7
eq o[7], void

throws 'invalid delete on line 1' -> LiveScript.compile 'delete a'
throws 'invalid delete on line 1' -> LiveScript.compile 'delete a.=b'


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

eq 99, u >?= 99
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
Array 0 |>> _.concat 1, 2
        |>> _ <<<   {3: 4}
        |>> eq '1,2,,4' "#_"

String 0
|>> if _ then _+_ else _*_
|>> eq \00 _

eq void,
  -> |>> _ _ |>> _

reverse = -> it.split '' .reverse! * ''
upCase  = -> it.toUpperCase!

eq \OLLEH ('hello' |> reverse |> upCase)

eq \OLLEH (upCase <| reverse <| \hello)

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
a = [0 1]
b = ''
c = [2 3]

#### Concat
eq '0,1,2' String a + [2]
eq '3,4,5' String [3 4] + {0: 5, length: 1}
eq '0,1' ''+ b += [0 1]
ok b instanceof a..

x = [6]
y = [7 to 10]
[[] ...x, []] += y
eq '6,8,9' ''+ x

x += for i til 2 then i
eq '6,8,9,0,1' ''+ x

##### +++
eq '0,1,2,3' String a +++ c
eq '0,1,5'   String a +++ 5

##### &
eq '0,2,3' String 0 & c
eq '1,2,3' String 1 & 2 & 3

#### Join
eq '0==1' a * \==
eq '0101' [... a] * 2 * ''
eq '(01)' <[( )]> * "#{a * ''}"
eq '0@@1' (-> @@ * \@@) 0 1
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

### Mod
eq -3, -3 % 4
eq 1, -3 %% 4
eq 1, 7 % 2
eq -1, 7 %% -2

x = 7; x %%= -2
eq -1 x

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

ok (===) '2' 2
ok (!== 2) 9

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

eq '1,2,3' "#{ (&) 1 [2 3] }"
eq '1,2,3' "#{ (1&) [2 3]  }"
eq '1,2,3' "#{ (&[2 3]) 1  }"

eq '1,2,3' "#{ (+++) [1] [2 3] }"
eq '1,2,3' "#{ ([1]+++) [2 3]  }"
eq '1,2,3' "#{ (+++[2 3]) [1]  }"

eq 2 (>?) 2 1
eq 2 (2 >?) 1
eq 2 (>? 1) 2

eq 1 (<?) 2 1
eq 1 (2 <?) 1
eq 1 (<? 1) 2

# Unary ops as functions
ok (not) false
ok (!).call(null, false)

x = 3
eq 4 (++) x # does not actually modify x
eq 2 (--) x
eq 4 (++).call(null, x)

filter(f, xs) = [x for x in xs when f x]
even(x) = x % 2 == 0
eq '1,3,5' "#{ filter (not) << even, [1 to 5] }"

eq 2 (&&&) 10 3
eq 2 (10 &&&) 3
eq 2 (&&& 3) 10
eq '1,3,5' "#{filter ((<<) (not), even), [1 to 5] }"
