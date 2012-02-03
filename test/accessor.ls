return unless {}__defineGetter__ 

v = 'foo'
o =
  key: ~      -> @x
  key: ~ (@x) ->
  (v): ~      -> @y
  (v): ~ (@y) ->
ok 'key' of o
eq 1, o.key = 1
eq 1, o.key
ok 'foo' of o
eq 2, o.foo = 2
eq 2, o.foo

o <<< a:~ -> 1
eq 1, o.a

:: =
  p:~      -> @z
  p:~ (@z) ->
class C extends {::}
  sup = super::
  p:~     -> sup.__lookupGetter__(\p)call this
  p:~ (z) -> sup.__lookupSetter__(\p)call this, z
c = new C
eq c.p = 3, c.p
ok c.hasOwnProperty \z

throws 'excess accessor parameter on line 1' -> LiveScript.compile 'p:~ (a, b) ->'

throws 'named accessor on line 1' -> LiveScript.compile 'p:~ ~function f then'

# No implicit parameter on getter.
eq '''({
  get p(){
    return it;
  }
});''' LiveScript.compile 'p:~ -> it' {+bare}
