# Test classes with a four-level inheritance chain.
class Base
  func: (string) ->
    "zero/#{string}"

  @static = (string) ->
    "static/#{string}"

class FirstChild extends Base
  func: -> super('one/').concat it

SecondChild = class extends FirstChild
  func: -> (super).call(this, 'two/') + it

thirdCtor = -> @array = [1, 2, 3]

class ThirdChild extends SecondChild
  -> thirdCtor ...

  func: ->
    let it
      # `super` from inner function
      super('three/') + it

eq (new ThirdChild).func('four'), 'zero/one/two/three/four'
eq Base.static('word'), 'static/word'

eq (new ThirdChild).array.join(' '), '1 2 3'


# `extends` operator
First  = ->
Second = ->

Second extends First extends Base

ok new Second(2).func(), 'zero/2'


# `@` referring to the current instance, and not being coerced into a call.
ok (new class I then amI: -> @ instanceof I).amI()


# `super` calls in constructors of classes that are defined as object properties.
Bee       = class then (@name, ...@attributes) ->
Bee.Honey = class extends Bee then -> super ...

bee = new Bee.Honey 'Maya' \adventurous \flighty
eq "#{bee.name} is #{ bee.attributes.join ' and ' }."
 , 'Maya is adventurous and flighty.'


# Test calling super and passing along all arguments.
class Parent
  method: (...args) -> @args = args

class Child extends Parent
  method: -> super ...

c = new Child
c.method 1, 2, 3, 4
eq c.args.join(' '), '1 2 3 4'


# `superclass` injection
let superclass = Object
  eq super, Object


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
  @static = ~> new this 'Dog'

eq {func: Dog.static}.func().name, 'Dog'


# A bound function in a bound method.
class Mini
  ->
    @generate = ~>
      for i from 1 to 3 then let
        ~> @num * i
  num: 10

eq [func() for func in new Mini().generate()] + '', '10,20,30'

# A bound function in a bound method with secondary function syntax
class Mini2
  ->
    @.~generate! =
      for i from 1 to 3 then let
        ~> @num * i
  num: 10

eq [func() for func in new Mini2().generate()] + '', '10,20,30'

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


# Namespaced,
Namespace = {}
Class     = null

# but undeclared.
Namespace.Class = class
eq Namespace.Class.displayName, 'Class'
eq Class, null

# and declared.
class Namespace.Class
eq Class, Namespace.Class


class BoundCtor extends (-> {@attr})
  (@attr, ret) ~>
    return this if ret
    eq super(...).attr, @attr
    @method = ~> this

class BoundChild extends BoundCtor then ~> super ...

for C in [BoundCtor, BoundChild]
  bc = C 'attr'
  eq bc.attr, 'attr'
  eq [bc.method][0](), bc
eq BoundCtor(8, true).attr, 8


class Importer
  -> this import it
  method1: this
  method2: Array

class NewSuper extends Importer
  -> eq new super({ok}).ok, ok
  method1: -> new super it

ns = new NewSuper
eq ns.method1({1})[1], 1
eq ns.method2(2).length, 2


# [coffee#1009](https://github.com/jashkenas/coffee-script/issues/1009)
# Class names are "$"-prefixed when reserved.
new
  class @in
  class @eval
  ok $in?
  ok $eval?


class OddSuper
  super: me = -> this
  $uper: me
  1234 : me
  5.67 : me
  '""' : me

class OddSuperSub extends OddSuper
  super: -> super()
  $uper: -> super()
  1234 : -> do super
  5.67 : -> super 8
  '""' : -> super ...@@

oss = new OddSuperSub
eq oss.super(), oss
eq oss.$uper(), oss
eq oss[1234](), oss
eq oss[5.67](), oss
eq oss['""'](), oss


eq \declared (class declared)displayName
ok declared?

eq \named  (new -> return @named = class)displayName
ok named!? 'should not leak to global when undeclared'


