# Coco
is a [CoffeeScript](http://coffeescript.org) dialect that aims to be more radical and practical.

## Principles
- Respect JavaScript/ECMAScript semantics, but supply ways to amend them.
- Reserve less keywords.
- Die for [DRY](http://en.wikipedia.org/wiki/Don%27t_repeat_yourself).
- Performance over readability.
- Readability over compressability.

## Features
- [Additions](https://github.com/satyr/coco/wiki/additions)
- [Improvements](https://github.com/satyr/coco/wiki/improvements)

## Incompatibilities

### behavior
- Assigning to a variable with `=` declares it on the _current_ scope. Use `:=` to modify variables declared on upper scopes.
- The roles of `in` and `of` have been swapped to keep the JS semantics.
- The range syntax (_x..y_) is removed.
- `===`/`!==`/`==`/`!=` each compiles as is.
- `...` is prefix.
- `super` represents the direct reference to the parent function rather than being a call. Use `super ...` (just `super` in Coffee) for a simple delegation.
- Nested comprehensions returns flattened results.

### keyword
- _yes_/_no_/_on_/_off_ are not reserved. Define your own or just use `true`/`false`.
- _undefined_ is not reserved.
- `switch`-`case`-`default` replaces `switch`-_when_-`else`.
- `for ever` replaces _loop_.
- _when_ is removed. Write `a if b while c` instead of `a while c when b`.

### other
- The binaries are named __coco__ and __coke__ (to coexist with _coffee_ and _cake_).

## Installation
Install [node.js](http://nodejs.org), then

    git clone git:github.com/satyr/coco.git && cd coco && bin/coke install

Or install [npm](https://github.com/isaacs/npm#readme), then

    npm install coco


## Help

    coco -h; coke

## Changelog

### 0.2.0
- Version bump for Xmas, in concert with Coffee 1.0.0.
- `@@` is now a shorthand for `arguments`.
- `do` can now indicate a call against indented arguments, so that you can write
      f do
        x
        y
  instead of
      f(
        x
        y
      )
- `and` and `or` now close implicit calls, making you write even less parens:
  `f x and g y or z` -> `f(x) && g(y) || z;`
- `catch`'s variable declaration is no longer required.
- `a<[ b c ]>` is now equivalent to `a[\b, \c]` (was `a(\b, \c)`).
- `case` now requires brackets to have multiple conditions.
- Added `--nodejs` option. See [coffee#910](https://github.com/jashkenas/coffee-script/issues/910).
- Renamed `--stdio` to `--stdin`.

### 0.1.6
- Added character/word literal:
  `\C + \++` -> `'C' + '++';`
- Retrieving multiple properties at once is now possible:
  `a[b, c]` -> `[a[b], a[c]];`
- Destructuring into an object's properties is now possible:
  - `a[b, c] = d` -> `a[b] = d[0], a[c] = d[1];`
  - `a{b, c} = d` -> `a.b = d.b, a.c = d.c;`
- Compound assigments can now destructure:
  `[@a, @b] /= c` -> `this.a /= c[0], this.b /= c[1];`

### 0.1.5
- Conditional control structures can now be anaphoric;
  `that` within `if`, `while` or `case` block now refers to the condition value.
- Decimal numbers can now have arbitrary trailing alphabets as comments.
  e.g. `9times`, `1.5s`
- Added `<<<`/`<<<<` as aliases to `import`/`import all`
- non-ASCII identifiers are now allowed.

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
