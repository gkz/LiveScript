name: 'livescript'
version: '1.6.1'

description: 'LiveScript is a language which compiles to JavaScript. It has a straightforward mapping to JavaScript and allows you to write expressive code devoid of repetitive boilerplate. While LiveScript adds many features to assist in functional style programming, it also has many improvements for object oriented and imperative programming.'

keywords:
  'language'
  'compiler'
  'coffeescript'
  'coco'
  'javascript'
  'functional'

author: 'George Zahariev <z@georgezahariev.com>'
homepage: 'http://livescript.net'
bugs: 'https://github.com/gkz/LiveScript/issues'
license: 'MIT'

engines:
  node: '>= 0.8.0'
directories:
  lib: './lib'
  bin: './bin'
files:
  'lib'
  'bin'
  'README.md'
  'LICENSE'

main: './lib/'
browser: './lib/browser.js'
bin:
  lsc: './bin/lsc'

scripts:
  browser: 'node bin/lsc index.ls --browser'
  clean: 'node bin/lsc index.ls --clean'
  coverage: 'node bin/lsc index.ls --coverage'
  lib: 'node bin/lsc index.ls --lib'
  'package': 'node bin/lsc index.ls --package'
  test: 'node script/test'
  posttest: 'git checkout -- lib'

prefer-global: true

repository:
  type: 'git'
  url: 'git://github.com/gkz/LiveScript.git'

dependencies:
  optionator: '~0.9.1'
  'prelude-ls': '~1.2.1'
  'source-map': '=0.6.1'
  'source-map-support': '=0.5.6'

dev-dependencies:
  bach: '^2.0.1'
  browserify: '^13.3.0'
  istanbul: '~0.4.3'
  jison: '0.4.18'
  'uglify-js': '~3.17.4'