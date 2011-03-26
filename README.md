# Coco
is a [CoffeeScript](http://coffeescript.org) dialect that aims to be more radical and practical.

## Why
On its way to hide JavaScript's bad parts, CoffeeScript has accumulated own quirks:
[horrible variable scope](https://github.com/jashkenas/coffee-script/issues/712),
[awkward ranges](https://github.com/jashkenas/coffee-script/issues/746),
confusing/pointless keywords, long extension,
[and so on](https://github.com/satyr/coco/wiki/wtfcs).
Coco tries to amend them, entwining good parts of both.

## Principles
- Respect JavaScript/ECMAScript semantics.
- Die for [DRY](http://en.wikipedia.org/wiki/Don%27t_repeat_yourself).
- Performance over readability.
- Perl over Ruby.
- Reserve less keywords.
- Write less punctuations.

## Differences
- [Additions](https://github.com/satyr/coco/wiki/additions)
- [Improvements](https://github.com/satyr/coco/wiki/improvements)
- [Incompatibilities](https://github.com/satyr/coco/wiki/incompatibilities)

## Installation

### on [node.js](http://nodejs.org)
`git clone git://github.com/satyr/coco.git && cd coco && bin/coke i`

### via [npm](https://github.com/isaacs/npm#readme)
`npm i coco`

## Changelog

### 0.4.2b
- Enabled:
  - ADI on `?.`
  - ACI on `++`/`--`
  - _conditional_ compound destructuring assignments
  - colors and tab completion in REPL

### 0.4.1
- Added string/array multiplication.
      $ coco -e '["#{0*1}" * 2] * 3'
      [ '00', '00', '00' ]
- Added label support.
      $ coco -bpe ':L break L'
      L: break L;
- Aliased `constructor` as `..`.
      $ coco -bpe '@..static'
      this.constructor['static'];

### 0.4.0
- Added `let`. Unary `do` is back at being simple call.
      $ coco -bpe 'let (a = f()) ->'
      (function(a){})(f());
- Added `with`.
      $ coco -bpe 'with f() then'
      (function(){}).call(f());
- Added semiautovivification.
      $ coco -bpe 'base.!obj.@arr'
      var _ref;
      (_ref = base.obj || (base.obj = {})).arr || (_ref.arr = []);
- Made `::` a pure sugar for `prototype`, which can now directly refer to `@::` under class body.
- `?.` can now appear anywhere a normal dot can be used.
- `~.` is changed to `. ~`.
- `new` no longer accepts splatted arguments.
- `--interactive` now works with `--compile` and `--bare`.
- Renamed `--nodes` option and `.nodes` method to `--ast`/`.ast`.
- Fixed [the performance bug](https://github.com/jashkenas/coffee-script/issues/1033) wrt long method chains.
- Quit supporting node.js 0.3.* or lower.

### 0.3.2
- Unrestricted ADI for identifiers beyond `@` and `::`.
      $ coco -bpe '/x/exec(s)input'
      /x/.exec(s).input;
- Expanded property shorthands beyond `@foo`.
      $ coco -bpe '{a.b, (c.d)e}'
      ({
        b: a.b,
        e: c.d.e
      });
- Added `typeof!`, which inspects the internal _[[Class]]_ property.
      $ coco -e 'typeof! //'
      RegExp
- Added shebang support.
      $ coco -pe '`#!node`; ...'
      #!node
      (function(){
        throw Error('unimplemented');
      }).call(this);
- REPL results now evaluate more intuitively.
      coco> i for i from 3
      [ 0, 1, 2 ]
- Disallowed whitespace mixup for indentations.

### 0.3.1
- `debugger` now works anywhere.
- Revised heregex flag syntax: `///#{x}#{y}///?` -> `RegExp('' + x, y);`
- Removed `Coco.eval`.
- Made _extras/coco.js_ work as a mini-compiler on WSH.
- Added _extras/mode-coco.js_, an editing mode for Ace.
- Added `--json` option.

### 0.3.0
#### Pure Additions
- Added _backcall_, a sugar to flatten nested callbacks:
      $ coco -bpe 'a <- f; b'
      f(function(a){
        return b;
      });
- `do` block can now work as a pair of normal parentheses.
- Improved _ACI_ (automatic comma insertion): `f {} [] x` -> `f({}, [], x);`
- Improved _ADI_ (automatic dot insertion): `@@0'!'` -> `arguments[0]['!'];`
- Multi-line block on the RHS of object property now works as an implicit array:
      $ coco -bsp
      a:
        b
        c

      ({
        a: [b, c]
      });
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
      $ coco -bsp
        '123
         456'

      '123456';
- [Fixed](https://github.com/jashkenas/coffee-script/issues/1050)
  block comment syntax to good ol' `/* */`.
- `@0` is now `this[0]` rather than `arguments[0]`.

### 0.2.2
- `is not` is the new `isnt`.
- `@'++'` is now valid as a shorthand for `@['++']`.
- Commas between primitive values are now optional.
      $ coco -bpe '[null true 1 "2"]'
      [null, true, 1, "2"];
- _coke_ now automatically aliases tasks.
- _extras/coco.js_ now works as a Gecko JS Module.
- Grouped documentation suite into _doc/_ for portability.
- Rewrote _src/optparse.co_.

### 0.2.1
- Added numeric ranges:
      $ bin/coco -bpe 'f -1 to 1, [2 to 8 by 3]'
      f(-1, 0, 1, [2, 5, 8]);
- Destructuring assignments can now specify default values using logical operators:
      $ coco -bpe '[@a || b] = c'
      this.a = c[0] || b;
  Default arguments syntax has been changed accordingly (`(a || b) ->` instead of `(a ||= b) ->`).
- `do` now performs special conversions against function literals with parameters, making it work as pseudo-`let` and Coffee 1.0.0 compliant:
      $ coco -bpe 'do (x = y, z) ->'
      (function(x, z){}(y, z));
- Allowed `for i from x then` as a sugar for `for i from 0 til x then`.
- Disallowed duplicate formal arguments.
- Improved syntax-highlight in _src/index.html_.

### 0.2.0
- Version bump for Xmas, in concert with [Coffee 1.0.0](http://news.ycombinator.com/item?id=2037801).
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
