{map} = require 'prelude-ls'

I = (x) -> x
M = (x) -> x x

eq I, M I


# Bare calls.
eq I (), I( )


# The empty function should not cause a syntax error.
->
(while 0 then 0).pop()


# Multiple nested function declarations mixed with implicit calls should not
# cause a syntax error.
(one) -> (two) -> three four, (five) -> six seven, eight, (nine) ->


obj = {
  bound   : -> do ~> this
  unbound : -> do -> this
  nested  : -> do ~> do ~> do ~> this
}
eq obj, obj.bound()
ok obj is not obj.unbound()
eq obj, obj.nested()


# Multi-blocks with optional parens.
result = I( ->
  I ->
    "Wrapped"
)
eq result()(), 'Wrapped'


eq 'lo', ("hello".slice) 3


# Nested single-line functions.
func = (x) -> (x) -> (x) -> x
eq func(1)(2)(3), 3


# Trailing comma/semicolon in a function parameter.
eq 1, ((f,) -> f()) (,) -> 1
eq 2, ((f;) -> f()) (;) -> 2


# Implicit calls in functions in parens.
eq 10, ((val) ->
  [].push val
  val
)(10)


# Passing multiple multiline functions without paren-wrapping.
sum = (one, two) -> one() + two()
eq 6, sum(->
  1 + 2
, ->
  2 + 1
)
eq 20, sum ->
  7 + 9
, ->
  /* spacer */
  1 + 3


# Implicit calls against trailing conditional branches.
eq 2, if 0 then 1 else 2
eq 6, switch 3 case 4 then 5 default 6


# Implicit calls using leading commas.
eq 1
,  1
eq \
  2
, 2

a = Array 0
        , do ->
          1
        , do -> 2; 2
        , 3
eq a+'' '0,1,2,3'


# Assignment to an inner variable that shares a name with
# an `Object.prototype` member should not leak.
(-> @@ = 'word')()
ok @@ is not 'word'


# Implicit call including an implicit object and a trailing function.
meth = (arg, obj, func) -> String [obj.a, arg, func()]
eq '13,apple,orange', meth 'apple', b: 1, a: 13, ->
  'orange'


# Ensure that empty functions don't return mistaken values.
o = func: (@param, ...@rest) ->

eq void , o.func(101, 102, 103, 104)
eq 101  , o.param
eq '102,103,104', '' + o.rest


(->
  this it, it
  @    it, it
).call ok, '`this` should be able to call implicitly'


# `new` should apply to the first function of a call chain,
args = [1 2]
eq 3, new (-> fun: (x, y) -> x + y)().fun ...args
eq 3, new (->      (x, y) -> x + y)()     ...args
eq 4 (new new Function 'this.p = 4')p
eq 5  new new Function('this.q = 5')()q

# but not to helper functions.
eq 1, new [...[-> [1]]].0().0             # slice$
eq 'object', typeof new {f: Number}.~f()  # bind$


# Chained blocks, with proper indentation levels:
counter =
  results: []
  tick: (func) ->
    @results.push func()
    this

counter
.tick ->
   3
.tick ->
  2
.tick ->
 1

eq counter.results.join(' '), '3 2 1'


# Newline-supressed call chains with nested functions.
obj  = call: -> this
func = ->
  obj
  .call ->
    one two
  .call ->
      three four
  101

eq func(), 101


ok new Date!@@ is Date
, '`new` should not add extra parens'

ok new (Object C: Number).C instanceof Number
, '`new` should not unwrap parenthesized operand'


# `new` against bare function prevents implicit return.
o = new ->
  @0 = 1
  [2]
eq o.0, 1


# Implicit calls against non-spaced unary plus/minus.
eq +5, +5
eq -5, -5


# Implicit calls against precrements.
n = 0
eq ++n, 1
eq --n, 0


eq ok, do ->
  ok
  /* Should `return` implicitly   */
  /* even with trailing comments. */


throws 'misplaced function declaration on line 1', ->
  LiveScript.compile 'if 1 then function F then'


# Returns with multiple branches.
func = ->
  if it
    for n in [1, 2] then return n
  else
    0
eq func(0), 0
eq func(1), 1


