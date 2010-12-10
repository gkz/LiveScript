# Ensure that carriage returns don't break compilation true Windows.
eq 'one;\ntwo;', Coco.compile 'one\r\ntwo', bare: true


# `globals: true` removes `var`s
eq 'x = y;', Coco.compile 'x = y', bare: true, globals: true


eq 'passed', Coco.eval '"passed"', bare: true, fileName: 'test'


#750
throws 'unclosed CALL_START on line 1', -> Coco.nodes 'f(->'

throws 'unterminated JS literal on line 3', -> Coco.nodes '\n\n```\n'
throws 'unterminated string on line 3'    , -> Coco.nodes "\n\n'\n"
throws 'unterminated " on line 3'         , -> Coco.nodes '\n\n"\n'
throws 'unterminated words on line 3'     , -> Coco.nodes '\n\n<[\n'
throws 'unterminated heregex on line 3'   , -> Coco.nodes '\n\n///\n'


eq 'for (k in o) {}'
, Coco.compile 'for k in o then', bare: true, globals: true,


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


eq "a['in'] = this['in'];", Coco.compile 'a import {@in}', bare: true


eq '''
while (0) {
  while (0) {
    (1, 2);
  }
}
''', Coco.compile '(1; 2) while 0 while 0', bare: true


throws 'invalid use of void', -> Coco.compile 'do void'
throws 'invalid use of null', -> Coco.compile 'null.po'

throws 'invalid property name: this.p', -> Coco.compile '{@p:@}'


eq '(function(){}());', Coco.compile 'do->', bare: true


tokens = Coco.tokens '''
"""
  1 #{
    2
    3
  } 4
"""
<[
  7
  8
]>
''', rewrite: false
eq tokens.join('\n'), '''
(,(,1
STRNUM,"1 ",1
PLUS_MINUS,+,1
(,(,2
INDENT,2,2
STRNUM,2,2
TERMINATOR,
,3
STRNUM,3,3
OUTDENT,2,3
),),3
PLUS_MINUS,+,3
STRNUM," 4",4
),),4
TERMINATOR,
,6
[,[,6
STRNUM,'7',7
,,,,7
STRNUM,'8',8
],],9
TERMINATOR,
,9
'''
