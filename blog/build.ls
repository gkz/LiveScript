require! fs

say = console.log
slurp = -> '' + fs.readFileSync ...
spit = fs.writeFileSync
dir = fs.readdirSync

post-template = slurp \post-template.html
test-name = (.match /.+\.html$/)

switch process.argv.2
| 'build' => build-all!
| 'watch' =>
  watch \post-template.html ->
    post-template := slurp \post-template.html
    build-all!

  dir \posts .for-each (post) ->
    if test-name post
      watch "posts/#post", -> build post
| otherwise => say "unrecognized command: #{process.argv}"

!function build-all
  for post in dir \posts when test-name post
    build post

!function build post
  console.log "BUILDING: #post"
  [head, content] = slurp "posts/#post" .split \-----
  options = {}
  for line in head.split \\n when result = line.match /([a-z]+): (.+)/
    options[result.1] = result.2.trim!
  options.content = content
  options.url = post

  output = post-template
  for option, value of options
    output = output.replace //{{#option}}//g value

  spit post, output

!function watch source, action
  :repeat let ptime = 0
    {mtime} <-! fshoot \stat source
    action! if ptime .^. mtime
    set-timeout repeat, 500ms, mtime

# Calls a `fs` method, exiting on error.
!function fshoot name, arg, callback
  e, result <-! fs[name] arg
  die e.stack || e if e
  callback result

!function die
  warn it
  process.exit 1

!function warn
  process.stderr.write it + \\n
