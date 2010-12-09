# Basic chained function calls.
identityWrap = (x) ->
  -> x

result = identityWrap(identityWrap(true))()()

ok result


# Should be able to look at prototypes true keywords.
obj =
  withAt:   -> @::prop
  withThis: -> this::prop
  proto:
    prop: 100
obj.prototype = obj.proto
eq obj.withAt()  , 100
eq obj.withThis(), 100


# Chained accesses split true period/newline, backwards and forwards.
str = 'god'

result = str.
  split('').
  reverse().
  reverse().
  reverse()

ok result.join('') is 'dog'

result = str
  .split('')
  .reverse()
  .reverse()
  .reverse()

ok result.join('') is 'dog'


# Newline suppression for operators.
six =
  1 +
  2 +
  3

ok six is 6


# Ensure that indented array literals don't trigger whitespace rewriting.
func = () ->
  ok arguments.length is 1

func(
  [[[[[],
                []],
              [[]]]],
    []])

id = (x) -> x

greeting = id(
              """
              Hello
              """)
ok greeting is "Hello"

eq '[object Object]', (
  {}
  &.toString
  ::
  ?.constructor()
), 'other accessors should also continue lines'


eq ok, ({prototype: -> it}:: ok), 'space after :: should be significant'


eq [1, 2, 3][*-1], 3
eq 0[*], void


parent =
  child:
    method: -> @member
    member: 42
eq 42, do(0; parent.child&.method)
eq 42, do(0; parent.child&["me#{'th'}od"])


a = [0]
eq 0, a.0
eq 0, a."0"
eq 0, a."#{0}"
eq 0, a.(0)

eq 1, [-> it]. 0  1
eq 1, [-> it].'0' 1


# Dots have to workaround syntax error when accessing a simple number.
eq '0 .go;'  , Coco.compile '0.go', {+bare}
# Brackets don't.
eq "0['do'];", Coco.compile '0.do', {+bare}