# Don't gather results from a loop that _jumps_ out of a closure.
findIt = (items) -> for item in items then return item if item is 'bacon'
eq 'bacon', findIt [1, 2, 3, 'bacon', 4, 5]
eq void   , findIt []


# When a closure wrapper is generated for expression conversion, make sure
# that references to "this" within the wrapper are safely converted as well.
obj = method: -> (switch case 1 then this)
eq obj.method(), obj


eq 3, do -> (1; 2; 3)
eq 3, do -> return (1; 2; 3)


compileThrows 'inconvertible statement' 1 'b = break'
compileThrows 'inconvertible statement' 2 '''
  r =
    return
'''
compileThrows 'inconvertible statement' 3 '''
  r = if 1
    2 +
    return
'''


eq '(function(){})(function(){});', LiveScript.compile '(->return)(->void)', {+bare,-header}


# `@it` isn't `it`
eq '''
(function(){
  return this.it;
});
''', LiveScript.compile '-> @it', {+bare,-header}


# Simple functions require no parens when comma-listed.
funs = [->, -> 1, -> it, -> this, null]
eq 1, +funs.3.call funs.2 funs.1()

# [#81](https://github.com/satyr/coco/issues/81)
ok I(->), 'be careful when specialcasing `-> X ,`'


eq 0, (new do -> Array).length


x = y = 10; x1 = y1 = 20
area = (x, y, x1, y1) ->
  (x - x1) * (x - y1)

eq area(x, y, x1, y1), 100
eq(area(
  x
  y
  x1, y1
), 100)


sumOfArgs = ->
  sum = 0
  for val in arguments then sum += val
  sum

eq 15, sumOfArgs(1, 2, 3, 4, 5)


((@arg) ->).call context = {}, 1
eq 1, context.arg

((...splat, @arg) ->).call context, 1, 2, 3
eq 3, context.arg

((...@arg) ->).call context, 1, 2, 3
eq '1,2,3', '' + context.arg


eq 1, new (class then (@do) -> eq @do, $do)(1).do


# Parameter destructuring
((...[{a: [b], c}]) ->
  eq b, 123
  eq c, 456
) {a: [123], c: 456}


# Parameter default values
obj = f: (q = 123, @p = 456) -> q
eq obj.f(), 123
eq obj.p  , 456

withSplats = (a = 2, ...b, c = 3, d ? 5) -> a * (b.length + 1) * c * d
eq 30, withSplats()
eq 15, withSplats 1
eq  5, withSplats 1, 1
eq  1, withSplats 1, 1, 1
eq  2, withSplats 1, 1, 1, 1

f = (a || 2, b && 5) -> a + b
eq 7, f 0, 1
eq 1, f 1, 0
eq 6, f 1, 1
eq 2, f 0, 0

f = (a ||= 2, b &&= 5) -> a + b
eq 7, f 0, 1
eq 1, f 1, 0
eq 6, f 1, 1
eq 2, f 0, 0

do (a ? I(1)) -> eq a, 1

eq 1, do []= (a || 0 || 1) -> a


eq arguments,
  switch case 1
    eq arguments, (for i to 0 then arguments)0
    arguments


ok (@arguments, @eval) ->


compileThrows 'duplicate parameter "a"' 1 '(a, a) ->'


# Fun with radical parameters.
obj = {}
set = (name, obj[name]) ->
set \key \value
eq obj.key, \value


# Call takes precedence over function parameter.
eq 0, I(-> it()) -> 0
eq void Function() ->


# Ignore trailing placeholder parameters.
eq 0 ((,,...,,...,,) -> it)length


### Invalid call detection
compileThrows 'invalid callee'      1 '[]()'
compileThrows 'invalid constructor' 1 'new 42'


### `new` block
o = new
  @1 = \_
  @length = 3
  {}
eq '0_0' o * \0


### Backcalls
g = (...a, f) -> f ...a
h = (f, ...a) -> f a

eq ok, do
  (a, b) <- g \a, \b
  eq b, \b
  ...d <- h _, a
  eq d.0.0, \a
  ok

new
  me = this
  f <~ M
  eq me, this
  eq \function typeof f

eq 3 do
  do
    <- I 1
    2
  3

