# Quick and dirty implementation of
# [code-illuminated](http://code.google.com/p/code-illuminated/)-esque
# documentation system. Imported from [src/index.html](#).

navi = document.getElementById 'navi'
docs = document.getElementById 'docs'

htmls = {}

build = (page, source) ->
  [name] = page
  blocks = []
  comm = code = ''
  re = /^[^\n\S]*#(?!##[^#]|{) ?(.*)/
  br = true
  for line of source.split '\n'
    unless line
      br = true
      code += '\n' if code
      continue
    if m = re.exec line
      if code or comm and br
        blocks.push [comm, code]
        comm = code = ''
      comm += m[1] + '\n'
    else
      code += line + '\n'
    br = false
  blocks.push [comm, code] if comm
  html = "<h1>#{name}</h1>"
  for [comm, code], i of blocks
    html += """
      <div id=#{i} class=section>
      <div class=comment>
        <a class=anchor href=##{name}#{i}>##{i}</a>
        #{ new Showdown.converter().makeHtml comm }
      </div>
      <pre class="code prettyprint lang-coffee">#{
        code.replace /&/g, '&amp;'
            .replace /</g, '&lt;'
      }</pre>
      </div>
    """
  load page, htmls[name] = html

load = ([name, sect], html) ->
  document.title = name + ' - Coco Docs'
  docs.innerHTML = html
  docs.style.display = 'block'
  document.getElementById(sect).scrollIntoView() if sect
  prettyPrint()

do @onhashchange = navigate = ->
  docs.style.display = 'none'
  unless page = /^\D+(?=(\d*)$)/.exec location.hash.slice 1
    navi.className = ''
    return
  navi.className = 'menu'
  [name] = page
  if name in htmls
    load page, htmls[name]
    return
  xhr = new XMLHttpRequest
  xhr.open 'GET', name + '.coffee', true
  xhr.overrideMimeType? 'text/plain'
  xhr.onreadystatechange = ->
    build page, xhr.responseText if xhr.readyState is 4
  xhr.send null
