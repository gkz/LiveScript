var Node, Negatable, Block, Atom, Literal, Var, Key, Index, Slice, Chain, Call, List, Obj, Prop, Arr, Unary, Binary, Assign, Import, In, Existence, Fun, Class, Super, Parens, Splat, Jump, Throw, Return, While, For, Try, Switch, Case, If, Label, JS, Util, Vars, UTILS, LEVEL_TOP, LEVEL_PAREN, LEVEL_LIST, LEVEL_COND, LEVEL_OP, LEVEL_CALL, PREC, TAB, ID, SIMPLENUM, __ref, __slice = [].slice, __toString = {}.toString;
(Node = function(){
  throw Error('unimplemented');
}).prototype = {
  compile: function(options, level){
    var o, node, code, that, tmp, __i, __len;
    o = __import({}, options);
    if (level != null) {
      o.level = level;
    }
    node = this.unfoldSoak(o) || this;
    if (o.level && node.isStatement()) {
      return node.compileClosure(o);
    }
    code = (node.tab = o.indent, node).compileNode(o);
    if (that = node.temps) {
      for (__i = 0, __len = that.length; __i < __len; ++__i) {
        tmp = that[__i];
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
    this.traverseChildren(function(it){
      switch (it.value) {
      case 'this':
        hasThis = true;
        break;
      case 'arguments':
        hasArgs = it.value = '__args';
      }
    });
    if (hasThis) {
      call.args.push(Literal('this'));
      call.method = '.call';
    }
    if (hasArgs) {
      call.args.push(Literal('arguments'));
      fun.params.push(Var('__args'));
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
    var ref, sub, __ref;
    if (!this.isComplex()) {
      return [__ref = level != null ? this.compile(o, level) : this, __ref];
    }
    sub = Assign(ref = Var(o.scope.temporary()), this);
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
    var tmp, asn, __ref;
    if (this instanceof Var && o.scope.check(this.value) || this instanceof Unary && ((__ref = this.op) == '+' || __ref == '-') && (-1 / 0 < (__ref = +this.it.value) && __ref < 1 / 0) || this instanceof Literal && !this.isComplex()) {
      return [__ref = this.compile(o), __ref];
    }
    asn = Assign(Var(tmp = o.scope.temporary(name)), this);
    ret || (asn['void'] = true);
    return [tmp, asn.compile(o, ret ? LEVEL_CALL : LEVEL_PAREN)];
  },
  eachChild: function(fn){
    var name, child, i, node, that, __i, __ref, __len, __len1;
    for (__i = 0, __len = (__ref = this.children).length; __i < __len; ++__i) {
      name = __ref[__i];
      if (child = this[name]) {
        if ('length' in child) {
          for (i = 0, __len1 = child.length; i < __len1; ++i) {
            node = child[i];
            if (that = fn(node, name, i)) {
              return that;
            }
          }
        } else {
          if ((that = fn(child, name)) != null) {
            return that;
          }
        }
      }
    }
  },
  traverseChildren: function(fn, xscope){
    var __this = this;
    return this.eachChild(function(node, name, index){
      var __ref;
      return (__ref = fn(node, __this, name, index)) != null
        ? __ref
        : node.traverseChildren(fn, xscope);
    });
  },
  anaphorize: function(){
    var base, name, __ref;
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
    return __ref = this[this.aSource], __ref.cond = true, __ref;
  },
  carp: function(msg, type){
    type == null && (type = SyntaxError);
    throw type(msg + " on line " + (this.line || this.traverseChildren(function(it){
      return it.line;
    })));
  },
  delegate: function(names, fn){
    var name, __i, __len;
    for (__i = 0, __len = names.length; __i < __len; ++__i) {
      name = names[__i];
      (__fn.call(this, name));
    }
    function __fn(name){
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
  unparen: THIS,
  unwrap: THIS,
  maybeKey: THIS,
  expandSlice: THIS,
  varName: String,
  getAccessors: VOID,
  getCall: VOID,
  getDefault: VOID,
  getJump: VOID,
  invert: function(){
    return Unary('!', this, true);
  },
  invertCheck: function(it){
    if (it.inverted) {
      this.invert();
    }
    return this;
  },
  addElse: function($else){
    this['else'] = $else;
    return this;
  },
  makeReturn: function(arref){
    if (arref) {
      return Call.make(JS(arref + '.push'), [this]);
    } else {
      return Return(this);
    }
  },
  makeObjReturn: function(arref){
    var base, items;
    if (arref) {
      base = this.lines[0];
      if (this.lines[0] instanceof If) {
        base = base.then.lines[0];
      }
      items = base.items;
      if (items[0] == null || items[1] == null) {
        this.carp('must specify both key and value for object comprehension');
      }
      return Assign(Chain(Var(arref)).add(Index(items[0], '.', true)), items[1]);
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
    var that, node, key, val, v, __i, __len, __results = [];
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
      for (__i = 0, __len = it.length; __i < __len; ++__i) {
        v = it[__i];
        __results.push(fromJSON(v));
      }
      return __results;
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
    this.negated = !this.negated;
    return this;
  }
};
exports.Block = Block = (function(superclass){
  var prototype = __extend((__import(Block, superclass).displayName = 'Block', Block), superclass).prototype, constructor = Block;
  function Block(body){
    var __this = this instanceof __ctor ? this : new __ctor;
    body || (body = []);
    if ('length' in body) {
      __this.lines = body;
    } else {
      __this.lines = [];
      __this.add(body);
    }
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.children = ['lines'];
  prototype.toJSON = function(){
    delete this.back;
    return superclass.prototype.toJSON.call(this);
  };
  prototype.add = function(it){
    var that, __ref;
    it = it.unparen();
    switch (false) {
    case !(that = this.back):
      that.add(it);
      break;
    case !(that = it.lines):
      (__ref = this.lines).push.apply(__ref, that);
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
    var __ref;
    (__ref = this.lines).splice.apply(__ref, [this.neck(), 0].concat(__slice.call(arguments)));
    return this;
  };
  prototype.pipe = function(target, type){
    var args;
    args = type === '|>' ? this.lines.pop() : target;
    if (__toString.call(args).slice(8, -1) !== 'Array') {
      args = [args];
    }
    switch (type) {
    case '|>':
      this.lines.push(Call.make(target, args, {
        pipe: true
      }));
      break;
    case '<|':
      this.lines.push(Call.make(this.lines.pop(), args));
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
  prototype.neck = function(){
    var pos, x, __ref, __len;
    for (pos = 0, __len = (__ref = this.lines).length; pos < __len; ++pos) {
      x = __ref[pos];
      if (!(x.comment || x instanceof Literal)) {
        break;
      }
    }
    return pos;
  };
  prototype.isComplex = function(){
    var __ref;
    return this.lines.length > 1 || ((__ref = this.lines[0]) != null ? __ref.isComplex() : void 8);
  };
  prototype.delegate(['isCallable', 'isArray', 'isString', 'isRegex'], function(it){
    var __ref;
    return (__ref = (__ref = this.lines)[__ref.length - 1]) != null ? __ref[it]() : void 8;
  });
  prototype.getJump = function(it){
    var node, that, __i, __ref, __len;
    for (__i = 0, __len = (__ref = this.lines).length; __i < __len; ++__i) {
      node = __ref[__i];
      if (that = node.getJump(it)) {
        return that;
      }
    }
  };
  prototype.makeReturn = function(it){
    var that, __ref, __key, __ref1;
    if (that = (__ref1 = __ref = this.lines)[__key = __ref1.length - 1] != null ? __ref[__key] = __ref[__key].makeReturn(it) : void 8) {
      if (that instanceof Return && !that.it) {
        --this.lines.length;
      }
    }
    return this;
  };
  prototype.compile = function(o, level){
    var tab, node, code, codes, __res, __i, __ref, __len;
    level == null && (level = o.level);
    if (level) {
      return this.compileExpressions(o, level);
    }
    o.block = this;
    tab = o.indent;
    __res = [];
    for (__i = 0, __len = (__ref = this.lines).length; __i < __len; ++__i) {
      node = __ref[__i];
      node = node.unfoldSoak(o) || node;
      if (!(code = (node.front = true, node).compile(o, level))) {
        continue;
      }
      node.isStatement() || (code += node.terminator);
      __res.push(tab + code);
    }
    codes = __res;
    return codes.join('\n');
  };
  prototype.compileRoot = function(options){
    var o, saveTo, bare, prefix, code, __ref;
    o = (__import({
      level: LEVEL_TOP,
      scope: this.scope = Scope.root = new Scope
    }, options));
    if (saveTo = o.saveScope, delete o.saveScope, saveTo) {
      o.scope = saveTo.savedScope || (saveTo.savedScope = o.scope);
    }
    delete o.filename;
    o.indent = (bare = o.bare, delete o.bare, bare) ? '' : TAB;
    if (/^\s*(?:[/#]|javascript:)/.test((__ref = this.lines[0]) != null ? __ref.code : void 8)) {
      prefix = this.lines.shift().code + '\n';
    }
    if ((__ref = o.eval, delete o.eval, __ref) && this.chomp().lines.length) {
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
    var pre, i, rest, post, that;
    o.level = LEVEL_TOP;
    pre = '';
    if (i = this.neck()) {
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
    var lines, i, that, code, last, node, __i, __len;
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
    for (__i = 0, __len = lines.length; __i < __len; ++__i) {
      node = lines[__i];
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
  var prototype = __extend((__import(Atom, superclass).displayName = 'Atom', Atom), superclass).prototype, constructor = Atom;
  prototype.show = function(){
    return this.value;
  };
  prototype.isComplex = NO;
  function Atom(){
    superclass.apply(this, arguments);
  }
  return Atom;
}(Node));
exports.Literal = Literal = (function(superclass){
  var prototype = __extend((__import(Literal, superclass).displayName = 'Literal', Literal), superclass).prototype, constructor = Literal;
  function Literal(value){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this.value = value;
    if (value.js) {
      return JS(value + "", true);
    }
    if (value === 'super') {
      return new Super;
    }
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
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
  prototype.isRegex = function(){
    return (this.value + "").charAt() === '/';
  };
  prototype.isComplex = function(){
    return this.isRegex() || this.value === 'debugger';
  };
  prototype.isWhat = function(){
    switch (false) {
    case !this.isEmpty():
      return 'empty';
    case !this.isCallable():
      return 'callable';
    case !this.isString():
      return 'string';
    case !this.isRegex():
      return 'regex';
    case !this.isComplex():
      return 'complex';
    }
  };
  prototype.varName = function(){
    if (/^\w+$/.test(this.value)) {
      return '$' + this.value;
    } else {
      return '';
    }
  };
  prototype.compile = function(o, level){
    var val, __ref;
    level == null && (level = o.level);
    switch (val = this.value + "") {
    case 'this':
      return ((__ref = o.scope.fun) != null ? __ref.bound : void 8) || val;
    case 'undefined':
      val = 'void';
      // fallthrough
    case 'void':
      if (!level) {
        return '';
      }
      val += ' 8';
      // fallthrough
    case 'null':
      if (level === LEVEL_CALL) {
        this.carp('invalid use of ' + this.value);
      }
      break;
    case 'on':
    case 'yes':
      val = 'true';
      break;
    case 'off':
    case 'no':
      val = 'false';
      break;
    case '*':
      this.carp('stray star');
      break;
    case 'debugger':
      if (level) {
        return "(function(){\n" + TAB + o.indent + "debugger;\n" + o.indent + "}())";
      }
    }
    return val;
  };
  return Literal;
}(Atom));
exports.Var = Var = (function(superclass){
  var prototype = __extend((__import(Var, superclass).displayName = 'Var', Var), superclass).prototype, constructor = Var;
  function Var(value){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this.value = value;
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.isAssignable = prototype.isCallable = YES;
  prototype.assigns = function(it){
    return it === this.value;
  };
  prototype.maybeKey = function(){
    var __ref;
    return __ref = Key(this.value), __ref.line = this.line, __ref;
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
  var prototype = __extend((__import(Key, superclass).displayName = 'Key', Key), superclass).prototype, constructor = Key;
  function Key(name, reserved){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this.reserved = reserved || name.reserved;
    __this.name = '' + name;
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.isComplex = NO;
  prototype.assigns = function(it){
    return it === this.name;
  };
  prototype.varName = function(){
    var name;
    name = this.name;
    if (this.reserved || (name == 'arguments' || name == 'eval')) {
      return "$" + name;
    } else {
      return name;
    }
  };
  prototype.compile = prototype.show = function(){
    if (this.reserved) {
      return "'" + this.name + "'";
    } else {
      return this.name;
    }
  };
  return Key;
}(Node));
exports.Index = Index = (function(superclass){
  var prototype = __extend((__import(Index, superclass).displayName = 'Index', Index), superclass).prototype, constructor = Index;
  function Index(key, symbol, init){
    var k, __this = this instanceof __ctor ? this : new __ctor;
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
      __this.assign = symbol.slice(1);
      break;
    case '@':
      __this.vivify = symbol.length > 2 ? Arr : Obj;
    }
    __this.key = key;
    __this.symbol = symbol;
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.children = ['key'];
  prototype.show = function(){
    return [this.soak ? '?' : void 8] + this.symbol;
  };
  prototype.isComplex = function(){
    return this.key.isComplex();
  };
  prototype.varName = function(){
    var __ref;
    return ((__ref = this.key) instanceof Key || __ref instanceof Literal) && this.key.varName();
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
exports.Slice = Slice = (function(superclass){
  var prototype = __extend((__import(Slice, superclass).displayName = 'Slice', Slice), superclass).prototype, constructor = Slice;
  function Slice(__arg){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this.type = __arg.type, __this.target = __arg.target, __this.from = __arg.from, __this.to = __arg.to;
    __this.from == null && (__this.from = Literal(0));
    if (__this.to && __this.type === 'to') {
      __this.to = Binary('+', __this.to, Literal('1'));
    }
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.children = ['target', 'from', 'to'];
  prototype.show = function(){
    return this.type;
  };
  prototype.compileNode = function(o){
    var args;
    if (this.to && this.type === 'to') {
      this.to = Binary('||', this.to, Literal('9e9'));
    }
    args = [this.target, this.from];
    if (this.to) {
      args.push(this.to);
    }
    return Chain(Var(util('slice'))).add(Index(Key('call'), '.', true)).add(Call(args)).compile(o);
  };
  return Slice;
}(Node));
exports.Chain = Chain = (function(superclass){
  var prototype = __extend((__import(Chain, superclass).displayName = 'Chain', Chain), superclass).prototype, constructor = Chain;
  function Chain(head, tails){
    var __this = this instanceof __ctor ? this : new __ctor;
    if (!tails && head instanceof Chain) {
      return head;
    }
    __this.head = head;
    __this.tails = tails || [];
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.children = ['head', 'tails'];
  prototype.add = function(it){
    var bi, that, logics, call, f, __ref;
    if (this.head instanceof Existence) {
      __ref = Chain(this.head.it), this.head = __ref.head, this.tails = __ref.tails;
      it.soak = true;
    }
    this.tails.push(it);
    bi = this.head instanceof Parens && this.head.it instanceof Binary && !this.head.it.partial
      ? this.head.it
      : this.head instanceof Binary && !this.head.partial ? this.head : void 8;
    if (it instanceof Call && !it.method && this.head instanceof Super && !this.head.called) {
      it.method = '.call';
      it.args.unshift(Literal('this'));
      this.head.called = true;
    } else if (that = it.vivify, delete it.vivify, that) {
      this.head = Assign(Chain(this.head, this.tails.splice(0, 9e9)), that(), '=', '||');
    } else if (it instanceof Call && this.tails.length === 1 && bi && __in(bi.op, logics = ['&&', '||', 'xor'])) {
      call = it;
      f = function(x, key){
        var y;
        y = x[key];
        if (y instanceof Binary && __in(y.op, logics)) {
          f(y, 'first');
          return f(y, 'second');
        } else {
          return x[key] = Chain(y).autoCompare(call.args[0]);
        }
      };
      f(bi, 'first');
      f(bi, 'second');
      return bi;
    }
    return this;
  };
  prototype.autoCompare = function(target){
    var test;
    test = this.head;
    switch (false) {
    case !(test instanceof Literal):
      return Binary('===', test, target);
    case !(test instanceof Arr || test instanceof Obj):
      return Binary('====', test, target);
    case !(test instanceof Var && test.value === '_'):
      return Literal('true');
    default:
      return this.add(Call(target
        ? [target]
        : []));
    }
  };
  prototype.flipIt = function(){
    this.flip = true;
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
    var that, __ref;
    if (that = (__ref = this.tails)[__ref.length - 1]) {
      return !((__ref = that.key) != null && __ref.items);
    } else {
      return this.head.isCallable();
    }
  };
  prototype.isArray = function(){
    var that, __ref;
    if (that = (__ref = this.tails)[__ref.length - 1]) {
      return that.key instanceof Arr;
    } else {
      return this.head.isArray();
    }
  };
  prototype.isRegex = function(){
    return this.head.value === 'RegExp' && !this.tails[1] && this.tails[0] instanceof Call;
  };
  prototype.isAssignable = function(){
    var tail, __ref, __i, __len;
    if (!(tail = (__ref = this.tails)[__ref.length - 1])) {
      return this.head.isAssignable();
    }
    if (!(tail instanceof Index) || tail.key instanceof List || tail.symbol === '.~') {
      return false;
    }
    for (__i = 0, __len = (__ref = this.tails).length; __i < __len; ++__i) {
      tail = __ref[__i];
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
    var tail, __ref;
    return (tail = (__ref = this.tails)[__ref.length - 1]) instanceof Call && tail;
  };
  prototype.varName = function(){
    var __ref;
    return (__ref = (__ref = this.tails)[__ref.length - 1]) != null ? __ref.varName() : void 8;
  };
  prototype.cacheReference = function(o){
    var name, base, ref, bref, nref, __ref;
    name = (__ref = this.tails)[__ref.length - 1];
    if (name instanceof Call) {
      return this.cache(o, true);
    }
    if (this.tails.length < 2 && !this.head.isComplex() && !(name != null && name.isComplex())) {
      return [this, this];
    }
    base = Chain(this.head, this.tails.slice(0, -1));
    if (base.isComplex()) {
      ref = o.scope.temporary();
      base = Chain(Assign(Var(ref), base));
      bref = (__ref = Var(ref), __ref.temp = true, __ref);
    }
    if (!name) {
      return [base, bref];
    }
    if (name.isComplex()) {
      ref = o.scope.temporary('key');
      name = Index(Assign(Var(ref), name.key));
      nref = Index((__ref = Var(ref), __ref.temp = true, __ref));
    }
    return [base.add(name), Chain(bref || base.head, [nref || name])];
  };
  prototype.compileNode = function(o){
    var head, tails, that, t, hasPartial, pre, rest, broken, partial, post, base, news, __i, __len, __ref;
    if (this.flip) {
      util('flip');
      util('curry');
    }
    head = this.head, tails = this.tails;
    head.front = this.front;
    head.newed = this.newed;
    if (!tails.length) {
      return head.compile(o);
    }
    if (that = this.unfoldAssign(o)) {
      return that.compile(o);
    }
    for (__i = 0, __len = tails.length; __i < __len; ++__i) {
      t = tails[__i];
      if (t.partialized) {
        hasPartial = true;
        break;
      }
    }
    if (hasPartial) {
      util('slice');
      pre = [];
      rest = [];
      for (__i = 0, __len = tails.length; __i < __len; ++__i) {
        t = tails[__i];
        broken = broken || t.partialized != null;
        if (broken) {
          rest.push(t);
        } else {
          pre.push(t);
        }
      }
      if (rest != null) {
        partial = rest[0], post = __slice.call(rest, 1);
      }
      this.tails = pre;
      return Chain(Chain(Var(util('partialize'))).add(Call([this, Arr(partial.args), Arr(partial.partialized)])), post).compile(o);
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
    for (__i = 0, __len = (__ref = this.tails).length; __i < __len; ++__i) {
      t = __ref[__i];
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
    var that, i, node, bust, test, __ref, __len, __ref1;
    if (that = this.head.unfoldSoak(o)) {
      (__ref = that.then.tails).push.apply(__ref, this.tails);
      return that;
    }
    for (i = 0, __len = (__ref = this.tails).length; i < __len; ++i) {
      node = __ref[i];
      if (__ref1 = node.soak, delete node.soak, __ref1) {
        bust = Chain(this.head, this.tails.splice(0, i));
        if (node.assign && !bust.isAssignable()) {
          node.carp('invalid accessign');
        }
        test = node instanceof Call
          ? (__ref1 = bust.cacheReference(o), test = __ref1[0], this.head = __ref1[1], JS("typeof " + test.compile(o, LEVEL_OP) + " === 'function'"))
          : (i && node.assign
            ? (__ref1 = bust.cacheReference(o), test = __ref1[0], bust = __ref1[1], this.head = bust.head, (__ref1 = this.tails).unshift.apply(__ref1, bust.tails))
            : (__ref1 = bust.unwrap().cache(o, true), test = __ref1[0], this.head = __ref1[1]), Existence(test));
        return __ref1 = If(test, this), __ref1.soak = true, __ref1.cond = this.cond, __ref1['void'] = this['void'], __ref1;
      }
    }
  };
  prototype.unfoldAssign = function(o){
    var that, i, index, op, left, lefts, rites, node, __ref, __len, __len1, __ref1;
    if (that = this.head.unfoldAssign(o)) {
      (__ref = that.right.tails).push.apply(__ref, this.tails);
      return that;
    }
    for (i = 0, __len = (__ref = this.tails).length; i < __len; ++i) {
      index = __ref[i];
      if (op = index.assign) {
        index.assign = '';
        left = Chain(this.head, this.tails.splice(0, i)).expandSlice(o).unwrap();
        if (left instanceof Arr) {
          lefts = left.items;
          rites = (this.head = Arr()).items;
          for (i = 0, __len1 = lefts.length; i < __len1; ++i) {
            node = lefts[i];
            __ref1 = Chain(node).cacheReference(o), rites[i] = __ref1[0], lefts[i] = __ref1[1];
          }
        } else {
          __ref1 = Chain(left).cacheReference(o), left = __ref1[0], this.head = __ref1[1];
        }
        if (op === '=') {
          op = ':=';
        }
        return __ref1 = Assign(left, this, op), __ref1.access = true, __ref1;
      }
    }
  };
  prototype.expandSplat = function(o){
    var tails, i, call, args, ctx, __ref;
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
        __ref = Chain(this.head, tails.splice(0, i - 1)).cache(o, true), this.head = __ref[0], ctx = __ref[1];
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
    var tails, i, that, stars, sub, ref, temps, value, star, __ref, __i, __len;
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
      __ref = Chain(this.head, tails.splice(0, i)).unwrap().cache(o), sub = __ref[0], ref = __ref[1], temps = __ref[2];
      value = Chain(ref, [Index(Key('length'))]).compile(o);
      for (__i = 0, __len = stars.length; __i < __len; ++__i) {
        star = stars[__i];
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
    var tails, i, tail, x, __ref;
    tails = this.tails;
    i = -1;
    while (tail = tails[++i]) {
      if ((__ref = tail.key) != null && __ref.items) {
        if (tails[i + 1] instanceof Call) {
          tail.carp('calling a slice');
        }
        x = tails.splice(0, i + 1);
        x = x.pop().key.toSlice(o, Chain(this.head, x).unwrap(), assign);
        this.head = (x.front = this.front, x);
        i = -1;
      }
    }
    return this;
  };
  return Chain;
}(Node));
exports.Call = Call = (function(superclass){
  var prototype = __extend((__import(Call, superclass).displayName = 'Call', Call), superclass).prototype, constructor = Call;
  function Call(args){
    var splat, i, a, __len, __ref, __this = this instanceof __ctor ? this : new __ctor;
    args || (args = []);
    if (args.length === 1 && (splat = args[0]) instanceof Splat) {
      if (splat.filler) {
        __this.method = '.call';
        args[0] = Literal('this');
        args[1] = Splat(Literal('arguments'));
      } else if (splat.it instanceof Arr) {
        args = splat.it.items;
      }
    } else {
      for (i = 0, __len = args.length; i < __len; ++i) {
        a = args[i];
        if (a.value === '_') {
          args[i] = Chain(Literal('void'));
          args[i].placeholder = true;
          ((__ref = __this.partialized) != null
            ? __ref
            : __this.partialized = []).push(Chain(Literal(i)));
        }
      }
    }
    __this.args = args;
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.children = ['args'];
  prototype.show = function(){
    return [this['new']] + [this.method] + [this.soak ? '?' : void 8];
  };
  prototype.compile = function(o){
    var code, i, a, __ref, __len;
    code = (this.method || '') + '(' + (this.pipe ? "\n" + o.indent : '');
    for (i = 0, __len = (__ref = this.args).length; i < __len; ++i) {
      a = __ref[i];
      code += (i ? ', ' : '') + a.compile(o, LEVEL_LIST);
    }
    return code + ')';
  };
  Call.make = function(callee, args, opts){
    var call;
    call = Call(args);
    if (opts) {
      __import(call, opts);
    }
    return Chain(callee).add(call);
  };
  Call.block = function(fun, args, method){
    var __ref, __ref1;
    return __ref = Parens(Chain(fun, [(__ref1 = Call(args), __ref1.method = method, __ref1)]), true), __ref.calling = true, __ref;
  };
  Call.back = function(params, node, bound, curried){
    var fun, args, index, a, __ref, __len;
    fun = Fun(params, void 8, bound, curried);
    if (fun['void'] = node.op === '!') {
      node = node.it;
    }
    if (node instanceof Label) {
      fun.name = node.label;
      fun.labeled = true;
      node = node.it;
    }
    if (!fun['void'] && (fun['void'] = node.op === '!')) {
      node = node.it;
    }
    if ((__ref = node.getCall()) != null) {
      __ref.partialized = null;
    }
    args = (node.getCall() || (node = Chain(node).add(Call())).getCall()).args;
    for (index = 0, __len = args.length; index < __len; ++index) {
      a = args[index];
      if (a.placeholder) {
        break;
      }
    }
    return node.back = (args[index] = fun).body, node;
  };
  Call['let'] = function(args, body){
    var i, a, params, __res, __len;
    __res = [];
    for (i = 0, __len = args.length; i < __len; ++i) {
      a = args[i];
      if (a.op === '=' && !a.logic) {
        args[i] = a.right;
        __res.push(a.left);
      } else {
        __res.push(Var(a.varName() || a.carp('invalid "let" argument')));
      }
    }
    params = __res;
    args.unshift(Literal('this'));
    return this.block(Fun(params, body), args, '.call');
  };
  return Call;
}(Node));
List = (function(superclass){
  var prototype = __extend((__import(List, superclass).displayName = 'List', List), superclass).prototype, constructor = List;
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
    var node, __i, __ref, __len;
    for (__i = 0, __len = (__ref = this.items).length; __i < __len; ++__i) {
      node = __ref[__i];
      if (node.assigns(it)) {
        return true;
      }
    }
  };
  List.compile = function(o, items, deepEq){
    var indent, level, i, code, that, target;
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
      code += ', ';
      target = that;
      if (deepEq) {
        if (target instanceof Var && target.value === '_') {
          target = Obj([Prop(Key('__placeholder__'), Literal(true))]);
        } else if (target instanceof Obj || target instanceof Arr) {
          target.deepEq = true;
        }
      }
      code += target.compile(o);
    }
    if (~code.indexOf('\n')) {
      code = "\n" + o.indent + code + "\n" + indent;
    }
    o.indent = indent;
    o.level = level;
    return code;
  };
  function List(){
    superclass.apply(this, arguments);
  }
  return List;
}(Node));
exports.Obj = Obj = (function(superclass){
  var prototype = __extend((__import(Obj, superclass).displayName = 'Obj', Obj), superclass).prototype, constructor = Obj;
  function Obj(items){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this.items = items || [];
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.asObj = THIS;
  prototype.toSlice = function(o, base, assign){
    var items, ref, temps, i, node, name, chain, logic, key, val, __ref, __len;
    items = this.items;
    if (items.length > 1) {
      __ref = base.cache(o), base = __ref[0], ref = __ref[1], temps = __ref[2];
    } else {
      ref = base;
    }
    for (i = 0, __len = items.length; i < __len; ++i) {
      node = items[i];
      if (node.comment) {
        continue;
      }
      if (node instanceof Prop || node instanceof Splat) {
        node[name = (__ref = node.children)[__ref.length - 1]] = chain = Chain(base, [Index(node[name].maybeKey())]);
      } else {
        if (logic = node.getDefault()) {
          node = node.first;
        }
        if (node instanceof Parens) {
          __ref = node.cache(o, true), key = __ref[0], node = __ref[1];
          if (assign) {
            __ref = [node, key], key = __ref[0], node = __ref[1];
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
    var items, code, idt, dic, i, node, logic, rest, multi, key, val, __len, __ref;
    items = this.items;
    if (!items.length) {
      return this.front ? '({})' : '{}';
    }
    code = '';
    idt = '\n' + (o.indent += TAB);
    dic = {};
    for (i = 0, __len = items.length; i < __len; ++i) {
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
      if (this.deepEq && node instanceof Prop) {
        if (node.val instanceof Var && node.val.value === '_') {
          node.val = Obj([Prop(Key('__placeholder__'), Literal(true))]);
        } else if ((__ref = node.val) instanceof Obj || __ref instanceof Arr) {
          node.val.deepEq = true;
        }
      }
      if (multi) {
        code += ',';
      } else {
        multi = true;
      }
      code += idt + (node instanceof Prop
        ? (key = node.key, val = node.val, node.accessor
          ? node.compileAccessor(o, key = key.compile(o))
          : (val.ripName(key), (key = key.compile(o)) + ": " + val.compile(o, LEVEL_LIST)))
        : (key = node.compile(o)) + ": " + key);
      ID.test(key) || (key = Function("return " + key)());
      if (!(dic[key + "."] ^= 1)) {
        node.carp("duplicate property \"" + key + "\"");
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
  var prototype = __extend((__import(Prop, superclass).displayName = 'Prop', Prop), superclass).prototype, constructor = Prop;
  function Prop(key, val){
    var that, fun, __i, __len, __this = this instanceof __ctor ? this : new __ctor;
    __this.key = key;
    __this.val = val;
    if (key.value === '...') {
      return Splat(__this.val);
    }
    if (that = val.getAccessors()) {
      __this.val = that;
      for (__i = 0, __len = that.length; __i < __len; ++__i) {
        fun = that[__i];
        fun.x = (fun['void'] = fun.params.length) ? 's' : 'g';
      }
      __this['accessor'] = 'accessor';
    }
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.children = ['key', 'val'];
  prototype.show = function(){
    return this.accessor;
  };
  prototype.assigns = function(it){
    var __ref;
    return typeof (__ref = this.val).assigns === 'function' ? __ref.assigns(it) : void 8;
  };
  prototype.compileAccessor = function(o, key){
    var funs, fun;
    funs = this.val;
    if (funs[1] && funs[0].params.length + funs[1].params.length !== 1) {
      funs[0].carp('invalid accessor parameter');
    }
    return (function(){
      var __i, __ref, __len, __results = [];
      for (__i = 0, __len = (__ref = funs).length; __i < __len; ++__i) {
        fun = __ref[__i];
        fun.accessor = true;
        __results.push(fun.x + "et " + key + fun.compile(o, LEVEL_LIST).slice(8));
      }
      return __results;
    }()).join(',\n' + o.indent);
  };
  prototype.compileDescriptor = function(o){
    var obj, fun, __i, __ref, __len;
    obj = Obj();
    for (__i = 0, __len = (__ref = this.val).length; __i < __len; ++__i) {
      fun = __ref[__i];
      obj.items.push(Prop(Key(fun.x + 'et'), fun));
    }
    obj.items.push(Prop(Key('configurable'), Literal(true)));
    obj.items.push(Prop(Key('enumerable'), Literal(true)));
    return obj.compile(o);
  };
  return Prop;
}(Node));
exports.Arr = Arr = (function(superclass){
  var prototype = __extend((__import(Arr, superclass).displayName = 'Arr', Arr), superclass).prototype, constructor = Arr;
  function Arr(items){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this.items = items || [];
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.isArray = YES;
  prototype.asObj = function(){
    var i, item;
    return Obj((function(){
      var __ref, __len, __results = [];
      for (i = 0, __len = (__ref = this.items).length; i < __len; ++i) {
        item = __ref[i];
        __results.push(Prop(Literal(i), item));
      }
      return __results;
    }.call(this)));
  };
  prototype.toSlice = function(o, base){
    var items, ref, i, item, splat, chain, __ref, __len;
    items = this.items;
    if (items.length > 1) {
      __ref = base.cache(o), base = __ref[0], ref = __ref[1];
    } else {
      ref = base;
    }
    for (i = 0, __len = items.length; i < __len; ++i) {
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
    return "[" + List.compile(o, items, this.deepEq) + "]";
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
  var prototype = __extend((__import(Unary, superclass).displayName = 'Unary', Unary), superclass).prototype, constructor = Unary;
  function Unary(op, it, flag){
    var that, node, __i, __ref, __len, __this = this instanceof __ctor ? this : new __ctor;
    if (it != null) {
      if (that = !flag && it.unaries) {
        that.push(op);
        return it;
      }
      switch (op) {
      case '!':
        if (flag) {
          break;
        }
        if (it instanceof Fun && !it['void']) {
          return it['void'] = true, it;
        }
        return it.invert();
      case '++':
      case '--':
        if (flag) {
          __this.post = true;
        }
        break;
      case 'new':
        if (it instanceof Existence && !it.negated) {
          it = Chain(it).add(Call());
        }
        it.newed = true;
        for (__i = 0, __len = (__ref = it.tails || '').length; __i < __len; ++__i) {
          node = __ref[__i];
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
          return it.bound = '__this', it;
        }
      }
    }
    __this.op = op;
    __this.it = it;
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.children = ['it'];
  prototype.show = function(){
    return [this.post ? '@' : void 8] + this.op;
  };
  prototype.isCallable = function(){
    var __ref;
    return ((__ref = this.op) == 'do' || __ref == 'new' || __ref == 'delete') || this.it == null;
  };
  prototype.isArray = function(){
    return this.it instanceof Arr && this.it.items.length || this.it instanceof Chain && this.it.isArray();
  };
  prototype.isString = function(){
    var __ref;
    return (__ref = this.op) == 'typeof' || __ref == 'classof';
  };
  prototype.invert = function(){
    var __ref;
    if (this.op === '!' && ((__ref = this.it.op) == '!' || __ref == '<' || __ref == '>' || __ref == '<=' || __ref == '>=' || __ref == 'of' || __ref == 'instanceof')) {
      return this.it;
    }
    return constructor('!', this, true);
  };
  prototype.unfoldSoak = function(o){
    var __ref;
    return ((__ref = this.op) == '++' || __ref == '--' || __ref == 'delete') && this.it != null && If.unfoldSoak(o, this, 'it');
  };
  prototype.getAccessors = function(){
    var items;
    if (this.op !== '~') {
      return;
    }
    if (this.it instanceof Fun) {
      return [this.it];
    }
    if (this.it instanceof Arr) {
      items = this.it.items;
      if (!items[2] && items[0] instanceof Fun && items[1] instanceof Fun) {
        return items;
      }
    }
  };
  function crement(it){
    return {
      '++': 'in',
      '--': 'de'
    }[it] + 'crement';
  }
  prototype.compileNode = function(o){
    var that, op, it, x, code;
    if (this.it == null) {
      return this.compileAsFunc(o);
    }
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
      x = Parens(it instanceof Existence && !it.negated
        ? Chain(it).add(Call())
        : Call.make(it));
      return (x.front = this.front, x.newed = this.newed, x).compile(o);
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
      if (that = it instanceof Var && o.scope.checkReadOnly(it.value)) {
        this.carp(crement(op) + " of " + that + " \"" + it.value + "\"", ReferenceError);
      }
      if (this.post) {
        it.front = this.front;
      }
      break;
    case '^^':
      return util('clone') + "(" + it.compile(o, LEVEL_LIST) + ")";
    case 'classof':
      return util('toString') + ".call(" + it.compile(o, LEVEL_LIST) + ").slice(8, -1)";
    }
    code = it.compile(o, LEVEL_OP + PREC.unary);
    if (this.post) {
      code += op;
    } else {
      if ((op == 'new' || op == 'typeof' || op == 'delete') || (op == '+' || op == '-') && op === code.charAt()) {
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
    var it, ops, them, i, node, sp, op, lat, __len, __i, __ref;
    it = this.it;
    ops = [this];
    for (; it instanceof constructor; it = it.it) {
      ops.push(it);
    }
    if (!((it = it.expandSlice(o).unwrap()) instanceof Arr && (them = it.items).length)) {
      return '';
    }
    for (i = 0, __len = them.length; i < __len; ++i) {
      node = them[i];
      if (sp = node instanceof Splat) {
        node = node.it;
      }
      for (__i = ops.length - 1; __i >= 0; --__i) {
        op = ops[__i];
        node = constructor(op.op, node, op.post);
      }
      them[i] = sp ? lat = Splat(node) : node;
    }
    if (!lat && (this['void'] || !o.level)) {
      it = (__ref = Block(them), __ref.front = this.front, __ref['void'] = true, __ref);
    }
    return it.compile(o, LEVEL_PAREN);
  };
  prototype.compilePluck = function(o){
    var get, del, ref, code, __ref;
    __ref = Chain(this.it).cacheReference(o), get = __ref[0], del = __ref[1];
    code = this.assigned
      ? ''
      : (ref = o.scope.temporary()) + " = ";
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
  prototype.compileAsFunc = function(o){
    if (this.op === '!') {
      return util('not');
    } else {
      return "(" + Fun([], Block(Unary(this.op, Chain(Var('it'))))).compile(o) + ")";
    }
  };
  return Unary;
}(Node));
exports.Binary = Binary = (function(superclass){
  var COMPARER, INVERSIONS, prototype = __extend((__import(Binary, superclass).displayName = 'Binary', Binary), superclass).prototype, constructor = Binary;
  function Binary(op, first, second, destructuring){
    var logic, that, __ref, __this = this instanceof __ctor ? this : new __ctor;
    if (destructuring) {
      logic = op.logic;
      if (__toString.call(destructuring).slice(8, -1) === 'String') {
        logic = destructuring;
      }
      op = (function(){
        switch (false) {
        case !(that = logic):
          return that;
        case op !== '=':
          return '?';
        default:
          return '=';
        }
      }());
    }
    __this.partial = first == null || second == null;
    if (!__this.partial) {
      if ('=' === op.charAt(op.length - 1) && ((__ref = op.charAt(op.length - 2)) != '=' && __ref != '<' && __ref != '>' && __ref != '!')) {
        return Assign(first.unwrap(), second, op);
      }
      switch (op) {
      case 'in':
        return new In(first, second);
      case 'with':
        return new Import(Unary('^^', first), second, false);
      case '<<<':
      case '<<<<':
        return Import(first, second, op === '<<<<');
      case '<|':
        return Block(first).pipe(second, op);
      case '|>':
        return Block(second).pipe(first, '<|');
      }
    }
    __this.op = op;
    __this.first = first;
    __this.second = second;
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.children = ['first', 'second'];
  prototype.show = function(){
    return this.op;
  };
  prototype.isCallable = function(){
    var __ref;
    return this.partial || ((__ref = this.op) == '&&' || __ref == '||' || __ref == '?' || __ref == '!?' || __ref == '<<' || __ref == '>>') && this.first.isCallable() && this.second.isCallable();
  };
  prototype.isArray = function(){
    switch (this.op) {
    case '*':
      return this.first.isArray();
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
  COMPARER = /^(?:[!=]=|[<>])=?$/;
  INVERSIONS = {
    '===': '!==',
    '!==': '===',
    '==': '!=',
    '!=': '=='
  };
  prototype.invert = function(){
    var that;
    if (that = !COMPARER.test(this.second.op) && INVERSIONS[this.op]) {
      this.op = that;
      return this;
    }
    return Unary('!', Parens(this), true);
  };
  prototype.invertIt = function(){
    this.inverted = true;
    return this;
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
  prototype.xorChildren = function(test){
    var first, __ref, __ref1;
    if (!(((__ref1 = test(this.second), __ref = first = test(this.first)) || __ref1) && !(__ref && __ref1) && (__ref || __ref1))) {
      return false;
    }
    return first
      ? [this.first, this.second]
      : [this.second, this.first];
  };
  prototype.compileNode = function(o){
    var top, rite, items, that, level, code, __ref;
    if (this.partial) {
      return this.compilePartial(o);
    }
    switch (this.op) {
    case '?':
    case '!?':
      return this.compileExistence(o);
    case '*':
      if (this.second.isString()) {
        return this.compileJoin(o);
      }
      if (this.first.isString() || this.first.isArray()) {
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
    case '^':
      return this.compilePow(o);
    case '<?':
    case '>?':
      return this.compileMinMax(o);
    case '<<':
    case '>>':
      return this.compileCompose(o);
    case '+++':
      return this.compileConcat(o);
    case '%%':
      return this.compileMod(o);
    case 'xor':
      return this.compileXor(o);
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
    case '====':
    case '!===':
      this.op = this.op.slice(0, 3);
      // fallthrough
    case '<==':
    case '>==':
    case '<<=':
    case '>>=':
      return this.compileDeepEq(o);
    default:
      if (COMPARER.test(this.op)) {
        if (that = ((__ref = this.op) == '===' || __ref == '!==') && this.xorChildren(function(it){
          return it.isRegex();
        })) {
          return this.compileRegexEquals(o, that);
        }
        if (this.op === '===' && (this.first instanceof Literal && this.second instanceof Literal) && this.first.isWhat() !== this.second.isWhat()) {
          if (typeof console != 'undefined' && console !== null) {
            console.warn("WARNING: strict comparison of two different types will always be false: " + this.first.value + " == " + this.second.value);
          }
        }
      }
      if (COMPARER.test(this.op) && COMPARER.test(this.second.op)) {
        return this.compileChain(o);
      }
    }
    this.first.front = this.front;
    code = this.first.compile(o, level = LEVEL_OP + PREC[this.op]) + " " + this.mapOp(this.op) + " " + this.second.compile(o, level);
    if (o.level <= level) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  prototype.mapOp = function(op){
    var that;
    switch (false) {
    case !(that = op.match(/\.([&\|\^]|<<|>>>?)\./)):
      return that[1];
    case op !== 'of':
      return 'in';
    default:
      return op;
    }
  };
  prototype.compileChain = function(o){
    var level, code, sub, __ref;
    code = this.first.compile(o, level = LEVEL_OP + PREC[this.op]);
    __ref = this.second.first.cache(o, true), sub = __ref[0], this.second.first = __ref[1];
    code += " " + this.op + " " + sub.compile(o, level) + " && " + this.second.compile(o, LEVEL_OP);
    if (o.level <= LEVEL_OP) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  prototype.compileExistence = function(o){
    var x, __ref;
    if (this.op === '!?') {
      x = (__ref = If(Existence(this.first), this.second), __ref.cond = this.cond, __ref['void'] = this['void'] || !o.level, __ref);
      return x.compileExpression(o);
    }
    if (this['void'] || !o.level) {
      x = Binary('&&', Existence(this.first, true), this.second);
      return (x['void'] = true, x).compileNode(o);
    }
    x = this.first.cache(o, true);
    return If(Existence(x[0]), x[1]).addElse(this.second).compileExpression(o);
  };
  prototype.compileAnyInstanceOf = function(o, items){
    var sub, ref, test, item, __ref, __i, __len;
    __ref = this.first.cache(o), sub = __ref[0], ref = __ref[1], this.temps = __ref[2];
    test = Binary('instanceof', sub, items.shift());
    for (__i = 0, __len = items.length; __i < __len; ++__i) {
      item = items[__i];
      test = Binary('||', test, Binary('instanceof', ref, item));
    }
    return Parens(test).compile(o);
  };
  prototype.compileMinMax = function(o){
    var lefts, rites, x;
    lefts = this.first.cache(o, true);
    rites = this.second.cache(o, true);
    x = Binary(this.op.charAt(), lefts[0], rites[0]);
    return If(x, lefts[1]).addElse(rites[1]).compileExpression(o);
  };
  prototype.compileMethod = function(o, klass, method, arg){
    var args;
    args = [this.second].concat(arg || []);
    if (this.first["is" + klass]()) {
      return Chain(this.first, [Index(Key(method)), Call(args)]).compile(o);
    } else {
      args.unshift(this.first);
      return Call.make(JS(util(method) + '.call'), args).compile(o);
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
    var x, n, items, arr, that, refs, i, item, q, __len, __ref;
    x = this.first, n = this.second;
    items = (x = x.expandSlice(o).unwrap()).items;
    arr = x.isArray() && 'Array';
    if (that = items && Splat.compileArray(o, items)) {
      x = JS(that);
      items = null;
    }
    if (arr && !items || !(n instanceof Literal && n.value < 0x20)) {
      return Call.make(Util('repeat' + (arr || 'String')), [x, n]).compile(o);
    }
    n = +n.value;
    if (1 <= n && n < 2) {
      return x.compile(o);
    }
    if (items) {
      if (n < 1) {
        return Block(items).add(JS('[]')).compile(o);
      }
      refs = [];
      for (i = 0, __len = items.length; i < __len; ++i) {
        item = items[i];
        __ref = item.cache(o, 1), items[i] = __ref[0], refs[refs.length] = __ref[1];
      }
      items.push((__ref = JS(), __ref.compile = function(){
        return (__repeatString(", " + List.compile(o, refs), n - 1)).slice(2);
      }, __ref));
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
  prototype.compileConcat = function(o){
    var f;
    f = function(x){
      switch (false) {
      case !(x instanceof Binary && x.op === '+++'):
        return f(x.first).concat(f(x.second));
      default:
        return [x];
      }
    };
    return Chain(this.first).add(Index(Key('concat'), '.', true)).add(Call(f(this.second))).compile(o);
  };
  prototype.compileCompose = function(o){
    var f, args;
    f = function(x){
      var __ref;
      switch (false) {
      case !(x instanceof Binary && ((__ref = x.op) == '<<' || __ref == '>>')):
        return f(x.first).concat(f(x.second));
      default:
        return [x];
      }
    };
    args = [this.first].concat(f(this.second));
    if (this.op === '>>') {
      args = args.reverse();
    }
    return Chain(Var(util('compose'))).add(Call([Arr(args)])).compile(o);
  };
  prototype.compileMod = function(o){
    var ref, code;
    ref = o.scope.temporary();
    code = "((" + this.first.compile(o) + ") % (" + ref + " = " + this.second.compile(o) + ") + " + ref + ") % " + ref;
    o.scope.free(ref);
    return code;
  };
  prototype.compilePartial = function(o){
    var vit, x, y;
    vit = Var('it');
    switch (false) {
    case !(this.first == null && this.second == null):
      x = Var('__x');
      y = Var('__y');
      return Fun([x, y], Block(Binary(this.op, x, y).invertCheck(this)), false, true).compile(o);
    case this.first == null:
      return "(" + Fun([vit], Block(Binary(this.op, this.first, vit).invertCheck(this))).compile(o) + ")";
    default:
      return "(" + Fun([vit], Block(Binary(this.op, vit, this.second).invertCheck(this))).compile(o) + ")";
    }
  };
  prototype.compileRegexEquals = function(o, __arg){
    var regex, target;
    regex = __arg[0], target = __arg[1];
    if (this.op === '===') {
      return Chain(regex).add(Index(Key('exec'))).add(Call([target])).compile(o);
    } else {
      return Unary('!', Chain(regex).add(Index(Key('test'))).add(Call([target]))).compile(o);
    }
  };
  prototype.compileDeepEq = function(o){
    var negate, x, r, __ref, __i, __len;
    if ((__ref = this.op) == '>==' || __ref == '>>=') {
      __ref = [this.second, this.first], this.first = __ref[0], this.second = __ref[1];
      this.op = this.op === '>==' ? '<==' : '<<=';
    }
    if (this.op === '!==') {
      this.op = '===';
      negate = true;
    }
    for (__i = 0, __len = (__ref = [this.first, this.second]).length; __i < __len; ++__i) {
      x = __ref[__i];
      if (x instanceof Obj || x instanceof Arr) {
        x.deepEq = true;
      }
    }
    r = Chain(Var(util('deepEq'))).add(Call([this.first, this.second, Literal("'" + this.op + "'")]));
    return (negate ? Unary('!', r) : r).compile(o);
  };
  prototype.compileXor = function(o){
    var left, right;
    left = Chain(this.first).cacheReference(o);
    right = Chain(this.second).cacheReference(o);
    return Binary('&&', Binary('&&', Parens(Binary('||', Block([right[0], left[0]]), right[1])), Unary('!', Binary('&&', left[1], right[1]))), Parens(Binary('||', left[1], right[1]))).compile(o);
  };
  return Binary;
}(Node));
exports.Assign = Assign = (function(superclass){
  var prototype = __extend((__import(Assign, superclass).displayName = 'Assign', Assign), superclass).prototype, constructor = Assign;
  function Assign(left, rite, op, logic, defParam){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this.left = left;
    __this.op = op || '=';
    __this.logic = logic || __this.op.logic;
    __this.defParam = defParam;
    __this.op += '';
    __this[rite instanceof Node ? 'right' : 'unaries'] = rite;
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.children = ['left', 'right'];
  prototype.show = function(){
    return (this.logic || '') + this.op;
  };
  prototype.assigns = function(it){
    return this.left.assigns(it);
  };
  prototype.delegate(['isCallable', 'isRegex'], function(it){
    var __ref;
    return ((__ref = this.op) == '=' || __ref == ':=') && this.right[it]();
  });
  prototype.isArray = function(){
    switch (this.op) {
    case '=':
    case ':=':
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
    var that, rite, temps, __ref;
    if (this.left instanceof Existence) {
      if (that = (__ref = this.left = this.left.it).name, delete __ref.name, that) {
        rite = this.right;
        rite = Assign(this.right = Var(that), rite);
      } else {
        __ref = this.right.cache(o), rite = __ref[0], this.right = __ref[1], temps = __ref[2];
      }
      return __ref = If(Existence(rite), this), __ref.temps = temps, __ref.cond = this.cond, __ref['void'] = this['void'], __ref;
    }
    return If.unfoldSoak(o, this, 'left');
  };
  prototype.unfoldAssign = function(){
    return this.access && this;
  };
  prototype.compileNode = function(o){
    var left, op, right, reft, lvar, sign, name, empty, res, code, del, that, __ref, __i, __len;
    if (this.left instanceof Slice) {
      return this.compileSplice(o);
    }
    left = this.left.expandSlice(o, true).unwrap();
    if (!this.right) {
      left.isAssignable() || left.carp('invalid unary assign');
      __ref = Chain(left).cacheReference(o), left = __ref[0], this.right = __ref[1];
      for (__i = 0, __len = (__ref = this.unaries).length; __i < __len; ++__i) {
        op = __ref[__i];
        this.right = Unary(op, this.right);
      }
    }
    if (left.isEmpty()) {
      return (__ref = Parens(this.right), __ref.front = this.front, __ref.newed = this.newed, __ref).compile(o);
    }
    if (left.getDefault()) {
      this.right = Binary(left.op, this.right, left.second);
      left = left.first;
    }
    if (left.items) {
      return this.compileDestructuring(o, left);
    }
    left.isAssignable() || left.carp('invalid assign');
    if (this.logic) {
      return this.compileConditional(o, left);
    }
    op = this.op, right = this.right;
    if (op == '<?=' || op == '>?=') {
      return this.compileMinMax(o, left, right);
    }
    if ((op == '**=' || op == '^=' || op == '%%=') || op === '*=' && right.isString() || (op == '-=' || op == '/=') && right.isMatcher()) {
      __ref = Chain(left).cacheReference(o), left = __ref[0], reft = __ref[1];
      right = Binary(op.slice(0, -1), reft, right);
      op = ':=';
    }
    if (op == '.&.=' || op == '.|.=' || op == '.^.=' || op == '.<<.=' || op == '.>>.=' || op == '.>>>.=') {
      op = op.slice(1, -2) + '=';
    }
    (right = right.unparen()).ripName(left = left.unwrap());
    lvar = left instanceof Var;
    sign = op.replace(':', '');
    name = (left.front = true, left).compile(o, LEVEL_LIST);
    code = !o.level && right instanceof While && !right['else'] && (lvar || left.isSimpleAccess())
      ? (empty = right.objComp ? '{}' : '[]', (res = o.scope.temporary('res')) + " = " + empty + ";\n" + this.tab + right.makeReturn(res).compile(o) + "\n" + this.tab + name + " " + sign + " " + o.scope.free(res))
      : (name + " " + sign + " ") + (right.assigned = true, right).compile(o, LEVEL_LIST);
    if (lvar) {
      del = right.op === 'delete';
      if (op === '=') {
        o.scope.declare(name, left, this['const'] || !this.defParam && o['const'] && '__' !== name.slice(0, 2));
      } else if (that = o.scope.checkReadOnly(name)) {
        left.carp("assignment to " + that + " \"" + name + "\"", ReferenceError);
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
    var lefts, morph, __ref;
    if (left instanceof Var && ((__ref = this.logic) == '?' || __ref == '!?') && this.op === '=') {
      o.scope.declare(left.value, left);
    }
    lefts = Chain(left).cacheReference(o);
    morph = Binary(this.logic, lefts[0], (this.logic = false, this.left = lefts[1], this));
    return (morph['void'] = this['void'], morph).compileNode(o);
  };
  prototype.compileMinMax = function(o, left, right){
    var lefts, rites, test, put, __ref;
    lefts = Chain(left).cacheReference(o);
    rites = right.cache(o, true);
    test = Binary(this.op.replace('?', ''), lefts[0], rites[0]);
    put = Assign(lefts[1], rites[1], ':=');
    if (this['void'] || !o.level) {
      return Parens(Binary('||', test, put)).compile(o);
    }
    __ref = test.second.cache(o, true), test.second = __ref[0], left = __ref[1];
    return If(test, left).addElse(put).compileExpression(o);
  };
  prototype.compileDestructuring = function(o, left){
    var items, len, ret, rite, that, cache, rref, list, code;
    items = left.items, len = items.length;
    ret = o.level && !this['void'];
    rite = this.right.compile(o, len === 1 ? LEVEL_CALL : LEVEL_LIST);
    if (that = left.name) {
      cache = that + " = " + rite;
      o.scope.declare(rite = that, left);
    } else if ((ret || len > 1) && (!ID.test(rite) || left.assigns(rite))) {
      cache = (rref = o.scope.temporary()) + " = " + rite;
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
  prototype.compileSplice = function(o){
    var fromExpNode, fromExp, rightNode, right, toExp, __ref;
    __ref = Chain(this.left.from).cacheReference(o), fromExpNode = __ref[0], fromExp = __ref[1];
    __ref = Chain(this.right).cacheReference(o), rightNode = __ref[0], right = __ref[1];
    toExp = Binary('-', this.left.to, fromExp);
    return Block([Chain(Var(util('splice'))).add(Index(Key('apply'), '.', true)).add(Call([this.left.target, Chain(Arr([fromExpNode, toExp])).add(Index(Key('concat'), '.', true)).add(Call([rightNode]))])), right]).compile(o, LEVEL_LIST);
  };
  prototype.rendArr = function(o, nodes, rite){
    var i, node, skip, len, val, ivar, start, inc, rcache, __len, __ref, __results = [];
    for (i = 0, __len = nodes.length; i < __len; ++i) {
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
          val = Arr.wrap(JS(util('slice') + '.call(' + rite + (i ? ", " + i + ")" : ')')));
        } else {
          val = ivar = rite + ".length - " + (len - i - 1);
          if (skip && i + 2 === len) {
            continue;
          }
          start = i + 1;
          this.temps = [ivar = o.scope.temporary('i')];
          val = skip
            ? (node = Var(ivar), Var(val))
            : Arr.wrap(JS(i + " < (" + ivar + " = " + val + ")\ ? " + util('slice') + ".call(" + rite + ", " + i + ", " + ivar + ")\ : (" + ivar + " = " + i + ", [])"));
        }
      } else {
        (inc = ivar) && start < i && (inc += " + " + (i - start));
        val = Chain(rcache || (rcache = Literal(rite)), [Index(JS(inc || i))]);
      }
      if (node instanceof Assign) {
        node = Binary(node.op, node.left, node.right, node.logic || true);
      }
      __results.push((__ref = __clone(this), __ref.left = node, __ref.right = val, __ref['void'] = true, __ref).compile(o, LEVEL_PAREN));
    }
    return __results;
  };
  prototype.rendObj = function(o, nodes, rite){
    var node, splat, logic, key, rcache, val, __i, __len, __ref, __results = [];
    for (__i = 0, __len = nodes.length; __i < __len; ++__i) {
      node = nodes[__i];
      if (splat = node instanceof Splat) {
        node = node.it;
      }
      if (logic = node.getDefault()) {
        node = node.first;
      }
      if (node instanceof Parens) {
        __ref = Chain(node.it).cacheReference(o), node = __ref[0], key = __ref[1];
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
      __results.push((__ref = __clone(this), __ref.left = node, __ref.right = val, __ref['void'] = true, __ref).compile(o, LEVEL_PAREN));
    }
    return __results;
  };
  return Assign;
}(Node));
exports.Import = Import = (function(superclass){
  var prototype = __extend((__import(Import, superclass).displayName = 'Import', Import), superclass).prototype, constructor = Import;
  function Import(left, right, all){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this.left = left;
    __this.right = right;
    __this.all = all && 'All';
    if (!all && left instanceof Obj && right.items) {
      return Obj(left.items.concat(right.asObj().items));
    }
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.children = ['left', 'right'];
  prototype.show = function(){
    return this.all;
  };
  prototype.delegate(['isCallable', 'isArray'], function(it){
    return this.left[it]();
  });
  prototype.unfoldSoak = function(o){
    var left, value, temps, __ref;
    left = this.left;
    if (left instanceof Existence && !left.negated) {
      if ((left = left.it) instanceof Var) {
        value = (this.left = left).value;
        if (!o.scope.check(value, true)) {
          left = JS("typeof " + value + " != 'undefined' && " + value);
        }
      } else {
        __ref = left.cache(o), left = __ref[0], this.left = __ref[1], temps = __ref[2];
      }
      return __ref = If(left, this), __ref.temps = temps, __ref.soak = true, __ref.cond = this.cond, __ref['void'] = this['void'], __ref;
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
    var top, reft, left, delim, space, code, i, node, com, logic, dyna, key, val, __ref, __len;
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
      __ref = this.left.cache(o), left = __ref[0], reft = __ref[1], this.temps = __ref[2];
    }
    __ref = top
      ? [';', '\n' + this.tab]
      : [',', ' '], delim = __ref[0], space = __ref[1];
    delim += space;
    code = this.temps ? left.compile(o, LEVEL_PAREN) + delim : '';
    for (i = 0, __len = items.length; i < __len; ++i) {
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
        __ref = node.it.cache(o, true), key = __ref[0], val = __ref[1];
      } else if (node instanceof Prop) {
        key = node.key, val = node.val;
        if (node.accessor) {
          if (key instanceof Key) {
            key = JS("'" + key.name + "'");
          }
          code += "Object.defineProperty(" + reft.compile(o, LEVEL_LIST) + ", " + key.compile(o, LEVEL_LIST) + ", " + node.compileDescriptor(o) + ")";
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
exports.In = In = (function(superclass){
  var prototype = __extend((__import(In, superclass).displayName = 'In', In), superclass).prototype, constructor = In;
  __importAll(prototype, arguments[1]);
  function In(item, array){
    this.item = item;
    this.array = array;
  }
  prototype.children = ['item', 'array'];
  prototype.compileNode = function(o){
    var array, items, code, sub, ref, cmp, cnj, i, test, __ref, __len;
    items = (array = this.array.expandSlice(o).unwrap()).items;
    if (!(array instanceof Arr) || items.length < 2) {
      return (this.negated ? '!' : '') + "" + util('in') + "(" + this.item.compile(o, LEVEL_LIST) + ", " + array.compile(o, LEVEL_LIST) + ")";
    }
    code = '';
    __ref = this.item.cache(o, false, LEVEL_PAREN), sub = __ref[0], ref = __ref[1];
    __ref = this.negated
      ? [' != ', ' && ']
      : [' == ', ' || '], cmp = __ref[0], cnj = __ref[1];
    for (i = 0, __len = items.length; i < __len; ++i) {
      test = items[i];
      code && (code += cnj);
      if (test instanceof Splat) {
        code += (__ref = new In(Var(ref), test.it), __ref.negated = this.negated, __ref).compile(o, LEVEL_TOP);
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
  return In;
}(Node, Negatable));
exports.Existence = Existence = (function(superclass){
  var prototype = __extend((__import(Existence, superclass).displayName = 'Existence', Existence), superclass).prototype, constructor = Existence;
  __importAll(prototype, arguments[1]);
  function Existence(it, negated){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this.it = it;
    __this.negated = negated;
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.children = ['it'];
  prototype.compileNode = function(o){
    var node, code, op, eq, __ref;
    node = (__ref = this.it.unwrap(), __ref.front = this.front, __ref);
    code = node.compile(o, LEVEL_OP + PREC['==']);
    if (node instanceof Var && !o.scope.check(code, true)) {
      __ref = this.negated
        ? ['||', '=']
        : ['&&', '!'], op = __ref[0], eq = __ref[1];
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
}(Node, Negatable));
exports.Fun = Fun = (function(superclass){
  var prototype = __extend((__import(Fun, superclass).displayName = 'Fun', Fun), superclass).prototype, constructor = Fun;
  function Fun(params, body, bound, curried){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this.params = params || [];
    __this.body = body || Block();
    __this.bound = bound && '__this';
    __this.curried = curried || false;
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
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
  prototype.traverseChildren = function(__arg, xscope){
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
    this.name || (this.name = it.varName());
  };
  prototype.compileNode = function(o){
    var pscope, sscope, scope, that, inLoop, body, name, tab, code, curryCodeCheck, __ref, __this = this;
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
    if (inLoop = o.loop, delete o.loop, inLoop) {
      o.indent = this.tab = '';
    }
    o.indent += TAB;
    body = this.body, name = this.name, tab = this.tab;
    code = 'function';
    if (this.bound === '__this') {
      if (this.ctor) {
        scope.assign('__this', 'this instanceof __ctor ? this : new __ctor');
        body.add(Return(Literal('__this')));
      } else if (that = (__ref = sscope.fun) != null ? __ref.bound : void 8) {
        this.bound = that;
      } else {
        sscope.assign('__this', 'this');
      }
    }
    if (this.statement) {
      name || this.carp('nameless function declaration');
      pscope === o.block.scope || this.carp('misplaced function declaration');
      this.accessor && this.carp('named accessor');
      pscope.add(name, 'function', this);
    }
    if (this.statement || name && this.labeled) {
      code += ' ' + scope.add(name, 'function', this);
    }
    this['void'] || this.ctor || this.newed || body.makeReturn();
    code += "(" + this.compileParams(scope) + "){";
    if (that = body.compileWithDeclarations(o)) {
      code += "\n" + that + "\n" + tab;
    }
    code += '}';
    curryCodeCheck = function(){
      if (__this.curried) {
        if (__this.hasSplats) {
          __this.carp('cannot curry a function with a variable number of arguments');
        }
        return util('curry') + "(" + code + ")";
      } else {
        return code;
      }
    };
    if (inLoop) {
      return pscope.assign(pscope.temporary('fn'), curryCodeCheck());
    }
    if (this.returns) {
      code += "\n" + tab + "return " + name + ";";
    } else if (this.bound && this.ctor) {
      code += ' function __ctor(){} __ctor.prototype = prototype;';
    }
    code = curryCodeCheck();
    if (this.front && !this.statement) {
      return "(" + code + ")";
    } else {
      return code;
    }
  };
  prototype.compileParams = function(scope){
    var params, body, names, assigns, i, p, splace, rest, that, dic, vr, df, v, name, __len, __i, __ref, __ref1;
    params = this.params, body = this.body;
    names = [];
    assigns = [];
    for (i = 0, __len = params.length; i < __len; ++i) {
      p = params[i];
      if (p instanceof Splat) {
        splace = i;
        this.hasSplats = true;
      } else if (p.op === '=') {
        params[i] = Binary(p.logic || '?', p.left, p.right);
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
      for (__i = 0, __len = params.length; __i < __len; ++__i) {
        p = params[__i];
        vr = p;
        if (df = vr.getDefault()) {
          vr = vr.first;
        }
        if (vr.isEmpty()) {
          vr = Var(scope.temporary('arg'));
        } else if (!(vr instanceof Var)) {
          v = Var((__ref1 = (__ref = vr.it || vr).name, delete __ref.name, __ref1) || vr.varName() || scope.temporary('arg'));
          assigns.push(Assign(vr, df ? Binary(p.op, v, p.second) : v));
          vr = v;
        } else if (df) {
          assigns.push(Assign(vr, p.second, '=', p.op, true));
        }
        names.push(name = scope.add(vr.value, 'arg', p));
        if (!(dic[name + "."] = dic[name + "."] ^ 1)) {
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
      (__ref = this.body).prepend.apply(__ref, assigns);
    }
    return names.join(', ');
  };
  return Fun;
}(Node));
exports.Class = Class = (function(superclass){
  var prototype = __extend((__import(Class, superclass).displayName = 'Class', Class), superclass).prototype, constructor = Class;
  function Class(__arg){
    var body;
    this.title = __arg.title, this.sup = __arg.sup, this.mixins = __arg.mixins, body = __arg.body;
    this.fun = Fun([], body);
  }
  prototype.children = ['title', 'sup', 'mixins', 'fun'];
  prototype.isCallable = YES;
  prototype.ripName = function(it){
    this.name = it.varName();
  };
  prototype.compile = function(o, level){
    var fun, body, lines, title, boundFuncs, decl, name, proto, i, node, prop, f, ctor, vname, args, that, imports, clas, __len, __i, __ref, __len1, __ref1, __j, __len2, __res;
    fun = this.fun, body = fun.body, lines = body.lines, title = this.title;
    boundFuncs = [];
    decl = title != null ? title.varName() : void 8;
    name = decl || this.name;
    if (ID.test(name || '')) {
      fun.cname = name;
    } else {
      name = 'constructor';
    }
    proto = Var('prototype');
    for (i = 0, __len = lines.length; i < __len; ++i) {
      node = lines[i];
      if (node instanceof Obj) {
        lines[i] = Import(proto, node);
        for (__i = 0, __len1 = (__ref = node.items).length; __i < __len1; ++__i) {
          prop = __ref[__i];
          if ((__ref1 = prop.key) instanceof Key || __ref1 instanceof Literal) {
            if (prop.val instanceof Fun) {
              prop.val.meth = prop.key;
              if (prop.val.bound) {
                boundFuncs.push(prop.key);
                prop.val.bound = false;
              }
            } else if (prop.accessor) {
              for (__j = 0, __len2 = (__ref1 = prop.val).length; __j < __len2; ++__j) {
                f = __ref1[__j];
                f.meth = prop.key;
              }
            }
          }
        }
      } else if (node instanceof Fun && !node.statement) {
        ctor && node.carp('redundant constructor');
        ctor = node;
      } else if (node instanceof Assign && node.left instanceof Chain && node.left.head.value === 'this' && node.right instanceof Fun) {
        node.right.stat = node.left.tails[0].key;
      }
    }
    ctor || (ctor = lines[lines.length] = this.sup && ((__ref = this.sup) instanceof Fun || __ref instanceof Var)
      ? Fun([], Block(Chain(new Super).add(Call([Splat(Literal('arguments'))]))))
      : Fun());
    ctor.name = name;
    ctor.ctor = true;
    ctor.statement = true;
    for (__i = 0, __len = boundFuncs.length; __i < __len; ++__i) {
      f = boundFuncs[__i];
      ctor.body.lines.unshift(Assign(Chain(Literal('this')).add(Index(f)), Chain(Var(util('bind'))).add(Call([Literal('this'), Literal("'" + f.name + "'"), Var('prototype')]))));
    }
    lines.push(vname = fun.proto = Var(fun.bound = name));
    args = [];
    if (that = this.sup) {
      args.push(that);
      imports = Chain(Import(Literal('this'), Var('superclass')));
      fun.proto = Util.Extends(fun.cname ? Block([Assign(imports.add(Index(Key('displayName'))), Literal("'" + name + "'")), Literal(name)]) : imports, (__ref = fun.params)[__ref.length] = Var('superclass'));
    }
    if (that = this.mixins) {
      __res = [];
      for (__i = 0, __len = that.length; __i < __len; ++__i) {
        args[args.length] = that[__i];
        __res.push(Import(proto, JS("arguments[" + (args.length - 1) + "]"), true));
      }
      imports = __res;
      body.prepend.apply(body, imports);
    }
    if (fun.cname && !this.sup) {
      body.prepend(Literal(name + ".displayName = '" + name + "'"));
    }
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
  var prototype = __extend((__import(Super, superclass).displayName = 'Super', Super), superclass).prototype, constructor = Super;
  function Super(){}
  prototype.isCallable = YES;
  prototype.compile = function(o){
    var scope, that, result;
    scope = o.scope;
    for (; that = !scope.get('superclass') && scope.fun; scope = scope.parent) {
      result = that;
      if (that = result.meth) {
        return 'superclass.prototype' + Index(that).compile(o);
      }
      if (that = result.stat) {
        return 'superclass' + Index(that).compile(o);
      }
    }
    return 'superclass';
  };
  return Super;
}(Node));
exports.Parens = Parens = (function(superclass){
  var prototype = __extend((__import(Parens, superclass).displayName = 'Parens', Parens), superclass).prototype, constructor = Parens;
  function Parens(it, keep, string){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this.it = it;
    __this.keep = keep;
    __this.string = string;
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
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
  prototype.unparen = function(){
    if (this.keep) {
      return this;
    } else {
      return this.it.unparen();
    }
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
  var __ref, prototype = __extend((__import(Splat, superclass).displayName = 'Splat', Splat), superclass).prototype, constructor = Splat;
  function Splat(it, filler){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this.it = it;
    __this.filler = filler;
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  __ref = Parens.prototype, prototype.children = __ref.children, prototype.isComplex = __ref.isComplex;
  prototype.isAssignable = YES;
  prototype.assigns = function(it){
    return this.it.assigns(it);
  };
  prototype.compile = function(){
    return this.carp('invalid splat');
  };
  Splat.compileArray = function(o, list, apply){
    var index, node, args, atoms, __len, __i, __ref;
    expand(list);
    for (index = 0, __len = list.length; index < __len; ++index) {
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
    for (__i = 0, __len = (__ref = list.splice(index, 9e9)).length; __i < __len; ++__i) {
      node = __ref[__i];
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
  function expand(nodes){
    var index, node, it;
    index = -1;
    while (node = nodes[++index]) {
      if (node instanceof Splat) {
        it = node.it;
        if (it.isEmpty()) {
          nodes.splice(index--, 1);
        } else if (it instanceof Arr) {
          nodes.splice.apply(nodes, [index, 1].concat(__slice.call(expand(it.items))));
          index += it.items.length - 1;
        }
      }
    }
    return nodes;
  }
  function ensureArray(node){
    if (node.isArray()) {
      return node;
    }
    return Call.make(JS(util('slice') + '.call'), [node]);
  }
  return Splat;
}(Node));
exports.Jump = Jump = (function(superclass){
  var prototype = __extend((__import(Jump, superclass).displayName = 'Jump', Jump), superclass).prototype, constructor = Jump;
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
      return !__in(that, ctx.labels || (ctx.labels = [])) && this;
    }
  };
  prototype.compileNode = function(o){
    var that;
    if (that = this.label) {
      __in(that, o.labels || (o.labels = [])) || this.carp("unknown label \"" + that + "\"");
    } else {
      o[this.verb] || this.carp("stray " + this.verb);
    }
    return this.show() + ';';
  };
  Jump.extended = function(sub){
    sub.prototype.children = ['it'];
    this[sub.displayName.toLowerCase()] = sub;
  };
  return Jump;
}(Node));
exports.Throw = Throw = (function(superclass){
  var prototype = __extend((__import(Throw, superclass).displayName = 'Throw', Throw), superclass).prototype, constructor = Throw;
  function Throw(it){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this.it = it;
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.getJump = VOID;
  prototype.compileNode = function(o){
    var __ref;
    return "throw " + (((__ref = this.it) != null ? __ref.compile(o, LEVEL_PAREN) : void 8) || 'null') + ";";
  };
  return Throw;
}(Jump));
exports.Return = Return = (function(superclass){
  var prototype = __extend((__import(Return, superclass).displayName = 'Return', Return), superclass).prototype, constructor = Return;
  function Return(it){
    var __this = this instanceof __ctor ? this : new __ctor;
    if (it && it.value !== 'void') {
      __this.it = it;
    }
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.getJump = THIS;
  prototype.compileNode = function(o){
    var that;
    return "return" + ((that = this.it) ? ' ' + that.compile(o, LEVEL_PAREN) : '') + ";";
  };
  return Return;
}(Jump));
exports.While = While = (function(superclass){
  var prototype = __extend((__import(While, superclass).displayName = 'While', While), superclass).prototype, constructor = While;
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
  prototype.makeComprehension = function(toAdd, loops){
    while (loops.length) {
      toAdd = loops.pop().addBody(Block(toAdd));
    }
    return this.addBody(Block(toAdd));
  };
  prototype.getJump = function(ctx){
    var node, __i, __ref, __ref1, __len;
    ctx || (ctx = {});
    ctx['continue'] = true;
    ctx['break'] = true;
    for (__i = 0, __len = (__ref = ((__ref1 = this.body) != null ? __ref1.lines : void 8) || []).length; __i < __len; ++__i) {
      node = __ref[__i];
      if (node.getJump(ctx)) {
        return node;
      }
    }
  };
  prototype.addBody = function(body){
    var top;
    this.body = body;
    if (this.guard) {
      this.body = Block(If(this.guard, body));
    }
    top = this.body.lines[0];
    if ((top != null ? top.verb : void 8) === 'continue' && !top.label) {
      this.body.lines.length = 0;
    }
    return this;
  };
  prototype.addGuard = function(guard){
    this.guard = guard;
    return this;
  };
  prototype.addObjComp = function(){
    this.objComp = true;
    return this;
  };
  prototype.makeReturn = function(it){
    var __ref;
    if (it) {
      if (this.objComp) {
        this.body = Block(this.body.makeObjReturn(it));
        if (this.guard) {
          this.body = If(this.guard, this.body);
        }
      } else {
        this.body.makeReturn(it);
        if ((__ref = this['else']) != null) {
          __ref.makeReturn(it);
        }
      }
    } else {
      this.getJump() || (this.returns = true);
    }
    return this;
  };
  prototype.compileNode = function(o){
    var test, head, that, __ref;
    o.loop = true;
    this.test && (this.un
      ? this.test = this.test.invert()
      : this.anaphorize());
    if (this.post) {
      return 'do {' + this.compileBody((o.indent += TAB, o));
    }
    test = ((__ref = this.test) != null ? __ref.compile(o, LEVEL_PAREN) : void 8) || '';
    if (!(this.update || this['else'])) {
      head = test ? "while (" + test : 'for (;;';
    } else {
      head = 'for (';
      if (this['else']) {
        head += (this.yet = o.scope.temporary('yet')) + " = true";
      }
      head += ";" + (test && ' ' + test) + ";";
      if (that = this.update) {
        head += ' ' + that.compile(o, LEVEL_PAREN);
      }
    }
    return head + ') {' + this.compileBody((o.indent += TAB, o));
  };
  prototype.compileBody = function(o){
    var lines, yet, tab, ret, code, empty, res, that, __key, __ref;
    o['break'] = o['continue'] = true;
    lines = this.body.lines, yet = this.yet, tab = this.tab;
    code = ret = '';
    if (this.returns) {
      if (this.objComp) {
        this.body = Block(this.body.makeObjReturn('__results'));
      }
      if (this.guard && this.objComp) {
        this.body = If(this.guard, this.body);
      }
      empty = this.objComp ? '{}' : '[]';
      if (lines[__key = lines.length - 1] != null) {
        lines[__key] = lines[__key].makeReturn(res = o.scope.assign('__results', empty));
      }
      ret = "\n" + this.tab + "return " + (res || empty) + ";";
      if ((__ref = this['else']) != null) {
        __ref.makeReturn();
      }
    }
    yet && lines.unshift(JS(yet + " = false;"));
    if (that = this.body.compile(o, LEVEL_TOP)) {
      code += "\n" + that + "\n" + tab;
    }
    code += '}';
    if (this.post) {
      code += " while (" + this.test.compile((o.tab = tab, o), LEVEL_PAREN) + ");";
    }
    if (yet) {
      code += " if (" + yet + ") " + this.compileBlock(o, Block(this['else']));
      o.scope.free(yet);
    }
    return code + ret;
  };
  return While;
}(Node));
exports.For = For = (function(superclass){
  var prototype = __extend((__import(For, superclass).displayName = 'For', For), superclass).prototype, constructor = For;
  function For(it){
    __importAll(this, it);
    if (this.item instanceof Var && !this.item.value) {
      this.item = null;
    }
  }
  prototype.children = ['item', 'source', 'from', 'to', 'step', 'body'];
  prototype.aSource = null;
  prototype.show = function(){
    return this.index;
  };
  prototype.compileNode = function(o){
    var temps, idx, pvar, step, tvar, tail, vars, eq, cond, svar, srcPart, lvar, head, that, body, __ref;
    o.loop = true;
    temps = this.temps = [];
    if (idx = this.index) {
      o.scope.declare(idx, this);
    } else {
      temps.push(idx = o.scope.temporary('i'));
    }
    if (!this.body) {
      this.addBody(Block(Var(idx)));
    }
    if (!this.object) {
      __ref = (this.step || Literal(1)).compileLoopReference(o, 'step'), pvar = __ref[0], step = __ref[1];
      pvar === step || temps.push(pvar);
    }
    if (this.from) {
      __ref = this.to.compileLoopReference(o, 'to'), tvar = __ref[0], tail = __ref[1];
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
      if (this.item || this.object && this.own) {
        __ref = this.source.compileLoopReference(o, 'ref', !this.object), svar = __ref[0], srcPart = __ref[1];
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
    this['else'] && (this.yet = o.scope.temporary('yet'));
    head = 'for (';
    if (this.object) {
      head += idx + " in ";
    }
    if (that = this.yet) {
      head += that + " = true, ";
    }
    if (this.object) {
      head += srcPart;
    } else {
      step === pvar || (vars += ', ' + step);
      head += (vars + "; " + cond + "; ") + (1 == Math.abs(pvar)
        ? (pvar < 0 ? '--' : '++') + idx
        : idx + (pvar < 0
          ? ' -= ' + pvar.slice(1)
          : ' += ' + pvar));
    }
    this.own && (head += ") if (" + o.scope.assign('__own', '{}.hasOwnProperty') + ".call(" + svar + ", " + idx + ")");
    head += ') {';
    this.infuseIIFE();
    o.indent += TAB;
    if (this.item && !this.item.isEmpty()) {
      head += '\n' + o.indent + Assign(this.item, JS(svar + "[" + idx + "]")).compile(o, LEVEL_TOP) + ';';
    }
    body = this.compileBody(o);
    if (this.item && '}' === body.charAt(0)) {
      head += '\n' + this.tab;
    }
    return head + body;
  };
  prototype.infuseIIFE = function(){
    var __this = this;
    function dup(params, name){
      var p, __i, __len;
      if (name) {
        for (__i = 0, __len = params.length; __i < __len; ++__i) {
          p = params[__i];
          if (name === p.value) {
            return true;
          }
        }
      }
    }
    this.body.traverseChildren(function(it){
      var fun, params, call, index, item;
      if (!(it.calling || it.op === 'new' && (fun = it.it).params)) {
        return;
      }
      if (fun) {
        it.it = Call.make((fun['void'] = true, fun));
      } else {
        fun = it.it.head;
      }
      params = fun.params;
      call = it.it.tails[0];
      if (params.length ^ call.args.length - !!call.method) {
        return;
      }
      index = __this.index, item = __this.item;
      if (index && !dup(params, index)) {
        call.args.push(params[params.length] = Var(index));
      }
      if (item instanceof Var && !dup(params, item.value)) {
        call.args.push(params[params.length] = item);
      }
    });
  };
  return For;
}(While));
exports.Try = Try = (function(superclass){
  var prototype = __extend((__import(Try, superclass).displayName = 'Try', Try), superclass).prototype, constructor = Try;
  function Try(attempt, thrown, recovery, ensure){
    this.attempt = attempt;
    this.thrown = thrown != null ? thrown : '__e';
    this.recovery = recovery;
    this.ensure = ensure;
  }
  prototype.children = ['attempt', 'recovery', 'ensure'];
  prototype.show = function(){
    return this.thrown;
  };
  prototype.isStatement = YES;
  prototype.isCallable = function(){
    var __ref;
    return ((__ref = this.recovery) != null ? __ref.isCallable() : void 8) && this.attempt.isCallable();
  };
  prototype.getJump = function(it){
    var __ref;
    return this.attempt.getJump(it) || ((__ref = this.recovery) != null ? __ref.getJump(it) : void 8);
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
  var prototype = __extend((__import(Switch, superclass).displayName = 'Switch', Switch), superclass).prototype, constructor = Switch;
  function Switch(type, topic, cases, $default){
    var last, __ref;
    this.type = type;
    this.topic = topic;
    this.cases = cases;
    this['default'] = $default;
    if (type === 'match') {
      if (topic) {
        this.target = Arr(topic);
      }
      this.topic = null;
    } else {
      if (topic) {
        if (topic.length > 1) {
          throw "can't have more than one topic in switch statement";
        }
        this.topic = this.topic[0];
      }
    }
    if (this.cases.length && (last = (__ref = this.cases)[__ref.length - 1]).tests.length === 1 && last.tests[0] instanceof Var && last.tests[0].value === '_') {
      this.cases.pop();
      this['default'] = last.body;
    }
  }
  prototype.children = ['topic', 'cases', 'default'];
  prototype.aSource = 'topic';
  prototype.aTargets = ['cases'];
  prototype.show = function(){
    return this.type;
  };
  prototype.isStatement = YES;
  prototype.isCallable = function(){
    var c, __i, __ref, __len;
    for (__i = 0, __len = (__ref = this.cases).length; __i < __len; ++__i) {
      c = __ref[__i];
      if (!c.isCallable()) {
        return false;
      }
    }
    return (__ref = this['default']) != null ? __ref.isCallable() : void 8;
  };
  prototype.getJump = function(ctx){
    var c, that, __i, __ref, __len;
    ctx || (ctx = {});
    ctx['break'] = true;
    for (__i = 0, __len = (__ref = this.cases).length; __i < __len; ++__i) {
      c = __ref[__i];
      if (that = c.body.getJump(ctx)) {
        return that;
      }
    }
    return (__ref = this['default']) != null ? __ref.getJump(ctx) : void 8;
  };
  prototype.makeReturn = function(it){
    var c, __i, __ref, __len;
    for (__i = 0, __len = (__ref = this.cases).length; __i < __len; ++__i) {
      c = __ref[__i];
      c.makeReturn(it);
    }
    if ((__ref = this['default']) != null) {
      __ref.makeReturn(it);
    }
    return this;
  };
  prototype.compileNode = function(o){
    var tab, targetNode, target, t, topic, code, stop, i, c, that, __ref, __len;
    tab = this.tab;
    if (this.target) {
      __ref = Chain(this.target).cacheReference(o), targetNode = __ref[0], target = __ref[1];
    }
    topic = this.type === 'match'
      ? (t = target
        ? [targetNode]
        : [], Block(t.concat([Literal('false')])).compile(o, LEVEL_PAREN))
      : !!this.topic && this.anaphorize().compile(o, LEVEL_PAREN);
    code = "switch (" + topic + ") {\n";
    stop = this['default'] || this.cases.length - 1;
    o['break'] = true;
    for (i = 0, __len = (__ref = this.cases).length; i < __len; ++i) {
      c = __ref[i];
      code += c.compileCase(o, tab, i === stop, this.type === 'match' || !topic, this.type, target);
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
  var prototype = __extend((__import(Case, superclass).displayName = 'Case', Case), superclass).prototype, constructor = Case;
  function Case(tests, body){
    this.tests = tests;
    this.body = body;
  }
  prototype.children = ['tests', 'body'];
  prototype.isCallable = function(){
    return this.body.isCallable();
  };
  prototype.makeReturn = function(it){
    var __ref;
    if (((__ref = (__ref = this.body.lines)[__ref.length - 1]) != null ? __ref.value : void 8) !== 'fallthrough') {
      this.body.makeReturn(it);
    }
    return this;
  };
  prototype.compileCase = function(o, tab, nobr, bool, type, target){
    var test, t, tests, i, tar, binary, that, code, lines, last, ft, __res, __i, __ref, __len, __j, __ref1, __len1;
    __res = [];
    for (__i = 0, __len = (__ref = this.tests).length; __i < __len; ++__i) {
      test = __ref[__i];
      test = test.expandSlice(o).unwrap();
      if (test instanceof Arr && type !== 'match') {
        for (__j = 0, __len1 = (__ref1 = test.items).length; __j < __len1; ++__j) {
          t = __ref1[__j];
          __res.push(t);
        }
      } else {
        __res.push(test);
      }
    }
    tests = __res;
    tests.length || tests.push(Literal('void'));
    if (type === 'match') {
      for (i = 0, __len = tests.length; i < __len; ++i) {
        test = tests[i];
        tar = Chain(target).add(Index(Literal(i), '.', true));
        tests[i] = Chain(test).autoCompare(target ? tar : null);
      }
    }
    if (bool) {
      binary = type === 'match' ? '&&' : '||';
      t = tests[0];
      i = 0;
      while (that = tests[++i]) {
        t = Binary(binary, t, that);
      }
      tests = [(this.t = t, this.aSource = 't', this.aTargets = ['body'], this).anaphorize().invert()];
    }
    code = '';
    for (__i = 0, __len = tests.length; __i < __len; ++__i) {
      t = tests[__i];
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
  var prototype = __extend((__import(If, superclass).displayName = 'If', If), superclass).prototype, constructor = If;
  function If($if, then, un){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this['if'] = $if;
    __this.then = then;
    __this.un = un;
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.children = ['if', 'then', 'else'];
  prototype.aSource = 'if';
  prototype.aTargets = ['then'];
  prototype.show = function(){
    return this.un && '!';
  };
  prototype.terminator = '';
  prototype.delegate(['isCallable', 'isArray', 'isString', 'isRegex'], function(it){
    var __ref;
    return ((__ref = this['else']) != null ? __ref[it]() : void 8) && this.then[it]();
  });
  prototype.getJump = function(it){
    var __ref;
    return this.then.getJump(it) || ((__ref = this['else']) != null ? __ref.getJump(it) : void 8);
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
    thn = this.then, els = this['else'] || Literal('void');
    this['void'] && (thn['void'] = els['void'] = true);
    if (!this['else'] && (this.cond || this['void'])) {
      return Parens(Binary('&&', this['if'], thn)).compile(o);
    }
    code = this['if'].compile(o, LEVEL_COND);
    pad = els.isComplex() ? '\n' + (o.indent += TAB) : ' ';
    code += pad + "? " + thn.compile(o, LEVEL_LIST) + "" + pad + ": " + els.compile(o, LEVEL_LIST);
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
  var __ref, prototype = __extend((__import(Label, superclass).displayName = 'Label', Label), superclass).prototype, constructor = Label;
  function Label(label, it){
    var fun;
    this.label = label || '_';
    this.it = it;
    if (fun = (it instanceof Fun || it instanceof Class) && it || it.calling && it.it.head) {
      fun.name || (fun.name = this.label, fun.labeled = true);
      return it;
    }
  }
  __ref = Parens.prototype, prototype.children = __ref.children, prototype.isCallable = __ref.isCallable, prototype.isArray = __ref.isArray;
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
    if (__in(label, labels)) {
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
  var prototype = __extend((__import(JS, superclass).displayName = 'JS', JS), superclass).prototype, constructor = JS;
  function JS(code, literal, comment){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this.code = code;
    __this.literal = literal;
    __this.comment = comment;
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.show = function(){
    if (this.comment) {
      return this.code;
    } else {
      return "`" + this.code + "`";
    }
  };
  prototype.terminator = '';
  prototype.isAssignable = prototype.isCallable = function(){
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
  var prototype = __extend((__import(Util, superclass).displayName = 'Util', Util), superclass).prototype, constructor = Util;
  function Util(verb){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this.verb = verb;
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.show = Jump.prototype.show;
  prototype.isCallable = YES;
  prototype.compile = function(){
    return util(this.verb);
  };
  Util.Extends = function(){
    return Call.make(Util('extend'), [arguments[0], arguments[1]]);
  };
  return Util;
}(Node));
exports.Vars = Vars = (function(superclass){
  var prototype = __extend((__import(Vars, superclass).displayName = 'Vars', Vars), superclass).prototype, constructor = Vars;
  function Vars(vars){
    var __this = this instanceof __ctor ? this : new __ctor;
    __this.vars = vars;
    return __this;
  } function __ctor(){} __ctor.prototype = prototype;
  prototype.children = ['vars'];
  prototype.makeReturn = THIS;
  prototype.compile = function(o, level){
    var v, value, __i, __ref, __len;
    for (__i = 0, __len = (__ref = this.vars).length; __i < __len; ++__i) {
      v = __ref[__i], value = v.value;
      if (!(v instanceof Var)) {
        v.carp('invalid variable declaration');
      }
      if (o.scope.check(value)) {
        v.carp("redeclaration of \"" + value + "\"");
      }
      o.scope.declare(value, v);
    }
    return Literal('void').compile(o, level);
  };
  return Vars;
}(Node));
exports.L = function(yylineno, node){
  return node.line = yylineno + 1, node;
};
exports.Decl = {
  'export': function(lines){
    var i, out, node, that, __ref;
    i = -1;
    out = Util('out');
    while (node = lines[++i]) {
      if (that = node instanceof Fun && node.name) {
        lines.splice(i++, 0, Assign(Chain(out, [Index(Key(that))]), Var(that)));
        continue;
      }
      lines[i] = (that = node.varName() || node instanceof Assign && node.left.varName() || node instanceof Class && ((__ref = node.title) != null ? __ref.varName() : void 8))
        ? Assign(Chain(out, [Index(Key(that))]), node)
        : Import(out, node);
    }
    return Block(lines);
  },
  'import': function(lines, all){
    var i, line, __len;
    for (i = 0, __len = lines.length; i < __len; ++i) {
      line = lines[i];
      lines[i] = Import(Literal('this'), line, all);
    }
    return Block(lines);
  },
  importAll: function(it){
    return this['import'](it, true);
  },
  'const': function(lines){
    var node, __i, __len;
    for (__i = 0, __len = lines.length; __i < __len; ++__i) {
      node = lines[__i];
      node.op === '=' || node.carp('invalid constant variable declaration');
      node['const'] = true;
    }
    return Block(lines);
  },
  'var': Vars
};
function Scope(parent, shared){
  this.parent = parent;
  this.shared = shared;
  this.variables = {};
}
__ref = Scope.prototype;
__ref.READ_ONLY = {
  'const': 'constant',
  'function': 'function',
  undefined: 'undeclared'
};
__ref.add = function(name, type, node){
  var t, that;
  if (node && (t = this.variables[name + "."])) {
    if (that = this.READ_ONLY[t] || this.READ_ONLY[type]) {
      node.carp("redeclaration of " + that + " \"" + name + "\"");
    } else if (t === type && type === 'arg') {
      node.carp("duplicate parameter \"" + name + "\"");
    } else if (t === 'upvar') {
      node.carp("accidental shadow of \"" + name + "\"");
    }
    if (t == 'arg' || t == 'function') {
      return name;
    }
  }
  this.variables[name + "."] = type;
  return name;
};
__ref.get = function(name){
  return this.variables[name + "."];
};
__ref.declare = function(name, node, constant){
  var that, scope;
  if (that = this.shared) {
    if (this.check(name)) {
      return;
    }
    scope = that;
  } else {
    scope = this;
  }
  return scope.add(name, constant ? 'const' : 'var', node);
};
__ref.assign = function(name, value){
  return this.add(name, {
    value: value
  });
};
__ref.temporary = function(name){
  var i, temp, __ref;
  name || (name = 'ref');
  i = 0;
  do {
    temp = '__' + (name.length > 1
      ? name + (i++ || '')
      : (i++ + parseInt(name, 36)).toString(36));
  } while ((__ref = this.variables[temp + "."]) != 'reuse' && __ref != void 8);
  return this.add(temp, 'var');
};
__ref.free = function(name){
  return this.add(name, 'reuse');
};
__ref.check = function(name, above){
  var type, __ref;
  if ((type = this.variables[name + "."]) || !above) {
    return type;
  }
  return (__ref = this.parent) != null ? __ref.check(name, above) : void 8;
};
__ref.checkReadOnly = function(name){
  var that, __ref, __key;
  if (that = this.READ_ONLY[this.check(name, true)]) {
    return that;
  }
  (__ref = this.variables)[__key = name + "."] || (__ref[__key] = 'upvar');
  return '';
};
__ref.emit = function(code, tab){
  var usr, tmp, asn, fun, name, type, that, val, __ref;
  usr = [];
  tmp = [];
  asn = [];
  fun = [];
  for (name in __ref = this.variables) {
    type = __ref[name];
    name = name.slice(0, -1);
    if (type == 'var' || type == 'const' || type == 'reuse') {
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
UTILS = {
  clone: 'function(it){\n  function fun(){} fun.prototype = it;\n  return new fun;\n}',
  extend: 'function(sub, sup){\n  function fun(){} fun.prototype = (sub.superclass = sup).prototype;\n  (sub.prototype = new fun).constructor = sub;\n  if (typeof sup.extended == \'function\') sup.extended(sub);\n  return sub;\n}',
  bind: 'function(obj, key, target){\n  return function(){ return (target || obj)[key].apply(obj, arguments) };\n}',
  'import': 'function(obj, src){\n  var own = {}.hasOwnProperty;\n  for (var key in src) if (own.call(src, key)) obj[key] = src[key];\n  return obj;\n}',
  importAll: 'function(obj, src){\n  for (var key in src) obj[key] = src[key];\n  return obj;\n}',
  repeatString: 'function(str, n){\n  for (var r = \'\'; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;\n  return r;\n}',
  repeatArray: 'function(arr, n){\n  for (var r = []; n > 0; (n >>= 1) && (arr = arr.concat(arr)))\n    if (n & 1) r.push.apply(r, arr);\n  return r;\n}',
  'in': 'function(x, arr){\n  var i = 0, l = arr.length >>> 0;\n  while (i < l) if (x === arr[i++]) return true;\n  return false;\n}',
  out: 'typeof exports != \'undefined\' && exports || this',
  curry: 'function(f, args){\n  return f.length > 1 ? function(){\n    var params = args ? args.concat() : [];\n    return params.push.apply(params, arguments) < f.length && arguments.length ?\n      __curry.call(this, f, params) : f.apply(this, params);\n  } : f;\n}',
  compose: 'function(fs){\n  return function(){\n    var i, args = arguments;\n    for (i = fs.length; i > 0; --i) { args = [fs[i-1].apply(this, args)]; }\n    return args[0];\n  };\n}',
  flip: 'function(f){\n  return __curry(function (x, y) { return f(y, x); });\n}',
  partialize: 'function(f, args, where){\n  return function(){\n    var params = __slice.call(arguments), i,\n        len = params.length, wlen = where.length,\n        ta = args ? args.concat() : [], tw = where ? where.concat() : [];\n    for(i = 0; i < len; ++i) { ta[tw[0]] = params[i]; tw.shift(); }\n    return len < wlen && len ? __partialize(f, ta, tw) : f.apply(this, ta);\n  };\n}',
  not: 'function(x){ return !x; }',
  deepEq: 'function(x, y, type){\n  var toString = {}.toString, hasOwnProperty = {}.hasOwnProperty,\n      has = function (obj, key) { return hasOwnProperty.call(obj, key); };\n  first = true;\n  return eq(x, y, []);\n  function eq(a, b, stack) {\n    var className, length, size, result, alength, blength, r, key, ref, sizeB;\n    if (a.__placeholder__ || b.__placeholder__) { return true; }\n    if (a === b) { return a !== 0 || 1 / a == 1 / b; }\n    if (a == null || b == null) { return a === b; }\n    className = toString.call(a);\n    if (toString.call(b) != className) { return false; }\n    switch (className) {\n      case \'[object String]\': return a == String(b);\n      case \'[object Number]\':\n        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);\n      case \'[object Date]\':\n      case \'[object Boolean]\':\n        return +a == +b;\n      case \'[object RegExp]\':\n        return a.source == b.source &&\n               a.global == b.global &&\n               a.multiline == b.multiline &&\n               a.ignoreCase == b.ignoreCase;\n    }\n    if (typeof a != \'object\' || typeof b != \'object\') { return false; }\n    length = stack.length;\n    while (length--) { if (stack[length] == a) { return true; } }\n    stack.push(a);\n    size = 0;\n    result = true;\n    if (className == \'[object Array]\') {\n      alength = a.length;\n      blength = b.length;\n      if (first) { \n        switch (type) {\n        case \'===\': result = alength === blength; break;\n        case \'<==\': result = alength <= blength; break;\n        case \'<<=\': result = alength < blength; break;\n        }\n        size = alength;\n        first = false;\n      } else {\n        result = alength === blength;\n        size = alength;\n      }\n      if (result) {\n        while (size--) {\n          if (!(result = size in a == size in b && eq(a[size], b[size], stack))){ break; }\n        }\n      }\n    } else {\n      if (\'constructor\' in a != \'constructor\' in b || a.constructor != b.constructor) {\n        return false;\n      }\n      for (key in a) {\n        if (has(a, key)) {\n          size++;\n          if (!(result = has(b, key) && eq(a[key], b[key], stack))) { break; }\n        }\n      }\n      if (result) {\n        sizeB = 0;\n        for (key in b) {\n          if (has(b, key)) { ++sizeB; }\n        }\n        if (first) {\n          if (type === \'<<=\') {\n            result = size < sizeB;\n          } else if (type === \'<==\') {\n            result = size <= sizeB\n          } else {\n            result = size === sizeB;\n          }\n        } else {\n          first = false;\n          result = size === sizeB;\n        }\n      }\n    }\n    stack.pop();\n    return result;\n  }\n}',
  split: "''.split",
  replace: "''.replace",
  toString: '{}.toString',
  join: '[].join',
  slice: '[].slice',
  splice: '[].splice'
};
LEVEL_TOP = 0;
LEVEL_PAREN = 1;
LEVEL_LIST = 2;
LEVEL_COND = 3;
LEVEL_OP = 4;
LEVEL_CALL = 5;
(function(){
  this['&&'] = this['||'] = this['xor'] = 0.2;
  this['.&.'] = this['.^.'] = this['.|.'] = 0.3;
  this['=='] = this['!='] = this['~='] = this['!~='] = this['==='] = this['!=='] = 0.4;
  this['<'] = this['>'] = this['<='] = this['>='] = this.of = this['instanceof'] = this['+++'] = 0.5;
  this['<<='] = this['>>='] = this['<=='] = this['>=='] = 0.5;
  this['.<<.'] = this['.>>.'] = this['.>>>.'] = 0.6;
  this['+'] = this['-'] = 0.7;
  this['*'] = this['/'] = this['%'] = 0.8;
}.call(PREC = {
  unary: 0.9
}));
TAB = '  ';
ID = /^(?!\d)[\w$\xAA-\uFFDC]+$/;
SIMPLENUM = /^\d+$/;
function util(it){
  return Scope.root.assign('__' + it, UTILS[it]);
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
function __in(x, arr){
  var i = 0, l = arr.length >>> 0;
  while (i < l) if (x === arr[i++]) return true;
  return false;
}
function __repeatString(str, n){
  for (var r = ''; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;
  return r;
}
function __importAll(obj, src){
  for (var key in src) obj[key] = src[key];
  return obj;
}