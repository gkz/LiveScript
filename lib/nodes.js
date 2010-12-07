(function(){
  var Access, Arr, Assign, Call, Case, Class, Code, Comment, Existence, Extends, For, IDENTIFIER, If, Import, Index, LEVEL_ACCESS, LEVEL_COND, LEVEL_LIST, LEVEL_OP, LEVEL_PAREN, LEVEL_TOP, Lines, Literal, METHOD_DEF, Node, Obj, Of, Op, Param, Parens, Return, SIMPLENUM, Scope, Splat, Super, Switch, TAB, Throw, Try, UTILITIES, Value, While, lastNonComment, multident, utility, __extends = function(sub, sup){
    function ctor(){} ctor.prototype = (sub.superclass = sup).prototype;
    return (sub.prototype = new ctor).constructor = sub;
  }, __importAll = function(obj, src){ for (var key in src) obj[key] = src[key]; return obj }, __owns = Object.prototype.hasOwnProperty;
  Scope = require('./scope').Scope;
  Node = (function(){
    var _ref;
    function Node(){} Node.name = "Node";
    _ref = Node.prototype;
    _ref.compile = function(options, level){
      var code, key, node, o, tmp, _i, _len, _ref;
      o = {};
      for (key in options) {
        o[key] = options[key];
      }
      if (level != null) {
        o.level = level;
      }
      node = this.unfoldSoak(o) || this;
      if (o.level && node.isStatement(o)) {
        return node.compileClosure(o);
      }
      node.tab = o.indent;
      code = node.compileNode(o);
      if (node.temps) {
        for (_i = 0, _len = (_ref = node.temps).length; _i < _len; ++_i) {
          tmp = _ref[_i];
          o.scope.free(tmp);
        }
      }
      return code;
    };
    _ref.compileClosure = function(o){
      var args, func, mentionsArgs, val;
      if (this.containsPureStatement()) {
        throw SyntaxError('cannot include a pure statement in an expression');
      }
      args = [];
      func = Code([], Lines(this));
      func.wrapper = true;
      if (this.contains(function(it){
        return it.value === 'this';
      })) {
        args.push(Literal('this'));
        val = Value(func, [Access(Literal('call'))]);
      }
      mentionsArgs = false;
      this.traverseChildren(function(it){
        if (it.value === 'arguments') {
          mentionsArgs = it.value = '_args';
        }
        return null;
      });
      if (mentionsArgs) {
        args.push(Literal('arguments'));
        func.params.push(Param(Literal('_args')));
      }
      return Call(val || func, args).compileNode(o);
    };
    _ref.cache = function(o, level, reused){
      var ref, sub;
      if (!this.isComplex()) {
        ref = level ? this.compile(o, level) : this;
        return [ref, ref];
      } else {
        ref = Literal(reused || o.scope.temporary('ref'));
        sub = Assign(ref, this);
        if (level) {
          return [sub.compile(o, level), ref.value];
        } else {
          return [sub, ref];
        }
      }
    };
    _ref.compileLoopReference = function(o, name){
      var src, tmp, _ref;
      src = tmp = this.compile(o, LEVEL_LIST);
      if (!((-1 / 0 < (_ref = +src) && _ref < 1 / 0) || IDENTIFIER.test(src) && o.scope.check(src))) {
        src = "" + (tmp = o.scope.temporary(name)) + " = " + src;
      }
      return [src, tmp];
    };
    _ref.eachChild = function(fn){
      var child, name, node, v, _i, _j, _len, _len2, _ref;
      for (_i = 0, _len = (_ref = this.children).length; _i < _len; ++_i) {
        name = _ref[_i];
        if (child = this[name]) {
          if ('length' in child) {
            for (_j = 0, _len2 = child.length; _j < _len2; ++_j) {
              node = child[_j];
              if ((v = fn(node)) != null) {
                return v;
              }
            }
          } else {
            if ((v = fn(child)) != null) {
              return v;
            }
          }
        }
      }
      return null;
    };
    _ref.traverseChildren = function(fn, xscope){
      return this.eachChild(function(it){
        var v;
        if ((v = fn(it)) != null) {
          return v;
        } else {
          return it.traverseChildren(fn, xscope);
        }
      });
    };
    _ref.contains = function(pred){
      return !!this.traverseChildren(function(it){
        return pred(it) || null;
      });
    };
    _ref.containsPureStatement = function(){
      return this.isPureStatement() || this.contains(function(it){
        return it.isPureStatement();
      });
    };
    _ref.unwrapAll = function(){
      var node;
      node = this;
      while (node !== (node = node.unwrap())) {}
      return node;
    };
    _ref.children = [];
    _ref.terminator = ';';
    _ref.isComplex = YES;
    _ref.isStatement = NO;
    _ref.isPureStatement = NO;
    _ref.isAssignable = NO;
    _ref.isArray = NO;
    _ref.isObject = NO;
    _ref.assigns = NO;
    _ref.unfoldSoak = NO;
    _ref.unfoldAssign = NO;
    _ref.unwrap = THIS;
    _ref.invert = function(){
      return Op('!', this);
    };
    _ref.makeReturn = function(name){
      if (name) {
        return Call(Literal(name + '.push'), [this]);
      } else {
        return Return(this);
      }
    };
    _ref.toString = function(idt, name){
      var tree;
      idt == null && (idt = '');
      name == null && (name = this.constructor.name);
      tree = '\n' + idt + name;
      if (this.soak) {
        tree += '?';
      }
      this.eachChild(function(it){
        tree += it.toString(idt + TAB);
        return null;
      });
      return tree;
    };
    return Node;
  }());
  exports.Lines = Lines = (function(){
    var _ref;
    __extends(Lines, Node);
    function _ctor(){} _ctor.prototype = Lines.prototype;
    function Lines(node){
      var _this = new _ctor;
      if (node instanceof Lines) {
        return node;
      }
      _this.lines = node
        ? [node]
        : [];
      return _this;
    } Lines.name = "Lines";
    _ref = Lines.prototype;
    _ref.children = ['lines'];
    _ref.add = function(it){
      this.lines.push(it);
      return this;
    };
    _ref.unwrap = function(){
      if (this.lines.length === 1) {
        return this.lines[0];
      } else {
        return this;
      }
    };
    _ref.isComplex = function(){
      var _ref;
      return this.lines.length > 1 || !!((_ref = this.lines[0]) != null ? _ref.isComplex() : void 8);
    };
    _ref.isStatement = function(o){
      var exp, _i, _len, _ref;
      if (o && !o.level) {
        return true;
      }
      for (_i = 0, _len = (_ref = this.lines).length; _i < _len; ++_i) {
        exp = _ref[_i];
        if (exp.isPureStatement() || exp.isStatement(o)) {
          return true;
        }
      }
      return false;
    };
    _ref.makeReturn = function(it){
      var i, node, _ref;
      _ref = lastNonComment(this.lines), node = _ref[0], i = _ref[1];
      if (node) {
        this.lines[i] = node.makeReturn(it);
      }
      return this;
    };
    _ref.compileNode = function(o){
      var code, codes, node, top, _i, _len, _ref;
      o.lines = this;
      top = !o.level;
      codes = [];
      for (_i = 0, _len = (_ref = this.lines).length; _i < _len; ++_i) {
        node = _ref[_i];
        node = (node = node.unwrapAll()).unfoldSoak(o) || node;
        if (top) {
          code = (node.front = true, node).compile(o);
          if (!node.isStatement(o)) {
            code = o.indent + code + node.terminator;
          }
        } else {
          code = node.compile(o, LEVEL_LIST);
        }
        codes.push(code);
      }
      if (top) {
        return codes.join('\n');
      }
      code = codes.join(', ') || 'void 8';
      if (codes.length > 1 && o.level >= LEVEL_LIST) {
        return "(" + code + ")";
      } else {
        return code;
      }
    };
    _ref.compileRoot = function(o){
      var bare, code, _ref;
      o == null && (o = {});
      o.indent = this.tab = (bare = (_ref = o.bare, delete o.bare, _ref)) ? '' : TAB;
      o.scope = this.scope = Scope.root = new Scope;
      o.level = LEVEL_TOP;
      code = this.compileWithDeclarations(o).replace(/[^\n\S]+$/gm, '');
      if (bare) {
        return code;
      } else {
        return "(function(){\n" + code + "\n}).call(this);\n";
      }
    };
    _ref.compileWithDeclarations = function(o){
      var code, exp, i, post, rest, vars, _len, _ref, _ref2;
      code = post = '';
      for (i = 0, _len = (_ref = this.lines).length; i < _len; ++i) {
        exp = _ref[i];
        if (!((_ref2 = exp.unwrap()) instanceof Comment || _ref2 instanceof Literal)) {
          break;
        }
      }
      o.level = LEVEL_TOP;
      if (i) {
        rest = this.lines.splice(i, 1 / 0);
        code = this.compileNode(o);
        this.lines = rest;
      }
      post = this.lines.length ? this.compileNode(o) : '';
      if (post) {
        code && (code += '\n');
      }
      if (!o.globals && (vars = (_ref = this.scope) != null ? _ref.vars().join(', ') : void 8)) {
        code += o.indent + ("var " + multident(vars, o.indent) + ";\n");
      }
      return code + post;
    };
    return Lines;
  }());
  exports.Literal = Literal = (function(){
    var _ref;
    __extends(Literal, Node);
    function _ctor(){} _ctor.prototype = Literal.prototype;
    function Literal(value, reserved){
      var _this = new _ctor;
      _this.value = value;
      if (value === 'break' || value === 'continue' || value === 'debugger') {
        _this.isPureStatement = YES;
      }
      if (reserved) {
        _this.isAssignable = NO;
      }
      return _this;
    } Literal.name = "Literal";
    _ref = Literal.prototype;
    _ref.makeReturn = function(){
      if (this.isPureStatement()) {
        return this;
      } else {
        return Literal.superclass.prototype.makeReturn.apply(this, arguments);
      }
    };
    _ref.isAssignable = function(){
      return IDENTIFIER.test(this.value);
    };
    _ref.assigns = function(it){
      return it === this.value;
    };
    _ref.isComplex = NO;
    _ref.compile = function(o, level){
      var val, _ref;
      switch (val = this.value) {
      case 'this':
        return ((_ref = o.scope.method) != null ? _ref.bound : void 8) || val;
      case 'void':
        val += ' 8';
        /* fallthrough */
      case 'null':
        if ((level != null ? level : o.level) === LEVEL_ACCESS) {
          throw SyntaxError('invalid use of ' + this.value);
        }
        return val;
      }
      switch (false) {
      case !val.reserved:
        return '"' + val + '"';
      case !val.js:
        this.terminator = '';
      }
      return val;
    };
    _ref.toString = function(){
      return ' "' + this.value + '"';
    };
    return Literal;
  }());
  exports.Throw = Throw = (function(){
    var _ref;
    __extends(Throw, Node);
    function _ctor(){} _ctor.prototype = Throw.prototype;
    function Throw(it){
      var _this = new _ctor;
      _this.it = it;
      return _this;
    } Throw.name = "Throw";
    _ref = Throw.prototype;
    _ref.children = ['it'];
    _ref.verb = 'throw';
    _ref.isStatement = YES;
    _ref.makeReturn = THIS;
    _ref.compile = function(o){
      var exp, _ref;
      exp = (_ref = this.it) != null ? _ref.compile(o, LEVEL_PAREN) : void 8;
      return o.indent + this.verb + (exp ? ' ' + exp : '') + ';';
    };
    return Throw;
  }());
  exports.Return = Return = (function(){
    var _ref;
    __extends(Return, Throw);
    function _ctor(){} _ctor.prototype = Return.prototype;
    function Return(it){
      var _this = new _ctor;
      _this.it = it;
      return _this;
    } Return.name = "Return";
    _ref = Return.prototype;
    _ref.verb = 'return';
    _ref.isPureStatement = YES;
    return Return;
  }());
  exports.Value = Value = (function(){
    var _ref;
    __extends(Value, Node);
    function _ctor(){} _ctor.prototype = Value.prototype;
    function Value(head, tails, at){
      var _this = new _ctor;
      if (!tails && head instanceof Value) {
        return head;
      }
      _this.head = head;
      _this.tails = tails || [];
      _this.at = at;
      return _this;
    } Value.name = "Value";
    _ref = Value.prototype;
    _ref.children = ['head', 'tails'];
    _ref.add = function(it){
      this.tails.push(it);
      return this;
    };
    _ref.hasProperties = function(){
      return !!this.tails.length;
    };
    _ref.assigns = function(it){
      return !this.tails.length && this.head.assigns(it);
    };
    _ref.isStatement = function(it){
      return !this.tails.length && this.head.isStatement(it);
    };
    _ref.isArray = function(){
      return !this.tails.length && this.head instanceof Arr;
    };
    _ref.isObject = function(){
      return !this.tails.length && this.head instanceof Obj;
    };
    _ref.isComplex = function(){
      return !!this.tails.length || this.head.isComplex();
    };
    _ref.isAssignable = function(){
      return !!this.tails.length || this.head.isAssignable();
    };
    _ref.makeReturn = function(it){
      if (this.tails.length) {
        return Value.superclass.prototype.makeReturn.apply(this, arguments);
      } else {
        return this.head.makeReturn(it);
      }
    };
    _ref.unwrap = function(){
      if (this.tails.length) {
        return this;
      } else {
        return this.head;
      }
    };
    _ref.cacheReference = function(o){
      var base, bref, name, nref, ref, _ref;
      name = (_ref = this.tails)[_ref.length - 1];
      if (this.tails.length < 2 && !this.head.isComplex() && !(name != null ? name.isComplex() : void 8)) {
        return [this, this];
      }
      base = Value(this.head, this.tails.slice(0, -1));
      if (base.isComplex()) {
        ref = Literal(o.scope.temporary('base'));
        base = Value(Parens(Assign(ref, base)));
        bref = Value(ref);
        bref.temps = [ref.value];
      }
      if (!name) {
        return [base, bref];
      }
      if (name.isComplex()) {
        ref = Literal(o.scope.temporary('name'));
        name = Index(Assign(ref, name.index));
        nref = Index(ref);
        nref.temps = [ref.value];
      }
      return [base.add(name), Value(bref || base.head, [nref || name])];
    };
    _ref.compileNode = function(o){
      var asn, code, p, ps, val, _i, _len;
      if (asn = this.unfoldAssign(o)) {
        return asn.compile(o);
      }
      if (val = this.unfoldBind(o)) {
        return val.compile(o);
      }
      this.head.front = this.front;
      val = (this.tails.length && this.substituteStar(o)) || this;
      ps = val.tails;
      code = val.head.compile(o, ps.length ? LEVEL_ACCESS : null);
      if (ps[0] instanceof Access && SIMPLENUM.test(code)) {
        code += ' ';
      }
      for (_i = 0, _len = ps.length; _i < _len; ++_i) {
        p = ps[_i];
        code += p.compile(o);
      }
      return code;
    };
    _ref.substituteStar = function(o){
      var find, i, prop, ref, star, sub, _len, _ref, _ref2;
      find = function(it){
        switch (false) {
        case it.value !== '*':
          return it;
        case !(it instanceof Index):
          return false;
        }
      };
      for (i = 0, _len = (_ref = this.tails).length; i < _len; ++i) {
        prop = _ref[i];
        if (!(prop instanceof Index && (star = prop.traverseChildren(find)))) {
          continue;
        }
        _ref2 = Value(this.head, this.tails.slice(0, i)).cache(o), sub = _ref2[0], ref = _ref2[1];
        if (sub !== ref) {
          this.temps = [ref.value];
        }
        if (SIMPLENUM.test(ref = ref.compile(o))) {
          ref += ' ';
        }
        star.value = ref + '.length';
        return Value(sub, this.tails.slice(i));
      }
      return null;
    };
    _ref.unfoldSoak = function(o){
      var fst, i, ifn, prop, ref, snd, _len, _ref;
      if (ifn = this.head.unfoldSoak(o)) {
        (_ref = ifn.then.tails).push.apply(_ref, this.tails);
        return ifn;
      }
      for (i = 0, _len = (_ref = this.tails).length; i < _len; ++i) {
        prop = _ref[i];
        if (prop.soak) {
          prop.soak = false;
          fst = Value(this.head, this.tails.slice(0, i));
          snd = Value(this.head, this.tails.slice(i));
          if (fst.isComplex()) {
            ref = Literal(o.scope.temporary('ref'));
            fst = Parens(Assign(ref, fst));
            snd.head = ref;
          }
          ifn = If(Existence(fst), snd, {
            soak: true
          });
          if (ref) {
            ifn.temps = [ref.value];
          }
          return ifn;
        }
      }
      return null;
    };
    _ref.unfoldAssign = function(o){
      var asn, i, lhs, prop, rhs, _len, _ref, _ref2;
      if (asn = this.head.unfoldAssign(o)) {
        (_ref = asn.right.tails).push.apply(_ref, this.tails);
        return asn;
      }
      for (i = 0, _len = (_ref = this.tails).length; i < _len; ++i) {
        prop = _ref[i];
        if (prop.assign) {
          prop.assign = false;
          _ref2 = Value(this.head, this.tails.slice(0, i)).cacheReference(o), lhs = _ref2[0], rhs = _ref2[1];
          return _ref2 = Assign(lhs, Value(rhs, this.tails.slice(i))), _ref2.access = true, _ref2;
        }
      }
      return null;
    };
    _ref.unfoldBind = function(o){
      var ctx, fun, i, p, ps, ref, _len, _ref, _ref2;
      for (i = 0, _len = (_ref = ps = this.tails).length; i < _len; ++i) {
        p = _ref[i];
        if (p.bind) {
          p.bind = false;
          _ref2 = Value(this.head, ps.slice(0, i)).cache(o), ctx = _ref2[0], ref = _ref2[1];
          fun = Value(ref, [p]);
          if (ctx !== ref) {
            fun.temps = [ref.value];
          }
          return Value(Call(Literal(utility('bind')), [ctx, fun]), ps.slice(i + 1));
        }
      }
      return null;
    };
    return Value;
  }());
  exports.Comment = Comment = (function(){
    var _ref;
    __extends(Comment, Node);
    function _ctor(){} _ctor.prototype = Comment.prototype;
    function Comment(comment){
      var _this = new _ctor;
      _this.comment = comment;
      return _this;
    } Comment.name = "Comment";
    _ref = Comment.prototype;
    _ref.terminator = '';
    _ref.compile = function(o){
      return '/*' + multident(this.comment, o.indent) + '*/';
    };
    return Comment;
  }());
  exports.Call = Call = (function(){
    var _ref;
    __extends(Call, Node);
    function _ctor(){} _ctor.prototype = Call.prototype;
    function Call(callee, args, open){
      var _this = new _ctor;
      _this.callee = callee;
      _this.args = args;
      _this.args || (_this.args = (_this.splat = true, [Literal('this'), Literal('arguments')]));
      if (open === '?(') {
        _this.soak = true;
      }
      return _this;
    } Call.name = "Call";
    _ref = Call.prototype;
    _ref.children = ['callee', 'args'];
    _ref.digCalls = function(){
      var call, list;
      list = [call = this];
      while ((call = call.callee.head) instanceof Call) {
        list.push(call);
      }
      return list.reverse();
    };
    _ref.unfoldSoak = function(o){
      var call, ifn, left, rite, _i, _len, _ref;
      if (this.soak) {
        if (ifn = If.unfoldSoak(o, this, 'callee')) {
          return ifn;
        }
        _ref = this.callee.cacheReference(o), left = _ref[0], rite = _ref[1];
        rite = Call(rite, this.args);
        rite["new"] = this["new"];
        left = Literal("typeof " + left.compile(o) + " == \"function\"");
        return If(left, Value(rite), {
          soak: true
        });
      }
      for (_i = 0, _len = (_ref = this.digCalls()).length; _i < _len; ++_i) {
        call = _ref[_i];
        if (ifn) {
          call.callee.head = ifn;
        }
        ifn = If.unfoldSoak(o, call, 'callee');
      }
      return ifn;
    };
    _ref.unfoldAssign = function(o){
      var asn, call, _i, _len, _ref;
      for (_i = 0, _len = (_ref = this.digCalls()).length; _i < _len; ++_i) {
        call = _ref[_i];
        if (asn) {
          call.callee.head = asn;
        }
        if (asn = call.callee.unfoldAssign(o)) {
          call.callee = asn.right;
          asn.right = Value(call);
        }
      }
      return asn;
    };
    _ref.compileNode = function(o){
      var arg, args, asn, code, fun;
      if (asn = this.unfoldAssign(o)) {
        return asn.compile(o);
      }
      if (!(fun = (this.callee.head || this.callee) instanceof Code)) {
        this.callee.front = this.front;
      }
      if (this.splat) {
        if (this["new"]) {
          return this.compileSplat(o, this.args[1].value);
        }
        return this.callee.compile(o, LEVEL_ACCESS) + (".apply(" + this.args[0].compile(o) + ", " + this.args[1].value + ")");
      }
      if (args = Splat.compileArray(o, this.args, true)) {
        return this.compileSplat(o, args);
      }
      code = (this["new"] || '') + this.callee.compile(o, LEVEL_ACCESS) + ("(" + (function(){
        var _i, _len, _ref, _results = [];
        for (_i = 0, _len = (_ref = this.args).length; _i < _len; ++_i) {
          arg = _ref[_i];
          _results.push(arg.compile(o, LEVEL_LIST));
        }
        return _results;
      }.call(this)).join(', ') + ")");
      if (fun) {
        return "(" + code + ")";
      } else {
        return code;
      }
    };
    _ref.compileSplat = function(o, args){
      var base, fun, idt, name, ref;
      if (this["new"]) {
        idt = this.tab + TAB;
        return "(function(func, args, ctor){\n" + idt + "ctor.prototype = func.prototype;\n" + idt + "var child = new ctor, result = func.apply(child, args);\n" + idt + "return result === Object(result) ? result : child;\n" + this.tab + "}(" + this.callee.compile(o, LEVEL_LIST) + ", " + args + ", function(){}))";
      }
      base = this.callee;
      if ((name = base.tails.pop()) && base.isComplex()) {
        ref = o.scope.temporary('ref');
        fun = "(" + ref + " = " + base.compile(o, LEVEL_LIST) + ")" + name.compile(o);
        o.scope.free(ref);
      } else {
        fun = base.compile(o, LEVEL_ACCESS);
        if (name) {
          ref = fun;
          fun += name.compile(o);
        } else {
          ref = 'null';
        }
      }
      return "" + fun + ".apply(" + ref + ", " + args + ")";
    };
    return Call;
  }());
  exports.Extends = Extends = (function(){
    var _ref;
    __extends(Extends, Node);
    function _ctor(){} _ctor.prototype = Extends.prototype;
    function Extends(sub, sup){
      var _this = new _ctor;
      _this.sub = sub;
      _this.sup = sup;
      return _this;
    } Extends.name = "Extends";
    _ref = Extends.prototype;
    _ref.children = ['sub', 'sup'];
    _ref.compile = function(o){
      return Call(Value(Literal(utility('extends'))), [this.sub, this.sup]).compile(o);
    };
    return Extends;
  }());
  exports.Import = Import = (function(){
    var _ref;
    __extends(Import, Node);
    function _ctor(){} _ctor.prototype = Import.prototype;
    function Import(left, right, own){
      var _this = new _ctor;
      _this.left = left;
      _this.right = right;
      _this.util = own ? 'import' : 'importAll';
      return _this;
    } Import.name = "Import";
    _ref = Import.prototype;
    _ref.children = ['left', 'right'];
    _ref.compileNode = function(o){
      var acc, asn, code, com, delim, dyna, items, key, lref, node, space, sub, top, val, _i, _len, _ref;
      if (!(this.util === 'import' && this.right.isObject())) {
        return Call(Value(Literal(utility(this.util))), [this.left, this.right]).compile(o);
      }
      top = !o.level;
      items = this.right.unwrap().items;
      if (top && items.length < 2) {
        sub = lref = this.left;
      } else {
        _ref = this.left.cache(o), sub = _ref[0], lref = _ref[1];
      }
      _ref = top
        ? [';', '\n' + this.tab]
        : [',', ' '], delim = _ref[0], space = _ref[1];
      delim += space;
      this.temps = [];
      code = '';
      for (_i = 0, _len = items.length; _i < _len; ++_i) {
        node = items[_i];
        code += com ? space : delim;
        if (com = node instanceof Comment) {
          code += node.compile(o, LEVEL_LIST);
          continue;
        }
        if (node instanceof Splat) {
          code += Import(lref, node.it, true).compile(o, LEVEL_TOP);
          continue;
        }
        dyna = false;
        if (node instanceof Assign) {
          val = node.right, key = node.left;
        } else if (node.at) {
          key = (val = node).tails[0].name;
        } else {
          dyna = (node = node.unwrap()) instanceof Parens;
          _ref = node.cache(o), key = _ref[0], val = _ref[1];
        }
        acc = key instanceof Literal && IDENTIFIER.test(key.value);
        asn = Assign(Value(lref, [(acc ? Access : Index)(key)]), val);
        if (dyna && key !== val) {
          asn.temps = [val.value];
        }
        code += asn.compile(o, LEVEL_PAREN);
      }
      if (sub === lref) {
        code = code.slice(delim.length);
      } else {
        code = sub.compile(o, LEVEL_PAREN) + code;
        o.scope.free(lref.value);
      }
      if (top) {
        return code;
      }
      if (!(node instanceof Splat)) {
        code += (com ? ' ' : ', ') + lref.compile(o, LEVEL_LIST);
      }
      if (o.level < LEVEL_LIST) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    return Import;
  }());
  exports.Access = Access = (function(){
    var _ref;
    __extends(Access, Node);
    function _ctor(){} _ctor.prototype = Access.prototype;
    function Access(name, symbol){
      var _this = new _ctor;
      _this.name = name;
      switch (symbol) {
      case '?.':
        _this.soak = true;
        break;
      case '&.':
        _this.bind = true;
        break;
      case '.=':
        _this.assign = true;
      }
      return _this;
    } Access.name = "Access";
    _ref = Access.prototype;
    _ref.children = ['name'];
    _ref.compile = function(o){
      var name, _ref;
      if ((_ref = (name = this.name.compile(o)).charAt(0)) === '\"' || _ref === '\'') {
        return "[" + name + "]";
      } else {
        return "." + name;
      }
    };
    _ref.isComplex = NO;
    _ref.toString = function(idt){
      return Access.superclass.prototype.toString.call(this, idt, this.constructor.name + (this.assign ? '=' : ''));
    };
    return Access;
  }());
  exports.Index = Index = (function(){
    var _ref;
    __extends(Index, Node);
    function _ctor(){} _ctor.prototype = Index.prototype;
    function Index(index, symbol){
      var _this = new _ctor;
      _this.index = index;
      switch (symbol) {
      case '?[':
        _this.soak = true;
        break;
      case '&[':
        _this.bind = true;
        break;
      case '[=':
        _this.assign = true;
      }
      return _this;
    } Index.name = "Index";
    _ref = Index.prototype;
    _ref.children = ['index'];
    _ref.compile = function(o){
      return "[" + this.index.compile(o, LEVEL_PAREN) + "]";
    };
    _ref.isComplex = function(){
      return this.index.isComplex();
    };
    _ref.toString = Access.prototype.toString;
    return Index;
  }());
  exports.Obj = Obj = (function(){
    var _ref;
    __extends(Obj, Node);
    function _ctor(){} _ctor.prototype = Obj.prototype;
    function Obj(items){
      var _this = new _ctor;
      _this.items = items != null ? items : [];
      return _this;
    } Obj.name = "Obj";
    _ref = Obj.prototype;
    _ref.children = ['items'];
    _ref.isObject = YES;
    _ref.assigns = function(it){
      var node, _i, _len, _ref;
      for (_i = 0, _len = (_ref = this.items).length; _i < _len; ++_i) {
        node = _ref[_i];
        if (node.assigns(it)) {
          return true;
        }
      }
      return false;
    };
    _ref.compileNode = function(o){
      var code, dic, i, idt, items, key, last, node, rest, _i, _len;
      items = this.items;
      if (!items.length) {
        return (this.front ? '({})' : '{}');
      }
      for (i = 0, _len = items.length; i < _len; ++i) {
        node = items[i];
        if (node instanceof Splat || (node.left || node) instanceof Parens) {
          rest = items.splice(i, 1 / 0);
          break;
        }
      }
      last = lastNonComment(items)[0];
      idt = o.indent += TAB;
      dic = {};
      code = '';
      for (_i = 0, _len = items.length; _i < _len; ++_i) {
        node = items[_i];
        if (node instanceof Comment) {
          code += idt + node.compile(o, LEVEL_TOP) + '\n';
          continue;
        }
        code += idt + (node.at
          ? (key = node.tails[0].name.compile(o), key + ': ' + node.compile(o, LEVEL_LIST))
          : node instanceof Assign
            ? (key = node.left.compile(o), node.compile(o))
            : (key = node.compile(o, LEVEL_LIST)) + ': ' + key);
        if (dic[key + 0]) {
          throw SyntaxError('duplicated property name: ' + key);
        }
        dic[key + 0] = 1;
        if (node !== last) {
          code += ',';
        }
        code += '\n';
      }
      code = "{" + (code && '\n' + code + this.tab) + "}";
      if (rest) {
        return this.compileDynamic(o, code, rest);
      }
      if (this.front) {
        return "(" + code + ")";
      } else {
        return code;
      }
    };
    _ref.compileDynamic = function(o, code, props){
      var oref;
      o.indent = this.tab;
      code = (oref = o.scope.temporary('obj')) + ' = ' + code + ', ' + Import(Literal(oref), Obj(props), true).compile(o, LEVEL_PAREN);
      o.scope.free(oref);
      if (o.level < LEVEL_LIST) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    return Obj;
  }());
  exports.Arr = Arr = (function(){
    var _ref;
    __extends(Arr, Node);
    function _ctor(){} _ctor.prototype = Arr.prototype;
    function Arr(items){
      var _this = new _ctor;
      _this.items = items != null ? items : [];
      return _this;
    } Arr.name = "Arr";
    _ref = Arr.prototype;
    _ref.children = ['items'];
    _ref.isArray = YES;
    _ref.assigns = Obj.prototype.assigns;
    _ref.compileNode = function(o){
      var code, obj;
      if (!this.items.length) {
        return '[]';
      }
      if (code = Splat.compileArray(o, this.items)) {
        return code;
      }
      o.indent += TAB;
      code = (function(){
        var _i, _len, _ref, _results = [];
        for (_i = 0, _len = (_ref = this.items).length; _i < _len; ++_i) {
          obj = _ref[_i];
          _results.push(obj.compile(o, LEVEL_LIST));
        }
        return _results;
      }.call(this)).join(', ');
      if (0 < code.indexOf('\n')) {
        return "[\n" + o.indent + code + "\n" + this.tab + "]";
      } else {
        return "[" + code + "]";
      }
    };
    return Arr;
  }());
  exports.Class = Class = (function(){
    var _ref;
    __extends(Class, Node);
    function _ctor(){} _ctor.prototype = Class.prototype;
    function Class(title, sup, body){
      var _this = new _ctor;
      _this.title = title;
      _this.sup = sup;
      _this.code = Code([], body);
      return _this;
    } Class.name = "Class";
    _ref = Class.prototype;
    _ref.children = ['title', 'sup', 'code'];
    _ref.compileNode = function(o){
      var clas, ctor, decl, exps, i, lname, name, node, proto, _len, _ref, _ref2;
      if (this.title) {
        decl = this.title instanceof Value
          ? (_ref = (_ref2 = this.title.tails)[_ref2.length - 1].name) != null ? _ref.value : void 8
          : this.title.value;
        if (decl && decl.reserved) {
          throw SyntaxError("reserved word \"" + decl + "\" cannot be a class name");
        }
      }
      name = decl || this.name;
      if (!(name && IDENTIFIER.test(name))) {
        name = '_Class';
      }
      lname = Literal(this.code.bound = name);
      proto = Value(lname, [Access(Literal('prototype'))]);
      this.code.body.traverseChildren(function(it){
        if (it instanceof Code) {
          it.clas = name;
        }
        return null;
      });
      for (i = 0, _len = (_ref = exps = this.code.body.lines).length; i < _len; ++i) {
        node = _ref[i];
        if (node.isObject()) {
          exps[i] = Import(proto, node, true);
        } else if (node instanceof Code) {
          if (ctor) {
            throw SyntaxError('more than one constructor in a class');
          }
          ctor = node;
        }
      }
      if (!ctor) {
        exps.unshift(ctor = Code());
      }
      ctor.name = name;
      ctor.ctor = true;
      ctor.statement = true;
      ctor.clas = false;
      if (this.sup) {
        exps.unshift(Extends(lname, this.sup));
      }
      exps.push(lname);
      clas = Call(this.code, []);
      if (decl && ((_ref = this.title) != null ? _ref.isComplex() : void 8)) {
        clas = Assign(lname, clas);
      }
      if (this.title) {
        clas = Assign(this.title, clas);
      }
      return clas.compile(o);
    };
    return Class;
  }());
  exports.Assign = Assign = (function(){
    var _ref;
    __extends(Assign, Node);
    function _ctor(){} _ctor.prototype = Assign.prototype;
    function Assign(left, right, op, logic){
      var _this = new _ctor;
      _this.left = left;
      _this.right = right;
      _this.op = op != null ? op : '=';
      _this.logic = logic != null ? logic : _this.op.logic;
      _this.op += '';
      return _this;
    } Assign.name = "Assign";
    _ref = Assign.prototype;
    _ref.children = ['left', 'right'];
    _ref.assigns = function(name){
      return this[this.op === ':' ? 'right' : 'left'].assigns(name);
    };
    _ref.unfoldSoak = function(o){
      return If.unfoldSoak(o, this, 'left');
    };
    _ref.unfoldAssign = function(){
      return this.access && this;
    };
    _ref.compileNode = function(o){
      var code, left, match, name, right, val;
      left = this.left;
      if (left.isArray() || left.isObject()) {
        if (!this.logic) {
          return this.compileDestructuring(o);
        }
        throw SyntaxError('conditional assignment cannot be destructuring');
      }
      if (this.logic) {
        return this.compileConditional(o);
      }
      name = left.compile(o, LEVEL_LIST);
      right = this.right;
      if ((right instanceof Code || right instanceof Class) && (match = METHOD_DEF.exec(name))) {
        if (match[1]) {
          right.clas = match[1];
        }
        right.name || (right.name = match[2] || match[3]);
      }
      val = right.compile(o, LEVEL_LIST);
      if (this.op === ':') {
        if (left.isComplex()) {
          throw SyntaxError('invalid property name: ' + name);
        }
        return name + ': ' + val;
      }
      if (!left.isAssignable()) {
        throw SyntaxError("\"" + this.left.compile(o) + "\" cannot be assigned");
      }
      if (IDENTIFIER.test(name)) {
        if (this.op === '=') {
          o.scope.declare(name);
        } else if (!o.scope.check(name, true)) {
          throw SyntaxError("assignment to undeclared variable \"" + name + "\"");
        }
      }
      code = name + (" " + (this.op === ':=' ? '=' : this.op) + " ") + val;
      if (o.level < LEVEL_COND) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    _ref.compileConditional = function(o){
      var left, rite, _ref;
      _ref = Value(this.left).cacheReference(o), left = _ref[0], rite = _ref[1];
      return Op(this.logic, left, Assign(rite, this.right, this.op)).compile(o);
    };
    _ref.compileDestructuring = function(o){
      var cache, code, items, left, list, olen, rite, rref;
      items = (left = this.left.unwrap()).items;
      if (!(olen = items.length)) {
        return this.right.compile(o, LEVEL_ACCESS);
      }
      rite = this.right.compile(o, olen === 1 ? LEVEL_ACCESS : LEVEL_LIST);
      if ((olen > 1 || o.level) && (!IDENTIFIER.test(rite) || left.assigns(rite))) {
        cache = "" + (rref = o.scope.temporary('ref')) + " = " + rite;
        rite = rref;
      }
      list = left instanceof Arr
        ? this.destructArr(o, items, rite)
        : this.destructObj(o, items, rite);
      if (rref) {
        o.scope.free(rref);
      }
      if (cache) {
        list.unshift(cache);
      }
      if (o.level) {
        list.push(rite);
      }
      code = list.join(', ');
      if (list.length < 2 || o.level < LEVEL_LIST) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    _ref.destructArr = function(o, nodes, rite){
      var i, inc, ivar, len, lr, node, start, val, _len, _results = [];
      for (i = 0, _len = nodes.length; i < _len; ++i) {
        node = nodes[i];
        if ((node = node.unwrap()).items && !node.items.length) {
          continue;
        }
        if (node instanceof Splat) {
          if (ivar) {
            throw SyntaxError("multiple splats in an assignment: " + node.compile(o));
          }
          len = nodes.length;
          val = utility('slice') + '.call(' + rite;
          val = i === len - 1
            ? val + (i ? ", " + i + ")" : ')')
            : (this.temps = [ivar = o.scope.temporary('i')], start = i + 1, ("" + len + " <= " + rite + ".length") + (" ? " + val + ", " + i + ", " + ivar + " = " + rite + ".length - " + (len - i - 1) + ")") + (" : (" + ivar + " = " + i + ", [])"));
          val = Literal(val);
        } else {
          if ((inc = ivar) && start < i) {
            inc += " + " + (i - start);
          }
          val = Value(lr || (lr = Literal(rite)), [Index(Literal(inc || i))]);
        }
        _results.push(Assign(node, val, this.op).compile(o, LEVEL_TOP));
      }
      return _results;
    };
    _ref.destructObj = function(o, nodes, rite){
      var acc, dyna, key, lr, node, splat, val, _i, _len, _ref, _results = [];
      for (_i = 0, _len = nodes.length; _i < _len; ++_i) {
        node = nodes[_i];
        if (splat = node instanceof Splat) {
          node = node.it;
        }
        if (dyna = (node.head || node) instanceof Parens) {
          _ref = Value(node.unwrapAll()).cacheReference(o), node = _ref[0], key = _ref[1];
        } else if (node instanceof Assign) {
          _ref = node, node = _ref.right, key = _ref.left;
        } else {
          key = node.at ? node.tails[0].name : node;
        }
        acc = !dyna && IDENTIFIER.test(key.unwrap().value || 0);
        val = Value(lr || (lr = Literal(rite)), [(acc ? Access : Index)(key)]);
        if (splat) {
          val = Import(Obj(), val, true);
        }
        _results.push(Assign(node, val, this.op).compile(o, LEVEL_TOP));
      }
      return _results;
    };
    _ref.toString = function(idt){
      return Assign.superclass.prototype.toString.call(this, idt, this.constructor.name + ' ' + this.op);
    };
    return Assign;
  }());
  exports.Code = Code = (function(){
    var _ref;
    __extends(Code, Node);
    function _ctor(){} _ctor.prototype = Code.prototype;
    function Code(params, body, arrow){
      var _this = new _ctor;
      _this.params = params != null ? params : [];
      _this.body = body != null ? body : Lines();
      if (arrow === '=>') {
        _this.bound = '_this';
      }
      return _this;
    } Code.name = "Code";
    _ref = Code.prototype;
    _ref.children = ['params', 'body'];
    _ref.traverseChildren = function(_, xscope){
      if (xscope) {
        return Code.superclass.prototype.traverseChildren.apply(this, arguments);
      }
    };
    _ref.isStatement = function(){
      return !!this.statement;
    };
    _ref.makeReturn = function(){
      if (this.statement) {
        return this.returns = true, this;
      } else {
        return Code.superclass.prototype.makeReturn.apply(this, arguments);
      }
    };
    _ref.compileNode = function(o){
      var asns, b, body, code, exps, i, name, p, param, params, pscope, ref, scope, splats, sscope, statement, tab, v, val, vars, wasEmpty, _i, _len, _ref;
      pscope = o.scope;
      sscope = pscope.shared || pscope;
      scope = o.scope = this.body.scope = new Scope((this.wrapper ? pscope : sscope), this.wrapper && sscope);
      scope.method = this;
      delete o.globals;
      o.indent += TAB;
      params = this.params, body = this.body, name = this.name, statement = this.statement, tab = this.tab;
      code = 'function';
      if (this.bound === '_this') {
        if (this.ctor) {
          scope.assign('_this', 'new _ctor');
          code += " _ctor(){} _ctor.prototype = " + name + ".prototype;\n" + tab + "function";
          body.add(Return(Literal('_this')));
        } else if (b = (_ref = sscope.method) != null ? _ref.bound : void 8) {
          this.bound = b;
        } else {
          sscope.assign('_this', 'this');
        }
      }
      vars = [];
      asns = [];
      for (_i = 0, _len = params.length; _i < _len; ++_i) {
        param = params[_i];
        if (param.splat) {
          splats = Assign(Arr((function(){
            var _i, _len, _ref, _results = [];
            for (_i = 0, _len = (_ref = params).length; _i < _len; ++_i) {
              p = _ref[_i];
              _results.push(p.asReference(o));
            }
            return _results;
          }())), Literal('arguments'));
          break;
        }
      }
      for (_i = 0, _len = params.length; _i < _len; ++_i) {
        param = params[_i];
        if (param.isComplex()) {
          val = ref = param.asReference(o);
          if (param.value) {
            val = Op('?', ref, param.value);
          }
          asns.push(Assign(param.name, val));
        } else if ((ref = param).value) {
          asns.push(Op('&&', Literal(ref.name.value + ' == null'), Assign(ref.name, ref.value)));
        }
        if (!splats) {
          vars.push(ref);
        }
      }
      wasEmpty = !(exps = body.lines).length;
      if (splats) {
        asns.unshift(splats);
      }
      if (asns.length) {
        exps.unshift.apply(exps, asns);
      }
      if (!splats) {
        for (i = 0, _len = vars.length; i < _len; ++i) {
          v = vars[i];
          scope.parameter(vars[i] = v.compile(o));
        }
      }
      if (!vars.length && body.contains(function(it){
        return it.value === 'it';
      })) {
        vars[0] = 'it';
      }
      if (!(wasEmpty || this.ctor)) {
        body.makeReturn();
      }
      if (statement) {
        if (!name) {
          throw SyntaxError('cannot declare a nameless function');
        }
        if (o.lines.scope !== pscope) {
          throw SyntaxError('cannot declare a function under a statement');
        }
        scope.add(name, 'function');
        if (!this.returns) {
          pscope.add(name, 'function');
        }
        code += ' ' + name;
      }
      code += '(' + vars.join(', ') + '){';
      if (exps.length) {
        code += "\n" + body.compileWithDeclarations(o) + "\n" + tab;
      }
      code += '}';
      if (statement && name.charAt(0) !== '_') {
        code += " " + name + ".name = \"" + name + "\";";
      }
      if (this.returns) {
        code += "\n" + tab + "return " + name + ";";
      }
      if (statement) {
        return tab + code;
      }
      if (this.front) {
        return "(" + code + ")";
      } else {
        return code;
      }
    };
    return Code;
  }());
  exports.Param = Param = (function(){
    var _ref;
    __extends(Param, Node);
    function _ctor(){} _ctor.prototype = Param.prototype;
    function Param(name, value, splat){
      var _this = new _ctor;
      _this.name = name;
      _this.value = value;
      _this.splat = splat;
      return _this;
    } Param.name = "Param";
    _ref = Param.prototype;
    _ref.children = ['name', 'value'];
    _ref.compile = function(o){
      return this.name.compile(o, LEVEL_LIST);
    };
    _ref.asReference = function(o){
      var node;
      if (this.reference) {
        return this.reference;
      }
      node = this.name;
      if (node.at) {
        node = node.tails[0].name;
        if (node.value.reserved) {
          node = Literal('$' + node.value);
        }
      } else if (node.isComplex()) {
        node = Literal(o.scope.temporary('arg'));
      }
      return this.reference = this.splat ? Splat(node) : node;
    };
    _ref.isComplex = function(){
      return this.name.isComplex();
    };
    return Param;
  }());
  exports.Splat = Splat = (function(){
    var _ref;
    __extends(Splat, Node);
    function _ctor(){} _ctor.prototype = Splat.prototype;
    function Splat(it){
      var _this = new _ctor;
      _this.it = it instanceof Node ? it : Literal(it);
      return _this;
    } Splat.name = "Splat";
    _ref = Splat.prototype;
    _ref.children = ['it'];
    _ref.isAssignable = YES;
    _ref.assigns = function(it){
      return this.it.assigns(it);
    };
    _ref.compile = function(it){
      var _ref;
      return (_ref = this.it).compile.apply(_ref, arguments);
    };
    Splat.compileArray = function(o, list, apply){
      var args, base, code, i, index, node, _len;
      for (index = 0, _len = list.length; index < _len; ++index) {
        node = list[index];
        if (node instanceof Splat) {
          break;
        }
      }
      if (index >= list.length) {
        return '';
      }
      if (list.length === 1) {
        code = list[0].compile(o, LEVEL_LIST);
        return apply ? code : utility('slice') + (".call(" + code + ")");
      }
      args = list.slice(index);
      for (i = 0, _len = args.length; i < _len; ++i) {
        node = args[i];
        code = node.compile(o, LEVEL_LIST);
        args[i] = node instanceof Splat
          ? utility('slice') + (".call(" + code + ")")
          : "[" + code + "]";
      }
      if (!index) {
        return args[0] + (".concat(" + args.slice(1).join(', ') + ")");
      }
      base = (function(){
        var _i, _len, _ref, _results = [];
        for (_i = 0, _len = (_ref = list.slice(0, index)).length; _i < _len; ++_i) {
          node = _ref[_i];
          _results.push(node.compile(o, LEVEL_LIST));
        }
        return _results;
      }());
      return "[" + base.join(', ') + "].concat(" + args.join(', ') + ")";
    };
    return Splat;
  }());
  exports.While = While = (function(){
    var _ref;
    __extends(While, Node);
    function _ctor(){} _ctor.prototype = While.prototype;
    function While(condition, name){
      var _this = new _ctor;
      _this.condition = condition;
      if (name === 'until') {
        _this.condition = _this.condition.invert();
      }
      return _this;
    } While.name = "While";
    _ref = While.prototype;
    _ref.children = ['condition', 'body'];
    _ref.isStatement = YES;
    _ref.containsPureStatement = function(){
      var i, lines, ret, _ref;
      lines = this.body.lines;
      if (!(i = lines.length)) {
        return false;
      }
      if ((_ref = lines[--i]) != null ? _ref.containsPureStatement() : void 8) {
        return true;
      }
      ret = function(it){
        return it instanceof Return;
      };
      while (i) {
        if (lines[--i].contains(ret)) {
          return true;
        }
      }
      return false;
    };
    _ref.addBody = function(body){
      this.body = body;
      return this;
    };
    _ref.makeReturn = function(it){
      if (it) {
        this.body.makeReturn(it);
      } else if (!this.containsPureStatement()) {
        this.returns = true;
      }
      return this;
    };
    _ref.compileNode = function(o){
      var code, _ref;
      code = ((_ref = this.condition) != null ? _ref.compile(o, LEVEL_PAREN) : void 8) || 'true';
      code = this.tab + (code === 'true' ? 'for (;;' : 'while (' + code);
      o.indent += TAB;
      return code + ') {' + this.compileBody(o);
    };
    _ref.compileBody = function(o){
      var body, code, exps, i, last, res, ret, _ref;
      body = this.body;
      _ref = lastNonComment(exps = body.lines), last = _ref[0], i = _ref[1];
      if ((last != null ? last.value : void 8) === 'continue') {
        exps.splice(i, 1);
        _ref = lastNonComment(exps), last = _ref[0], i = _ref[1];
      }
      ret = '';
      if (this.returns) {
        if (last && !(last instanceof Throw)) {
          o.scope.assign(res = '_results', '[]');
          exps[i] = last.makeReturn(res);
        }
        ret = "\n" + this.tab + "return " + (res || '[]') + ";";
      }
      if (!exps.length) {
        return '}' + ret;
      }
      code = '\n';
      return code + body.compile(o, LEVEL_TOP) + ("\n" + this.tab + "}") + ret;
    };
    return While;
  }());
  exports.Op = Op = (function(){
    var COMPARER, EQUALITY, _ref;
    __extends(Op, Node);
    function _ctor(){} _ctor.prototype = Op.prototype;
    function Op(op, first, second, post){
      var head, _this = new _ctor;
      if (op === 'of') {
        return Of(first, second);
      }
      if (op === 'do') {
        return Call(first, []);
      }
      if (op === 'new') {
        head = first.head;
        if (head instanceof Call) {
          head.digCalls()[0]["new"] = 'new ';
          return first;
        }
        if (head instanceof Parens) {
          head.keep = true;
        }
      }
      _this.op = op;
      _this.first = first;
      _this.second = second;
      _this.post = post;
      return _this;
    } Op.name = "Op";
    EQUALITY = /^[!=]==?$/;
    COMPARER = /^(?:[!=]=|[<>])=?$/;
    _ref = Op.prototype;
    _ref.children = ['first', 'second'];
    _ref.invert = function(){
      var fst, op, _ref;
      if (EQUALITY.test(op = this.op) && !COMPARER.test(this.first.op)) {
        this.op = '!='.charAt(op.indexOf('=')) + op.slice(1);
        return this;
      }
      if (this.second) {
        return Op('!', Parens(this));
      }
      if (op === '!' && ((_ref = (fst = this.first.unwrap()).op) === '!' || _ref === 'in' || _ref === 'instanceof' || _ref === '<' || _ref === '>' || _ref === '<=' || _ref === '>=')) {
        return fst;
      }
      return Op('!', this);
    };
    _ref.unfoldSoak = function(o){
      var _ref;
      return ((_ref = this.op) === '++' || _ref === '--' || _ref === 'delete') && If.unfoldSoak(o, this, 'first');
    };
    _ref.compileNode = function(o){
      var code;
      if (!this.second) {
        return this.compileUnary(o);
      }
      if (COMPARER.test(this.op) && COMPARER.test(this.first.op)) {
        return this.compileChain(o);
      }
      if (this.op === '?') {
        return this.compileExistence(o);
      }
      if (this.op === 'instanceof' && this.second.isArray()) {
        return this.compileMultiIO(o);
      }
      this.first.front = this.front;
      code = this.first.compile(o, LEVEL_OP) + (" " + this.op + " ") + this.second.compile(o, LEVEL_OP);
      if (o.level <= LEVEL_OP) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    _ref.compileChain = function(o){
      var code, ref, sub, _ref;
      _ref = this.first.second.cache(o), sub = _ref[0], ref = _ref[1];
      this.first.second = sub;
      code = this.first.compile(o, LEVEL_OP);
      if (code.charAt(0) === '(') {
        code = code.slice(1, -1);
      }
      code += " && " + ref.compile(o) + " " + this.op + " " + this.second.compile(o, LEVEL_OP);
      if (sub !== ref) {
        o.scope.free(ref.value);
      }
      if (o.level < LEVEL_OP) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    _ref.compileExistence = function(o){
      var code, fst, ref, tmp;
      if (this.first.isComplex()) {
        ref = tmp = o.scope.temporary('ref');
        fst = Parens(Assign(Literal(ref), this.first));
      } else {
        fst = this.first;
        ref = fst.compile(o);
      }
      code = Existence(fst).compile(o);
      code += ' ? ' + ref + ' : ' + this.second.compile(o, LEVEL_LIST);
      if (tmp) {
        o.scope.free(tmp);
      }
      return code;
    };
    _ref.compileUnary = function(o){
      var code, op;
      op = this.op;
      if (op === 'delete' && o.level) {
        return this.compileDelete(o);
      }
      code = this.first.compile(o, LEVEL_OP);
      code = this.post
        ? code + op
        : (op === 'new' || op === 'typeof' || op === 'delete') || (op === '+' || op === '-') && this.first.op === op
          ? op + ' ' + code
          : op + code;
      if (o.level <= LEVEL_OP) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    _ref.compileMultiIO = function(o){
      var code, i, item, ref, sub, tests, _ref;
      _ref = this.first.cache(o, LEVEL_OP), sub = _ref[0], ref = _ref[1];
      tests = (function(){
        var _len, _ref, _results = [];
        for (i = 0, _len = (_ref = this.second.head.items).length; i < _len; ++i) {
          item = _ref[i];
          _results.push((i ? ref : sub) + ' instanceof ' + item.compile(o));
        }
        return _results;
      }.call(this));
      if (sub !== ref) {
        o.scope.free(ref);
      }
      code = tests.join(' || ');
      if (o.level < LEVEL_OP) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    _ref.compileDelete = function(o){
      var code, del, get, ref, _ref;
      code = ref = o.scope.temporary('ref');
      _ref = Value(this.first).cacheReference(o), get = _ref[0], del = _ref[1];
      code += ' = ' + get.compile(o, LEVEL_LIST) + ', delete ' + del.compile(o, LEVEL_LIST) + ', ' + ref;
      o.scope.free(ref);
      if (o.level < LEVEL_LIST) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    _ref.toString = Assign.prototype.toString;
    return Op;
  }());
  exports.Of = Of = (function(){
    var _ref;
    __extends(Of, Node);
    function _ctor(){} _ctor.prototype = Of.prototype;
    function Of(object, array){
      var _this = new _ctor;
      _this.object = object;
      _this.array = array;
      return _this;
    } Of.name = "Of";
    _ref = Of.prototype;
    _ref.children = ['object', 'array'];
    _ref.invert = NEGATE;
    _ref.compileNode = function(o){
      if (this.array.isArray()) {
        return this.compileOrTest(o);
      } else {
        return this.compileLoopTest(o);
      }
    };
    _ref.compileOrTest = function(o){
      var cmp, cnj, code, i, item, ref, sub, tests, _ref;
      _ref = this.object.cache(o, LEVEL_OP), sub = _ref[0], ref = _ref[1];
      _ref = this.negated
        ? [' !== ', ' && ']
        : [' === ', ' || '], cmp = _ref[0], cnj = _ref[1];
      tests = (function(){
        var _len, _ref, _results = [];
        for (i = 0, _len = (_ref = this.array.head.items).length; i < _len; ++i) {
          item = _ref[i];
          _results.push((i ? ref : sub) + cmp + item.compile(o, LEVEL_OP));
        }
        return _results;
      }.call(this));
      if (sub !== ref) {
        o.scope.free(ref);
      }
      code = tests.join(cnj);
      if (o.level < LEVEL_OP) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    _ref.compileLoopTest = function(o){
      var code, ref, sub, _ref;
      _ref = this.object.cache(o, LEVEL_LIST), sub = _ref[0], ref = _ref[1];
      code = utility('indexOf') + (".call(" + this.array.compile(o, LEVEL_LIST) + ", " + ref + ") ") + (this.negated ? '< 0' : '>= 0');
      if (sub === ref) {
        return code;
      }
      o.scope.free(ref);
      code = sub + ', ' + code;
      if (o.level < LEVEL_LIST) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    _ref.toString = function(idt){
      return Of.superclass.prototype.toString.call(this, idt, this.constructor.name + (this.negated ? '!' : ''));
    };
    return Of;
  }());
  exports.Try = Try = (function(){
    var _ref;
    __extends(Try, Node);
    function _ctor(){} _ctor.prototype = Try.prototype;
    function Try(attempt, thrown, recovery, ensure){
      var _this = new _ctor;
      _this.attempt = attempt;
      _this.thrown = thrown;
      _this.recovery = recovery;
      _this.ensure = ensure;
      return _this;
    } Try.name = "Try";
    _ref = Try.prototype;
    _ref.children = ['attempt', 'recovery', 'ensure'];
    _ref.isStatement = YES;
    _ref.makeReturn = function(it){
      this.attempt = this.attempt.makeReturn(it);
      if (this.recovery) {
        this.recovery = this.recovery.makeReturn(it);
      }
      return this;
    };
    _ref.compileNode = function(o){
      var code, reco;
      o.indent += TAB;
      code = this.tab + ("try {\n" + this.attempt.compile(o, LEVEL_TOP) + "\n" + this.tab + "}");
      if (this.recovery) {
        reco = this.recovery.compile(o, LEVEL_TOP);
        code += " catch (" + this.thrown + ") {\n" + reco + "\n" + this.tab + "}";
      } else if (!this.ensure) {
        code += ' catch (_e) {}';
      }
      if (this.ensure) {
        code += " finally {\n" + this.ensure.compile(o, LEVEL_TOP) + "\n" + this.tab + "}";
      }
      return code;
    };
    return Try;
  }());
  exports.Existence = Existence = (function(){
    var _ref;
    __extends(Existence, Node);
    function _ctor(){} _ctor.prototype = Existence.prototype;
    function Existence(it){
      var _this = new _ctor;
      _this.it = it;
      return _this;
    } Existence.name = "Existence";
    _ref = Existence.prototype;
    _ref.children = ['it'];
    _ref.invert = NEGATE;
    _ref.compileNode = function(o){
      var code;
      code = this.it.compile(o, LEVEL_OP);
      if (IDENTIFIER.test(code) && !o.scope.check(code, true)) {
        code = 'typeof ' + code + (this.negated
          ? " == \"undefined\" || " + code + " === null"
          : " != \"undefined\" && " + code + " !== null");
      } else {
        code += " " + (this.negated ? '=' : '!') + "= null";
      }
      if (o.level <= LEVEL_COND) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    return Existence;
  }());
  exports.Parens = Parens = (function(){
    var _ref;
    __extends(Parens, Node);
    function _ctor(){} _ctor.prototype = Parens.prototype;
    function Parens(it, keep){
      var _this = new _ctor;
      _this.it = it;
      _this.keep = keep;
      return _this;
    } Parens.name = "Parens";
    _ref = Parens.prototype;
    _ref.children = ['it'];
    _ref.unwrap = function(it){
      return this.it;
    };
    _ref.makeReturn = function(it){
      return this.it.makeReturn(it);
    };
    _ref.isComplex = function(it){
      return this.it.isComplex();
    };
    _ref.isStatement = function(it){
      return this.it.isStatement();
    };
    _ref.isPureStatement = function(it){
      return this.it.isPureStatement();
    };
    _ref.compileNode = function(o){
      var code, it;
      it = this.it;
      if (!this.keep && ((it instanceof Value || it instanceof Call || it instanceof Code || it instanceof Parens) || o.level < LEVEL_OP && it instanceof Op)) {
        return (it.front = this.front, it).compile(o);
      }
      code = it.compile(o, LEVEL_PAREN);
      if (it.isStatement()) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    return Parens;
  }());
  exports.For = For = (function(){
    var _ref;
    __extends(For, While);
    function _ctor(){} _ctor.prototype = For.prototype;
    function For(){
      var _this = new _ctor;
      return _this;
    } For.name = "For";
    _ref = For.prototype;
    _ref.children = ['source', 'name', 'from', 'to', 'step', 'body'];
    _ref.compileNode = function(o){
      var body, cond, eq, forPart, head, idx, item, lvar, ownPart, pvar, srcPart, step, svar, tail, tvar, vars, _ref;
      if (this.index instanceof Node) {
        if (!((this.index = this.index.unwrap()) instanceof Literal)) {
          throw SyntaxError('invalid index variable: ' + this.index.compile(o));
        }
        this.index = this.index.value;
      }
      this.temps = [];
      if (idx = this.index) {
        o.scope.declare(idx);
      } else {
        this.temps.push(idx = o.scope.temporary('i'));
      }
      if (!this.object) {
        _ref = (this.step || Literal(1)).compileLoopReference(o, 'step'), step = _ref[0], pvar = _ref[1];
        if (step !== pvar) {
          this.temps.push(pvar);
        }
      }
      if (this.from) {
        eq = this.op === 'til' ? '' : '=';
        _ref = this.to.compileLoopReference(o, 'to'), tail = _ref[0], tvar = _ref[1];
        vars = idx + ' = ' + this.from.compile(o);
        if (tail !== tvar) {
          vars += ', ' + tail;
          this.temps.push(tvar);
        }
        cond = +pvar
          ? "" + idx + " " + (pvar < 0 ? '>' : '<') + eq + " " + tvar
          : "" + pvar + " < 0 ? " + idx + " >" + eq + " " + tvar + " : " + idx + " <" + eq + " " + tvar;
      } else {
        if (this.name || this.object && this.own) {
          _ref = this.source.compileLoopReference(o, 'ref'), srcPart = _ref[0], svar = _ref[1];
          if (srcPart !== svar) {
            this.temps.push(svar);
          }
        } else {
          srcPart = svar = this.source.compile(o, LEVEL_PAREN);
        }
        if (!this.object) {
          if (srcPart !== svar) {
            srcPart = "(" + srcPart + ")";
          }
          if (0 > pvar && (pvar | 0) === +pvar) {
            vars = "" + idx + " = " + srcPart + ".length - 1";
            cond = "" + idx + " >= 0";
          } else {
            this.temps.push(lvar = o.scope.temporary('len'));
            vars = "" + idx + " = 0, " + lvar + " = " + srcPart + ".length";
            cond = "" + idx + " < " + lvar;
          }
        }
      }
      if (this.object) {
        forPart = idx + ' in ' + srcPart;
        if (this.own) {
          ownPart = "if (" + utility('owns') + ".call(" + svar + ", " + idx + ")) ";
        }
      } else {
        if (step !== pvar) {
          vars += ', ' + step;
        }
        forPart = vars + ("; " + cond + "; ") + (function(){
          switch (+pvar) {
          case 1:
            return '++' + idx;
          case -1:
            return '--' + idx;
          default:
            return idx + (pvar < 0
              ? ' -= ' + pvar.slice(1)
              : ' += ' + pvar);
          }
        }());
      }
      this.pluckDirectCalls(o);
      head = this.tab + ("for (" + forPart + ") " + (ownPart || '') + "{");
      o.indent += TAB;
      if (this.name) {
        head += '\n' + o.indent;
        item = svar + ("[" + idx + "]");
        if (this.nref) {
          head += this.nref + ' = ' + item + ', ';
          item = this.nref;
        }
        head += Assign(this.name, Literal(item)).compile(o, LEVEL_TOP) + ';';
      }
      body = this.compileBody(o);
      if (this.name && body.charAt(0) === '}') {
        head += '\n' + this.tab;
      }
      return head + body;
    };
    _ref.pluckDirectCalls = function(o){
      var dig, _this = this;
      return this.body.eachChild(dig = function(it){
        var fn, name, ref, _ref;
        if (!(it instanceof Call && (fn = it.callee.unwrapAll()) instanceof Code && fn.params.length === it.args.length)) {
          return it instanceof Code || it instanceof For ? null : it.eachChild(dig);
        }
        if (_this.index) {
          fn.params.push(Param((_ref = it.args)[_ref.length] = Literal(_this.index)));
        }
        if (name = _this.name) {
          it.args.push(Literal(name.isComplex()
            ? _this.nref || (_this.nref = (_ref = _this.temps)[_ref.length] = o.scope.temporary('ref'))
            : name.value));
          fn.params.push(Param(name));
        }
        it.callee = Value(Literal(ref = o.scope.temporary('fn')));
        o.scope.assign(ref, fn.compile((o.indent = '', o), LEVEL_LIST));
        o.indent = _this.tab;
        return null;
      });
    };
    return For;
  }());
  exports.Switch = Switch = (function(){
    var _ref;
    __extends(Switch, Node);
    function _ctor(){} _ctor.prototype = Switch.prototype;
    function Switch($switch, cases, $default){
      var i, tests, _i, _len, _this = new _ctor;
      _this["switch"] = $switch;
      _this.cases = cases;
      _this["default"] = $default;
      if (!$switch) {
        for (_i = 0, _len = cases.length; _i < _len; ++_i) {
          tests = cases[_i].tests;
          for (i in tests) if (__owns.call(tests, i)) {
            tests[i] = tests[i].invert();
          }
        }
      }
      return _this;
    } Switch.name = "Switch";
    _ref = Switch.prototype;
    _ref.children = ['switch', 'cases', 'default'];
    _ref.isStatement = YES;
    _ref.makeReturn = function(it){
      var cs, _i, _len, _ref;
      for (_i = 0, _len = (_ref = this.cases).length; _i < _len; ++_i) {
        cs = _ref[_i];
        cs.makeReturn(it);
      }
      if ((_ref = this["default"]) != null) {
        _ref.makeReturn(it);
      }
      return this;
    };
    _ref.compileNode = function(o){
      var code, cs, def, i, stop, tab, _len, _ref;
      tab = this.tab;
      code = tab + ("switch (" + (((_ref = this["switch"]) != null ? _ref.compile(o, LEVEL_PAREN) : void 8) || false) + ") {\n");
      stop = this["default"] || this.cases.length - 1;
      for (i = 0, _len = (_ref = this.cases).length; i < _len; ++i) {
        cs = _ref[i];
        code += cs.compileCase(o, tab, i === stop);
      }
      if (this["default"]) {
        o.indent = tab + TAB;
        def = this["default"].compile(o, LEVEL_TOP);
        code += tab + ("default:" + (def && '\n' + def) + "\n");
      }
      return code + tab + '}';
    };
    return Switch;
  }());
  exports.Case = Case = (function(){
    var _ref;
    __extends(Case, Node);
    function _ctor(){} _ctor.prototype = Case.prototype;
    function Case(tests, body){
      var _this = new _ctor;
      _this.tests = tests;
      _this.body = body;
      return _this;
    } Case.name = "Case";
    _ref = Case.prototype;
    _ref.children = ['tests', 'body'];
    _ref.makeReturn = function(it){
      var last, _ref;
      last = lastNonComment(this.body.lines)[0];
      if (last && ((_ref = last.head) != null ? _ref.value : void 8) !== 'fallthrough') {
        return this.body.makeReturn(it);
      }
    };
    _ref.compileCase = function(o, tab, nobr){
      var add, body, br, code, exps, ft, i, last, t, test, _i, _j, _len, _len2, _ref, _ref2;
      code = br = '';
      add = function(it){
        return code += tab + ("case " + it.compile(o, LEVEL_PAREN) + ":\n");
      };
      for (_i = 0, _len = (_ref = this.tests).length; _i < _len; ++_i) {
        test = _ref[_i];
        if ((test = test.unwrap()) instanceof Arr) {
          for (_j = 0, _len2 = (_ref2 = test.items).length; _j < _len2; ++_j) {
            t = _ref2[_j];
            add(t);
          }
        } else {
          add(test);
        }
      }
      _ref = lastNonComment(exps = this.body.lines), last = _ref[0], i = _ref[1];
      if (ft = ((_ref = last.head) != null ? _ref.value : void 8) === 'fallthrough') {
        exps[i] = Comment(' fallthrough ');
      }
      o.indent = tab + TAB;
      if (body = this.body.compile(o, LEVEL_TOP)) {
        code += body + '\n';
      }
      if (!(nobr || ft || last instanceof Throw || ((_ref = last.value) === 'continue' || _ref === 'break'))) {
        code += o.indent + 'break;\n';
      }
      return code;
    };
    return Case;
  }());
  exports.If = If = (function(){
    var _ref;
    __extends(If, Node);
    function _ctor(){} _ctor.prototype = If.prototype;
    function If($if, then, _arg){
      var name, _ref, _this = new _ctor;
      _this["if"] = $if;
      _this.then = then;
      _ref = _arg != null ? _arg : {}, _this.statement = _ref.statement, _this.soak = _ref.soak, name = _ref.name;
      if (name === 'unless') {
        _this["if"] = _this["if"].invert();
      }
      return _this;
    } If.name = "If";
    _ref = If.prototype;
    _ref.children = ['if', 'then', 'else'];
    _ref.addElse = function(it){
      if (this.chain) {
        this["else"].addElse(it);
      } else {
        this.chain = it instanceof If;
        this["else"] = it;
      }
      return this;
    };
    _ref.isStatement = function(o){
      var _ref;
      return this.statement || o && !o.level || this.then.isStatement(o) || ((_ref = this["else"]) != null ? _ref.isStatement(o) : void 8);
    };
    _ref.makeReturn = function(it){
      this.then = this.then.makeReturn(it);
      if (this["else"]) {
        this["else"] = this["else"].makeReturn(it);
      }
      return this;
    };
    _ref.compileNode = function(o){
      if (this.isStatement(o)) {
        return this.compileStatement(o);
      } else {
        return this.compileExpression(o);
      }
    };
    _ref.compileStatement = function(o){
      var body, code, _ref;
      code = (_ref = o.elsed, delete o.elsed, _ref) ? '' : this.tab;
      code += "if (" + this["if"].compile(o, LEVEL_PAREN) + ") {";
      o.indent += TAB;
      if (body = Lines(this.then).compile(o)) {
        code += ("\n" + body + "\n") + this.tab;
      }
      code += '}';
      if (!this["else"]) {
        return code;
      }
      return code + ' else ' + (this.chain
        ? this["else"].compile((o.indent = this.tab, o.elsed = true, o), LEVEL_TOP)
        : (body = this["else"].compile(o, LEVEL_TOP)) ? "{\n" + body + "\n" + this.tab + "}" : '{}');
    };
    _ref.compileExpression = function(o){
      var code, pad, _ref;
      code = this["if"].compile(o, LEVEL_COND);
      pad = ((_ref = this["else"]) != null ? _ref.isComplex() : void 8) && this.then.isComplex() ? '\n' + (o.indent += TAB) : ' ';
      code += pad + '? ' + this.then.compile(o, LEVEL_LIST) + pad + ': ' + (((_ref = this["else"]) != null ? _ref.compile(o, LEVEL_LIST) : void 8) || 'void 8');
      if (o.level < LEVEL_COND) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    _ref.unfoldSoak = function(){
      return this.soak && this;
    };
    If.unfoldSoak = function(o, parent, name){
      var ifn;
      if (!(ifn = parent[name].unfoldSoak(o))) {
        return;
      }
      parent[name] = ifn.then;
      ifn.then = Value(parent);
      return ifn;
    };
    return If;
  }());
  exports.Super = Super = (function(){
    var _ref;
    __extends(Super, Node);
    function _ctor(){} _ctor.prototype = Super.prototype;
    function Super(){
      var _this = new _ctor;
      return _this;
    } Super.name = "Super";
    _ref = Super.prototype;
    _ref.isAssignable = YES;
    _ref.compile = function(o){
      var clas, method, name;
      method = (o.scope.shared || o.scope).method;
      if (!method) {
        throw SyntaxError('cannot call super outside of a function');
      }
      name = method.name, clas = method.clas;
      if (name) {
        if (clas) {
          return clas + '.superclass.prototype' + (IDENTIFIER.test(name)
            ? '.' + name
            : '[' + name + ']');
        } else if (IDENTIFIER.test(name)) {
          return name + '.superclass';
        }
      }
      throw SyntaxError('cannot call super on an anonymous function');
    };
    return Super;
  }());
  __importAll(exports, {
    mix: __importAll
  });
  function YES(){
    return true;
  } YES.name = "YES";
  function NO(){
    return false;
  } NO.name = "NO";
  function THIS(){
    return this;
  } THIS.name = "THIS";
  function NEGATE(){
    this.negated ^= 1;
    return this;
  } NEGATE.name = "NEGATE";
  UTILITIES = {
    "extends": 'function(sub, sup){\n  function ctor(){} ctor.prototype = (sub.superclass = sup).prototype;\n  return (sub.prototype = new ctor).constructor = sub;\n}',
    bind: 'function(me, fn){ return function(){ return fn.apply(me, arguments) } }',
    "import": 'function(obj, src){\n  var own = Object.prototype.hasOwnProperty;\n  for (var key in src) if (own.call(src, key)) obj[key] = src[key];\n  return obj;\n}',
    importAll: 'function(obj, src){ for (var key in src) obj[key] = src[key]; return obj }',
    owns: 'Object.prototype.hasOwnProperty',
    slice: 'Array.prototype.slice',
    indexOf: 'Array.prototype.indexOf || function(x){\n  for (var i = this.length; i-- && this[i] !== x;); return i;\n}'
  };
  LEVEL_TOP = 0;
  LEVEL_PAREN = 1;
  LEVEL_LIST = 2;
  LEVEL_COND = 3;
  LEVEL_OP = 4;
  LEVEL_ACCESS = 5;
  TAB = '  ';
  IDENTIFIER = /^[$A-Za-z_][$\w]*$/;
  SIMPLENUM = /^\d+$/;
  METHOD_DEF = /^(?:(\S+)\.prototype(?=\.)|\S*?)(?:(?:\.|^)([$A-Za-z_][$\w]*)|\[(([\"\']).+?\4|\d+)])$/;
  utility = function(name){
    var ref;
    Scope.root.assign(ref = '__' + name, UTILITIES[name]);
    return ref;
  };
  multident = function(code, tab){
    return code.replace(/\n/g, '$&' + tab);
  };
  lastNonComment = function(nodes){
    var i, node;
    for (i = nodes.length - 1; i >= 0; --i) {
      node = nodes[i];
      if (!(node instanceof Comment)) {
        break;
      }
    }
    return [i >= 0 && node, i];
  };
}).call(this);
