# Override exported methods for non-Node.js engines.

Coco = require './coco'
Coco.require = require

# Use standard JavaScript `eval` to eval code.
Coco.eval = -> eval Coco.compile @0, @1

# Running code does not provide access to this scope.
Coco.run = (code, options = {}) ->
  options.bare = true
  Function(Coco.compile code, options)()

# If we're not in a browser environment, we're finished with the public API.
return unless window?

# Load a remote script from the current domain via XHR.
Coco.load = (url, options) ->
  xhr = new (window.ActiveXObject or XMLHttpRequest) 'Microsoft.XMLHTTP'
  xhr.open 'GET', url, true
  xhr.overrideMimeType 'text/plain' if 'overrideMimeType' in xhr
  xhr.onreadystatechange = ->
    Coco.run xhr.responseText, options if xhr.readyState is 4
  xhr.send null

# Activate Coco in the browser by having it compile and evaluate
# all script tags with a content-type of `text/Coco`.
# This happens on page load.
runScripts = ->
  for script of document.getElementsByTagName 'script'
    continue unless script.type is 'text/coco'
    if script.src
    then Coco.load script.src
    else Coco.run  script.innerHTML
  null
if window.addEventListener
then addEventListener 'DOMContentLoaded', runScripts, false
else attachEvent 'onload', runScripts
