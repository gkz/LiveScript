#### [node.js](http://nodejs.org) setups
# - Override `.run`.
# - Inherit `EventEmitter`.
# - Register _.ls extension.

module.exports = !(LiveScript) ->
    require! [fs, path, events]

    LiveScript.run = (code, {filename}:options?, {js, context} = {}) ->
        {main} = require
        # Hack for relative `require`.
        dirname = if filename
            path.dirname fs.realpath-sync filename |>= path.resolve
        else
            filename = '.'
        main.paths = main.constructor._node-module-paths dirname
        main <<< {filename}
        unless js
            code = LiveScript.compile code, {...options, +bare}
            code = that if code.code
        if context
            global.__run-context = context
            code = "return (function() {\n#code\n}).call(global.__runContext);"
        filename += '(js)'
        try
            main._compile code, filename
        catch
            throw hack-trace e, code, filename

    LiveScript <<<< events.EventEmitter.prototype

    require.extensions.'.ls' = (module, filename) ->
        file = fs.read-file-sync filename, 'utf8'
        js = if '.json.ls' is filename.substr -8
            'module.exports = ' + LiveScript.compile file, {filename, +json}
        else
            LiveScript.compile file, {filename, +bare, map: "embedded"} .code
        try
            module._compile js, filename
        catch
            throw hack-trace e, js, filename

# Weave the source into stack trace.
function hack-trace {stack}:error?, js, filename
    return error unless stack
    traces = stack.split '\n'
    return error unless traces.length > 1
    for trace, i in traces
        continue if 0 > index = trace.index-of "(#filename:"
        {1: lno} = /:(\d+):/.exec trace.slice index + filename.length or ''
        continue unless lno = +lno
        end = lno + 4
        {length} = '' + end
        lines ||= js.split '\n'
        for n from 1 >? lno - 4 to end
            traces[i] += "\n#{ ('    ' + n).slice -length }
                            #{ '|+'.char-at n is lno } #{[lines[n - 1]]}"
    error <<< stack: traces.join '\n'