eq 6 (a <- g 6; a)

# [#192](https://github.com/satyr/coco/issues/192)
eq '192' do
  <- '081'replace /./g
  -~it
  /* ignore trailing */
  /* block comments */


addArr = do
  (x, y) <-- map _, [2 3 4]
  x + y

eq 5 addArr.0 3
eq 5 addArr.1 2
eq 5 addArr.2 1

t-obj =
  z: 10
  bound: ->
    (x, y) <~~ map _, [2 3 4]
    x * y * this.z
  unbound: ->
    (x, y) <-- map _, [2 3 4]
    x * y * this.z

timesArr = t-obj.bound!
eq 60 timesArr.0 3
eq 60 timesArr.1 2
eq 60 timesArr.2 1.5

timesArr = t-obj.unbound!
ok isNaN timesArr.0 3
ok isNaN timesArr.1 2
ok isNaN timesArr.2 1.5

### `function`
new
  function undef1 then
  function undef2
    void
  eq void undef1()
  eq void undef2()

  ~function bound then this
  eq this, bound.call \this

  f = act: function (n)
    if n < 2 then 1 else n * act n-1
  eq 120 f.act 5

  ok function ok then throw
  eq void, do f = function then

  function double(a) then a * 2
  function triple a  then a * 3
  eq 4, double 2
  eq 9, triple 3

compileThrows 'redeclaration of function "f"' 2 '''
  f = 0
  function f then
'''
compileThrows 'redeclaration of function "f"' 2 '''
  function f
    f = 1
'''
compileThrows 'redeclaration of function "f"' 2 '''
  function f then
  f = 2
'''
compileThrows 'redeclaration of function "f"' 1 '''
  function f f then
'''
compileThrows 'increment of function "f"' 2 '''
  function f then
  ++f
'''
compileThrows 'misplaced function declaration' 2 'if 1\n function F then'


### `let`
new
  x = y = 1; @z = 2
  let x = 0, y, @z
    eq x, 0
    eq y, 1
    eq z, 2
    x = y = 3
  eq x, 1
  eq y, 1

eq \chainable,
  let
    \chain
  .concat \able

eq '''
(function(){
  this;
}.call(this));
''' LiveScript.compile 'let() then this # top-level and should not return' {+bare,-header}

ok let [it] = [ok]
  it is ok

let this = eq
  this eq, this


### `&`
let 0
  eq & , arguments
  eq &0, 0
  eq &1, void


### thisplat
f = (x, y) -> [this, x, y]
let @ = 0, x = 1, y = 2
  eq '0,1,2' ''+ f ...
  eq ','     ''+ f(...[])slice 1


### do-`not`-return
eq void do !-> true
eq void do !~> true
eq void do
  <-! M
  <~! M
  !function C then C
  ok new C instanceof C
  eq void do not function f => f
  true

eq false !!->

eq void do (x) !-> true
eq void do (x) !--> true
eq void do (x) !~> true
eq void do (x) !~~> true

### auto currying magic
times = (x, y) --> x * y
timesTwo = times 2

eq 12 times 2 6
eq 8 timesTwo 4

boundAdd = (x, y) ~~> x + y
addThree = boundAdd 3

eq 12 boundAdd 6 6
eq 7 addThree 4

threeParams = (x, y, z) --> x * y + z
eq 10 threeParams 2 3 4 5

multByTwo = threeParams 2
eq 7 multByTwo(3)(1)

addNine = threeParams 3 3
eq 16 addNine 7

f4 = ((a, b, c, d) --> a * b * c * d)(2)(3)
g = f4 5
h = f4 7

eq 330 g 11
eq 546 h 13


### explicit naming
let
  do a = :b -> eq a, b
  do c = :d!-> eq c, d
  do e = !:f-> eq e, f
let
  a <-:b  M
  c <-:d! M
  e <-!:f M
  eq a, b
  eq c, d
  eq e, f

### composing
timesTwo = -> it * 2
plusOne = -> it + 1

timesTwoPlusOne = timesTwo >> plusOne
plusOneTimesTwo = timesTwo << plusOne

eq 5 timesTwoPlusOne 2
eq 6 plusOneTimesTwo 2

