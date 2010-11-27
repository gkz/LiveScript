# A very simple Read-Eval-Print-Loop. Compiles one line at a time to JavaScript
# and evaluates it. Good for simple tests, or poking around the **Node.js** API.

Coco = require './coco'

global.say = -> process.stdout.write it + '\n'; return
global.__defineGetter__ 'quit', -> process.exit 0

repl = require('readline').createInterface stdin = process.openStdin()
stdin.on 'data', repl&.write
repl.on 'close', stdin&.destroy
repl.on 'line', ->
  try
    r = Coco.eval "#{it}", bare: true, globals: true, fileName: 'repl'
  catch e
    r = e?.stack or e
  say r unless r is void
  repl.prompt()
repl.setPrompt 'coco> '
repl.prompt()
