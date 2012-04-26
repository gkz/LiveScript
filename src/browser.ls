# `.run`s LiveScript code and calls back, passing error if any.
LiveScript.stab(code, callback, error) =
  try LiveScript.run code catch then error = e
  callback error

# `.stab`s a remote script via `XMLHttpRequest`.
LiveScript.load(url, callback or ->) =
  xhr = new (self.ActiveXObject or XMLHttpRequest) \Microsoft.XMLHTTP
  xhr.open \GET, url, true
  xhr.overrideMimeType \text/plain if \overrideMimeType in xhr
  xhr.onreadystatechange = !->
    if xhr.readyState is 4
      if xhr.status in [200 0]
      then LiveScript.stab xhr.responseText, callback
      else callback Error "#url: #{xhr.status} #{xhr.statusText}"
  xhr.send null
  xhr

# Execute `<script>`s with _livescript_ type.
type = //^ (?: text/ | application/ )? ls $//i
sink(error) = error and setTimeout -> throw error
for script in document.getElementsByTagName \script
  if type.test script.type
    if script.src
    then LiveScript.load that            , sink
    else LiveScript.stab script.innerHTML, sink
