eq ?= (a,b,msg="#a != #b") -> console.assert a == b, msg

eq ' here there', ''' here ''' + """there"""
 
eq ' here there', ''' here there
'''

eq ' here there', ''' here''' + """ there
"""

# function inside heredoc
eq '''
(function(){
  var a;
  a = arguments[arguments.length - 1];
});
''', LiveScript.compile '(..., a) ->', {+bare}

eq '''
   a = -> 
    3
   ''', 'a = -> \n 3'

# heredoc with `then`
function help then """
  Usage: livescript [options] [files] [arguments]

  Options:
  #o
"""

eq 34, help.toString().indexOf("livescript")

eq help.toString(), 'function help(){\n  return "Usage: livescript [options] [files] [arguments]\\n\\nOptions:\\n" + o;\n}'

eq '''function help(){
  return "Usage: livescript [options] [files] [arguments]\\n\\nOptions:\\n" + o;
}''', help.toString()


# heredoc inside function need lines to be indented.
function helper
  """
  Usage: livescript [options] [files] [arguments]
  
  Options:
  #o
"""

eq 37, helper.toString().indexOf("livescript")

# does not work in REPL if not on first line
x ?= 3

eq x, 3
