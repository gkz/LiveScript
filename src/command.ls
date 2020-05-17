require! {
  '..': LiveScript
  path
  fs
  util
  'prelude-ls': {each, break-list}:prelude
  './options': {parse: parse-options, generate-help}
  './util': {name-from-path}
}

version = LiveScript.VERSION

args, {say, say-with-timestamp, warn, die} = {} <-! (module.exports =)

say ?= console.log
say-with-timestamp ?= util.log
warn ?= console.error
die ?= (message) !->
  console.error message
  process.exit 1

try
  o = parse-options args
  positional = o._
catch
  die e.message

switch
| o.nodejs  => fork-node!
| o.version => say "LiveScript version #version"
| o.help    => say generate-help interpolate: {version}
| otherwise =>
  o.compile ||= o.output
  o.run = not (o.compile or o.ast or o.tokens or o.lex)
  if o.map?
    valid-map-values = <[ none linked linked-src embedded debug ]>
    if o.map not in valid-map-values
      die "Option --map must be either: #{ valid-map-values.join ', ' }"
  else o.map = if o.run then 'embedded' else 'none'

  if o.run and args is process.argv
    process.argv.lsc =
      if o.stdin or o.eval
        [void ...positional]
      else
        # If running a script, this splice keeps arguments after the first from
        # being handled as additional sources to be compiled.
        [positional.0, ...positional.splice 1]

  if o.require
    {filename} = module
    module.filename = '.'
    that |> each -> global[name-from-path it] = require it
    module <<< {filename}

  switch
  | o.eval =>
      json-callback = (input) !->
          global <<< prelude if o.prelude
          o.run-context = JSON.parse input.to-string!
          compile-script '' o.eval
      if positional.length and (o.json or /\.json$/.test positional.0)
          o.json = true
          fshoot 'readFile', positional.0, json-callback
      else if o.json and o.run
          get-stdin json-callback
      else
          compile-script '' o.eval
  | o.stdin =>
    compile-stdin!
  | positional.length =>
    compile-scripts!
  | require 'tty' .isatty 0 =>
    say "LiveScript #version - use 'lsc --help' for more information"
    require('./repl') o
  | otherwise =>
    compile-stdin!

# Calls a `fs` method, exiting on error.
!function fshoot name, arg, callback
  e, result <-! fs[name] arg
  die e.stack || e if e
  callback result

# Asynchronously read in each LiveScript script in a list of source files and
# compile them. If a directory is passed, recursively compile all
# _.ls_ files in it and all subdirectories.
!function compile-scripts
  positional.for-each !-> walk it, (path.normalize it), true
  !function walk source, base, top
    !function work
      fshoot 'readFile' source, !-> compile-script source, "#it", base
    e, stats <-! fs.stat source
    if e
      die "Can't find: #source" if not top or /(?:\.ls|\/)$/test source
      walk "#source.ls" base
      return
    if stats.is-directory!
      unless o.run
        fshoot 'readdir' source, !-> it.for-each !-> walk "#source/#it" base
        return
      source += '/index.ls'
    if top or '.ls' is source.slice -3
      if o.watch then watch source, work else work!

# Compile a single source script, containing the given code, according to the
# requested options.
!function compile-script filename, input, base
  options = {
      filename
      output-filename: output-filename filename, o.json
      o.bare
      o.const
      o.map
      o.header
      o.warn
  }
  t       = {input, options}
  try
    if o.lex or o.tokens or o.ast
      LiveScript.emit 'lex' t
      t.tokens = LiveScript.tokens t.input, raw: o.lex
      if o.lex or o.tokens
        print-tokens t.tokens
        throw

      LiveScript.emit 'parse' t
      t.ast = LiveScript.ast t.tokens
      say if o.json then t.ast.stringify 2 else ''.trim.call t.ast
      throw

    json = o.json or /\.json\.ls$/.test filename
    run = o.run or (json and o.print)
    if run
      LiveScript.emit 'compile' t
      print = json or o.print
      t.output = LiveScript.compile t.input, {...options, +bare, run, print}
      LiveScript.emit 'run' t
      require 'source-map-support' .install {+hook-require}
      t.result = LiveScript.run (if o.map is 'none' then t.output else t.output.code), options, do
          js: true
          context: o.run-context
      switch
      | json  => say JSON.stringify t.result, null, 2
      | o.print => say t.result
      throw

    LiveScript.emit 'compile' t
    t.output = LiveScript.compile t.input, {...options, json, o.print}
    LiveScript.emit 'write' t
    if o.print or not filename
    then say (if o.map is 'none' then t.output else t.output.code).trim-right!
    else write-JS filename, t.output, t.input, base, json
  catch then if e?
    if LiveScript.listeners 'failure' .length
      LiveScript.emit 'failure' e, t
    else
      warn "Failed at: #filename" if filename
      unless e instanceof SyntaxError or /^Parse error /test e.message
        e = e.stack or e
      if o.watch then warn e + '\7'
                 else die  e
    return
  LiveScript.emit 'success' t

