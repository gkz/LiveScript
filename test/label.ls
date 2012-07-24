r = ''
:PLAIN
  :WHILE while r.length < 9
    break PLAIN if r.length > 1
    :FOR for i til 2
      r += i
      continue WHILE
  ok 0
eq r, \00

eq void, :if 1
  switch
    break _
  true

r = :outer
  :inner break inner
  break outer if false
  1
eq r, 1

compileThrows   'unknown label "a"' 1 'break a'
compileThrows 'duplicate label "b"' 2 '''
  :b
    :b break b
'''
