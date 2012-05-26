import prelude
$ ->
  for example in $ '.example .example-ls'
    src = $ example .find \.lang-ls .html!
    $ '<pre class="source"></pre>' .html src .appendTo example

  prettyPrint!

  !boom(action) = 
    source = $ '.compiler textarea' .val!
    result = try 
      func = if action is \run then \compile else action
      LiveScript[func](source, {+bare})
    catch e
      error = true
      e.message
    if action is \run
      result = try
        eval result
      catch e
        error = true
        e.message
    if result?
      console?.log result
      if action in <[ lex tokens ]>
        lns = []
        for [tag, val, line]  in result
          lns[line] ?= [] 
          lns[line].push if val is tag.toLowerCase! then tag else "#tag:#val"
        for line, i in lns 
          lns[i] = line?join(' ')replace /\n/g \\\n or ''
        result = lns * \\n
      result = _.escape result
      result = result.replace /\n/g, '<br>' .replace /\ /g, \&nbsp;
      if action is \compile and not error
        result = prettyPrintOne result, 'lang-js', false

      toPrepend = if error
        """<div>
        <h3>#action - error<span class="close" title="Close" >&times;</span></h3>
        <div class="alert alert-error">#result</div>
        </div>"""
      else
        """<div>
        <h3>#action<span class="close" title="Close" >&times;</span></h3>
        <pre class="prettyprint lang-js">#result</pre>
        </div>"""

      $ toPrepend .prependTo '.compiler-output' .attr \title, source

  $ '.compiler-output' .on \click \.close ->
    $(this) .parent! .parent! .hide!   # or remove()
    return false

  $ '.actions button' .on \click ->
    boom($ @ .data \action)

  $ '.example' .on \dblclick ->
    $ '.compiler textarea' .val($ this .find '.source' .text!)

  $ '.sidebar .nav'  .on \click \a ->
    $ '.nav li' .removeClass \active
    $ this .closest \li .addClass \active

  $ 'h1 a' .click ->
    $ '.nav li' .removeClass \active
    $ '.nav li' .first!.addClass \active

  $ 'body' .scrollspy \refresh 
  $ '.sidebar .nav' .scrollspy offset: 0
