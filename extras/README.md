extras
======

coco.js
-------
Concatenated and compressed version of the Coco compiler
for use in platforms that support JavaScript.

- When loaded in an HTML page, it will compile and evaluate each other
  `<script type=coco>`.
- Works as a JS Module for XUL Applications. e.g.:
      Components.utils.import('resource://xqjs/coco.js');
      Coco.compile(code);
  ref. <https://developer.mozilla.org/en/Using_JavaScript_code_modules>
