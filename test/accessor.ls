return unless Object.defineProperty

v = \foo
o =
  key:~
    -> @x
    (@x) ->
  (v):~
    (@y) ->
    -> @y
ok \key of o
eq 1, o.key = 1
eq 1, o.key
ok \foo of o
eq 2, o.foo = 2
eq 2, o.foo

o <<< a:~ -> 1
eq 1, o.a

:: =
  p:~
    \    -> @z
    (@z) ->
class C extends {::}
  spd = Object.getOwnPropertyDescriptor super::, \p
  p:~     -> spd.get.call this
  p:~ (z) -> spd.set.call this, z
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


throws 'duplicate property "p" on line 2' -> LiveScript.compile '''
  p:~     ->
  p:~ (_) ->
'''
throws 'duplicate property "p" on line 2' -> LiveScript.compile '''
  p: 1
  p:~ ->
'''
throws 'duplicate property "p" on line 2' -> LiveScript.compile '''
  p:~ ->
  p: 1
'''
throws 'invalid accessor parameter on line 2' -> LiveScript.compile '''
  p:~
    ->
    ->
'''
throws 'invalid accessor parameter on line 2' -> LiveScript.compile '''
  p:~
    (_) ->
    (_) ->
'''
