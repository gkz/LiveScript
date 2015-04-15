name: 'LiveScript'
version: '1.3.2'

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
licenses:
  type: 'MIT', url: 'https://raw.githubusercontent.com/gkz/LiveScript/master/LICENSE'
  ...

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
bin:
  lsc: './bin/lsc'

scripts:
  pretest: 'make force && make force'
  test: 'make test'
  'test-harmony': 'make test-harmony'
  posttest: 'git checkout -- lib'

prefer-global: true

repository:
  type: 'git'
  url: 'git://github.com/gkz/LiveScript.git'

dependencies:
  'prelude-ls': '~1.1.1'
  optionator: '~0.6.0'
  'source-map': '^0.3.0'

dev-dependencies:
  jison: '0.4.15'
  'uglify-js': '~2.4.15'
  istanbul: '~0.3.2'
  browserify: '^9.0.2'
