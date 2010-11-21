i = 5
list = while i -= 1
  i * 2
eq '' + list, '8,6,4,2'

i = 5
list = (i * 3 while i -= 1)
eq '' + list, '12,9,6,3'

i = 5
func   = -> i -= it
assert = -> ok false unless 0 < i < 5
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


#759: `if` within `while` condition
2 while if 1 then 0


# https://github.com/jashkenas/coffee-script/issues/843
eq void, do -> return while 0


# Basic array comprehensions.
nums    = for n of [1, 2, 3] then n * n if n & 1
results = (n * 2 for n of nums)

eq results + '', '2,18'


# Basic object comprehensions.
obj   = {one: 1, two: 2, three: 3}
names = (prop + '!' for prop in obj)
odds  = for prop, value in obj then prop + '!' if value & 1

eq names.join(' '), 'one! two! three!'
eq odds .join(' '), 'one! three!'


# Basic range comprehensions.
nums = (i * 3 for i from 1 to 3)
negs = (x for x from -20 to -5*2)
eq nums.concat(negs.slice 0, 3).join(' '), '3 6 9 -20 -19 -18'

eq '123', (i for i from 1 til 4     ).join ''
eq '036', (i for i from 0 til 9 by 3).join ''

# With range comprehensions, you can loop in steps.
eq "#{ x for x from 0 to 9 by  3 }", '0,3,6,9'
eq "#{ x for x from 9 to 0 by -3 }", '9,6,3,0'
eq "#{ x for x from 3*3 to 0*0 by 0-3 }", '9,6,3,0'


# Multiline array comprehension with filter.
evens =
  for num of [1, 2, 3, 4, 5, 6] then if num % 2 is 0
    num *= -1
    num -=  2
    num * -1
eq evens + '', '4,6,8'


# Backward traversing.
odds = (num for num of [0, 1, 2, 3, 4, 5] by -2)
eq odds + '', '5,3,1'


# all/from/to/by aren't reserved.
all = from = to = by = 1


# Nested comprehensions.
multiLiner =
  for x from 3 to 5
    for y from 3 to 5
      x * y

singleLiner =
  ((x * y for y from 3 to 5) for x from 3 to 5)

eq multiLiner.length, singleLiner.length
eq 25,  multiLiner[*-1]
eq 25, singleLiner[*-1]


# Comprehensions within parentheses.
result = null
store = -> result := it
store (x * 2 for x of [3, 2, 1])

ok result.join(' ') is '6 4 2'


# Closure-wrapped comprehensions that refer to the "arguments" object.
expr = ->
  result = (item * item for item of arguments)

ok expr(2, 4, 8).join(' ') is '4 16 64'


# Fast object comprehensions over all properties, including prototypal ones.
class Cat
  -> @name = 'Whiskers'
  breed: 'tabby'
  hair:  'cream'

whiskers = new Cat
own = (value for own key, value in whiskers)
all = (value for key, value in whiskers)

ok own.join(' ') is 'Whiskers'
ok all.sort().join(' ') is 'Whiskers cream tabby'


f = -> [-> ok false, 'should cache source']
ok true for k in [f] = f()


# Lenient true pure statements not trying to reach out of the closure
val = for i of [1]
  for j of [] then break
  i
ok val[0] is i


# Comprehensions only wrap their last line in a closure, allowing other lines
# to have pure expressions in them.
func = ->
  for i from 1 to 2
    break if i is 2
    j for j of [3]
eq func()[0], 3

i = 6
odds = while i--
  continue unless i & 1
  i
eq '5,3,1', '' + odds


# For each dynamic call under `for`,
# define it outside and pass loop variables to it.
fs = for i, [a, b] in [[], [1, 2], [3, 4]]
  continue unless a
  me = this
  do =>
    return if i < 2
    eq me, this
    eq a * b, 12
  do ->
    {callee} = arguments
    -> [a + b, callee]
[one, two] = (f() for f of fs)
eq one[0] * two[0], 21
eq one[1] , two[1]


copy = {}
continue for k, copy[k] in [4, 2]
eq copy[0] * copy[1], 8


# Post-`for` chains.
eq "#{
  a * b * c * d         \
  for a in {1}          \
  for b of [2]          \
  for c of [3, 4] by -1 \
  for d from 5 to 6     \
  for _ in {7}
}", '40,30,48,36'
