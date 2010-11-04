# Coco
is a [CoffeeScript](http://coffeescript.org) dialect that aims to be more radical and practical.

### Additions

- `:=`

  Assigns to a declared variable.

      $ coco -bpe 'a := a = 1'
      var a;
      a = a = 1;

      $ coco -bpe 'a = a := 1'
      ReferenceError: assignment to undeclared variable "a"


- `[*]`  (starred index)

  An asterisk at the beginning of an indexer represents the length of the indexee.

      $ coco -bpe 'a[* - 1]'
      a[a.length - 1];

      $ coco -bpe 'arr()[* - 1]'
      var _ref;
      (_ref = arr())[_ref.length - 1];


- `.=` / `[=]`  (assigning access)

      $ coco -bpe 'location.href.=replace /^http:/, "https:"'
      location.href = location.href.replace(/^http:/, "https:");

      $ coco -bpe 'a[=0]'
      a = a[0];


- `@0`, `@1`, ...

      $ coco -bpe '@0 @1'
      arguments[0](arguments[1]);


- `do`

  A unary operator that simply calls a function. Helps you write less parentheses.

      $ coco -bpe 'do f'
      f();

      $ coco -bpe 'do ->'
      (function(){})();

      $ coco -bpe 'do =>'
      (function(){}).call(this);


- `for`-`from`-`to`/`til`-`by`

  A generic way to loop within certain numeric ranges.

  - `to` for exclusive, `til` for inclusive.
  - `by` optinally specifies the step value.

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


- `instanceof []`

      $ coco -bpe 'A instanceof [B, C]'
      A instanceof B || A instanceof C;


- `import` / `import all`

  Infix operators that copy properties from left to right and return the right operand.

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


- `it`

  Represents the first argument of the current function (like in Groovy).
  Available only when the function omits argument declarations.

      $ coco -bpe 'I = -> it'
      var I;
      I = function(it){
        return it;
      };


- object splat

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


- `switch`-`case`-`default`

  Same as switch-when-else in original, but requires less indentation.

      $ coco -bpe 'switch x
      case 1, 2 then 3
      case 4    then 5
      default 6'
      switch (x) {
      case 1:
      case 2:
        3;
        break;
      case 4:
        5;
        break;
      default:
        6;
      }


- `<[ quoted words ]>`

      $ coco -bpe '<[ quoted words ]>'
      ["quoted", "words"];


- `void`

  A literal that compiles to `void 0`.


### Incompatibilities

- Assigning to a variable with `=` declares it on the _current_ scope. Use `:=` to modify variables declared on upper scopes.
- `yes`/`no`/`on`/`off` are not reserved. Define your own or just use `true`/`false`.
- `undefined` is not reserved.
- `===`/`!==`/`==`/`!=` each compiles as is.
- switch-when-else has been replaced by switch-case-default.
