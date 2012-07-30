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

eq helloWorld = hello + world, "#hello-world"

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


obj =
  name: 'Joe'
  toString: -> @name
  hi: -> "Hello #this."
eq obj.hi(), "Hello Joe."


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


compileThrows 'unterminated interpolation' 2 '"#{\n'

throws "Parse error on line 1: Unexpected ')'" -> LiveScript.compile '"(#{+})"'

compileThrows 'invalid variable interpolation "if"' 1 '"#if"'

compileThrows 'malformed character escape sequence' 1 '"\\x"'
compileThrows 'malformed character escape sequence' 1 '"\\u"'

hi-there = 'Hi there!'
one-two-three = 123

# Dash separated var interpolation
eq 'Hi there! How are you?' "#hi-there How are you?"
eq 'ha 123 ha' "ha #one-two-three ha"


# Character/Word Literal
eq 'word', \word
eq \c, 'c'
eq('+', \+)
eq '\\', [\\\].0
eq '$', {\$}.\$


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
  eq '\1'     '\x01'
  eq '\02'    '\x02'
  eq '\377'   '\xFF'
  eq '\08\09' '\x008\x009'


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
