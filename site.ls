window <<< require 'prelude-ls'
LiveScript = require "LiveScript"
$ ->
  editor = ace .edit 'compiler-editor'
  editor .setTheme 'ace/theme/textmate'
  editor .setFontSize 16
  editor .renderer .setShowGutter false
  LiveScriptMode = ace .require 'ace/mode/livescript' .Mode
  editor .getSession! .setMode new LiveScriptMode!

  for example in $ '.example .example-ls'
    src = $ example .find \.lang-ls .html!
    $ '<pre class="source"></pre>' .html src .appendTo example

  prettyPrint!

  boom = (action) ->
    source = editor.getValue!
    result = try
      source = "<- (do)\n#source" if action is \run
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
      if action is \run and
      (typeof! result is \Array or typeof! result  is \Object)
        result = JSON.stringify result
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

  $ '#compiler-close-button' .on 'click' ->
    $ '.compiler' .hide!

  $ '.actions button' .on \click ->
    boom($ @ .data \action)

  load-compiler = ->
    $ '.compiler' .show!
    editor .setValue ($ this .find '.source' .text!), 1

  $ '.example' .on \dblclick, load-compiler

  $ '.example' .on 'click', ->
    if $ window .width! <= 768
      load-compiler.call this

  $ '.sidebar .nav'  .on \click \a ->
    $ '.nav li' .removeClass \active
    $ this .closest \li .addClass \active

  $ 'h1 a' .click ->
    $ '.nav li' .removeClass \active
    $ '.nav li' .first!.addClass \active

  $ '.compiler .action-compiler-fullscreen' .on 'click' ->
      $ '.compiler .action-compiler-fullscreen' .toggle!
      $ '.site' .toggle-class 'fullscreen-compiler'

  $ 'body' .scrollspy \refresh 
  $ '.sidebar .nav' .scrollspy offset: 0
