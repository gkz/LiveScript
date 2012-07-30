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
try x = 0 catch _ ok false finally ++x
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
  catch 2
  finally 3

eq 3 try 3


# Tolerate empty blocks.
try

try catch

try finally

try catch finally

try
  #!nothing
catch
  #!nothing
finally
  #!nothing


# Tolerate nested implicit blocks.
eq 1, do -> try 1
eq 2, do -> try do -> throw 1 catch do -> 2 finally
