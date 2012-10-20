### The following are modified from CoffeeScript - test/classes.coffee

# classes with a four-level inheritance chain
class Base
  func: (string) ->
    "zero/#string"

  @static = (string) ->
    "static/#string"

class FirstChild extends Base
  func: (string) ->
    super('one/') + string

SecondChild = class extends FirstChild
  func: (string) ->
    super('two/') + string

thirdCtor = ->
  @array = [1, 2, 3]

class ThirdChild extends SecondChild
  -> thirdCtor.call this

  # Gratuitous comment for testing.
  func: (string) ->
    super('three/') + string

result = (new ThirdChild).func 'four'

eq 'zero/one/two/three/four' result
eq 'static/word' Base.static 'word'

FirstChild::func = (string) ->
  super 'one/' .length + string

result = (new ThirdChild).func 'four'

eq '9two/three/four' result

eq '1 2 3' (new ThirdChild).array.join ' '

# constructors with inheritance and super
identity = (f) -> f

class TopClass
  (arg) ->
    @prop = 'top-' + arg

class SuperClass extends TopClass
  (arg) ->
    identity super 'super-' + arg

class SubClass extends SuperClass
  ->
    identity super 'sub'

eq 'top-super-sub' (new SubClass).prop

#Overriding the static property new doesn't clobber Function::new
class OneClass
  (name) -> @name = name
  @new = 'new'
  function: 'function'

class TwoClass extends OneClass
delete TwoClass.new

Function.prototype.new = -> new this ...arguments

eq \three (TwoClass.new('three')).name
eq \function (new OneClass).function
eq \new OneClass.new

delete Function.prototype.new

#basic classes, again, but in the manual prototype style
Base = ->
Base::func = (string) ->
  'zero/' + string
Base::['func-func'] = (string) ->
  "dynamic-#{string}"

FirstChild = ->
SecondChild = ->
ThirdChild = ->
  @array = [1, 2, 3]
  this

ThirdChild extends SecondChild extends FirstChild extends Base

FirstChild::func = (string) ->
  super('one/') + string

SecondChild::func = (string) ->
  super('two/') + string

ThirdChild::func = (string) ->
  super('three/') + string

result = (new ThirdChild).func 'four'

eq 'zero/one/two/three/four' result
eq 'dynamic-thing' (new ThirdChild)['func-func']('thing')

#super with plain ol' functions as the original constructors
TopClass = (arg) ->
  @prop = 'top-' + arg
  this

SuperClass = (arg) ->
  super 'super-' + arg
  this

SubClass = ->
  super 'sub'
  this

SuperClass extends TopClass
SubClass extends SuperClass

eq 'top-super-sub' (new SubClass).prop

#'@' referring to the current instance, and not being coerced into a call
class ClassName
  amI: ->
    @ instanceof ClassName

obj = new ClassName
ok obj.amI!

#super() calls in constructors of classes that are defined as object properties
class Hive
  (name) -> @name = name

class Hive.Bee extends Hive
  (name) -> super ...

maya = new Hive.Bee 'Maya'
eq 'Maya' maya.name

#classes with JS-keyword properties
class Class
  class: 'class'
  name: -> @class

instance = new Class
eq \class instance.class
eq \class instance.name!

#Classes with methods that are pre-bound to the instance, or statically, to the class
class Dog
  (name) ->
    @name = name

  bark: ~>
    "#{@name} woofs!"

  @static = ~>
    new this('Dog')

spark = new Dog('Spark')
fido  = new Dog('Fido')
fido.bark = spark.bark

eq 'Spark woofs!' fido.bark!

obj = func: Dog.static

eq 'Dog' obj.func!name

#a bound function in a bound function
class Mini
  num: 10
  generate: ~>
    for i in [1 to 3]
      ~>
        @num

m = new Mini
eq '10 10 10' [func! for func in m.generate!].join ' '


#contructor called with varargs
class Connection
  (one, two, three) ->
    [@one, @two, @three] = [one, two, three]

  out: ->
    "#{@one}-#{@two}-#{@three}"

list = [3, 2, 1]
conn = new Connection ...list
ok conn instanceof Connection
ok '3-2-1' conn.out!

#calling super and passing along all arguments
class Parent
  method: (...args) -> @args = args

class Child extends Parent
  method: -> super ...

