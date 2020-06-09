bare = ->
  try
    LiveScript.compile it, {+bare,-header}
  catch
    console.error it
    throw e

# Ensure that carriage returns don't break compilation on Windows.
eq 'one;\ntwo;', bare 'one\r\ntwo'


# Tab characters should work.
eq '_(__);', bare '\n\t_\t__\t\n'


# `{\eval}` forces the last value to be returned.
eq 1, Function('return ' + LiveScript.compile 'delete @1' {\eval,-header}).call {1}
eq '''
var ref$;
ref$ = o.k, delete o.k, ref$;
''' LiveScript.compile 'delete o.k' {\eval, +bare,-header}


compileThrows 'missing `"`' 2 '\n"\n'

compileThrows 'unterminated string'     3 "\n\n'\n"
compileThrows 'unterminated words'      3 '\n\n<[\n'

compileThrows 'contaminated indent %20'    2 '1\n\t 2'
compileThrows 'contaminated indent %09'    3 ' 1\n  2\n\t3'
compileThrows 'unmatched dedent (1 for 2)' 3 '1\n  2\n 3'

compileThrows 'unmatched `)`' 2 '()\n)'
compileThrows 'unmatched `]`' 3 '[{\n\n]}'

compileThrows 'missing `)CALL`' 1 'f('

compileThrows "can't use label with a curried function (attempted label 'abc')" 1 ':abc (a, b) --> a + b'

throws '''
  empty range on line 1
  at filename
''' -> LiveScript.compile '[0 til 0]' {\filename,-header}


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
,0,0
(,\",0,0
STRNUM,\"1 \",0,0
+-,+,0,0
(,(,1,4
INDENT,4,2,4
STRNUM,2,2,4
NEWLINE,
,3,4
STRNUM,3,3,4
DEDENT,4,4,2
NEWLINE,
,4,2
),),4,2
+-,+,4,2
STRNUM,\" 4\",4,3
),,5,3
NEWLINE,
,5,3
'''

# Indentation on line 1 should be valid.
eq '1;\n2;', bare '  1\n  2'


eq 'STRNUM,0,0,0 ,,,,0,0 STRNUM,1,1,2' LiveScript.tokens('''
0 \\
  1
''').slice(0 3).join ' '



eq '!a;', bare '!!!a'


eq '''(function(){
  if ((function(){ debugger; }())) {
    debugger;
  }
});''' bare '-> debugger if debugger'


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

compileThrows 'invalid identifier \'♪\'' 1 'ƒ　♪　♯'


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


# destructuring assign sugar
compileThrows 'invalid assign' 1 '{a **= b} = c'


# require!
eq "var a;\na = require('a');" bare 'require! [a]'
eq "var a;\na = require('a');" bare 'require! <[a]>'
eq "var a;\na = require('a');" bare 'require! {a}'
eq "var b;\nb = require('b');" bare "require! {'b'}"

eq "var c;\nc = require('d');" bare "require! d: c"
eq "var e;\ne = require('f');" bare "require! f: e"
eq "var g;\ng = require('h');" bare "require! 'h': 'g'"

eq "var file;\nfile = require('file.js');" bare "require! 'file.js'"
eq "var file;\nfile = require('./file.js');" bare "require! './file.js'"
eq "var file;\nfile = require('./a/b/c/file.js');" bare "require! './a/b/c/file.js'"

eq "var a;\na = require('file.js');" bare "require! 'file.js': a"
eq "var b;\nb = require('./file.js');" bare "require! './file.js': b"
eq "var c;\nc = require('./a/b/c/file.js');" bare "require! './a/b/c/file.js': c"

eq "var preludeLs;\npreludeLs = require('prelude-ls');" bare "require! 'prelude-ls'"

eq "var bar;\nbar = require('./file.js').bar;" bare "require! { './file.js': {bar} }"
eq "var ref$, id, map;\nref$ = require('prelude-ls'), id = ref$.id, map = ref$.map;" bare "require! 'prelude-ls': {id, map}"

eq "var a, b, c;\na = require('a');\nb = require('b');\nc = require('c');" bare 'require! [a, b, c]'
eq "var a, b, c;\na = require('a');\nb = require('b');\nc = require('c');" bare 'require! <[ a b c ]>'
eq "var a, b, c;\na = require('a');\nb = require('b');\nc = require('c');" bare 'require! { a, b, c }'

compileThrows 'invalid require! argument' 1 'require! obj.key'


# JS literal
eq 'some js code!' bare '``some js code!``'

# generators
compileThrows "a constructor can't be a generator" 1 'class => ->*'

# statement expression in generator, normal function still compiles fine
code = '''(function*(){
  var f, g;
  f = (yield* (function*(){
    switch (false) {
    case !true:
      (yield 2);
      return g = function(){
        return 3;
      };
    }
  }()));
});'''
eq code, bare '!->* f = | true => yield 2; g = -> 3'

# https://github.com/jashkenas/coffee-script/pull/3240#issuecomment-38344281
eq '(function*(){\n  var body;\n  body = (yield fn).body;\n});' bare '!->* {body} = yield fn'

# [#237](https://github.com/satyr/coco/issues/237)
LiveScript.compile 'class A; class B; class C'

# [livescript#279](https://github.com/gkz/LiveScript/issues/279)
################################################################

jsonls = ->
  LiveScript.compile it, {+json}

eq do
  '''
{
  "key": "value",
  "keyDash": 1,
  "key-dash": true,
  "object": {
    "strArray": [
      "of",
      "strings"
    ],
    "objArray": [
      {
        "index": 0,
        "name": "zero"
      },
      {
        "index": 1,
        "name": "one"
      },
      {
        "index": 2,
        "name": "two"
      }
    ],
    "mixedArray": [
      {
        "key": "value"
      },
      1,
      true,
      "done"
    ],
    "nestedObjects": {
      "level1": {
        "level2": {
          "level3": {
            "key": true
          },
          "levelThree": {
            "key": false
          }
        }
      },
      "levelOne": {
        "nestedArrays": [
          [
            [
              true,
              false
            ],
            [
              false,
              true
            ]
          ]
        ]
      }
    }
  }
}

  '''
  jsonls '''
