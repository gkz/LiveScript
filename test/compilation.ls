bare = {+bare}

# Ensure that carriage returns don't break compilation on Windows.
eq 'one;\ntwo;', LiveScript.compile 'one\r\ntwo' bare


# Tab characters should work.
eq '_(_);', LiveScript.compile '\n\t_\t_\t\n' bare


# `{+repl}` forces the last value to be returned.
eq 1, Function('return ' + LiveScript.compile 'delete @1' {+repl}).call {1}
eq '''
var __ref;
__ref = o.k, delete o.k, __ref;
''' LiveScript.compile 'delete o.k' {+repl, +bare}


throws 'missing `"` on line 2' -> LiveScript.lex '\n"\n'

throws 'unterminated JS literal on line 3', -> LiveScript.lex '\n\n```\n'
throws 'unterminated string on line 3'    , -> LiveScript.lex "\n\n'\n"
throws 'unterminated words on line 3'     , -> LiveScript.lex '\n\n<[\n'

throws 'contaminated indent %20 on line 2'    -> LiveScript.lex '1\n\t 2'
throws 'unmatched dedent (1 for 2) on line 3' -> LiveScript.lex '1\n  2\n 3'

throws 'unmatched `)` on line 2' -> LiveScript.lex '()\n)'
throws 'unmatched `]` on line 3' -> LiveScript.lex '[{\n\n]}'

throws 'missing `)CALL` on line 1' -> LiveScript.lex 'f('


throws '''
  empty range on line 1
  at filename
''' -> LiveScript.compile '1 to 0' {\filename}


eq '''
var k;
for (k in o) {}
''' LiveScript.compile 'for k of o then' {+bare}


eq '''
/* (c) 2010 me */
"use strict";
var I;
LABEL:
I = function(it){
  return it;
};
''', LiveScript.compile '''
/* (c) 2010 me */
"use strict"
`LABEL:`
I = -> it
''' bare


eq "a['in'] = this['in'];", LiveScript.compile 'a import {@in}' bare


eq '''
while (0) {
  while (0) {
    ({}), {};
  }
}
''', LiveScript.compile '({};{}) while 0 while 0' bare


throws 'invalid use of null on line 1', -> LiveScript.compile 'null.po'


throws 'deprecated octal literal 0666 on line 1' ,-> LiveScript.tokens '0666'
throws 'invalid number 8 in base 8 on line 1'    ,-> LiveScript.tokens '8r8'


tokens = LiveScript.lex '''
"""
  1 #{
    2
    3
  } 4
"""
'''
eq tokens.join('\n'), '''
NEWLINE,
,0
(,\",0
STRNUM,\"1 \",1
+-,+,1
(,(,2
INDENT,4,2
STRNUM,2,2
NEWLINE,
,3
STRNUM,3,3
DEDENT,4,4
NEWLINE,
,4
),),4
+-,+,4
STRNUM,\" 4\",5
),,5
NEWLINE,
,5
'''


# Indentation on line 1 should be valid.
eq '1;\n2;', LiveScript.compile '  1\n  2' bare


eq '''
(function(){
  var k;
  try {
    for (k in o) {
      (__fn.call(this, k));
    }
  } catch (__e) {}
  function __clone(it){
    function fun(){} fun.prototype = it;
    return new fun;
  }
  function __fn(k){
    __clone(this);
  }
}).call(this);
''', LiveScript.compile '''try for k of o then let then ^@'''


eq 'STRNUM,0,0 ,,,,0 STRNUM,1,1' LiveScript.tokens('''
0 \\
  1
''').slice(0 3).join ' '


eq '''
(function(){
  var __ref;
  throw a < (__ref = +b) && __ref < c;
}());
''', LiveScript.compile '(throw a < +b < c)' bare


eq '!a;', LiveScript.compile '!!!a' bare


eq '''
+(function(){
  debugger;
}());
''' LiveScript.compile '+debugger' bare


eq '1;\n2;\n3;\n4;', LiveScript.compile '''
  1
  2
3
4
''' bare


eq '''
#!js
var a;
a = 1;
''' LiveScript.compile '`#!js`; a = 1' bare


# `__proto__` should be available as a variable name.
eq 1, __proto__ = 1


# [#1](https://github.com/satyr/coco/issues/1)
λ = -> 七 = 7
eq λ(), 7


# [coffee#1195](https://github.com/jashkenas/coffee-script/issues/1195)
eq '''
(function(){});
null;
''' LiveScript.compile '''
-> void;
null
''' bare
