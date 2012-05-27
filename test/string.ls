eq '({[dollars]})', '\(\{\[dollars\]\}\)'
eq 'one two three',
   "one t
     wo t
      hree"
eq "four five",
  '
  four \
  five
  '
eq 'six seven' '
   six
 \ seven
'

hello = 'Hello'
world = 'World'
eq '#{hello} #{world}!', '#{hello} #{world}!'
eq "#{hello} #{world}!", 'Hello World!'
eq "#hello #world!",     'Hello World!'
eq "[#{hello}#{world}]", '[HelloWorld]'
eq "#{hello}##{world}", 'Hello#World'
eq "Hello #{ 1 + 2 } World", 'Hello 3 World'
eq "#{hello} #{ 1 + 2 } #{world}", "Hello 3 World"
eq "#{hello + world}", 'HelloWorld'
eq "#{hello + ' ' + world + '!'}", 'Hello World!'


eq "\#{Escaping} first", '#{Escaping} first'
eq "Escaping \#{in} middle", 'Escaping #{in} middle'
eq "Escaping \#{last}", 'Escaping #{last}'
eq "\#Esc\#a\#ping", '#Esc#a#ping'


eq "##", '##'
eq "#{}", ''
eq "#{1}#{2}", '12'
eq "#{}A#{} #{} #{}B#{}", 'A  B'
eq "\\\#{}", '\\#{}'
eq "#{

}", ''


eq "I won ##{20} last night.", 'I won #20 last night.'
eq "I won ##{'#20'} last night.", 'I won ##20 last night.'


list = [0 to 5]
eq "values: #{ list.join ( ) }", 'values: 0,1,2,3,4,5'
eq "values: #{ list.join ' ' }", 'values: 0 1 2 3 4 5'


obj = {
  name: 'Joe'
  hi: -> "Hello #{@name}."
  cya: -> "Hello #{@name}.".replace('Hello','Goodbye')
}
eq obj.hi(), "Hello Joe."
eq obj.cya(), "Goodbye Joe."


eq "With #{"quotes"}", 'With quotes'
eq 'With #{"quotes"}', 'With #{"quotes"}'

eq "Where is #{obj["name"] + '?'}", 'Where is Joe?'

eq "Where is #{"the nested #{obj["name"]}"}?", 'Where is the nested Joe?'
eq "Hello #{world ? "#{hello}"}", 'Hello World'

eq "Hello #{"#{"#{obj["name"]}" + '!'}"}", 'Hello Joe!'

eq "#{"hello".replace("\"", "")}", 'hello'


a = """
    Hello #{ "Joe" }
    """
eq a, "Hello Joe"


a = """
    basic heredoc
    on two lines
    """
eq a, "basic heredoc\non two lines"


a = '''
    a
      "b
    c
    '''
eq a, "a\n  \"b\nc"


a = """
a
 b
  c
"""
eq a, "a\n b\n  c"


eq '''one-liner''', 'one-liner'


a = """
      out
      here
"""
eq a, "out\nhere"


a = '''
       a
     b
   c
    '''
eq a, "    a\n  b\nc"


a = '''
a


b c
'''
eq a, "a\n\n\nb c"


eq '''more"than"one"quote''', 'more"than"one"quote'


# [coffee#647](https://github.com/jashkenas/coffee-script/issues/647)
eq "''Hello, World\\''", '''
'\'Hello, World\\\''
'''
eq '""Hello, World\\""', """
"\"Hello, World\\\""
"""
eq 'Hello, World\n', '''
Hello, World\

'''


a = """
    basic heredoc #{10}
    on two lines
    """
b = '''
    basic heredoc #{10}
    on two lines
    '''
eq a, "basic heredoc 10\non two lines"
eq b, "basic heredoc \#{10}\non two lines"


eq '''here's an apostrophe''', "here's an apostrophe"


# Blank lines are ignored for indentation detection.
a = """
    one

    two

    """
ok a, "one\n\ntwo\n"


eq ''' line 0
    should not be relevant
      to the indent level
''', ' line 0
  \nshould not be relevant
  \n  to the indent level'


eq ''' '\\\' ''', " '\\' "
eq """ "\\\" """, ' "\\" '


eq '''  <- keep these spaces ->  ''', '  <- keep these spaces ->  '


eq 'multiline nested "interpolations" work', """multiline #{
  "nested #{
    ok true
    "\"inter"
  }" + """polations\""""
} work"""


throws 'unterminated interpolation on line 2' -> LiveScript.lex '"#{\n'

throws "Parse error on line 1: Unexpected ')'" -> LiveScript.compile '"(#{+})"'


# Character/Word Literal
eq 'word', \word
eq \c, 'c'
eq('+', \+)
eq '\\', [\\\].0
eq '$', {\$}.\$

eq 'AFKPUZ' [\A to \Z by 5]*''

throws 'bad "to" in range on line 1'   -> LiveScript.tokens '[0 to "q"]'
throws 'bad "by" in range on line 1'   -> LiveScript.tokens '[0 to 9 by "2"]'
throws 'bad string in range on line 1' -> LiveScript.tokens '["a" to "bc"]'

ok \\u2028, \\u2029


# [coffee#923](https://github.com/jashkenas/coffee-script/issues/923)
eq "#{ "{" }", "{"
eq "#{ '#{}}' } }", '#{}} }'


# Automatic Dot Insertion
o = k: ok; k = \k

eq o.k, o\k
eq o.k, o'k'
eq o.k, o"#{k}"

o\k      true
o'k'     true
o"#{k}"  true
o"""k""" true


# Automatic Comma Insertion
eq "#{0}" \0
eq \2 '1'.replace "#{1}" -> 2


# Safe Octals
let
  'use strict'
  '\1'
  '\02'
  '\377'
  '\08\09'


# Unjoined
x = 0
y = 1
a = %"#x/#y"
eq a.0, 0
eq a.1, \/
eq a.2, 1
eq a.length, 3


# Trailing backslashes are themselves.
eq '''\''' '\\'
eq \\\\ \\ + \\
