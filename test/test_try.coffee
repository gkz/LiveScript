# Basic exception throwing.
throws 'up', -> throw Error 'up'


# Basic try/catch.
result = try
  10
finally
  15

ok result is 10

result = try
  throw 'up'
catch err
  err.length

ok result is 2


result = try throw 'error' catch err then err.length

ok result is 5

try throw 'catch is optional'

# try/catch with empty clauses still compiles.
try

try
finally

try
  # nothing
finally
  # nothing

eq 99, do -> try 99
