# Async functions
# -----------------
#
# * Async Function Definition

# async function should return a promise
do ->
  x = ->>
    5

  p = x!
  # Promise.resolve(p) === p iff x is a promise
  # source: http://www.ecma-international.org/ecma-262/6.0/#sec-promise.resolve
  eq Promise.resolve(p), p
  p.then ->
    eq it, 5

# async function as argument
do ->
  ok ->> 1

  # named async function
  ok <| :fn ->> 2


# async function definition
do ->
  x = ->>
    3

  y <- x!then

  eq y, 3

# async function with await
do ->
  x = ->>
    await Promise.resolve(2)

  y <- x!then

  eq y, 2

# async function with await Promise.all
do ->
  x = ->>
    await Promise.all [
      Promise.resolve(3)
      Promise.resolve(4)
    ]

  y <- x!then

  eq y.length, 2
  eq y[0], 3
  eq y[1], 4

# async function calling other async functions
do ->
  z = ->>
    5

  x = ->>
    2 + await z()

  y <- x!then

  eq y, 7

# async function with await in for loop
do ->
  z = (x) ->>
    Promise.resolve(x * 2)

  x = ->>
    output = 0
    for i from 2 to 5
      output += await z(i)
    output

  y <- x!then

  eq y, 28

# async function with await in list comprehension
do ->
  x = ->>
    [await Promise.resolve(i) for i from 2 til 5]

  y <- x!then

  eq y.length, 3
  eq y[0], 2
  eq y[1], 3
  eq y[2], 4

# async function awaiting on a callback-based function
do ->
  y = (callback) ->
    callback(6)

  x = ->>
    2 + await new Promise ->
      y(it)

  y <- x!then

  eq y, 8

# async functions with do
do ->
  y <- (do ->> 9).then

  eq y, 9

# nested async functions
do ->
  x = ->>
    2 + await do ->>
      6 + await do ->>
        5 + await do ->>
          3

  y <- x!then

  eq y, 16

# async function name(arglist) syntax
do ->
  async function x(n, m)
    5 + n + m

  y <- x(3, 4).then

  eq y, 12

# hushed async functions should still return Promises, but they shouldn't be implicitly fulfiled with the value of the body
do ->
  x = !->>
    5

  p = x!
  eq Promise.resolve(p), p

  p.then ->
    eq it, undefined

# curried async function
do ->
  x = (n, m) -->>
    5 + n + m

  y <- x(2)(3).then

  eq y, 10

# curried async function used with normal function call syntax
do ->
  x = (n, m) -->>
    5 + n + m

  y <- x(4, 6).then

  eq y, 15

# unbound async function
do ->
  obj = new
    @x = 3
    @unbound = ->>
      @x
  obj2 = x: 5
  obj2.unbound = obj.unbound
  y <- obj2.unbound!then
  eq y, 5

# bound async function
do ->
  obj = new
    @x = 3
    @bound = ~>>
      @x
  obj2 = x: 5
  obj2.bound = obj.bound
  y <- obj2.bound!then
  eq y, 3

# [LiveScript#1019](https://github.com/gkz/LiveScript/issues/1019)
# in `let` blocks
do ->
  x = ->>
    let a = Promise.resolve 1
      await a

  y <- x!then!
  eq y, 1

# [LiveScript#1021](https://github.com/gkz/LiveScript/issues/1021)
# in for..let loops
do ->
  x = ->>
    for let v in [Promise.resolve 1; Promise.resolve 2]
      await v

  y <- x!then!
  eq "#y" '1,2'

# [LiveScript#1023](https://github.com/gkz/LiveScript/issues/1023)
# Loop guards (`when`, `case`, `|`) didn't work with `for..let` loops with `yield` in their bodies
do ->
  x = (keys) ->>
    pr = Promise~resolve
    obj = {a: pr 1; b: pr 2; c: pr 3}
    for own let k, v of obj when k in keys
      await v

  y <- x(<[ a c ]>).then!
  eq "#y", '1,3'