c = new Child
c.method 1, 2, 3, 4
eq '1 2 3 4' c.args.join ' '

#classes wrapped in decorators
func = (klass) ->
  klass::prop = 'value'
  klass

func class Test
  prop2: 'value2'

eq 'value'  (new Test).prop
eq 'value2' (new Test).prop2

# anonymous classes
obj =
  klass: class
    method: -> 'value'

instance = new obj.klass
eq \value instance.method!

#Implicit objects as static properties
class Static
  @static =
    one: 1
    two: 2

eq 1 Static.static.one
eq 2 Static.static.two

#nothing classes
c = class
ok c instanceof Function

#classes with static-level implicit objects
class A
  @static = one: 1
  two: 2

class B
  @static = one: 1, two: 2

eq A.static.one, 1
eq A.static.two, undefined
eq (new A).two, 2

eq B.static.one, 1
eq B.static.two, 2
eq (new B).two, undefined

#classes with value'd constructors
counter = 0
classMaker = ->
  inner = ++counter
  ->
    @value = inner

class One
  constructor$$: classMaker!

class Two
  constructor$$: classMaker!

eq 1 (new One).value
eq 2 (new Two).value
eq 1 (new One).value
eq 2 (new Two).value

#exectuable class bodies
class A
  if true
    b: 'b'
  else
    c: 'c'

a = new A

eq \b a.b
eq void a.c

#mild metaprogramming
class Base
  @attr = (name) ->
    @::[name] = (val) ->
      if arguments.length > 0
        @["_#{name}"] = val
      else
        @["_#{name}"]

class Robot extends Base
  @attr 'power'
  @attr 'speed'

robby = new Robot

eq void robby.power!

robby.power 11
robby.speed Infinity

eq 11 robby.power!
eq Infinity, robby.speed!

# FAIL
#namespaced classes do not reserve their function name in outside scope
/*
let
  one = {}
  two = {}

  class one.Klass
    @label = "one"

  class two.Klass
    @label = "two"

eq typeof Klass, 'undefined'
eq one.Klass.label, 'one'
eq two.Klass.label, 'two'
*/

#nested classes
class Outer
  ->
    @label = 'outer'

  class @Inner
    ->
      @label = 'inner'

eq \outer (new Outer).label
eq \inner (new Outer.Inner).label

#variables in constructor bodies are correctly scoped
class A
  x = 1
  ->
    x := 10
    y = 20
  y = 2
  captured: ->
    {x, y}

a = new A
eq 10 a.captured!x
eq 2 a.captured!y

#Issue #924: Static methods in nested classes
class A
  @B = class
    @c = -> 5

eq 5 A.B.c!

#`class extends this`
class A
  func: -> 'A'

B = null
makeClass = ->
  B := class extends this
    func: -> (super ...) + ' B'

makeClass.call A

eq 'A B' (new B!).func!

#ensure that constructors invoked with splats return a new object
args = [1, 2, 3]
Type = (@args) ->
type = new Type args

ok type and type instanceof Type
ok type.args and type.args instanceof Array
for v, i in type.args then eq v, args[i]

Type1 = (@a, @b, @c) ->
type1 = new Type1 ...args

ok type1 instanceof   Type1
eq type1.constructor, Type1
ok type1.a is args[0] and type1.b is args[1] and type1.c is args[2]

# Ensure that constructors invoked with splats cache the function.
called = 0
get = -> if called++ then false else class Type
new get() ...args

#`new` shouldn't add extra parens
eq new Date!constructor, Date

# FAIL
# doesn't implicitly return
#`new` works against bare function
/*
eq Date, new ->
  eq this, new ~> this
  Date
*/

#1182: a subclass should be able to set its constructor to an external function
ctor = ->
  @val = 1
class A
class B extends A
  constructor$$: ctor
eq 1 (new B).val

#1182: external constructors continued
ctor = ->
class A
class B extends A
  method: ->
  constructor$$: ctor
ok B::method

#1313: misplaced __extends
nonce = {}
class A
class B extends A
  prop: nonce
  ->
eq nonce, B::prop

#1182: execution order needs to be considered as well
counter = 0
makeFn = (n) -> eq n, ++counter; ->
class B extends (makeFn 1)
  @B = makeFn 2
  constructor$$: makeFn 3

#1182: external constructors with bound functions
fn = ->
  {one: 1}
  this
