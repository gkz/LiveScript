# Async functions
# -----------------
#
# * Async Function Definition

# async function as argument
ok ->> 1

# named async function
ok <| :fn ->> 2

# async function definition
x = ->>
  3

y <- x!then

eq y, 3

# async function with await

x = ->>
  await Promise.resolve(2)

y <- x!then

eq y, 2

# async function with await Promise.all

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

z = ->>
  5

x = ->>
  2 + await z()

y <- x!then

eq y, 7

# async function with await in for loop

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

x = ->>
  [await Promise.resolve(i) for i from 2 til 5]

y <- x!then

eq y.length, 3
eq y[0], 2
eq y[1], 3
eq y[2], 4

# async function awaiting on a callback-based function

y = (callback) ->
  callback(6)

x = ->>
  2 + await new Promise ->
    y(it)

y <- x!then

eq y, 8

# async functions with do

y <- (do ->> 9).then

eq y, 9

# nested async functions

x = ->>
  2 + await do ->>
    6 + await do ->>
      5 + await do ->>
        3

y <- x!then

eq y, 16
