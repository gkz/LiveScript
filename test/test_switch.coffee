num = 10

result = switch num
case 5 then false
case 'a'
  true
  true
  false
case 10 then true


  # Mid-switch comment with whitespace
  # and multi line
case 11 then false
default false

ok result


func = (num) ->
  switch num
  case 2, 4, 6
    true
  case 1, 3, 5
    false

ok func(2)
ok func(6)
ok !func(3)
eq func(8), undefined


ok (switch "words"
case (<[ nonbare words ]>) then false
case  <[    bare words ]>  then true
default false
), '`case`s can take bare arrays'


# Should be able to handle switches sans-condition.
result = switch
case null                    then 0
case !1                      then 1
case '' not in {''}          then 2
case [] not instanceof Array then 3
case true is false           then 4
case 'x' < 'y' > 'z'         then 5
case 'a' of  <[ b c ]>       then 6
case 'd' of (<[ e f ]>)      then 7
default ok
eq result, ok


# Should be able to use "@properties" within the switch clause.
obj = {
  num: 101
  func: ->
    switch @num
    case 101 then '101!'
    default 'other'
}

ok obj.func() is '101!'


# Should be able to use "@properties" within the switch cases.
obj = {
  num: 101
  func: (yesOrNo) ->
    result = switch yesOrNo
    case true then @num
    default 'other'
    result
}

ok obj.func(true) is 101