key: \\value
key-dash: 1
'key-dash': on

object:
  str-array: <[ of strings ]>
  # a comment
  obj-array:
    * index: 0
      name: "zero"
    * index: 1
      name: \\one
    * index: 2
      name: 'two'

  mixed-array:
    key: "valu\#{\\e}"
    1
    yes
    \\done

  nested-objects:
    level1:
      level2:
        level3:
          {+key}
        level-three:
          {-key}
    level-one:
      nested-arrays: [
        [
          [
            on off
          ]
          [
            off on
          ]
        ]
      ]
  '''

# [LiveScript#48](https://github.com/gkz/LiveScript/issues/48)
saveHere = {}
LiveScript.compile 'x ?= 1', bare: true, saveScope: saveHere
code = LiveScript.compile 'y ?= 2', bare: true, saveScope: saveHere
ok 0 <= code.indexOf 'var x, y'

# The presence of the full "ClassName.prototype.methodName =" in the compiled
# code is relevant to post-processors like Google's Closure Compiler as a cue
# that these are class methods.
compiled = LiveScript.compile '''
  class A
    one: -> 1
    two: -> 2
  class B extends A
    three: -> 3
    four: -> 4
'''
for <[
  A.prototype.one A.prototype.two
  B.prototype.three B.prototype.four
]>
  ok compiled.indexOf(..) >= 0 "missing #{..}"

# [LiveScript#923](https://github.com/gkz/LiveScript/issues/923)
# The lexer was keeping some state associated with the for comprehension past
# its extent, which resulted in an incorrect lexing of the subsequent `in`
# token. These don't comprehensively exercise the underlying flaw; they're
# just regression checks for this specific report.
LiveScript.compile '''
[1 for a]
[b in c]
'''
LiveScript.compile '''
[[{b: {[.., 1] for a}}]]
->
  if c
    d
      .e (.f in [2 3])
'''

# [LiveScript#1030](https://github.com/gkz/LiveScript/issues/1030)
compiled = LiveScript.compile '''
#!lsc shebang line
``#!node shebang line``
/* Copyright Shmorkum Porkums, 20XX */
foo bar
''' {-bare,+header} .split '\n'
eq compiled.0, '#!node shebang line'
ok compiled.1.starts-with '// Generated by LiveScript'
eq compiled.2, '/* Copyright Shmorkum Porkums, 20XX */'
ok compiled.3.starts-with '(function'

# Reuse reference variables when appropriate
compiled = LiveScript.compile 'a.b[*-1].=c' {+bare,-header}
ok compiled.starts-with 'var ref$, key$;\n'

compiled = LiveScript.compile '(class A).b ++= c' {+bare,-header}
ok compiled.starts-with 'var A;\n'

compiled = LiveScript.compile 'a[b = c + d] **= e' {+bare,-header}
ok compiled.starts-with 'var b;\n'


# Don't wrap single destructuring statements in parentheses under these
# specific conditions:
#  * the destructuring is inside a conditional
#  * the conditional is in an expression position
#  * but the value of the conditional isn't needed
compiled = LiveScript.compile 'a or if b then [@c] = d else 0' {+bare,-header}
eq 'a || (b ? this.c = d[0] : 0);' compiled


# Wrap `import$` calls in `if` when left side is simple, right side is soaking,
# and value is unused
compiled = LiveScript.compile '!-> a <<< b.c?d' {+bare,-header}
expected = '(function(){\n  var ref$;\n  if ((ref$ = b.c) != null) {\n    import$'
ok compiled.starts-with expected
compiled = LiveScript.compile '-> a <<< b.c?d; f!' {+bare,-header}
ok compiled.starts-with expected
