# Coco
is a [CoffeeScript](http://coffeescript.org) dialect that aims to be more radical and practical.

## Principles
- Respect JavaScript/ECMAScript semantics, but supply ways to amend their awkwardness.
- Die for [DRY](http://en.wikipedia.org/wiki/Don%27t_repeat_yourself).
- Reserve less keywords.

## Additions

### nondeclaring assign `:=`
Assigns to an existing variable, without declaring a new one.

    $ coco -bpe 'a := a = 1'
    var a;
    a = a = 1;

    $ coco -bpe 'a = a := 1'
    SyntaxError: assignment to undeclared variable "a"


### conditional assignments `? +=`
Any assignment operator can be conditional by prefixing with one of the three logical operators (`&&`/`||`/`?`).

    $ coco -bpe 'a.b &&&= c.d ?= e'
    var _ref;
    a.b && (a.b &= (_ref = c.d) != null ? _ref : c.d = e);


### modifying access `.=` `[=]`
Compound assigments for accessor and indexer.

    $ coco -bpe 'location.href.=replace /^http:/, "https:"'
    location.href = location.href.replace(/^http:/, "https:");

    $ coco -bpe 'a[=0]'
    a = a[0];

- Is at same precedence as `.`/`[]`.
- Consumes all property/call chains to the right.


### binding access `&.` `&[]`
Retrieves an object's method as _bound_ to that object.

    $ coco -e 'm = "abc"&.toString; console.log m()'
    abc

    $ coco -bpe 'o&.m'
    var _ref, __bind = function(me, fn){ return function(){ return fn.apply(me, arguments); }; };
    __bind(o.m, o);


### index star `[*]`
An asterisk at the beginning of an indexer represents the length of the indexee.

    $ coco -bpe 'a[*] = b'
    a[a.length] = b;

    $ coco -bpe 'arr()[* - 1]'
    var _ref;
    (_ref = arr())[_ref.length - 1];


### argument shorthands `@0`

    $ coco -bpe '@0 @1'
    arguments[0](arguments[1]);


### class block
Unlike CoffeScript, our `class` define the constructor as a bare function and properties (prototype members) as bare objects, both on top level under the class block. The constructor can be _bound_ using `=>` to be `new`-free, just like native `Array` which works with or without `new`.

    $ coco -bsp
    class exports.C extends P
      ### constructor ###
      -> super ...

      ### any code ###
      private = 42
      @static = -> private

      ### properties ###
      member: 'U'
      method: -> super @member, B.static()

    Bound = class then =>


    var Bound, C, __extends = function(child, parent){
      function ctor(){ this.constructor = child; }
      ctor.prototype = parent.prototype;
      child.prototype = new ctor;
      child.superclass = parent;
      return child;
    };
    exports.C = C = (function(){
      var private, _ref;
      __extends(C, P);
      /* constructor */
      function C(){
        C.superclass.apply(this, arguments);
      } C.name = "C";
      /* any code */
      private = 42;
      C.static = function(){
        return private;
      };
      _ref = C.prototype;
      /* properties */
      _ref.member = 'U';
      _ref.method = function(){
        return C.superclass.prototype.method.call(this, this.member, B.static());
      };
      return C;
    }());
    Bound = (function(){
      function _ctor(){} _ctor.prototype = Bound.prototype;
      function Bound(){
        var _this = new _ctor;
        return _this;
      } Bound.name = "Bound";
      return Bound;
    }());


### plucking `delete`
If used in an expression, `delete` returns the original value as opposed to the useless
[JS behavior](http://people.mozilla.org/~jorendorff/es5.html#sec-11.4.1).

    $ bin/coco -bpe 'ov = delete o.v; delete x'
    var ov, _ref;
    ov = (_ref = o.v, delete o.v, _ref);
    delete x;


### parenless call `do`
A unary operator that simply calls a function, helping you write less parentheses.

    $ coco -bpe 'do f'
    f();

    $ coco -bpe 'do ->'
    (function(){})();

    $ coco -bpe 'do =>'
    (function(){}).call(this);


### loop for own keys `for own`
A guarded version of `for`-`in` that only exposes own properties of an object.

    $ coco -bpe 'f key, val for own key, val in obj'
    var key, val, _ref, __owns = Object.prototype.hasOwnProperty;
    for (key in _ref = obj) if (__owns.call(_ref, key)) {
      val = _ref[key];
      f(key, val);
    }


### loop in range `for` `from` `to` `til` `by`
A generic way to loop within certain numeric ranges.

    $ coco -bpe 'i for i from x to y'
    var i, _to;
    for (i = x, _to = y; i <= _to; ++i) {
      i;
    }

    $ coco -bpe 'i for i from x til y'
    var i, _to;
    for (i = x, _to = y; i < _to; ++i) {
      i;
    }

    $ coco -bpe 'i for i from x to y by -1'
    var i, _to;
    for (i = x, _to = y; i >= _to; --i) {
      i;
    }

    $ coco -bpe 'i for i from x to y by z'
    var i, _step, _to;
    for (i = x, _to = y, _step = z; _step < 0 ? i >= _to : i <= _to; i += _step) {
      i;
    }

- `to` for inclusive, `til` for exclusive.
- `by` optionally specifies the step value.


### loop away `for ever`
An empty version of `for` that loops forever.

    $ coco -bpe 'continue for ever'
    for (;;) {}


### chained instance check `instanceof []`
A bare array to the right of `instanceof` is expanded into `or` chains.

    $ coco -bpe 'A instanceof [B, C]'
    A instanceof B || A instanceof C;


### property importing `import` `import all`
Infix operators that copy properties from left to right and return the right operand.
Optimized to a series of assignments if the right operand of `import` is an object literal.

    $ coco -bpe 'x import y import all z'
    var __importAll = function(obj, src){
      for (var key in src) obj[key] = src[key];
      return obj;
    }, __import = function(obj, src){
      var own = Object.prototype.hasOwnProperty;
      for (var key in src) if (own.call(src, key)) obj[key] = src[key];
      return obj;
    };
    __importAll(__import(x, y), z);

    $ coco -bpe 'w = x import {y, (z)}'
    var w;
    w = (x.y = y, x[z] = z, x);


### implicit argument `it`
Represents the first argument of the current function (like in Groovy).
Available only when the function omits argument declarations.

    $ coco -bpe 'I = -> it'
    var I;
    I = function(it){
      return it;
    };


### object splat `{o...}`

Mixes an object's properties into the created object.

    $ coco -bpe 'O = {0, o..., (o.o)..., "0"}'
    var O, _obj;
    var __import = function(obj, src, own){
      if (own) own = Object.prototype.hasOwnProperty;
      for (var key in src) if (!own || own.call(src, key)) obj[key] = src[key];
      return obj;
    };
    O = (_obj = __import(__import({
      0: 0
    }, o, true), o.o, true), _obj["0"] = "0", _obj);


### switching `switch` `case` `default`
`switch` (as in JS) with multiple conditions and auto `break` insertion per `case`.

    $ coco -bsp
    switch x
    case 1, 2 then 3
    case 4    then 5
    case 7    then 8; fallthrough
    default 6

    switch (x) {
    case 1:
    case 2:
      3;
      break;
    case 4:
      5;
      break;
    case 7:
      8;
      /* fallthrough */
    default:
      6;
    }

Basically the same as switch-when-else in original, except ours:

- requires less indentation:
  `case`/`default` are placed at the same level as `switch`.
- supports falling through:
  If the last expression of `case` block is `fallthrough`,
  inserts `/* fallthrough */` instead of `break`.


### quoted words `<[ q w ]>`
A literal that represents an array of strings or a function call with string arguments.

    $ coco -bpe 'f <[ array of strings ]>'
    f(["array", "of", "strings"]);

    $ coco -bpe 'f<[ argument of strings ]>'
    f("argument", "of", "strings");


### thisplat `f(...)`
A shorthand to delegate the current context to a function.

    $ coco -bpe 'f ...'
    f.apply(this, arguments);


### undefined literal `void`
A literal that compiles to `void 8`.


### numbers with variable radix `25rCoco`
Borrowing from Smalltalk, numbers can have any base between 2 to 36 in the form RRrXXX.

    $ coco -bpe '[2r101010, 8r52, 36r16]'
    [42, 42, 42];


## Incompatibilities

### behavior
- Assigning to a variable with `=` declares it on the _current_ scope. Use `:=` to modify variables declared on upper scopes.
- The roles of `in` and `of` have been swapped to keep the JS semantics.
- `===`/`!==`/`==`/`!=` each compiles as is.
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


## Improvements
- Smaller/Speedier

      $ git log -1 --format=oneline
      e5deb2b3c33ac356146a26f2f19b3e8f9e3bb328 CoffeeScript 0.9.5

      $ ls -s extras/coffee-script.js
      168 extras/coffee-script.js

      $ cake loc
      2336

      $ cake bench
      Lex     1494 ms (21083 tokens)
      Rewrite  167 ms (23624 tokens)
      Parse    184 ms
      Compile  179 ms (127749 chars)
      total   2024 ms

      $ cd ../coco

      $ git log -1 --format=oneline
      b4b592015f52f4b4f3aa1610f1f8b2384f96ace8 readme: principles

      $ ls -s extras/coco.js
      120 extras/coco.js

      $ coke loc
      2094

      $ coke bench
      Lex     : 1036[ms] (18468 tokens)
      Rewrite :  120[ms] (20841 tokens)
      Parse   :  165[ms]
      Compile :  209[ms] (120012 chars)
      TOTAL   : 1530[ms]


- Uses temporary variables more wisely, making compiled code cleaner/faster.

      $ coffee -bpe '[i for i in a, j for j in b]'
      var i, j, _i, _j, _len, _len2, _results, _results2;
      [
        function() {
          _results = [];
          for (_i = 0, _len = a.length; _i < _len; _i++) {
            i = a[_i];
            _results.push(i);
          }
          return _results;
        }(), function() {
          _results2 = [];
          for (_j = 0, _len2 = b.length; _j < _len2; _j++) {
            j = b[_j];
            _results2.push(j);
          }
          return _results2;
        }()
      ];

      $ coco -bpe '[i for i of a, j for j of b]'
      var i, j;
      [
        (function(){
          var _i, _len, _ref, _results = [];
          for (_i = 0, _len = (_ref = a).length; _i < _len; ++_i) {
            i = _ref[_i];
            _results.push(i);
          }
          return _results;
        }()), (function(){
          var _i, _len, _ref, _results = [];
          for (_i = 0, _len = (_ref = b).length; _i < _len; ++_i) {
            j = _ref[_i];
            _results.push(j);
          }
          return _results;
        }())
      ];


## Installation
Install [node.js](http://nodejs.org/), then

    git clone git:github.com/satyr/coco.git && cd coco && bin/coke install


## Help

    coco -h; coke
