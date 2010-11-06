# The `coco` utility. Handles command-line compilation of Coco
# into various forms: saved into `.js` files or printed to stdout, piped to
# [JSLint](http://javascriptlint.com/) or recompiled every time the source is
# saved, printed as a token stream or as the syntax tree, or launch an
# interactive REPL.

# External dependencies.
fs             = require 'fs'
path           = require 'path'
optparse       = require './optparse'
Coco           = require './coco'
{spawn, exec}  = require 'child_process'
{EventEmitter} = require 'events'

# Allow Coco to emit Node.js events.
Coco import all new EventEmitter

BANNER   = 'Usage: coco [options] [files]'
SWITCHES = [
  ['-c', '--compile',         'compile to JavaScript and save as .js files']
  ['-i', '--interactive',     'run an interactive Coco REPL']
  ['-o', '--output [DIR]',    'set the directory for compiled JavaScript']
  ['-w', '--watch',           'watch scripts for changes, and recompile']
  ['-p', '--print',           'print the compiled JavaScript to stdout']
  ['-l', '--lint',            'pipe the compiled JavaScript through JSLint']
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
opts         = {}
sources      = []
optionParser = null

# Run `coco` by parsing passed options and determining what action to take.
# Many flags cause us to divert before compiling anything. Flags passed after
# `--` will be passed verbatim to your script as arguments in `process.argv`
exports.run = ->
  parseOptions()
  return usage()                      if opts.help
  return version()                    if opts.version
  return require './repl'             if opts.interactive
  return compileStdio()               if opts.stdio
  return compileScript '', sources[0] if opts.eval
  return require './repl'             unless sources.length
  separator = sources.indexOf '--'
  flags = []
  if separator >= 0
    flags = sources.splice separator + 1
    sources.pop()
  if opts.run
    flags = sources.splice(1).concat flags
  process.ARGV = process.argv = flags
  compileScripts()

# Asynchronously read in each Coco in a list of source files and
# compile them. If a directory is passed, recursively compile all
# _.co_ or _.coffee_ extension source files in it and all subdirectories.
compileScripts = ->
  compile = (source, topLevel) ->
    path.exists source, (exists) ->
      throw Error "File not found: #{source}" unless exists
      fs.stat source, (err, stats) ->
        if stats.isDirectory()
          fs.readdir source, (err, files) ->
            compile path.join source, file for file of files
            null
        else if topLevel or path.extname(source) of <[ .co .coffee ]>
          base = path.join source
          fs.readFile source, (err, code) ->
            compileScript source, code.toString(), base
          watch source, base if opts.watch
  compile source, true for source of sources

# Compile a single source script, containing the given code, according to the
# requested options. If evaluating the script directly sets `__filename`,
# `__dirname` and `module.filename` to be correct relative to the script's path.
compileScript = (file, input, base) ->
  o = opts
  options = compileOptions file
  if o.require
    for req of o.require
      require if req.charAt(0) is '.' then fs.realpathSync req else req
  try
    t = task = {file, input, options}
    Coco.emit 'compile', task
    switch
    case o.tokens then printTokens Coco.tokens t.input
    case o.nodes  then console.log Coco.nodes(t.input).toString().trim()
    case o.run    then Coco.run t.input, t.options
    default
      t.output = Coco.compile t.input, t.options
      Coco.emit 'success', task
      switch
      case o.print   then console.log t.output.trim()
      case o.compile then writeJs t.file, t.output, base
      case o.lint    then lint t.file, t.output
  catch err
    Coco.emit 'failure', err, task
    return if Coco.listeners('failure').length
    return console.log err.message if o.watch
    console.error err.stack
    process.exit 1

# Attach the appropriate listeners to compile scripts incoming over **stdin**,
# and write them back to **stdout**.
compileStdio = ->
  code  = ''
  stdin = process.openStdin()
  stdin.on 'data', -> code += it if it
  stdin.on 'end' , -> compileScript 'stdio', code

# Watch a source Coco file using `fs.watchFile`, recompiling it every
# time the file is updated. May be used in combination with other options,
# such as `--lint` or `--print`.
watch = (source, base) ->
  fs.watchFile source, {persistent: true, interval: 500}, (curr, prev) ->
    return if curr.size is prev.size and curr.mtime.getTime() is prev.mtime.getTime()
    fs.readFile source, (err, code) ->
      throw err if err
      compileScript source, code.toString(), base

# Write out a JavaScript source file with the compiled code. By default, files
# are written out in `cwd` as `.js` files with the same name, but the output
# directory can be customized with `--output`.
writeJs = (source, js, base) ->
  filename = path.basename(source, path.extname source) + '.js'
  srcDir   = path.dirname source
  baseDir  = srcDir.slice base.length
  dir      = if opts.output then path.join opts.output, baseDir else srcDir
  jsPath   = path.join dir, filename
  compile  = ->
    fs.writeFile jsPath, js or ' ', (err) ->
      if err
        console.log err.message
      else if opts.compile and opts.watch
        console.log "Compiled #{source}"
  path.exists dir, (exists) ->
    if exists then compile() else exec "mkdir -p #{dir}", compile

# Pipe compiled JS through JSLint (requires a working `jsl` command), printing
# any errors or warnings that arise.
lint = (file, js) ->
  printIt = -> console.log file + ':\t' + it.toString().trim()
  conf = __dirname + '/../extras/jsl.conf'
  jsl = spawn 'jsl', ['-nologo', '-stdin', '-conf', conf]
  jsl.stdout.on 'data', printIt
  jsl.stderr.on 'data', printIt
  jsl.stdin.write js
  jsl.stdin.end()

# Pretty-print a stream of tokens.
printTokens = (tokens) ->
  strings = for [tag, value] of tokens
    "[#{tag} #{ value.toString().replace /\n/, '\\n' }]"
  console.log strings.join ' '

# Use the [OptionParser module](optparse.html) to extract all options from
# `process.argv` that are specified in `SWITCHES`.
parseOptions = ->
  optionParser := new optparse.OptionParser SWITCHES, BANNER
  o = opts     := optionParser.parse process.argv.slice 2
  o.compile   or= !!o.output
  o.run         = not (o.compile or o.print or o.lint)
  o.print       = !!  (o.print or o.eval or o.stdio and o.compile)
  sources      := o.arguments

# The compile-time options to pass to the Coco compiler.
compileOptions = (fileName) -> {fileName, bare: opts.bare}

# Print the `--help` usage message and exit.
usage = ->
  console.log optionParser.help()
  process.exit 0

# Print the `--version` message and exit.
version = ->
  console.log "Coco version #{Coco.VERSION}"
  process.exit 0
