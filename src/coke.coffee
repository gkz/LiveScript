# `coke` is a simplified version of [Make](http://www.gnu.org/software/make/)
# ([Rake](http://rake.rubyforge.org/), [Jake](http://github.com/280north/jake))
# for Coco. You define tasks with names and descriptions in a Cokefile,
# and can call them from the command line, or invoke them from other tasks.
#
# Running `coke` with no arguments will print out a list of all the tasks in the
# current directory's Cokefile.

# External dependencies.
fs     = require 'fs'
path   = require 'path'
oparse = require './optparse'
Coco   = require './coco'

# Keep track of the list of defined tasks, the accepted options, and so on.
tasks    = {}
options  = {}
switches = []

# Mixin the top-level coke functions for Cokefiles to use directly.
global import

  # Define a coke task with a short name, an optional sentence description,
  # and the function to run as the action itself.
  task: (name, description, action) ->
    [action, description] = [description] unless action
    tasks[name] = {name, description, action}

  # Define an option that the Cokefile accepts. The parsed options hash,
  # containing all of the command-line options passed, will be made available
  # as the first argument to the action.
  option: (letter, flag, description) ->
    switches.push [letter, flag, description]

  # Invoke another task in the current Cokefile.
  invoke: (name) ->
    unless name in tasks
      console.error "no such task: \"#{task}\""
      process.exit 1
    tasks[name].action options

# Run `coke`. Executes all of the tasks you pass, in order. Note that Node's
# asynchrony may cause tasks to execute in a different order than you'd expect.
# If no tasks are passed, print the help screen.
exports.run = ->
  path.exists 'Cokefile', (exists) ->
    unless exists
      console.error "no Cokefile in #{ process.cwd() }"
      process.exit 1
    args = process.argv.slice 2
    Coco.run fs.readFileSync('Cokefile').toString(), fileName: 'Cokefile'
    oparse  := new oparse.OptionParser switches
    return printTasks() unless args.length
    options := oparse.parse args
    options.arguments.forEach invoke

# Display the list of tasks in a format similar to `rake -T`
printTasks = ->
  console.log ''
  width = Math.max (name.length for all name in tasks)...
  pad   = Array(width).join ' '
  for all name, task in tasks
    desc = if task.description then '# ' + task.description else ''
    console.log "coke #{ (name + pad).slice 0, width } #{desc}"
  console.log oparse.help() if switches.length
