# Test classes with a four-level inheritance chain.
class Base
  func: (string) ->
    "zero/#{string}"

  @static = (string) ->
    "static/#{string}"

class FirstChild extends Base
  func: (string) ->
    super('one/') + string

SecondChild = class extends FirstChild
  func: (string) ->
    super('two/') + string

thirdCtor = ->
  @array = [1, 2, 3]

class ThirdChild extends SecondChild
  -> thirdCtor.apply this, arguments

  # Gratuitous comment for testing.
  func: (string) ->
    super('three/') + string

result = (new ThirdChild).func 'four'

ok result is 'zero/one/two/three/four'
ok Base.static('word') is 'static/word'

FirstChild::func = (string) ->
  super('one/').length + string

result = (new ThirdChild).func 'four'

ok result is '9two/three/four'

ok (new ThirdChild).array.join(' ') is '1 2 3'


class TopClass
  (arg) ->
    @prop = 'top-' + arg

class SuperClass extends TopClass
  -> super 'super-' + it

class SubClass extends SuperClass
  -> super 'sub'

ok (new SubClass).prop is 'top-super-sub'


class OneClass
  @new = 'new'
  function: 'function'
  (@name) ->

class TwoClass extends OneClass

Function.prototype.new = -> new this arguments...

eq TwoClass.new('three').name, 'three'
eq (new OneClass).function, 'function'
eq OneClass.new, 'new'

delete Function.prototype.new


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
  super 'super-' + arg
  this

SubClass = ->
  super 'sub'
  this

SuperClass extends TopClass
SubClass extends SuperClass

ok (new SubClass).prop is 'top-super-sub'


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
  (name) -> super

maya = new Hive.Bee 'Maya'
ok maya.name is 'Maya'


# Class with JS-keyword properties.
class Class
  class: 'class'
  name: -> @class

instance = new Class
ok instance.class is 'class'
ok instance.name() is 'class'


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
conn = new Connection list...
ok conn instanceof Connection
ok conn.out() is '3-2-1'


# Test calling super and passing along all arguments.
class Parent
  method: (args...) -> @args = args

class Child extends Parent
  method: -> super

c = new Child
c.method 1, 2, 3, 4
ok c.args.join(' ') is '1 2 3 4'


# Test `extended` callback.
class Base
  @extended = (subclass) ->
    for key, value in @
      subclass[key] = value

class Element extends Base
  @fromHTML = (html) ->
    node = "..."
    new @(node)

  (node) ->
    @node = node

ok Element.extended is Base.extended
ok Element.__super__ is Base.prototype

class MyElement extends Element

ok MyElement.extended is Base.extended
ok MyElement.fromHTML is Element.fromHTML
ok MyElement.__super__ is Element.prototype


# Test classes wrapped in decorators.
func = (klass) ->
  klass::prop = 'value'
  klass

func class Test
  prop2: 'value2'

ok (new Test).prop  is 'value'
ok (new Test).prop2 is 'value2'


# Test anonymous classes.
obj =
  klass: class
    method: -> 'value'

instance = new obj.klass
ok instance.method() is 'value'


# Implicit objects as static properties.
class Static
  @static =
    one: 1
    two: 2

ok Static.static.one is 1
ok Static.static.two is 2


# Nothing classes.
c = class
ok c instanceof Function


Namespace = {}
Class     = null

# Namespaced but undeclared.
Namespace.Class = class
eq Namespace.Class.name, 'Class'
eq Class, null

# Namespaced and declared.
class Namespace.Class
eq Class, Namespace.Class
