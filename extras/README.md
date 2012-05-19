extras
======

livescript.js
-------
Concatenated and compressed version of the LiveScript compiler
for use in any platform that supports JavaScript.

- When loaded in an HTML page, it will compile and evaluate each
  `<script type="ls">`.

- Works as a [JS Module for XUL Applications](https://developer.mozilla.org/en/Using_JavaScript_code_modules).

        Components.utils.import('resource://xqjs/livescript.js')
        var js = LiveScript.compile(co)
