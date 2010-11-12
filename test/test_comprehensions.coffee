# Basic array comprehensions.
nums    = (n * n for n of [1, 2, 3] when n % 2 isnt 0)
results = (n * 2 for n of nums)

ok results.join(',') is '2,18'


# Basic object comprehensions.
obj   = {one: 1, two: 2, three: 3}
names = (prop + '!' for prop in obj)
odds  = (prop + '!' for prop, value in obj when value % 2 isnt 0)

ok names.join(' ') is "one! two! three!"
ok odds.join(' ')  is "one! three!"


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
evens = for num of [1, 2, 3, 4, 5, 6] when num % 2 is 0
           num *= -1
           num -= 2
           num * -1
eq evens + '', '4,6,8'


# Backward traversing.
odds = (num for num of [0, 1, 2, 3, 4, 5] by -2)
eq odds + '', '5,3,1'


# The in operator still works, standalone.
ok 2 in evens

# all/from/to aren't reserved.
all = from = to = 1


# Nested comprehensions.
multiLiner =
  for x from 3 to 5
    for y from 3 to 5
      [x, y]

singleLiner =
  (([x, y] for y from 3 to 5) for x from 3 to 5)

ok multiLiner.length is singleLiner.length
ok 5 is multiLiner[2][2][1]
ok 5 is singleLiner[2][2][1]


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
own = (value for key, value in whiskers)
all = (value for all key, value in whiskers)

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
func = -> for i of [1, 2]
  break if i is 2
  j for j of [1]
ok func()[0][0] is 1

i = 6
odds = while i--
  continue unless i & 1
  i
eq '5,3,1', '' + odds


# For each dynamic call under `for`,
# define it outside and pass loop variables to it.
fs = for i, [a, b] in [[], [1, 2], [3, 4]] when a
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
