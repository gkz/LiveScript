extras
======

coco.js
-------
Concatenated and compressed version of the Coco compiler
for use in any platform that supports JavaScript.

- When loaded in an HTML page, it will compile and evaluate each other
  `<script type=coco>`.

- Works as a minimal compiler for
  [WSH](http://en.wikipedia.org/wiki/Windows_Script_Host).
  Try dropping .co files if you're on Windows.

- Works as a [JS Module for XUL Applications](https://developer.mozilla.org/en/Using_JavaScript_code_modules).

        Components.utils.import('resource://xqjs/coco.js')
        var js = Coco.compile(co)

mode-coco.js
------------
Coco mode for [Ace](http://ace.ajax.org) editor.
