out = exports ? this
{random} = Math

a = random!
export a
export b = random!
eq out.a, a
eq out.b, b

export class C
  @d = random!
  export @d, @e = random!
ok new out.C instanceof C
eq out.d, C.d
eq out.e, C.e

export function f
  g
export
  function g then h
  function h then f
eq out.f!, g
eq out.g!, h
eq out.h!, f

export
  I: i = random!
  J: j = random!
eq out.I, i
eq out.J, j

o = k: random!
export do -> o
eq out.k, o.k
