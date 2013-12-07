LiveScript 2
============

## Principles
- Any JS library must be seamlessly accessible from LS2
- Compiled LS2 must be seamlessly accessible from JS
- Semantically, everything widely done in JS should be possible in LS2, thus someone coming from JS should be able to code as they would in JS but with a different syntax, and add the improved features with time
- The opposite will not be true, there will be features in LS2 which do not have direct counterparts in JS
- Thus, functional and imperative (including object oriented) approaches will be possible
- Compiled LS2 output JS must be as fast or faster than hand written JS doing the same task
- Output target will be ES6, however the compiler should have an ES5 compile mode which will compile to ES5 with shims as necessary
- Having the outputted JS be pretty is less important as source maps will be used
