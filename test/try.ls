n = 1
try
  n *= 2
  throw \error
  n *= 3
catch error
  n *= 5
finally
  n *= 7
eq n, 70

# Hoist `catch`ee.
eq error, \error


# Allow one-liners.
try x = 0 catch _ then ok false finally ++x
eq x, 1


# Declare `e` by default.
try throw 0 catch
eq e, 0


# Return results.
eq 1 let
  try 1
  finally 2

eq 2 let
  try throw 1
  catch then 2
  finally 3

eq 3 try 3

eq 4 try throw 4 catch


# Tolerate empty blocks.
try

try catch

try finally

try catch then finally

try
  #!nothing
catch then
  #!nothing
finally
  #!nothing


# Tolerate nested implicit blocks.
eq 1, do -> try 1
eq 2, do -> try do -> throw 1 catch then do -> 2 finally


# Destructure
try
  throw {msg: 'error', val: 99}
catch {msg, val}
  eq \error msg
  eq 99 val


# Call result
f = (x) -> x
r = f try
  throw 0
catch
  10
eq 10 r
