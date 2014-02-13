name    : \LiveScript
version : \1.2.0

description : 'LiveScript is a language which compiles to JavaScript. It has a straightforward mapping to JavaScript and allows you to write expressive code devoid of repetitive boilerplate. While LiveScript adds many features to assist in functional style programming, it also has many improvements for object oriented and imperative programming.'

keywords    :
  \language
  \compiler
  \coffeescript
  \coco
  \javascript

author   : 'George Zahariev <z@georgezahariev.com>'
homepage : 'http://livescript.net'
bugs     : \https://github.com/gkz/LiveScript/issues
licenses :
  type: \MIT, url: \https://raw.github.com/gkz/LiveScript/master/LICENSE
  ...

engines     : node: '>= 0.8.0'
directories :
  lib: \./lib
  bin: \./bin
files       :
  \lib
  \bin
  \README.md
  \LICENSE

main : \./lib/livescript
bin  :
  livescript: \./bin/livescript
  lsc: \./bin/lsc
  slake: \./bin/slake

scripts:
  pretest: "bin/slake build && bin/slake build:parser && bin/slake build"
  test: "bin/slake test"
  \test-harmony : "node --harmony ./bin/slake test"
  posttest: "git checkout -- lib"

preferGlobal: true

repository: type: \git, url: \git://github.com/gkz/LiveScript.git

dependencies:
  \prelude-ls : '~1.0.3'

devDependencies:
  jison       : \0.2.1
  \uglify-js  : \1.3.3
