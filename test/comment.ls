#! line comment

  #!comment
func = ->
#!comment
  false
  false   #!comment
  false

#!comment
  true

switch 'string'
#!comment
case false then something()
#!comment
case null
  somethingElse()

->
  code()
  #!comment

ok func()

func
func
#!Line3

obj = {
#!comment
  #!comment
    #!comment
  one: 1
#!comment
  two: 2
    #!comment
}

result = if true # comment
  false

ok not result

result = if false
  false
else # comment
  45

eq result, 45


test =
  'test ' +
  'test ' + # comment
  'test'

eq test, 'test test test'

/*
  This is a block comment.
  Just like JS.
*/

func = ->
  /*
  Another block comment.
  */
  code
  /*
  debug code commented
  */


func = ->
  one = ->
    two = ->
      three = ->
  /*
  block.
  */
  four = ->

fn1 = ->
  oneLevel = null
/* This is fine. */

ok ok


# Spaced comments in if / elses.
result = if false
  1

#!comment
else if false
  2

#!comment
else
  3

eq result, 3


result = switch 'z'
case 'z' then 7
#!comment
eq result, 7


# Trailing-line comment before an outdent.
func = ->
  if true
    true # comment
  7

eq func(), 7


eq '''
/* leading block comments */
/* are placed before declarations */
var obj;
obj = {
  /*
   *  v
   */
  key: val
  /*
   *  ^
   */
};
if (1) {
  /* no semicolon at end -> */
  2;
}
/* trailing top level comment */
''', LiveScript.compile '''
/* leading block comments */
/* are placed before declarations */
obj = {
   /*
    *  v
    */
   key : val
   /*
    *  ^
    */
}
if 1
  /* no semicolon at end -> */
  2
  /* trailing comments in a block */
  /* are removed */
/* trailing top level comment */
''', {+bare}


# Block comments within non-statement `if`s.
eq void, if true then /* 1 */
eq true, do
  if true
    /* 2 */
    true
eq true, do
  if true
    true
    /* 3 */


eq 0, [0]/* inline block comment */[0]


/*
Trailing block comment works.
