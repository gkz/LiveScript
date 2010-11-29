{OptionParser} = require './../lib/optparse'

opt = OptionParser [
  ['-r', '--required DIR',  'desc required']
  ['-o', '--optional',      'desc optional']
  ['-l', '--list FILES*',   'desc list']
]

result = opt.parse <[ one two three -or dir ]>

eq result.arguments.length, 6
eq result.arguments[4], '-r'

result = opt.parse <[ --optional -r folder one two ]>

eq result.optional, true
eq result.required, 'folder'
eq result.arguments + '', 'one,two'

result = opt.parse <[ -l one.txt -l two.txt three ]>

ok result.list instanceof Array
eq result.list + '', 'one.txt,two.txt'
eq result.arguments + '', 'three'