# `super` with nested classes
class Sup
  class @Sub extends this
    eq super, Sup
  method: function
    class extends @constructor
      eq super, Sup
      method: ->
        eq super, method

ok new Sup.Sub instanceof Sup
(new (new Sup!method!))method!


# `prototype`/`constructor`/`superclass` under class body
new class extends Object
  eq ::, prototype
  eq ::, @::
  eq constructor, @
  ok super is superclass is Object
  ->
    eq ::, @constructor::
    eq constructor, @constructor


# `extended` hook
class NameEater
  @subnames = []
  @extended = ->
    eq it.superclass, this
    @subnames.push it.displayName

class A extends NameEater
  (class B) extends NameEater

eq 'A,B' ''+NameEater.subnames


# Line folding around `extends`
class   Inject
extends Object
  class Reject extends
        Object
    ok true


#### `implements`
Mover =
  x: 0, y: 0
  moveTo: (@x, @y) -> this
  moveBy: (dx, dy) -> @x += dx; @y += dy; this

Magnitude =
  lt  : -> ...
  gt  : -> it.lt this
  lte : -> @lt it or @eq it
  gte : -> @gt it or @eq it
  eq  : -> not @neq it
  neq : -> @lt it or @gt it

Measurable =
  lt: -> @measure! < it.measure!

class Point implements Mover
  isAt: -> @x is it.x and @y is it.y

class Rect extends Point implements Magnitude, Measurable
  (@w, @h) ->
  measure: -> @w * @h

r0 = new Rect 2 3
r1 = new Rect 5 7
r0.moveTo 1, 1
r1.moveBy 1, 1
ok r0.isAt r1
ok r0.neq  r1
ok r1.gte  r0
ok r0.eq new Rect 1 6

ok class extends Function '' implements
                               {}
  class
  implements {}
    void


### Clone
bird     = {+wing, fly: -> @wing}
wingless = {-wing}

duck    = ^^bird
dodo    = ^^bird <<< {...wingless, +extinct }
donaldo = ^^duck <<< {...wingless, +domestic}

ok bird.fly()
ok duck.fly()
ok not donaldo.fly()

ok ^^new Number instanceof Number
eq (^^new Number)constructor, Number

# Inherit constructors
class A
  -> @x = 5

class B extends A
  getX: -> @x

eq 5 (new B)getX!

# No body
class C extends B

eq 5 (new C)getX!

class D
  extends C
eq 5 (new D)getX!

# Bound methods are bound to instance not class, 
# however bound static funcs are still bound to class
class G
  ->
    @x = 5
    @y = 6
  getX: -> @x
  getY: ~> @y
  @x = \staticX
  @y = \staticY
  @getStatX = -> @x
  @getStatY = ~> @y

g = new G
obj = x: 0, y: 0
obj{getX, getY} = g
obj{getStatY, getStatX} = G

eq 0 obj.getStatX!
eq \staticY obj.getStatY!

eq 0 obj.getX!
eq 6 obj.getY!

class H extends G

h = new H
obj = x: 0, y: 0
obj{getX, getY} = h

eq 0 obj.getX!
eq 6 obj.getY!

# Inherit static
class A
  @stat = -> 2

class B extends A

eq 2 B.stat!

class C extends B
  @stat = -> 2 + super!

eq 4 C.stat!


# Super outside of class defintions
class A
  meth: -> it + 5
  @stat = -> it + 5

a = new A
eq 10 a.meth 5
eq 10 A.stat 5

class B extends A

b = new B
eq 10 b.meth 5
eq 10 B.stat 5

B::meth = -> super it + 2
B.stat = -> super it + 2

eq 12 b.meth 5
eq 12 B.stat 5

B::meth = (x) ->
  func = ->
    super x + 2
  func!
B.stat = (x) ->
  func = ->
    super x + 2
  func!
eq 12 b.meth 5
eq 12 B.stat 5


# can define external constructor
f = -> @y = @x + it
class A
  x: 8
  constructor$$: f

eq 13 (new A 5).y
