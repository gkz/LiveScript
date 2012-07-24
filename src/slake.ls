# `slake` is a simplified version of [Make](http://www.gnu.org/software/make/)
# ([Rake](http://rake.rubyforge.org/), [Jake](http://github.com/280north/jake))
# for LiveScript. You define tasks with names and descriptions in a Slakefile,
# and can call them from the command line, or invoke them from other tasks.
#
# Running `slake` with no arguments will print out a list of all the tasks in the
# current directory's Slakefile.

# Keep track of the list of defined tasks, the accepted options, and so on.
Tasks    = __proto__: null
Aliases  = __proto__: null
Flags    = {}
Options  = {}

# The top-level objects for Slakefiles to use directly.
global import
  LiveScript : require \./livescript
  fs   : require \fs
  path : require \path

  # Define a slake task with a short name, an optional sentence description,
  # and the function to run as the action itself.
  task: (name, description, action) ->
    [action, description] = [description, ''] unless action
    Aliases[name.split(/\W+/)filter(String)map(-> it.0)join ''] ||= name
    Tasks[name] = {name, description, action}

  # Define an option that the Slakefile accepts. The parsed options hash,
  # containing all of the command-line options passed, will be made available
  # as the first argument to the action.
  option: (name, ...spec) -> Flags[name] = spec

  # Invoke another task in the current Slakefile.
  invoke: (name) ->
    unless task = Tasks[name] or Tasks[Aliases[name]]
      console.error 'no such task: "%s"' name
      process.exit 1
    task.action Options

  # Utilities.
  say   : -> process.stdout.write it + \\n
  slurp : -> '' + fs.readFileSync ...
  spit  : fs.writeFileSync
  dir   : fs.readdirSync

args     = process.argv.slice 2
filename = args.0 in <[ -f --slakefile ]> and args.splice(0 2)1 or \Slakefile
fs.exists filename, :rec(affirmative) ->
  unless affirmative
    if process.cwd! is \/
      console.error 'no "%s"' filename
      process.exit 1
    process.chdir \..
    return fs.exists filename, rec
  optparse = require \./optparse
  LiveScript.run slurp(filename), {filename}
  Options := optparse Flags, args
  if args.length
  # Execute tasks in order.
  then Options.$args.forEach invoke
  # If no tasks are passed, print the help screen.
  else printTasks()

# Display the list of tasks in a format similar to `rake -T`.
function printTasks
  say '''
    Usage: slake [slake options] [task options] [tasks]

    Tasks:
  '''
  width = Math.max ...Object.keys(Tasks)map -> it.length
  pad   = ' ' * width
  for name, task of Tasks
    say "  #{ (name + pad)slice 0 width }  #{task.description}"
  say '\nTask options:\n' + that if Options.toString()
  say '''

    Slake options:
      -f, --slakefile FILE  use FILE as the Slakefile
  '''
