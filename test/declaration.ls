### `export`
out = exports ? this
{random} = Math

a = random!
export a
eq out.a, a
eq do
  export b = random!
  out.b

export class C
  @d = random!
  export @d, @e = random!
ok new out.C instanceof C
eq out.d, C.d
eq out.e, C.e

export function f
  g
export
  function g then h
  function h then f
eq out.f!, g
eq out.g!, h
eq out.h!, f

export
  I: i = random!
  J: j = random!
eq out.I, i
eq out.J, j

o = k: random!
export do -> o
eq out.k, o.k


### `const`
let
  const a = 1
  const b = 2, c = 3
  const
    d = 4
    [e, f] = [5, 6]
  export const g = 7
  export
    const h = 8
    const i = 9
  eq '1,2,3,4,5,6,7,8,9' ''+[a, b, c, d, e, f, g, h, i]
  eq out.g, g
  eq out.h, h
  eq out.i, i

compileThrows 'redeclaration of constant "a"' 2 '''
  const a = 0
  a = 1
'''
compileThrows 'redeclaration of constant "a"' 2 '''
  a = 2
  const a = 3
'''
compileThrows 'redeclaration of constant "a"' 2 '''
  const a = 4
  function a then 5
'''
compileThrows 'assignment to constant "a"' 2 '''
  const a = 6
  -> a := 7
'''
compileThrows 'increment of constant "a"' 2 '''
  const a = 8
  ++a
'''
compileThrows 'invalid constant variable declaration' 2 'const\n a'


### `var`
let
  var a
  var b, c
  var
    d
    e
  ok a is b is c is d is e is void
  eq void var f

compileThrows 'invalid variable declaration' 2 'var\n  0'
compileThrows 'redeclaration of "a"'         2 '(a) ->\n  var a'
compileThrows 'empty var'                    2 '\nvar'


### with const flag
throws 'redeclaration of constant "z" on line 2' ->
  LiveScript.compile 'z = 1\nz = 2' {+\const}
throws 'increment of constant "z" on line 2'  ->
  LiveScript.compile 'z = 9\nz++'   {+\const}
throws 'assignment to constant "z" on line 2' ->
  LiveScript.compile 'z = 1\nz := 2' {+\const}

eq '''(function(n){
  n == null && (n = 2);
  return n + 1;
});''' LiveScript.compile '(n = 2) -> n + 1' {+\const, +bare}

eq '''var ref$;
1 < 2 && 2 === (ref$ = 4 / 2) && ref$ > 0;''' LiveScript.compile '1 < 2 == 4/2 > 0' {+\const, +bare}
