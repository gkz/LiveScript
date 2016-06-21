window <<< require 'prelude-ls'
LiveScript = require "livescript"

<- $
for example in $ '.example .example-ls'
    src = $ example .find '.lang-ls' .html!
    $ '<pre class="source"></pre>' .html src .append-to example

pretty-print!

boom = (action) ->
    source = $ '.compiler textarea' .val!
    result = try
        source = "<- (do)\n#source" if action is 'run'
        func = if action is 'run' then 'compile' else action
        LiveScript[func] source, {+bare, -header}
    catch e
        error = true
        e.message

    if action is 'run'
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
                lns[line].push if val is tag.to-lower-case! then tag else "#tag:#val"
            for line, i in lns
                lns[i] = line?.join ' ' .replace /\n/g '\\n' or ''
            result = lns.join '\n'
        if action is 'run' and
        (typeof! result is 'Array' or typeof! result  is 'Object')
            result = JSON.stringify result
        result = _.escape result
        result = result.replace /\n/g, '<br>' .replace /\ /g, '&nbsp;'
        if action is 'compile' and not error
            result = pretty-print-one result, 'lang-js', false

        to-prepend = if error
            """<div>
            <h3>#action - error<span class="close" title="Close" >&times;</span></h3>
            <div class="alert alert-error">#result</div>
            </div>"""
        else
            """<div>
            <h3>#action<span class="close" title="Close" >&times;</span></h3>
            <pre class="prettyprint lang-js">#result</pre>
            </div>"""

        $ to-prepend .prepend-to '.compiler-output' .attr \title, source

$ '.compiler-output' .on 'click' '.close' ->
    $ this .parent! .parent! .hide!
    false

$ '#compiler-close-button' .on 'click' ->
    $ '.compiler' .hide!

$ '.actions button' .on 'click' ->
    boom <| $ this .data 'action'

load-compiler = ->
    $ '.compiler' .show!
    $ '.compiler textarea' .val <| $ this .find '.source' .text!

$ '.example' .on 'dblclick' load-compiler

$ '.example' .on 'click', ->
    if $ window .width! <= 768
        load-compiler.call this

$ '.sidebar .nav'  .on 'click' 'a' ->
    $ '.nav li' .remove-class 'active'
    $ this .closest 'li' .add-class 'active'

$ 'h1 a' .click ->
    $ '.nav li' .remove-class 'active'
    $ '.nav li' .first!.addClass 'active'

$ '.compiler .action-compiler-fullscreen' .on 'click' ->
    $ '.compiler .action-compiler-fullscreen' .toggle!
    $ '.site' .toggle-class 'fullscreen-compiler'

$ 'body' .scrollspy 'refresh'
$ '.sidebar .nav' .scrollspy offset: 0
