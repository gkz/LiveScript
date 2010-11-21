# `coke` is a simplified version of [Make](http://www.gnu.org/software/make/)
# ([Rake](http://rake.rubyforge.org/), [Jake](http://github.com/280north/jake))
# for Coco. You define tasks with names and descriptions in a Cokefile,
# and can call them from the command line, or invoke them from other tasks.
#
# Running `coke` with no arguments will print out a list of all the tasks in the
# current directory's Cokefile.

# External dependencies.
FS             = require 'fs'
Path           = require 'path'
Coco           = require './coco'
{OptionParser} = require './optparse'

# Keep track of the list of defined tasks, the accepted options, and so on.
Tasks    = {}
Switches = []

# Mixin the top-level coke functions for Cokefiles to use directly.
global import

  # Define a coke task with a short name, an optional sentence description,
  # and the function to run as the action itself.
  task: (name, description, action) ->
    [action, description] = [description] unless action
    Tasks[name] = {name, description, action}

  # Define an option that the Cokefile accepts. The parsed options hash,
  # containing all of the command-line options passed, will be made available
  # as the first argument to the action.
  option: (letter, flag, description) ->
    Switches.push [letter, flag, description]

  # Invoke another task in the current Cokefile.
  invoke: (name) ->
    unless name in Tasks
      console.error "no such task: \"#{name}\""
      process.exit 1
    Tasks[name].action this

# Run `coke`. Executes all of the tasks you pass, in order. Note that Node's
# asynchrony may cause tasks to execute in a different order than you'd expect.
# If no tasks are passed, print the help screen.
exports.run = ->
  args = process.argv.slice 2
  fileName = args.splice(0, 2)[1] if args[0] of <[ -f --cokefile ]>
  Path.exists fileName ||= 'Cokefile', (exists) ->
    unless exists
      console.error "no \"#{fileName}\" in #{ process.cwd() }"
      process.exit 1
    Coco.run "#{ FS.readFileSync fileName }", {fileName}
    oparser = new OptionParser Switches
    return printTasks oparser unless args.length
    options = oparser.parse args
    options.arguments.forEach invoke, options

# Display the list of tasks in a format similar to `rake -T`
printTasks = (oparser) ->
  console.log ''
  width = Math.max Object.keys(Tasks).map(-> it.length)...
  pad   = Array(width >> 1).join '  '
  for name, task in Tasks
    desc = if task.description then '# ' + task.description else ''
    console.log "coke #{ (name + pad).slice 0, width } #{desc}"
  console.log if Switches.length then oparser.help() else ''
  console.log '''
    Coke options:
      -f, --cokefile [FILE]   use FILE as the Cokefile
  '''
