require! {
  '..': LiveScript
  path
  fs
  util
  'prelude-ls': {each, lines, unlines, take, keys, filter, dasherize, map}:prelude
}

file-exists = (path) ->
  try
    fs.stat-sync path
    true
dasherize-vars = (str) -> if /^[a-z]/ is str then dasherize str else str
starts-with = (str) -> (.index-of(str) is 0)

# A Read-Eval-Print-Loop.
# Good for simple tests or poking around the
# [**node.js** API](http://nodejs.org/api/).
#
# - __^M__: Compile input, and prints (if _--compile_) or evaluates it.
# - __^J__: Insert linefeed.
# - __^C__: Cancel input if any. Quit otherwise.
# - __??__: <https://github.com/joyent/node/blob/master/lib/readline.js>
!function repl o, stdin = process.stdin, stdout = process.stdout
  say = -> stdout.write "#{util.format.apply null, &}\n"
  warn = console.error
  die = (message) !->
    console.error message
    process.exit 1
  p = (...args) !->
    each console.dir, args
  pp = (x, show-hidden, depth) !->
    say util.inspect x, show-hidden, depth, !process.env.NODE_DISABLE_COLORS
  ppp = !-> pp it, true, null
  MAX-HISTORY-SIZE = 500
  history-file = path.join process.env.HOME, '/.lsc_history'
  code   = if repl.infunc then '  ' else ''
  cont   = 0
  rl     = require 'readline' .create-interface stdin, stdout
  reset  = !->
    rl.line = code := ''
    rl.prompt!
    repl.inheredoc = false
  ({_tty-write} = rl)._tty-write = (char) ->
    if char in ['\n' '>']
    then cont += 1
    else cont := 0
    _tty-write ...
  prompt = 'ls'
  prompt += " -#that" if 'b' * !!o.bare + 'c' * !!o.compile
  try rl.history = lines <| fs.read-file-sync history-file, 'utf-8' .trim!
  LiveScript.history = rl.history if LiveScript?
  unless o.compile
    module.paths = module.constructor._node-module-paths \
      module.filename = process.cwd! + '/repl'
    vm = require 'vm'
    global <<< prelude if o.prelude
    repl-ctx = {}
    repl-ctx <<< global
    repl-ctx <<< {module, exports, require}
    repl-ctx <<< {LiveScript, path, fs, util, say, warn, die, p, pp, ppp}
    server = require 'repl' .REPLServer:: with
      context: repl-ctx
      commands: []
      use-global: true
      use-colors: process.env.NODE_DISABLE_COLORS
      eval: !(code,ctx,, cb) ->
        try res = vm.run-in-new-context code, ctx, 'repl' catch
        cb e, res
    rl.completer = (line, cb) ->
      context-vars = map dasherize-vars, keys server.context
      matches = filter (starts-with line), context-vars
      cb null, [if matches.length then matches else context-vars, line]

  rl.on 'SIGCONT' rl.prompt
  rl.on 'SIGINT' !->
    if @line or code
      say ''
      reset!
    else @close!
  rl.on 'line' !->
    repl.infunc = false if it.match /^$/ # close with a blank line without spaces
    repl.infunc = true if it.match(/(\=|\~>|->|do|import|switch)\s*$/) or (it.match(/^!?(function|class|if|unless) /) and not it.match(/ then /))
    if (0 < cont < 3 or repl.infunc) and not repl.inheredoc
      code += it + '\n'
      @output.write '.' * prompt.length + '. '
      return
    else
      isheredoc = it.match /(\'\'\'|\"\"\")/g
      if isheredoc and isheredoc.length % 2 is 1 # odd number of matches
        repl.inheredoc = not repl.inheredoc
      if repl.inheredoc
        code += it + '\n'
        rl.output.write '.' * prompt.length + '" '
        return
    repl.inheredoc = false
    return reset! unless code += it
    try
      if o.compile
        say LiveScript.compile code, {o.bare}
      else
        ops = {'eval', +bare, save-scope:LiveScript}
        ops = {+bare} if code.match /^\s*!?function/
        x  = vm.run-in-new-context LiveScript.compile(code, ops), repl-ctx, 'repl'
        repl-ctx <<< {_:x} if x?
        pp  x
        say x if typeof x is 'function'
    catch then say e
    reset!
  if stdin == process.stdin
    rl.on 'close' ->
      say ''
      process.exit!
    process.on 'uncaughtException' !-> say "\n#{ it?stack or it }"
    process.on 'exit' !->
      rl._tty-write '\r' if code and rl.output.is-TTY
      if file-exists history-file
        (unlines . take MAX-HISTORY-SIZE) rl.history
        |> fs.write-file-sync history-file, _
  rl.set-prompt "#prompt> "
  rl.prompt!

module.exports = repl
