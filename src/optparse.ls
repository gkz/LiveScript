# A simple function to parse option flags from the command-line.
# Use it like so:
#
#     options = require(\optparse) help: ['!']
#     options.help  # will be true if "--help" or "-h" is passed
#
# The first non-option is considered to be the start of the file (and file
# option) list, and all subsequent arguments are left unparsed.
module.exports = (
  # An object describing valid flags, in the form:
  #
  #     help   : ['display help']
  #     output : ['set output directory'   \DIR     ]
  #     nodejs : ['pass options to "node"' \ARGS+ \N]
  flags
  # The target arguments, default to the ones with current `process`.
  args or process.argv.slice 2
  # The base of `options` can optionally be passed.
  options or {}
) ->
  unless typeof! flags is \Array
    MULTI = /[*+]/
    flags = for name of flags
      [desc, arg, abbr] = [] +++ flags[name]
      {name, desc, arg, abbr} <<<
        long  : \-- + name
        short : abbr != 0 and "-#{ abbr or name }"slice 0 2
        multi : !!arg and MULTI.test arg
  # Parse the list of arguments, populating an `options` object with all of the
  # specified options, and returning it. `options.$args` will be an array
  # containing the remaining non-option arguments.
  FLAG = /^-[-\w]+$/; unknowns = []
  :ARGS for arg, i in args
    # __--__ marks the end of options.
    if arg is \-- then ++i; break
    :ARG for a in expand arg
      for flag in flags
        continue unless a in flag<[short long]>
        value = if flag.arg then args[++i] else true
        if flag.multi
        then options@@[flag.name]push value
        else options. [flag.name]  =  value
        continue ARG
      if FLAG.test a then unknowns.push a else break ARGS
  options import
    $flags    : flags
    $args     : args.slice i
    $unknowns : unknowns
    # Given `flags` above , the resulting `options` will stringify as:
    #
    #     -h, --help          display help
    #     -o, --output DIR    set output directory
    #     -N, --nodejs ARGS+  pass options to "node"
    toString: help

# Expands merged flags, e.g.: `-wp` -> `-w -p`
function expand
  if /^-\w{2,}/test it then []map.call it.slice(1), -> "-#it" else [it]

function help
  longs = @$flags.map -> it.long + if it.arg then ' ' + that else ''
  width = Math.max ...longs.map -> it.length
  pad   = ' ' * width
  @$flags.map (flag, i) ->
    sf = if flag.short then that + \, else '   '
    lf = (longs[i] + pad)slice 0 width
    "  #sf #lf  #{flag.desc}"
  .join \\n
