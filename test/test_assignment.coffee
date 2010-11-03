# Can assign the result of a try/catch block.
result = try
  nonexistent * missing
catch error
  true

result2 = try nonexistent * missing catch error then true

ok result is true and result2 is true


# Can assign a conditional statement.
getX = -> 10

if x = getX() then 100

ok x is 10

x = if getX() then 100

ok x is 100


# This-assignment.
tester = ->
  @example = -> 'example function'
  this

ok tester().example() is 'example function'


try throw CoffeeScript.tokens 'in = 1'
catch e then eq e.message, 'Reserved word "in" on line 1 cannot be assigned'


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


parent = child: str: 'test'
parent.child.str.=replace /./, 'b'
eq 'best', parent.child.str
parent.child.str[='replace'] /./, 'r'
eq 'rest', parent.child.str


for nonref in ['""', '0', 'f()']
  try ok not CoffeeScript.compile "{k: #{nonref}} = v"
  catch e then eq e.message, "\"#{nonref}\" cannot be assigned."


eq Math, do -> Math or= 0


# Simple variable swapping.
a = -1
b = -2
[a, b] = [b, a]
eq a, -2
eq b, -1

eq "#{ do -> [a, b] := [b, a] }", '-1,-2'
eq a, -1
eq b, -2


#713
eq (onetwo = [1, 2]), [a, b] = [c, d] = onetwo
ok a is c is 1 and b is d is 2


# Array destructuring, including splats.
[x, y..., z] = [1, 2, 3, 4, 5]
eq x, 1
eq y.length, 3
eq z, 5

[heads..., [head, tails...], tail] = [1,2,3, [4, 5,6], 7]
eq head, 4
eq tail, 7
eq heads + '', '1,2,3'
eq tails + '', '5,6'


# Object destructuring.
{x: a, y: b, z: c} = {x: 10, y: 20, z: 30}
eq a, 10
eq b, 20
eq c, 30

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

{person: {address: [ignore, addr...]}} =
  person:
    address: [
      "------"
      "Street 101"
      "Apt 101"
      "City 101"
    ]
ok addr.join(', ') is 'Street 101, Apt 101, City 101'


# Pattern matching against an expression.
[a, b] = if true then [2, 1] else [1, 2]
eq a, 2
eq b, 1


# Pattern matching with object shorthand.
{name, age, dogs: [first, second]} =
  name: 'Bob'
  age :  26
  dogs: ['Prince', 'Bowie']
eq name   , 'Bob'
eq age    , 26
eq first  , 'Prince'
eq second , 'Bowie'


# Pattern matching within for..loops.
persons =
  George     : {name: 'Bob'  }
  Bob        : {name: 'Alice'}
  Christopher: {name: 'Stan' }
join1 = ("#{key}: #{name}" for key, {name} of persons)

eq join1.join(' / '), 'George: Bob / Bob: Alice / Christopher: Stan'

persons = [
  {name: 'Bob'  , parent: {name: 'George'     }}
  {name: 'Alice', parent: {name: 'Bob'        }}
  {name: 'Stan' , parent: {name: 'Christopher'}}
]
join2 = ("#{parent}: #{name}" for {name, parent: {name: parent}} in persons)

eq join1.join(' '), join2.join(' ')

persons = [['Bob', ['George']], ['Alice', ['Bob']], ['Stan', ['Christopher']]]
join3 = ("#{parent}: #{name}" for [name, [parent]] in persons)

eq join2.join(' '), join3.join(' ')


# Pattern matching doesn't clash with implicit block objects.
obj = a: 101
func = -> true
if func func
  {a} = obj
eq a, 101


[x] = {0: y} = {'0': z} = [Math.random()]
ok x is y is z, 'destructuring in multiple'


# Destructuring into an object.
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


ok {} = [] = true, 'empty assignment is allowed'
