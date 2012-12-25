bare = -> LiveScript.compile it, {+bare}

# Ensure that carriage returns don't break compilation on Windows.
eq 'one;\ntwo;', bare 'one\r\ntwo'


# Tab characters should work.
eq '_(__);', bare '\n\t_\t__\t\n'


# `{\eval}` forces the last value to be returned.
eq 1, Function('return ' + LiveScript.compile 'delete @1' {\eval}).call {1}
eq '''
var ref$;
ref$ = o.k, delete o.k, ref$;
''' LiveScript.compile 'delete o.k' {\eval, +bare}


compileThrows 'missing `"`' 2 '\n"\n'

compileThrows 'unterminated string'     3 "\n\n'\n"
compileThrows 'unterminated words'      3 '\n\n<[\n'

compileThrows 'contaminated indent %20'    2 '1\n\t 2'
compileThrows 'contaminated indent %09'    3 ' 1\n  2\n\t3'
compileThrows 'unmatched dedent (1 for 2)' 3 '1\n  2\n 3'

compileThrows 'unmatched `)`' 2 '()\n)'
compileThrows 'unmatched `]`' 3 '[{\n\n]}'

compileThrows 'missing `)CALL`' 1 'f('


throws '''
  empty range on line 1
  at filename
''' -> LiveScript.compile '[0 til 0]' {\filename}


eq '''
var k;
for (k in o) {}
''' bare 'for k of o then'



eq "a['in'] = this['in'];", bare 'a import {@in}'


eq '''
while (0) {
  while (0) {
    ({}), {};
    break;
  }
}
''', bare 'while 0 then while 0 then {} = ({}; {}); break'



compileThrows 'invalid use of null' 1 'null.po'


compileThrows 'deprecated octal literal 0666' 1 '0666'



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
eq '1;\n2;', bare '  1\n  2'


eq '''
(function(){
  var k;
  try {
    for (k in o) {
      (fn$.call(this, k));
    }
  } catch (e$) {}
  function clone$(it){
    function fun(){} fun.prototype = it;
    return new fun;
  }
  function fn$(k){
    clone$(this);
  }
}).call(this);

''', LiveScript.compile '''try for k of o then let then ^^@'''


eq 'STRNUM,0,0 ,,,,0 STRNUM,1,1' LiveScript.tokens('''
0 \\
  1
''').slice(0 3).join ' '



eq '!a;', bare '!!!a'


eq '''
+(function(){
  debugger;
}());
''' bare '+debugger'


eq '1;\n2;\n3;\n4;', bare '''
  1
  2
3
4
'''


# `__proto__` should be available as a variable name.
eq 1, __proto__ = 1


# [#1](https://github.com/satyr/coco/issues/1)
λ = -> 七 = 7
eq λ(), 7

compileThrows 'invalid identifier "♪"' 1 'ƒ　♪　♯'


# - [coffee#1195](https://github.com/jashkenas/coffee-script/issues/1195)
# - Ignore top-level `void`s.
eq '(function(){});' bare '''
  -> void;
  void;
  void
'''

# Dash seperated identifiers
throws "Parse error on line 1: Unexpected 'ID'" -> LiveScript.compile 'a--b = 1'

throws "Inconsistent use of encodeURL as encode-u-r-l on line 1" -> LiveScript.compile 'encode-URL is encode-u-r-l'


# Optimize concat [#72](https://github.com/gkz/LiveScript/issues/72)
eq '[1].concat([2], [3], [4]);' bare '[1] ++ [2] ++ [3] ++ [4]'

# Error when attempting to curry a funciton using splats [#91](https://github.com/gkz/LiveScript/issues/91)
compileThrows 'cannot curry a function with a variable number of arguments' 1 '(...args) --> args[0]'

# Optimize/clean compose [#101](https://github.com/gkz/LiveScript/issues/101)
eq 'compose$([j, h, g, f]);' (bare 'f >> g >> h >> j').split(\\n).0
eq 'compose$([f, g, h, j]);' (bare 'f << g << h << j').split(\\n).0

# destructuring assign sugar
compileThrows 'invalid assign' 1 '{a **= b} = c'


# require!
eq "var a;\na = require('a');" bare 'require! [a]'
eq "var a;\na = require('a');" bare 'require! <[a]>'
eq "var a;\na = require('a');" bare 'require! {a}'
eq "var b;\nb = require('b');" bare "require! {'b'}"

eq "var c;\nc = require('d');" bare "require! c: d"
eq "var e;\ne = require('f');" bare "require! e: 'f'"
eq "var g;\ng = require('h');" bare "require! 'g': h"

eq "var file;\nfile = require('file.js');" bare "require! 'file.js'"
eq "var file;\nfile = require('./file.js');" bare "require! './file.js'"
eq "var file;\nfile = require('./a/b/c/file.js');" bare "require! './a/b/c/file.js'"

eq "var a;\na = require('file.js');" bare "require! a: 'file.js'"
eq "var b;\nb = require('./file.js');" bare "require! b: './file.js'"
eq "var c;\nc = require('./a/b/c/file.js');" bare "require! c: './a/b/c/file.js'"

eq "var bar;\nbar = require('foo').bar;" bare "require! { foo.bar }"
eq "var bar;\nbar = require('./file.js').bar;" bare "require! { './file.js'.bar }"

eq "var bar;\nbar = require('foo').bar;" bare "require! foo.bar"
eq "var baz;\nbaz = require('foo').bar.baz;" bare "require! foo.bar.baz"
eq "var bar;\nbar = require('./file.js').bar;" bare "require! './file.js'.bar"

eq "var preludeLs;\npreludeLs = require('prelude-ls');" bare "require! 'prelude-ls'"

eq "var a, b, c;\na = require('a');\nb = require('b');\nc = require('c');" bare 'require! [a, b, c]'
eq "var a, b, c;\na = require('a');\nb = require('b');\nc = require('c');" bare 'require! <[ a b c ]>'
eq "var a, b, c;\na = require('a');\nb = require('b');\nc = require('c');" bare 'require! { a, b, c }'


# JS literal
eq 'some js code!' bare '``some js code!``'
