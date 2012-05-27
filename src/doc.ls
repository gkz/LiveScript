# Quick and dirty implementation of
# [code-illuminated](http://code.google.com/p/code-illuminated/)-esque
# annotated source viewer.
#
# View [source](#) for usage.

{title} = document

doc = document.getElementById \doc or lmn \div id: \doc
nav = document.getElementById \nav or let
  h  = '<div class=pointee>&#x2935;</div>'
  h += "<h1>#title</h1>" if title
  for co in sources
    h += if co then "<li><a href=##co>#co</a>" else '<p class=spacer>'
  h += '<li class=index><a href=#>#</a>'
  lmn \ul id: \nav, innerHTML: h

htms = __proto__: null

# [showdown](http://attacklab.net/showdown/) converts the Markdown comments.
sdcv = new Showdown.converter

do @onhashchange = !->
  unless page = /^\D+(?=(\d*)$)/exec location.hash.slice 1
    document <<< {title}
    nav.className = doc.innerHTML = ''
    return
  nav.className = \menu
  doc.innerHTML = \...
  [name] = page
  return load page, that if htms[name]
  xhr = new XMLHttpRequest
  xhr.open \GET if name is not \Slakefile then name + \.co else name, true
  xhr.overrideMimeType? \text/plain
  xhr.onreadystatechange = !->
    load page, htms[name] = build name, xhr.responseText if xhr.readyState is 4
  xhr.send null

function lmn name, attrs
  document.body.appendChild document.createElement(name) <<<< attrs

!function load [name, sect], doc.innerHTML
  document.title = name + (title and ' - ' + title)
  document.getElementById(sect)scrollIntoView! if sect
  # [google-code-prettify](http://code.google.com/p/google-code-prettify/)
  # highlights the code, with the help of our [lang-co](#lang-co) plugin.
  prettyPrint!

function build name, source
  htm = comment = code = i = ''
  re  = /^[^\n\S]*#(?![!{$A-Za-z_]) ?(.*)/
  for line in source.split \\n
    unless line
      br = true
      code &&+= \\n
      continue
    if re.exec line
      if code or comment and br
        htm += block name, comment, code, i++
        comment = code = ''
      comment += that.1 + \\n
    else
      code += line + \\n
    br = false
  htm += block name, comment, code, i if comment or code
  "<h1>#name</h1>#htm<br clear=both>"

function block name, comment, code, i
  code &&= """
   <pre class="code prettyprint lang-co"
    >#{ code.replace(/&/g '&amp;')replace(/</g '&lt;') }</pre>
  """
  """
   <div id=#i class=block><div class=comment
    ><a class=anchor href=##name#i>##i</a
    >#{ sdcv.makeHtml comment }</div
    >#code</div>
  """