pott = timesTwo . plusOne
eq 6 pott 2

eq 'true,false,true,false' "#{ map (is \function) . (typeof), [->, 2, ~>, 3] }"

even = (x) -> x % 2 == 0
odd = (not) . even
ok odd 3
ok not odd 2

f = (+ 1) >> (* 2) >> (- 10)
eq 12, f 10

f = (+ 1) << (* 2) << (- 10)
eq 1, f 10

f = (+ 1) >> (* 2) << (- 10)
eq 2, f 10

f = (+ 1) << (* 2) >> (- 10)
eq 11, f 10

do ->
  a = -> 1
  b = (* 2)
  c = a >> b
  a = -> 100
  eq 2, c!

### infix calls
add = (x, y) --> x + y
times = (x, y) --> x * y
elem = (x, xs) --> x in xs

eq 7, 3 `add` 4
eq 8, 3 + 2 `add` add 2 1
eq 25, 2 `add` 3 + 4 `times` 5
eq 25, 2 `add` 3 `times` 5
ok 3 `elem` [1 to 10]

eq 5 (`add`) 2 3
eq 5 (2 `add`) 3
eq 5 (`add` 3) 2

ok (`elem` [1 to 10]) 3

### implicit call/lookup
obj =
  a: 2
  b: -> 5
  c: (x, y) -> x + y

eq 2 (.a) obj
eq 5 (.b!) obj
eq 7 (.c 3 4) obj

eq '5,1,7'       "#{ map (.length),  [[1 to 5] [1] [1 to 7]] }"
eq '1|2|3,1,1|2' "#{ map (.join \|), [[1 to 3] [1] [1 to 2]] }"

eq '3,2,,0' "#{ map (?p), [{p: 3}, {p: 2}, , {p: 0}] }"

eq 2 (obj.) \a
eq 7 ((obj <<< d: 7).) \d

eq 2 (.) obj, \a
eq 2 ((.) obj) \a

ary = [1 2]
eq '1,2,3' "#{(.~concat) ary <| 3}"
concat = (.~) ary, 'concat'
eq '1,2,3' "#{concat 3}"

### partialization
three-add = (x, y, z) -> x + y + z
g = three-add 2, _, 10
eq 20 g 8
eq 19 g 7

h = three-add 2, _, _
f = h _, 6
eq 10 f 2

two-add = (x = 10, y) -> x + y
g = two-add _, 4
eq 14 g!

obj =
  three-add: (x, y, z) -> x + y + z

f = obj.three-add 1, _, 3
eq 6 f 2

eq 9 (6 |> obj.three-add 1, _, 2)

# preserve context of partially applied function
obj =
    offset: 5
    add: (x, y) -> @offset + x + y

eq 16 (10 |> obj.add _, 1)

# do a named func
do ->
  i = 0
  ok named-func
  eq 1 named-func 1
  eq 1 i
  do function named-func x
    ++i
    x
  eq 2 i

# bound and curried
class A
  (@list = \middle) ->

  enclose: (head, tail) ~~>
    [head, @list, tail].join!

  enclose-not-bound: (head, tail) -->
    [head, @list, tail].join!

a = new A

fn = a.enclose \head
curried = fn \tail
eq 'head,middle,tail' curried

# multiple instances
a2 = new A \middle2
fn2 = a2.enclose \head
curried2 = fn2 \tail
eq 'head,middle2,tail' curried2

# not bound
obj =
  list: \haha
  fn: a.enclose-not-bound \head
  fn2: a.enclose-not-bound
eq 'head,haha,tail' obj.fn \tail
obj.fn3 = obj.fn2 \h
eq 'h,haha,t' obj.fn3 \t

# unary ops in parameters
f = (!x) -> x
ok f false

g = (+x) -> x
eq 1 g '1'

h = (^^x) -> x <<< a: 9, c: 6
obj = a: 1, b: 2
obj2 = h obj
eq 9 obj2.a
eq 6 obj2.c
eq 1 obj.a # original obj hasn't been modified
ok not obj.c

k = (!!x) -> x
eq true k 1

l = (!!@x) -> x
obj = {-x}
l.call obj, 'hello'
eq true obj.x
