ok 500 > 50 > 5 > -5

ok true is not false is true is not false

ok 0 is 0 isnt 50 is 50

ok 10 < 20 > 10

ok 50 > 10 > 5 is parseInt('5', 10)

eq 1, 1 | 2 < 3 < 4

ok 1 == 1 <= 1, '`x == y <= z` should become `x == y && y <= z`'

i = 0
ok 1 > i++ < 1, 'chained operations should evaluate each value only once'


a = 1
b = '1'

ok a == b
ok not a != b
ok not (a === b)
ok not (a is  b)
ok a !==  b
ok a isnt b


ok 'a' in obj = a: true
ok 'b' not in obj, 'allow `x not in y`'


ok new String instanceof String
ok new Number not instanceof String, 'allow `x not instanceof Y`'

ok []    instanceof [String, Array]
ok 0 not instanceof [String, Array]


ok 200 of [100, 200, 300]
ok 200 of array = [100, 200, 300]
ok 1 not of array
ok array[0]++ of [99, 100], 'should cache testee'


# Non-spaced values still work.
x = 10
y = -5
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
ok a is false

# Conditional assignments with implicit objects.
obj = void
obj ?= one: 1

ok obj.one is 1

obj &&=
  two: 2

ok not obj.one
ok obj.two is 2


# Compound assignment as a sub expression.
[a, b, c] = [1, 2, 3]
ok (a + b += c) is 6
ok a is 1
ok b is 5
ok c is 3


# Bitwise operators:
ok (10 &   3) is 2
ok (10 |   3) is 11
ok (10 ^   3) is 9
ok (10 <<  3) is 80
ok (10 >>  3) is 1
ok (10 >>> 3) is 1

num = 10; ok (num <<=  3) is 80
num = 10; ok (num >>=  3) is 1
num = 10; ok (num >>>= 3) is 1
num = 10; ok (num &=   3) is 2
num = 10; ok (num ^=   3) is 9
num = 10; ok (num |=   3) is 11


#737: `in` should have higher precedence than logical operators.
eq 1, 1 of [1] and 1

#768: `in` should preserve evaluation order.
share = 0
a = -> share++ if share is 0
b = -> share++ if share is 1
c = -> share++ if share is 2
ok a() not of [b(),c()] and share is 3

# `in` with cache and `__indexOf` should work in commaed lists.
eq [Object() of Array()].length, 1


# Operators should respect new lines as spaced.
a = (123) +
456
ok a is 579

a = "1#{2}3" +
"456"
ok a is '123456'


# Multiple operators should space themselves.
eq(+ +1, - -1)


eq '', do do do -> -> -> do String
eq 1, do -> 1
eq @, do => @


x = 'xx'
o = (-> {} import {42, '', x, @X, (x), ([0])...}).call {X: 'XX'}
eq o[42], 42
eq o[''], ''
eq o.x, 'xx'
eq o.X, 'XX'
eq o.xx, 'xx'
eq o[0], 0

o import all new class then deep: 'copy'
eq o.deep, 'copy'

a = [0]
a import (*): 1, (*): 2
eq a[1], 1
eq a[2], 2


i = 0
O = ->
  switch ++i
  case 1 then {7}
  case 2 then new String 7
  default ok 0, 'returning delete should cache correctly'
eq delete (o = new O)[new O], 7
eq o[7], void
