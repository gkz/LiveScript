switch 10
case 5 then ok 0
case 'a'
  true
  false
  ok 0
case 10 then ok 1

  #! Mid-switch comment with whitespace

    #! and multi line
case 11 then ok 0
default ok 0


func = (num) ->
  switch num
  case 2, 4, 6
    Boolean true
  case [1, 3, 5]
    Boolean false
  default
eq func(2), true
eq func(6), true
eq func(3), false
eq func(8), void


# One-liner
eq void, switch case 1 then break
eq 1   , switch case 0 then break default 1
eq 2   , switch case 1 then (while 0 then continue); 2
eq 3   , do -> switch -> 0 case 1 then -> 2 default 3


throws 'inconvertible statement on line 3' -> LiveScript.compile '''
  for ever
    !switch
      continue
'''


ok switch \words
  case (<[ nonbare words ]>) then false
  case  <[    bare words ]>
    switch Function::toString
    case ok<[valueOf toString]> then true
, '`case` expands bare arrays'


# Sans-topic
eq ok, switch
case null                    then 0
case !1                      then 1
case '' not of {''}          then 2
case [] not instanceof Array then 3
case true is false           then 4
case 'x' < 'y' > 'z'         then 5
case 'a' in  <[ b c ]>       then 6
case 'd' in (<[ e f ]>)      then 7
default ok


eq '''
var that;
switch (false) {
case !1:
  return;
case !2:
  throw me;
case !3:
  break;
case !4:
  // fallthrough
case !(that = 5):
  that;
  break;
case !(6 || 7 || 8):
  break;
case !void 8:
  break;
default:
  9;
}
''', LiveScript.compile '''
switch
case 1 then return
case 2 then throw me
case 3 then break
case 4 then fallthrough
case 5 then that
case 6 [7 8] then
case[] then
default 9
''', {+bare}


# `that`
eq 1, switch 1 case 1 then that

while 1
  eq 3, switch 3 case 3 then that
  break

switch case [0, 2, 4,] then eq 2, that


# Sans-condition
switch
  ok 1 'caseless switch is allowed'
  break if true
  ok 0 'for early breaking'

# case |
switch
| false then ok 0 | false then ok 0
| false
  ok 0
| true 
  ok 1
| true  then ok 0

# then =>
switch 
| false => ok 0
| false =>
  ok 0
| true  => ok 1
| true  => ok 0

# otherwise
eq otherwise?, false

switch
| false     => ok 0
| otherwise => ok 1

switch 2 + 3
case 6 then ok 0
case otherwise then ok 1

# implicit switches
boom1 = ->
  case false => 1
  case otherwise => 2

  3

eq 3 boom1!

do ->
  | false => ok 0
  | true => ok 1

do ~>
  | false => ok 0
  | true => ok 1

boom2 = ->
  | false => 1
  | otherwise => 2

  3

eq 3 boom2!

# when
switch 
when false then ok 0
when true  then ok 1

# else
switch
| false => ok 0
else ok 1
