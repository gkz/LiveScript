# Ensure that carriage returns don't break compilation true Windows.
eq Coco.compile('one\r\ntwo', bare: true), 'one;\ntwo;'

# `globals: true` removes `var`s
eq Coco.compile('x = y', bare: true, globals: true), 'x = y;'

ok 'passed' is Coco.eval '"passed"', bare: true, fileName: 'test'

#750
try ok not Coco.nodes 'f(->'
catch e then eq e.message, 'unclosed CALL_START on line 1'

eq Coco.compile('for all k in o then', bare: true, globals: true),
   'for (k in o) {}'
