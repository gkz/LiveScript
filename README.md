# Coco
is a [CoffeeScript](http://coffeescript.org) dialect that aims to be more radical and practical.

## Principles
- Respect JavaScript/ECMAScript semantics, but supply ways to amend them.
- Performance over readability.
- Readability over compressability.
- Die for [DRY](http://en.wikipedia.org/wiki/Don%27t_repeat_yourself).
- Reserve less keywords.

## Features
- [Additions](https://github.com/satyr/coco/wiki/additions)
- [Improvements](https://github.com/satyr/coco/wiki/improvements)

## Incompatibilities

### behavior
- Assigning to a variable with `=` declares it on the _current_ scope. Use `:=` to modify variables declared on upper scopes.
- The roles of `in` and `of` have been swapped to keep the JS semantics.
- `===`/`!==`/`==`/`!=` each compiles as is.
- `...` is prefix.
- `super` represents the direct reference to the parent function rather than being a call. Use `super ...` (just `super` in Coffee) for a simple delegation.
- Nested comprehensions returns flattened results.

### keyword
- `yes`/`no`/`on`/`off` are not reserved. Define your own or just use `true`/`false`.
- `undefined` is not reserved.
- `switch`-`case`-`default` replaces `switch`-_when_-`else`.
- `for ever` replaces _loop_.
- `when` is removed. Write `a if b while c` instead of `a while c when b`.

### other
- The binaries are named __coco__ and __coke__ to coexist with __coffee__ and __cake__.

## Installation
Install [node.js](http://nodejs.org), then

    git clone git:github.com/satyr/coco.git && cd coco && bin/coke install

Or install [npm](https://github.com/isaacs/npm#readme), then

    npm install coco


## Help

    coco -h; coke

## Changelog

### 0.1.4
- `.` and its families can now be used with numbers and strings, instead of `[]`.
  `a.0.'0'` compiles to `a[0]['0']`.
- Added syntax for cloning objects;
  `obj{key:val}` acts like a simple version of ES5 `Object.create`,
  creating a prototypal child of `obj` and assigning to `.key` with `val`.
- default arguments can now choose to use `||`/`&&`.
- `super` under a class block now refers to the superclass.
- _.coffee_ extension is no longer supported.

### 0.1.3
- Compilation now prefers single quotes.
- AST now compiles faster, roughly 1.4 times than 0.1.2.
- `[]`/`{}` can now be safely used as an placeholder within array destructuring.
- Improved `--nodes` output.

### 0.1.2
- `...` is now prefix.
- `{0: first, (*-1): last} = array` now works.
- Added `--lex` to the `coco` utility. Removed `--lint`.
- _src/_ now has [doc view](http://satyr.github.com/coco/src/).

### 0.1.1
Release.
