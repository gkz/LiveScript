# A very simple Read-Eval-Print-Loop. Compiles one line at a time to JavaScript
# and evaluates it. Good for simple tests, or poking around the **Node.js** API.
# Using it looks like this:
#
#     coco> console.log "#{num} bottles of beer" for num from 99 to 1 by -1

Coco     = require './coco'
readline = require 'readline'

# Start by opening up **stdio**.
stdio = process.openStdin()

# Quick alias for quitting the REPL.
global.quit = -> process.exit 0

# The main REPL function. **run** is called every time a line of code is entered.
# Attempt to evaluate the command. If there's an exception, print it out instead
# of exiting.
run = (buffer) ->
  try
    val = Coco.eval buffer.toString(), bare: true, globals: true, fileName: 'repl'
    console.log val unless val is void
  catch err
    console.error "#{ err.stack or err }"
  repl.prompt()

# Create the REPL by listening to **stdin**.
repl = readline.createInterface stdio
repl.setPrompt 'coco> '
stdio.on 'data',   (buffer) -> repl.write buffer
repl.on  'close',  -> stdio.destroy()
repl.on  'line',   run
repl.prompt()
