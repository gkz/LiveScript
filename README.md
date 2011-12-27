# Coco
is a [CoffeeScript](http://coffeescript.org) dialect
that aims to be more radical and practical.

## Why
On its way to hide JavaScript's bad parts, CoffeeScript has accumulated own quirks:
[horrible variable scope](https://github.com/jashkenas/coffee-script/issues/712),
[awkward ranges](https://github.com/jashkenas/coffee-script/issues/746),
[confusing](https://github.com/jashkenas/coffee-script/issues/702)
and/or
[pointless](https://github.com/jashkenas/coffee-script/issues/813)
keywords, verbose file extension,
[and so on](https://github.com/satyr/coco/wiki/wtfcs).
Coco tries to amend them, entwining good parts of both.

## Principles
- Respect JavaScript/ECMAScript semantics.
- Die for [DRY](http://en.wikipedia.org/wiki/Don%27t_repeat_yourself).
- Perl over Ruby.
- Fewer keywords, punctuations and runtime errors.

## Differences
- [Improvements](https://github.com/satyr/coco/wiki/improvements)
- [Incompatibilities](https://github.com/satyr/coco/wiki/incompatibilities)
- [Side by Side Comparison](https://github.com/satyr/coco/wiki/side-by-side-comparison)

## Documents
- [Additions](https://github.com/satyr/coco/wiki/additions)
- [Annotated Source](http://satyr.github.com/coco/src/)

## Installation

### on [node.js](http://nodejs.org)
`git clone git://github.com/satyr/coco.git && cd coco && bin/coke i`

### via [npm](http://npmjs.org)
`npm i -g coco`

## Changelog

### 0.7.0
- Caught up node.js 0.6.x.
- `!` against function/backcall now suppresses its auto-return.
- `superclass` now points to the function `class extends`.
- `super` now relies solely on `superclass` rather than requiring special forms like `C::m = ->`.
- `of` no longer delegates to `Array::indexOf`, making it consistent with `for`-`of` behavior.
- Inline implicit objects now close at newline or `if`/`for`/`while`/`until`.
- --print no longer implies --compile.
- --watch now works on Windows.

### 0.6.7
- Fixed [coffee#1715](https://github.com/jashkenas/coffee-script/issues/1715) etc.
- Trivial improvements.

### 0.6.6
- Added unary assignments: `!! = x` => `x = !!x`
- Made `a? <<< b` short for `a <<< b if a?`.
- Improved stack traces from directly run .co files.

### 0.6.5
- `case`/`of`/`instanceof` now works better with array slice.
- `instanceof` now rejects invalid right operands.

### 0.6.4
- Unary operators now spread into an array operand: `+[a, b]` => `[+a, +b]`
- `..` now points to the constructor under `class`.
- _coke_ now works from subdirectories.
  ([coffee#1687](https://github.com/jashkenas/coffee-script/issues/1687))

### 0.6.3
- Added pipe operator: `f! => g _` => `_ = f!; g _`
- Fixed identifier lexing as per ES5.
- Improved label handlings.
- Helper functions are now declared last.
  ([coffee#1638](https://github.com/jashkenas/coffee-script/issues/1638))

### 0.6.2
- Added character ranges: `[\a to \d]` => `[\a \b \c \d]`
- Added named destructuring: `{p, q}:o = f!` => `o = f!; {p, q} = o`
- Numbers can no longer start with `.`.
- `function` can no longer prefix `->`/`~>`.
  Use `~function` to declare bound functions instead.

### 0.6.1
- Allowed line folding after `for` prepositions.
- `import`ing onto a soaked expression is now safe.
- `--json` now modifies `--ast` or `--compile`.
- Fixed [#81](https://github.com/satyr/coco/issues/81) etc.

### 0.6.0

#### Additions
- Added [soak assign](https://github.com/satyr/coco/issues/71).
- Added [`<?` and `>?` operators](https://github.com/satyr/coco/issues/66).
- Loops can now have [`else` clause](https://github.com/satyr/coco/issues/75).
- `import x` is now short for `this <<< x`.
- `,` after `(`, `[` or another `,` now implies `void`.

#### Changes
- Added [object slice](https://github.com/satyr/coco/issues/77).
- Added bang call: `f!` => `f()`
- Revised clone syntax from `x{}` to `^x`.
- Revised semiautovivification syntax from `.!`/`.@` to `.@`/`.@@`.
- Variable interpolations no longer require braces:
  `"(#id)"` => `"(" + id + ")"`
- Spaced dots now close implicit calls.
  See [coffee#1407](https://github.com/jashkenas/coffee-script/issues/1407).
- Direct calls to `super` now delegate `this`.
- [`extended` hook](https://github.com/jashkenas/coffee-script/issues/516) is back.
- `from` of `for` is now optional, meaning `from 0`.
  `til`less `from` is no longer allowed.

### 0.5.4
- `while`/`until` can now have update clause after test clause:
  `continue while f(), g()` => `for (; f(); g()) {}`
- `that` no longer triggers anaphoric conversion under `unless`/`until`.
- Disallowed `a.=b = c` `p:~ (a, b) ->` `f ..., a` etc.
- Fixed [coffee#1416](https://github.com/jashkenas/coffee-script/issues/1416).

### 0.5.3
- Added `do`-`while`/`until` construction.
- Added `$` flag to regexes. Same as `.source`, but more efficient.
- Suppressed implicit return on `new`ed/setter functions.
- Sped up lexer.

### 0.5.2
- Added `!?` (inexistence) operator.
- `function` no longer requires parens around parameters.
- `class` block is now mandatory.
- Bug fixes:
  [coffee#1352](https://github.com/jashkenas/coffee-script/issues/1352)
  [coffee#1354](https://github.com/jashkenas/coffee-script/issues/1354)

### 0.5.1
- `a.b.c?.=d.e` now works as expected.
- `a[b, c] = d` now works as expected.
- _extras/coco.js_ works again on WSH.
- `--output` implies `--compile` again.

### 0.5.0
- Added `**` operator.
- Overloaded `+`/`-`/`/` (in addition to `*`) for arrays and strings.
- Revised `let`: `let (a) ~>` => `let a then`
- Allowed underscores within number literals.
- Major regex changes:
  - Dieted heregex: `/// re ///` => `// re //`
  - Allowed leading whitespace in normal regex literals when unambiguous.
  - No longer accepts invalid regexes.
- `->` is now optional when `function` is used.
- `case` accepts comma-separated tests again.
- `return`/`throw` can now take a block.
- REPL now uses _^J_ to continue lines.

### 0.4.2
- Enabled:
  - ADI on `?.`
  - ACI on `++`/`--`
  - conditional destructuring assignments
  - colors and tab completion in REPL
- Made leading `*`s serve like list markers.

### 0.4.1
- Added string/array multiplication.
- Added label support.
- Aliased `constructor` as `..`.

### 0.4.0
- Added `let`. Unary `do` is back at being simple call.
- Added `with`.
- Added semiautovivification.
- Made `::` a pure sugar for `prototype`, which can now directly refer to `@::` under class body.
- `?.` can now appear anywhere a normal dot can be used.
- `~.` is changed to `. ~`.
- `new` no longer accepts splatted arguments.
- `--interactive` now works with `--compile` and `--bare`.
- Renamed `--nodes` option and `.nodes` method to `--ast`/`.ast`.
- Fixed [the performance bug](https://github.com/jashkenas/coffee-script/issues/1033) wrt long method chains.
- Quit supporting node.js 0.3.x or lower.

### 0.3.2
- Unrestricted ADI for identifiers beyond `@` and `::`.
- Expanded property shorthands beyond `@foo`.
- Added `typeof!`, which inspects the internal _[[Class]]_ property.
- Added shebang support.
- REPL results now evaluate more intuitively.
- Disallowed whitespace mixup for indentations.

### 0.3.1
- `debugger` now works anywhere.
- Revised heregex flag syntax: `///#{x}#{y}///?` -> `RegExp('' + x, y);`
- Removed `Coco.eval`.
- Made _extras/coco.js_ work as a mini-compiler on WSH.
- Added _extras/mode-coco.js_, an editing mode for [Ace](http://ace.ajax.org).
- Added `--json` option.

### 0.3.0

#### Pure Additions
- Added _backcall_, a sugar to flatten nested callbacks.
- `do` block can now work as a pair of normal parentheses.
- Improved _ACI_ (automatic comma insertion): `f {} [] x` -> `f({}, [], x);`
- Improved _ADI_ (automatic dot insertion): `@@0'!'` -> `arguments[0]['!'];`
- Multiline block on the RHS of object property now works as an implicit array.
- Heregexes now support dynamic flags: `/// x #{? y } ///` -> `RegExp('x', y);`
- Enabled compound _accessigns_: `a.+=b` -> `a += a.b;`
- `...` in array destructuring (same as `...[]`) now skips items rather than `slice`ing them. ([coffee#870](https://github.com/jashkenas/coffee-script/issues/870))
- Compilation errors now report line numbers.
- `Coco` object now emits more events for use with `--require`.

#### Incompatible Changes
- <del>`=>`</del> -> <ins>`~>`</ins>
- <del>`&.`</del> -> <ins>`~.`</ins>
- Braceless objects no longer consume property shorthands.
  ([coffee#618](https://github.com/jashkenas/coffee-script/issues/618))
- Indentations within non-here strings are now stripped.
- [Fixed](https://github.com/jashkenas/coffee-script/issues/1050)
  block comment syntax to good ol' `/* */`.
- `@0` is now `this[0]` rather than `arguments[0]`.

### 0.2.2
- `is not` is the new `isnt`.
- `@'++'` is now valid as a shorthand for `@['++']`.
- Commas between primitive values are now optional.
- _coke_ now automatically aliases tasks.
- _extras/coco.js_ now works as a Gecko JS Module.
- Grouped documentation suite into _doc/_ for portability.
- Rewrote _src/optparse.co_.

### 0.2.1
- Added numeric ranges.
- Destructuring assignments can now specify default values using logical operators.
  Default arguments syntax has been changed accordingly.
  (`(a || b) ->` instead of `(a ||= b) ->`)
- `do` now performs special conversions against function literals with parameters,
  making it work as pseudo-`let` and Coffee 1.0.0 compliant.
- Allowed `for i from x then` as a sugar for `for i from 0 til x then`.
- Disallowed duplicate formal arguments.
- Improved syntax-highlight in _src/index.html_.

### 0.2.0
- Version bump for Xmas, in concert with [Coffee 1.0.0](http://news.ycombinator.com/item?id=2037801).
- `@@` is now a shorthand for `arguments`.
- `do` can now indicate a call against indented arguments.
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
- Compound assignments can now destructure:
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
