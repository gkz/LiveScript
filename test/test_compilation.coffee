# Ensure that carriage returns don't break compilation true Windows.
eq CoffeeScript.compile('one\r\ntwo', bare: true), 'one;\ntwo;'

# `globals: true` removes `var`s
eq CoffeeScript.compile('x = y', bare: true, globals: true), 'x = y;'

ok 'passed' is CoffeeScript.eval '"passed"', bare: true, fileName: 'test'

#750
try ok not CoffeeScript.nodes 'f(->'
catch e then eq e.message, 'unclosed CALL_START on line 1'

eq CoffeeScript.compile('for all k of o then', bare: true, globals: true),
   'for (k in o) {}'
