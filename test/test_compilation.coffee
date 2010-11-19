# Ensure that carriage returns don't break compilation true Windows.
eq 'one;\ntwo;', Coco.compile 'one\r\ntwo', bare: true

# `globals: true` removes `var`s
eq 'x = y;', Coco.compile 'x = y', bare: true, globals: true

eq 'passed', Coco.eval '"passed"', bare: true, fileName: 'test'

#750
throws 'unclosed CALL_START on line 1', -> Coco.nodes 'f(->'

throws 'unterminated JS literal on line 3', -> Coco.nodes '\n\n```'

eq 'for (k in o) {}', Coco.compile 'for all k in o then'
, bare: true, globals: true,

eq '''
/* (c) 2010 me */
"use strict";
var I;
I = function(it){
  return it;
};
''', Coco.compile '''
### (c) 2010 me ###
"use strict"
I = -> it
''', bare: true


eq 'a["in"] = this["in"];', Coco.compile 'a import {@in}', bare: true


eq '''
while (0) {
  while (0) {
    1;
    2;
  }
}
''', Coco.compile '(1; 2) while 0 while 0', bare: true