class B
class A
  constructor$$: fn
  method: ~> this instanceof A
ok (new A).method.call(new B)

#1372: bound class methods with reserved names
class C
  delete: ~>
ok C::delete

#1380: `super` with reserved names
class C
  do: -> super ...
ok C::do

class B
  0: -> super ...
ok B::[0]

#1464: bound class methods should keep context
nonce  = {}
nonce2 = {}
class C
  (@id) ->
  @boundStaticColon = ~> new this(nonce)
  @boundStaticEqual = ~> new this(nonce2)
eq nonce,  C.boundStaticColon().id
eq nonce2, C.boundStaticEqual().id

#1009: classes with reserved words as determined names
(->
  # had to modify from using word boundaries because we use the $ and CS uses _
  b = '[^a-zA-Z$]'
  ok //#{b}eval#b//.test 'function eval(){}'
  ok not //#{b}eval#b//.test 'function $eval(){}'
  eq 'function' typeof (class @for)
  ok not //#{b}eval#b//.test (class @eval).toString!
  ok not //#{b}arguments#b//.test (class @arguments).toString!
).call {}

#1482: classes can extend expressions
id = (x) -> x
nonce = {}
class A then nonce: nonce
class B extends id A
eq nonce, (new B).nonce

#1598: super works for static methods too
class Parent
  method: ->
    'NO'
  @method = ->
    'yes'

class Child extends Parent
  @method = ->
    'pass? ' + super ...
eq 'pass? yes' Child.method!

#1842: Regression with bound functions within bound class methods
class Store
  @bound = ~>
    do ~>
      eq this, Store

Store.bound!

# And a fancier case:

class Store

  eq this, Store

  @bound = ~>
    do ~>
      eq this, Store

  @unbound = ->
    eq this, Store

  instance: ~>
    ok this instanceof Store

Store.bound!
Store.unbound!
(new Store).instance!

#1876: Class @A extends A
class A
class @A extends A

ok (new @A) instanceof A

#1813: Passing class definitions as expressions
ident = (x) -> x

result = ident class A then x = 1

eq result, A

result = ident class B extends A
  x = 1

eq result, B

#1966: external constructors should produce their return value
ctor = -> {}
class A then constructor$$: ctor
ok (new A) not instanceof A

#1980: regression with an inherited class with static function members
class A

class B extends A
  @static = ~> 'value'

eq \value B.static!

## NOTE: this test is actually supposed to be after the following one, but INDENT DEDENT aren't added after class A for some reason if it is after and it fails to compile - very weird 
#2052: classes should work in strict mode
try
  do ->
    'use strict'
    class A
catch
  ok 0

#1534: class then 'use strict'
# [14.1 Directive Prologues and the Use Strict Directive](http://es5.github.com/#x14.1)
throws = ->
  try it!
    ok 0
  catch
    ok 1
does-not-throw = ->
  try it!
    ok 1
  catch
    ok 0
nonce = {}
error = 'do -> ok this'
strictTest = "do ->'use strict';#{error}"

eq (try LiveScript.run strictTest, bare: yes catch e then nonce),  nonce

throws -> LiveScript.run "class then 'use strict';#{error}", bare: yes
does-not-throw -> LiveScript.run "class then #{error}", bare: yes
does-not-throw -> LiveScript.run "class then #{error};'use strict'", bare: yes

# comments are ignored in the Directive Prologue
comments =
  """
  class
    /* comment */
    'use strict'
    #{error}"""
  """
  class
    /* comment 1 */
    /* comment 2 */
    'use strict'
    #{error}"""
  """
  class
    /* comment 1 */
    /* comment 2 */
    'use strict'
    #{error}
    /* comment 3 */"""
for comment in comments
  throws (-> LiveScript.run comment, bare: yes)

# [ES5 §14.1](http://es5.github.com/#x14.1) allows for other directives
directives =
  """
class
  'directive 1'
  'use strict'
  #{error}"""
  """
  class
    'use strict'
    'directive 2'
    #{error}"""
  """
  class
    /* comment 1 */
    'directive 1'
    'use strict'
    #{error}"""
  """
  class
    /* comment 1 */
    'directive 1'
    /* comment 2 */
    'use strict'
    #{error}"""

for directive, i in directives
  throws (-> LiveScript.run directive, bare: yes)
