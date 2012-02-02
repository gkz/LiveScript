name    : \LiveScript
version : \0.1.0

description : 'Coco derivative.'
keywords    :
  \language
  \compiler
  \coffeescript
  \coco
  \javascript

licenses :
  type: \MIT, url: \https://github.com/satyr/coco/raw/master/LICENSE
  ...

engines     : node: '>= 0.6.2'
directories : lib: \./lib

main : \./lib/livescript
bin  :
  livescript: \./lib/command.js
  slake: \./lib/slake.js

repository: type: \git, url: \git://github.com/gkz/LiveScript.git

devDependencies:
  jison      : \0.2.1
  \uglify-js : \1.2.3
