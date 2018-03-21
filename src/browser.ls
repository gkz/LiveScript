LiveScript = require './index'

# `.run`s LiveScript code and calls back, passing error if any.
LiveScript.stab = (code, callback, filename) !->
    try
        LiveScript.run code, {filename, map: 'embedded'}
    catch
    callback? e

# `.stab`s a remote script via `XMLHttpRequest`.
LiveScript.load = (url, callback) ->
    xhr = new XMLHttpRequest
    xhr.open 'GET', url, true
    xhr.override-mime-type 'text/plain' if 'overrideMimeType' of xhr
    xhr.onreadystatechange = !->
        if xhr.ready-state is 4
            if xhr.status in [200 0]
                LiveScript.stab xhr.response-text, callback, url
            else
                callback? Error "#url: #{xhr.status} #{xhr.status-text}"
    xhr.send null
    xhr

# Execute `<script>`s with _livescript_ type.
LiveScript.go = !->
    type = //^ (?: text/ | application/ )? ls $//i
    sink = !(error) -> error and set-timeout -> throw error

    for script in document.get-elements-by-tag-name 'script' when type.test script.type
        if script.src
            LiveScript.load that, sink
        else
            LiveScript.stab script.inner-HTML, sink, script.id

module.exports = LiveScript
