require! {
  '..': LiveScript
  path
  fs
  util
  os
  'prelude-ls': {each, lines, unlines, take}:prelude
}

file-exists = (path) ->
  try
    fs.stat-sync path
    true

# The dasherize in prelude-ls adds an extra '-' suffix to initial strings of
# uppercase letters; we don't want this.
dasherize = -> (it
  .replace /([^-A-Z])([A-Z]+)/g, (, lower, upper) ->
    "#{lower}-#{if upper.length > 1 then upper else upper.to-lower-case!}"
  .replace /^([A-Z]+)/, (, upper) ->
    if upper.length > 1 then upper else upper.to-lower-case!)
dasherize-vars = (str) -> if /^[a-z]/ is str then dasherize str else str

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
  home-dir = os.homedir?! or process.env.HOME or process.env.USERPROFILE
  history-file = path.join home-dir, '/.lsc_history'
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
    var vm-error
    {REPLServer} = require 'repl'
    server-options =
      use-global: true
      use-colors: process.env.NODE_DISABLE_COLORS
      eval: (code, ctx,, cb) !->
        try res = vm.run-in-new-context code, ctx, 'repl' catch
        cb e, res
    node-version = process.versions.node.split('.')
    if +node-version.0 > 6 or +node-version.0 == 6 and +node-version.1 >= 4
      # Tab completion breaks on Node.js >=6.4 with the code on the other
      # branch.
      class DummyStream extends (require 'stream')
        readable: true
        writable: true
        resume: ->
        write: ->
      server = new REPLServer server-options <<<
        stream: new DummyStream
      repl-ctx = server.context
    else
      # Preserving the Node.js <6.4 code is perhaps overly conservative, but it
      # has the look of delicate hacks that have been precariously balanced over
      # the years.
      repl-ctx = {}
      repl-ctx <<< global
      repl-ctx <<< {module, exports, require}
      server = REPLServer:: with server-options <<<
        context: repl-ctx
        commands: []
    repl-ctx <<< {LiveScript, path, fs, util, say, warn, die, p, pp, ppp}
    rl.completer = (line, cb) !->
      if analyze-for-completion line
        {js, line-ends-in-dash, completed-from, last-part} = that
      else
        return cb null, [[], line]

      e, [matches, _] <-! server.complete js
      return cb e if e?

      to-remove = js.length
      incomplete-expr = line.substr completed-from
      new-matches = for m in matches
        if m is ''
          # m is '' if the REPL engine thinks we should have a blank in the
          # output. Indulge it.
          m
        else
          completion = m.substr to-remove
          if last-part?
            completion-starts-word = completion is /^[A-Z]/
            if line-ends-in-dash
              continue unless completion-starts-word
              completion = dasherize completion
            else if last-part isnt /(^[^a-z])|[a-z-][A-Z]/
              completion = dasherize completion
              if completion-starts-word
                completion = '-' + completion
          else
            completion = dasherize-vars completion
          incomplete-expr + completion
      cb null, [new-matches, incomplete-expr]

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
    catch
      unless o.compile
        vm-error ?:= vm.run-in-new-context 'Error' repl-ctx
        unless e instanceof vm-error
          # There's an odd little Node.js bug (I think it's a bug) where if code
          # inside the child context throws something that isn't an Error or one
          # of its subtypes, stdin gets all messed up and the REPL stops
          # responding correctly to keypresses like up/down arrow. This fixes it,
          # and I wish I had more of an explanation why than the old
          # jiggle-it-until-it-works principle.
          if typeof stdin.set-raw-mode is \function
            stdin.set-raw-mode off
            stdin.set-raw-mode on
      say e
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

# Helper function used in REPL completion.
# Returns an object with the following:
#   js: The longest chain found at the end of `line`, as a JavaScript string
#   last-part: The last part of this chain, in its original format
#   completed-from: The position in `line` where this chain starts
#   line-ends-in-dash: A boolean
# Returns nothing if the line couldn't be analyzed and no attempt at completion
# should be made.
function analyze-for-completion line
  line-ends-in-dash = line[*-1] is '-'
  completed-from = line.length

  try
    # Adding Z is a hack to permit 'set-' to be completed with, for example,
    # 'set-timeout', while still ensuring that something like '1-' gets
    # completed with globals.
    tokens = LiveScript.tokens(if line-ends-in-dash then line + 'Z' else line)
  catch
    return

  if tokens.length == 0 then js = ''
  else
    # Clear out any stray terminating tokens
    if tokens[*-1]0 is \NEWLINE then tokens.pop!
    while (t = tokens[*-1]0) is \DEDENT or t is \)CALL then tokens.pop!

    # Undo the Z hack
    last-token = tokens[*-1]
    if line-ends-in-dash
      throw "unexpected token #{last-token.0}" unless last-token.0 is \ID
      if last-token.1 is \Z
        tokens.pop!
        last-token = tokens[*-1]
      else
        last-token.1.=substr 0, last-token.1.length - 1

    # There's nothing to complete after literals, unless we were in a list or
    # object or something, but in that case the lexer will fail prior to this
    # anyway.
    return if last-token.0 is \STRNUM

    js-parts = []
    :token_loop while tokens.length
      switch (token = tokens.pop!).0
      case \ID \DOT
        completed-from = token.3
        # DOT can mean more than just . (it can also mean accessignment,
        # semiautovivification, binding access, etc.).  But for completion
        # purposes, replacing those fancy dots with plain . will do the right
        # thing.
        js-parts.unshift (if token.0 is \DOT then \. else token.1)
      default break token_loop
    js = js-parts.join ''

    # Take from `line` because we want original format, not camelCased token.
    last-part = line.substr last-token.3 if last-token.0 is \ID

  {line-ends-in-dash, completed-from, js, last-part}

module.exports = repl
