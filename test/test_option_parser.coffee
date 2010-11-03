# Ensure that the OptionParser handles arguments correctly.
return unless require?
{OptionParser} = require './../lib/optparse'

opt = new OptionParser [
  ['-r', '--required [DIR]',  'desc required']
  ['-o', '--optional',        'desc optional']
  ['-l', '--list [FILES*]',   'desc list']
]

result = opt.parse ['one', 'two', 'three', '-r', 'dir']

eq result.arguments.length, 5
eq result.arguments[3], '-r'

result = opt.parse ['--optional', '-r', 'folder', 'one', 'two']

eq result.optional, true
eq result.required, 'folder'
eq result.arguments.join(' '), 'one two'

result = opt.parse ['-l', 'one.txt', '-l', 'two.txt', 'three']

ok result.list instanceof Array
eq result.list.join(' '), 'one.txt two.txt'
eq result.arguments.join(' '), 'three'

