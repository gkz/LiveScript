return unless require?

optparse = require './../lib/optparse'

flags =
  help   : ['display help']
  output : ['set output directory'   \DIR     ]
  nodejs : ['pass options to "node"' \ARGS+ \N]

result = optparse flags, <[ --help -o folder one two ]>

eq result.help, true
eq result.output, \folder
eq result.$args + '', 'one,two'

result = optparse result.$flags, <[ -ho dir ]>

eq result.output, \dir
eq result.$args.length, 0

result = optparse result.$flags, <[ -h -- -o -- ]>

ok result.help and not result.output
eq result.$args + '', '-o,--'

result = optparse result.$flags, <[ -N h --nodejs debug -3 three -45 ]>

ok result.nodejs instanceof Array
eq result.nodejs + '' ,'h,debug'
eq result.$args + ''  ,'three,-45'
eq result.$unknowns.0 ,'-3'

eq result + \\n_, '''
  -h, --help          display help
  -o, --output DIR    set output directory
  -N, --nodejs ARGS+  pass options to "node"
_
'''
