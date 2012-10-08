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

# anonymous classes
obj =
  klass: class
    method: -> 'value'

instance = new obj.klass
eq \value instance.method!

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
