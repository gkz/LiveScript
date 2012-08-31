t = true

# As implicit argument, nested, and/or one-liner.
eq 1, if yes
  if on
    if no then false else
      if t
        1

ok if 0
  0
else if 0/0
  0/0
else if void
  void
else if null
  null
else true

ok if false then false else if false then false else true
eq 100, Number if false then 300 else 100


# `unless`
eq 1, unless true
  0
else
  1


# Returning if-else.
eq -1, do -> if 1 < 0.5 then 1 else -1


# `else`-less `if` returns `undefined` with falsy condition.
eq void, if 0 then
eq void, do -> if 0 then


# As part of a larger operation.
eq 2, 1 + if false then 10 else 1


# Indented within an assignment.
eq 5, do ->
  a =
    if false
      3
    else
      5
  101
  a


# Unmatched `then` should close implicit calls.
i = 1
if Boolean 1 then ++i
eq i, 2


# Unmatched `else` should close implicit blocks.
eq 2, do -> if 0 then -> 1 else 2


# Outer `then` should skip `else`.
eq 3, if 1 then if 0 then 2 else 3


# With suppressed indentations.
eq 6,
  if 0 then 1 \
       else 2 +
         if 3 then 4 \
         else      5

# With leading `then`.
if 0
then ok false
else
  eq 2, if 1
  then 2
  else 3


# Post-condition should accept trailing non-`if` block.
ok true if ->
ok true if do
   true
ok true if let
   true
ok true if do function f
   true


# [coffee#738](https://github.com/jashkenas/coffee-script/issues/738)
ok if true then -> 1


# [coffee#1026](https://github.com/jashkenas/coffee-script/issues/1026)
throws "Parse error on line 2: Unexpected 'ELSE'", -> LiveScript.ast '''
  if a then b
  else then c
  else then d
'''


eq 2, [if 1 then 2       , 3].0
eq 2, [if 0 then 1 else 2, 3].0


# Compile conditonal expression chains neatly.
eq '''
var r;
r = a
  ? b
  : c
    ? d
    : e();
''' LiveScript.compile '''
r =    if a then b
  else if c then d else e!
''' {+bare}


### Anaphoric `if`
eq '''
var that;
if (1) {
  if (that = 2) {
    if (3) {
      4;
    }
    if (that) {
      5;
    }
  }
}
if ((that = 6) != null) {
  that;
}
''', LiveScript.compile '''
if 1
  if 2
    4 if 3
    5 if that
that if 6?
''', {+bare}

# Soaks should not `that`-aware.
a = [0 1]
if 1
  eq 1 a?[that]

# then =>
if false     => ok 0
else if true => ok 1
else if true =>
  ok 0
else
  ok 0
