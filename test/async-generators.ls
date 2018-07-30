do ->
  ag = ->>*
    yield await Promise.resolve 1
    yield await Promise.resolve 2
  ai = ag!
  ai.next!then -> eq 1 it.value
  ai.next!then -> eq 2 it.value
  ai.next!then -> ok it.done

do ->
  ag = ->>*
    let x = 1
      yield await Promise.resolve x
      yield await Promise.resolve 2*x
  ai = ag!
  ai.next!then -> eq 1 it.value
  ai.next!then -> eq 2 it.value
  ai.next!then -> ok it.done

do ->
  async function* ag
    yield await Promise.resolve 1
    yield await Promise.resolve 2
  ai = ag!
  ai.next!then -> eq 1 it.value
  ai.next!then -> eq 2 it.value
  ai.next!then -> ok it.done

# yield from
do ->
  first = !->>*
    i = await Promise.resolve 0
    loop => yield i++
  second = !->>* yield from first!
  list = second!
  for let i to 3 then list.next!then -> eq it.value, i

# This tests that yield and await still work inside the generated closure.
do ->
  ag = ->>* [i = 0] ++ while i < 3 then yield await Promise.resolve i++
  ai = ag!
  ai.next!   .then -> eq 0 it.value
  ai.next 10 .then -> eq 1 it.value
  ai.next 20 .then -> eq 2 it.value
  ai.next 30 .then ->
    ok it.done
    eq '0,10,20,30' ''+it.value

# This tests that the inner function clears both the async and generator flags
# for the closure that is generated within it.
do ->
  ag = ->>* -> [i = 0] ++ while i < 3 then i++
  ai = ag!
  ai.next!then ->
    ok it.done
    eq '0,0,1,2' ''+it.value!
