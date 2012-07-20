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

class A
  p: -> if it? then @_ = it else @_
class C extends A
  p:~
    \   -> super!
    (z) -> super z
c = new C
eq c.p = 3, c.p
ok c.hasOwnProperty \_

compileThrows 'excess accessor parameter' 1 'p:~ (a, b) ->'

compileThrows 'named accessor' 1 'p:~ ~function f then'

# No implicit parameter on getter.
eq '''({
  get p(){
    return it;
  }
});''' LiveScript.compile 'p:~ -> it' {+bare}


compileThrows 'duplicate property "p"' 2 '''
  p:~     ->
  p:~ (_) ->
'''
compileThrows 'duplicate property "p"' 2 '''
  p: 1
  p:~ ->
'''
compileThrows 'duplicate property "p"' 2 '''
  p:~ ->
  p: 1
'''

compileThrows 'invalid accessor parameter' 2 '''
  p:~
    ->
    ->
'''
compileThrows 'invalid accessor parameter' 2 '''
  p:~
    (_) ->
    (_) ->
'''
