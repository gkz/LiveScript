var Node, Negatable, Block, Atom, Literal, Var, Key, Index, Chain, Call, Clone, List, Obj, Prop, Arr, Op, Assign, Import, Of, Existence, Fun, Class, Super, Parens, Splat, Jump, Throw, Return, While, For, Try, Switch, Case, If, Label, JS, Util, UTILITIES, LEVEL_TOP, LEVEL_PAREN, LEVEL_LIST, LEVEL_COND, LEVEL_OP, LEVEL_CALL, PREC, TAB, ID, SIMPLENUM, _ref, __import = function(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}, __clone = function(it){
  function fn(){ if (this.__proto__ !== it) this.__proto__ = it }
  return fn.prototype = it, new fn;
}, __extends = function(sub, sup){
  function ctor(){} ctor.prototype = (sub.superclass = sup).prototype;
  return (sub.prototype = new ctor).constructor = sub;
}, __repeatString = function(str, n){
  for (var r = ''; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;
  return r;
}, __importAll = function(obj, src){ for (var key in src) obj[key] = src[key]; return obj };
(Node = function(){
  throw Error('unimplemented');
}).prototype = {
  compile: function(options, level){
    var o, key, node, code, that, tmp, _i, _len;
    o = {};
    for (key in options) {
      o[key] = options[key];
    }
    if (level != null) {
      o.level = level;
    }
    node = this.unfoldSoak(o) || this;
    if (o.level && node.isStatement()) {
      return node.compileClosure(o);
    }
    code = (node.tab = o.indent, node).compileNode(o);
    if (that = node.temps) {
      for (_i = 0, _len = that.length; _i < _len; ++_i) {
        tmp = that[_i];
        o.scope.free(tmp);
      }
    }
    return code;
  },
  compileClosure: function(o){
    var that, fun, call, hasArgs, hasThis;
    if (that = this.jumps()) {
      that.carp('inconvertible statement');
    }
    fun = Fun([], Block(this));
    call = Call();
    hasThis = hasArgs = false;
    this.traverseChildren(function(it){
      switch (it.value) {
      case 'this':
        hasThis = true;
        break;
      case 'arguments':
        hasArgs = it.value = '_args';
      }
    });
    if (hasThis) {
      call.args.push(Literal('this'));
      call.method = '.call';
    }
    if (hasArgs) {
      call.args.push(Literal('arguments'));
      fun.params.push(Var('_args'));
    }
    return Parens(Chain((fun.wrapper = true, fun), [call]), true).compile(o);
  },
  compileBlock: function(o, node){
    var that;
    if (that = node != null ? node.compile(o, LEVEL_TOP) : void 8) {
      return "{\n" + that + "\n" + this.tab + "}";
    } else {
      return '{}';
    }
  },
  cache: function(o, once, level){
    var ref, sub;
    if (!this.isComplex()) {
      return [ref = level != null ? this.compile(o, level) : this, ref];
    }
    sub = Assign(ref = Var(o.scope.temporary('ref')), this);
    if (level != null) {
      sub = sub.compile(o, level);
      if (once) {
        o.scope.free(ref.value);
      }
      return [sub, ref.value];
    }
    if (once) {
      return [sub, (ref.temp = true, ref)];
    } else {
      return [sub, ref, [ref.value]];
    }
  },
  compileLoopReference: function(o, name, ret){
    var tmp, asn, _ref;
    if (this instanceof Var && o.scope.check(this.value) || this instanceof Literal || this.op === '-' && (-1 / 0 < (_ref = +this.first.value) && _ref < 1 / 0)) {
      return [_ref = this.compile(o), _ref];
    }
    asn = Assign(Var(tmp = o.scope.temporary(name)), this);
    ret || (asn['void'] = true);
    return [tmp, asn.compile(o, ret ? LEVEL_CALL : LEVEL_PAREN)];
  },
  eachChild: function(fn){
    var name, child, node, that, _i, _ref, _len, _j, _len2;
    for (_i = 0, _len = (_ref = this.children).length; _i < _len; ++_i) {
      name = _ref[_i];
      if (child = this[name]) {
        if ('length' in child) {
          for (_j = 0, _len2 = child.length; _j < _len2; ++_j) {
            node = child[_j];
            if ((that = fn(node)) != null) {
              return that;
            }
          }
        } else {
          if ((that = fn(child)) != null) {
            return that;
          }
        }
      }
    }
  },
  traverseChildren: function(fn, xscope){
    return this.eachChild(function(it){
      var that;
      if ((that = fn(it)) != null) {
        return that;
      } else {
        return it.traverseChildren(fn, xscope);
      }
    });
  },
  anaphorize: function(){
    var base, name;
    this.children = [this.aTarget];
    if (this.eachChild(hasThat)) {
      if ((base = this)[name = this.aSource] instanceof Existence) {
        base = base[name];
        name = 'it';
      }
      if (base[name].value !== 'that') {
        base[name] = Assign(Var('that'), base[name]);
      }
    }
    function hasThat(it){
      var that;
      return it.value === 'that' || ((that = it.aSource)
        ? (that = it[that]) ? hasThat(that) : void 8
        : it.eachChild(hasThat));
    }
    delete this.children;
  },
  carp: function(it){
    throw SyntaxError(it + " on line " + (this.line || this.traverseChildren(function(it){
      return it.line;
    })));
  },
  delegate: function(names, fn){
    var name, _i, _len, _fn = function(name){
      this[name] = function(it){
        return fn.call(this, name, it);
      };
    };
    for (_i = 0, _len = names.length; _i < _len; ++_i) {
      name = names[_i];
      (_fn.call(this, name));
    }
  },
  children: [],
  terminator: ';',
  isComplex: YES,
  isStatement: NO,
  isAssignable: NO,
  isCallable: NO,
  isEmpty: NO,
  isArray: NO,
  isString: NO,
  isRegex: NO,
  isMatcher: function(){
    return this.isString() || this.isRegex();
  },
  jumps: NO,
  assigns: NO,
  hasDefault: NO,
  unfoldSoak: NO,
  unfoldAssign: NO,
  unwrap: THIS,
  maybeKey: THIS,
  varName: String,
  selections: NO,
  getCall: NO,
  invert: function(){
    return Op('!', this);
  },
  makeReturn: function(arref){
    if (arref) {
      return Call.make(JS(arref + '.push'), [this]);
    } else {
      return Return(this);
    }
  },
  show: String,
  toString: function(idt){
    var tree, that;
    idt || (idt = '');
    tree = '\n' + idt + this.constructor.displayName;
    if (that = this.show()) {
      tree += ' ' + that;
    }
    this.eachChild(function(it){
      tree += it.toString(idt + TAB);
    });
    return tree;
  },
  stringify: function(space){
    return JSON.stringify(this, null, space);
  },
  toJSON: function(){
    return __import({
      type: this.constructor.displayName
    }, this);
  }
};
exports.parse = function(json){
  return exports.fromJSON(JSON.parse(json));
};
exports.fromJSON = (function(){
  function fromJSON(it){
    var that, node, key, val, v, _i, _len, _results = [];
    if (!(it && typeof it === 'object')) {
      return it;
    }
    if (that = it.type) {
      node = __clone(exports[that].prototype);
      for (key in it) {
        val = it[key];
        node[key] = fromJSON(val);
      }
      return node;
    }
    if (it.length != null) {
      for (_i = 0, _len = it.length; _i < _len; ++_i) {
        v = it[_i];
        _results.push(fromJSON(v));
      }
      return _results;
    } else {
      return it;
    }
  }
  return fromJSON;
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
exports.Block = Block = (function(_super){
  var prototype = __extends(Block, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Block(node){
    var _this = new _ctor;
    if (node instanceof Block) {
      return node;
    }
    _this.lines = [];
    if (node) {
      _this.add(node);
    }
    return _this;
  } Block.displayName = 'Block';
  prototype.children = ['lines'];
  prototype.add = function(it){
    var that, _ref;
    if (that = this.back) {
      that.add(it);
    } else if (that = it.lines) {
      (_ref = this.lines).push.apply(_ref, that);
    } else {
      this.lines.push(it);
      if (that = it.back) {
        this.back = that;
      }
    }
    return this;
  };
  prototype.unwrap = function(){
    if (this.lines.length === 1) {
      return this.lines[0];
    } else {
      return this;
    }
  };
  prototype.isComplex = function(){
    var _ref;
    return this.lines.length > 1 || ((_ref = this.lines[0]) != null ? _ref.isComplex() : void 8);
  };
  prototype.delegate(['isCallable', 'isArray', 'isString', 'isRegex'], function(it){
    var that;
    if (that = lastNonComment(this.lines)[0]) {
      return that[it]();
    }
  });
  prototype.jumps = function(it){
    var node, that, _i, _ref, _len;
    for (_i = 0, _len = (_ref = this.lines).length; _i < _len; ++_i) {
      node = _ref[_i];
      if (that = node.jumps(it)) {
        return that;
      }
    }
  };
  prototype.makeReturn = function(it){
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
  prototype.compile = function(o, level){
    var tab, node, code, codes, __results, _i, _ref, _len;
    level == null && (level = o.level);
    if (!level) {
      o.block = this;
      tab = o.indent;
    }
    __results = [];
    for (_i = 0, _len = (_ref = this.lines).length; _i < _len; ++_i) {
      node = _ref[_i];
      if (level) {
        if (node.comment) {
          continue;
        }
        code = node.compile(o, LEVEL_LIST);
      } else {
        node = node.unfoldSoak(o) || node;
        code = tab + (node.front = true, node).compile(o, level);
        if (!node.isStatement()) {
          code += node.terminator;
        }
      }
      __results.push(code);
    }
    codes = __results;
    if (!level) {
      return codes.join('\n');
    }
    code = codes.join(', ') || 'void 8';
    if (codes.length > 1 && level >= LEVEL_LIST) {
      return "(" + code + ")";
    } else {
      return code;
    }
  };
  prototype.compileRoot = function(options){
    var o, bare, prefix, node, i, code, _ref;
    o = (__import({
      level: LEVEL_TOP,
      scope: this.scope = Scope.root = new Scope
    }, options));
    delete o.filename;
    o.indent = (bare = o.bare, delete o.bare, bare) ? '' : TAB;
    if (/^(?:#!|javascript:)/.test((_ref = this.lines[0]) != null ? _ref.code : void 8)) {
      prefix = this.lines.shift().code;
    }
    if (_ref = o.repl, delete o.repl, _ref) {
      if (bare) {
        _ref = lastNonComment(this.lines), node = _ref[0], i = _ref[1];
        if (node) {
          this.lines[i] = Parens(node);
        }
      } else {
        this.makeReturn();
      }
    }
    code = this.compileWithDeclarations(o);
    bare || (code = "(function(){\n" + code + "\n}).call(this);\n");
    if (prefix) {
      return prefix + '\n' + code;
    } else {
      return code;
    }
  };
  prototype.compileWithDeclarations = function(o){
    var code, i, node, rest, post, that, _ref, _len;
    o.level = LEVEL_TOP;
    code = '';
    for (i = 0, _len = (_ref = this.lines).length; i < _len; ++i) {
      node = _ref[i];
      if (!(node.comment || node instanceof Literal)) {
        break;
      }
    }
    if (i) {
      rest = this.lines.splice(i, 9e9);
      code = this.compile(o);
      this.lines = rest;
    }
    if (post = this.compile(o)) {
      code && (code += '\n');
    }
    if (that = (_ref = this.scope) != null ? _ref.vars(o) : void 8) {
      code += o.indent + that + ';\n';
    }
    return code + post;
  };
  return Block;
}(Node));
Atom = (function(_super){
  var prototype = __extends(Atom, _super).prototype;
  function Atom(){} Atom.displayName = 'Atom';
  prototype.show = function(){
    return this.value;
  };
  prototype.isComplex = NO;
  return Atom;
}(Node));
exports.Literal = Literal = (function(_super){
  var prototype = __extends(Literal, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Literal(value){
    var _this = new _ctor;
    _this.value = value;
    if (value.js) {
      return JS(value + "", true);
    }
    return _this;
  } Literal.displayName = 'Literal';
  prototype.isEmpty = function(){
    switch (this.value) {
    case 'void':
    case 'null':
      return true;
    }
  };
  prototype.isCallable = function(){
    switch (this.value) {
    case 'this':
    case 'eval':
      return true;
    }
  };
  prototype.isString = function(){
    return 0 <= '\'"'.indexOf((this.value + "").charAt());
  };
  prototype.varName = function(){
    if (/^\w+$/.test(this.value)) {
      return '$' + this.value;
    } else {
      return '';
    }
  };
  prototype.compile = function(o, level){
    var val, _ref;
    level == null && (level = o.level);
    switch (val = this.value + "") {
    case 'this':
      return ((_ref = o.scope.fun) != null ? _ref.bound : void 8) || val;
    case 'void':
      val += ' 8';
      // fallthrough
    case 'null':
      if (level === LEVEL_CALL) {
        this.carp('invalid use of ' + this.value);
      }
      break;
    case 'debugger':
      if (level) {
        return "(function(){\n" + (o.indent + TAB) + "debugger;\n" + o.indent + "}())";
      }
      break;
    case '*':
      this.carp('stray star');
    }
    return val;
  };
  return Literal;
}(Atom));
exports.Var = Var = (function(_super){
  var prototype = __extends(Var, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Var(value){
    var _this = new _ctor;
    _this.value = value;
    return _this;
  } Var.displayName = 'Var';
  prototype.isAssignable = YES;
  prototype.isCallable = YES;
  prototype.assigns = function(it){
    return it === this.value;
  };
  prototype.maybeKey = function(){
    var _ref;
    return _ref = Key(this.value), _ref.line = this.line, _ref;
  };
  prototype.varName = prototype.show;
  prototype.compile = function(o){
    if (this.temp) {
      return o.scope.free(this.value);
    } else {
      return this.value;
    }
  };
  return Var;
}(Atom));
exports.Key = Key = (function(_super){
  var prototype = __extends(Key, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Key(name, reserved){
    var _this = new _ctor;
    _this.reserved = reserved || name.reserved;
    _this.name = '' + name;
    return _this;
  } Key.displayName = 'Key';
  prototype.isAssignable = function(){
    return !this.reserved;
  };
  prototype.assigns = function(it){
    return it === this.name;
  };
  prototype.varName = function(){
    var name;
    name = this.name;
    return (this.reserved || (name === 'arguments' || name === 'eval') ? '$' : '') + name;
  };
  prototype.compile = prototype.show = function(){
    if (this.reserved) {
      return "'" + this.name + "'";
    } else {
      return this.name;
    }
  };
  return Key;
}(Atom));
exports.Index = Index = (function(_super){
  var prototype = __extends(Index, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Index(key, symbol){
    var _this = new _ctor;
    _this.key = key;
    symbol || (symbol = '.');
    switch (key.length) {
    case 0:
      _this.key = Key('__proto__');
      break;
    case 1:
      _this.key = key[0];
    }
    if ('?' === symbol.charAt(0)) {
      _this.soak = '?';
      symbol = symbol.slice(1);
    }
    switch (symbol.slice(-1)) {
    case '=':
      _this.assign = symbol.slice(1);
      break;
    case '!':
      _this.vivify = Obj;
      break;
    case '@':
      _this.vivify = Arr;
    }
    _this.symbol = symbol;
    return _this;
  } Index.displayName = 'Index';
  prototype.children = ['key'];
  prototype.show = function(){
    return (this.soak || '') + this.symbol;
  };
  prototype.isComplex = function(){
    return this.key.isComplex();
  };
  prototype.compile = function(o){
    var code;
    code = this.key.compile(o, LEVEL_PAREN);
    if (this.key instanceof Key && '\'' !== code.charAt(0)) {
      return "." + code;
    } else {
      return "[" + code + "]";
    }
  };
  return Index;
}(Node));
exports.Chain = Chain = (function(_super){
  var prototype = __extends(Chain, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Chain(head, tails){
    var _this = new _ctor;
    if (!tails && head instanceof Chain) {
      return head;
    }
    _this.head = head;
    _this.tails = tails || [];
    return _this;
  } Chain.displayName = 'Chain';
  prototype.children = ['head', 'tails'];
  prototype.add = function(it){
    var that;
    this.tails.push(it);
    if (that = it.vivify, delete it.vivify, that) {
      this.head = Assign(Chain(this.head, this.tails), that(), '=', '||');
      this.tails = [];
    }
    return this;
  };
  prototype.unwrap = function(){
    if (this.tails.length) {
      return this;
    } else {
      return this.head;
    }
  };
  prototype.delegate(['jumps', 'assigns', 'isStatement', 'isString'], function(it, arg){
    return !this.tails.length && this.head[it](arg);
  });
  prototype.isComplex = function(){
    return this.tails.length || this.head.isComplex();
  };
  prototype.isCallable = function(){
    if (this.tails.length) {
      return !this.isArray();
    } else {
      return this.head.isCallable();
    }
  };
  prototype.isArray = function(){
    var that, _ref;
    if (that = (_ref = this.tails)[_ref.length - 1]) {
      return (_ref = that.key) != null ? _ref.length : void 8;
    } else {
      return this.head.isArray();
    }
  };
  prototype.isAssignable = function(){
    var that, _ref;
    if (that = (_ref = this.tails)[_ref.length - 1]) {
      return that instanceof Index;
    } else {
      return this.head.isAssignable;
    }
  };
  prototype.isRegex = function(){
    return this.head.value === 'RegExp' && !this.tails[1] && this.tails[0] instanceof Call;
  };
  prototype.makeReturn = function(it){
    if (this.tails.length) {
      return Chain.superclass.prototype.makeReturn.apply(this, arguments);
    } else {
      return this.head.makeReturn(it);
    }
  };
  prototype.getCall = function(){
    var tail, _ref;
    return (tail = (_ref = this.tails)[_ref.length - 1]) instanceof Call && tail;
  };
  prototype.varName = function(){
    var _ref, _ref2;
    return (_ref = (_ref = this.tails)[_ref.length - 1]) != null ? (_ref2 = _ref.key) != null ? _ref2.varName() : void 8 : void 8;
  };
  prototype.cacheReference = function(o){
    var name, base, ref, bref, nref, _ref;
    name = (_ref = this.tails)[_ref.length - 1];
    if (name instanceof Call) {
      return this.cache(o, true);
    }
    if (this.tails.length < 2 && !this.head.isComplex() && !(name != null ? name.isComplex() : void 8)) {
      return [this, this];
    }
    base = Chain(this.head, this.tails.slice(0, -1));
    if (base.isComplex()) {
      ref = o.scope.temporary('ref');
      base = Chain(Assign(Var(ref), base));
      bref = (_ref = Var(ref), _ref.temp = true, _ref);
    }
    if (!name) {
      return [base, bref];
    }
    if (name.isComplex()) {
      ref = o.scope.temporary('key');
      name = Index(Assign(Var(ref), name.key));
      nref = Index((_ref = Var(ref), _ref.temp = true, _ref));
    }
    return [base.add(name), Chain(bref || base.head, [nref || name])];
  };
  prototype.compileNode = function(o){
    var that, base, rest, t, _ref, _i, _len;
    _ref = this.head;
    _ref.front = this.front;
    _ref.newed = this.newed;
    if (!this.tails.length) {
      return this.head.compile(o);
    }
    if (that = this.unfoldAssign(o)) {
      return that.compile(o);
    }
    if (this.tails[0] instanceof Call && !this.head.isCallable()) {
      this.carp('invalid callee');
    }
    this.expandArray(o);
    this.expandBind(o);
    this.expandSplat(o);
    this.expandStar(o);
    base = this.head.compile(o, LEVEL_CALL);
    rest = '';
    for (_i = 0, _len = (_ref = this.tails).length; _i < _len; ++_i) {
      t = _ref[_i];
      if (t['new']) {
        base = 'new ' + base;
      }
      rest += t.compile(o);
    }
    if ('.' === rest.charAt(0) && SIMPLENUM.test(base)) {
      base += ' ';
    }
    return base + rest;
  };
  prototype.unfoldSoak = function(o){
    var that, i, node, bust, test, _ref, _len, _ref2;
    if (that = this.head.unfoldSoak(o)) {
      (_ref = that.then.tails).push.apply(_ref, this.tails);
      return that;
    }
    for (i = 0, _len = (_ref = this.tails).length; i < _len; ++i) {
      node = _ref[i];
      if (_ref2 = node.soak, delete node.soak, _ref2) {
        bust = Chain(this.head, this.tails.splice(0, i));
        test = node instanceof Call
          ? ((_ref2 = bust.cacheReference(o), test = _ref2[0], this.head = _ref2[1], _ref2), JS("typeof " + test.compile(o, LEVEL_OP) + " == 'function'"))
          : (i && node.assign
            ? ((_ref2 = bust.cacheReference(o), test = _ref2[0], bust = _ref2[1], _ref2), (this.head = bust.head, bust), (_ref2 = this.tails).unshift.apply(_ref2, bust.tails))
            : (_ref2 = bust.unwrap().cache(o, true), test = _ref2[0], this.head = _ref2[1], _ref2), Existence(test));
        return _ref2 = If(test, this), _ref2.soak = true, _ref2;
      }
    }
  };
  prototype.unfoldAssign = function(o){
    var that, i, index, left, _ref, _len, _ref2;
    if (that = this.head.unfoldAssign(o)) {
      (_ref = that.right.tails).push.apply(_ref, this.tails);
      return that;
    }
    for (i = 0, _len = (_ref = this.tails).length; i < _len; ++i) {
      index = _ref[i];
      if (that = index.assign) {
        index.assign = '';
        _ref2 = Chain(this.head, this.tails.splice(0, i)).cacheReference(o), left = _ref2[0], this.head = _ref2[1];
        return _ref2 = Assign(left, this, that), _ref2.access = true, _ref2;
      }
    }
  };
  prototype.expandSplat = function(o){
    var tails, i, call, thisplat, args, ref, _ref;
    tails = this.tails;
    i = -1;
    while (call = tails[++i]) {
      thisplat = call.thisplat, args = call.args;
      if (!(thisplat || args && (args = Splat.compileArray(o, args, true)))) {
        continue;
      }
      if (call['new']) {
        this.carp('splatting "new"');
      }
      call.method = '.apply';
      if (thisplat) {
        delete call.thisplat;
        continue;
      }
      if (tails[i - 1] instanceof Index) {
        _ref = Chain(this.head, tails.splice(0, i - 1)).cache(o, true), this.head = _ref[0], ref = _ref[1];
        i = 0;
      }
      call.args = [ref || Literal('null'), JS(args)];
    }
  };
  prototype.expandBind = function(o){
    var tails, i, that, args, call;
    tails = this.tails;
    i = -1;
    while (that = tails[++i]) {
      if (that.symbol !== '.~') {
        continue;
      }
      that.symbol = '';
      args = Chain(this.head, tails.splice(0, i)).unwrap().cache(o, true);
      args[1] = Chain(args[1], [tails.shift()]);
      call = Call.make(Util('bind'), args);
      this.head = this.newed ? Parens(call, true) : call;
      i = -1;
    }
  };
  prototype.expandStar = function(o){
    var tails, i, that, stars, sub, ref, temps, star, _ref, _i, _len;
    tails = this.tails;
    i = -1;
    while (that = tails[++i]) {
      if (that.args || that.stars || that.key instanceof Key) {
        continue;
      }
      stars = that.stars = [];
      that.eachChild(seek);
      if (!stars.length) {
        continue;
      }
      _ref = Chain(this.head, tails.splice(0, i)).unwrap().cache(o), sub = _ref[0], ref = _ref[1], temps = _ref[2];
      if (SIMPLENUM.test(ref = ref.compile(o))) {
        ref += ' ';
      }
      for (_i = 0, _len = stars.length; _i < _len; ++_i) {
        star = stars[_i];
        star.value = ref + '.length';
      }
      this.head = JS(sub.compile(o, LEVEL_CALL) + tails.shift().compile(o));
      if (temps) {
        o.scope.free(temps[0]);
      }
      i = -1;
    }
    function seek(it){
      if (it.value === '*') {
        stars.push(it);
      } else if (!(it instanceof Index)) {
        it.eachChild(seek);
      }
    }
  };
  prototype.expandArray = function(o){
    var tails, i, tail, sub, ref, temps, j, key, items, _ref, __results, _len;
    tails = this.tails;
    i = -1;
    while (tail = tails[++i]) {
      if ((_ref = tail.key) != null ? _ref.length : void 8) {
        if (tails[i + 1] instanceof Call) {
          tail.carp('calling an array');
        }
        _ref = Chain(this.head, tails.splice(0, i)).unwrap().cache(o), sub = _ref[0], ref = _ref[1], temps = _ref[2];
        __results = [];
        for (j = 0, _len = (_ref = tails.shift().key).length; j < _len; ++j) {
          key = _ref[j];
          __results.push(Chain(j ? ref : sub, [Index(key)]));
        }
        items = __results;
        this.head = JS(Arr(items).compile(o));
        if (temps) {
          o.scope.free(temps[0]);
        }
        i = -1;
      }
    }
  };
  return Chain;
}(Node));
exports.Call = Call = (function(_super){
  var prototype = __extends(Call, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Call(args, sym){
    var _this = new _ctor;
    args || (args = []);
    if (args.length === 1 && args[0] instanceof Splat && args[0].it.isEmpty()) {
      _this.thisplat = true;
      args = [Literal('this'), Literal('arguments')];
    }
    _this.args = args;
    _this.soak = sym === '?(' && '?';
    return _this;
  } Call.displayName = 'Call';
  prototype.children = ['args'];
  prototype.show = function(){
    return (this['new'] || '') + (this.soak || '') + (this.thisplat || '');
  };
  prototype.compile = function(o){
    var code, i, a, _ref, _len;
    code = (this.method || '') + '(';
    for (i = 0, _len = (_ref = this.args).length; i < _len; ++i) {
      a = _ref[i];
      code += (i ? ', ' : '') + a.compile(o, LEVEL_LIST);
    }
    return code + ')';
  };
  Call.make = function(callee, args){
    return Chain(callee).add(Call(args));
  };
  Call.block = function(fun, args, method){
    var _ref, _ref2;
    return _ref = Parens(Chain(fun, [(_ref2 = Call(args), _ref2.method = method, _ref2)]), true), _ref.calling = true, _ref;
  };
  Call.back = function(params, arrow, node){
    var call, args, i, a, _len;
    (call = node.getCall()) || (node = Chain(node).add(call = Call()));
    args = call.args;
    for (i = 0, _len = args.length; i < _len; ++i) {
      a = args[i];
      if (a instanceof Splat && a.it.isEmpty()) {
        break;
      }
    }
    return node.back = (args[i] = Fun(params, null, arrow.charAt(1) + '>')).body, node;
  };
  Call['let'] = function(args, body){
    var i, a, params, __results, _len;
    __results = [];
    for (i = 0, _len = args.length; i < _len; ++i) {
      a = args[i];
      if (a.op === '=' && !a.logic) {
        args[i] = a.right;
        __results.push(a.left);
      } else {
        __results.push(Var(a.varName() || a.carp('invalid "let" argument')));
      }
    }
    params = __results;
    args.unshift(Literal('this'));
    return this.block(Fun(params, body), args, '.call');
  };
  return Call;
}(Node));
exports.Clone = Clone = (function(_super){
  var prototype = __extends(Clone, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Clone(base, mixins){
    var _this = new _ctor;
    _this.base = base;
    _this.mixins = mixins;
    return _this;
  } Clone.displayName = 'Clone';
  prototype.children = ['base', 'mixins'];
  prototype.unfoldSoak = function(it){
    return If.unfoldSoak(it, this, 'base');
  };
  prototype.compileNode = function(o){
    return Import(Call.make(Util('clone'), [this.base]), Obj(this.mixins)).compile(o);
  };
  return Clone;
}(Node));
List = (function(_super){
  var prototype = __extends(List, _super).prototype;
  function List(){} List.displayName = 'List';
  prototype.children = ['items'];
  prototype.isEmpty = function(){
    return !this.items.length;
  };
  prototype.assigns = function(it){
    var node, _i, _ref, _len;
    for (_i = 0, _len = (_ref = this.items).length; _i < _len; ++_i) {
      node = _ref[_i];
      if (node.assigns(it)) {
        return true;
      }
    }
  };
  List.compile = function(o, items){
    var indent, level, i, code, that;
    switch (items.length) {
    case 0:
      return '';
    case 1:
      return items[0].compile(o, LEVEL_LIST);
    }
    indent = o.indent, level = o.level;
    o.indent = indent + TAB;
    o.level = LEVEL_LIST;
    code = items[i = 0].compile(o);
    while (that = items[++i]) {
      code += ', ' + that.compile(o);
    }
    if (~code.indexOf('\n')) {
      code = "\n" + o.indent + code + "\n" + indent;
    }
    o.indent = indent;
    o.level = level;
    return code;
  };
  return List;
}(Node));
exports.Obj = Obj = (function(_super){
  var prototype = __extends(Obj, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Obj(items){
    var _this = new _ctor;
    _this.items = items || [];
    return _this;
  } Obj.displayName = 'Obj';
  prototype.asObj = THIS;
  prototype.compileNode = function(o){
    var items, code, idt, dic, i, node, logic, rest, multi, key, val, _len;
    items = this.items;
    if (!items.length) {
      return (this.front ? '({})' : '{}');
    }
    code = '';
    idt = '\n' + (o.indent += TAB);
    dic = {};
    for (i = 0, _len = items.length; i < _len; ++i) {
      node = items[i];
      if (node.comment) {
        code += idt + node.compile(o);
        continue;
      }
      if (logic = node.hasDefault()) {
        node = node.first;
      }
      if (node instanceof Splat || (node.key || node) instanceof Parens) {
        rest = items.slice(i);
        break;
      }
      if (multi) {
        code += ',';
      } else {
        multi = true;
      }
      code += idt + (node instanceof Prop
        ? ((key = node.key, val = node.val, node), node.accessor
          ? (key = (val.params.length ? 'set' : 'get') + " " + key.compile(o), key + val.compile(o, LEVEL_LIST).slice(8))
          : (val instanceof Fun || val instanceof Class ? val.name = key.varName() : void 8, (key = key.compile(o)) + ": " + val.compile(o, LEVEL_LIST)))
        : (key = node.compile(o)) + ": " + key);
      dic[0 + key] = 0 + key in dic && node.carp("duplicate property name \"" + key + "\"");
      logic && (code += (" " + (logic.op === '?'
        ? "!= null ? " + key + " :"
        : logic.op) + " ") + logic.second.compile(o, LEVEL_OP));
    }
    code = "{" + (code && code + '\n' + this.tab) + "}";
    if (rest) {
      return Import(JS(code), Obj(rest)).compile((o.indent = this.tab, o));
    } else if (this.front) {
      return "(" + code + ")";
    } else {
      return code;
    }
  };
  return Obj;
}(List));
exports.Prop = Prop = (function(_super){
  var prototype = __extends(Prop, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Prop(key, val){
    var _ref, _this = new _ctor;
    _this.key = key;
    _this.val = val;
    if (val.op === '~' && ((_ref = val.first.params) != null ? _ref.length : void 8) < 2) {
      _this['accessor'] = 'accessor';
      _this.val = val.first;
    }
    return _this;
  } Prop.displayName = 'Prop';
  prototype.children = ['key', 'val'];
  prototype.show = function(){
    return this.accessor;
  };
  prototype.assigns = function(it){
    return this.val.assigns(it);
  };
  return Prop;
}(Node));
exports.Arr = Arr = (function(_super){
  var prototype = __extends(Arr, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Arr(items){
    var _this = new _ctor;
    _this.items = items || [];
    return _this;
  } Arr.displayName = 'Arr';
  prototype.isArray = YES;
  prototype.selections = function(){
    return this.items.length > 1 && this.items;
  };
  prototype.asObj = function(){
    var i, item;
    return Obj((function(){
      var _ref, _len, _results = [];
      for (i = 0, _len = (_ref = this.items).length; i < _len; ++i) {
        item = _ref[i];
        _results.push(Prop(Literal(i), item));
      }
      return _results;
    }.call(this)));
  };
  prototype.compile = function(o){
    var items, code;
    items = this.items;
    if (!items.length) {
      return '[]';
    }
    if (code = Splat.compileArray(o, items)) {
      return this.newed ? "(" + code + ")" : code;
    }
    return "[" + List.compile(o, items) + "]";
  };
  Arr.maybe = function(nodes){
    if (nodes.length === 1 && !(nodes[0] instanceof Splat)) {
      return nodes[0];
    }
    return Arr(nodes);
  };
  Arr.wrap = function(it){
    return Arr([Splat((it.isArray = YES, it))]);
  };
  return Arr;
}(List));
exports.Op = Op = (function(_super){
  var EQUALITY, COMPARER, prototype = __extends(Op, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Op(op, first, second, post){
    var chain, node, _i, _ref, _len, _this = new _ctor;
    switch (op) {
    case 'of':
      return new Of(first, second);
    case 'do':
      return first instanceof Fun
        ? Call.block(first)
        : Parens(Call.make(first));
    case 'new':
      first.newed = true;
      if ((chain = first.base || first) instanceof Chain) {
        while (chain.head.base instanceof Chain) {
          chain = chain.head.base;
        }
        for (_i = 0, _len = (_ref = chain.tails).length; _i < _len; ++_i) {
          node = _ref[_i];
          if (node instanceof Call) {
            node['new'] = 'new';
            return first;
          }
        }
      }
      break;
    case '+':
      if (!second) {
        break;
      }
      if (first instanceof Arr) {
        first.items.push(Splat(second));
        return first;
      }
      if (second instanceof Arr) {
        second.items.unshift(Splat(first));
        return second;
      }
    }
    _this.op = op;
    _this.first = first;
    _this.second = second;
    _this.post = post;
    return _this;
  } Op.displayName = 'Op';
  prototype.children = ['first', 'second'];
  prototype.show = function(){
    return this.op;
  };
  prototype.isCallable = function(){
    var _ref;
    switch (this.op) {
    case '&&':
    case '||':
    case '?':
    case 'new':
    case 'delete':
      return this.first.isCallable() || ((_ref = this.second) != null ? _ref.isCallable() : void 8);
    }
  };
  prototype.isArray = function(){
    switch (this.op) {
    case '*':
      return this.first instanceof Arr;
    case '/':
      return this.second.isMatcher();
    }
  };
  prototype.isString = function(){
    var _ref;
    switch (this.op) {
    case '+':
      if (!this.second) {
        break;
      }
      // fallthrough
    case '*':
      return this.first.isString() || this.second.isString();
    case '-':
      return (_ref = this.second) != null ? _ref.isMatcher() : void 8;
    case 'typeof':
    case 'classof':
      return true;
    }
  };
  EQUALITY = /^[!=]==?$/;
  COMPARER = /^(?:[!=]=|[<>])=?$/;
  prototype.invert = function(){
    var op, _ref;
    if (EQUALITY.test(op = this.op) && !COMPARER.test(this.second.op)) {
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
  prototype.unfoldSoak = function(o){
    var _ref;
    return ((_ref = this.op) === '++' || _ref === '--' || _ref === 'delete') && If.unfoldSoak(o, this, 'first');
  };
  prototype.hasDefault = function(){
    switch (this.op) {
    case '?':
    case '||':
    case '&&':
      return this;
    }
  };
  prototype.compileNode = function(o){
    var that, level, code;
    if (!this.second) {
      return this.compileUnary(o);
    }
    switch (this.op) {
    case '?':
      return this.compileExistence(o);
    case '**':
      return this.compilePow(o);
    case 'instanceof':
      if (that = this.second.selections()) {
        return this.compileIOS(o, that);
      }
      break;
    case '*':
      if (this.second.isString()) {
        return this.compileJoin(o);
      }
      if (this.first.isString() || this.first instanceof Arr) {
        return this.compileRepeat(o);
      }
      break;
    case '-':
      if (this.second.isMatcher()) {
        return this.compileRemove(o);
      }
      break;
    case '/':
      if (this.second.isMatcher()) {
        return this.compileSplit(o);
      }
      break;
    default:
      if (COMPARER.test(this.op) && COMPARER.test(this.second.op)) {
        return this.compileChain(o);
      }
    }
    this.first.front = this.front;
    code = this.first.compile(o, level = LEVEL_OP + PREC[this.op]) + " " + this.op + " " + this.second.compile(o, level);
    if (o.level <= level) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  prototype.compileChain = function(o){
    var level, code, sub, _ref;
    code = this.first.compile(o, level = LEVEL_OP + PREC[this.op]);
    _ref = this.second.first.cache(o, true), sub = _ref[0], this.second.first = _ref[1];
    code += " " + this.op + " " + sub.compile(o, level) + " && " + this.second.compile(o, LEVEL_OP);
    if (o.level <= LEVEL_OP) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  prototype.compileExistence = function(o){
    var fsts;
    if (o.level) {
      fsts = this.first.cache(o, true);
      return If(Existence(fsts[0]), fsts[1]).addElse(this.second).compileExpression(o);
    }
    return Op('&&', Existence(this.first).invert(), this.second).compileNode(o);
  };
  prototype.compileUnary = function(o){
    var op, first, code;
    op = this.op, first = this.first;
    switch (op) {
    case 'new':
      first.isCallable() || first.carp('invalid constructor');
      break;
    case 'delete':
      if (first instanceof Var || !first.isAssignable()) {
        this.carp('invalid deletion');
      }
      if (o.level) {
        return this.compileDelete(o);
      }
      break;
    case '++':
    case '--':
      if (first instanceof Var && !o.scope.check(first.value, true)) {
        this.carp("modification of undeclared variable \"" + first.value + "\"");
      }
      if (this.post) {
        first.front = this.front;
      }
      break;
    case 'classof':
      return utility('toString') + ".call(" + first.compile(o, LEVEL_LIST) + ").slice(8, -1)";
    }
    code = first.compile(o, LEVEL_OP + PREC.unary);
    if (this.post) {
      code += op;
    } else {
      if ((op === 'new' || op === 'typeof' || op === 'delete') || (op === '+' || op === '-') && first.op === op) {
        op += ' ';
      }
      code = op + code;
    }
    if (o.level < LEVEL_CALL) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  prototype.compileIOS = function(o, items){
    var code, level, sub, ref, i, item, _ref, _len;
    code = '';
    _ref = this.first.cache(o, false, level = LEVEL_OP + PREC['<']), sub = _ref[0], ref = _ref[1];
    for (i = 0, _len = items.length; i < _len; ++i) {
      item = items[i];
      code += (i ? ' || ' + ref : sub) + " instanceof " + item.compile(o, level);
    }
    sub === ref || o.scope.free(ref);
    if (o.level <= LEVEL_OP) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  prototype.compileDelete = function(o){
    var get, del, ref, code, _ref;
    _ref = Chain(this.first).cacheReference(o), get = _ref[0], del = _ref[1];
    code = this.assigned
      ? ''
      : (ref = o.scope.temporary('ref')) + " = ";
    code += get.compile(o, LEVEL_LIST) + ", delete " + del.compile(o, LEVEL_LIST);
    if (this.assigned) {
      return code;
    }
    code += ", " + o.scope.free(ref);
    if (o.level < LEVEL_LIST) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  prototype.compileMethod = function(o, klass, method, arg){
    var args;
    args = [this.second].concat(arg || []);
    if (this.first["is" + klass]()) {
      return Chain(this.first, [Index(Key(method)), Call(args)]).compile(o);
    } else {
      args.unshift(this.first);
      return Call.make(JS(utility(method) + '.call'), args).compile(o);
    }
  };
  prototype.compileJoin = function(it){
    return this.compileMethod(it, 'Array', 'join');
  };
  prototype.compileRemove = function(it){
    return this.compileMethod(it, 'String', 'replace', JS("''"));
  };
  prototype.compileSplit = function(it){
    return this.compileMethod(it, 'String', 'split');
  };
  prototype.compileRepeat = function(o){
    var x, n, items, that, refs, i, item, q, _ref, _len;
    x = this.first, n = this.second;
    items = x.items;
    if (((that = items && Splat.compileArray(o, items)) ? x = JS(that) : void 8) || !(n instanceof Literal && n.value < 0x20)) {
      x = Call.make(Util('repeat' + (items ? 'Array' : 'String')), [x, n]);
      return x.compile(o);
    }
    n = +n.value;
    if (1 <= n && n < 2) {
      return x.compile(o);
    }
    if (items) {
      if (n < 1) {
        return (_ref = __clone(Block.prototype), _ref.lines = items, _ref).add(JS('[]')).compile(o);
      }
      refs = [];
      for (i = 0, _len = items.length; i < _len; ++i) {
        item = items[i];
        _ref = item.cache(o, 1), items[i] = _ref[0], refs[refs.length] = _ref[1];
      }
      items.push((_ref = JS(), _ref.compile = function(){
        return (__repeatString(", " + List.compile(o, refs), n - 1)).slice(2);
      }, _ref));
      return x.compile(o);
    } else if (x instanceof Literal) {
      return (q = (x = x.compile(o)).charAt()) + __repeatString(x.slice(1, -1) + "", n) + q;
    } else {
      if (n < 1) {
        return Block(x.it).add(JS("''")).compile(o);
      }
      x = (refs = x.cache(o, 1, LEVEL_OP))[0] + __repeatString(" + " + refs[1], n - 1);
      if (o.level < LEVEL_OP + PREC['+']) {
        return x;
      } else {
        return "(" + x + ")";
      }
    }
  };
  prototype.compilePow = function(o){
    return Call.make(JS('Math.pow'), [this.first, this.second]).compile(o);
  };
  return Op;
}(Node));
exports.Assign = Assign = (function(_super){
  var prototype = __extends(Assign, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Assign(left, right, op, logic){
    var _this = new _ctor;
    _this.left = left;
    _this.right = right;
    _this.op = op || '=';
    _this.logic = logic || _this.op.logic;
    _this.op += '';
    return _this;
  } Assign.displayName = 'Assign';
  prototype.children = ['left', 'right'];
  prototype.show = function(){
    return (this.logic || '') + this.op;
  };
  prototype.assigns = function(it){
    return this.left.assigns(it);
  };
  prototype.delegate(['isCallable', 'isRegex'], function(it){
    switch (this.op) {
    case '=':
    case ':=':
      return this.right[it]();
    }
  });
  prototype.isArray = function(){
    switch (this.op) {
    case '=':
    case ':=':
    case '+=':
      return this.right.isArray();
    case '/=':
      return this.right.isMatcher();
    }
  };
  prototype.isString = function(){
    switch (this.op) {
    case '=':
    case ':=':
    case '+=':
    case '*=':
      return this.right.isString();
    case '-=':
      return this.right.isMatcher();
    }
  };
  prototype.unfoldSoak = function(o){
    return If.unfoldSoak(o, this, 'left');
  };
  prototype.unfoldAssign = function(){
    return this.access && this;
  };
  prototype.compileNode = function(o){
    var op, right, left, reft, head, tails, decl, sign, name, res, code, del, that, _ref;
    op = this.op, right = this.right;
    left = this.transleft(o).unwrap();
    if (left.isEmpty()) {
      return (_ref = Parens(right), _ref.front = this.front, _ref.newed = this.newed, _ref).compile(o);
    }
    if (left.items) {
      return this.compileDestructuring(o, left);
    }
    if (this.logic) {
      return this.compileConditional(o, left);
    }
    if (left.hasDefault()) {
      right = Op(left.op, right, left.second);
      left = left.first;
    }
    left.isAssignable() || left.carp(left.compile(o, LEVEL_LIST) + " // invalid assignee");
    while (right instanceof Parens && !right.keep) {
      right = right.it;
    }
    if (op === '**=' || op === '+=' && right instanceof Arr || op === '*=' && right.isString() || (op === '-=' || op === '/=') && right.isMatcher()) {
      _ref = Chain(left).cacheReference(o), left = _ref[0], reft = _ref[1];
      right = Op(op.slice(0, -1), reft, right);
      op = ':=';
    }
    left = left.unwrap();
    if (right instanceof Fun || right instanceof Class) {
      head = left.head, tails = left.tails;
      right.name || (right.name = tails
        ? (_ref = tails[tails.length - 1]) != null ? _ref.key.compile(o) : void 8
        : left.value);
      right.clas || (right.clas = head instanceof Var && tails.length === 2 && ((_ref = tails[0].key) != null ? _ref.name : void 8) === 'prototype' && head.value);
    }
    decl = left instanceof Var;
    sign = op.replace(':', '');
    name = (left.front = true, left).compile(o, LEVEL_LIST);
    code = decl && !o.level && right instanceof While
      ? (res = o.scope.temporary('_results')) + " = [];\n" + this.tab + right.makeReturn(res).compile(o) + "\n" + this.tab + name + " " + sign + " " + o.scope.free(res)
      : (name + " " + sign + " ") + (right.assigned = true, right).compile(o, LEVEL_LIST);
    if (decl) {
      del = right.op === 'delete';
      if (op === '=') {
        o.scope.declare(name);
      } else if (!o.scope.check(name, true)) {
        left.carp("assignment to undeclared variable \"" + name + "\"");
      }
    }
    if (that = o.level) {
      if (del) {
        code += ", " + name;
      }
      if (that > (del ? LEVEL_PAREN : LEVEL_LIST)) {
        code = "(" + code + ")";
      }
    }
    return code;
  };
  prototype.compileConditional = function(o, left){
    var lefts;
    lefts = Chain(left).cacheReference(o);
    return Op(this.logic, lefts[0], (this.logic = false, this.left = lefts[1], this)).compileNode(o);
  };
  prototype.compileDestructuring = function(o, left){
    var items, len, ret, rite, rref, cache, list, code;
    items = left.items;
    len = items.length;
    ret = o.level && !this['void'];
    rite = this.right.compile(o, len === 1 ? LEVEL_CALL : LEVEL_LIST);
    if ((ret || len > 1) && (!ID.test(rite) || left.assigns(rite))) {
      cache = (rref = o.scope.temporary('ref')) + " = " + rite;
      rite = rref;
    }
    list = this["rend" + left.constructor.displayName](o, items, rite);
    if (rref) {
      o.scope.free(rref);
    }
    if (cache) {
      list.unshift(cache);
    }
    if (ret || !list.length) {
      list.push(rite);
    }
    code = list.join(', ');
    if (list.length < 2 || o.level < LEVEL_LIST) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  prototype.rendArr = function(o, nodes, rite){
    var i, node, len, empty, val, ivar, start, inc, rcache, _len, _ref, _results = [];
    for (i = 0, _len = nodes.length; i < _len; ++i) {
      node = nodes[i];
      if (node.isEmpty()) {
        continue;
      }
      if (node instanceof Splat) {
        ivar && node.carp('multiple splat in an assignment');
        len = nodes.length;
        empty = (node = node.it).isEmpty();
        if (i === len - 1) {
          if (empty) {
            break;
          }
          val = Arr.wrap(JS(utility('slice') + '.call(' + rite + (i ? ", " + i + ")" : ')')));
        } else {
          val = rite + ".length - " + (len - i - 1);
          if (empty && i === len - 2) {
            ivar = val;
            continue;
          }
          start = i + 1;
          this.temps = [ivar = o.scope.temporary('i')];
          val = empty
            ? (node = Var(ivar), Var(val))
            : Arr.wrap(JS("" + len + " <= " + rite + ".length\ ? " + utility('slice') + ".call(" + rite + ", " + i + ", " + ivar + " = " + val + ")\ : (" + ivar + " = " + i + ", [])"));
        }
      } else {
        (inc = ivar) && start < i && (inc += " + " + (i - start));
        val = Chain(rcache || (rcache = Literal(rite)), [Index(JS(inc || i))]);
      }
      _results.push((_ref = __clone(this), _ref.left = node, _ref.right = val, _ref['void'] = true, _ref).compile(o, LEVEL_PAREN));
    }
    return _results;
  };
  prototype.rendObj = function(o, nodes, rite){
    var node, splat, logic, key, rcache, val, _i, _len, _ref, _results = [];
    for (_i = 0, _len = nodes.length; _i < _len; ++_i) {
      node = nodes[_i];
      if (splat = node instanceof Splat) {
        node = node.it;
      }
      if (logic = node.hasDefault()) {
        node = node.first;
      }
      if (node instanceof Parens) {
        _ref = Chain(node.it).cacheReference(o), node = _ref[0], key = _ref[1];
      } else if (node instanceof Prop) {
        node = (key = node.key, node).val;
      } else {
        key = node;
      }
      if (node instanceof Key) {
        node = Var(node.name);
      }
      if (logic) {
        node = (logic.first = node, logic);
      }
      val = Chain(rcache || (rcache = Var(rite)), [Index(key.maybeKey())]);
      if (splat) {
        val = Import(Obj(), val);
      }
      _results.push((_ref = __clone(this), _ref.left = node, _ref.right = val, _ref['void'] = true, _ref).compile(o, LEVEL_PAREN));
    }
    return _results;
  };
  prototype.transleft = function(o){
    var left, base, items, sub, ref, i, node, logic, key, val, item, splat, _ref, _len;
    left = this.left;
    if (left instanceof Clone) {
      base = left.base, items = left.mixins;
      if (items.length > 1) {
        _ref = base.cache(o), sub = _ref[0], ref = _ref[1], this.temps = _ref[2];
      } else {
        sub = ref = base;
      }
      for (i = 0, _len = items.length; i < _len; ++i) {
        node = items[i];
        base = i ? ref : sub;
        if (node instanceof Prop) {
          node.val = rechain(base, node.val);
        } else {
          if (logic = node.hasDefault()) {
            node = node.first;
          }
          if (node instanceof Parens) {
            _ref = node.cache(o, true), node = _ref[0], key = _ref[1];
            key = Parens(key);
          } else {
            key = node;
          }
          val = Chain(base, [Index(node.maybeKey())]);
          if (logic) {
            val = (logic.first = val, logic);
          }
          items[i] = Prop(key, val);
        }
      }
      return Obj(items);
    }
    if ((left = left.unwrap()) instanceof Chain && left.isArray()) {
      items = left.tails.pop().key;
      _ref = left.cache(o), sub = _ref[0], ref = _ref[1], this.temps = _ref[2];
      for (i = 0, _len = items.length; i < _len; ++i) {
        item = items[i];
        if (splat = item instanceof Splat) {
          item = item.it;
        }
        if (item instanceof Var) {
          item = Parens(item);
        }
        item = rechain(i ? ref : sub, item);
        items[i] = splat ? Splat(item) : item;
      }
      return Arr(items);
    }
    return left;
  };
  function rechain(head, tail){
    var _ref;
    if (tail.isEmpty()) {
      return tail;
    }
    if (tail instanceof Obj) {
      return Clone(head, tail.items);
    } else {
      return Chain(head, [(_ref = __clone(Index.prototype), _ref.key = tail.items || tail.maybeKey(), _ref)]);
    }
  }
  return Assign;
}(Node));
exports.Import = Import = (function(_super){
  var prototype = __extends(Import, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Import(left, right, all){
    var _this = new _ctor;
    _this.left = left;
    _this.right = right;
    _this.all = all && 'All';
    if (!all && left instanceof Obj && right.items) {
      return Obj(left.items.concat(right.asObj().items));
    }
    return _this;
  } Import.displayName = 'Import';
  prototype.children = ['left', 'right'];
  prototype.show = function(){
    return this.all;
  };
  prototype.delegate(['isCallable', 'isArray'], function(it){
    return this.left[it]();
  });
  prototype.compileNode = function(o){
    var items, top, lref, sub, delim, space, code, node, com, logic, dyna, key, val, _ref, _i, _len;
    if (this.all || !this.right.items) {
      return Call.make(Util("import" + (this.all || '')), [this.left, this.right]).compileNode(o);
    }
    items = this.right.asObj().items;
    if (!items.length) {
      return this.left.compile(o);
    }
    top = !o.level;
    if (items.length < 2 && (top || items[0] instanceof Splat)) {
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
      if (com = node.comment) {
        code += node.compile(o);
        continue;
      }
      if (node instanceof Splat) {
        code += Import(lref, node.it).compile(o);
        continue;
      }
      if (logic = node.hasDefault()) {
        node = node.first;
      }
      if (dyna = node instanceof Parens) {
        _ref = node.it.cache(o, true), key = _ref[0], val = _ref[1];
      } else if (node instanceof Prop) {
        key = node.key, val = node.val;
        if (node.accessor) {
          key = key instanceof Key
            ? "'" + key.name + "'"
            : key.compile(o, LEVEL_LIST);
          code += lref.compile(o) + ".__define" + (val.params.length ? 'S' : 'G') + "etter__(" + key + ", " + val.compile(o, LEVEL_LIST) + ")";
          continue;
        }
      } else {
        key = val = node;
      }
      dyna || (key = key.maybeKey());
      if (logic) {
        val = (logic.first = val, logic);
      }
      code += Assign(Chain(lref, [Index(key)]), val).compile(o, LEVEL_PAREN);
    }
    if (sub === lref) {
      code = code.slice(delim.length);
    } else {
      code = sub.compile(o, LEVEL_PAREN) + code;
    }
    if (top) {
      return code;
    }
    node instanceof Splat || (code += (com ? ' ' : ', ') + lref.compile(o, LEVEL_LIST));
    if (o.level < LEVEL_LIST) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  return Import;
}(Node));
exports.Of = Of = (function(_super){
  var prototype = __extends(Of, _super).prototype;
  function Of(item, array){
    this.item = item;
    this.array = array;
  } Of.displayName = 'Of';
  prototype.children = ['item', 'array'];
  __importAll(prototype, Negatable);
  prototype.compileNode = function(o){
    var items, level, sub, ref, code, cmp, cnj, i, item, _ref, _len;
    items = this.array.selections();
    level = items ? LEVEL_OP + PREC['=='] : LEVEL_LIST;
    _ref = this.item.cache(o, false, level), sub = _ref[0], ref = _ref[1];
    if (items) {
      code = '';
      _ref = this.negated
        ? [' !== ', ' && ']
        : [' === ', ' || '], cmp = _ref[0], cnj = _ref[1];
      for (i = 0, _len = items.length; i < _len; ++i) {
        item = items[i];
        code += (i ? cnj + ref : sub) + cmp + item.compile(o, level);
      }
      level = LEVEL_OP + PREC['||'];
    } else {
      code = utility('indexOf') + ".call(" + this.array.compile(o, level) + ", " + ref + ") " + (this.negated ? '<' : '>=') + " 0";
      if (sub === ref) {
        return code;
      }
      code = sub + ', ' + code;
    }
    if (sub !== ref) {
      o.scope.free(ref);
    }
    if (o.level < level) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  return Of;
}(Node));
exports.Existence = Existence = (function(_super){
  var prototype = __extends(Existence, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Existence(it){
    var _this = new _ctor;
    _this.it = it;
    return _this;
  } Existence.displayName = 'Existence';
  prototype.children = ['it'];
  __importAll(prototype, Negatable);
  prototype.compileNode = function(o){
    var node, code, op, eq, _ref;
    node = this.it.unwrap();
    code = node.compile(o, LEVEL_OP + PREC['==']);
    if (node instanceof Var && !o.scope.check(code, true)) {
      _ref = this.negated
        ? ['||', '=']
        : ['&&', '!'], op = _ref[0], eq = _ref[1];
      code = "typeof " + code + " " + eq + "= 'undefined' " + op + " " + code + " " + eq + "== null";
    } else {
      code += " " + (op = this.negated ? '==' : '!=') + " null";
    }
    if (o.level < LEVEL_OP + PREC[op]) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  return Existence;
}(Node));
exports.Fun = Fun = (function(_super){
  var prototype = __extends(Fun, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Fun(params, body, arrow){
    var _this = new _ctor;
    _this.params = params || [];
    _this.body = body || Block();
    if (arrow === '~>') {
      _this.bound = '_this';
    }
    return _this;
  } Fun.displayName = 'Fun';
  prototype.children = ['params', 'body'];
  prototype.show = function(){
    return this.bound;
  };
  prototype.named = function(it){
    return this.name = it, this.statement = true, this;
  };
  prototype.isCallable = YES;
  prototype.isStatement = function(){
    return !!this.statement;
  };
  prototype.traverseChildren = function(_arg, xscope){
    if (xscope) {
      return Fun.superclass.prototype.traverseChildren.apply(this, arguments);
    }
  };
  prototype.makeReturn = function(){
    if (this.statement) {
      return this.returns = true, this;
    } else {
      return Fun.superclass.prototype.makeReturn.apply(this, arguments);
    }
  };
  prototype.compileNode = function(o){
    var pscope, sscope, scope, params, body, name, tab, code, that, lines, wasEmpty, args, asns, i, p, splace, rest, dic, arg, dfv, ref, a, _ref, _len, _i;
    pscope = o.scope;
    sscope = pscope.shared || pscope;
    scope = o.scope = this.body.scope = new Scope((this.wrapper ? pscope : sscope), this.wrapper && sscope);
    scope.fun = this;
    if (this.proto) {
      scope.assign('prototype', this.proto.compile(o) + '.prototype');
    }
    if (this.plucked) {
      o.indent = this.tab = '';
    }
    o.indent += TAB;
    params = this.params, body = this.body, name = this.name, tab = this.tab;
    code = 'function';
    if (this.bound === '_this') {
      if (this.ctor) {
        scope.assign('_this', 'new _ctor');
        code += " _ctor(){} _ctor.prototype = prototype;\n" + tab + "function";
        body.add(Return(Literal('_this')));
      } else if (that = (_ref = sscope.fun) != null ? _ref.bound : void 8) {
        this.bound = that;
      } else {
        sscope.assign('_this', 'this');
      }
    }
    lines = body.lines;
    wasEmpty = !lines.length;
    args = [];
    asns = [];
    for (i = 0, _len = params.length; i < _len; ++i) {
      p = params[i];
      if (p instanceof Splat) {
        splace = i;
      } else if (p.op === '=' && !p.logic) {
        params[i] = Op('?', p.left, p.right);
      }
    }
    if (splace != null) {
      rest = params.splice(splace, 9e9);
      if (!rest[1] && rest[0].it.isEmpty()) {
        rest = 0;
      }
    } else if (!(params.length || this.wrapper)) {
      if (body.traverseChildren(function(it){
        return it.value === 'it' || null;
      })) {
        params[0] = Var('it');
      }
    }
    if (params.length) {
      dic = {};
      for (_i = 0, _len = params.length; _i < _len; ++_i) {
        p = params[_i];
        arg = p;
        if (dfv = arg.hasDefault()) {
          arg = arg.first;
        }
        if (arg.isEmpty()) {
          arg = Var(scope.temporary('arg'));
        } else if (!(arg instanceof Var)) {
          ref = Var(arg.varName() || scope.temporary('arg'));
          asns.push(Assign(arg, dfv ? Op(p.op, ref, p.second) : ref));
          arg = ref;
        } else if (dfv) {
          asns.push(Assign(arg, p.second, '=', p.op));
        }
        args.push(a = scope.add(arg.value, 'arg'));
        if (dic[0 + a] = 0 + a in dic) {
          arg.carp("duplicate formal argument \"" + a + "\"");
        }
      }
    }
    if (rest) {
      while (splace--) {
        rest.unshift(Arr());
      }
      asns.push(Assign(Arr(rest), Literal('arguments')));
    }
    if (asns.length) {
      lines.unshift.apply(lines, asns);
    }
    if (!(wasEmpty || this.ctor || this['void'])) {
      body.makeReturn();
    }
    if (this.statement) {
      name || this.carp('nameless function declaration');
      pscope === o.block.scope || this.carp('misplaced function declaration');
      scope.add(name, 'function');
      if (!this.returns) {
        pscope.add(name, 'function');
      }
      code += ' ' + name;
    }
    code += "(" + args.join(', ') + "){";
    if (lines.length) {
      code += "\n" + body.compileWithDeclarations(o) + "\n" + tab;
    }
    code += '}';
    if (this.plucked) {
      return sscope.assign(sscope.temporary('fn'), code);
    }
    if (this.ctor && '_' !== name.charAt(0)) {
      code += " " + name + ".displayName = '" + name + "';";
    }
    if (this.returns) {
      code += "\n" + tab + "return " + name + ";";
    }
    if (this.front && !this.statement) {
      return "(" + code + ")";
    } else {
      return code;
    }
  };
  return Fun;
}(Node));
exports.Class = Class = (function(_super){
  var prototype = __extends(Class, _super).prototype;
  function Class(title, sup, body){
    this.title = title;
    this.sup = sup;
    this.fun = Fun([], body);
  } Class.displayName = 'Class';
  prototype.children = ['title', 'sup', 'fun'];
  prototype.isCallable = YES;
  prototype.compile = function(o, level){
    var fun, title, lines, decl, name, vname, proto, i, node, ctor, args, clas, _len, _ref;
    fun = this.fun, title = this.title;
    lines = fun.body.lines;
    decl = title != null ? title.varName() : void 8;
    name = decl || this.name;
    if (!(name && ID.test(name))) {
      name = '_Class';
    }
    vname = Var(fun.bound = name);
    proto = null;
    fun.body.traverseChildren(function(it){
      if (it.value === 'prototype') {
        proto = vname;
      } else {
        it instanceof Fun;
        it.clas = name;
      }
    });
    for (i = 0, _len = lines.length; i < _len; ++i) {
      node = lines[i];
      if (node instanceof Obj) {
        lines[i] = Import(Var('prototype'), node);
        proto = vname;
      } else if (node instanceof Fun && !node.statement) {
        ctor && node.carp('redundant constructor');
        (ctor = node).bound && (proto = vname);
      }
    }
    ctor || lines.unshift(ctor = Fun());
    ctor.name = name;
    ctor.ctor = true;
    ctor.statement = true;
    ctor.clas = false;
    lines.push(vname);
    if (this.sup) {
      args = [this.sup];
      proto = Util.Extends(vname, (_ref = fun.params)[_ref.length] = Var('_super'));
    }
    clas = Parens(Call.make((fun.proto = proto, fun), args), true);
    if (decl && title.isComplex()) {
      clas = Assign(vname, clas);
    }
    if (title) {
      clas = Assign(title, clas);
    }
    return clas.compile(o, level);
  };
  return Class;
}(Node));
exports.Super = Super = (function(_super){
  var prototype = __extends(Super, _super).prototype;
  function Super(){} Super.displayName = 'Super';
  prototype.isAssignable = YES;
  prototype.isCallable = YES;
  prototype.compile = function(o){
    var fun, name, that;
    fun = (o.scope.shared || o.scope).fun || this.carp('stray "super"');
    if (name = fun.name) {
      if (that = fun.clas) {
        return that + '.superclass.prototype' + (ID.test(name)
          ? '.' + name
          : '[' + name + ']');
      } else if (fun.ctor || fun.statement) {
        return name + '.superclass';
      }
    }
    if (o.scope.check('_super')) {
      return '_super';
    }
    return this.carp('"super" in a nameless function');
  };
  return Super;
}(Node));
exports.Parens = Parens = (function(_super){
  var prototype = __extends(Parens, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Parens(it, keep, string){
    var _this = new _ctor;
    _this.it = it;
    _this.keep = keep;
    _this.string = string;
    return _this;
  } Parens.displayName = 'Parens';
  prototype.children = ['it'];
  prototype.show = function(){
    return this.string && '""';
  };
  prototype.delegate(['isComplex', 'isCallable', 'isArray', 'isRegex'], function(it){
    return this.it[it]();
  });
  prototype.isString = function(){
    return this.string || this.it.isString();
  };
  prototype.compile = function(o, level){
    var it;
    level == null && (level = o.level);
    it = this.it;
    if (!level && this.calling) {
      it.head['void'] = true;
    }
    if (!(this.keep || this.newed)) {
      if ((it instanceof Atom || it instanceof Chain || it instanceof Fun || it instanceof Parens || it instanceof List) || it instanceof Op && level < LEVEL_OP + (PREC[it.op] || PREC.unary)) {
        return (it.front = this.front, it).compile(o, Math.max(level, LEVEL_PAREN));
      }
    }
    if (it.isStatement()) {
      return it.compileClosure(o);
    } else {
      return "(" + it.compile(o, LEVEL_PAREN) + ")";
    }
  };
  return Parens;
}(Node));
exports.Splat = Splat = (function(_super){
  var _ref, prototype = __extends(Splat, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Splat(it){
    var _this = new _ctor;
    _this.it = it;
    return _this;
  } Splat.displayName = 'Splat';
  _ref = Parens.prototype, prototype.children = _ref.children, prototype.isComplex = _ref.isComplex;
  prototype.isAssignable = YES;
  prototype.assigns = function(it){
    return this.it.assigns(it);
  };
  prototype.compile = function(){
    return this.carp('invalid splat');
  };
  Splat.compileArray = function(o, list, apply){
    var index, node, args, atoms, _len, _i, _ref;
    for (index = 0, _len = list.length; index < _len; ++index) {
      node = list[index];
      if (node instanceof Splat) {
        break;
      }
    }
    if (index >= list.length) {
      return '';
    }
    if (!list[1]) {
      return (apply ? Object : ensureArray)(list[0].it).compile(o, LEVEL_LIST);
    }
    args = [];
    atoms = [];
    for (_i = 0, _len = (_ref = list.splice(index, 9e9)).length; _i < _len; ++_i) {
      node = _ref[_i];
      if (node instanceof Splat) {
        atoms.length && (atoms.length = !args.push(Arr(atoms)));
        args.push(ensureArray(node.it));
      } else {
        atoms.push(node);
      }
    }
    if (atoms.length) {
      args.push(Arr(atoms));
    }
    return (index
      ? Arr(list)
      : args.shift()).compile(o, LEVEL_CALL) + (".concat(" + List.compile(o, args) + ")");
  };
  function ensureArray(node){
    if (node.isArray()) {
      return node;
    }
    return Call.make(JS(utility('slice') + '.call'), [node]);
  }
  return Splat;
}(Node));
exports.Jump = Jump = (function(_super){
  var prototype = __extends(Jump, _super).prototype;
  function Jump(verb, label){
    this.verb = verb;
    this.label = label;
  } Jump.displayName = 'Jump';
  prototype.show = function(){
    var that;
    return (this.verb || '') + ((that = this.label) ? ' ' + that : '');
  };
  prototype.isStatement = YES;
  prototype.makeReturn = THIS;
  prototype.jumps = function(it){
    return !(it && (it.loop || it.block && this.verb !== 'continue')) && this;
  };
  prototype.compileNode = function(){
    return this.show() + ';';
  };
  return Jump;
}(Node));
exports.Throw = Throw = (function(_super){
  var prototype = __extends(Throw, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Throw(it){
    var _this = new _ctor;
    _this.it = it;
    return _this;
  } Throw.displayName = 'Throw';
  prototype.children = ['it'];
  prototype.jumps = NO;
  prototype.compileNode = function(o){
    return "throw " + (this.it || Literal('null')).compile(o, LEVEL_PAREN) + ";";
  };
  Jump['throw'] = Throw;
  return Throw;
}(Jump));
exports.Return = Return = (function(_super){
  var prototype = __extends(Return, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Return(it){
    var _this = new _ctor;
    if (it && it.value !== 'void') {
      _this.it = it;
    }
    return _this;
  } Return.displayName = 'Return';
  prototype.jumps = THIS;
  prototype.compileNode = function(o){
    return "return" + (this.it ? ' ' + this.it.compile(o, LEVEL_PAREN) : '') + ";";
  };
  Jump['return'] = Return;
  return Return;
}(Throw));
exports.While = While = (function(_super){
  var prototype = __extends(While, _super).prototype;
  function While(test, negated){
    this.test = test;
    this.negated = negated;
  } While.displayName = 'While';
  prototype.children = ['test', 'body'];
  prototype.aSource = 'test';
  prototype.aTarget = 'body';
  prototype.show = Negatable.show;
  prototype.isStatement = YES;
  prototype.isArray = YES;
  prototype.jumps = function(){
    var lines, context, node, _i, _len;
    lines = this.body.lines;
    if (!lines.length) {
      return;
    }
    context = {
      loop: true
    };
    for (_i = 0, _len = lines.length; _i < _len; ++_i) {
      node = lines[_i];
      if (node.jumps(context)) {
        return node;
      }
    }
  };
  prototype.addBody = function(body){
    var top;
    this.body = body;
    top = body.lines[0];
    if ((top != null ? top.verb : void 8) === 'continue' && !top.label) {
      body.lines.length = 0;
    }
    return this;
  };
  prototype.makeReturn = function(it){
    if (it) {
      this.body.makeReturn(it);
    } else {
      this.jumps() || (this.returns = true);
    }
    return this;
  };
  prototype.compileNode = function(o){
    var code;
    this.pluckDirectCalls(o);
    code = !this.test
      ? 'true'
      : (this.anaphorize(), (this.negated
        ? this.test.invert()
        : this.test).compile(o, LEVEL_PAREN));
    code = code === 'true'
      ? 'for (;;'
      : 'while (' + code;
    o.indent += TAB;
    return code + ') {' + this.compileBody(o);
  };
  prototype.compileBody = function(o){
    var lines, end, last, i, res, _ref;
    lines = this.body.lines;
    end = '}';
    if (this.returns) {
      _ref = lastNonComment(lines), last = _ref[0], i = _ref[1];
      if (last && !(last instanceof Throw)) {
        lines[i] = last.makeReturn(res = o.scope.assign('_results', '[]'));
      }
      end = "}\n" + this.tab + "return " + (res || '[]') + ";";
    }
    if (!lines.length) {
      return end;
    }
    return ("\n" + this.body.compile(o, LEVEL_TOP) + "\n") + this.tab + end;
  };
  prototype.pluckDirectCalls = function(o){
    var dig, _this = this;
    return this.body.eachChild(dig = function(it){
      var fun, call, name, _ref;
      if (!it.calling) {
        return it instanceof Fun || it instanceof While
          ? null
          : it.eachChild(dig);
      }
      _ref = it.it, fun = _ref.head, call = _ref.tails[0];
      if (fun.statement) {
        return;
      }
      if (_this instanceof For) {
        if (fun.params.length ^ call.args.length - !!call.method) {
          return;
        }
        _this.index && fun.params.push((_ref = call.args)[_ref.length] = Var(_this.index));
        if (name = _this.name) {
          call.args.push(name.isComplex() ? Var(_this.nref || (_this.nref = (_ref = _this.temps)[_ref.length] = o.scope.temporary('ref'))) : name);
          fun.params.push(name);
        }
      }
      fun.plucked = true;
    });
  };
  return While;
}(Node));
exports.For = For = (function(_super){
  var prototype = __extends(For, _super).prototype;
  function For(it){
    __importAll(this, it);
  } For.displayName = 'For';
  prototype.children = ['name', 'source', 'from', 'to', 'step', 'body'];
  prototype.aSource = null;
  prototype.show = function(){
    return this.index;
  };
  prototype.compileNode = function(o){
    var temps, idx, pvar, step, tvar, tail, vars, eq, cond, svar, srcPart, lvar, head, item, that, body, _ref;
    temps = this.temps = [];
    if (idx = this.index) {
      o.scope.declare(idx);
    } else {
      temps.push(idx = o.scope.temporary('i'));
    }
    if (!this.object) {
      _ref = (this.step || Literal(1)).compileLoopReference(o, 'step'), pvar = _ref[0], step = _ref[1];
      pvar === step || temps.push(pvar);
    }
    if (this.from) {
      _ref = this.to.compileLoopReference(o, 'to'), tvar = _ref[0], tail = _ref[1];
      vars = idx + ' = ' + this.from.compile(o);
      if (tail !== tvar) {
        vars += ', ' + tail;
        temps.push(tvar);
      }
      eq = this.op === 'til' ? '' : '=';
      cond = +pvar
        ? idx + " " + (pvar < 0 ? '>' : '<') + eq + " " + tvar
        : pvar + " < 0 ? " + idx + " >" + eq + " " + tvar + " : " + idx + " <" + eq + " " + tvar;
    } else {
      if (this.name || this.object && this.own) {
        _ref = this.source.compileLoopReference(o, 'ref', !this.object), svar = _ref[0], srcPart = _ref[1];
        svar === srcPart || temps.push(svar);
      } else {
        svar = srcPart = this.source.compile(o, LEVEL_PAREN);
      }
      if (!this.object) {
        if (0 > pvar && ~~pvar === +pvar) {
          vars = idx + " = " + srcPart + ".length - 1";
          cond = idx + " >= 0";
        } else {
          temps.push(lvar = o.scope.temporary('len'));
          vars = idx + " = 0, " + lvar + " = " + srcPart + ".length";
          cond = idx + " < " + lvar;
        }
      }
    }
    head = 'for (' + (this.object
      ? idx + " in " + srcPart
      : (step === pvar || (vars += ', ' + step), (vars + "; " + cond + "; ") + (1 == Math.abs(pvar)
        ? (pvar < 0 ? '--' : '++') + idx
        : idx + (pvar < 0
          ? ' -= ' + pvar.slice(1)
          : ' += ' + pvar))));
    this.own && (head += ") if (" + o.scope.assign('_own', '{}.hasOwnProperty') + ".call(" + svar + ", " + idx + ")");
    head += ') {';
    this.pluckDirectCalls(o);
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
    if (this.name && '}' === body.charAt(0)) {
      head += '\n' + this.tab;
    }
    return head + body;
  };
  return For;
}(While));
exports.Try = Try = (function(_super){
  var prototype = __extends(Try, _super).prototype;
  function Try(attempt, thrown, recovery, ensure){
    this.attempt = attempt;
    this.thrown = thrown != null ? thrown : '_e';
    this.recovery = recovery;
    this.ensure = ensure;
  } Try.displayName = 'Try';
  prototype.children = ['attempt', 'recovery', 'ensure'];
  prototype.show = function(){
    return this.thrown;
  };
  prototype.isStatement = YES;
  prototype.isCallable = function(){
    var _ref;
    return this.attempt.isCallable() || ((_ref = this.recovery) != null ? _ref.isCallable() : void 8);
  };
  prototype.jumps = function(it){
    var _ref;
    return this.attempt.jumps(it) || ((_ref = this.recovery) != null ? _ref.jumps(it) : void 8);
  };
  prototype.makeReturn = function(it){
    this.attempt = this.attempt.makeReturn(it);
    if (this.recovery != null) {
      this.recovery = this.recovery.makeReturn(it);
    }
    return this;
  };
  prototype.compileNode = function(o){
    var code, v;
    o.indent += TAB;
    code = "try " + this.compileBlock(o, this.attempt);
    if (this.recovery || !this.ensure) {
      o.scope.check(v = this.thrown || 'e') || o.scope.add(v, 'catch');
      code += " catch (" + v + ") " + this.compileBlock(o, this.recovery);
    }
    if (this.ensure) {
      code += " finally " + this.compileBlock(o, this.ensure);
    }
    return code;
  };
  return Try;
}(Node));
exports.Switch = Switch = (function(_super){
  var prototype = __extends(Switch, _super).prototype;
  function Switch(topic, cases, $default){
    this.topic = topic;
    this.cases = cases;
    this['default'] = $default;
  } Switch.displayName = 'Switch';
  prototype.children = ['topic', 'cases', 'default'];
  prototype.aSource = 'topic';
  prototype.aTarget = 'cases';
  prototype.isStatement = YES;
  prototype.isCallable = function(){
    var c, _i, _ref, _len;
    for (_i = 0, _len = (_ref = this.cases).length; _i < _len; ++_i) {
      c = _ref[_i];
      if (c.isCallable()) {
        return true;
      }
    }
    return (_ref = this['default']) != null ? _ref.isCallable() : void 8;
  };
  prototype.jumps = function(x){
    var c, that, _i, _ref, _len;
    x || (x = {
      block: true
    });
    for (_i = 0, _len = (_ref = this.cases).length; _i < _len; ++_i) {
      c = _ref[_i];
      if (that = c.body.jumps(x)) {
        return that;
      }
    }
    return (_ref = this['default']) != null ? _ref.jumps(x) : void 8;
  };
  prototype.makeReturn = function(it){
    var c, _i, _ref, _len;
    for (_i = 0, _len = (_ref = this.cases).length; _i < _len; ++_i) {
      c = _ref[_i];
      c.makeReturn(it);
    }
    if ((_ref = this['default']) != null) {
      _ref.makeReturn(it);
    }
    return this;
  };
  prototype.compileNode = function(o){
    var tab, topic, code, stop, i, c, that, _ref, _len;
    tab = this.tab;
    topic = !!this.topic && (this.anaphorize(), this.topic.compile(o, LEVEL_PAREN));
    code = "switch (" + topic + ") {\n";
    stop = this['default'] || this.cases.length - 1;
    for (i = 0, _len = (_ref = this.cases).length; i < _len; ++i) {
      c = _ref[i];
      code += c.compileCase(o, tab, i === stop, !topic);
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
  var prototype = __extends(Case, _super).prototype;
  function Case(tests, body){
    this.tests = tests;
    this.body = body;
  } Case.displayName = 'Case';
  prototype.children = ['tests', 'body'];
  prototype.isCallable = function(){
    return this.body.isCallable();
  };
  prototype.makeReturn = function(it){
    lastNonComment(this.body.lines)[0].value === 'fallthrough' || this.body.makeReturn(it);
    return this;
  };
  prototype.compileCase = function(o, tab, nobr, bool){
    var tests, test, t, i, that, code, last, ft, _i, _ref, _len;
    tests = [];
    for (_i = 0, _len = (_ref = this.tests).length; _i < _len; ++_i) {
      test = _ref[_i];
      if (test instanceof Arr) {
        tests.push.apply(tests, test.items);
      } else {
        tests.push(test);
      }
    }
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
    _ref = lastNonComment(this.body.lines), last = _ref[0], i = _ref[1];
    if (ft = last.value === 'fallthrough') {
      this.body.lines[i] = JS('// fallthrough');
    }
    o.indent = tab += TAB;
    if (that = this.body.compile(o, LEVEL_TOP)) {
      code += that + '\n';
    }
    if (!(nobr || ft || last instanceof Jump)) {
      code += tab + 'break;\n';
    }
    return code;
  };
  return Case;
}(Node));
exports.If = If = (function(_super){
  var prototype = __extends(If, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function If($if, then, name){
    var _this = new _ctor;
    _this['if'] = $if;
    _this.then = then;
    _this.negated = name === 'unless';
    return _this;
  } If.displayName = 'If';
  prototype.children = ['if', 'then', 'else'];
  prototype.aSource = 'if';
  prototype.aTarget = 'then';
  prototype.show = Negatable.show;
  prototype.terminator = '';
  prototype.addElse = function(it){
    if (this.chain) {
      this['else'].addElse(it);
    } else {
      this.chain = (this['else'] = it) instanceof If;
    }
    return this;
  };
  prototype.delegate(['isCallable', 'isArray', 'isString', 'isRegex'], function(it){
    var _ref;
    return ((_ref = this['else']) != null ? _ref[it]() : void 8) && this.then[it]();
  });
  prototype.jumps = function(it){
    var _ref;
    return this.then.jumps(it) || ((_ref = this['else']) != null ? _ref.jumps(it) : void 8);
  };
  prototype.makeReturn = function(it){
    this.then = this.then.makeReturn(it);
    if (this['else'] != null) {
      this['else'] = this['else'].makeReturn(it);
    }
    return this;
  };
  prototype.compileNode = function(o){
    this.anaphorize();
    this.negated && (this['if'] = this['if'].invert());
    if (o.level) {
      return this.compileExpression(o);
    } else {
      return this.compileStatement(o);
    }
  };
  prototype.compileStatement = function(o){
    var code;
    code = 'if (' + this['if'].compile(o, LEVEL_PAREN);
    o.indent += TAB;
    code += ') ' + this.compileBlock(o, Block(this.then));
    if (!this['else']) {
      return code;
    }
    return code + ' else ' + (this.chain
      ? this['else'].compile((o.indent = this.tab, o), LEVEL_TOP)
      : this.compileBlock(o, this['else']));
  };
  prototype.compileExpression = function(o){
    var code, pad, _ref;
    code = this['if'].compile(o, LEVEL_COND);
    pad = ((_ref = this['else']) != null ? _ref.isComplex() : void 8) ? '\n' + (o.indent += TAB) : ' ';
    code += pad + "? " + this.then.compile(o, LEVEL_LIST) + "" + pad + ": " + (((_ref = this['else']) != null ? _ref.compile(o, LEVEL_LIST) : void 8) || 'void 8');
    if (o.level < LEVEL_COND) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  prototype.unfoldSoak = function(){
    return this.soak && this;
  };
  If.unfoldSoak = function(o, parent, name){
    var that;
    if (that = parent[name].unfoldSoak(o)) {
      parent[name] = that.then;
      return that.then = Chain(parent), that;
    }
  };
  return If;
}(Node));
exports.Label = Label = (function(_super){
  var _ref, prototype = __extends(Label, _super).prototype;
  function Label(label, it){
    this.label = label;
    this.it = it;
  } Label.displayName = 'Label';
  _ref = Parens.prototype, prototype.children = _ref.children, prototype.isCallable = _ref.isCallable, prototype.isArray = _ref.isArray;
  prototype.show = function(){
    return this.label;
  };
  prototype.isStatement = YES;
  prototype.jumps = function(it){
    return this.it.jumps(it);
  };
  prototype.makeReturn = function(it){
    this.it = this.it.makeReturn(it);
    return this;
  };
  prototype.compileNode = function(o){
    var it;
    it = this.it;
    it.isStatement() || (it = Block(it));
    return ((this.label || '$') + ": ") + (it instanceof Block
      ? (o.indent += TAB, this.compileBlock(o, it))
      : it.compile(o));
  };
  return Label;
}(Node));
exports.JS = JS = (function(_super){
  var prototype = __extends(JS, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function JS(code, literal, comment){
    var _this = new _ctor;
    _this.code = code;
    _this.literal = literal;
    _this.comment = comment;
    return _this;
  } JS.displayName = 'JS';
  prototype.show = function(){
    if (this.comment) {
      return this.code;
    } else {
      return "`" + this.code + "`";
    }
  };
  prototype.terminator = '';
  prototype.isCallable = function(){
    return !this.comment;
  };
  prototype.isRegex = function(){
    return !this.comment && '/' === this.code.charAt(0);
  };
  prototype.compile = function(it){
    if (this.literal) {
      return entab(this.code, it.indent);
    } else {
      return this.code;
    }
  };
  return JS;
}(Node));
exports.Util = Util = (function(_super){
  var prototype = __extends(Util, _super).prototype;
  function _ctor(){} _ctor.prototype = prototype;
  function Util(verb){
    var _this = new _ctor;
    _this.verb = verb;
    return _this;
  } Util.displayName = 'Util';
  prototype.show = Jump.prototype.show;
  prototype.isCallable = YES;
  prototype.compile = function(){
    return utility(this.verb);
  };
  Util.Extends = function(){
    return Call.make(Util('extends'), [arguments[0], arguments[1]]);
  };
  return Util;
}(Node));
exports.L = function(yylineno, node){
  return node.line = yylineno + 1, node;
};
function Scope(parent, shared){
  this.parent = parent;
  this.shared = shared;
  this.variables = [];
  this.positions = {};
}
_ref = Scope.prototype;
_ref.add = function(name, type){
  var that;
  if (that = this.variables[this.positions[name]]) {
    that.type = type;
  } else {
    this.positions[name] = ~-this.variables.push({
      name: name,
      type: type
    });
  }
  return name;
};
_ref.declare = function(name){
  var that, scope, type;
  if (that = this.shared) {
    if (this.check(name)) {
      return;
    }
    scope = that;
  } else {
    scope = this;
  }
  if (!((type = scope.type(name)) && ((type === 'var' || type === 'arg') || type.value))) {
    return scope.add(name, 'var');
  }
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
  return this.add(temp, 'var');
};
_ref.free = function(it){
  return this.add(it, 'reuse');
};
_ref.check = function(name, above){
  var found, _ref;
  if ((found = this.positions[name] in this.variables) || !above) {
    return found;
  }
  return (_ref = this.parent) != null ? _ref.check(name, above) : void 8;
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
      ('_' === name.charAt(0) ? tmp : usr).push(name);
    } else if (type.value) {
      asn.push(entab(name + ' = ' + type.value, o.indent));
    }
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
  repeatString: 'function(str, n){\n  for (var r = \'\'; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;\n  return r;\n}',
  repeatArray: 'function(arr, n){\n  for (var r = []; n > 0; (n >>= 1) && (arr = arr.concat(arr)))\n    if (n & 1) r.push.apply(r, arr);\n  return r;\n}',
  split: "''.split",
  replace: "''.replace",
  toString: '{}.toString',
  join: '[].join',
  slice: '[].slice',
  indexOf: '[].indexOf || function(x){\n  for (var i = this.length; i-- && this[i] !== x;); return i;\n}'
};
LEVEL_TOP = 0;
LEVEL_PAREN = 1;
LEVEL_LIST = 2;
LEVEL_COND = 3;
LEVEL_OP = 4;
LEVEL_CALL = 5;
PREC = {
  '?': .1,
  unary: .9
};
PREC['&&'] = PREC['||'] = .2;
PREC['&'] = PREC['^'] = PREC['|'] = .3;
PREC['=='] = PREC['!='] = PREC['==='] = PREC['!=='] = .4;
PREC['<'] = PREC['>'] = PREC['<='] = PREC['>='] = PREC['in'] = PREC['instanceof'] = .5;
PREC['<<'] = PREC['>>'] = PREC['>>>'] = .6;
PREC['+'] = PREC['-'] = .7;
PREC['*'] = PREC['/'] = PREC['%'] = .8;
TAB = '  ';
ID = /^[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*$/;
SIMPLENUM = /^\d+$/;
function utility(it){
  return Scope.root.assign('__' + it, UTILITIES[it]);
}
function lastNonComment(nodes){
  var i, node;
  for (i = nodes.length - 1; i >= 0; --i) {
    node = nodes[i];
    if (!node.comment) {
      break;
    }
  }
  return [i >= 0 && node, i];
}
function entab(code, tab){
  return code.replace(/\n/g, '\n' + tab);
}