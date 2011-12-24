var Node, Negatable, Block, Atom, Literal, Var, Key, Index, Chain, Call, List, Obj, Prop, Arr, Unary, Binary, Assign, Import, Of, Existence, Fun, Class, Super, Parens, Splat, Jump, Throw, Return, While, For, Try, Switch, Case, If, Label, JS, Util, UTILITIES, LEVEL_TOP, LEVEL_PAREN, LEVEL_LIST, LEVEL_COND, LEVEL_OP, LEVEL_CALL, PREC, TAB, ID, SIMPLENUM, _ref, __slice = [].slice;
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
    if (that = this.getJump()) {
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
    return Parens(Chain((fun.wrapper = true, fun['void'] = this['void'], fun), [call]), true).compile(o);
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
    if (this instanceof Var && o.scope.check(this.value) || this instanceof Unary && ((_ref = this.op) === '+' || _ref === '-') && (-1 / 0 < (_ref = +this.it.value) && _ref < 1 / 0) || this instanceof Literal) {
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
    var base, name, _ref;
    this.children = this.aTargets;
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
    return _ref = this[this.aSource], _ref.cond = true, _ref;
  },
  carp: function(it){
    throw SyntaxError(it + " on line " + (this.line || this.traverseChildren(function(it){
      return it.line;
    })));
  },
  delegate: function(names, fn){
    var name, _i, _len;
    for (_i = 0, _len = names.length; _i < _len; ++_i) {
      name = names[_i];
      (_fn.call(this, name));
    }
    function _fn(name){
      this[name] = function(it){
        return fn.call(this, name, it);
      };
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
  assigns: NO,
  ripName: VOID,
  unfoldSoak: VOID,
  unfoldAssign: VOID,
  unwrap: THIS,
  maybeKey: THIS,
  expandSlice: THIS,
  varName: String,
  getCall: VOID,
  getDefault: VOID,
  getJump: VOID,
  invert: function(){
    return Unary('!', this, true);
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
exports.Block = Block = (function(superclass){
  Block.displayName = 'Block';
  var prototype = __extend(Block, superclass).prototype, constructor = Block;
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
  }
  prototype.children = ['lines'];
  prototype.toJSON = function(){
    delete this.back;
    return superclass.prototype.toJSON.call(this);
  };
  prototype.add = function(it){
    var that, _ref;
    switch (false) {
    case !(that = this.back):
      that.add(it);
      break;
    case !(that = it.lines):
      (_ref = this.lines).push.apply(_ref, that);
      break;
    default:
      this.lines.push(it);
      if (that = it.back, delete it.back, that) {
        this.back = that;
      }
    }
    return this;
  };
  prototype.prepend = function(){
    var lines, i, that;
    lines = this.lines;
    i = -1;
    while (that = lines[++i]) {
      if (!(that.comment || that instanceof Literal)) {
        break;
      }
    }
    lines.splice.apply(lines, [i, 0].concat(__slice.call(arguments)));
    return this;
  };
  prototype.pipe = function(it){
    this.lines.push(Assign(Var('_'), this.lines.pop()), it);
    return this;
  };
  prototype.unwrap = function(){
    if (this.lines.length === 1) {
      return this.lines[0];
    } else {
      return this;
    }
  };
  prototype.chomp = function(){
    var lines, i, that;
    lines = this.lines;
    i = lines.length;
    while (that = lines[--i]) {
      if (!that.comment) {
        break;
      }
    }
    lines.length = i + 1;
    return this;
  };
  prototype.isComplex = function(){
    var _ref;
    return this.lines.length > 1 || ((_ref = this.lines[0]) != null ? _ref.isComplex() : void 8);
  };
  prototype.delegate(['isCallable', 'isArray', 'isString', 'isRegex'], function(it){
    var _ref;
    return (_ref = (_ref = this.lines)[_ref.length - 1]) != null ? _ref[it]() : void 8;
  });
  prototype.getJump = function(it){
    var node, that, _i, _ref, _len;
    for (_i = 0, _len = (_ref = this.lines).length; _i < _len; ++_i) {
      node = _ref[_i];
      if (that = node.getJump(it)) {
        return that;
      }
    }
  };
  prototype.makeReturn = function(it){
    var that, _ref, _key, _ref2;
    if (that = (_ref2 = _ref = this.lines)[_key = _ref2.length - 1] != null ? _ref[_key] = _ref[_key].makeReturn(it) : void 8) {
      if (that instanceof Return && !that.it) {
        --this.lines.length;
      }
    }
    return this;
  };
  prototype.compile = function(o, level){
    var tab, node, code, codes, _res, _i, _ref, _len;
    level == null && (level = o.level);
    if (level) {
      return this.compileExpressions(o, level);
    }
    o.block = this;
    tab = o.indent;
    _res = [];
    for (_i = 0, _len = (_ref = this.lines).length; _i < _len; ++_i) {
      node = _ref[_i];
      node = node.unfoldSoak(o) || node;
      code = tab + (node.front = true, node).compile(o, level);
      if (node.isStatement()) {
        _res.push(code);
      } else {
        _res.push(code + node.terminator);
      }
    }
    codes = _res;
    return codes.join('\n');
  };
  prototype.compileRoot = function(options){
    var o, bare, prefix, code, _ref;
    o = (__import({
      level: LEVEL_TOP,
      scope: this.scope = Scope.root = new Scope
    }, options));
    delete o.filename;
    o.indent = (bare = o.bare, delete o.bare, bare) ? '' : TAB;
    if (/^\s*(?:[/#]|javascript:)/.test((_ref = this.lines[0]) != null ? _ref.code : void 8)) {
      prefix = this.lines.shift().code + '\n';
    }
    if ((_ref = o.repl, delete o.repl, _ref) && this.chomp().lines.length) {
      if (bare) {
        this.lines.push(Parens(this.lines.pop()));
      } else {
        this.makeReturn();
      }
    }
    code = this.compileWithDeclarations(o);
    bare || (code = "(function(){\n" + code + "\n}).call(this);\n");
    return [prefix] + code;
  };
  prototype.compileWithDeclarations = function(o){
    var pre, i, node, rest, post, that, _ref, _len;
    o.level = LEVEL_TOP;
    pre = '';
    for (i = 0, _len = (_ref = this.lines).length; i < _len; ++i) {
      node = _ref[i];
      if (!(node.comment || node instanceof Literal)) {
        break;
      }
    }
    if (i) {
      rest = this.lines.splice(i, 9e9);
      pre = this.compile(o);
      this.lines = rest;
    }
    if (!(post = this.compile(o))) {
      return pre;
    }
    return (pre && pre + "\n") + ((that = this.scope) ? that.emit(post, o.indent) : post);
  };
  prototype.compileExpressions = function(o, level){
    var lines, i, that, code, last, node, _i, _len;
    lines = this.lines;
    i = -1;
    while (that = lines[++i]) {
      if (that.comment) {
        lines.splice(i--, 1);
      }
    }
    if (!lines.length) {
      lines.push(Literal('void'));
    }
    lines[0].front = this.front;
    lines[lines.length - 1]['void'] = this['void'];
    if (!lines[1]) {
      return lines[0].compile(o, level);
    }
    code = '';
    last = lines.pop();
    for (_i = 0, _len = lines.length; _i < _len; ++_i) {
      node = lines[_i];
      code += (node['void'] = true, node).compile(o, LEVEL_PAREN) + ', ';
    }
    code += last.compile(o, LEVEL_PAREN);
    if (level < LEVEL_LIST) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  return Block;
}(Node));
Atom = (function(superclass){
  Atom.displayName = 'Atom';
  var prototype = __extend(Atom, superclass).prototype, constructor = Atom;
  prototype.show = function(){
    return this.value;
  };
  prototype.isComplex = NO;
  function Atom(){}
  return Atom;
}(Node));
exports.Literal = Literal = (function(superclass){
  Literal.displayName = 'Literal';
  var prototype = __extend(Literal, superclass).prototype, constructor = Literal;
  function _ctor(){} _ctor.prototype = prototype;
  function Literal(value){
    var _this = new _ctor;
    _this.value = value;
    if (value.js) {
      return JS(value + "", true);
    }
    if (value === 'super') {
      return new Super;
    }
    return _this;
  }
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
  prototype.isComplex = prototype.isRegex = function(){
    return (this.value + "").charAt() === '/';
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
exports.Var = Var = (function(superclass){
  Var.displayName = 'Var';
  var prototype = __extend(Var, superclass).prototype, constructor = Var;
  function _ctor(){} _ctor.prototype = prototype;
  function Var(value){
    var _this = new _ctor;
    _this.value = value;
    return _this;
  }
  prototype.isAssignable = prototype.isCallable = YES;
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
exports.Key = Key = (function(superclass){
  Key.displayName = 'Key';
  var prototype = __extend(Key, superclass).prototype, constructor = Key;
  function _ctor(){} _ctor.prototype = prototype;
  function Key(name, reserved){
    var _this = new _ctor;
    _this.reserved = reserved || name.reserved;
    _this.name = '' + name;
    return _this;
  }
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
exports.Index = Index = (function(superclass){
  Index.displayName = 'Index';
  var prototype = __extend(Index, superclass).prototype, constructor = Index;
  function _ctor(){} _ctor.prototype = prototype;
  function Index(key, symbol, init){
    var k, _this = new _ctor;
    symbol || (symbol = '.');
    if (init && key instanceof Arr) {
      switch (key.items.length) {
      case 0:
        key = Key('__proto__');
        break;
      case 1:
        if (!((k = key.items[0]) instanceof Splat)) {
          key = Parens(k);
        }
      }
    }
    switch (symbol.slice(-1)) {
    case '=':
      _this.assign = symbol.slice(1);
      break;
    case '@':
      _this.vivify = symbol.length > 2 ? Arr : Obj;
    }
    _this.key = key;
    _this.symbol = symbol;
    return _this;
  }
  prototype.children = ['key'];
  prototype.show = function(){
    return (this.soak || '') + this.symbol;
  };
  prototype.isComplex = function(){
    return this.key.isComplex();
  };
  prototype.varName = function(){
    var _ref;
    return ((_ref = this.key) instanceof Key || _ref instanceof Literal) && this.key.varName();
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
exports.Chain = Chain = (function(superclass){
  Chain.displayName = 'Chain';
  var prototype = __extend(Chain, superclass).prototype, constructor = Chain;
  function _ctor(){} _ctor.prototype = prototype;
  function Chain(head, tails){
    var _this = new _ctor;
    if (!tails && head instanceof Chain) {
      return head;
    }
    _this.head = head;
    _this.tails = tails || [];
    return _this;
  }
  prototype.children = ['head', 'tails'];
  prototype.add = function(it){
    var that, _ref;
    if (this.head instanceof Existence) {
      _ref = Chain(this.head.it), this.head = _ref.head, this.tails = _ref.tails;
      it.soak = true;
    }
    this.tails.push(it);
    if (it instanceof Call && !it.method && this.head instanceof Super) {
      it.method = '.call';
      it.args.unshift(Literal('this'));
    } else if (that = it.vivify, delete it.vivify, that) {
      this.head = Assign(Chain(this.head, this.tails.splice(0, 9e9)), that(), '=', '||');
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
  prototype.delegate(['getJump', 'assigns', 'isStatement', 'isString'], function(it, arg){
    return !this.tails.length && this.head[it](arg);
  });
  prototype.isComplex = function(){
    return this.tails.length || this.head.isComplex();
  };
  prototype.isCallable = function(){
    var that, _ref;
    if (that = (_ref = this.tails)[_ref.length - 1]) {
      return !((_ref = that.key) != null && _ref.items);
    } else {
      return this.head.isCallable();
    }
  };
  prototype.isArray = function(){
    var that, _ref;
    if (that = (_ref = this.tails)[_ref.length - 1]) {
      return that.key instanceof Arr;
    } else {
      return this.head.isArray();
    }
  };
  prototype.isRegex = function(){
    return this.head.value === 'RegExp' && !this.tails[1] && this.tails[0] instanceof Call;
  };
  prototype.isAssignable = function(){
    var tail, _ref, _i, _len;
    if (!(tail = (_ref = this.tails)[_ref.length - 1])) {
      return this.head.isAssignable();
    }
    if (!(tail instanceof Index) || tail.key instanceof List) {
      return false;
    }
    for (_i = 0, _len = (_ref = this.tails).length; _i < _len; ++_i) {
      tail = _ref[_i];
      if (tail.assign) {
        return false;
      }
    }
    return true;
  };
  prototype.isSimpleAccess = function(){
    return this.tails.length === 1 && !this.head.isComplex() && !this.tails[0].isComplex();
  };
  prototype.makeReturn = function(it){
    if (this.tails.length) {
      return superclass.prototype.makeReturn.apply(this, arguments);
    } else {
      return this.head.makeReturn(it);
    }
  };
  prototype.getCall = function(){
    var tail, _ref;
    return (tail = (_ref = this.tails)[_ref.length - 1]) instanceof Call && tail;
  };
  prototype.varName = function(){
    var _ref;
    return (_ref = (_ref = this.tails)[_ref.length - 1]) != null ? _ref.varName() : void 8;
  };
  prototype.cacheReference = function(o){
    var name, base, ref, bref, nref, _ref;
    name = (_ref = this.tails)[_ref.length - 1];
    if (name instanceof Call) {
      return this.cache(o, true);
    }
    if (this.tails.length < 2 && !this.head.isComplex() && !(name != null && name.isComplex())) {
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
    var head, tails, that, base, rest, news, t, _i, _ref, _len;
    head = this.head, tails = this.tails;
    head.front = this.front;
    head.newed = this.newed;
    if (!tails.length) {
      return head.compile(o);
    }
    if (that = this.unfoldAssign(o)) {
      return that.compile(o);
    }
    if (tails[0] instanceof Call && !head.isCallable()) {
      this.carp('invalid callee');
    }
    this.expandSlice(o);
    this.expandBind(o);
    this.expandSplat(o);
    this.expandStar(o);
    if (!this.tails.length) {
      return this.head.compile(o);
    }
    base = this.head.compile(o, LEVEL_CALL);
    news = rest = '';
    for (_i = 0, _len = (_ref = this.tails).length; _i < _len; ++_i) {
      t = _ref[_i];
      if (t['new']) {
        news += 'new ';
      }
      rest += t.compile(o);
    }
    if ('.' === rest.charAt(0) && SIMPLENUM.test(base)) {
      base += ' ';
    }
    return news + base + rest;
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
          ? (_ref2 = bust.cacheReference(o), test = _ref2[0], this.head = _ref2[1], JS("typeof " + test.compile(o, LEVEL_OP) + " == 'function'"))
          : (i && node.assign
            ? (_ref2 = bust.cacheReference(o), test = _ref2[0], bust = _ref2[1], this.head = bust.head, (_ref2 = this.tails).unshift.apply(_ref2, bust.tails))
            : (_ref2 = bust.unwrap().cache(o, true), test = _ref2[0], this.head = _ref2[1]), Existence(test));
        return _ref2 = If(test, this), _ref2.soak = true, _ref2.cond = this.cond, _ref2['void'] = this['void'], _ref2;
      }
    }
  };
  prototype.unfoldAssign = function(o){
    var that, i, index, op, left, lefts, rites, node, _ref, _len, _len2, _ref2;
    if (that = this.head.unfoldAssign(o)) {
      (_ref = that.right.tails).push.apply(_ref, this.tails);
      return that;
    }
    for (i = 0, _len = (_ref = this.tails).length; i < _len; ++i) {
      index = _ref[i];
      if (op = index.assign) {
        index.assign = '';
        left = Chain(this.head, this.tails.splice(0, i)).expandSlice(o).unwrap();
        if (left instanceof Arr) {
          lefts = left.items;
          rites = (this.head = Arr()).items;
          for (i = 0, _len2 = lefts.length; i < _len2; ++i) {
            node = lefts[i];
            _ref2 = Chain(node).cacheReference(o), rites[i] = _ref2[0], lefts[i] = _ref2[1];
          }
        } else {
          _ref2 = Chain(left).cacheReference(o), left = _ref2[0], this.head = _ref2[1];
        }
        return _ref2 = Assign(left, this, op), _ref2.access = true, _ref2;
      }
    }
  };
  prototype.expandSplat = function(o){
    var tails, i, call, args, ctx, _ref;
    tails = this.tails;
    i = -1;
    while (call = tails[++i]) {
      if (!(args = call.args)) {
        continue;
      }
      ctx = call.method === '.call' && (args = args.concat()).shift();
      if (!(args = Splat.compileArray(o, args, true))) {
        continue;
      }
      if (call['new']) {
        this.carp('splatting "new"');
      }
      if (!ctx && tails[i - 1] instanceof Index) {
        _ref = Chain(this.head, tails.splice(0, i - 1)).cache(o, true), this.head = _ref[0], ctx = _ref[1];
        i = 0;
      }
      call.method = '.apply';
      call.args = [ctx || Literal('null'), JS(args)];
    }
  };
  prototype.expandBind = function(o){
    var tails, i, that, obj, key, call;
    tails = this.tails;
    i = -1;
    while (that = tails[++i]) {
      if (that.symbol !== '.~') {
        continue;
      }
      that.symbol = '';
      obj = Chain(this.head, tails.splice(0, i)).unwrap();
      key = tails.shift().key;
      call = Call.make(Util('bind'), [obj, (key.reserved = true, key)]);
      this.head = this.newed ? Parens(call, true) : call;
      i = -1;
    }
  };
  prototype.expandStar = function(o){
    var tails, i, that, stars, sub, ref, temps, value, star, _ref, _i, _len;
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
      value = Chain(ref, [Index(Key('length'))]).compile(o);
      for (_i = 0, _len = stars.length; _i < _len; ++_i) {
        star = stars[_i];
        star.value = value;
        star.isAssignable = YES;
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
  prototype.expandSlice = function(o, assign){
    var tails, i, tail, _ref, _;
    tails = this.tails;
    i = -1;
    while (tail = tails[++i]) {
      if ((_ref = tail.key) != null && _ref.items) {
        if (tails[i + 1] instanceof Call) {
          tail.carp('calling a slice');
        }
        _ = tails.splice(0, i + 1);
        _ = _.pop().key.toSlice(o, Chain(this.head, _).unwrap(), assign);
        this.head = (_.front = this.front, _);
        i = -1;
      }
    }
    return this;
  };
  return Chain;
}(Node));
exports.Call = Call = (function(superclass){
  Call.displayName = 'Call';
  var prototype = __extend(Call, superclass).prototype, constructor = Call;
  function _ctor(){} _ctor.prototype = prototype;
  function Call(args){
    var _this = new _ctor;
    args || (args = []);
    if (args.length === 1 && args[0].filler) {
      _this.method = '.call';
      args[0] = Literal('this');
      args[1] = Splat(Literal('arguments'));
    }
    _this.args = args;
    return _this;
  }
  prototype.children = ['args'];
  prototype.show = function(){
    return [this['new']] + [this.method] + [this.soak ? '?' : void 8];
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
  Call.back = function(params, node, bound){
    var noret, args, index, a, _len, _ref;
    if (noret = node.op === '!') {
      node = node.it;
    }
    args = (node.getCall() || (node = Chain(node).add(Call())).getCall()).args;
    for (index = 0, _len = args.length; index < _len; ++index) {
      a = args[index];
      if (a.filler) {
        break;
      }
    }
    return node.back = (args[index] = (_ref = Fun(params, void 8, bound), _ref['void'] = noret, _ref)).body, node;
  };
  Call['let'] = function(args, body){
    var i, a, params, _res, _len;
    _res = [];
    for (i = 0, _len = args.length; i < _len; ++i) {
      a = args[i];
      if (a.op === '=' && !a.logic) {
        args[i] = a.right;
        _res.push(a.left);
      } else {
        _res.push(Var(a.varName() || a.carp('invalid "let" argument')));
      }
    }
    params = _res;
    args.unshift(Literal('this'));
    return this.block(Fun(params, body), args, '.call');
  };
  return Call;
}(Node));
List = (function(superclass){
  List.displayName = 'List';
  var prototype = __extend(List, superclass).prototype, constructor = List;
  prototype.children = ['items'];
  prototype.show = function(){
    return this.name;
  };
  prototype.named = function(name){
    this.name = name;
    return this;
  };
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
  function List(){}
  return List;
}(Node));
exports.Obj = Obj = (function(superclass){
  Obj.displayName = 'Obj';
  var prototype = __extend(Obj, superclass).prototype, constructor = Obj;
  function _ctor(){} _ctor.prototype = prototype;
  function Obj(items){
    var _this = new _ctor;
    _this.items = items || [];
    return _this;
  }
  prototype.asObj = THIS;
  prototype.toSlice = function(o, base, assign){
    var items, ref, temps, i, node, name, chain, logic, key, val, _ref, _len;
    items = this.items;
    if (items.length > 1) {
      _ref = base.cache(o), base = _ref[0], ref = _ref[1], temps = _ref[2];
    } else {
      ref = base;
    }
    for (i = 0, _len = items.length; i < _len; ++i) {
      node = items[i];
      if (node.comment) {
        continue;
      }
      if (node instanceof Prop || node instanceof Splat) {
        node[name = (_ref = node.children)[_ref.length - 1]] = chain = Chain(base, [Index(node[name].maybeKey())]);
      } else {
        if (logic = node.getDefault()) {
          node = node.first;
        }
        if (node instanceof Parens) {
          _ref = node.cache(o, true), key = _ref[0], node = _ref[1];
          if (assign) {
            _ref = [node, key], key = _ref[0], node = _ref[1];
          }
          key = Parens(key);
        } else {
          key = node;
        }
        val = chain = Chain(base, [Index(node.maybeKey())]);
        if (logic) {
          val = (logic.first = val, logic);
        }
        items[i] = Prop(key, val);
      }
      base = ref;
    }
    chain || this.carp('empty slice');
    if (temps) {
      (chain.head = Var(temps[0])).temp = true;
    }
    return this;
  };
  prototype.compileNode = function(o){
    var items, code, idt, dic, i, node, logic, rest, multi, key, val, _len;
    items = this.items;
    if (!items.length) {
      return this.front ? '({})' : '{}';
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
      if (logic = node.getDefault()) {
        node = node.first;
      }
      if (node instanceof Splat || (node.key || node) instanceof Parens) {
        rest = items.slice(i);
        break;
      }
      if (logic) {
        if (node instanceof Prop) {
          node.val = (logic.first = node.val, logic);
        } else {
          node = Prop(node, (logic.first = node, logic));
        }
      }
      if (multi) {
        code += ',';
      } else {
        multi = true;
      }
      code += idt + (node instanceof Prop
        ? (key = node.key, val = node.val, val.accessor
          ? (key = (val.params.length ? val['void'] = 'set' : 'get') + "\ " + key.compile(o), key + val.compile(o, LEVEL_LIST).slice(8))
          : (val.ripName(key), (key = key.compile(o)) + ": " + val.compile(o, LEVEL_LIST)))
        : (key = node.compile(o)) + ": " + key);
      if (!(dic[0 + key] ^= 1)) {
        node.carp("duplicate property name \"" + key + "\"");
      }
    }
    code = "{" + (code && code + '\n' + this.tab) + "}";
    rest && (code = Import(JS(code), Obj(rest)).compile((o.indent = this.tab, o)));
    if (this.front && '{' === code.charAt()) {
      return "(" + code + ")";
    } else {
      return code;
    }
  };
  return Obj;
}(List));
exports.Prop = Prop = (function(superclass){
  Prop.displayName = 'Prop';
  var prototype = __extend(Prop, superclass).prototype, constructor = Prop;
  function _ctor(){} _ctor.prototype = prototype;
  function Prop(key, val){
    var _this = new _ctor;
    _this.key = key;
    if (val.op === '~' && val.it instanceof Fun) {
      (val = val.it)['accessor'] = 'accessor';
    }
    _this.val = val;
    return _this;
  }
  prototype.children = ['key', 'val'];
  prototype.show = function(){
    return this.val.accessor;
  };
  prototype.assigns = function(it){
    return this.val.assigns(it);
  };
  return Prop;
}(Node));
exports.Arr = Arr = (function(superclass){
  Arr.displayName = 'Arr';
  var prototype = __extend(Arr, superclass).prototype, constructor = Arr;
  function _ctor(){} _ctor.prototype = prototype;
  function Arr(items){
    var _this = new _ctor;
    _this.items = items || [];
    return _this;
  }
  prototype.isArray = YES;
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
  prototype.toSlice = function(o, base){
    var items, ref, i, item, splat, chain, _ref, _len;
    items = this.items;
    if (items.length > 1) {
      _ref = base.cache(o), base = _ref[0], ref = _ref[1];
    } else {
      ref = base;
    }
    for (i = 0, _len = items.length; i < _len; ++i) {
      item = items[i];
      if (splat = item instanceof Splat) {
        item = item.it;
      }
      if (item.isEmpty()) {
        continue;
      }
      chain = Chain(base, [Index(item)]);
      items[i] = splat ? Splat(chain) : chain;
      base = ref;
    }
    chain || this.carp('empty slice');
    return this;
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
    return constructor(nodes);
  };
  Arr.wrap = function(it){
    return constructor([Splat((it.isArray = YES, it))]);
  };
  return Arr;
}(List));
exports.Unary = Unary = (function(superclass){
  Unary.displayName = 'Unary';
  var prototype = __extend(Unary, superclass).prototype, constructor = Unary;
  function _ctor(){} _ctor.prototype = prototype;
  function Unary(op, it, flag){
    var that, node, _i, _ref, _len, _this = new _ctor;
    if (that = !flag && it.unaries) {
      that.push(op);
      return it;
    }
    switch (op) {
    case '!':
      if (!flag) {
        return it.invert();
      }
      if (it instanceof Fun) {
        return it['void'] = true, it;
      }
      break;
    case '++':
    case '--':
      if (flag) {
        _this.post = true;
      }
      break;
    case 'new':
      if (it instanceof Existence && !it.negated) {
        it = Chain(it).add(Call());
      }
      it.newed = true;
      for (_i = 0, _len = (_ref = it.tails || '').length; _i < _len; ++_i) {
        node = _ref[_i];
        if (node instanceof Call && !node['new']) {
          if (node.method === '.call') {
            node.args.shift();
          }
          node['new'] = 'new';
          node.method = '';
          return it;
        }
      }
      break;
    case '~':
      if (it instanceof Fun && it.statement && !it.bound) {
        return it.bound = '_this', it;
      }
    }
    _this.op = op;
    _this.it = it;
    return _this;
  }
  prototype.children = ['it'];
  prototype.show = function(){
    return [this.post ? '@' : void 8] + this.op;
  };
  prototype.isCallable = function(){
    var _ref;
    return (_ref = this.op) === 'do' || _ref === 'new' || _ref === 'delete';
  };
  prototype.isArray = function(){
    return this.it instanceof Arr && this.it.items.length || this.it instanceof Chain && this.it.isArray();
  };
  prototype.isString = function(){
    var _ref;
    return (_ref = this.op) === 'typeof' || _ref === 'classof';
  };
  prototype.invert = function(){
    var _ref;
    if (this.op === '!' && ((_ref = this.it.op) === '!' || _ref === '<' || _ref === '>' || _ref === '<=' || _ref === '>=' || _ref === 'in' || _ref === 'instanceof')) {
      return this.it;
    }
    return constructor('!', this, true);
  };
  prototype.unfoldSoak = function(o){
    var _ref;
    return ((_ref = this.op) === '++' || _ref === '--' || _ref === 'delete') && If.unfoldSoak(o, this, 'it');
  };
  function crement(it){
    return {
      '++': 'in',
      '--': 'de'
    }[it] + 'crement';
  }
  prototype.compileNode = function(o){
    var that, op, it, code, _;
    if (that = this.compileSpread(o)) {
      return that;
    }
    op = this.op, it = this.it;
    switch (op) {
    case '!':
      it.cond = true;
      break;
    case 'new':
      it.isCallable() || it.carp('invalid constructor');
      break;
    case 'do':
      _ = Parens(it instanceof Existence && !it.negated
        ? Chain(it).add(Call())
        : Call.make(it));
      return (_.front = this.front, _.newed = this.newed, _).compile(o);
    case 'delete':
      if (it instanceof Var || !it.isAssignable()) {
        this.carp('invalid delete');
      }
      if (o.level && !this['void']) {
        return this.compilePluck(o);
      }
      break;
    case '++':
    case '--':
      it.isAssignable() || this.carp('invalid ' + crement(op));
      if (it instanceof Var && !o.scope.check(it.value, true)) {
        this.carp(crement(op) + " of undeclared variable \"" + it.value + "\"");
      }
      if (this.post) {
        it.front = this.front;
      }
      break;
    case '^':
      return utility('clone') + "(" + it.compile(o, LEVEL_LIST) + ")";
    case 'classof':
      return utility('toString') + ".call(" + it.compile(o, LEVEL_LIST) + ").slice(8, -1)";
    }
    code = it.compile(o, LEVEL_OP + PREC.unary);
    if (this.post) {
      code += op;
    } else {
      if ((op === 'new' || op === 'typeof' || op === 'delete') || (op === '+' || op === '-') && op === code.charAt()) {
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
  prototype.compileSpread = function(o){
    var it, ops, them, i, node, sp, op, lat, _len, _i, _ref;
    it = this.it;
    ops = [this];
    for (; it instanceof constructor; it = it.it) {
      ops.push(it);
    }
    if (!((it = it.expandSlice(o).unwrap()) instanceof Arr && (them = it.items).length)) {
      return '';
    }
    for (i = 0, _len = them.length; i < _len; ++i) {
      node = them[i];
      if (sp = node instanceof Splat) {
        node = node.it;
      }
      for (_i = ops.length - 1; _i >= 0; --_i) {
        op = ops[_i];
        node = constructor(op.op, node, op.post);
      }
      them[i] = sp ? lat = Splat(node) : node;
    }
    if (!lat && (this['void'] || !o.level)) {
      it = (_ref = __clone(Block.prototype), _ref.lines = them, _ref.front = this.front, _ref['void'] = true, _ref);
    }
    return it.compile(o, LEVEL_PAREN);
  };
  prototype.compilePluck = function(o){
    var get, del, ref, code, _ref;
    _ref = Chain(this.it).cacheReference(o), get = _ref[0], del = _ref[1];
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
  return Unary;
}(Node));
exports.Binary = Binary = (function(superclass){
  Binary.displayName = 'Binary';
  var EQUALITY, COMPARER, prototype = __extend(Binary, superclass).prototype, constructor = Binary;
  function _ctor(){} _ctor.prototype = prototype;
  function Binary(op, first, second){
    var _this = new _ctor;
    switch (op) {
    case 'of':
      return new Of(first, second);
    case '+':
      if (first instanceof Arr) {
        first.items.push(Splat(second));
        return first;
      }
      if (second instanceof Arr || second instanceof While && (second = Arr([Splat(second)]))) {
        second.items.unshift(Splat(first));
        return second;
      }
    }
    _this.op = op;
    _this.first = first;
    _this.second = second;
    return _this;
  }
  prototype.children = ['first', 'second'];
  prototype.show = function(){
    return this.op;
  };
  prototype.isCallable = function(){
    var _ref;
    return ((_ref = this.op) === '&&' || _ref === '||' || _ref === '?' || _ref === '!?') && this.first.isCallable() && this.second.isCallable();
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
    switch (this.op) {
    case '+':
    case '*':
      return this.first.isString() || this.second.isString();
    case '-':
      return this.second.isMatcher();
    }
  };
  EQUALITY = /^[!=]==?$/;
  COMPARER = /^(?:[!=]=|[<>])=?$/;
  prototype.invert = function(){
    var op;
    if (EQUALITY.test(op = this.op) && !COMPARER.test(this.second.op)) {
      this.op = '!='.charAt(op.indexOf('=')) + op.slice(1);
      return this;
    }
    return Unary('!', Parens(this), true);
  };
  prototype.getDefault = function(){
    switch (this.op) {
    case '?':
    case '||':
    case '&&':
    case '!?':
      return this;
    }
  };
  prototype.compileNode = function(o){
    var top, rite, items, level, code;
    switch (this.op) {
    case '?':
    case '!?':
      return this.compileExistence(o);
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
    case '**':
      return this.compilePow(o);
    case '<?':
    case '>?':
      return this.compileMinMax(o);
    case '&&':
    case '||':
      if (top = this['void'] || !o.level) {
        this.second['void'] = true;
      }
      if (top || this.cond) {
        this.first.cond = true;
        this.second.cond = true;
      }
      break;
    case 'instanceof':
      rite = this.second.expandSlice(o).unwrap(), items = rite.items;
      if (rite instanceof Arr) {
        if (items[1]) {
          return this.compileAnyInstanceOf(o, items);
        }
        this.second = items[0] || rite;
      }
      this.second.isCallable() || this.second.carp('invalid instanceof operand');
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
    var _ref, _;
    if (this.op === '!?') {
      _ = (_ref = If(Existence(this.first), this.second), _ref.cond = this.cond, _ref['void'] = this['void'] || !o.level, _ref);
      return _.compileExpression(o);
    }
    if (this['void'] || !o.level) {
      _ = Binary('&&', Existence(this.first, true), this.second);
      return (_['void'] = true, _).compileNode(o);
    }
    _ = this.first.cache(o, true);
    return If(Existence(_[0]), _[1]).addElse(this.second).compileExpression(o);
  };
  prototype.compileAnyInstanceOf = function(o, items){
    var sub, ref, test, item, _ref, _i, _len;
    _ref = this.first.cache(o), sub = _ref[0], ref = _ref[1], this.temps = _ref[2];
    test = Binary('instanceof', sub, items.shift());
    for (_i = 0, _len = items.length; _i < _len; ++_i) {
      item = items[_i];
      test = Binary('||', test, Binary('instanceof', ref, item));
    }
    return Parens(test).compile(o);
  };
  prototype.compileMinMax = function(o){
    var lefts, rites, _;
    lefts = this.first.cache(o, true);
    rites = this.second.cache(o, true);
    _ = Binary(this.op.charAt(), lefts[0], rites[0]);
    return If(_, lefts[1]).addElse(rites[1]).compileExpression(o);
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
    if (((that = items && Splat.compileArray(o, items)) && (x = JS(that))) || !(n instanceof Literal && n.value < 0x20)) {
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
  return Binary;
}(Node));
exports.Assign = Assign = (function(superclass){
  Assign.displayName = 'Assign';
  var prototype = __extend(Assign, superclass).prototype, constructor = Assign;
  function _ctor(){} _ctor.prototype = prototype;
  function Assign(left, rite, op, logic){
    var _this = new _ctor;
    _this.left = left;
    _this.op = op || '=';
    _this.logic = logic || _this.op.logic;
    _this.op += '';
    _this[rite instanceof Node ? 'right' : 'unaries'] = rite;
    return _this;
  }
  prototype.children = ['left', 'right'];
  prototype.show = function(){
    return (this.logic || '') + this.op;
  };
  prototype.assigns = function(it){
    return this.left.assigns(it);
  };
  prototype.delegate(['isCallable', 'isRegex'], function(it){
    var _ref;
    return ((_ref = this.op) === '=' || _ref === ':=') && this.right[it]();
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
    var that, rite, temps, _ref;
    if (this.left instanceof Existence) {
      if (that = (_ref = this.left = this.left.it).name, delete _ref.name, that) {
        rite = this.right;
        rite = Assign(this.right = Var(that), rite);
      } else {
        _ref = this.right.cache(o), rite = _ref[0], this.right = _ref[1], temps = _ref[2];
      }
      return _ref = If(Existence(rite), this), _ref.temps = temps, _ref.cond = this.cond, _ref['void'] = this['void'], _ref;
    }
    return If.unfoldSoak(o, this, 'left');
  };
  prototype.unfoldAssign = function(){
    return this.access && this;
  };
  prototype.compileNode = function(o){
    var left, op, right, reft, lvar, sign, name, res, code, del, that, _ref, _i, _len;
    left = this.left.expandSlice(o, true).unwrap();
    if (!this.right) {
      left.isAssignable() || left.carp('invalid unary assign');
      _ref = Chain(left).cacheReference(o), left = _ref[0], this.right = _ref[1];
      for (_i = 0, _len = (_ref = this.unaries).length; _i < _len; ++_i) {
        op = _ref[_i];
        this.right = Unary(op, this.right);
      }
    }
    if (left.isEmpty()) {
      return (_ref = Parens(this.right), _ref.front = this.front, _ref.newed = this.newed, _ref).compile(o);
    }
    if (left.items) {
      return this.compileDestructuring(o, left);
    }
    if (this.logic) {
      return this.compileConditional(o, left);
    }
    op = this.op, right = this.right;
    if (left.getDefault()) {
      right = Binary(left.op, right, left.second);
      left = left.first;
    }
    left.isAssignable() || left.carp('invalid assign');
    if (op === '<?=' || op === '>?=') {
      return this.compileMinMax(o, left, right);
    }
    if (op === '**=' || op === '+=' && (right instanceof Arr || right instanceof While) || op === '*=' && right.isString() || (op === '-=' || op === '/=') && right.isMatcher()) {
      _ref = Chain(left).cacheReference(o), left = _ref[0], reft = _ref[1];
      right = Binary(op.slice(0, -1), reft, right);
      op = ':=';
    }
    while (right instanceof Parens && !right.keep) {
      right = right.it;
    }
    right.ripName(left = left.unwrap());
    lvar = left instanceof Var;
    sign = op.replace(':', '');
    name = (left.front = true, left).compile(o, LEVEL_LIST);
    code = !o.level && right instanceof While && !right['else'] && (lvar || left.isSimpleAccess())
      ? (res = o.scope.temporary('res')) + " = [];\n" + this.tab + right.makeReturn(res).compile(o) + "\n" + this.tab + name + " " + sign + " " + o.scope.free(res)
      : (name + " " + sign + " ") + (right.assigned = true, right).compile(o, LEVEL_LIST);
    if (lvar) {
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
    var lefts, morph, _ref;
    if (left instanceof Var && ((_ref = this.logic) === '?' || _ref === '!?') && this.op === '=') {
      o.scope.declare(left.value);
    }
    lefts = Chain(left).cacheReference(o);
    morph = Binary(this.logic, lefts[0], (this.logic = false, this.left = lefts[1], this));
    return (morph['void'] = this['void'], morph).compileNode(o);
  };
  prototype.compileMinMax = function(o, left, right){
    var lefts, rites, test, put, _ref;
    lefts = Chain(left).cacheReference(o);
    rites = right.cache(o, true);
    test = Binary(this.op.replace('?', ''), lefts[0], rites[0]);
    put = Assign(lefts[1], rites[1], ':=');
    if (this['void'] || !o.level) {
      return Parens(Binary('||', test, put)).compile(o);
    }
    _ref = test.second.cache(o, true), test.second = _ref[0], left = _ref[1];
    return If(test, left).addElse(put).compileExpression(o);
  };
  prototype.compileDestructuring = function(o, left){
    var items, len, ret, rite, that, cache, rref, list, code;
    items = left.items;
    len = items.length;
    ret = o.level && !this['void'];
    rite = this.right.compile(o, len === 1 ? LEVEL_CALL : LEVEL_LIST);
    if (that = left.name) {
      cache = that + " = " + rite;
      o.scope.declare(rite = that);
    } else if ((ret || len > 1) && (!ID.test(rite) || left.assigns(rite))) {
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
    var i, node, skip, len, val, ivar, start, inc, rcache, _len, _ref, _results = [];
    for (i = 0, _len = nodes.length; i < _len; ++i) {
      node = nodes[i];
      if (node.isEmpty()) {
        continue;
      }
      if (node instanceof Splat) {
        len && node.carp('multiple splat in an assignment');
        skip = (node = node.it).isEmpty();
        if (i + 1 === (len = nodes.length)) {
          if (skip) {
            break;
          }
          val = Arr.wrap(JS(utility('slice') + '.call(' + rite + (i ? ", " + i + ")" : ')')));
        } else {
          val = ivar = rite + ".length - " + (len - i - 1);
          if (skip && i + 2 === len) {
            continue;
          }
          start = i + 1;
          this.temps = [ivar = o.scope.temporary('i')];
          val = skip
            ? (node = Var(ivar), Var(val))
            : Arr.wrap(JS(i + " < (" + ivar + " = " + val + ")\ ? " + utility('slice') + ".call(" + rite + ", " + i + ", " + ivar + ")\ : (" + ivar + " = " + i + ", [])"));
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
      if (logic = node.getDefault()) {
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
  return Assign;
}(Node));
exports.Import = Import = (function(superclass){
  Import.displayName = 'Import';
  var prototype = __extend(Import, superclass).prototype, constructor = Import;
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
  }
  prototype.children = ['left', 'right'];
  prototype.show = function(){
    return this.all;
  };
  prototype.delegate(['isCallable', 'isArray'], function(it){
    return this.left[it]();
  });
  prototype.unfoldSoak = function(o){
    var left, temps, _ref;
    left = this.left;
    if (left instanceof Existence && !left.negated) {
      _ref = left.it.cache(o), left.it = _ref[0], this.left = _ref[1], temps = _ref[2];
      if (temps) {
        left = left.it;
      }
      return _ref = If(left, this), _ref.temps = temps, _ref.soak = true, _ref.cond = this.cond, _ref['void'] = this['void'], _ref;
    }
    return If.unfoldSoak(o, this, 'left') || (this['void'] || !o.level) && If.unfoldSoak(o, this, 'right');
  };
  prototype.compileNode = function(o){
    var right;
    right = this.right;
    if (!this.all) {
      if (right instanceof Chain) {
        right = right.unfoldSoak(o) || right.unfoldAssign(o) || right.expandSlice(o).unwrap();
      }
      if (right instanceof List) {
        return this.compileAssign(o, right.asObj().items);
      }
    }
    return Call.make(Util("import" + (this.all || '')), [this.left, right]).compileNode(o);
  };
  prototype.compileAssign = function(o, items){
    var top, reft, left, delim, space, code, i, node, com, logic, dyna, key, val, _ref, _len;
    if (!items.length) {
      return this.left.compile(o);
    }
    top = !o.level;
    if (items.length < 2 && (top || this['void'] || items[0] instanceof Splat)) {
      reft = this.left;
      if (reft.isComplex()) {
        reft = Parens(reft);
      }
    } else {
      _ref = this.left.cache(o), left = _ref[0], reft = _ref[1], this.temps = _ref[2];
    }
    _ref = top
      ? [';', '\n' + this.tab]
      : [',', ' '], delim = _ref[0], space = _ref[1];
    delim += space;
    code = this.temps ? left.compile(o, LEVEL_PAREN) + delim : '';
    for (i = 0, _len = items.length; i < _len; ++i) {
      node = items[i];
      i && (code += com ? space : delim);
      if (com = node.comment) {
        code += node.compile(o);
        continue;
      }
      if (node instanceof Splat) {
        code += Import(reft, node.it).compile(o);
        continue;
      }
      if (logic = node.getDefault()) {
        node = node.first;
      }
      if (dyna = node instanceof Parens) {
        _ref = node.it.cache(o, true), key = _ref[0], val = _ref[1];
      } else if (node instanceof Prop) {
        key = node.key, val = node.val;
        if (val.accessor) {
          if (key instanceof Key) {
            key = JS("'" + key.name + "'");
          }
          code += reft.compile(o, LEVEL_CALL) + ".__define" + (val.params[0] ? val['void'] = 'S' : 'G') + "etter__(" + key.compile(o, LEVEL_LIST) + ", " + val.compile(o, LEVEL_LIST) + ")";
          continue;
        }
      } else {
        key = val = node;
      }
      dyna || (key = key.maybeKey());
      logic && (val = (logic.first = val, logic));
      code += Assign(Chain(reft, [Index(key)]), val).compile(o, LEVEL_PAREN);
    }
    if (top) {
      return code;
    }
    this['void'] || node instanceof Splat || (code += (com ? ' ' : ', ') + reft.compile(o, LEVEL_PAREN));
    if (o.level < LEVEL_LIST) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  return Import;
}(Node));
exports.Of = Of = (function(superclass){
  Of.displayName = 'Of';
  var prototype = __extend(Of, superclass).prototype, constructor = Of;
  function Of(item, array){
    this.item = item;
    this.array = array;
  }
  prototype.children = ['item', 'array'];
  __importAll(prototype, Negatable);
  prototype.compileNode = function(o){
    var array, items, code, sub, ref, cmp, cnj, i, test, _ref, _len;
    items = (array = this.array.expandSlice(o).unwrap()).items;
    if (!(array instanceof Arr) || items.length < 2) {
      return (this.negated ? '!' : '') + "" + utility('of') + "(" + this.item.compile(o, LEVEL_LIST) + ", " + array.compile(o, LEVEL_LIST) + ")";
    }
    code = '';
    _ref = this.item.cache(o, false, LEVEL_PAREN), sub = _ref[0], ref = _ref[1];
    _ref = this.negated
      ? [' !== ', ' && ']
      : [' === ', ' || '], cmp = _ref[0], cnj = _ref[1];
    for (i = 0, _len = items.length; i < _len; ++i) {
      test = items[i];
      code && (code += cnj);
      if (test instanceof Splat) {
        code += (_ref = new Of(Var(ref), test.it), _ref.negated = this.negated, _ref).compile(o, LEVEL_TOP);
        if (!(i || sub === ref)) {
          code = "(" + sub + ", " + code + ")";
        }
      } else {
        code += (i || sub === ref
          ? ref
          : "(" + sub + ")") + cmp + test.compile(o, LEVEL_OP + PREC['==']);
      }
    }
    sub === ref || o.scope.free(ref);
    if (o.level < LEVEL_OP + PREC['||']) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  return Of;
}(Node));
exports.Existence = Existence = (function(superclass){
  Existence.displayName = 'Existence';
  var prototype = __extend(Existence, superclass).prototype, constructor = Existence;
  function _ctor(){} _ctor.prototype = prototype;
  function Existence(it, negated){
    var _this = new _ctor;
    _this.it = it;
    _this.negated = negated;
    return _this;
  }
  prototype.children = ['it'];
  __importAll(prototype, Negatable);
  prototype.compileNode = function(o){
    var node, code, op, eq, _ref;
    node = (_ref = this.it.unwrap(), _ref.front = this.front, _ref);
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
exports.Fun = Fun = (function(superclass){
  Fun.displayName = 'Fun';
  var prototype = __extend(Fun, superclass).prototype, constructor = Fun;
  function _ctor(){} _ctor.prototype = prototype;
  function Fun(params, body, bound){
    var _this = new _ctor;
    _this.params = params || [];
    _this.body = body || Block();
    _this.bound = bound && '_this';
    return _this;
  }
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
      return superclass.prototype.traverseChildren.apply(this, arguments);
    }
  };
  prototype.makeReturn = function(){
    if (this.statement) {
      return this.returns = true, this;
    } else {
      return superclass.prototype.makeReturn.apply(this, arguments);
    }
  };
  prototype.ripName = function(it){
    var _ref;
    this.name || (this.name = it.varName());
    this.declared = it instanceof Var;
    if (((_ref = it.head) != null ? _ref.value : void 8) === 'prototype' && it.tails.length === 1 && !it.tails[0].isComplex()) {
      this.meth = it.tails[0];
    }
  };
  prototype.compileNode = function(o){
    var pscope, sscope, scope, that, loop, body, name, tab, code, _ref;
    pscope = o.scope;
    sscope = pscope.shared || pscope;
    scope = o.scope = this.body.scope = new Scope(this.wrapper ? pscope : sscope, this.wrapper && sscope);
    scope.fun = this;
    if (that = this.proto) {
      scope.assign('prototype', that.compile(o) + ".prototype");
    }
    if (that = this.cname) {
      scope.assign('constructor', that);
    }
    if (loop = o.loop, delete o.loop, loop) {
      o.indent = this.tab = '';
    }
    o.indent += TAB;
    body = this.body, name = this.name, tab = this.tab;
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
    if (this.statement) {
      name || this.carp('nameless function declaration');
      pscope === o.block.scope || this.carp('misplaced function declaration');
      this.accessor && this.carp('named accessor');
      scope.add(name, 'function');
      if (!this.returns) {
        pscope.add(name, 'function');
      }
      code += ' ' + name;
    }
    this['void'] || this.ctor || this.newed || body.makeReturn();
    code += "(" + this.compileParams(scope) + "){";
    if (that = body.compileWithDeclarations(o)) {
      code += "\n" + that + "\n" + tab;
    }
    code += '}';
    if (loop) {
      return pscope.assign(pscope.temporary('fn'), code);
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
  prototype.compileParams = function(scope){
    var params, body, names, assigns, i, p, splace, rest, that, dic, vr, df, v, name, _len, _i, _ref, _ref2;
    params = this.params, body = this.body;
    names = [];
    assigns = [];
    for (i = 0, _len = params.length; i < _len; ++i) {
      p = params[i];
      if (p instanceof Splat) {
        splace = i;
      } else if (p.op === '=' && !p.logic) {
        params[i] = Binary('?', p.left, p.right);
      }
    }
    if (splace != null) {
      rest = params.splice(splace, 9e9);
      if (!rest[1] && rest[0].it.isEmpty()) {
        rest = 0;
      }
    } else if (this.accessor) {
      if (that = params[1]) {
        that.carp('excess accessor parameter');
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
        vr = p;
        if (df = vr.getDefault()) {
          vr = vr.first;
        }
        if (vr.isEmpty()) {
          vr = Var(scope.temporary('arg'));
        } else if (!(vr instanceof Var)) {
          v = Var((_ref2 = (_ref = vr.it || vr).name, delete _ref.name, _ref2) || vr.varName() || scope.temporary('arg'));
          assigns.push(Assign(vr, df ? Binary(p.op, v, p.second) : v));
          vr = v;
        } else if (df) {
          assigns.push(Assign(vr, p.second, '=', p.op));
        }
        names.push(name = scope.add(vr.value, 'arg'));
        if (!(dic[0 + name] ^= 1)) {
          p.carp("duplicate parameter \"" + name + "\"");
        }
      }
    }
    if (rest) {
      while (splace--) {
        rest.unshift(Arr());
      }
      assigns.push(Assign(Arr(rest), Literal('arguments')));
    }
    if (assigns.length) {
      (_ref = this.body).prepend.apply(_ref, assigns);
    }
    return names.join(', ');
  };
  return Fun;
}(Node));
exports.Class = Class = (function(superclass){
  Class.displayName = 'Class';
  var prototype = __extend(Class, superclass).prototype, constructor = Class;
  function Class(title, sup, body){
    this.title = title;
    this.sup = sup;
    this.fun = Fun([], body);
  }
  prototype.children = ['title', 'sup', 'fun'];
  prototype.isCallable = YES;
  prototype.ripName = function(it){
    this.name = it.varName();
  };
  prototype.compile = function(o, level){
    var fun, title, lines, decl, name, i, node, proto, ctor, vname, that, args, clas, _len, _ref;
    fun = this.fun, title = this.title;
    lines = fun.body.lines;
    decl = title != null ? title.varName() : void 8;
    name = decl || this.name;
    if (ID.test(name || '')) {
      fun.cname = name;
    } else {
      name = 'constructor';
    }
    fun.body.traverseChildren(function(it){
      if (it instanceof Fun) {
        it.clas = name;
      }
    });
    for (i = 0, _len = lines.length; i < _len; ++i) {
      node = lines[i];
      if (node instanceof Obj) {
        lines[i] = Import(proto || (proto = Var('prototype')), node);
      } else if (node instanceof Fun && !node.statement) {
        ctor && node.carp('redundant constructor');
        ctor = node;
      }
    }
    ctor || lines.push(ctor = Fun());
    ctor.name = name;
    ctor.ctor = true;
    ctor.statement = true;
    ctor.clas = false;
    lines.push(vname = fun.proto = Var(fun.bound = name));
    if (that = this.sup) {
      args = [that];
      fun.proto = Util.Extends(vname, (_ref = fun.params)[_ref.length] = Var('superclass'));
    }
    fun.cname && fun.body.prepend(Literal(name + ".displayName = '" + name + "'"));
    clas = Parens(Call.make(fun, args), true);
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
exports.Super = Super = (function(superclass){
  Super.displayName = 'Super';
  var simple, prototype = __extend(Super, superclass).prototype, constructor = Super;
  prototype.isCallable = YES;
  simple = /^(?:\.|\[[\'\"\d.])/;
  prototype.compile = function(o){
    var scope, that, key, _ref;
    scope = o.scope;
    for (; that = scope.fun; scope = scope.parent) {
      if (simple.test(key = (_ref = that.meth) != null ? _ref.compile(o) : void 8)) {
        return "superclass.prototype" + key;
      }
    }
    return 'superclass';
  };
  function Super(){}
  return Super;
}(Node));
exports.Parens = Parens = (function(superclass){
  Parens.displayName = 'Parens';
  var prototype = __extend(Parens, superclass).prototype, constructor = Parens;
  function _ctor(){} _ctor.prototype = prototype;
  function Parens(it, keep, string){
    var _this = new _ctor;
    _this.it = it;
    _this.keep = keep;
    _this.string = string;
    return _this;
  }
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
    it.cond || (it.cond = this.cond), it['void'] || (it['void'] = this['void']);
    if (this.calling && (!level || this['void'])) {
      it.head['void'] = true;
    }
    if (!(this.keep || this.newed || level >= LEVEL_OP + PREC[it.op])) {
      return (it.front = this.front, it).compile(o, level || LEVEL_PAREN);
    }
    if (it.isStatement()) {
      return it.compileClosure(o);
    } else {
      return "(" + it.compile(o, LEVEL_PAREN) + ")";
    }
  };
  return Parens;
}(Node));
exports.Splat = Splat = (function(superclass){
  Splat.displayName = 'Splat';
  var _ref, prototype = __extend(Splat, superclass).prototype, constructor = Splat;
  function _ctor(){} _ctor.prototype = prototype;
  function Splat(it, filler){
    var _this = new _ctor;
    _this.it = it;
    _this.filler = filler;
    return _this;
  }
  _ref = Parens.prototype, prototype.children = _ref.children, prototype.isComplex = _ref.isComplex;
  prototype.isAssignable = YES;
  prototype.assigns = function(it){
    return this.it.assigns(it);
  };
  prototype.compile = function(){
    return this.carp('invalid splat');
  };
  Splat.compileArray = function(o, list, apply){
    var index, node, args, atoms, _i, _ref, _len;
    index = -1;
    while (node = list[++index]) {
      if (node instanceof Splat) {
        if (apply && node.filler) {
          return '';
        }
        if (!node.it.isEmpty()) {
          break;
        }
        list.splice(index--, 1);
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
        if (atoms.length) {
          args.push(Arr(atoms.splice(0, 9e9)));
        }
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
exports.Jump = Jump = (function(superclass){
  Jump.displayName = 'Jump';
  var prototype = __extend(Jump, superclass).prototype, constructor = Jump;
  function Jump(verb, label){
    this.verb = verb;
    this.label = label;
  }
  prototype.show = function(){
    var that;
    return (this.verb || '') + ((that = this.label) ? ' ' + that : '');
  };
  prototype.isStatement = YES;
  prototype.makeReturn = THIS;
  prototype.getJump = function(ctx){
    var that;
    ctx || (ctx = {});
    if (!ctx[this.verb]) {
      return this;
    }
    if (that = this.label) {
      return !__of(that, ctx.labels || []) && this;
    }
  };
  prototype.compileNode = function(o){
    var that;
    if (that = this.label) {
      __of(that, o.labels || []) || this.carp("undefined label \"" + that + "\"");
    } else {
      o[this.verb] || this.carp("stray " + this.verb);
    }
    return this.show() + ';';
  };
  return Jump;
}(Node));
exports.Throw = Throw = (function(superclass){
  Throw.displayName = 'Throw';
  var prototype = __extend(Throw, superclass).prototype, constructor = Throw;
  function _ctor(){} _ctor.prototype = prototype;
  function Throw(it){
    var _this = new _ctor;
    _this.it = it;
    return _this;
  }
  prototype.children = ['it'];
  prototype.getJump = VOID;
  prototype.compileNode = function(o){
    var _ref;
    return "throw " + (((_ref = this.it) != null ? _ref.compile(o, LEVEL_PAREN) : void 8) || 'null') + ";";
  };
  Jump['throw'] = Throw;
  return Throw;
}(Jump));
exports.Return = Return = (function(superclass){
  Return.displayName = 'Return';
  var prototype = __extend(Return, superclass).prototype, constructor = Return;
  function _ctor(){} _ctor.prototype = prototype;
  function Return(it){
    var _this = new _ctor;
    if (it && it.value !== 'void') {
      _this.it = it;
    }
    return _this;
  }
  prototype.getJump = THIS;
  prototype.compileNode = function(o){
    var that;
    return "return" + ((that = this.it) ? ' ' + that.compile(o, LEVEL_PAREN) : '') + ";";
  };
  Jump['return'] = Return;
  return Return;
}(Throw));
exports.While = While = (function(superclass){
  While.displayName = 'While';
  var prototype = __extend(While, superclass).prototype, constructor = While;
  function While(test, un, mode){
    this.un = un;
    mode && (mode instanceof Node
      ? this.update = mode
      : this.post = true);
    if (this.post || test.value !== '' + !un) {
      this.test = test;
    }
  }
  prototype.children = ['test', 'body', 'update', 'else'];
  prototype.aSource = 'test';
  prototype.aTargets = ['body', 'update'];
  prototype.show = function(){
    return [this.un ? '!' : void 8, this.post ? 'do' : void 8].join('');
  };
  prototype.isStatement = prototype.isArray = YES;
  prototype.getJump = function(ctx){
    var node, _i, _ref, _len;
    ctx || (ctx = {});
    ctx['continue'] = true;
    ctx['break'] = true;
    for (_i = 0, _len = (_ref = this.body.lines).length; _i < _len; ++_i) {
      node = _ref[_i];
      if (node.getJump(ctx)) {
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
  prototype.addElse = function($else){
    this['else'] = $else;
    return this;
  };
  prototype.makeReturn = function(it){
    if (it) {
      this.body.makeReturn(it);
    } else {
      this.getJump() || (this.returns = true);
    }
    return this;
  };
  prototype.compileNode = function(o){
    var test, that, head, _ref;
    o.loop = true;
    this.test && (this.un
      ? this.test = this.test.invert()
      : this.anaphorize());
    if (this.post) {
      return 'do {' + this.compileBody((o.indent += TAB, o), this.test);
    }
    test = ((_ref = this.test) != null ? _ref.compile(o, LEVEL_PAREN) : void 8) || '';
    head = (that = this.update)
      ? "for (;" + (test && ' ' + test) + "; " + that.compile(o, LEVEL_PAREN)
      : test ? "while (" + test : 'for (;;';
    return head + ') {' + this.compileBody((o.indent += TAB, o));
  };
  prototype.compileBody = function(o, potest){
    var lines, ret, code, last, res, run, that;
    o['break'] = true;
    o['continue'] = true;
    lines = this.body.lines;
    code = ret = '';
    if (this.returns) {
      if ((last = lines[lines.length - 1]) && !(last instanceof Throw)) {
        lines[lines.length - 1] = last.makeReturn(res = o.scope.assign('_results', '[]'));
      }
      ret = "\n" + this.tab + "return " + (res || '[]') + ";";
    }
    if (this['else']) {
      lines.unshift(JS((run = o.scope.temporary('run')) + " = true;"));
    }
    if (that = this.body.compile(o, LEVEL_TOP)) {
      code += "\n" + that + "\n" + this.tab;
    }
    code += '}';
    if (potest) {
      code += " while (" + potest.compile((o.tab = this.tab, o), LEVEL_PAREN) + ");";
    }
    if (run) {
      if (this.returns) {
        this['else'].makeReturn();
      }
      code += " if (!" + run + ") " + this.compileBlock(o, this['else']);
    }
    return code + ret;
  };
  return While;
}(Node));
exports.For = For = (function(superclass){
  For.displayName = 'For';
  var prototype = __extend(For, superclass).prototype, constructor = For;
  function For(it){
    __importAll(this, it);
  }
  prototype.children = ['name', 'source', 'from', 'to', 'step', 'body'];
  prototype.aSource = null;
  prototype.show = function(){
    return this.index;
  };
  prototype.compileNode = function(o){
    var temps, idx, pvar, step, tvar, tail, vars, eq, cond, svar, srcPart, lvar, head, item, that, body, _ref;
    o.loop = true;
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
      vars = idx + " = " + this.from.compile(o, LEVEL_LIST);
      if (tail !== tvar) {
        vars += ", " + tail;
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
    this.infuseIIFE(o);
    o.indent += TAB;
    if (this.name) {
      head += '\n' + o.indent;
      item = svar + "[" + idx + "]";
      if (that = this.nref) {
        head += that + " = " + item + ", ";
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
  prototype.infuseIIFE = function(o){
    var _this = this;
    this.body.traverseChildren(function(it){
      var fun, call, name, _ref;
      if (!(it.calling || it.op === 'new' && (fun = it.it).params)) {
        return;
      }
      if (fun) {
        call = (it.it = Call.make((fun['void'] = true, fun))).tails[0];
      } else {
        _ref = it.it, call = _ref.tails[0], fun = _ref.head;
      }
      if (fun.params.length ^ call.args.length - !!call.method) {
        return;
      }
      _this.index && fun.params.push((_ref = call.args)[_ref.length] = Var(_this.index));
      if (name = _this.name) {
        call.args.push(name.isComplex() ? Var(_this.nref || (_this.nref = (_ref = _this.temps)[_ref.length] = o.scope.temporary('ref'))) : name);
        fun.params.push(name);
      }
    });
  };
  return For;
}(While));
exports.Try = Try = (function(superclass){
  Try.displayName = 'Try';
  var prototype = __extend(Try, superclass).prototype, constructor = Try;
  function Try(attempt, thrown, recovery, ensure){
    this.attempt = attempt;
    this.thrown = thrown != null ? thrown : '_e';
    this.recovery = recovery;
    this.ensure = ensure;
  }
  prototype.children = ['attempt', 'recovery', 'ensure'];
  prototype.show = function(){
    return this.thrown;
  };
  prototype.isStatement = YES;
  prototype.isCallable = function(){
    var _ref;
    return ((_ref = this.recovery) != null ? _ref.isCallable() : void 8) && this.attempt.isCallable();
  };
  prototype.getJump = function(it){
    var _ref;
    return this.attempt.getJump(it) || ((_ref = this.recovery) != null ? _ref.getJump(it) : void 8);
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
exports.Switch = Switch = (function(superclass){
  Switch.displayName = 'Switch';
  var prototype = __extend(Switch, superclass).prototype, constructor = Switch;
  function Switch(topic, cases, $default){
    this.topic = topic;
    this.cases = cases;
    this['default'] = $default;
  }
  prototype.children = ['topic', 'cases', 'default'];
  prototype.aSource = 'topic';
  prototype.aTargets = ['cases'];
  prototype.isStatement = YES;
  prototype.isCallable = function(){
    var c, _i, _ref, _len;
    for (_i = 0, _len = (_ref = this.cases).length; _i < _len; ++_i) {
      c = _ref[_i];
      if (!c.isCallable()) {
        return false;
      }
    }
    return (_ref = this['default']) != null ? _ref.isCallable() : void 8;
  };
  prototype.getJump = function(ctx){
    var c, that, _i, _ref, _len;
    ctx || (ctx = {});
    ctx['break'] = true;
    for (_i = 0, _len = (_ref = this.cases).length; _i < _len; ++_i) {
      c = _ref[_i];
      if (that = c.body.getJump(ctx)) {
        return that;
      }
    }
    return (_ref = this['default']) != null ? _ref.getJump(ctx) : void 8;
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
    topic = !!this.topic && this.anaphorize().compile(o, LEVEL_PAREN);
    code = "switch (" + topic + ") {\n";
    stop = this['default'] || this.cases.length - 1;
    o['break'] = true;
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
exports.Case = Case = (function(superclass){
  Case.displayName = 'Case';
  var prototype = __extend(Case, superclass).prototype, constructor = Case;
  function Case(tests, body){
    this.tests = tests;
    this.body = body;
  }
  prototype.children = ['tests', 'body'];
  prototype.isCallable = function(){
    return this.body.isCallable();
  };
  prototype.makeReturn = function(it){
    var _ref;
    if (((_ref = (_ref = this.body.lines)[_ref.length - 1]) != null ? _ref.value : void 8) !== 'fallthrough') {
      this.body.makeReturn(it);
    }
    return this;
  };
  prototype.compileCase = function(o, tab, nobr, bool){
    var test, t, tests, i, that, code, lines, last, ft, _res, _i, _ref, _len, _j, _ref2, _len2;
    _res = [];
    for (_i = 0, _len = (_ref = this.tests).length; _i < _len; ++_i) {
      test = _ref[_i];
      test = test.expandSlice(o).unwrap();
      if (test instanceof Arr) {
        for (_j = 0, _len2 = (_ref2 = test.items).length; _j < _len2; ++_j) {
          t = _ref2[_j];
          _res.push(t);
        }
      } else {
        _res.push(test);
      }
    }
    tests = _res;
    tests.length || tests.push(Literal('void'));
    if (bool) {
      t = tests[0];
      i = 0;
      while (that = tests[++i]) {
        t = Binary('||', t, that);
      }
      tests = [(this.t = t, this.aSource = 't', this.aTargets = ['body'], this).anaphorize().invert()];
    }
    code = '';
    for (_i = 0, _len = tests.length; _i < _len; ++_i) {
      t = tests[_i];
      code += tab + ("case " + t.compile(o, LEVEL_PAREN) + ":\n");
    }
    lines = this.body.lines;
    last = lines[lines.length - 1];
    if (ft = (last != null ? last.value : void 8) === 'fallthrough') {
      lines[lines.length - 1] = JS('// fallthrough');
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
exports.If = If = (function(superclass){
  If.displayName = 'If';
  var prototype = __extend(If, superclass).prototype, constructor = If;
  function _ctor(){} _ctor.prototype = prototype;
  function If($if, then, un){
    var _this = new _ctor;
    _this['if'] = $if;
    _this.then = then;
    _this.un = un;
    return _this;
  }
  prototype.children = ['if', 'then', 'else'];
  prototype.aSource = 'if';
  prototype.aTargets = ['then'];
  prototype.show = function(){
    return this.un && '!';
  };
  prototype.terminator = '';
  prototype.addElse = function(it){
    if (this['else'] instanceof constructor) {
      this['else'].addElse(it);
    } else {
      this['else'] = it;
    }
    return this;
  };
  prototype.delegate(['isCallable', 'isArray', 'isString', 'isRegex'], function(it){
    var _ref;
    return ((_ref = this['else']) != null ? _ref[it]() : void 8) && this.then[it]();
  });
  prototype.getJump = function(it){
    var _ref;
    return this.then.getJump(it) || ((_ref = this['else']) != null ? _ref.getJump(it) : void 8);
  };
  prototype.makeReturn = function(it){
    this.then = this.then.makeReturn(it);
    if (this['else'] != null) {
      this['else'] = this['else'].makeReturn(it);
    }
    return this;
  };
  prototype.compileNode = function(o){
    if (this.un) {
      this['if'] = this['if'].invert();
    } else {
      this.soak || this.anaphorize();
    }
    if (o.level) {
      return this.compileExpression(o);
    } else {
      return this.compileStatement(o);
    }
  };
  prototype.compileStatement = function(o){
    var code, els;
    code = "if (" + this['if'].compile(o, LEVEL_PAREN) + ") ";
    o.indent += TAB;
    code += this.compileBlock(o, Block(this.then));
    if (!(els = this['else'])) {
      return code;
    }
    return code + ' else ' + (els instanceof constructor
      ? els.compile((o.indent = this.tab, o), LEVEL_TOP)
      : this.compileBlock(o, els));
  };
  prototype.compileExpression = function(o){
    var thn, els, code, pad;
    thn = this.then, els = this['else'];
    this['void'] && (thn['void'] = (els || 0)['void'] = true);
    if (!els && (this.cond || this['void'])) {
      return Parens(Binary('&&', this['if'], thn)).compile(o);
    }
    code = this['if'].compile(o, LEVEL_COND);
    pad = els != null && els.isComplex() ? '\n' + (o.indent += TAB) : ' ';
    code += pad + "? " + thn.compile(o, LEVEL_LIST) + "" + pad + ": " + ((els != null ? els.compile(o, LEVEL_LIST) : void 8) || 'void 8');
    if (o.level < LEVEL_COND) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  If.unfoldSoak = function(o, parent, name){
    var that;
    if (that = parent[name].unfoldSoak(o)) {
      parent[name] = that.then;
      return that.cond = parent.cond, that['void'] = parent['void'], that.then = Chain(parent), that;
    }
  };
  return If;
}(Node));
exports.Label = Label = (function(superclass){
  Label.displayName = 'Label';
  var _ref, prototype = __extend(Label, superclass).prototype, constructor = Label;
  function Label(label, it){
    this.label = label || '_';
    this.it = it;
  }
  _ref = Parens.prototype, prototype.children = _ref.children, prototype.isCallable = _ref.isCallable, prototype.isArray = _ref.isArray;
  prototype.show = function(){
    return this.label;
  };
  prototype.isStatement = YES;
  prototype.getJump = function(ctx){
    ctx || (ctx = {});
    (ctx.labels || (ctx.labels = [])).push(this.label);
    return this.it.getJump((ctx['break'] = true, ctx));
  };
  prototype.makeReturn = function(it){
    this.it = this.it.makeReturn(it);
    return this;
  };
  prototype.compileNode = function(o){
    var label, it, labels;
    label = this.label, it = this.it;
    labels = o.labels = __slice.call(o.labels || []);
    if (__of(label, labels)) {
      this.carp("duplicate label \"" + label + "\"");
    }
    labels.push(label);
    it.isStatement() || (it = Block(it));
    return (label + ": ") + (it instanceof Block
      ? (o.indent += TAB, this.compileBlock(o, it))
      : it.compile(o));
  };
  return Label;
}(Node));
exports.JS = JS = (function(superclass){
  JS.displayName = 'JS';
  var prototype = __extend(JS, superclass).prototype, constructor = JS;
  function _ctor(){} _ctor.prototype = prototype;
  function JS(code, literal, comment){
    var _this = new _ctor;
    _this.code = code;
    _this.literal = literal;
    _this.comment = comment;
    return _this;
  }
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
  prototype.compile = function(it){
    if (this.literal) {
      return entab(this.code, it.indent);
    } else {
      return this.code;
    }
  };
  return JS;
}(Node));
exports.Util = Util = (function(superclass){
  Util.displayName = 'Util';
  var prototype = __extend(Util, superclass).prototype, constructor = Util;
  function _ctor(){} _ctor.prototype = prototype;
  function Util(verb){
    var _this = new _ctor;
    _this.verb = verb;
    return _this;
  }
  prototype.show = Jump.prototype.show;
  prototype.isCallable = YES;
  prototype.compile = function(){
    return utility(this.verb);
  };
  Util.Extends = function(){
    return Call.make(Util('extend'), [arguments[0], arguments[1]]);
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
  do {
    temp = '_' + (name.length > 1
      ? name + (i++ ? i : '')
      : (i++ + parseInt(name, 36)).toString(36));
  } while ((_ref = this.type(temp)) !== 'reuse' && _ref !== void 8);
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
_ref.emit = function(code, tab){
  var usr, tmp, asn, fun, name, type, that, val, _i, _ref, _len, _ref2;
  usr = [];
  tmp = [];
  asn = [];
  fun = [];
  for (_i = 0, _len = (_ref = this.variables).length; _i < _len; ++_i) {
    _ref2 = _ref[_i], name = _ref2.name, type = _ref2.type;
    if (type === 'var' || type === 'reuse') {
      ('_' === name.charAt(0) ? tmp : usr).push(name);
    } else if (that = type.value) {
      if (~(val = entab(that, tab)).lastIndexOf('function(', 0)) {
        fun.push("function " + name + val.slice(8));
      } else {
        asn.push(name + " = " + val);
      }
    }
  }
  if (that = usr.concat(tmp, asn).join(', ')) {
    code = tab + "var " + that + ";\n" + code;
  }
  if (that = fun.join("\n" + tab)) {
    return code + "\n" + tab + that;
  } else {
    return code;
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
function VOID(){}
UTILITIES = {
  clone: 'function(it){\n  function fun(){} fun.prototype = it;\n  return new fun;\n}',
  extend: 'function(sub, sup){\n  function fun(){} fun.prototype = (sub.superclass = sup).prototype;\n  (sub.prototype = new fun).constructor = sub;\n  if (typeof sup.extended == \'function\') sup.extended(sub);\n  return sub;\n}',
  bind: 'function(obj, key){\n  return function(){ return obj[key].apply(obj, arguments) };\n}',
  'import': 'function(obj, src){\n  var own = {}.hasOwnProperty;\n  for (var key in src) if (own.call(src, key)) obj[key] = src[key];\n  return obj;\n}',
  importAll: 'function(obj, src){\n  for (var key in src) obj[key] = src[key];\n  return obj;\n}',
  repeatString: 'function(str, n){\n  for (var r = \'\'; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;\n  return r;\n}',
  repeatArray: 'function(arr, n){\n  for (var r = []; n > 0; (n >>= 1) && (arr = arr.concat(arr)))\n    if (n & 1) r.push.apply(r, arr);\n  return r;\n}',
  of: 'function(x, arr){\n  var i = 0, l = arr.length >>> 0;\n  while (i < l) if (x === arr[i++]) return true;\n  return false;\n}',
  split: "''.split",
  replace: "''.replace",
  toString: '{}.toString',
  join: '[].join',
  slice: '[].slice'
};
LEVEL_TOP = 0;
LEVEL_PAREN = 1;
LEVEL_LIST = 2;
LEVEL_COND = 3;
LEVEL_OP = 4;
LEVEL_CALL = 5;
PREC = {
  '?': 0.1,
  unary: 0.9
};
PREC['&&'] = PREC['||'] = 0.2;
PREC['&'] = PREC['^'] = PREC['|'] = 0.3;
PREC['=='] = PREC['!='] = PREC['==='] = PREC['!=='] = 0.4;
PREC['<'] = PREC['>'] = PREC['<='] = PREC['>='] = PREC['in'] = PREC['instanceof'] = 0.5;
PREC['<<'] = PREC['>>'] = PREC['>>>'] = 0.6;
PREC['+'] = PREC['-'] = 0.7;
PREC['*'] = PREC['/'] = PREC['%'] = 0.8;
TAB = '  ';
ID = /^[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*$/;
SIMPLENUM = /^\d+$/;
function utility(it){
  return Scope.root.assign('__' + it, UTILITIES[it]);
}
function entab(code, tab){
  return code.replace(/\n/g, '\n' + tab);
}
function __import(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}
function __clone(it){
  function fun(){} fun.prototype = it;
  return new fun;
}
function __extend(sub, sup){
  function fun(){} fun.prototype = (sub.superclass = sup).prototype;
  (sub.prototype = new fun).constructor = sub;
  if (typeof sup.extended == 'function') sup.extended(sub);
  return sub;
}
function __repeatString(str, n){
  for (var r = ''; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;
  return r;
}
function __importAll(obj, src){
  for (var key in src) obj[key] = src[key];
  return obj;
}
function __of(x, arr){
  var i = 0, l = arr.length >>> 0;
  while (i < l) if (x === arr[i++]) return true;
  return false;
}