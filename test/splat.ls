fn = (first, ...rest) -> '' + rest
eq fn(1,2,3,4,5), '2,3,4,5'
eq fn(6,7), '7'

fn = (...heads, last) -> '' + heads
eq fn(1,2,3,4,5), '1,2,3,4'
eq fn(6,7), '6'

fn = (first, second, ...middles, last) -> '' + middles
eq fn(1,2,3,4,5), '3,4'
eq fn(6,7), ''


a = [0  method: -> this is a.1]
ok a[++a.0]method(...a), 'should cache base value'


trio = [1 2 3]
eq '1234'    [...trio, 4] * ''
eq '4123'    [4, ...trio] * ''
eq '1234321' [...trio, 4, ...trio.reverse!] * ''


# Splats with `super`.
class Parent
  meth: (...args) -> ''+ args

class Child extends Parent
  nums: [0, 1]
  meth: -> super ...@nums, 2

eq '0,1,2' new Child()meth()


# Array splat expansions with assigns.
eq '0,1,2,3,4' String [a = 0, ...[1 2 3], b = 4]
eq a, 0
eq b, 4


o = x: {0}, (y = 1): {2}
{...x, ...(y)} = o
eq x[0], 0
eq y[2], 2
ok x is not o.x , 'should copy o.x'
ok y is not o[y], 'should copy o[y]'


compileThrows 'multiple splat in an assignment' 1 '[...a, ...b] = c'


class Thisplat
  ->
    [me, [a0, a1, a2]] = @f ...
    eq me, this
    eq a0 * a2, 21
  f: -> [this, arguments]

class Thisplat2 extends Thisplat
  ~> super ...
  f: -> super ...

new Thisplat2 3 5 7


eq 0, [...[...[0]]][0]


[...onetwo, [], {}, five] = [1 to 5]
eq onetwo + '', '1,2'
eq five, 5


eq '0.0', 0.toFixed ...[1]


# Multiple splats in the same chain.
o =
  f: -> @a.push ...arguments; this
  a: [1]

o.f(...o.a).f(...o.a)
eq '1,1,1,1' o.a + ''

(-> o.f(...).f(...))call o, 2
eq '1,1,1,1,2,2' o.a + ''


# [coffee#870](https://github.com/jashkenas/coffee-script/issues/870)
[...[], a] = [1]
eq a, 1

# `...` is same as `...[]`
[..., a] = [1 to 3]
eq a, 3

[a, ..., b] = [1 2]
eq a, 1
eq b, 2

[a, ..., b] = [1 to 5]
eq a, 1
eq b, 5

eq '''
(function(){
  var a;
  a = arguments[arguments.length - 1];
});
''', LiveScript.compile '(..., a) ->', {+bare}


# Don't call `slice$` on array literals.
eq '[a, a].concat([b]);' LiveScript.compile '[...[a]*2 b]' {+bare}

# splatted new
class A
  (x, y = 0, z = 0) -> @res = x  + y + z

eq 6 (new A ...[1 2 3]).res
arg = [1 2 3]
eq 6 (new A ...arg).res

eq 5 (new A ...[5]).res
x = [5]
eq 5 (new A ...x).res
eq 8 (new A 3 ...x).res
eq 9 (new A 3 ...x, 1).res

a = {}
a.b = {}
class a.b.A
  (x, y, z) -> @res = x + y + z

eq 6 (new a.b.A ...[1 2 3]).res
