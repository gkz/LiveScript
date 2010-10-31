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


# Ensure that trailing switch elses don't get rewritten.
result = false
switch "word"
case "one thing"
  doSomething()
default
  result = true unless false

ok result

result = false
switch "word"
case "one thing"
  doSomething()
case "other thing"
  doSomething()
default
  result = true unless false

ok result


# Should be able to handle switches sans-condition.
result = switch
case null then 1
case 'truthful string' then 2
default 3

ok result is 2


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
