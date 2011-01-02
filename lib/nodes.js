var Node, Negatable, Lines, Literal, Key, Index, Value, Call, Clone, Obj, Arr, Op, Assign, Import, Of, Existence, Fun, Class, Super, Parens, Splat, Statement, Throw, Return, While, For, Try, Switch, Case, If, Comment, Util, Scope, UTILITIES, LEVEL_TOP, LEVEL_PAREN, LEVEL_LIST, LEVEL_COND, LEVEL_OP, LEVEL_ACCESS, TAB, IDENTIFIER, utility, lastNonComment, tabify, _ref, __extends = function(sub, sup){
  function ctor(){} ctor.prototype = (sub.superclass = sup).prototype;
  return (sub.prototype = new ctor).constructor = sub;
}, __importAll = function(obj, src){ for (var key in src) obj[key] = src[key]; return obj };
Node = (function(){
  var _proto = Node.prototype;
  function Node(){} Node.name = 'Node';
  _proto.compile = function(options, level){
    var o, key, node, code, tmp, _i, _ref, _len;
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
    code = (node.tab = o.indent, node).compileNode(o);
    if (node.temps) {
      for (_i = 0, _len = (_ref = node.temps).length; _i < _len; ++_i) {
        tmp = _ref[_i];
        o.scope.free(tmp);
      }
    }
    return code;
  };
  _proto.compileClosure = function(o){
    var fun, args, val, mentionsArgs;
    if (this.jumps()) {
      throw SyntaxError(this.compile((o.indent = '', o), LEVEL_TOP) + ' // cannot be an expression');
    }
    (fun = Fun([], Lines(this))).wrapper = true;
    args = [];
    if (this.contains(function(it){
      return it.value === 'this';
    })) {
      args.push(Literal('this'));
      val = Value(fun, [Index(Key('call'))]);
    }
    mentionsArgs = false;
    this.traverseChildren(function(it){
      if (it.value === 'arguments') {
        mentionsArgs = it.value = '_args';
      }
    });
    if (mentionsArgs) {
      args.push(Literal('arguments'));
      fun.params.push(Literal('_args'));
    }
    return Call(val || fun, args).compileNode(o);
  };
  _proto.compileBlock = function(o, name){
    var that, code, _ref;
    if (that = (_ref = this[name]) != null ? _ref.compile(o, LEVEL_TOP) : void 8) {
      code = '\n' + that + '\n' + this.tab;
    }
    return "{" + (code || '') + "}";
  };
  _proto.cache = function(o, once, level){
    var ref, sub;
    if (!this.isComplex()) {
      return [ref = level != null ? this.compile(o, level) : this, ref];
    }
    sub = Assign(ref = Literal(o.scope.temporary('ref')), this);
    if (level != null) {
      return [sub.compile(o, level), ref.value];
    }
    if (once) {
      return [sub, (ref.temp = true, ref)];
    } else {
      return [sub, ref, [ref.value]];
    }
  };
  _proto.compileLoopReference = function(o, name){
    var tmp, src, _ref;
    src = tmp = this.compile(o, LEVEL_LIST);
    if (!((-1 / 0 < (_ref = +src) && _ref < 1 / 0) || IDENTIFIER.test(src) && o.scope.check(src))) {
      src = "" + (tmp = o.scope.temporary(name)) + " = " + src;
    }
    return [src, tmp];
  };
  _proto.eachChild = function(fn){
    var name, child, node, v, _i, _ref, _len, _j, _len2;
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
  };
  _proto.traverseChildren = function(fn, xscope){
    return this.eachChild(function(it){
      var v;
      if ((v = fn(it)) != null) {
        return v;
      } else {
        return it.traverseChildren(fn, xscope);
      }
    });
  };
  _proto.contains = function(pred){
    return !!this.traverseChildren(function(it){
      return pred(it) || null;
    });
  };
  _proto.anaphorize = function(){
    this.children = [this.aTarget];
    if (this.eachChild(hasThat)) {
      this[this.aSource] = Assign(Literal('that'), this[this.aSource]);
    }
    delete this.children;
  };
  function hasThat(it){
    var that;
    return it.value === 'that' || ((that = it.aSource)
      ? (that = it[that]) ? hasThat(that) : void 8
      : it.eachChild(hasThat));
  }
  _proto.children = [];
  _proto.terminator = ';';
  _proto.isComplex = YES;
  _proto.isStatement = NO;
  _proto.isAssignable = NO;
  _proto.jumps = NO;
  _proto.assigns = NO;
  _proto.unfoldSoak = NO;
  _proto.unfoldAssign = NO;
  _proto.unwrap = THIS;
  _proto.asKey = THIS;
  _proto.invert = function(){
    return Op('!', this);
  };
  _proto.makeReturn = function(name){
    if (name) {
      return Call(Literal(name + '.push'), [this]);
    } else {
      return Return(this);
    }
  };
  _proto.show = String;
  _proto.toString = function(idt){
    var tree, that;
    idt == null && (idt = '');
    tree = '\n' + idt + this.constructor.name;
    if (that = this.show()) {
      tree += ' ' + that;
    }
    this.eachChild(function(it){
      tree += it.toString(idt + TAB);
    });
    return tree;
  };
  return Node;
}());
Negatable = {
  show: function(){
    return this.negated && '!';
  },
  invert: function(){
    this.negated ^= 1;
    return this;
  }
};
exports.Lines = Lines = (function(_super){
  var _proto = __extends(Lines, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Lines(node){
    var _this = new _ctor;
    if (node instanceof Lines) {
      return node;
    }
    _this.lines = node
      ? [node]
      : [];
    return _this;
  } Lines.name = 'Lines';
  _proto.children = ['lines'];
  _proto.add = function(it){
    this.lines.push(it);
    return this;
  };
  _proto.unwrap = function(){
    if (this.lines.length === 1) {
      return this.lines[0];
    } else {
      return this;
    }
  };
  _proto.isComplex = function(){
    var _ref;
    return this.lines.length > 1 || !!((_ref = this.lines[0]) != null ? _ref.isComplex() : void 8);
  };
  _proto.isStatement = function(o){
    var node, _i, _ref, _len;
    if (o && !o.level) {
      return true;
    }
    for (_i = 0, _len = (_ref = this.lines).length; _i < _len; ++_i) {
      node = _ref[_i];
      if (node.isStatement(o)) {
        return true;
      }
    }
  };
  _proto.jumps = function(it){
    var node, _i, _ref, _len;
    for (_i = 0, _len = (_ref = this.lines).length; _i < _len; ++_i) {
      node = _ref[_i];
      if (node.jumps(it)) {
        return true;
      }
    }
  };
  _proto.makeReturn = function(it){
    var node, i, _ref;
    _ref = lastNonComment(this.lines), node = _ref[0], i = _ref[1];
    if (node) {
      this.lines[i] = node = node.makeReturn(it);
      if (node instanceof Return && !node.it) {
        this.lines.splice(i, 1);
      }
    }
    return this;
  };
  _proto.compileNode = function(o){
    var top, codes, node, code, _i, _ref, _len;
    o.lines = this;
    top = !o.level;
    codes = [];
    for (_i = 0, _len = (_ref = this.lines).length; _i < _len; ++_i) {
      node = _ref[_i];
      node = node.unfoldSoak(o) || node;
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
  _proto.compileRoot = function(o){
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
  _proto.compileWithDeclarations = function(o){
    var post, code, i, node, rest, that, _ref, _len;
    o.level = LEVEL_TOP;
    code = post = '';
    for (i = 0, _len = (_ref = this.lines).length; i < _len; ++i) {
      node = _ref[i];
      if (!(node instanceof Comment || node instanceof Literal && !node.value.js)) {
        break;
      }
    }
    if (i) {
      rest = this.lines.splice(i, 9e9);
      code = this.compileNode(o);
      this.lines = rest;
    }
    post = this.lines.length ? this.compileNode(o) : '';
    if (post) {
      code && (code += '\n');
    }
    if (that = (_ref = this.scope) != null ? _ref.vars(o) : void 8) {
      code += o.indent + that + ';\n';
    }
    return code + post;
  };
  return Lines;
}(Node));
exports.Literal = Literal = (function(_super){
  var _proto = __extends(Literal, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Literal(value, reserved){
    var _this = new _ctor;
    _this.value = value;
    if (reserved) {
      _this.isAssignable = NO;
    }
    return _this;
  } Literal.name = 'Literal';
  _proto.show = function(){
    return '"' + this.value + '"';
  };
  _proto.isComplex = NO;
  _proto.isAssignable = function(){
    return IDENTIFIER.test(this.value);
  };
  _proto.assigns = function(it){
    return it === this.value;
  };
  _proto.asKey = function(){
    if (IDENTIFIER.test(this.value)) {
      return Key(this.value);
    } else {
      return this;
    }
  };
  _proto.compile = function(o, level){
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
    if (val.js) {
      this.terminator = '';
    } else if (this.temp) {
      o.scope.free(val);
    }
    return val;
  };
  return Literal;
}(Node));
exports.Key = Key = (function(_super){
  var _proto = __extends(Key, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Key(name){
    var _this = new _ctor;
    _this.name = name;
    return _this;
  } Key.name = 'Key';
  _proto.show = function(){
    return this.name;
  };
  _proto.isComplex = NO;
  _proto.compile = function(){
    if (this.name.reserved) {
      return "'" + this.name + "'";
    } else {
      return this.name;
    }
  };
  return Key;
}(Node));
exports.Index = Index = (function(_super){
  var _proto = __extends(Index, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Index(key, symbol){
    var _this = new _ctor;
    _this.key = key;
    _this.symbol = symbol;
    switch (key.length) {
    case 0:
      _this.key = Key('__proto__');
      break;
    case 1:
      _this.key = key[0];
    }
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
  } Index.name = 'Index';
  _proto.children = ['key'];
  _proto.show = function(){
    return this.symbol;
  };
  _proto.compile = function(o){
    var code;
    code = this.key.compile(o, LEVEL_PAREN);
    if (this.key instanceof Key && code.charAt(0) !== '\'') {
      return "." + code;
    } else {
      return "[" + code + "]";
    }
  };
  _proto.isComplex = function(){
    return this.key.isComplex();
  };
  return Index;
}(Node));
exports.Value = Value = (function(_super){
  var SIMPLENUM, _proto = __extends(Value, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Value(head, tails, at){
    var _this = new _ctor;
    if (!tails && head instanceof Value) {
      return head;
    }
    _this.head = head;
    _this.tails = tails || [];
    _this.at = at;
    return _this;
  } Value.name = 'Value';
  _proto.children = ['head', 'tails'];
  _proto.add = function(it){
    this.tails.push(it);
    return this;
  };
  _proto.jumps = function(it){
    return !this.tails.length && this.head.jumps(it);
  };
  _proto.assigns = function(it){
    return !this.tails.length && this.head.assigns(it);
  };
  _proto.isStatement = function(it){
    return !this.tails.length && this.head.isStatement(it);
  };
  _proto.isComplex = function(){
    return !!this.tails.length || this.head.isComplex();
  };
  _proto.isAssignable = function(){
    return !!this.tails.length || this.head.isAssignable();
  };
  _proto.makeReturn = function(it){
    if (this.tails.length) {
      return Value.superclass.prototype.makeReturn.apply(this, arguments);
    } else {
      return this.head.makeReturn(it);
    }
  };
  _proto.unwrap = function(){
    if (this.tails.length) {
      return this;
    } else {
      return this.head;
    }
  };
  _proto.cacheReference = function(o){
    var name, base, ref, bref, nref, _ref;
    name = (_ref = this.tails)[_ref.length - 1];
    if (this.tails.length < 2 && !this.head.isComplex() && !(name != null ? name.isComplex() : void 8)) {
      return [this, this];
    }
    base = Value(this.head, this.tails.slice(0, -1));
    if (base.isComplex()) {
      ref = o.scope.temporary('base');
      base = Value(Parens(Assign(Literal(ref), base)));
      bref = (_ref = Literal(ref), _ref.temp = true, _ref);
    }
    if (!name) {
      return [base, bref];
    }
    if (name.isComplex()) {
      ref = o.scope.temporary('name');
      name = Index(Assign(Literal(ref), name.key));
      nref = Index((_ref = Literal(ref), _ref.temp = true, _ref));
    }
    return [base.add(name), Value(bref || base.head, [nref || name])];
  };
  SIMPLENUM = /^\d+$/;
  _proto.compileNode = function(o){
    var that, base, rest, t, _ref, _i, _len;
    _ref = this.head;
    _ref.front = this.front;
    _ref.newed = this.newed;
    if (!this.tails.length) {
      return this.head.compile(o);
    }
    if (that = this.unfoldAssign(o) || this.unfoldBind(o) || this.poleStar(o) || this.multiPick(o)) {
      return that.compile(o);
    }
    base = this.head.compile(o, LEVEL_ACCESS);
    rest = '';
    for (_i = 0, _len = (_ref = this.tails).length; _i < _len; ++_i) {
      t = _ref[_i];
      rest += t.compile(o);
    }
    if (rest.charAt(0) === '.' && SIMPLENUM.test(base)) {
      base += ' ';
    }
    return base + rest;
  };
  _proto.unfoldSoak = function(o){
    var that, i, tail, fst, snd, ref, _ref, _len, _ref2;
    if (that = this.head.unfoldSoak(o)) {
      (_ref = that.then.tails).push.apply(_ref, this.tails);
      return that;
    }
    for (i = 0, _len = (_ref = this.tails).length; i < _len; ++i) {
      tail = _ref[i];
      if (tail.soak) {
        tail.soak = false;
        fst = Value(this.head, this.tails.slice(0, i));
        snd = Value(this.head, this.tails.slice(i));
        if (fst.isComplex()) {
          ref = o.scope.temporary('ref');
          fst = Parens(Assign(Literal(ref), fst));
          snd.head = (_ref2 = Literal(ref), _ref2.temp = true, _ref2);
        }
        return If(Existence(fst), snd, {
          soak: true
        });
      }
    }
  };
  _proto.unfoldAssign = function(o){
    var that, i, tail, lhs, rhs, _ref, _len, _ref2;
    if (that = this.head.unfoldAssign(o)) {
      (_ref = that.right.tails).push.apply(_ref, this.tails);
      return that;
    }
    for (i = 0, _len = (_ref = this.tails).length; i < _len; ++i) {
      tail = _ref[i];
      if (tail.assign) {
        tail.assign = false;
        _ref2 = Value(this.head, this.tails.slice(0, i)).cacheReference(o), lhs = _ref2[0], rhs = _ref2[1];
        return _ref2 = Assign(lhs, Value(rhs, this.tails.slice(i))), _ref2.access = true, _ref2;
      }
    }
  };
  _proto.unfoldBind = function(o){
    var i, index, args, call, _ref, _len;
    for (i = 0, _len = (_ref = this.tails).length; i < _len; ++i) {
      index = _ref[i];
      if (index.bind) {
        index.bind = false;
        args = Value(this.head, this.tails.slice(0, i)).cache(o, true);
        args[1] = Value(args[1], [index]);
        call = Call(Util('bind'), args);
        if (this.newed) {
          call = Parens(call, true);
        }
        return Value(call, this.tails.slice(i + 1));
      }
    }
  };
  _proto.poleStar = function(o){
    var i, index, stars, sub, ref, star, _ref, _len, _ref2, _i, _len2;
    function seek(it){
      if (it.value === '*') {
        stars.push(it);
      } else if (!(it instanceof Index)) {
        it.eachChild(seek);
      }
    }
    for (i = 0, _len = (_ref = this.tails).length; i < _len; ++i) {
      index = _ref[i];
      if (index.stars || index.key instanceof Key) {
        continue;
      }
      stars = index.stars = [];
      index.eachChild(seek);
      if (!stars.length) {
        continue;
      }
      _ref2 = Value(this.head, this.tails.slice(0, i)).cache(o), sub = _ref2[0], ref = _ref2[1], this.temps = _ref2[2];
      if (SIMPLENUM.test(ref = ref.compile(o))) {
        ref += ' ';
      }
      for (_i = 0, _len2 = stars.length; _i < _len2; ++_i) {
        star = stars[_i];
        star.value = ref + '.length';
      }
      return Value(sub, this.tails.slice(i));
    }
  };
  _proto.multiPick = function(o){
    var i, key, sub, ref, j, node, arr, _ref, _len, _ref2;
    for (i = 0, _len = (_ref = this.tails).length; i < _len; ++i) {
      key = _ref[i].key;
      if (key.length) {
        _ref2 = Value(this.head, this.tails.slice(0, i)).cache(o), sub = _ref2[0], ref = _ref2[1], this.temps = _ref2[2];
        arr = (function(){
          var _ref, _len, _results = [];
          for (j = 0, _len = (_ref = key).length; j < _len; ++j) {
            node = _ref[j];
            _results.push(Value(j ? ref : sub, [Index(node)]));
          }
          return _results;
        }());
        return Value(Arr(arr), this.tails.slice(i + 1));
      }
    }
  };
  return Value;
}(Node));
exports.Call = Call = (function(_super){
  var _proto = __extends(Call, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Call(callee, args, sym){
    var _this = new _ctor;
    _this.callee = callee;
    _this.args = args;
    _this.args || (_this.args = (_this.splat = true, [Literal('this'), Literal('arguments')]));
    if (sym === '?(') {
      _this.soak = true;
    }
    return _this;
  } Call.name = 'Call';
  _proto.children = ['callee', 'args'];
  _proto.show = function(){
    return (this['new'] || '') + (this.soak ? '?' : '');
  };
  _proto.digCalls = function(){
    var call, list;
    list = [call = this];
    while ((call = call.callee.head) instanceof Call) {
      list.push(call);
    }
    return list.reverse();
  };
  _proto.unfoldSoak = function(o){
    var that, left, rite, call, ifn, _ref, _i, _len;
    if (this.soak) {
      if (that = If.unfoldSoak(o, this, 'callee')) {
        return that;
      }
      _ref = this.callee.cacheReference(o), left = _ref[0], rite = _ref[1];
      rite = Call(rite, this.args);
      rite['new'] = this['new'];
      left = Literal("typeof " + left.compile(o) + " == 'function'");
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
  _proto.unfoldAssign = function(o){
    var call, asn, _i, _ref, _len;
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
  _proto.compileNode = function(o){
    var that, callee, fun, arg, code;
    if (that = this.unfoldAssign(o)) {
      return that.compile(o);
    }
    callee = this.callee;
    if (!(fun = (callee.head || callee) instanceof Fun)) {
      callee.front = this.front;
    }
    if (this.splat) {
      if (this['new']) {
        return this.compileSplat(o, this.args[1].value);
      }
      return callee.compile(o, LEVEL_ACCESS) + (".apply(" + this.args[0].compile(o) + ", " + this.args[1].value + ")");
    }
    if (that = Splat.compileArray(o, this.args, true)) {
      return this.compileSplat(o, that);
    }
    if (this['new']) {
      callee.newed = true;
    }
    code = (this['new'] || '') + callee.compile(o, LEVEL_ACCESS) + ("(" + (function(){
      var _i, _ref, _len, _results = [];
      for (_i = 0, _len = (_ref = this.args).length; _i < _len; ++_i) {
        arg = _ref[_i];
        _results.push(arg.compile(o, LEVEL_LIST));
      }
      return _results;
    }.call(this)).join(', ') + ")");
    if (fun && !this['new']) {
      return "(" + code + ")";
    } else {
      return code;
    }
  };
  _proto.compileSplat = function(o, args){
    var idt, base, name, ref, fun;
    if (this['new']) {
      idt = this.tab + TAB;
      return "(function(func, args, ctor){\n" + idt + "ctor.prototype = func.prototype;\n" + idt + "var child = new ctor, result = func.apply(child, args);\n" + idt + "return result === Object(result) ? result : child;\n" + this.tab + "}(" + this.callee.compile(o, LEVEL_LIST) + ", " + args + ", function(){}))";
    }
    base = this.callee;
    if ((name = base.tails.pop()) && base.isComplex()) {
      base.front = false;
      ref = o.scope.temporary('ref');
      fun = "(" + ref + " = " + base.compile(o, LEVEL_LIST) + ")" + name.compile(o);
      o.scope.free(ref);
    } else {
      if (name) {
        ref = base.compile(o);
        base.add(name);
      }
      fun = base.compile(o);
    }
    return "" + fun + ".apply(" + (ref || null) + ", " + args + ")";
  };
  return Call;
}(Node));
exports.Clone = Clone = (function(_super){
  var _proto = __extends(Clone, _super).prototype;
  function Clone(base, mixin){
    this.base = base;
    this.mixin = mixin;
  } Clone.name = 'Clone';
  _proto.children = ['base', 'mixin'];
  _proto.unfoldSoak = function(it){
    return If.unfoldSoak(it, this, 'base');
  };
  _proto.compileNode = function(o){
    var call;
    call = Call(Value(Util('clone')), [this.base]);
    if (this.newed) {
      call = Parens(call, true);
    }
    return Import(call, this.mixin).compileNode(o);
  };
  return Clone;
}(Node));
exports.Obj = Obj = (function(_super){
  var _proto = __extends(Obj, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Obj(items){
    var _this = new _ctor;
    _this.items = items != null ? items : [];
    return _this;
  } Obj.name = 'Obj';
  _proto.children = ['items'];
  _proto.assigns = function(it){
    var node, _i, _ref, _len;
    for (_i = 0, _len = (_ref = this.items).length; _i < _len; ++_i) {
      node = _ref[_i];
      if (node.assigns(it)) {
        return true;
      }
    }
  };
  _proto.compileNode = function(o){
    var items, i, node, rest, code, idt, last, dic, key, _len, _i;
    items = this.items;
    if (!items.length) {
      return (this.front ? '({})' : '{}');
    }
    for (i = 0, _len = items.length; i < _len; ++i) {
      node = items[i];
      if (node instanceof Splat || (node.left || node) instanceof Parens) {
        rest = items.splice(i, 9e9);
        break;
      }
    }
    code = '';
    idt = o.indent += TAB;
    last = lastNonComment(items)[0];
    dic = {};
    for (_i = 0, _len = items.length; _i < _len; ++_i) {
      node = items[_i];
      if (node instanceof Comment) {
        code += idt + node.compile(o) + '\n';
        continue;
      }
      code += idt + (node.at
        ? (key = node.tails[0].key.compile(o)) + ': ' + node.compile(o, LEVEL_LIST)
        : node instanceof Assign
          ? (key = node.assertObj().left.compile(o), node.compile(o))
          : (key = node.compile(o, LEVEL_LIST)) + ': ' + key);
      if (dic[key + 0]) {
        throw SyntaxError('duplicated property name: ' + key);
      }
      dic[key + 0] = 1;
      code += node === last ? '\n' : ',\n';
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
  _proto.compileDynamic = function(o, code, props){
    var oref;
    o.indent = this.tab;
    code = (oref = o.scope.temporary('obj')) + ' = ' + code + ', ' + Import(Literal(oref), Obj(props)).compile(o, LEVEL_PAREN);
    o.scope.free(oref);
    if (o.level < LEVEL_LIST) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  return Obj;
}(Node));
exports.Arr = Arr = (function(_super){
  var _proto = __extends(Arr, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Arr(items){
    var _this = new _ctor;
    _this.items = items != null ? items : [];
    return _this;
  } Arr.name = 'Arr';
  _proto.compileNode = function(o){
    var items, code, obj;
    items = this.items;
    if (!items.length) {
      return '[]';
    }
    if (code = Splat.compileArray(o, this.items)) {
      return this.newed ? "(" + code + ")" : code;
    }
    o.indent += TAB;
    code = (function(){
      var _i, _ref, _len, _results = [];
      for (_i = 0, _len = (_ref = items).length; _i < _len; ++_i) {
        obj = _ref[_i];
        _results.push(obj.compile(o, LEVEL_LIST));
      }
      return _results;
    }()).join(', ');
    if (0 < code.indexOf('\n')) {
      return "[\n" + o.indent + code + "\n" + this.tab + "]";
    } else {
      return "[" + code + "]";
    }
  };
  return Arr;
}(Obj));
exports.Op = Op = (function(_super){
  var EQUALITY, COMPARER, _proto = __extends(Op, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Op(op, first, second, post){
    var args, params, i, p, call, _len, _this = new _ctor;
    if (op === 'of') {
      return new Of(first, second);
    }
    if (op === 'do') {
      args = [];
      if (first instanceof Fun) {
        params = first.params;
        for (i = 0, _len = params.length; i < _len; ++i) {
          p = params[i];
          args.push(p instanceof Assign ? (params[i] = p.left, p.right) : p);
        }
      }
      return Parens(Call(first, args));
    }
    if (op === 'new') {
      if ((call = first.head || first) instanceof Call) {
        call.digCalls()[0]['new'] = 'new ';
        return first;
      }
      first.newed = true;
    }
    _this.op = op;
    _this.first = first;
    _this.second = second;
    _this.post = post;
    return _this;
  } Op.name = 'Op';
  _proto.children = ['first', 'second'];
  _proto.show = function(){
    return this.op;
  };
  EQUALITY = /^[!=]==?$/;
  COMPARER = /^(?:[!=]=|[<>])=?$/;
  _proto.invert = function(){
    var op, _ref;
    if (EQUALITY.test(op = this.op) && !COMPARER.test(this.first.op)) {
      this.op = '!='.charAt(op.indexOf('=')) + op.slice(1);
      return this;
    }
    if (this.second) {
      return Op('!', Parens(this));
    }
    if (op === '!' && ((_ref = this.first.op) === '!' || _ref === 'in' || _ref === 'instanceof' || _ref === '<' || _ref === '>' || _ref === '<=' || _ref === '>=')) {
      return this.first;
    }
    return Op('!', this);
  };
  _proto.unfoldSoak = function(o){
    var _ref;
    return ((_ref = this.op) === '++' || _ref === '--' || _ref === 'delete') && If.unfoldSoak(o, this, 'first');
  };
  _proto.compileNode = function(o){
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
    if (this.op === 'instanceof' && this.second instanceof Arr) {
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
  _proto.compileChain = function(o){
    var sub, ref, code, _ref;
    _ref = this.first.second.cache(o, true), sub = _ref[0], ref = _ref[1];
    this.first.second = sub;
    code = this.first.compile(o, LEVEL_OP);
    if (code.charAt(0) === '(') {
      code = code.slice(1, -1);
    }
    code += " && " + ref.compile(o) + " " + this.op + " " + this.second.compile(o, LEVEL_OP);
    if (o.level < LEVEL_OP) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  _proto.compileExistence = function(o){
    var firsts;
    firsts = this.first.cache(o, true);
    return Existence(firsts[0]).compile(o, LEVEL_COND) + ' ? ' + firsts[1].compile(o, LEVEL_LIST) + ' : ' + this.second.compile(o, LEVEL_LIST);
  };
  _proto.compileUnary = function(o){
    var op, code;
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
  _proto.compileMultiIO = function(o){
    var sub, ref, i, item, tests, code, _ref;
    _ref = this.first.cache(o, false, LEVEL_OP), sub = _ref[0], ref = _ref[1];
    tests = (function(){
      var _ref, _len, _results = [];
      for (i = 0, _len = (_ref = this.second.items).length; i < _len; ++i) {
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
  _proto.compileDelete = function(o){
    var ref, code, get, del, _ref;
    code = ref = o.scope.temporary('ref');
    _ref = Value(this.first).cacheReference(o), get = _ref[0], del = _ref[1];
    code += ' = ' + get.compile(o, LEVEL_LIST) + ', delete ' + del.compile(o, LEVEL_LIST) + ', ' + ref;
    if (o.level < LEVEL_LIST) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  return Op;
}(Node));
exports.Assign = Assign = (function(_super){
  var METHOD_DEF, _proto = __extends(Assign, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Assign(left, right, op, logic){
    var _this = new _ctor;
    _this.left = left;
    _this.right = right;
    _this.op = op != null ? op : '=';
    _this.logic = logic != null ? logic : _this.op.logic;
    _this.op += '';
    return _this;
  } Assign.name = 'Assign';
  _proto.children = ['left', 'right'];
  _proto.show = function(){
    return (this.logic || '') + this.op;
  };
  _proto.assigns = function(it){
    return this[this.op === ':' ? 'right' : 'left'].assigns(it);
  };
  _proto.unfoldSoak = function(o){
    return If.unfoldSoak(o, this, 'left');
  };
  _proto.unfoldAssign = function(){
    return this.access && this;
  };
  _proto.assertObj = function(){
    if (this.op !== ':') {
      throw SyntaxError('invalid assignment in an object: ' + this.show());
    }
    return this;
  };
  METHOD_DEF = /^(?:([\s\S]+)\.prototype(?=\.)|[\s\S]*?)(?:(?:\.|^)([$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*)|\[(([\"\']).+?\4|\d+)])$/;
  _proto.compileNode = function(o){
    var left, right, name, that, val, code;
    left = this.transleft(o);
    if (left.items) {
      if (!this.logic) {
        return this.compileDestructuring(o, left);
      }
      throw SyntaxError("\"" + this.show() + "\" cannot destructure");
    }
    if (this.logic) {
      return this.compileConditional(o, left);
    }
    right = this.right;
    if (left instanceof Assign) {
      right = Op(left.logic || '?', right, left.right);
      left = left.left;
    }
    name = left.compile(o, LEVEL_LIST);
    if (that = (right instanceof Fun || right instanceof Class) && METHOD_DEF.exec(name)) {
      right.name || (right.name = that[2] || that[3]);
      if (that = that[1]) {
        right.clas = that;
      }
    }
    val = right.compile(o, LEVEL_LIST);
    if (this.op === ':') {
      if (left.isComplex()) {
        throw SyntaxError('invalid property name: ' + name);
      }
      return name + ': ' + val;
    }
    if (!left.isAssignable()) {
      o.indent = '';
      o.level = LEVEL_LIST;
      throw SyntaxError(this.left.compile(o) + ' // cannot be assigned');
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
  _proto.compileConditional = function(o, left){
    var lef, ref, _ref;
    _ref = Value(left).cacheReference(o), lef = _ref[0], ref = _ref[1];
    return Op(this.logic, lef, Assign(ref, this.right, this.op)).compile(o);
  };
  _proto.compileDestructuring = function(o, left){
    var items, len, rite, rref, cache, list, code;
    items = left.items;
    if (!(len = items.length)) {
      return this.right.compile(o, LEVEL_ACCESS);
    }
    rite = this.right.compile(o, len === 1 ? LEVEL_ACCESS : LEVEL_LIST);
    if ((len > 1 || o.level) && (!IDENTIFIER.test(rite) || left.assigns(rite))) {
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
    if (o.level || !list.length) {
      list.push(rite);
    }
    code = list.join(', ');
    if (list.length < 2 || o.level < LEVEL_LIST) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  _proto.destructArr = function(o, nodes, rite){
    var i, node, len, val, ivar, start, inc, lr, _len, _results = [];
    for (i = 0, _len = nodes.length; i < _len; ++i) {
      node = nodes[i];
      if (node.items && !node.items.length) {
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
  _proto.destructObj = function(o, nodes, rite){
    var node, splat, asn, key, lr, val, _i, _len, _ref, _results = [];
    for (_i = 0, _len = nodes.length; _i < _len; ++_i) {
      node = nodes[_i];
      if (splat = node instanceof Splat) {
        node = node.it;
      }
      if (asn = node instanceof Assign && node.op !== ':') {
        node = (asn = node).left;
      }
      if (node instanceof Parens) {
        _ref = Value(node.it).cacheReference(o), node = _ref[0], key = _ref[1];
      } else if (node instanceof Assign) {
        key = node.left;
        node = node.right;
      } else {
        key = node.at ? node.tails[0].key : node;
      }
      if (node instanceof Key) {
        node = Literal(node.name);
      }
      if (asn) {
        node = (asn.left = node, asn);
      }
      val = Value(lr || (lr = Literal(rite)), [Index(key.asKey())]);
      if (splat) {
        val = Import(Obj(), val);
      }
      _results.push(Assign(node, val, this.op).compile(o, LEVEL_TOP));
    }
    return _results;
  };
  _proto.transleft = function(o){
    var left, base, items, sub, ref, i, node, asn, key, val, k, _ref, _len, _ref2;
    left = this.left;
    if (left.mixin) {
      base = left.base, items = left.mixin.items;
      if (items.length > 1) {
        _ref = base.cache(o), sub = _ref[0], ref = _ref[1], this.temps = _ref[2];
      } else {
        sub = ref = base;
      }
      for (i = 0, _len = items.length; i < _len; ++i) {
        node = items[i];
        base = i ? sub : ref;
        if ((asn = node instanceof Assign) && node.op === ':') {
          node.right = Value(base, [Index(node.right.asKey())]);
        } else {
          if (asn) {
            node = (asn = node).left;
          }
          if (node instanceof Parens) {
            _ref = node.cache(o, true), node = _ref[0], key = _ref[1];
            key = Parens(key);
          } else {
            key = node;
          }
          val = Value(base, [Index(node.asKey())]);
          items[i] = Assign(key, (asn ? (asn.left = val, asn) : val), ':');
        }
      }
      left = left.mixin;
    } else if (left instanceof Value && ((_ref = (_ref2 = left.tails)[_ref2.length - 1]) != null ? _ref.key.length : void 8)) {
      key = left.tails.pop().key;
      _ref = left.cache(o), sub = _ref[0], ref = _ref[1], this.temps = _ref[2];
      left = Arr((function(){
        var _ref, _len, _results = [];
        for (i = 0, _len = (_ref = key).length; i < _len; ++i) {
          k = _ref[i];
          _results.push(Value(i ? ref : sub, [Index(k)]));
        }
        return _results;
      }()));
    }
    return left;
  };
  return Assign;
}(Node));
exports.Import = Import = (function(_super){
  var _proto = __extends(Import, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Import(left, right, all){
    var _this = new _ctor;
    _this.left = left;
    _this.right = right;
    _this.util = all ? 'importAll' : 'import';
    return _this;
  } Import.name = 'Import';
  _proto.children = ['left', 'right'];
  _proto.show = function(){
    return this.util.slice(6);
  };
  _proto.compileNode = function(o){
    var items, top, lref, sub, delim, space, code, node, com, dyna, key, val, asn, _ref, _i, _len;
    if (!(this.util === 'import' && this.right instanceof Obj)) {
      return Call(Value(Util(this.util)), [this.left, this.right]).compile(o);
    }
    items = this.right.items;
    if (!items.length) {
      return this.left.compile(o);
    }
    top = !o.level;
    if (top && items.length < 2) {
      sub = lref = this.left;
    } else {
      _ref = this.left.cache(o), sub = _ref[0], lref = _ref[1], this.temps = _ref[2];
    }
    _ref = top
      ? [';', '\n' + this.tab]
      : [',', ' '], delim = _ref[0], space = _ref[1];
    delim += space;
    code = '';
    for (_i = 0, _len = items.length; _i < _len; ++_i) {
      node = items[_i];
      code += com ? space : delim;
      if (com = node instanceof Comment) {
        code += node.compile(o);
        continue;
      }
      if (node instanceof Splat) {
        code += Import(lref, node.it).compile(o, LEVEL_TOP);
        continue;
      }
      if (dyna = node instanceof Parens) {
        _ref = node.it.cache(o, true), key = _ref[0], val = _ref[1];
      } else if (node instanceof Assign) {
        _ref = node.assertObj(), key = _ref.left, val = _ref.right;
      } else if ((key = val = node).at) {
        key = val.tails[0].key;
      }
      asn = Assign(Value(lref, [Index(dyna ? key : key.asKey())]), val);
      code += asn.compile(o, LEVEL_PAREN);
    }
    if (sub === lref) {
      code = code.slice(delim.length);
    } else {
      code = sub.compile(o, LEVEL_PAREN) + code;
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
}(Node));
exports.Of = Of = (function(_super){
  var _proto = __extends(Of, _super).prototype;
  function Of(item, array){
    this.item = item;
    this.array = array;
  } Of.name = 'Of';
  _proto.children = ['item', 'array'];
  __importAll(Of.prototype, Negatable);
  _proto.compileNode = function(o){
    var arr, lvl, sub, ref, cmp, cnj, i, item, tests, code, _ref;
    lvl = (arr = this.array instanceof Arr) ? LEVEL_OP : LEVEL_LIST;
    _ref = this.item.cache(o, false, lvl), sub = _ref[0], ref = _ref[1];
    if (arr) {
      _ref = this.negated
        ? [' !== ', ' && ']
        : [' === ', ' || '], cmp = _ref[0], cnj = _ref[1];
      tests = (function(){
        var _ref, _len, _results = [];
        for (i = 0, _len = (_ref = this.array.items).length; i < _len; ++i) {
          item = _ref[i];
          _results.push((i ? ref : sub) + cmp + item.compile(o, lvl));
        }
        return _results;
      }.call(this));
      code = tests.join(cnj);
    } else {
      code = utility('indexOf') + (".call(" + this.array.compile(o, lvl) + ", " + ref + ") ") + (this.negated ? '< 0' : '>= 0');
      if (sub === ref) {
        return code;
      }
      code = sub + ', ' + code;
    }
    if (sub !== ref) {
      o.scope.free(ref);
    }
    if (o.level < lvl) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  return Of;
}(Node));
exports.Existence = Existence = (function(_super){
  var _proto = __extends(Existence, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Existence(it){
    var _this = new _ctor;
    _this.it = it;
    return _this;
  } Existence.name = 'Existence';
  _proto.children = ['it'];
  __importAll(Existence.prototype, Negatable);
  _proto.compileNode = function(o){
    var code;
    code = this.it.compile(o, LEVEL_OP);
    if (IDENTIFIER.test(code) && !o.scope.check(code, true)) {
      code = 'typeof ' + code + (this.negated
        ? " == 'undefined' || " + code + " === null"
        : " != 'undefined' && " + code + " !== null");
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
}(Node));
exports.Fun = Fun = (function(_super){
  var _proto = __extends(Fun, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Fun(params, body, arrow){
    var _this = new _ctor;
    _this.params = params != null ? params : [];
    _this.body = body != null ? body : Lines();
    _this.arrow = arrow;
    if (arrow === '=>') {
      _this.bound = '_this';
    }
    return _this;
  } Fun.name = 'Fun';
  _proto.children = ['params', 'body'];
  _proto.show = function(){
    return this.bound;
  };
  _proto.traverseChildren = function(_, xscope){
    if (xscope) {
      return Fun.superclass.prototype.traverseChildren.apply(this, arguments);
    }
  };
  _proto.isStatement = function(){
    return !!this.statement;
  };
  _proto.jumps = NO;
  _proto.makeReturn = function(){
    if (this.statement) {
      return this.returns = true, this;
    } else {
      return Fun.superclass.prototype.makeReturn.apply(this, arguments);
    }
  };
  _proto.compileNode = function(o){
    var pscope, sscope, scope, params, body, name, tab, code, b, args, asns, prm, p, splats, arg, asn, ref, val, exps, wasEmpty, i, a, _ref, _i, _len;
    pscope = o.scope;
    sscope = pscope.shared || pscope;
    scope = o.scope = this.body.scope = new Scope((this.wrapper ? pscope : sscope), this.wrapper && sscope);
    scope.method = this;
    delete o.globals;
    if (this.proto) {
      scope.assign('_proto', this.proto.compile(o) + '.prototype');
    }
    o.indent += TAB;
    params = this.params, body = this.body, name = this.name, tab = this.tab;
    code = 'function';
    if (this.bound === '_this') {
      if (this.ctor) {
        scope.assign('_this', 'new _ctor');
        code += " _ctor(){} _ctor.prototype = _proto;\n" + tab + "function";
        body.add(Return(Literal('_this')));
      } else if (b = (_ref = sscope.method) != null ? _ref.bound : void 8) {
        this.bound = b;
      } else {
        sscope.assign('_this', 'this');
      }
    }
    args = [];
    asns = [];
    for (_i = 0, _len = params.length; _i < _len; ++_i) {
      prm = params[_i];
      if (prm instanceof Splat) {
        splats = Assign(Arr((function(){
          var _i, _ref, _len, _results = [];
          for (_i = 0, _len = (_ref = params).length; _i < _len; ++_i) {
            p = _ref[_i];
            _results.push(paramName(o, p));
          }
          return _results;
        }())), Literal('arguments'));
        break;
      }
    }
    for (_i = 0, _len = params.length; _i < _len; ++_i) {
      prm = params[_i];
      arg = prm;
      if (asn = arg instanceof Assign) {
        arg = arg.left;
        prm.logic || (prm.logic = '?');
      } else if (arg instanceof Splat) {
        arg = arg.it;
      }
      if (arg.isComplex()) {
        val = ref = paramName(o, prm);
        if (asn) {
          val = Op(prm.logic, ref, prm.right);
        }
        asns.push(Assign(arg, val));
        arg = ref;
      } else if (asn) {
        if (prm.logic === '?') {
          prm = Op('&&', Literal(arg.value + ' == null'), (prm.logic = false, prm));
        }
        asns.push(prm);
      }
      if (!splats) {
        args.push(arg);
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
      for (i = 0, _len = args.length; i < _len; ++i) {
        a = args[i];
        scope.add((args[i] = a.compile(o)), 'arg');
      }
    }
    if (!args.length && body.contains(function(it){
      return it.value === 'it';
    })) {
      args[0] = 'it';
    }
    if (!(wasEmpty || this.ctor)) {
      body.makeReturn();
    }
    if (this.statement) {
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
    code += "(" + args.join(', ') + "){";
    if (exps.length) {
      code += "\n" + body.compileWithDeclarations(o) + "\n" + tab;
    }
    code += '}';
    if (this.ctor && name.charAt(0) !== '_') {
      code += " " + name + ".name = '" + name + "';";
    }
    if (this.returns) {
      code += "\n" + tab + "return " + name + ";";
    }
    if (this.statement) {
      return tab + code;
    }
    if (this.front) {
      return "(" + code + ")";
    } else {
      return code;
    }
  };
  function paramName(o, node){
    var that, prm, splat, name;
    if (that = node.param) {
      return that;
    }
    prm = node;
    if (splat = prm instanceof Splat) {
      prm = prm.it;
    } else if (prm instanceof Assign) {
      prm = prm.left;
    }
    if (prm.at) {
      name = prm.tails[0].key.name;
      prm = Literal(name.reserved ? '$' + name : name);
    } else if (prm.isComplex()) {
      prm = Literal(o.scope.temporary('arg'));
    }
    return node.param = splat ? Splat(prm) : prm;
  }
  return Fun;
}(Node));
exports.Class = Class = (function(_super){
  var _proto = __extends(Class, _super).prototype;
  function Class(title, sup, body){
    this.title = title;
    this.sup = sup;
    this.fun = Fun([], body);
  } Class.name = 'Class';
  _proto.children = ['title', 'sup', 'fun'];
  _proto.compileNode = function(o){
    var fun, lines, decl, name, lname, i, node, proto, ctor, args, clas, _ref, _ref2, _len;
    fun = this.fun;
    lines = fun.body.lines;
    if (this.title) {
      decl = this.title instanceof Value
        ? (_ref = (_ref2 = this.title.tails)[_ref2.length - 1].key) != null ? _ref.name : void 8
        : this.title.value;
      if (decl != null ? decl.reserved : void 8) {
        throw SyntaxError("reserved word \"" + decl + "\" cannot be a class name");
      }
    }
    name = decl || this.name;
    if (!(name && IDENTIFIER.test(name))) {
      name = '_Class';
    }
    lname = Literal(fun.bound = name);
    fun.body.traverseChildren(function(it){
      if (it instanceof Fun) {
        it.clas = name;
      }
    });
    for (i = 0, _len = lines.length; i < _len; ++i) {
      node = lines[i];
      if (node instanceof Obj) {
        lines[i] = Import(Literal('_proto'), node);
        proto = lname;
      } else if (node instanceof Fun && !node.statement) {
        if (ctor) {
          throw SyntaxError('more than one constructor in a class');
        }
        if ((ctor = node).bound) {
          proto = lname;
        }
      }
    }
    if (!ctor) {
      lines.unshift(ctor = Fun());
    }
    lines.push(lname);
    ctor.name = name;
    ctor.ctor = true;
    ctor.statement = true;
    ctor.clas = false;
    args = [];
    if (this.sup) {
      args.push(this.sup);
      proto = Util.Extends(lname, (_ref = fun.params)[_ref.length] = Literal('_super'));
    }
    clas = Call((fun.proto = proto, fun), args);
    if (decl && ((_ref = this.title) != null ? _ref.isComplex() : void 8)) {
      clas = Assign(lname, clas);
    }
    if (this.title) {
      clas = Assign(this.title, clas);
    }
    return clas.compile(o);
  };
  return Class;
}(Node));
exports.Super = Super = (function(_super){
  var _proto = __extends(Super, _super).prototype;
  function Super(){} Super.name = 'Super';
  _proto.isAssignable = YES;
  _proto.compile = function(o){
    var method, name, clas;
    method = (o.scope.shared || o.scope).method;
    if (!method) {
      throw SyntaxError('super outside of a function');
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
    if (o.scope.check('_super')) {
      return '_super';
    }
    throw SyntaxError('super in an anonymous function');
  };
  return Super;
}(Node));
exports.Parens = Parens = (function(_super){
  var _proto = __extends(Parens, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Parens(it, keep){
    var _this = new _ctor;
    _this.it = it;
    _this.keep = keep;
    return _this;
  } Parens.name = 'Parens';
  _proto.children = ['it'];
  _proto.isComplex = function(){
    return this.it.isComplex();
  };
  _proto.compileNode = function(o){
    var it;
    it = this.it;
    if (!this.keep && !this.newed && ((it instanceof Value || it instanceof Call || it instanceof Fun || it instanceof Parens) || it instanceof Op && o.level < LEVEL_OP)) {
      return (it.front = this.front, it).compile(o);
    }
    o.level = LEVEL_PAREN;
    if (it.isStatement(o)) {
      return it.compileClosure(o);
    } else {
      return "(" + it.compile(o) + ")";
    }
  };
  return Parens;
}(Node));
exports.Splat = Splat = (function(_super){
  var _proto = __extends(Splat, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Splat(it){
    var _this = new _ctor;
    _this.it = it;
    return _this;
  } Splat.name = 'Splat';
  _proto.isAssignable = YES;
  _proto.assigns = function(it){
    return this.it.assigns(it);
  };
  _proto.compile = function(){
    return this.it.compile(arguments[0], arguments[1]);
  };
  Splat.compileArray = function(o, list, apply){
    var index, node, code, args, i, base, _len;
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
      var _i, _ref, _len, _results = [];
      for (_i = 0, _len = (_ref = list.slice(0, index)).length; _i < _len; ++_i) {
        node = _ref[_i];
        _results.push(node.compile(o, LEVEL_LIST));
      }
      return _results;
    }());
    return "[" + base.join(', ') + "].concat(" + args.join(', ') + ")";
  };
  return Splat;
}(Parens));
exports.Statement = Statement = (function(_super){
  var _proto = __extends(Statement, _super).prototype;
  function Statement(verb){
    this.verb = verb;
  } Statement.name = 'Statement';
  _proto.show = function(){
    return this.verb;
  };
  _proto.isStatement = YES;
  _proto.makeReturn = THIS;
  _proto.jumps = function(it){
    return !(it && (it.loop || it.block && this.verb !== 'continue'));
  };
  _proto.compileNode = function(it){
    return it.indent + this.verb + ';';
  };
  return Statement;
}(Node));
exports.Throw = Throw = (function(_super){
  var _proto = __extends(Throw, _super).prototype;
  function Throw(it){
    this.it = it;
  } Throw.name = 'Throw';
  _proto.children = ['it'];
  _proto.jumps = NO;
  _proto.compileNode = function(o){
    return o.indent + ("throw " + this.it.compile(o, LEVEL_PAREN) + ";");
  };
  return Throw;
}(Statement));
exports.Return = Return = (function(_super){
  var _proto = __extends(Return, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Return(it){
    var _this = new _ctor;
    if (it && it.value !== 'void') {
      _this.it = it;
    }
    return _this;
  } Return.name = 'Return';
  _proto.jumps = YES;
  _proto.compile = function(o){
    var it;
    it = this.it ? ' ' + this.it.compile(o, LEVEL_PAREN) : '';
    return o.indent + ("return" + it + ";");
  };
  return Return;
}(Throw));
exports.While = While = (function(_super){
  var _proto = __extends(While, _super).prototype;
  function While(test, name){
    this.test = test;
    this.negated = name === 'until';
  } While.name = 'While';
  _proto.children = ['test', 'body'];
  _proto.aSource = 'test';
  _proto.aTarget = 'body';
  While.prototype.show = Negatable.show;
  _proto.isStatement = YES;
  _proto.jumps = function(){
    var lines, context, node, _i, _len;
    lines = this.body.lines;
    if (!lines.length) {
      return false;
    }
    context = {
      loop: true
    };
    for (_i = 0, _len = lines.length; _i < _len; ++_i) {
      node = lines[_i];
      if (node.jumps(context)) {
        return true;
      }
    }
  };
  _proto.addBody = function(body){
    var last, i, _ref;
    this.body = body;
    _ref = lastNonComment(body.lines), last = _ref[0], i = _ref[1];
    if (last.verb === 'continue') {
      body.lines.splice(i, 1);
    }
    return this;
  };
  _proto.makeReturn = function(it){
    if (it) {
      this.body.makeReturn(it);
    } else if (!this.jumps()) {
      this.returns = true;
    }
    return this;
  };
  _proto.compileNode = function(o){
    var code;
    code = !this.test ? 'true' : (this.anaphorize(), (this.negated
      ? this.test.invert()
      : this.test).compile(o, LEVEL_PAREN));
    code = this.tab + (code === 'true' ? 'for (;;' : 'while (' + code);
    o.indent += TAB;
    return code + ') {' + this.compileBody(o);
  };
  _proto.compileBody = function(o){
    var lines, end, last, i, res, _ref;
    lines = this.body.lines;
    end = '}';
    if (this.returns) {
      _ref = lastNonComment(lines), last = _ref[0], i = _ref[1];
      if (last && !(last instanceof Throw)) {
        o.scope.assign(res = '_results', '[]');
        lines[i] = last.makeReturn(res);
      }
      end = "}\n" + this.tab + "return " + (res || '[]') + ";";
    }
    if (!lines.length) {
      return end;
    }
    return ("\n" + this.body.compile(o, LEVEL_TOP) + "\n") + this.tab + end;
  };
  return While;
}(Node));
exports.For = For = (function(_super){
  var _proto = __extends(For, _super).prototype;
  function For(){} For.name = 'For';
  _proto.children = ['name', 'source', 'from', 'to', 'step', 'body'];
  _proto.aSource = null;
  _proto.show = function(){
    return this.index;
  };
  _proto.compileNode = function(o){
    var temps, idx, step, pvar, eq, tail, tvar, vars, cond, srcPart, svar, lvar, forPart, ownPart, head, item, that, body, _ref;
    temps = this.temps = [];
    if (idx = this.index) {
      o.scope.declare(idx);
    } else {
      temps.push(idx = o.scope.temporary('i'));
    }
    if (!this.object) {
      _ref = (this.step || Literal(1)).compileLoopReference(o, 'step'), step = _ref[0], pvar = _ref[1];
      if (step !== pvar) {
        temps.push(pvar);
      }
    }
    if (this.from) {
      eq = this.op === 'til' ? '' : '=';
      _ref = this.to.compileLoopReference(o, 'to'), tail = _ref[0], tvar = _ref[1];
      vars = idx + ' = ' + this.from.compile(o);
      if (tail !== tvar) {
        vars += ', ' + tail;
        temps.push(tvar);
      }
      cond = +pvar
        ? "" + idx + " " + (pvar < 0 ? '>' : '<') + eq + " " + tvar
        : "" + pvar + " < 0 ? " + idx + " >" + eq + " " + tvar + " : " + idx + " <" + eq + " " + tvar;
    } else {
      if (this.name || this.object && this.own) {
        _ref = this.source.compileLoopReference(o, 'ref'), srcPart = _ref[0], svar = _ref[1];
        if (srcPart !== svar) {
          temps.push(svar);
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
          temps.push(lvar = o.scope.temporary('len'));
          vars = "" + idx + " = 0, " + lvar + " = " + srcPart + ".length";
          cond = "" + idx + " < " + lvar;
        }
      }
    }
    if (this.object) {
      forPart = idx + ' in ' + srcPart;
      if (this.own) {
        o.scope.assign('_own', '{}.hasOwnProperty');
        ownPart = "if (_own.call(" + svar + ", " + idx + ")) ";
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
      if (that = this.nref) {
        head += that + ' = ' + item + ', ';
        item = that;
      }
      head += Assign(this.name, Literal(item)).compile(o, LEVEL_TOP) + ';';
    }
    body = this.compileBody(o);
    if (this.name && body.charAt(0) === '}') {
      head += '\n' + this.tab;
    }
    return head + body;
  };
  _proto.pluckDirectCalls = function(o){
    var dig, _this = this;
    return this.body.eachChild(dig = function(it){
      var fn, name, ref, _ref;
      if (!(it instanceof Call && ((fn = it.callee.unwrap()) instanceof Fun || fn instanceof Parens && (fn = fn.it) instanceof Fun) && fn.params.length === it.args.length)) {
        return it instanceof Fun || it instanceof For ? null : it.eachChild(dig);
      }
      if (_this.index) {
        fn.params.push((_ref = it.args)[_ref.length] = Literal(_this.index));
      }
      if (name = _this.name) {
        it.args.push(Literal(name.isComplex()
          ? _this.nref || (_this.nref = (_ref = _this.temps)[_ref.length] = o.scope.temporary('ref'))
          : name.value));
        fn.params.push(name);
      }
      it.callee = Value(Literal(ref = o.scope.temporary('fn')));
      o.scope.assign(ref, fn.compile((o.indent = '', o), LEVEL_LIST));
      o.indent = _this.tab;
    });
  };
  return For;
}(While));
exports.Try = Try = (function(_super){
  var _proto = __extends(Try, _super).prototype;
  function Try(attempt, thrown, recovery, ensure){
    this.attempt = attempt;
    this.thrown = thrown;
    this.recovery = recovery;
    this.ensure = ensure;
  } Try.name = 'Try';
  _proto.children = ['attempt', 'recovery', 'ensure'];
  _proto.show = function(){
    return this.thrown;
  };
  _proto.isStatement = YES;
  _proto.jumps = function(it){
    var _ref;
    return this.attempt.jumps(it) || ((_ref = this.recovery) != null ? _ref.jumps(it) : void 8);
  };
  _proto.makeReturn = function(it){
    this.attempt = this.attempt.makeReturn(it);
    if (this.recovery) {
      this.recovery = this.recovery.makeReturn(it);
    }
    return this;
  };
  _proto.compileNode = function(o){
    var code;
    o.indent += TAB;
    code = this.tab + 'try ' + this.compileBlock(o, 'attempt');
    if (this.recovery || !this.ensure) {
      code += (" catch (" + (this.thrown || '_e') + ") ") + this.compileBlock(o, 'recovery');
    }
    if (this.ensure) {
      code += " finally " + this.compileBlock(o, 'ensure');
    }
    return code;
  };
  return Try;
}(Node));
exports.Switch = Switch = (function(_super){
  var _proto = __extends(Switch, _super).prototype;
  function Switch($switch, cases, $default){
    this['switch'] = $switch;
    this.cases = cases;
    this['default'] = $default;
  } Switch.name = 'Switch';
  _proto.children = ['switch', 'cases', 'default'];
  _proto.aSource = 'switch';
  _proto.aTarget = 'cases';
  _proto.isStatement = YES;
  _proto.jumps = function(x){
    var cs, _i, _ref, _len;
    x == null && (x = {
      block: true
    });
    for (_i = 0, _len = (_ref = this.cases).length; _i < _len; ++_i) {
      cs = _ref[_i];
      if (cs.body.jumps(x)) {
        return true;
      }
    }
    return (_ref = this['default']) != null ? _ref.jumps(x) : void 8;
  };
  _proto.makeReturn = function(it){
    var cs, _i, _ref, _len;
    for (_i = 0, _len = (_ref = this.cases).length; _i < _len; ++_i) {
      cs = _ref[_i];
      cs.makeReturn(it);
    }
    if ((_ref = this['default']) != null) {
      _ref.makeReturn(it);
    }
    return this;
  };
  _proto.compileNode = function(o){
    var cond, tab, code, stop, i, cs, that, _ref, _len;
    cond = !!this['switch'] && (this.anaphorize(), this['switch'].compile(o, LEVEL_PAREN));
    tab = this.tab;
    code = tab + ("switch (" + cond + ") {\n");
    stop = this['default'] || this.cases.length - 1;
    for (i = 0, _len = (_ref = this.cases).length; i < _len; ++i) {
      cs = _ref[i];
      code += cs.compileCase(o, tab, i === stop, !cond);
    }
    if (this['default']) {
      o.indent = tab + TAB;
      if (that = this['default'].compile(o, LEVEL_TOP)) {
        code += tab + ("default:\n" + that + "\n");
      }
    }
    return code + tab + '}';
  };
  return Switch;
}(Node));
exports.Case = Case = (function(_super){
  var _proto = __extends(Case, _super).prototype;
  function Case(test, body){
    this.test = test;
    this.body = body;
  } Case.name = 'Case';
  _proto.children = ['test', 'body'];
  _proto.makeReturn = function(it){
    var last;
    last = lastNonComment(this.body.lines)[0];
    if ((last != null ? last.value : void 8) !== 'fallthrough') {
      return this.body.makeReturn(it);
    }
  };
  _proto.compileCase = function(o, tab, nobr, bool){
    var tests, t, i, that, code, exps, last, ft, _i, _len, _ref;
    tests = this.test instanceof Arr
      ? this.test.items
      : [this.test];
    tests.length || tests.push(Literal('void'));
    if (bool) {
      t = tests[0];
      i = 0;
      while (that = tests[++i]) {
        t = Op('||', t, that);
      }
      (this.t = t, this.aSource = 't', this.aTarget = 'body', this).anaphorize();
      tests = [this.t.invert()];
    }
    code = '';
    for (_i = 0, _len = tests.length; _i < _len; ++_i) {
      t = tests[_i];
      code += tab + ("case " + t.compile(o, LEVEL_PAREN) + ":\n");
    }
    _ref = lastNonComment(exps = this.body.lines), last = _ref[0], i = _ref[1];
    if (ft = (last != null ? last.value : void 8) === 'fallthrough') {
      exps[i] = Comment(' fallthrough ');
    }
    o.indent = tab + TAB;
    if (that = this.body.compile(o, LEVEL_TOP)) {
      code += that + '\n';
    }
    if (!(nobr || ft || last instanceof Statement && last.verb !== 'debugger')) {
      code += o.indent + 'break;\n';
    }
    return code;
  };
  return Case;
}(Node));
exports.If = If = (function(_super){
  var _proto = __extends(If, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function If($if, then, _arg){
    var name, _ref, _this = new _ctor;
    _this['if'] = $if;
    _this.then = then;
    _ref = _arg != null ? _arg : {}, _this.soak = _ref.soak, name = _ref.name;
    _this.negated = name === 'unless';
    return _this;
  } If.name = 'If';
  _proto.children = ['if', 'then', 'else'];
  _proto.aSource = 'if';
  _proto.aTarget = 'then';
  If.prototype.show = Negatable.show;
  _proto.addElse = function(it){
    if (this.chain) {
      this['else'].addElse(it);
    } else {
      this.chain = (this['else'] = it) instanceof If;
    }
    return this;
  };
  _proto.isStatement = function(o){
    var _ref;
    return o && !o.level || this.then.isStatement(o) || ((_ref = this['else']) != null ? _ref.isStatement(o) : void 8);
  };
  _proto.jumps = function(it){
    var _ref;
    return this.then.jumps(it) || ((_ref = this['else']) != null ? _ref.jumps(it) : void 8);
  };
  _proto.makeReturn = function(it){
    this.then = this.then.makeReturn(it);
    if (this['else']) {
      this['else'] = this['else'].makeReturn(it);
    }
    return this;
  };
  _proto.compileNode = function(o){
    this.anaphorize();
    if (this.isStatement(o)) {
      return this.compileStatement(o);
    } else {
      return this.compileExpression(o);
    }
  };
  _proto.compileStatement = function(o){
    var code, _ref;
    code = ((_ref = o.elsed, delete o.elsed, _ref) ? '' : this.tab) + 'if (' + (this.negated
      ? this['if'].invert()
      : this['if']).compile(o, LEVEL_PAREN);
    o.indent += TAB;
    this.then = Lines(this.then);
    code += ') ' + this.compileBlock(o, 'then');
    if (!this['else']) {
      return code;
    }
    return code + ' else ' + (this.chain
      ? this['else'].compile((o.indent = this.tab, o.elsed = true, o), LEVEL_TOP)
      : this.compileBlock(o, 'else'));
  };
  _proto.compileExpression = function(o){
    var cond, code, pad, _ref;
    cond = this.negated
      ? this['if'].invert()
      : this['if'];
    code = cond.compile(o, LEVEL_COND);
    pad = ((_ref = this['else']) != null ? _ref.isComplex() : void 8) && this.then.isComplex() ? '\n' + (o.indent += TAB) : ' ';
    code += pad + '? ' + this.then.compile(o, LEVEL_LIST) + pad + ': ' + (((_ref = this['else']) != null ? _ref.compile(o, LEVEL_LIST) : void 8) || 'void 8');
    if (o.level < LEVEL_COND) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  _proto.unfoldSoak = function(){
    return this.soak && this;
  };
  If.unfoldSoak = function(o, parent, name){
    var ifn;
    if (ifn = parent[name].unfoldSoak(o)) {
      parent[name] = ifn.then;
      ifn.then = Value(parent);
    }
    return ifn;
  };
  return If;
}(Node));
exports.Comment = Comment = (function(_super){
  var _proto = __extends(Comment, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Comment(comment){
    var _this = new _ctor;
    _this.comment = comment;
    return _this;
  } Comment.name = 'Comment';
  _proto.terminator = '';
  _proto.compile = function(o){
    return "/*" + tabify(this.comment, o.indent) + "*/";
  };
  return Comment;
}(Node));
exports.Util = Util = (function(_super){
  var _proto = __extends(Util, _super).prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function Util(verb){
    var _this = new _ctor;
    _this.verb = verb;
    return _this;
  } Util.name = 'Util';
  Util.prototype.show = Statement.prototype.show;
  _proto.compile = function(){
    return utility(this.verb);
  };
  Util.Extends = function(){
    return Call(Value(Util('extends')), [arguments[0], arguments[1]]);
  };
  return Util;
}(Node));
__importAll(exports, {
  mix: __importAll
});
_ref = (Scope = function(parent, shared){
  this.parent = parent;
  this.shared = shared;
  this.variables = [
    {
      name: 'arguments',
      type: 'args'
    }
  ];
  this.positions = {
    arguments: 0
  };
  return this;
}).prototype;
_ref.add = function(name, type){
  var that;
  if (name === 'arguments' || name === 'eval') {
    throw SyntaxError("redefining \"" + name + "\" is deprecated");
  }
  if (that = this.variables[this.positions[name]]) {
    that.type = type;
  } else {
    this.positions[name] = -1 + this.variables.push({
      name: name,
      type: type
    });
  }
  return this;
};
_ref.declare = function(name){
  var scope, _ref;
  scope = this.shared || this;
  if ((_ref = scope.type(name)) !== 'var' && _ref !== 'arg') {
    scope.add(name, 'var');
  }
  return this;
};
_ref.assign = function(name, value){
  return this.add(name, {
    value: value
  });
};
_ref.temporary = function(name){
  var i, temp, _ref;
  i = 0;
  for (;;) {
    temp = '_' + (name.length > 1
      ? name + (i++ ? i : '')
      : (i++ + parseInt(name, 36)).toString(36));
    if ((_ref = this.type(temp)) === 'reuse' || _ref === void 8) {
      break;
    }
  }
  this.add(temp, 'var');
  return temp;
};
_ref.free = function(it){
  return this.add(it, 'reuse');
};
_ref.check = function(name, above){
  var found, _ref;
  if ((found = this.positions[name] in this.variables) || !above) {
    return found;
  }
  return !!((_ref = this.parent) != null ? _ref.check(name, above) : void 8);
};
_ref.type = function(it){
  var _ref;
  return (_ref = this.variables[this.positions[it]]) != null ? _ref.type : void 8;
};
_ref.vars = function(o){
  var usr, tmp, asn, name, type, that, _i, _ref, _len, _ref2;
  usr = [];
  tmp = [];
  asn = [];
  for (_i = 0, _len = (_ref = this.variables).length; _i < _len; ++_i) {
    _ref2 = _ref[_i], name = _ref2.name, type = _ref2.type;
    if (type === 'var' || type === 'reuse') {
      (name.charAt(0) === '_' ? tmp : usr).push(name);
    } else if (type.value) {
      asn.push(tabify(name + ' = ' + type.value, o.indent));
    }
  }
  if (o.globals) {
    return asn.join(', ');
  }
  if (that = usr.concat(tmp, asn).join(', ')) {
    return 'var ' + that;
  }
};
function YES(){
  return true;
}
function NO(){
  return false;
}
function THIS(){
  return this;
}
UTILITIES = {
  clone: 'function(it){\n  function fn(){ if (this.__proto__ !== it) this.__proto__ = it }\n  return fn.prototype = it, new fn;\n}',
  'extends': 'function(sub, sup){\n  function ctor(){} ctor.prototype = (sub.superclass = sup).prototype;\n  return (sub.prototype = new ctor).constructor = sub;\n}',
  bind: 'function(me, fn){ return function(){ return fn.apply(me, arguments) } }',
  'import': 'function(obj, src){\n  var own = {}.hasOwnProperty;\n  for (var key in src) if (own.call(src, key)) obj[key] = src[key];\n  return obj;\n}',
  importAll: 'function(obj, src){ for (var key in src) obj[key] = src[key]; return obj }',
  slice: '[].slice',
  indexOf: '[].indexOf || function(x){\n  for (var i = this.length; i-- && this[i] !== x;); return i;\n}'
};
LEVEL_TOP = 0;
LEVEL_PAREN = 1;
LEVEL_LIST = 2;
LEVEL_COND = 3;
LEVEL_OP = 4;
LEVEL_ACCESS = 5;
TAB = '  ';
IDENTIFIER = /^[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*$/;
utility = function(name){
  var ref;
  Scope.root.assign(ref = '__' + name, UTILITIES[name]);
  return ref;
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
tabify = function(code, tab){
  return code.replace(/\n/g, '\n' + tab);
};