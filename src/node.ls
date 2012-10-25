#### [node.js](http://nodejs.org) setups
# - Override `.run`.
# - Inherit `EventEmitter`.
# - Register _.ls extension.

module.exports = !(LiveScript) ->
  require! [fs, path]

  LiveScript.run = (code, {filename}:options?, js) ->
    {main} = require
    # Hack for relative `require`.
    if filename
      dirname = path.dirname fs.realpathSync \
        filename = process.argv.1 = path.resolve filename
    else
      dirname = filename = \.
    main.paths = main.constructor._nodeModulePaths dirname
    main <<< {filename}
    js or code = LiveScript.compile code, {...options, +bare}
    try main._compile code, filename catch then throw hackTrace e, code, filename

  LiveScript import all require(\events)EventEmitter::

  require.extensions\.ls = (module, filename) ->
    js = LiveScript.compile fs.readFileSync(filename, \utf8), {filename, +bare}
    try module._compile js, filename catch then throw hackTrace e, js, filename

# Weave the source into stack trace.
function hackTrace {stack}:error?, js, filename
  return error unless stack
  traces = stack / \\n
  return error unless traces.length > 1
  for trace, i in traces
    continue if 0 > index = trace.indexOf "(#filename:"
    {1: lno} = /:(\d+):/exec trace.slice index + filename.length or ''
    continue unless +=lno
    {length} = '' + end = lno+4; lines ||= js / \\n
    for n from 1 >? lno-4 to end
      traces[i] += "\n#{ ('    ' + n)slice -length }
                      #{ '|+'charAt n is lno } #{[lines[n-1]]}"
  error <<< stack: traces.join \\n
