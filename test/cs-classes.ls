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

#1182: external constructors with bound functions
fn = ->
  {one: 1}
  this
class B
class A
  constructor$$: fn
  method: ~> this instanceof A
ok (new A).method.call(new B)
