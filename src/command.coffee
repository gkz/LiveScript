# The `coco` utility.

Coco = require('./coco') import all require('events').EventEmitter::

# External dependencies.
fs             = require 'fs'
path           = require 'path'
{OptionParser} = require './optparse'
{spawn, exec}  = require 'child_process'

BANNER   = 'Usage: coco [options] [files]'
SWITCHES = [
  ['-c', '--compile',         'compile to JavaScript and save as .js files']
  ['-i', '--interactive',     'run an interactive Coco REPL']
  ['-o', '--output [DIR]',    'set the directory for compiled JavaScript']
  ['-w', '--watch',           'watch scripts for changes, and recompile']
  ['-p', '--print',           'print the compiled JavaScript to stdout']
  ['-s', '--stdio',           'listen for and compile scripts over stdio']
  ['-e', '--eval',            'compile a string from the command line']
  ['-r', '--require [FILE*]', 'require a library before executing your script']
  ['-b', '--bare',            'compile without the top-level function wrapper']
  ['-t', '--tokens',          'print the tokens that the lexer produces']
  ['-n', '--nodes',           'print the parse tree the parser produces']
  ['-v', '--version',         'display Coco version']
  ['-h', '--help',            'display this help message']
]

# Top-level objects shared by all the functions.
oparser = o = null
sources = []

# Run `coco` by parsing passed options and determining what action to take.
# Many flags cause us to divert before compiling anything. Flags passed after
# `--` will be passed verbatim to your script as arguments in `process.argv`
exports.run = ->
  parseOptions()
  return version()                    if o.version
  return usage()                      if o.help
  return require './repl'             if o.interactive
  return compileStdio()               if o.stdio
  return compileScript '', sources[0] if o.eval
  return (version(); usage(); require './repl') unless sources.length
  args = if ~separator = sources.indexOf '--'
  then sources.splice(separator, 1/0).slice 1
  else []
  args.unshift sources.splice(1, 1/0)... if o.run
  process.ARGV = process.argv = args
  compileScripts()

# Asynchronously read in each Coco in a list of source files and
# compile them. If a directory is passed, recursively compile all
# _.co_ or _.coffee_ extension source files in it and all subdirectories.
compileScripts = ->
  compile = (source, topLevel) ->
    path.exists source, (exists) ->
      die "File not found: #{source}" unless exists
      fs.stat source, (err, stats) ->
        if stats.isDirectory()
          fs.readdir source, (err, files) ->
            compile path.join source, file for file of files
            null
        else if topLevel or path.extname(source) of <[ .co .coffee ]>
          base = path.join source
          fs.readFile source, (err, code) ->
            compileScript source, code.toString(), base
          watch source, base if o.watch
  compile source, true for source of sources

# Compile a single source script, containing the given code, according to the
# requested options. If evaluating the script directly sets `__filename`,
# `__dirname` and `module.filename` to be correct relative to the script's path.
compileScript = (file, input, base) ->
  options = fileName: file, bare: o.bare
  if o.require
    for req of o.require
      require if req.charAt(0) is '.' then fs.realpathSync req else req
  try
    Coco.emit 'compile', t = {file, input, options}
    switch
    case o.tokens then printTokens Coco.tokens t.input
    case o.nodes  then console.log Coco.nodes(t.input).toString().trim()
    case o.run    then Coco.run t.input, t.options
    default
      t.output = Coco.compile t.input, t.options
      Coco.emit 'success', t
      switch
      case o.print   then console.log t.output.trim()
      case o.compile then writeJs t.file, t.output, base
  catch err
    Coco.emit 'failure', err, t
    return if Coco.listeners('failure').length
    return console.error err if o.watch
    die err.stack

# Attach the appropriate listeners to compile scripts incoming over **stdin**,
# and write them back to **stdout**.
compileStdio = ->
  code  = ''
  stdin = process.openStdin()
  stdin.on 'data', -> code += it if it
  stdin.on 'end' , -> compileScript null, code

# Watch a source Coco file using `fs.watchFile`, recompiling it every
# time the file is updated. May be used in combination with other options,
# such as `--nodes` or `--print`.
watch = (source, base) ->
  fs.watchFile source, {persistent: true, interval: 500}, (curr, prev) ->
    return if curr.size is prev.size and curr.mtime.getTime() is prev.mtime.getTime()
    fs.readFile source, (err, code) ->
      die err.stack if err
      compileScript source, code.toString(), base

# Write out a JavaScript source file with the compiled code. By default, files
# are written out in `cwd` as `.js` files with the same name, but the output
# directory can be customized with `--output`.
writeJs = (source, js, base) ->
  filename = path.basename(source, path.extname source) + '.js'
  srcDir   = path.dirname source
  baseDir  = srcDir.slice base.length
  dir      = if o.output then path.join o.output, baseDir else srcDir
  jsPath   = path.join dir, filename
  compile  = ->
    fs.writeFile jsPath, js or ' ', (err) ->
      if err
        console.error err
      else if o.compile and o.watch
        console.log "Compiled #{source}"
  path.exists dir, (exists) ->
    if exists then compile() else exec "mkdir -p #{dir}", compile

# Pretty-print a stream of tokens.
printTokens = (tokens) ->
  strings = for [tag, value] of tokens
    "[#{tag} #{ value.toString().replace /\n/, '\\n' }]"
  console.log strings.join ' '

# Use the [OptionParser module](optparse.html) to extract all options from
# `process.argv` that are specified in `SWITCHES`.
parseOptions = ->
  oparser := new OptionParser SWITCHES, BANNER
  o       := oparser.parse process.argv.slice 2
  sources := o.arguments
  o.run    = ! (o.compile or o.print)
  o.print  = !!(o.print or o.eval or o.stdio and o.compile)
  o.compile ||= !!o.output

# Print the `--help` usage message.
usage = -> console.log oparser.help()

# Print the `--version` message.
version = -> console.log "Coco #{Coco.VERSION}"

die = ->
  console.error it
  process.exit 1
