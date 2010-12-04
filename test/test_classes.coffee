# Test classes with a four-level inheritance chain.
class Base
  func: (string) ->
    "zero/#{string}"

  @static = (string) ->
    "static/#{string}"

class FirstChild extends Base
  func: -> super('one/') + it

SecondChild = class extends FirstChild
  func: -> super('two/') + it

thirdCtor = -> @array = [1, 2, 3]

class ThirdChild extends SecondChild
  -> thirdCtor ...

  # Gratuitous comment for testing.
  func: -> super('three/') + it

eq (new ThirdChild).func('four'), 'zero/one/two/three/four'
eq Base.static('word'), 'static/word'

FirstChild::func = -> super('one/').length + it

eq (new ThirdChild).func('four'), '9two/three/four'
eq (new ThirdChild).array.join(' '), '1 2 3'


class TopClass
  -> @prop = 'top-' + it

class SuperClass extends TopClass
  -> super.call this, 'super-' + it

class SubClass extends SuperClass
  -> super.call this, 'sub'

eq (new SubClass).prop, 'top-super-sub'


class OneClass
  @new = 'new'
  function: 'function'
  (@name) ->

class TwoClass extends OneClass then -> super ...

Function::new = -> new this ...arguments

eq TwoClass.new('three').name, 'three'
eq (new OneClass).function, 'function'
eq OneClass.new, 'new'

delete Function::new


# And now the same tests, but written in the manual style:
Base = ->
Base::func = (string) ->
  'zero/' + string
Base::['func-func'] = (string) ->
  "dynamic-#{string}"

FirstChild  = ->
SecondChild = ->
ThirdChild  = ->
  @array = [1, 2, 3]
  this

ThirdChild extends SecondChild extends FirstChild extends Base

FirstChild::func = (string) ->
  super('one/') + string
SecondChild::func = (string) ->
  super('two/') + string
ThirdChild::func = (string) ->
  super('three/') + string

eq new ThirdChild().func('four'), 'zero/one/two/three/four'
eq new ThirdChild()['func-func']('thing'), 'dynamic-thing'


TopClass = (arg) ->
  @prop = 'top-' + arg
  this

SuperClass = (arg) ->
  super.call this, 'super-' + arg
  this

SubClass = ->
  super.call this, 'sub'
  this

SuperClass extends TopClass
SubClass extends SuperClass

eq (new SubClass).prop, 'top-super-sub'


# '@' referring to the current instance, and not being coerced into a call.
class ClassName
  amI: ->
    @ instanceof ClassName

obj = new ClassName
ok obj.amI()


# super() calls in constructors of classes that are defined as object properties.
class Hive
  (@name) ->

class Hive.Bee extends Hive
  (name) -> super ...

maya = new Hive.Bee 'Maya'
eq maya.name, 'Maya'


# Class with JS-keyword properties.
class Class
  class: 'class'
  name: -> @class

instance = new Class
eq instance.class, 'class'
eq instance.name(), 'class'


# Static method as a bound function.
class Dog
  (@name) ->
  @static = => new this 'Dog'

eq {func: Dog.static}.func().name, 'Dog'


# A bound function in a bound method.
class Mini
  ->
    @generate = =>
      for i from 1 to 3 then do => => @num * i
  num: 10

eq (func() for func of new Mini().generate()) + '', '10,20,30'


# Testing a contructor called with varargs.
class Connection
  (one, two, three) ->
    [@one, @two, @three] = [one, two, three]

  out: ->
    "#{@one}-#{@two}-#{@three}"

list = [3, 2, 1]
conn = new Connection ...list
ok conn instanceof Connection
eq conn.out(), '3-2-1'


# Test calling super and passing along all arguments.
class Parent
  method: (...args) -> @args = args

class Child extends Parent
  method: -> super ...

c = new Child
c.method 1, 2, 3, 4
eq c.args.join(' '), '1 2 3 4'


# Test classes wrapped in decorators.
func = (klass) ->
  klass::prop = 'value'
  klass

func class Test
  prop2: 'value2'

eq (new Test).prop , 'value'
eq (new Test).prop2, 'value2'


# Test anonymous classes.
obj =
  klass: class
    method: -> 'value'

instance = new obj.klass
eq instance.method(), 'value'


# Implicit objects as static properties.
class Static
  @static =
    one: 1
    two: 2

eq Static.static.one, 1
eq Static.static.two, 2


# Nothing classes.
ok class instanceof Function

Namespace = {}
Class     = null

# Namespaced but undeclared.
Namespace.Class = class
eq Namespace.Class.name, 'Class'
eq Class, null

# Namespaced and declared.
class Namespace.Class
eq Class, Namespace.Class


class BoundCtor extends (-> {@attr})
  (@attr, ret) =>
    return this if ret
    eq super(...).attr, @attr
    @method = => this

tbc = BoundCtor 'attr'
eq tbc.attr, 'attr'
eq [tbc.method][0](), tbc
eq BoundCtor(8, true).attr, 8


class Importer
  -> this import it
  method1: this
  method2: Array

class NewSuper extends Importer
  -> eq new super({ok}).ok, ok
  method1: -> new super ...

ns = new NewSuper
eq ns.method1({1})[1], 1
eq ns.method2(2).length, 2


throws 'reserved word "in" cannot be a class name'
, -> Coco.compile 'class run.in'


class OddSuper
  me = => this
  super: me
  $uper: me
  1234 : me

class OddSuperSub extends OddSuper
  super: -> super()
  $uper: -> super()
  1234 : -> super()

oss = new OddSuperSub
eq oss.super(), OddSuper
eq oss.$uper(), OddSuper
eq oss[1234](), OddSuper