# Attach the appropriate listeners to get data incoming over **stdin**.
!function get-stdin cb
  process.open-stdin!
    code = ''
    ..on 'data' !-> code += it
    ..on 'end'  !-> cb code
    ..on 'data' !->
      # Detect trailing __^D__ or __^Z__ for Windows.
      if (code.slice -3) in <[ \4\r\n \x1a\r\n ]>
        cb code.slice 0 -3
        ..destroy!

!function compile-stdin
  input <-! get-stdin
  compile-script '' input

# Watch a source LiveScript file using `setTimeout`, taking an `action` every
# time the file is updated.
!function watch source, action
  :repeat let ptime = 0
    {mtime} <-! fshoot 'stat' source
    do action if ptime .^. mtime
    set-timeout repeat, 500ms, mtime

# Write out a JavaScript source file with the compiled code. By default, files
# are written out in `cwd` as `.js` files with the same name, but the output
# directory can be customized with `--output`.
!function write-JS source, js, input, base, json
  #     foo.ls     => foo.js
  #     foo.jsm.ls => foo.jsm
  filename = output-filename source, json
  dir = path.dirname source
  if o.output
      dir = path.join that, dir.slice if base is '.' then 0 else base.length
  source = path.normalize source
  js-path = path.join dir, filename
  !function compile
      e <-! fs.write-file js-path, js.to-string! || '\n'
      return warn e if e
      say-with-timestamp "#source => #js-path" if o.watch or o.debug
  !function compile-with-map
      e <-! fs.write-file js-path, js.code || '\n'
      return warn e if e

      if o.map == 'linked' || o.map == "debug"
        map-path = "#js-path.map"
        e2 <-! fs.write-file map-path, js.map.to-string! || '\n'
        return warn e2 if e2
        if o.map == "debug"
          e3 <-! fs.write-file "#map-path.debug", js.debug || '\n'
          say-with-timestamp "#source => #js-path, #map-path[.debug]" if o.watch or o.debug
        else
          say-with-timestamp "#source => #js-path, #map-path" if o.watch or o.debug
      else
        say-with-timestamp "#source => #js-path" if o.watch or o.debug
  e <-! fs.stat dir
  if o.map != 'none'
    return compile-with-map! unless e
  else
    return compile! unless e
  require 'child_process' .exec do
    "mkdir #{['-p' unless /^win/test process.platform]} #dir" compile

function output-filename filename, json
    path.basename filename .replace /(?:(\.\w+)?\.\w+)?$/ ->
        &1 or if json then '.json' else '.js'

# Pretty-print a stream of tokens.
!function print-tokens tokens
  lines = []
  for [tag, val, lno] in tokens
    (lines[lno] ?= []).push if tag.to-lower-case! is val then tag else "#tag:#val"
  for l in lines
    say (if l then l.join ' ' .replace /\n/g '\\n' else '')

# Start up a new __node.js__ instance with the arguments in `--nodejs` passed
# to it, preserving the other options.
!function fork-node
  [, ...args] = process.argv

  [ls-args, [, ...node-args]] = break-list (in <[ --nodejs -n ]>), args

  require 'child_process' .spawn do
    process.exec-path
    node-args ++ ls-args
    cwd: process.cwd!, stdio: 'inherit'
