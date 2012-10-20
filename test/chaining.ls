# Basic chained function calls.
identityWrap = (x) -> -> x
eq true, identityWrap(identityWrap(true))()()


# Chained accesses split on dot + newline, backwards and forwards.
$ = {}
$.self = $
$.begin = $.do = $.end = -> this

ok $.
  begin().
     do().
   self.
     self.
  end().
self

# Leading dots introduce dummy blocks and/or close implicit indentations.
r = $.self
     .begin()
       .do()
       .do -> 0; 1
       .begin()
         .do ->
            2
            3
       .end 4, ->
     .end()
eq r, $


# Paren-free method chains
eq \56, if \0 is 10.toString 2 .slice 3
  \4 .replace /\d/ 5 .concat 6

eq 1,
  Array 0, 1 ?.1


# Ensure that indented array literals don't trigger whitespace rewriting.
eq 2 [
  [[[[],
     []],
  [[]]]],
[]].length


eq 'Hello', String(
              """
              Hello
              """)


eq msg = 'special accessors should also continue lines',
   msg
   .~toString
   ?.valueOf()()
eq 0,
  [0]
  ?.0


# Bracketless Accesses
a = [0]
eq 0, a.0
eq 0, a."0"
eq 0, a."#{0}"
eq 0, a.(0)
eq 0, [a].0.0
eq a.* = 1, a.1
eq '0'.0, '10'.1

eq 1, [-> it]. 0  1
eq 1, [-> it].'0' 1


# `prototype` shorthand, `constructor` 
eq Array::toString, Array.prototype.toString
eq 12345.constructor.toString, 123.constructor.toString
eq 0 (:::0)::
eq 0 (constructor:0)constructor


# Length Star
a = [[1], 2, 3]
eq 3, a[*-1]
eq 1, a[0][*-*]
eq 2, a[--*-1]
eq 2, a.length

compileThrows 'stray star' 1 '[*-1]'


# Binding Access
parent =
  child:
    method: -> @member
    member: 42
eq 42, do(0; parent.child.~method)
eq 42, do(0; parent.child~"me#{'th'}od")
eq 42, parent.child. ~ [\method] null
eq 42, parent.child.~{method}.method!

compileThrows 'invalid assign' 1 'o~m=g'


# Dots have to workaround syntax error when accessing a simple number.
eq '0 .go;'  , LiveScript.compile '0.go', {+bare}
# Brackets don't.
eq "0['do'];", LiveScript.compile '0.do', {+bare}


# Array/Object Slice
eq '2,3', '' + [3,2][1,0]
eq '2,3', '' + [0,1,2,3][*-2,*-1]
eq '2,3', '' + {2,3}<[2 3]>
eq '-Infinity,Infinity', '' + Number[\NEGATIVE_INFINITY, \POSITIVE_INFINITY]

k = \y
o = {\x \y \z}{x, (k), 2: z}
eq \x o.x
eq \y o.y
eq \z o.2

a = [0 1 2][[0 1], {2}]
eq '0,1' ''+a.0
eq '0,1' ''+a[...0]
eq 2 a.1.2

compileThrows 'calling a slice' 1 'a{0}()'

compileThrows 'empty slice' 1 'o{}'
compileThrows 'empty slice' 1 'o[,,]'

if 0 then @front{ne,ss}

x = 3
y = 1
l = [1 to 5]
eq '2,3,4' "#{ l[1 to  x] }"
eq '2,3'   "#{ l[1 til x] }"

eq '2,3,4' "#{ l[y to  3] }"
eq '2,3'   "#{ l[y til 3] }"

eq '2,3,4' "#{ l[y to  x] }"
eq '2,3'   "#{ l[y til x] }"

eq '3,4,5' "#{ l[2 til] }"
eq '1,2'   "#{ l[til 2] }"

z = 2
eq '3,4,5' "#{ l[z til] }"
eq '1,2'   "#{ l[til z] }"

eq '1,2,3,4,5' "#{ l[to] }"

eq '1,2,3' "#{ l[til -2] }"
eq '2,3' "#{ l[1 til -2] }"

eq '1,2,3,4,5' "#{ l[to  -1] }"
eq '1,2,3,4'   "#{ l[til -1] }"

# splice
l = [1 to 5]
x = 3
eq '8,9' "#{ l[2 to x] = [8 9] }"
eq '1,2,8,9,5' "#{ l }"

y = -> 2
l = [1 to 5]
eq '8,9' "#{ l[y! til 4] = [8 9] }"
eq '1,2,8,9,5' "#{ l }"

l = [1 to 5]
eq '8,9' "#{ l[2 to 3] = [8 9] }"
eq '1,2,8,9,5' "#{ l }"

# Automatic Dot Insertion
eq @toString, @\toString
eq @toString, @"to#{\S}tring"

{ok}\ok 1
[ok]0 1

eq 0 [[0]]0.0

eq null [null]?0
eq void {0}?1?p

v = void
x = y: {\z}
eq void v?=y.z
eq void v
eq \z   x?=y.z
eq \z   x


# Semiautovivification
o = {}
o.@a.@@b .push 0 1
o.a@c@@d .push 2 3
o?.@a?.@@b?@e?@@f.4 = 5
eq '0,1' ''+o.a.b
eq '2,3' ''+o.a.c.d
eq 5 o.a.b.e.f.4


# Bang Call
eq '' String!
(-> ok true)!

f = -> null
eq null f?!
eq void f!?p

f = void
eq void f?!
