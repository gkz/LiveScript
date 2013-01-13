var Node, Negatable, Block, Atom, Literal, Var, Key, Index, Slice, Chain, Call, List, Obj, Prop, Arr, Unary, Binary, Assign, Import, In, Existence, Fun, Class, Super, Parens, Splat, Jump, Throw, Return, While, For, Try, Switch, Case, If, Label, Cascade, JS, Require, Util, Vars, DECLS, ref$, UTILS, LEVEL_TOP, LEVEL_PAREN, LEVEL_LIST, LEVEL_COND, LEVEL_OP, LEVEL_CALL, PREC, TAB, ID, SIMPLENUM, slice$ = [].slice, toString$ = {}.toString;
(Node = function(){
  throw Error('unimplemented');
}).prototype = {
  compile: function(options, level){
    var o, node, code, that, i$, len$, tmp;
    o = import$({}, options);
    if (level != null) {
      o.level = level;
    }
    node = this.unfoldSoak(o) || this;
    if (o.level && node.isStatement()) {
      return node.compileClosure(o);
    }
    code = (node.tab = o.indent, node).compileNode(o);
    if (that = node.temps) {
      for (i$ = 0, len$ = that.length; i$ < len$; ++i$) {
        tmp = that[i$];
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
        hasArgs = it.value = 'args$';
      }
    });
    if (hasThis) {
      call.args.push(Literal('this'));
      call.method = '.call';
    }
    if (hasArgs) {
      call.args.push(Literal('arguments'));
      fun.params.push(Var('args$'));
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
    var ref$, sub, ref;
    if (!this.isComplex()) {
      return [ref$ = level != null ? this.compile(o, level) : this, ref$];
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
    var ref$, asn, tmp;
    if (this instanceof Var && o.scope.check(this.value) || this instanceof Unary && ((ref$ = this.op) == '+' || ref$ == '-') && (-1 / 0 < (ref$ = +this.it.value) && ref$ < 1 / 0) || this instanceof Literal && !this.isComplex()) {
      return [ref$ = this.compile(o), ref$];
    }
    asn = Assign(Var(tmp = o.scope.temporary(name)), this);
    ret || (asn['void'] = true);
    return [tmp, asn.compile(o, ret ? LEVEL_CALL : LEVEL_PAREN)];
  },
  eachChild: function(fn){
    var i$, ref$, len$, name, child, j$, len1$, i, node, that;
    for (i$ = 0, len$ = (ref$ = this.children).length; i$ < len$; ++i$) {
      name = ref$[i$];
      if (child = this[name]) {
        if ('length' in child) {
          for (j$ = 0, len1$ = child.length; j$ < len1$; ++j$) {
            i = j$;
            node = child[j$];
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
    var this$ = this;
    return this.eachChild(function(node, name, index){
      var ref$;
      return (ref$ = fn(node, this$, name, index)) != null
        ? ref$
        : node.traverseChildren(fn, xscope);
    });
  },
  anaphorize: function(){
    var base, name, ref$;
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
    return ref$ = this[this.aSource], ref$.cond = true, ref$;
  },
  carp: function(msg, type){
    type == null && (type = SyntaxError);
    throw type(msg + " on line " + (this.line || this.traverseChildren(function(it){
      return it.line;
    })));
  },
  delegate: function(names, fn){
    var i$, len$, name;
    for (i$ = 0, len$ = names.length; i$ < len$; ++i$) {
      name = names[i$];
      (fn$.call(this, name));
    }
    function fn$(name){
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
      return this.invert();
    } else {
      return this;
    }
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
    return import$({
      type: this.constructor.displayName
    }, this);
  }
};
exports.parse = function(json){
  return exports.fromJSON(JSON.parse(json));
};
exports.fromJSON = (function(){
  function fromJSON(it){
    var that, node, key, val, i$, len$, v, results$ = [];
    if (!(it && typeof it === 'object')) {
      return it;
    }
    if (that = it.type) {
      node = clone$(exports[that].prototype);
      for (key in it) {
        val = it[key];
        node[key] = fromJSON(val);
      }
      return node;
    }
    if (it.length != null) {
      for (i$ = 0, len$ = it.length; i$ < len$; ++i$) {
        v = it[i$];
        results$.push(fromJSON(v));
      }
      return results$;
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
  var prototype = extend$((import$(Block, superclass).displayName = 'Block', Block), superclass).prototype, constructor = Block;
  function Block(body){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    body || (body = []);
    if ('length' in body) {
      this$.lines = body;
    } else {
      this$.lines = [];
      this$.add(body);
    }
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.children = ['lines'];
  prototype.toJSON = function(){
    delete this.back;
    return superclass.prototype.toJSON.call(this);
  };
  prototype.add = function(it){
    var that, ref$;
    it = it.unparen();
    switch (false) {
    case !(that = this.back):
      that.add(it);
      break;
    case !(that = it.lines):
      (ref$ = this.lines).push.apply(ref$, that);
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
    var ref$;
    (ref$ = this.lines).splice.apply(ref$, [this.neck(), 0].concat(slice$.call(arguments)));
    return this;
  };
  prototype.pipe = function(target, type){
    var args;
    args = type === '|>' ? this.lines.pop() : target;
    if (toString$.call(args).slice(8, -1) !== 'Array') {
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
    var pos, i$, ref$, len$, x;
    pos = 0;
    for (i$ = 0, len$ = (ref$ = this.lines).length; i$ < len$; ++i$) {
      x = ref$[i$];
      if (!(x.comment || x instanceof Literal)) {
        break;
      }
      ++pos;
    }
    return pos;
  };
  prototype.isComplex = function(){
    var ref$;
    return this.lines.length > 1 || ((ref$ = this.lines[0]) != null ? ref$.isComplex() : void 8);
  };
  prototype.delegate(['isCallable', 'isArray', 'isString', 'isRegex'], function(it){
    var ref$, ref1$;
    return (ref$ = (ref1$ = this.lines)[ref1$.length - 1]) != null ? ref$[it]() : void 8;
  });
  prototype.getJump = function(it){
    var i$, ref$, len$, node, that;
    for (i$ = 0, len$ = (ref$ = this.lines).length; i$ < len$; ++i$) {
      node = ref$[i$];
      if (that = node.getJump(it)) {
        return that;
      }
    }
  };
  prototype.makeReturn = function(it){
    var that, ref$, key$, ref1$;
    this.chomp();
    if (that = (ref1$ = ref$ = this.lines)[key$ = ref1$.length - 1] != null ? ref$[key$] = ref$[key$].makeReturn(it) : void 8) {
      if (that instanceof Return && !that.it) {
        --this.lines.length;
      }
    }
    return this;
  };
  prototype.compile = function(o, level){
    var tab, codes, res$, i$, ref$, len$, node, code;
    level == null && (level = o.level);
    if (level) {
      return this.compileExpressions(o, level);
    }
    o.block = this;
    tab = o.indent;
    res$ = [];
    for (i$ = 0, len$ = (ref$ = this.lines).length; i$ < len$; ++i$) {
      node = ref$[i$];
      node = node.unfoldSoak(o) || node;
      if (!(code = (node.front = true, node).compile(o, level))) {
        continue;
      }
      node.isStatement() || (code += node.terminator);
      res$.push(tab + code);
    }
    codes = res$;
    return codes.join('\n');
  };
  prototype.compileRoot = function(options){
    var o, saveTo, bare, ref$, prefix, code;
    o = (import$({
      level: LEVEL_TOP,
      scope: this.scope = Scope.root = new Scope
    }, options));
    if (saveTo = o.saveScope, delete o.saveScope, saveTo) {
      o.scope = saveTo.savedScope || (saveTo.savedScope = o.scope);
    }
    delete o.filename;
    o.indent = (bare = o.bare, delete o.bare, bare) ? '' : TAB;
    if (/^\s*(?:[/#]|javascript:)/.test((ref$ = this.lines[0]) != null ? ref$.code : void 8)) {
      prefix = this.lines.shift().code + '\n';
    }
    if ((ref$ = o.eval, delete o.eval, ref$) && this.chomp().lines.length) {
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
    var lines, i, that, code, last, i$, len$, node;
    lines = this.chomp().lines;
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
    for (i$ = 0, len$ = lines.length; i$ < len$; ++i$) {
      node = lines[i$];
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
  var prototype = extend$((import$(Atom, superclass).displayName = 'Atom', Atom), superclass).prototype, constructor = Atom;
  prototype.show = function(){
    return this.value;
  };
  prototype.isComplex = NO;
  function Atom(){
    Atom.superclass.apply(this, arguments);
  }
  return Atom;
}(Node));
exports.Literal = Literal = (function(superclass){
  var prototype = extend$((import$(Literal, superclass).displayName = 'Literal', Literal), superclass).prototype, constructor = Literal;
  function Literal(value){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.value = value;
    if (value.js) {
      return JS(value + "", true);
    }
    if (value === 'super') {
      return new Super;
    }
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.isEmpty = function(){
    var ref$;
    return (ref$ = this.value) == 'void' || ref$ == 'null';
  };
  prototype.isCallable = function(){
    var ref$;
    return (ref$ = this.value) == 'this' || ref$ == 'eval' || ref$ == '..';
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
    var val, ref$;
    level == null && (level = o.level);
    switch (val = this.value + "") {
    case 'this':
      return ((ref$ = o.scope.fun) != null ? ref$.bound : void 8) || val;
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
    case '..':
      if (!(val = o.ref)) {
        this.carp('stray reference');
      }
      this.cascadee || (val.erred = true);
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
  var prototype = extend$((import$(Var, superclass).displayName = 'Var', Var), superclass).prototype, constructor = Var;
  function Var(value){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.value = value;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.isAssignable = prototype.isCallable = YES;
  prototype.assigns = function(it){
    return it === this.value;
  };
  prototype.maybeKey = function(){
    var ref$;
    return ref$ = Key(this.value), ref$.line = this.line, ref$;
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
  var prototype = extend$((import$(Key, superclass).displayName = 'Key', Key), superclass).prototype, constructor = Key;
  function Key(name, reserved){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.reserved = reserved || name.reserved;
    this$.name = '' + name;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
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
  var prototype = extend$((import$(Index, superclass).displayName = 'Index', Index), superclass).prototype, constructor = Index;
  function Index(key, symbol, init){
    var k, this$ = this instanceof ctor$ ? this : new ctor$;
    symbol || (symbol = '.');
    if (init && key instanceof Arr) {
      switch (key.items.length) {
      case 1:
        if (!((k = key.items[0]) instanceof Splat)) {
          key = Parens(k);
        }
      }
    }
    switch (symbol) {
    case '[]':
      this$.vivify = Arr;
      break;
    case '{}':
      this$.vivify = Obj;
      break;
    default:
      if ('=' === symbol.slice(-1)) {
        this$.assign = symbol.slice(1);
      }
    }
    this$.key = key;
    this$.symbol = symbol;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.children = ['key'];
  prototype.show = function(){
    return [this.soak ? '?' : void 8] + this.symbol;
  };
  prototype.isComplex = function(){
    return this.key.isComplex();
  };
  prototype.varName = function(){
    var ref$;
    return ((ref$ = this.key) instanceof Key || ref$ instanceof Literal) && this.key.varName();
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
  var prototype = extend$((import$(Slice, superclass).displayName = 'Slice', Slice), superclass).prototype, constructor = Slice;
  function Slice(arg$){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.type = arg$.type, this$.target = arg$.target, this$.from = arg$.from, this$.to = arg$.to;
    this$.from == null && (this$.from = Literal(0));
    if (this$.to && this$.type === 'to') {
      this$.to = Binary('+', this$.to, Literal('1'));
    }
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
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
  var prototype = extend$((import$(Chain, superclass).displayName = 'Chain', Chain), superclass).prototype, constructor = Chain;
  function Chain(head, tails){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    if (!tails && head instanceof Chain) {
      return head;
    }
    this$.head = head;
    this$.tails = tails || [];
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.children = ['head', 'tails'];
  prototype.add = function(it){
    var last, ref$, index, bi, that, logics, call, f;
    if (this.tails.length) {
      last = (ref$ = this.tails)[ref$.length - 1];
      if (last instanceof Call && ((ref$ = last.partialized) != null ? ref$.length : void 8) === 1 && it.args.length === 1) {
        index = last.partialized[0].head.value;
        delete last.partialized;
        last.args[index] = it.args[0];
        return this;
      }
    }
    if (this.head instanceof Existence) {
      ref$ = Chain(this.head.it), this.head = ref$.head, this.tails = ref$.tails;
      it.soak = true;
    }
    this.tails.push(it);
    bi = this.head instanceof Parens && this.head.it instanceof Binary && !this.head.it.partial
      ? this.head.it
      : this.head instanceof Binary && !this.head.partial ? this.head : void 8;
    if (this.head instanceof Super) {
      if (!this.head.called && it instanceof Call && !it.method) {
        it.method = '.call';
        it.args.unshift(Literal('this'));
        this.head.called = true;
      } else if (!this.tails[1] && ((ref$ = it.key) != null ? ref$.name : void 8) === 'prototype') {
        this.head.sproto = true;
      }
    } else if (that = it.vivify, delete it.vivify, that) {
      this.head = Assign(Chain(this.head, this.tails.splice(0, 9e9)), that(), '=', '||');
    } else if (it instanceof Call && this.tails.length === 1 && bi && in$(bi.op, logics = ['&&', '||', 'xor'])) {
      call = it;
      f = function(x, key){
        var y;
        y = x[key];
        if (y instanceof Binary && in$(y.op, logics)) {
          f(y, 'first');
          return f(y, 'second');
        } else {
          return x[key] = Chain(y).autoCompare(call.args);
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
      return Binary('===', test, target[0]);
    case !(test instanceof Unary && test.it instanceof Literal):
      return Binary('===', test, target[0]);
    case !(test instanceof Arr || test instanceof Obj):
      return Binary('====', test, target[0]);
    case !(test instanceof Var && test.value === '_'):
      return Literal('true');
    default:
      return this.add(Call(target)) || [];
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
    var that, ref$;
    if (that = (ref$ = this.tails)[ref$.length - 1]) {
      return !((ref$ = that.key) != null && ref$.items);
    } else {
      return this.head.isCallable();
    }
  };
  prototype.isArray = function(){
    var that, ref$;
    if (that = (ref$ = this.tails)[ref$.length - 1]) {
      return that.key instanceof Arr;
    } else {
      return this.head.isArray();
    }
  };
  prototype.isRegex = function(){
    return this.head.value === 'RegExp' && !this.tails[1] && this.tails[0] instanceof Call;
  };
  prototype.isAssignable = function(){
    var tail, ref$, i$, len$;
    if (!(tail = (ref$ = this.tails)[ref$.length - 1])) {
      return this.head.isAssignable();
    }
    if (!(tail instanceof Index) || tail.key instanceof List || tail.symbol === '.~') {
      return false;
    }
    for (i$ = 0, len$ = (ref$ = this.tails).length; i$ < len$; ++i$) {
      tail = ref$[i$];
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
    var tail, ref$;
    return (tail = (ref$ = this.tails)[ref$.length - 1]) instanceof Call && tail;
  };
  prototype.varName = function(){
    var ref$, ref1$;
    return (ref$ = (ref1$ = this.tails)[ref1$.length - 1]) != null ? ref$.varName() : void 8;
  };
  prototype.cacheReference = function(o){
    var name, ref$, base, ref, bref, nref;
    name = (ref$ = this.tails)[ref$.length - 1];
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
      bref = (ref$ = Var(ref), ref$.temp = true, ref$);
    }
    if (!name) {
      return [base, bref];
    }
    if (name.isComplex()) {
      ref = o.scope.temporary('key');
      name = Index(Assign(Var(ref), name.key));
      nref = Index((ref$ = Var(ref), ref$.temp = true, ref$));
    }
    return [base.add(name), Chain(bref || base.head, [nref || name])];
  };
  prototype.compileNode = function(o){
    var head, tails, that, i$, len$, t, hasPartial, pre, rest, broken, partial, post, context, idt, func, base, news, ref$;
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
    for (i$ = 0, len$ = tails.length; i$ < len$; ++i$) {
      t = tails[i$];
      if (t.partialized) {
        hasPartial = true;
        break;
      }
    }
    if (hasPartial) {
      util('slice');
      pre = [];
      rest = [];
      for (i$ = 0, len$ = tails.length; i$ < len$; ++i$) {
        t = tails[i$];
        broken = broken || t.partialized != null;
        if (broken) {
          rest.push(t);
        } else {
          pre.push(t);
        }
      }
      if (rest != null) {
        partial = rest[0], post = slice$.call(rest, 1);
      }
      this.tails = pre;
      context = pre.length
        ? Chain(head, slice$.call(pre, 0, -1))
        : Literal('this');
      return Chain(Chain(Var(util('partialize'))).add(Index(Key('apply'))).add(Call([context, Arr([this, Arr(partial.args), Arr(partial.partialized)])])), post).compile(o);
    }
    if (tails[0] instanceof Call && !head.isCallable()) {
      this.carp('invalid callee');
    }
    this.expandSlice(o);
    this.expandBind(o);
    this.expandSplat(o);
    this.expandStar(o);
    if (this.splattedNewArgs) {
      idt = o.indent + TAB;
      func = Chain(this.head, tails.slice(0, -1));
      return "(function(func, args, ctor) {\n" + idt + "ctor.prototype = func.prototype;\n" + idt + "var child = new ctor, result = func.apply(child, args), t;\n" + idt + "return (t = typeof result)  == \"object\" || t == \"function\" ? result || child : child;\n" + TAB + "})(" + func.compile(o) + ", " + this.splattedNewArgs + ", function(){})";
    }
    if (!this.tails.length) {
      return this.head.compile(o);
    }
    base = this.head.compile(o, LEVEL_CALL);
    news = rest = '';
    for (i$ = 0, len$ = (ref$ = this.tails).length; i$ < len$; ++i$) {
      t = ref$[i$];
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
    var that, ref$, i$, len$, i, node, ref1$, bust, test;
    if (that = this.head.unfoldSoak(o)) {
      (ref$ = that.then.tails).push.apply(ref$, this.tails);
      return that;
    }
    for (i$ = 0, len$ = (ref$ = this.tails).length; i$ < len$; ++i$) {
      i = i$;
      node = ref$[i$];
      if (ref1$ = node.soak, delete node.soak, ref1$) {
        bust = Chain(this.head, this.tails.splice(0, i));
        if (node.assign && !bust.isAssignable()) {
          node.carp('invalid accessign');
        }
        test = node instanceof Call
          ? (ref1$ = bust.cacheReference(o), test = ref1$[0], this.head = ref1$[1], JS("typeof " + test.compile(o, LEVEL_OP) + " === 'function'"))
          : (i && node.assign
            ? (ref1$ = bust.cacheReference(o), test = ref1$[0], bust = ref1$[1], this.head = bust.head, (ref1$ = this.tails).unshift.apply(ref1$, bust.tails))
            : (ref1$ = bust.unwrap().cache(o, true), test = ref1$[0], this.head = ref1$[1]), Existence(test));
        return ref1$ = If(test, this), ref1$.soak = true, ref1$.cond = this.cond, ref1$['void'] = this['void'], ref1$;
      }
    }
  };
  prototype.unfoldAssign = function(o){
    var that, ref$, i$, len$, i, index, op, left, lefts, rites, j$, len1$, node, ref1$;
    if (that = this.head.unfoldAssign(o)) {
      (ref$ = that.right.tails).push.apply(ref$, this.tails);
      return that;
    }
    for (i$ = 0, len$ = (ref$ = this.tails).length; i$ < len$; ++i$) {
      i = i$;
      index = ref$[i$];
      if (op = index.assign) {
        index.assign = '';
        left = Chain(this.head, this.tails.splice(0, i)).expandSlice(o).unwrap();
        if (left instanceof Arr) {
          lefts = left.items;
          rites = (this.head = Arr()).items;
          for (j$ = 0, len1$ = lefts.length; j$ < len1$; ++j$) {
            i = j$;
            node = lefts[j$];
            ref1$ = Chain(node).cacheReference(o), rites[i] = ref1$[0], lefts[i] = ref1$[1];
          }
        } else {
          ref1$ = Chain(left).cacheReference(o), left = ref1$[0], this.head = ref1$[1];
        }
        if (op === '=') {
          op = ':=';
        }
        return ref1$ = Assign(left, this, op), ref1$.access = true, ref1$;
      }
    }
  };
  prototype.expandSplat = function(o){
    var tails, i, call, args, ctx, ref$;
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
        this.splattedNewArgs = args;
      } else {
        if (!ctx && tails[i - 1] instanceof Index) {
          ref$ = Chain(this.head, tails.splice(0, i - 1)).cache(o, true), this.head = ref$[0], ctx = ref$[1];
          i = 0;
        }
        call.method = '.apply';
        call.args = [ctx || Literal('null'), JS(args)];
      }
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
    var tails, i, that, stars, ref$, sub, ref, temps, value, i$, len$, star;
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
      ref$ = Chain(this.head, tails.splice(0, i)).unwrap().cache(o), sub = ref$[0], ref = ref$[1], temps = ref$[2];
      value = Chain(ref, [Index(Key('length'))]).compile(o);
      for (i$ = 0, len$ = stars.length; i$ < len$; ++i$) {
        star = stars[i$];
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
    var tails, i, tail, ref$, x;
    tails = this.tails;
    i = -1;
    while (tail = tails[++i]) {
      if ((ref$ = tail.key) != null && ref$.items) {
        if (tails[i + 1] instanceof Call) {
          tail.carp('calling a slice');
        }
        x = tails.splice(0, i + 1);
        x = x.pop().key.toSlice(o, Chain(this.head, x).unwrap(), tail.symbol, assign);
        this.head = (x.front = this.front, x);
        i = -1;
      }
    }
    return this;
  };
  return Chain;
}(Node));
exports.Call = Call = (function(superclass){
  var prototype = extend$((import$(Call, superclass).displayName = 'Call', Call), superclass).prototype, constructor = Call;
  function Call(args){
    var splat, i$, len$, i, a, ref$, this$ = this instanceof ctor$ ? this : new ctor$;
    args || (args = []);
    if (args.length === 1 && (splat = args[0]) instanceof Splat) {
      if (splat.filler) {
        this$.method = '.call';
        args[0] = Literal('this');
        args[1] = Splat(Literal('arguments'));
      } else if (splat.it instanceof Arr) {
        args = splat.it.items;
      }
    } else {
      for (i$ = 0, len$ = args.length; i$ < len$; ++i$) {
        i = i$;
        a = args[i$];
        if (a.value === '_') {
          args[i] = Chain(Literal('void'));
          args[i].placeholder = true;
          ((ref$ = this$.partialized) != null
            ? ref$
            : this$.partialized = []).push(Chain(Literal(i)));
        }
      }
    }
    this$.args = args;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.children = ['args'];
  prototype.show = function(){
    return [this['new']] + [this.method] + [this.soak ? '?' : void 8];
  };
  prototype.compile = function(o){
    var code, i$, ref$, len$, i, a;
    code = (this.method || '') + '(' + (this.pipe ? "\n" + o.indent : '');
    for (i$ = 0, len$ = (ref$ = this.args).length; i$ < len$; ++i$) {
      i = i$;
      a = ref$[i$];
      code += (i ? ', ' : '') + a.compile(o, LEVEL_LIST);
    }
    return code + ')';
  };
  Call.make = function(callee, args, opts){
    var call;
    call = Call(args);
    if (opts) {
      import$(call, opts);
    }
    return Chain(callee).add(call);
  };
  Call.block = function(fun, args, method){
    var ref$, ref1$;
    return ref$ = Parens(Chain(fun, [(ref1$ = Call(args), ref1$.method = method, ref1$)]), true), ref$.calling = true, ref$;
  };
  Call.back = function(params, node, bound, curried){
    var fun, ref$, args, index, i$, len$, a;
    fun = Fun(params, void 8, bound, curried);
    if (fun.hushed = node.op === '!') {
      node = node.it;
    }
    if (node instanceof Label) {
      fun.name = node.label;
      fun.labeled = true;
      node = node.it;
    }
    if (!fun.hushed && (fun.hushed = node.op === '!')) {
      node = node.it;
    }
    if ((ref$ = node.getCall()) != null) {
      ref$.partialized = null;
    }
    args = (node.getCall() || (node = Chain(node).add(Call())).getCall()).args;
    index = 0;
    for (i$ = 0, len$ = args.length; i$ < len$; ++i$) {
      a = args[i$];
      if (a.placeholder) {
        break;
      }
      ++index;
    }
    return node.back = (args[index] = fun).body, node;
  };
  Call['let'] = function(args, body){
    var params, res$, i$, len$, i, a, that, gotThis;
    res$ = [];
    for (i$ = 0, len$ = args.length; i$ < len$; ++i$) {
      i = i$;
      a = args[i$];
      if (that = a.op === '=' && !a.logic && a.right) {
        args[i] = that;
        if (i === 0 && (gotThis = a.left.value === 'this')) {
          continue;
        }
        res$.push(a.left);
      } else {
        res$.push(Var(a.varName() || a.carp('invalid "let" argument')));
      }
    }
    params = res$;
    gotThis || args.unshift(Literal('this'));
    return this.block(Fun(params, body), args, '.call');
  };
  Call.where = function(args, body){
    var lines, res$, i$, len$, a, params, i;
    res$ = [];
    for (i$ = 0, len$ = args.length; i$ < len$; ++i$) {
      a = args[i$];
      if (a.op === '=' && !a.logic) {
        res$.push(a);
      }
    }
    lines = res$;
    res$ = [];
    for (i$ = 0, len$ = args.length; i$ < len$; ++i$) {
      i = i$;
      a = args[i$];
      if (a.op === '=' && !a.logic) {
        args[i] = Literal('void');
        res$.push(a.left);
      } else {
        res$.push(Var(a.varName() || a.carp('invalid "let" argument')));
      }
    }
    params = res$;
    args.unshift(Literal('this'));
    return this.block(Fun(params, Block(lines.concat(body.lines))), args, '.call');
  };
  return Call;
}(Node));
List = (function(superclass){
  var prototype = extend$((import$(List, superclass).displayName = 'List', List), superclass).prototype, constructor = List;
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
    var i$, ref$, len$, node;
    for (i$ = 0, len$ = (ref$ = this.items).length; i$ < len$; ++i$) {
      node = ref$[i$];
      if (node.assigns(it)) {
        return true;
      }
    }
  };
  List.compile = function(o, items, deepEq){
    var indent, level, code, i, that, target;
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
    List.superclass.apply(this, arguments);
  }
  return List;
}(Node));
exports.Obj = Obj = (function(superclass){
  var prototype = extend$((import$(Obj, superclass).displayName = 'Obj', Obj), superclass).prototype, constructor = Obj;
  function Obj(items){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.items = items || [];
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.asObj = THIS;
  prototype.toSlice = function(o, base, symbol, assign){
    var items, ref$, ref, temps, i$, len$, i, node, name, chain, logic, key, val;
    items = this.items;
    if (items.length > 1) {
      ref$ = base.cache(o), base = ref$[0], ref = ref$[1], temps = ref$[2];
    } else {
      ref = base;
    }
    for (i$ = 0, len$ = items.length; i$ < len$; ++i$) {
      i = i$;
      node = items[i$];
      if (node.comment) {
        continue;
      }
      if (node instanceof Prop || node instanceof Splat) {
        node[name = (ref$ = node.children)[ref$.length - 1]] = chain = Chain(base, [Index(node[name].maybeKey())]);
      } else {
        if (logic = node.getDefault()) {
          node = node.first;
        }
        if (node instanceof Parens) {
          ref$ = node.cache(o, true), key = ref$[0], node = ref$[1];
          if (assign) {
            ref$ = [node, key], key = ref$[0], node = ref$[1];
          }
          key = Parens(key);
        } else {
          key = node;
        }
        val = chain = Chain(base, [Index(node.maybeKey(), symbol)]);
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
    var items, code, idt, dic, i$, len$, i, node, logic, rest, ref$, multi, key, val;
    items = this.items;
    if (!items.length) {
      return this.front ? '({})' : '{}';
    }
    code = '';
    idt = '\n' + (o.indent += TAB);
    dic = {};
    for (i$ = 0, len$ = items.length; i$ < len$; ++i$) {
      i = i$;
      node = items[i$];
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
        } else if ((ref$ = node.val) instanceof Obj || ref$ instanceof Arr) {
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
  var prototype = extend$((import$(Prop, superclass).displayName = 'Prop', Prop), superclass).prototype, constructor = Prop;
  function Prop(key, val){
    var that, i$, len$, fun, this$ = this instanceof ctor$ ? this : new ctor$;
    this$.key = key;
    this$.val = val;
    if (key.value === '...') {
      return Splat(this$.val);
    }
    if (that = val.getAccessors()) {
      this$.val = that;
      for (i$ = 0, len$ = that.length; i$ < len$; ++i$) {
        fun = that[i$];
        fun.x = (fun.hushed = fun.params.length) ? 's' : 'g';
      }
      this$['accessor'] = 'accessor';
    }
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.children = ['key', 'val'];
  prototype.show = function(){
    return this.accessor;
  };
  prototype.assigns = function(it){
    var ref$;
    return typeof (ref$ = this.val).assigns === 'function' ? ref$.assigns(it) : void 8;
  };
  prototype.compileAccessor = function(o, key){
    var funs, fun;
    funs = this.val;
    if (funs[1] && funs[0].params.length + funs[1].params.length !== 1) {
      funs[0].carp('invalid accessor parameter');
    }
    return (function(){
      var i$, ref$, len$, results$ = [];
      for (i$ = 0, len$ = (ref$ = funs).length; i$ < len$; ++i$) {
        fun = ref$[i$];
        fun.accessor = true;
        results$.push(fun.x + "et " + key + fun.compile(o, LEVEL_LIST).slice(8));
      }
      return results$;
    }()).join(',\n' + o.indent);
  };
  prototype.compileDescriptor = function(o){
    var obj, i$, ref$, len$, fun;
    obj = Obj();
    for (i$ = 0, len$ = (ref$ = this.val).length; i$ < len$; ++i$) {
      fun = ref$[i$];
      obj.items.push(Prop(Key(fun.x + 'et'), fun));
    }
    obj.items.push(Prop(Key('configurable'), Literal(true)));
    obj.items.push(Prop(Key('enumerable'), Literal(true)));
    return obj.compile(o);
  };
  return Prop;
}(Node));
exports.Arr = Arr = (function(superclass){
  var prototype = extend$((import$(Arr, superclass).displayName = 'Arr', Arr), superclass).prototype, constructor = Arr;
  function Arr(items){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.items = items || [];
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.isArray = YES;
  prototype.asObj = function(){
    var i, item;
    return Obj((function(){
      var i$, ref$, len$, results$ = [];
      for (i$ = 0, len$ = (ref$ = this.items).length; i$ < len$; ++i$) {
        i = i$;
        item = ref$[i$];
        results$.push(Prop(Literal(i), item));
      }
      return results$;
    }.call(this)));
  };
  prototype.toSlice = function(o, base, symbol){
    var items, ref$, ref, i$, len$, i, item, splat, chain;
    items = this.items;
    if (items.length > 1) {
      ref$ = base.cache(o), base = ref$[0], ref = ref$[1];
    } else {
      ref = base;
    }
    for (i$ = 0, len$ = items.length; i$ < len$; ++i$) {
      i = i$;
      item = items[i$];
      if (splat = item instanceof Splat) {
        item = item.it;
      }
      if (item.isEmpty()) {
        continue;
      }
      chain = Chain(base, [Index(item, symbol)]);
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
  var prototype = extend$((import$(Unary, superclass).displayName = 'Unary', Unary), superclass).prototype, constructor = Unary;
  function Unary(op, it, flag){
    var that, i$, ref$, len$, node, this$ = this instanceof ctor$ ? this : new ctor$;
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
        if (it instanceof Fun && !it.hushed) {
          return it.hushed = true, it;
        }
        return it.invert();
      case '++':
      case '--':
        if (flag) {
          this$.post = true;
        }
        break;
      case 'new':
        if (it instanceof Existence && !it.negated) {
          it = Chain(it).add(Call());
        }
        it.newed = true;
        for (i$ = 0, len$ = (ref$ = it.tails || '').length; i$ < len$; ++i$) {
          node = ref$[i$];
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
          return it.bound = 'this$', it;
        }
      }
    }
    this$.op = op;
    this$.it = it;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.children = ['it'];
  prototype.show = function(){
    return [this.post ? '@' : void 8] + this.op;
  };
  prototype.isCallable = function(){
    var ref$;
    return ((ref$ = this.op) == 'do' || ref$ == 'new' || ref$ == 'delete') || this.it == null;
  };
  prototype.isArray = function(){
    return this.it instanceof Arr && this.it.items.length || this.it instanceof Chain && this.it.isArray();
  };
  prototype.isString = function(){
    var ref$;
    return (ref$ = this.op) == 'typeof' || ref$ == 'classof';
  };
  prototype.invert = function(){
    var ref$;
    if (this.op === '!' && ((ref$ = this.it.op) == '!' || ref$ == '<' || ref$ == '>' || ref$ == '<=' || ref$ == '>=' || ref$ == 'of' || ref$ == 'instanceof')) {
      return this.it;
    }
    return constructor('!', this, true);
  };
  prototype.unfoldSoak = function(o){
    var ref$;
    return ((ref$ = this.op) == '++' || ref$ == '--' || ref$ == 'delete') && this.it != null && If.unfoldSoak(o, this, 'it');
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
      if (o.level === LEVEL_TOP && it instanceof Fun && it.isStatement()) {
        return it.compile(o) + " " + Unary('do', Var(it.name)).compile(o);
      }
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
    case 'jsdelete':
      return "delete " + it.compile(o, LEVEL_LIST);
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
    var it, ops, them, i$, len$, i, node, sp, j$, op, lat, ref$;
    it = this.it;
    ops = [this];
    for (; it instanceof constructor; it = it.it) {
      ops.push(it);
    }
    if (!((it = it.expandSlice(o).unwrap()) instanceof Arr && (them = it.items).length)) {
      return '';
    }
    for (i$ = 0, len$ = them.length; i$ < len$; ++i$) {
      i = i$;
      node = them[i$];
      if (sp = node instanceof Splat) {
        node = node.it;
      }
      for (j$ = ops.length - 1; j$ >= 0; --j$) {
        op = ops[j$];
        node = constructor(op.op, node, op.post);
      }
      them[i] = sp ? lat = Splat(node) : node;
    }
    if (!lat && (this['void'] || !o.level)) {
      it = (ref$ = Block(them), ref$.front = this.front, ref$['void'] = true, ref$);
    }
    return it.compile(o, LEVEL_PAREN);
  };
  prototype.compilePluck = function(o){
    var ref$, get, del, code, ref;
    ref$ = Chain(this.it).cacheReference(o), get = ref$[0], del = ref$[1];
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
  var COMPARER, INVERSIONS, prototype = extend$((import$(Binary, superclass).displayName = 'Binary', Binary), superclass).prototype, constructor = Binary;
  function Binary(op, first, second, destructuring){
    var logic, that, ref$, this$ = this instanceof ctor$ ? this : new ctor$;
    if (destructuring) {
      logic = op.logic;
      if (toString$.call(destructuring).slice(8, -1) === 'String') {
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
    this$.partial = first == null || second == null;
    if (!this$.partial) {
      if ('=' === op.charAt(op.length - 1) && ((ref$ = op.charAt(op.length - 2)) != '=' && ref$ != '<' && ref$ != '>' && ref$ != '!')) {
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
      case '.':
        return Chain(first).add(Index(second));
      }
    }
    this$.op = op;
    this$.first = first;
    this$.second = second;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.children = ['first', 'second'];
  prototype.show = function(){
    return this.op;
  };
  prototype.isCallable = function(){
    var ref$;
    return this.partial || ((ref$ = this.op) == '&&' || ref$ == '||' || ref$ == '?' || ref$ == '!?' || ref$ == '<<' || ref$ == '>>') && this.first.isCallable() && this.second.isCallable();
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
    var ref$, ref1$, first;
    if (!(!(ref$ = first = test(this.first)) !== !(ref1$ = test(this.second)) && (ref$ || ref1$))) {
      return false;
    }
    return first
      ? [this.first, this.second]
      : [this.second, this.first];
  };
  prototype.compileNode = function(o){
    var top, rite, items, that, ref$, code, level;
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
    case '++':
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
        if (that = ((ref$ = this.op) == '===' || ref$ == '!==') && this.xorChildren(function(it){
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
    var code, level, ref$, sub;
    code = this.first.compile(o, level = LEVEL_OP + PREC[this.op]);
    ref$ = this.second.first.cache(o, true), sub = ref$[0], this.second.first = ref$[1];
    code += " " + this.op + " " + sub.compile(o, level) + " && " + this.second.compile(o, LEVEL_OP);
    if (o.level <= LEVEL_OP) {
      return code;
    } else {
      return "(" + code + ")";
    }
  };
  prototype.compileExistence = function(o){
    var x, ref$;
    if (this.op === '!?') {
      x = (ref$ = If(Existence(this.first), this.second), ref$.cond = this.cond, ref$['void'] = this['void'] || !o.level, ref$);
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
    var ref$, sub, ref, test, i$, len$, item;
    ref$ = this.first.cache(o), sub = ref$[0], ref = ref$[1], this.temps = ref$[2];
    test = Binary('instanceof', sub, items.shift());
    for (i$ = 0, len$ = items.length; i$ < len$; ++i$) {
      item = items[i$];
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
    var x, n, items, arr, that, refs, i$, len$, i, item, ref$, q;
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
      for (i$ = 0, len$ = items.length; i$ < len$; ++i$) {
        i = i$;
        item = items[i$];
        ref$ = item.cache(o, 1), items[i] = ref$[0], refs[refs.length] = ref$[1];
      }
      items.push((ref$ = JS(), ref$.compile = function(){
        return (repeatString$(", " + List.compile(o, refs), n - 1)).slice(2);
      }, ref$));
      return x.compile(o);
    } else if (x instanceof Literal) {
      return (q = (x = x.compile(o)).charAt()) + repeatString$(x.slice(1, -1) + "", n) + q;
    } else {
      if (n < 1) {
        return Block(x.it).add(JS("''")).compile(o);
      }
      x = (refs = x.cache(o, 1, LEVEL_OP))[0] + repeatString$(" + " + refs[1], n - 1);
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
      var ref$;
      switch (false) {
      case !(x instanceof Binary && ((ref$ = x.op) == '+++' || ref$ == '++')):
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
      var ref$;
      switch (false) {
      case !(x instanceof Binary && ((ref$ = x.op) == '<<' || ref$ == '>>')):
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
      x = Var('x$');
      y = Var('y$');
      return Fun([x, y], Block(Binary(this.op, x, y).invertCheck(this)), false, true).compile(o);
    case this.first == null:
      return "(" + Fun([vit], Block(Binary(this.op, this.first, vit).invertCheck(this))).compile(o) + ")";
    default:
      return "(" + Fun([vit], Block(Binary(this.op, vit, this.second).invertCheck(this))).compile(o) + ")";
    }
  };
  prototype.compileRegexEquals = function(o, arg$){
    var regex, target;
    regex = arg$[0], target = arg$[1];
    if (this.op === '===') {
      return Chain(regex).add(Index(Key('exec'))).add(Call([target])).compile(o);
    } else {
      return Unary('!', Chain(regex).add(Index(Key('test'))).add(Call([target]))).compile(o);
    }
  };
  prototype.compileDeepEq = function(o){
    var ref$, negate, i$, len$, x, r;
    if ((ref$ = this.op) == '>==' || ref$ == '>>=') {
      ref$ = [this.second, this.first], this.first = ref$[0], this.second = ref$[1];
      this.op = this.op === '>==' ? '<==' : '<<=';
    }
    if (this.op === '!==') {
      this.op = '===';
      negate = true;
    }
    for (i$ = 0, len$ = (ref$ = [this.first, this.second]).length; i$ < len$; ++i$) {
      x = ref$[i$];
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
    return Binary('&&', Binary('!==', Unary('!', left[0]), Unary('!', right[0])), Parens(Binary('||', left[1], right[1]))).compile(o);
  };
  return Binary;
}(Node));
exports.Assign = Assign = (function(superclass){
  var prototype = extend$((import$(Assign, superclass).displayName = 'Assign', Assign), superclass).prototype, constructor = Assign;
  function Assign(left, rite, op, logic, defParam){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.left = left;
    this$.op = op || '=';
    this$.logic = logic || this$.op.logic;
    this$.defParam = defParam;
    this$.op += '';
    this$[rite instanceof Node ? 'right' : 'unaries'] = rite;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.children = ['left', 'right'];
  prototype.show = function(){
    return [void 8].concat(this.unaries).reverse().join(' ') + [this.logic] + this.op;
  };
  prototype.assigns = function(it){
    return this.left.assigns(it);
  };
  prototype.delegate(['isCallable', 'isRegex'], function(it){
    var ref$;
    return ((ref$ = this.op) == '=' || ref$ == ':=') && this.right[it]();
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
    var that, ref$, rite, temps;
    if (this.left instanceof Existence) {
      if (that = (ref$ = this.left = this.left.it).name, delete ref$.name, that) {
        rite = this.right;
        rite = Assign(this.right = Var(that), rite);
      } else {
        ref$ = this.right.cache(o), rite = ref$[0], this.right = ref$[1], temps = ref$[2];
      }
      return ref$ = If(Existence(rite), this), ref$.temps = temps, ref$.cond = this.cond, ref$['void'] = this['void'], ref$;
    }
    return If.unfoldSoak(o, this, 'left');
  };
  prototype.unfoldAssign = function(){
    return this.access && this;
  };
  prototype.compileNode = function(o){
    var left, ref$, i$, len$, op, right, reft, sign, name, lvar, del, that, protoSplit, dotSplit, code, empty, res;
    if (this.left instanceof Slice && this.op === '=') {
      return this.compileSplice(o);
    }
    left = this.left.expandSlice(o, true).unwrap();
    if (!this.right) {
      left.isAssignable() || left.carp('invalid unary assign');
      ref$ = Chain(left).cacheReference(o), left = ref$[0], this.right = ref$[1];
      for (i$ = 0, len$ = (ref$ = this.unaries).length; i$ < len$; ++i$) {
        op = ref$[i$];
        this.right = Unary(op, this.right);
      }
    }
    if (left.isEmpty()) {
      return (ref$ = Parens(this.right), ref$.front = this.front, ref$.newed = this.newed, ref$).compile(o);
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
    if ((op == '**=' || op == '^=' || op == '%%=' || op == '++=') || op === '*=' && right.isString() || (op == '-=' || op == '/=') && right.isMatcher()) {
      ref$ = Chain(left).cacheReference(o), left = ref$[0], reft = ref$[1];
      right = Binary(op.slice(0, -1), reft, right);
      op = ':=';
    }
    if (op == '.&.=' || op == '.|.=' || op == '.^.=' || op == '.<<.=' || op == '.>>.=' || op == '.>>>.=') {
      op = op.slice(1, -2) + '=';
    }
    (right = right.unparen()).ripName(left = left.unwrap());
    sign = op.replace(':', '');
    name = (left.front = true, left).compile(o, LEVEL_LIST);
    if (lvar = left instanceof Var) {
      del = right.op === 'delete';
      if (op === '=') {
        o.scope.declare(name, left, this['const'] || !this.defParam && o['const'] && '$' !== name.slice(-1));
      } else if (that = o.scope.checkReadOnly(name)) {
        left.carp("assignment to " + that + " \"" + name + "\"", ReferenceError);
      }
    }
    if (left instanceof Chain && right instanceof Fun) {
      protoSplit = name.split('.prototype.');
      dotSplit = name.split('.');
      if (protoSplit.length > 1) {
        right.inClass = protoSplit[0];
      } else if (dotSplit.length > 1) {
        right.inClassStatic = slice$.call(dotSplit, 0, -1).join('');
      }
    }
    code = !o.level && right instanceof While && !right['else'] && (lvar || left instanceof Chain && left.isSimpleAccess())
      ? (empty = right.objComp ? '{}' : '[]', (res = o.scope.temporary('res')) + " = " + empty + ";\n" + this.tab + right.makeReturn(res).compile(o) + "\n" + this.tab + name + " " + sign + " " + o.scope.free(res))
      : (name + " " + sign + " ") + (right.assigned = true, right).compile(o, LEVEL_LIST);
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
    var ref$, lefts, morph;
    if (left instanceof Var && ((ref$ = this.logic) == '?' || ref$ == '!?') && this.op === '=') {
      o.scope.declare(left.value, left);
    }
    lefts = Chain(left).cacheReference(o);
    o.level += LEVEL_OP < o.level;
    morph = Binary(this.logic, lefts[0], (this.logic = false, this.left = lefts[1], this));
    return (morph['void'] = this['void'], morph).compileNode(o);
  };
  prototype.compileMinMax = function(o, left, right){
    var lefts, rites, test, put, ref$;
    lefts = Chain(left).cacheReference(o);
    rites = right.cache(o, true);
    test = Binary(this.op.replace('?', ''), lefts[0], rites[0]);
    put = Assign(lefts[1], rites[1], ':=');
    if (this['void'] || !o.level) {
      return Parens(Binary('||', test, put)).compile(o);
    }
    ref$ = test.first.cache(o, true), test.first = ref$[0], left = ref$[1];
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
    var ref$, fromExpNode, fromExp, rightNode, right, toExp;
    ref$ = Chain(this.left.from).cacheReference(o), fromExpNode = ref$[0], fromExp = ref$[1];
    ref$ = Chain(this.right).cacheReference(o), rightNode = ref$[0], right = ref$[1];
    toExp = Binary('-', this.left.to, fromExp);
    return Block([Chain(Var(util('splice'))).add(Index(Key('apply'), '.', true)).add(Call([this.left.target, Chain(Arr([fromExpNode, toExp])).add(Index(Key('concat'), '.', true)).add(Call([rightNode]))])), right]).compile(o, LEVEL_LIST);
  };
  prototype.rendArr = function(o, nodes, rite){
    var i$, len$, i, node, skip, len, val, ivar, start, inc, rcache, ref$, results$ = [];
    for (i$ = 0, len$ = nodes.length; i$ < len$; ++i$) {
      i = i$;
      node = nodes[i$];
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
      results$.push((ref$ = clone$(this), ref$.left = node, ref$.right = val, ref$['void'] = true, ref$).compile(o, LEVEL_PAREN));
    }
    return results$;
  };
  prototype.rendObj = function(o, nodes, rite){
    var i$, len$, node, splat, logic, ref$, key, val, rcache, results$ = [];
    for (i$ = 0, len$ = nodes.length; i$ < len$; ++i$) {
      node = nodes[i$];
      if (splat = node instanceof Splat) {
        node = node.it;
      }
      if (logic = node.getDefault()) {
        node = node.first;
      }
      if (node instanceof Parens) {
        ref$ = Chain(node.it).cacheReference(o), node = ref$[0], key = ref$[1];
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
      results$.push((ref$ = clone$(this), ref$.left = node, ref$.right = val, ref$['void'] = true, ref$).compile(o, LEVEL_PAREN));
    }
    return results$;
  };
  return Assign;
}(Node));
exports.Import = Import = (function(superclass){
  var prototype = extend$((import$(Import, superclass).displayName = 'Import', Import), superclass).prototype, constructor = Import;
  function Import(left, right, all){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.left = left;
    this$.right = right;
    this$.all = all && 'All';
    if (!all && left instanceof Obj && right.items) {
      return Obj(left.items.concat(right.asObj().items));
    }
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.children = ['left', 'right'];
  prototype.show = function(){
    return this.all;
  };
  prototype.delegate(['isCallable', 'isArray'], function(it){
    return this.left[it]();
  });
  prototype.unfoldSoak = function(o){
    var left, value, ref$, temps;
    left = this.left;
    if (left instanceof Existence && !left.negated) {
      if ((left = left.it) instanceof Var) {
        value = (this.left = left).value;
        if (!o.scope.check(value, true)) {
          left = JS("typeof " + value + " != 'undefined' && " + value);
        }
      } else {
        ref$ = left.cache(o), left = ref$[0], this.left = ref$[1], temps = ref$[2];
      }
      return ref$ = If(left, this), ref$.temps = temps, ref$.soak = true, ref$.cond = this.cond, ref$['void'] = this['void'], ref$;
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
    var top, reft, ref$, left, delim, space, code, i$, len$, i, node, com, logic, dyna, key, val;
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
      ref$ = this.left.cache(o), left = ref$[0], reft = ref$[1], this.temps = ref$[2];
    }
    ref$ = top
      ? [';', '\n' + this.tab]
      : [',', ' '], delim = ref$[0], space = ref$[1];
    delim += space;
    code = this.temps ? left.compile(o, LEVEL_PAREN) + delim : '';
    for (i$ = 0, len$ = items.length; i$ < len$; ++i$) {
      i = i$;
      node = items[i$];
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
        ref$ = node.it.cache(o, true), key = ref$[0], val = ref$[1];
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
  var prototype = extend$((import$(In, superclass).displayName = 'In', In), superclass).prototype, constructor = In;
  importAll$(prototype, arguments[1]);
  function In(item, array){
    this.item = item;
    this.array = array;
  }
  prototype.children = ['item', 'array'];
  prototype.compileNode = function(o){
    var array, items, code, ref$, sub, ref, cmp, cnj, i$, len$, i, test;
    items = (array = this.array.expandSlice(o).unwrap()).items;
    if (!(array instanceof Arr) || items.length < 2) {
      return (this.negated ? '!' : '') + "" + util('in') + "(" + this.item.compile(o, LEVEL_LIST) + ", " + array.compile(o, LEVEL_LIST) + ")";
    }
    code = '';
    ref$ = this.item.cache(o, false, LEVEL_PAREN), sub = ref$[0], ref = ref$[1];
    ref$ = this.negated
      ? [' != ', ' && ']
      : [' == ', ' || '], cmp = ref$[0], cnj = ref$[1];
    for (i$ = 0, len$ = items.length; i$ < len$; ++i$) {
      i = i$;
      test = items[i$];
      code && (code += cnj);
      if (test instanceof Splat) {
        code += (ref$ = new In(Var(ref), test.it), ref$.negated = this.negated, ref$).compile(o, LEVEL_TOP);
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
  var prototype = extend$((import$(Existence, superclass).displayName = 'Existence', Existence), superclass).prototype, constructor = Existence;
  importAll$(prototype, arguments[1]);
  function Existence(it, negated){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.it = it;
    this$.negated = negated;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.children = ['it'];
  prototype.compileNode = function(o){
    var node, ref$, code, op, eq;
    node = (ref$ = this.it.unwrap(), ref$.front = this.front, ref$);
    code = node.compile(o, LEVEL_OP + PREC['==']);
    if (node instanceof Var && !o.scope.check(code, true)) {
      ref$ = this.negated
        ? ['||', '=']
        : ['&&', '!'], op = ref$[0], eq = ref$[1];
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
  var prototype = extend$((import$(Fun, superclass).displayName = 'Fun', Fun), superclass).prototype, constructor = Fun;
  function Fun(params, body, bound, curried){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.params = params || [];
    this$.body = body || Block();
    this$.bound = bound && 'this$';
    this$.curried = curried || false;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.children = ['params', 'body'];
  prototype.show = function(){
    var that;
    return [this.name] + [(that = this.bound) ? "~" + that : void 8];
  };
  prototype.named = function(it){
    return this.name = it, this.statement = true, this;
  };
  prototype.isCallable = YES;
  prototype.isStatement = function(){
    return !!this.statement;
  };
  prototype.traverseChildren = function(arg$, xscope){
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
    var pscope, sscope, scope, that, inLoop, body, name, tab, code, ref$, curryCodeCheck, this$ = this;
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
    if (this.bound === 'this$') {
      if (this.ctor) {
        scope.assign('this$', 'this instanceof ctor$ ? this : new ctor$');
        body.lines.push(Return(Literal('this$')));
      } else if (that = (ref$ = sscope.fun) != null ? ref$.bound : void 8) {
        this.bound = that;
      } else {
        sscope.assign('this$', 'this');
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
    this.hushed || this.ctor || body.makeReturn();
    code += "(" + this.compileParams(scope) + "){";
    if (that = body.compileWithDeclarations(o)) {
      code += "\n" + that + "\n" + tab;
    }
    code += '}';
    curryCodeCheck = function(){
      if (this$.curried && this$.hasSplats) {
        this$.carp('cannot curry a function with a variable number of arguments');
      }
      if (this$.curried && this$.params.length > 1) {
        return (util('curry') + "") + (this$.bound || this$.classBound
          ? "((" + code + "), true)"
          : "(" + code + ")");
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
      code += ' function ctor$(){} ctor$.prototype = prototype;';
    }
    code = curryCodeCheck();
    if (this.front && !this.statement) {
      return "(" + code + ")";
    } else {
      return code;
    }
  };
  prototype.compileParams = function(scope){
    var params, length, body, i$, p, len$, i, splace, rest, that, names, assigns, dic, vr, df, unaries, hasUnary, v, ref$, ref1$;
    params = this.params, length = params.length, body = this.body;
    for (i$ = params.length - 1; i$ >= 0; --i$) {
      p = params[i$];
      if (!(p.isEmpty() || p.filler)) {
        break;
      }
      --params.length;
    }
    for (i$ = 0, len$ = params.length; i$ < len$; ++i$) {
      i = i$;
      p = params[i$];
      if (p instanceof Splat) {
        this.hasSplats = true;
        splace = i;
      } else if (p.op === '=') {
        params[i] = Binary(p.logic || '?', p.left, p.right);
      }
    }
    if (splace != null) {
      rest = params.splice(splace, 9e9);
    } else if (this.accessor) {
      if (that = params[1]) {
        that.carp('excess accessor parameter');
      }
    } else if (!(length || this.wrapper)) {
      if (body.traverseChildren(function(it){
        return it.value === 'it' || null;
      })) {
        params[0] = Var('it');
      }
    }
    names = [];
    assigns = [];
    if (params.length) {
      dic = {};
      for (i$ = 0, len$ = params.length; i$ < len$; ++i$) {
        p = params[i$];
        vr = p;
        if (df = vr.getDefault()) {
          vr = vr.first;
        }
        if (vr.isEmpty()) {
          vr = Var(scope.temporary('arg'));
        } else if (!(vr instanceof Var)) {
          unaries = [];
          while (vr instanceof Unary) {
            hasUnary = true;
            unaries.push(vr);
            vr = vr.it;
          }
          v = Var((ref1$ = (ref$ = vr.it || vr).name, delete ref$.name, ref1$) || vr.varName() || scope.temporary('arg'));
          assigns.push(Assign(vr, (fn$())));
          vr = v;
        } else if (df) {
          assigns.push(Assign(vr, p.second, '=', p.op, true));
        }
        names.push(scope.add(vr.value, 'arg', p));
      }
    }
    if (rest) {
      while (splace--) {
        rest.unshift(Arr());
      }
      assigns.push(Assign(Arr(rest), Literal('arguments')));
    }
    if (assigns.length) {
      (ref$ = this.body).prepend.apply(ref$, assigns);
    }
    return names.join(', ');
    function fn$(){
      switch (false) {
      case !df:
        return Binary(p.op, v, p.second);
      case !hasUnary:
        return fold(function(x, y){
          y.it = x;
          return y;
        }, v, unaries.reverse());
      default:
        return v;
      }
    }
  };
  return Fun;
}(Node));
exports.Class = Class = (function(superclass){
  var prototype = extend$((import$(Class, superclass).displayName = 'Class', Class), superclass).prototype, constructor = Class;
  function Class(arg$){
    var body;
    this.title = arg$.title, this.sup = arg$.sup, this.mixins = arg$.mixins, body = arg$.body;
    this.fun = Fun([], body);
  }
  prototype.children = ['title', 'sup', 'mixins', 'fun'];
  prototype.isCallable = YES;
  prototype.ripName = function(it){
    this.name = it.varName();
  };
  prototype.compile = function(o, level){
    var fun, body, lines, title, boundFuncs, decl, name, proto, ctorName, ctor, ctorPlace, importProtoObj, i$, len$, i, node, f, vname, args, that, imports, ref$, res$, clas;
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
    ctorName = 'constructor$$';
    importProtoObj = function(node, i){
      var j, prop, key, i$, ref$, len$, v;
      j = 0;
      for (; j < node.items.length; j++) {
        prop = node.items[j];
        key = prop.key;
        if ((key instanceof Key && key.name === ctorName) || (key instanceof Literal && key.value === "'" + ctorName + "'")) {
          if (ctor) {
            node.carp('redundant constructor');
          }
          ctor = prop.val;
          node.items.splice(j--, 1);
          ctorPlace = i;
        }
        if (!(prop.val instanceof Fun || prop.accessor)) {
          continue;
        }
        if (key.isComplex()) {
          key = Var(o.scope.temporary('key'));
          prop.key = Assign(key, prop.key);
        }
        if (prop.val.bound) {
          boundFuncs.push(prop.key);
          prop.val.bound = false;
          prop.val.classBound = true;
        }
        for (i$ = 0, len$ = (ref$ = [].concat(prop.val)).length; i$ < len$; ++i$) {
          v = ref$[i$];
          v.meth = key;
        }
      }
      if (node.items.length) {
        return Import(proto, node);
      } else {
        return Literal('void');
      }
    };
    for (i$ = 0, len$ = lines.length; i$ < len$; ++i$) {
      i = i$;
      node = lines[i$];
      if (node instanceof Obj) {
        lines[i] = importProtoObj(node, i);
      } else if (node instanceof Fun && !node.statement) {
        ctor && node.carp('redundant constructor');
        ctor = node;
      } else if (node instanceof Assign && node.left instanceof Chain && node.left.head.value === 'this' && node.right instanceof Fun) {
        node.right.stat = node.left.tails[0].key;
      } else {
        node.traverseChildren(fn$, true);
      }
    }
    ctor || (ctor = lines[lines.length] = this.sup
      ? Fun([], Block(Chain(new Super).add(Call([Splat(Literal('arguments'))]))))
      : Fun());
    if (!(ctor instanceof Fun)) {
      lines.splice(ctorPlace + 1, 0, Assign(Var(ctorName), ctor));
      lines.unshift(ctor = Fun([], Block(Return(Chain(Var(ctorName)).add(Call([Splat('arguments', true)]))))));
    }
    ctor.name = name;
    ctor.ctor = true;
    ctor.statement = true;
    for (i$ = 0, len$ = boundFuncs.length; i$ < len$; ++i$) {
      f = boundFuncs[i$];
      ctor.body.lines.unshift(Assign(Chain(Literal('this')).add(Index(f)), Chain(Var(util('bind'))).add(Call([Literal('this'), Literal("'" + f.name + "'"), Var('prototype')]))));
    }
    lines.push(vname = fun.proto = Var(fun.bound = name));
    args = [];
    if (that = this.sup) {
      args.push(that);
      imports = Chain(Import(Literal('this'), Var('superclass')));
      fun.proto = Util.Extends(fun.cname ? Block([Assign(imports.add(Index(Key('displayName'))), Literal("'" + name + "'")), Literal(name)]) : imports, (ref$ = fun.params)[ref$.length] = Var('superclass'));
    }
    if (that = this.mixins) {
      res$ = [];
      for (i$ = 0, len$ = that.length; i$ < len$; ++i$) {
        args[args.length] = that[i$];
        res$.push(Import(proto, JS("arguments[" + (args.length - 1) + "]"), true));
      }
      imports = res$;
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
    function fn$(it){
      var i$, ref$, len$, k, child;
      if (it instanceof Block) {
        for (i$ = 0, len$ = (ref$ = it.lines).length; i$ < len$; ++i$) {
          k = i$;
          child = ref$[i$];
          if (child instanceof Obj) {
            it.lines[k] = importProtoObj(child, i);
          }
        }
      }
    }
  };
  return Class;
}(Node));
exports.Super = Super = (function(superclass){
  var prototype = extend$((import$(Super, superclass).displayName = 'Super', Super), superclass).prototype, constructor = Super;
  function Super(){}
  prototype.isCallable = YES;
  prototype.compile = function(o){
    var scope, that, result, ref$;
    scope = o.scope;
    if (!this.sproto) {
      for (; that = !scope.get('superclass') && scope.fun; scope = scope.parent) {
        result = that;
        if (that = result.meth) {
          return 'superclass.prototype' + Index(that).compile(o);
        }
        if (that = result.stat) {
          return 'superclass' + Index(that).compile(o);
        }
        if (that = scope.fun.inClass) {
          return that + ".superclass.prototype." + scope.fun.name;
        } else if (that = scope.fun.inClassStatic) {
          return that + ".superclass." + scope.fun.name;
        }
      }
      if (that = (ref$ = o.scope.fun) != null ? ref$.name : void 8) {
        return that + ".superclass";
      }
    }
    return 'superclass';
  };
  return Super;
}(Node));
exports.Parens = Parens = (function(superclass){
  var prototype = extend$((import$(Parens, superclass).displayName = 'Parens', Parens), superclass).prototype, constructor = Parens;
  function Parens(it, keep, string){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.it = it;
    this$.keep = keep;
    this$.string = string;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
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
      it.head.hushed = true;
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
  var ref$, prototype = extend$((import$(Splat, superclass).displayName = 'Splat', Splat), superclass).prototype, constructor = Splat;
  function Splat(it, filler){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.it = it;
    this$.filler = filler;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  ref$ = Parens.prototype, prototype.children = ref$.children, prototype.isComplex = ref$.isComplex;
  prototype.isAssignable = YES;
  prototype.assigns = function(it){
    return this.it.assigns(it);
  };
  prototype.compile = function(){
    return this.carp('invalid splat');
  };
  Splat.compileArray = function(o, list, apply){
    var index, i$, len$, node, args, atoms, ref$;
    expand(list);
    index = 0;
    for (i$ = 0, len$ = list.length; i$ < len$; ++i$) {
      node = list[i$];
      if (node instanceof Splat) {
        break;
      }
      ++index;
    }
    if (index >= list.length) {
      return '';
    }
    if (!list[1]) {
      return (apply ? Object : ensureArray)(list[0].it).compile(o, LEVEL_LIST);
    }
    args = [];
    atoms = [];
    for (i$ = 0, len$ = (ref$ = list.splice(index, 9e9)).length; i$ < len$; ++i$) {
      node = ref$[i$];
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
          nodes.splice.apply(nodes, [index, 1].concat(slice$.call(expand(it.items))));
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
  var prototype = extend$((import$(Jump, superclass).displayName = 'Jump', Jump), superclass).prototype, constructor = Jump;
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
    var that, ref$;
    ctx || (ctx = {});
    if (!ctx[this.verb]) {
      return this;
    }
    if (that = this.label) {
      return !in$(that, (ref$ = ctx.labels) != null
        ? ref$
        : ctx.labels = []) && this;
    }
  };
  prototype.compileNode = function(o){
    var that, ref$;
    if (that = this.label) {
      in$(that, (ref$ = o.labels) != null
        ? ref$
        : o.labels = []) || this.carp("unknown label \"" + that + "\"");
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
  var prototype = extend$((import$(Throw, superclass).displayName = 'Throw', Throw), superclass).prototype, constructor = Throw;
  function Throw(it){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.it = it;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.getJump = VOID;
  prototype.compileNode = function(o){
    var ref$;
    return "throw " + (((ref$ = this.it) != null ? ref$.compile(o, LEVEL_PAREN) : void 8) || 'null') + ";";
  };
  return Throw;
}(Jump));
exports.Return = Return = (function(superclass){
  var prototype = extend$((import$(Return, superclass).displayName = 'Return', Return), superclass).prototype, constructor = Return;
  function Return(it){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    if (it && it.value !== 'void') {
      this$.it = it;
    }
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.getJump = THIS;
  prototype.compileNode = function(o){
    var that;
    return "return" + ((that = this.it) ? ' ' + that.compile(o, LEVEL_PAREN) : '') + ";";
  };
  return Return;
}(Jump));
exports.While = While = (function(superclass){
  var prototype = extend$((import$(While, superclass).displayName = 'While', While), superclass).prototype, constructor = While;
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
    this.isComprehension = true;
    while (loops.length) {
      toAdd = loops.pop().addBody(Block(toAdd));
      if (!toAdd.isComprehension) {
        toAdd.inComprehension = true;
      }
    }
    return this.addBody(Block(toAdd));
  };
  prototype.getJump = function(ctx){
    var i$, ref$, ref1$, len$, node;
    ctx || (ctx = {});
    ctx['continue'] = true;
    ctx['break'] = true;
    for (i$ = 0, len$ = (ref$ = ((ref1$ = this.body) != null ? ref1$.lines : void 8) || []).length; i$ < len$; ++i$) {
      node = ref$[i$];
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
  prototype.addObjComp = function(objComp){
    this.objComp = objComp != null ? objComp : true;
    return this;
  };
  prototype.makeReturn = function(it){
    var last, ref$;
    if (this.hasReturned) {
      return this;
    }
    if (it) {
      if (this.objComp) {
        this.body = Block(this.body.makeObjReturn(it));
        if (this.guard) {
          this.body = If(this.guard, this.body);
        }
      } else {
        if (!(this.body || this.index)) {
          this.addBody(Block(Var(this.index = 'ridx$')));
        }
        last = (ref$ = this.body.lines) != null ? ref$[ref$.length - 1] : void 8;
        if ((this.isComprehension || this.inComprehension) && !(last != null && last.isComprehension)) {
          this.body.makeReturn(it);
          if ((ref$ = this['else']) != null) {
            ref$.makeReturn(it);
          }
          this.hasReturned = true;
        } else {
          this.resVar = it;
          if ((ref$ = this['else']) != null) {
            ref$.makeReturn(it);
          }
        }
      }
    } else {
      this.getJump() || (this.returns = true);
    }
    return this;
  };
  prototype.compileNode = function(o){
    var test, ref$, head, that;
    o.loop = true;
    this.test && (this.un
      ? this.test = this.test.invert()
      : this.anaphorize());
    if (this.post) {
      return 'do {' + this.compileBody((o.indent += TAB, o));
    }
    test = ((ref$ = this.test) != null ? ref$.compile(o, LEVEL_PAREN) : void 8) || '';
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
    var lines, yet, tab, code, ret, mid, empty, last, hasLoop, res, temp, key$, ref$, that;
    o['break'] = o['continue'] = true;
    lines = this.body.lines, yet = this.yet, tab = this.tab;
    code = ret = mid = '';
    empty = this.objComp ? '{}' : '[]';
    last = lines != null ? lines[lines.length - 1] : void 8;
    if (!((this.isComprehension || this.inComprehension) && !(last != null && last.isComprehension))) {
      if (last != null) {
        last.traverseChildren(function(it){
          var ref$;
          if (it instanceof Block && (ref$ = it.lines)[ref$.length - 1] instanceof While) {
            hasLoop = true;
          }
        });
      }
      if (this.returns && !this.resVar) {
        this.resVar = res = o.scope.assign('results$', empty);
      }
      if (this.resVar && (last instanceof While || hasLoop)) {
        temp = o.scope.temporary('lresult');
        lines.unshift(Assign(Var(temp), Arr(), '='));
        if (lines[key$ = lines.length - 1] != null) {
          lines[key$] = lines[key$].makeReturn(temp);
        }
        mid += TAB + "" + Chain(Var(this.resVar)).add(Index(Key('push'), '.', true)).add(Call([Chain(Var(temp))])).compile(o) + ";\n" + this.tab;
      } else {
        this.hasReturned = true;
        if (this.resVar) {
          this.body.makeReturn(this.resVar);
        }
      }
    }
    if (this.returns) {
      if (this.objComp) {
        this.body = Block(this.body.makeObjReturn('results$'));
      }
      if (this.guard && this.objComp) {
        this.body = If(this.guard, this.body);
      }
      if ((!last instanceof While && !this.hasReturned) || this.isComprehension || this.inComprehension) {
        if (lines[key$ = lines.length - 1] != null) {
          lines[key$] = lines[key$].makeReturn(res = o.scope.assign('results$', empty));
        }
      }
      ret += "\n" + this.tab + "return " + (res || empty) + ";";
      if ((ref$ = this['else']) != null) {
        ref$.makeReturn();
      }
    }
    yet && lines.unshift(JS(yet + " = false;"));
    if (that = this.body.compile(o, LEVEL_TOP)) {
      code += "\n" + that + "\n" + tab;
    }
    code += mid;
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
  var prototype = extend$((import$(For, superclass).displayName = 'For', For), superclass).prototype, constructor = For;
  function For(it){
    importAll$(this, it);
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
    var temps, idx, ref$, pvar, step, tvar, tail, fvar, vars, eq, cond, svar, srcPart, lvar, head, that, body;
    o.loop = true;
    temps = this.temps = [];
    if (this.object && this.index) {
      o.scope.declare(idx = this.index);
    } else {
      temps.push(idx = o.scope.temporary('i'));
    }
    if (!this.body) {
      this.addBody(Block(Var(idx)));
    }
    if (!this.object) {
      ref$ = (this.step || Literal(1)).compileLoopReference(o, 'step'), pvar = ref$[0], step = ref$[1];
      pvar === step || temps.push(pvar);
    }
    if (this.from) {
      ref$ = this.to.compileLoopReference(o, 'to'), tvar = ref$[0], tail = ref$[1];
      fvar = this.from.compile(o, LEVEL_LIST);
      vars = idx + " = " + fvar;
      if (tail !== tvar) {
        vars += ", " + tail;
        temps.push(tvar);
      }
      if (!this.step && +fvar > +tvar) {
        pvar = step = -1;
      }
      eq = this.op === 'til' ? '' : '=';
      cond = +pvar
        ? idx + " " + '<>'.charAt(pvar < 0) + eq + " " + tvar
        : pvar + " < 0 ? " + idx + " >" + eq + " " + tvar + " : " + idx + " <" + eq + " " + tvar;
    } else {
      if (this.ref) {
        this.item = Var(o.scope.temporary('x'));
      }
      if (this.item || this.object && this.own) {
        ref$ = this.source.compileLoopReference(o, 'ref', !this.object), svar = ref$[0], srcPart = ref$[1];
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
    this.own && (head += ") if (" + o.scope.assign('own$', '{}.hasOwnProperty') + ".call(" + svar + ", " + idx + ")");
    head += ') {';
    this.infuseIIFE();
    o.indent += TAB;
    if (this.index && !this.object) {
      head += '\n' + o.indent + Assign(Var(this.index), JS(idx)).compile(o, LEVEL_TOP) + ';';
    }
    if (this.item && !this.item.isEmpty()) {
      head += '\n' + o.indent + Assign(this.item, JS(svar + "[" + idx + "]")).compile(o, LEVEL_TOP) + ';';
    }
    if (this.ref) {
      o.ref = this.item.value;
    }
    body = this.compileBody(o);
    if ((this.item || (this.index && !this.object)) && '}' === body.charAt(0)) {
      head += '\n' + this.tab;
    }
    return head + body;
  };
  prototype.infuseIIFE = function(){
    var this$ = this;
    function dup(params, name){
      var i$, len$, p;
      if (name) {
        for (i$ = 0, len$ = params.length; i$ < len$; ++i$) {
          p = params[i$];
          if (name === p.value) {
            return true;
          }
        }
      }
    }
    this.body.traverseChildren(function(it){
      var fun, params, call, index, item, that;
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
      index = this$.index, item = this$.item;
      if (index && !dup(params, index)) {
        call.args.push(params[params.length] = Var(index));
      }
      if (that = item instanceof List && item.name) {
        item = Var(that);
      }
      if (item instanceof Var && !dup(params, item.value)) {
        call.args.push(params[params.length] = item);
      }
    });
  };
  return For;
}(While));
exports.Try = Try = (function(superclass){
  var prototype = extend$((import$(Try, superclass).displayName = 'Try', Try), superclass).prototype, constructor = Try;
  function Try(attempt, thrown, recovery, ensure){
    var ref$;
    this.attempt = attempt;
    this.thrown = thrown;
    this.recovery = recovery;
    this.ensure = ensure;
    if ((ref$ = this.recovery) != null) {
      ref$.lines.unshift(Assign(this.thrown || Var('e'), Var('e$')));
    }
  }
  prototype.children = ['attempt', 'recovery', 'ensure'];
  prototype.show = function(){
    return this.thrown;
  };
  prototype.isStatement = YES;
  prototype.isCallable = function(){
    var ref$;
    return ((ref$ = this.recovery) != null ? ref$.isCallable() : void 8) && this.attempt.isCallable();
  };
  prototype.getJump = function(it){
    var ref$;
    return this.attempt.getJump(it) || ((ref$ = this.recovery) != null ? ref$.getJump(it) : void 8);
  };
  prototype.makeReturn = function(it){
    this.attempt = this.attempt.makeReturn(it);
    if (this.recovery != null) {
      this.recovery = this.recovery.makeReturn(it);
    }
    return this;
  };
  prototype.compileNode = function(o){
    var code, that;
    o.indent += TAB;
    code = 'try ' + this.compileBlock(o, this.attempt);
    if (that = this.recovery || !this.ensure && JS('')) {
      code += ' catch (e$) ' + this.compileBlock(o, that);
    }
    if (that = this.ensure) {
      code += ' finally ' + this.compileBlock(o, that);
    }
    return code;
  };
  return Try;
}(Node));
exports.Switch = Switch = (function(superclass){
  var prototype = extend$((import$(Switch, superclass).displayName = 'Switch', Switch), superclass).prototype, constructor = Switch;
  function Switch(type, topic, cases, $default){
    var last, ref$;
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
    if (this.cases.length && (last = (ref$ = this.cases)[ref$.length - 1]).tests.length === 1 && last.tests[0] instanceof Var && last.tests[0].value === '_') {
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
    var i$, ref$, len$, c;
    for (i$ = 0, len$ = (ref$ = this.cases).length; i$ < len$; ++i$) {
      c = ref$[i$];
      if (!c.isCallable()) {
        return false;
      }
    }
    if (this['default']) {
      return this['default'].isCallable();
    } else {
      return true;
    }
  };
  prototype.getJump = function(ctx){
    var i$, ref$, len$, c, that;
    ctx || (ctx = {});
    ctx['break'] = true;
    for (i$ = 0, len$ = (ref$ = this.cases).length; i$ < len$; ++i$) {
      c = ref$[i$];
      if (that = c.body.getJump(ctx)) {
        return that;
      }
    }
    return (ref$ = this['default']) != null ? ref$.getJump(ctx) : void 8;
  };
  prototype.makeReturn = function(it){
    var i$, ref$, len$, c;
    for (i$ = 0, len$ = (ref$ = this.cases).length; i$ < len$; ++i$) {
      c = ref$[i$];
      c.makeReturn(it);
    }
    if ((ref$ = this['default']) != null) {
      ref$.makeReturn(it);
    }
    return this;
  };
  prototype.compileNode = function(o){
    var tab, ref$, targetNode, target, topic, t, code, stop, i$, len$, i, c, that;
    tab = this.tab;
    if (this.target) {
      ref$ = Chain(this.target).cacheReference(o), targetNode = ref$[0], target = ref$[1];
    }
    topic = this.type === 'match'
      ? (t = target
        ? [targetNode]
        : [], Block(t.concat([Literal('false')])).compile(o, LEVEL_PAREN))
      : !!this.topic && this.anaphorize().compile(o, LEVEL_PAREN);
    code = "switch (" + topic + ") {\n";
    stop = this['default'] || this.cases.length - 1;
    o['break'] = true;
    for (i$ = 0, len$ = (ref$ = this.cases).length; i$ < len$; ++i$) {
      i = i$;
      c = ref$[i$];
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
  var prototype = extend$((import$(Case, superclass).displayName = 'Case', Case), superclass).prototype, constructor = Case;
  function Case(tests, body){
    this.tests = tests;
    this.body = body;
  }
  prototype.children = ['tests', 'body'];
  prototype.isCallable = function(){
    return this.body.isCallable();
  };
  prototype.makeReturn = function(it){
    var ref$, ref1$;
    if (((ref$ = (ref1$ = this.body.lines)[ref1$.length - 1]) != null ? ref$.value : void 8) !== 'fallthrough') {
      this.body.makeReturn(it);
    }
    return this;
  };
  prototype.compileCase = function(o, tab, nobr, bool, type, target){
    var tests, i$, ref$, len$, test, j$, ref1$, len1$, t, i, tar, binary, that, code, lines, last, ft;
    tests = [];
    for (i$ = 0, len$ = (ref$ = this.tests).length; i$ < len$; ++i$) {
      test = ref$[i$];
      test = test.expandSlice(o).unwrap();
      if (test instanceof Arr && type !== 'match') {
        for (j$ = 0, len1$ = (ref1$ = test.items).length; j$ < len1$; ++j$) {
          t = ref1$[j$];
          tests.push(t);
        }
      } else {
        tests.push(test);
      }
    }
    tests.length || tests.push(Literal('void'));
    if (type === 'match') {
      for (i$ = 0, len$ = tests.length; i$ < len$; ++i$) {
        i = i$;
        test = tests[i$];
        tar = Chain(target).add(Index(Literal(i), '.', true));
        tests[i] = Chain(test).autoCompare(target ? [tar] : null);
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
    for (i$ = 0, len$ = tests.length; i$ < len$; ++i$) {
      t = tests[i$];
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
  var prototype = extend$((import$(If, superclass).displayName = 'If', If), superclass).prototype, constructor = If;
  function If($if, then, un){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$['if'] = $if;
    this$.then = then;
    this$.un = un;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.children = ['if', 'then', 'else'];
  prototype.aSource = 'if';
  prototype.aTargets = ['then'];
  prototype.show = function(){
    return this.un && '!';
  };
  prototype.terminator = '';
  prototype.delegate(['isCallable', 'isArray', 'isString', 'isRegex'], function(it){
    var ref$;
    return ((ref$ = this['else']) != null ? ref$[it]() : void 8) && this.then[it]();
  });
  prototype.getJump = function(it){
    var ref$;
    return this.then.getJump(it) || ((ref$ = this['else']) != null ? ref$.getJump(it) : void 8);
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
  var ref$, prototype = extend$((import$(Label, superclass).displayName = 'Label', Label), superclass).prototype, constructor = Label;
  function Label(label, it){
    var fun;
    this.label = label || '_';
    this.it = it;
    if (fun = (it instanceof Fun || it instanceof Class) && it || it.calling && it.it.head) {
      fun.name || (fun.name = this.label, fun.labeled = true);
      return it;
    }
  }
  ref$ = Parens.prototype, prototype.children = ref$.children, prototype.isCallable = ref$.isCallable, prototype.isArray = ref$.isArray;
  prototype.show = function(){
    return this.label;
  };
  prototype.isStatement = YES;
  prototype.getJump = function(ctx){
    var ref$;
    ctx || (ctx = {});
    ((ref$ = ctx.labels) != null
      ? ref$
      : ctx.labels = []).push(this.label);
    return this.it.getJump((ctx['break'] = true, ctx));
  };
  prototype.makeReturn = function(it){
    this.it = this.it.makeReturn(it);
    return this;
  };
  prototype.compileNode = function(o){
    var label, it, labels;
    label = this.label, it = this.it;
    labels = o.labels = slice$.call(o.labels || []);
    if (in$(label, labels)) {
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
exports.Cascade = Cascade = (function(superclass){
  var prototype = extend$((import$(Cascade, superclass).displayName = 'Cascade', Cascade), superclass).prototype, constructor = Cascade;
  function Cascade(input, output, prog1){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.input = input;
    this$.output = output;
    this$.prog1 = prog1;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.show = function(){
    return this.prog1;
  };
  prototype.children = ['input', 'output'];
  prototype.terminator = '';
  prototype.delegate(['isCallable', 'isArray', 'isString', 'isRegex'], function(it){
    return this[this.prog1 ? 'input' : 'output'][it]();
  });
  prototype.getJump = function(it){
    return this.output.getJump(it);
  };
  prototype.makeReturn = function(ret){
    this.ret = ret;
    return this;
  };
  prototype.compileNode = function(o){
    var level, input, output, prog1, ref, ref$, code, out;
    level = o.level;
    input = this.input, output = this.output, prog1 = this.prog1, ref = this.ref;
    if (prog1 && ('ret' in this || level && !this['void'])) {
      output.add((ref$ = Literal('..'), ref$.cascadee = true, ref$));
    }
    if ('ret' in this) {
      output = output.makeReturn(this.ret);
    }
    if (ref) {
      prog1 || (output = Assign(Var(ref), output));
    } else {
      ref = o.scope.temporary('x');
    }
    if (input instanceof Cascade) {
      input.ref = ref;
    } else {
      input && (input = Assign(Var(ref), input));
    }
    o.level && (o.level = LEVEL_PAREN);
    code = input.compile(o);
    out = Block(output).compile((o.ref = new String(ref), o));
    if (prog1 === 'cascade' && !o.ref.erred) {
      this.carp("unreferred cascadee");
    }
    if (!level) {
      return code + "" + input.terminator + "\n" + out;
    }
    code += ", " + out;
    if (level > LEVEL_PAREN) {
      return "(" + code + ")";
    } else {
      return code;
    }
  };
  return Cascade;
}(Node));
exports.JS = JS = (function(superclass){
  var prototype = extend$((import$(JS, superclass).displayName = 'JS', JS), superclass).prototype, constructor = JS;
  function JS(code, literal, comment){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.code = code;
    this$.literal = literal;
    this$.comment = comment;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
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
exports.Require = Require = (function(superclass){
  var prototype = extend$((import$(Require, superclass).displayName = 'Require', Require), superclass).prototype, constructor = Require;
  function Require(body){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.body = body;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.children = ['body'];
  prototype.compile = function(o){
    var chain, stripString, getFileName, getValue, processItem, item, this$ = this;
    stripString = function(val){
      var that;
      if (that = /^['"](.*)['"]$/.exec(val)) {
        return that[1];
      } else {
        return val;
      }
    };
    getFileName = function(val){
      var ref$;
      return (ref$ = stripString(val).split('/'))[ref$.length - 1].split('.')[0].replace(/-[a-z]/ig, function(it){
        return it.charAt(1).toUpperCase();
      });
    };
    getValue = function(item){
      var ref$;
      switch (false) {
      case !(item instanceof Key):
        return item.name;
      case !(item instanceof Var):
        return item.value;
      case !(item instanceof Literal):
        return item.value;
      case !(item instanceof Index):
        return getValue(item.key);
      case !(item instanceof Chain):
        if ((ref$ = item.tails) != null && ref$.length) {
          chain = item.tails;
        }
        return getValue(item.head);
      default:
        return item;
      }
    };
    processItem = function(item){
      var ref$, asg, value, main;
      chain = null;
      ref$ = (function(){
        var ref$;
        switch (false) {
        case !(item instanceof Prop):
          return [getValue(item.key), item.val];
        case !(item instanceof Chain):
          if ((ref$ = item.tails) != null && ref$.length) {
            chain = item.tails;
            return [(ref$ = item.tails)[ref$.length - 1], item.head];
          } else {
            return [item.head, item.head];
          }
          break;
        default:
          return [item, item];
        }
      }()), asg = ref$[0], value = ref$[1];
      asg = getFileName(getValue(asg));
      value = stripString(getValue(value));
      main = Chain(Var('require')).add(Call([Literal("'" + value + "'")]));
      return Assign(Var(asg), chain ? Chain(main, chain) : main).compile(o);
    };
    if (this.body.items != null) {
      return (function(){
        var i$, ref$, len$, results$ = [];
        for (i$ = 0, len$ = (ref$ = this.body.items).length; i$ < len$; ++i$) {
          item = ref$[i$];
          results$.push(processItem(item));
        }
        return results$;
      }.call(this)).join(";\n" + o.indent);
    } else {
      return processItem(this.body);
    }
  };
  return Require;
}(Node));
exports.Util = Util = (function(superclass){
  var prototype = extend$((import$(Util, superclass).displayName = 'Util', Util), superclass).prototype, constructor = Util;
  function Util(verb){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.verb = verb;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
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
  var prototype = extend$((import$(Vars, superclass).displayName = 'Vars', Vars), superclass).prototype, constructor = Vars;
  function Vars(vars){
    var this$ = this instanceof ctor$ ? this : new ctor$;
    this$.vars = vars;
    return this$;
  } function ctor$(){} ctor$.prototype = prototype;
  prototype.children = ['vars'];
  prototype.makeReturn = THIS;
  prototype.compile = function(o, level){
    var i$, ref$, len$, v, value;
    for (i$ = 0, len$ = (ref$ = this.vars).length; i$ < len$; ++i$) {
      v = ref$[i$], value = v.value;
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
exports.Decl = function(type, nodes, lno){
  if (!nodes[0]) {
    throw SyntaxError("empty " + type + " on line " + lno);
  }
  return DECLS[type](nodes);
};
DECLS = {
  'export': function(lines){
    var i, out, node, that, ref$;
    i = -1;
    out = Util('out');
    while (node = lines[++i]) {
      if (node instanceof Block) {
        lines.splice.apply(lines, [i--, 1].concat(slice$.call(node.lines)));
        continue;
      }
      if (that = node instanceof Fun && node.name) {
        lines.splice(i++, 0, Assign(Chain(out, [Index(Key(that))]), Var(that)));
        continue;
      }
      lines[i] = (that = node.varName() || node instanceof Assign && node.left.varName() || node instanceof Class && ((ref$ = node.title) != null ? ref$.varName() : void 8))
        ? Assign(Chain(out, [Index(Key(that))]), node)
        : Import(out, node);
    }
    return Block(lines);
  },
  'import': function(lines, all){
    var i$, len$, i, line;
    for (i$ = 0, len$ = lines.length; i$ < len$; ++i$) {
      i = i$;
      line = lines[i$];
      lines[i] = Import(Literal('this'), line, all);
    }
    return Block(lines);
  },
  importAll: function(it){
    return this['import'](it, true);
  },
  'const': function(lines){
    var i$, len$, node;
    for (i$ = 0, len$ = lines.length; i$ < len$; ++i$) {
      node = lines[i$];
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
ref$ = Scope.prototype;
ref$.READ_ONLY = {
  'const': 'constant',
  'function': 'function',
  undefined: 'undeclared'
};
ref$.add = function(name, type, node){
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
ref$.get = function(name){
  return this.variables[name + "."];
};
ref$.declare = function(name, node, constant){
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
ref$.assign = function(name, value){
  return this.add(name, {
    value: value
  });
};
ref$.temporary = function(name){
  var ref$;
  name || (name = 'ref');
  while ((ref$ = this.variables[name + "$."]) != 'reuse' && ref$ != void 8) {
    name = name.length < 2 && name < 'z'
      ? String.fromCharCode(name.charCodeAt() + 1)
      : name.replace(/\d*$/, fn$);
  }
  return this.add(name + '$', 'var');
  function fn$(it){
    return ++it;
  }
};
ref$.free = function(name){
  return this.add(name, 'reuse');
};
ref$.check = function(name, above){
  var type, ref$;
  if ((type = this.variables[name + "."]) || !above) {
    return type;
  }
  return (ref$ = this.parent) != null ? ref$.check(name, above) : void 8;
};
ref$.checkReadOnly = function(name){
  var that, ref$, key$;
  if (that = this.READ_ONLY[this.check(name, true)]) {
    return that;
  }
  (ref$ = this.variables)[key$ = name + "."] || (ref$[key$] = 'upvar');
  return '';
};
ref$.emit = function(code, tab){
  var vrs, asn, fun, name, ref$, type, that, val;
  vrs = [];
  asn = [];
  fun = [];
  for (name in ref$ = this.variables) {
    type = ref$[name];
    name = name.slice(0, -1);
    if (type == 'var' || type == 'const' || type == 'reuse') {
      vrs.push(name);
    } else if (that = type.value) {
      if (~(val = entab(that, tab)).lastIndexOf('function(', 0)) {
        fun.push("function " + name + val.slice(8));
      } else {
        asn.push(name + " = " + val);
      }
    }
  }
  if (that = vrs.concat(asn).join(', ')) {
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
  'in': 'function(x, arr){\n  var i = -1, l = arr.length >>> 0;\n  while (++i < l) if (x === arr[i] && i in arr) return true;\n  return false;\n}',
  out: 'typeof exports != \'undefined\' && exports || this',
  curry: 'function(f, bound){\n  var context,\n  _curry = function(args) {\n    return f.length > 1 ? function(){\n      var params = args ? args.concat() : [];\n      context = bound ? context || this : this;\n      return params.push.apply(params, arguments) <\n          f.length && arguments.length ?\n        _curry.call(context, params) : f.apply(context, params);\n    } : f;\n  };\n  return _curry();\n}',
  compose: 'function(fs){\n  return function(){\n    var i, args = arguments;\n    for (i = fs.length; i > 0; --i) { args = [fs[i-1].apply(this, args)]; }\n    return args[0];\n  };\n}',
  flip: 'function(f){\n  return curry$(function (x, y) { return f(y, x); });\n}',
  partialize: 'function(f, args, where){\n  var context = this;\n  return function(){\n    var params = slice$.call(arguments), i,\n        len = params.length, wlen = where.length,\n        ta = args ? args.concat() : [], tw = where ? where.concat() : [];\n    for(i = 0; i < len; ++i) { ta[tw[0]] = params[i]; tw.shift(); }\n    return len < wlen && len ?\n      partialize$.apply(context, [f, ta, tw]) : f.apply(context, ta);\n  };\n}',
  not: 'function(x){ return !x; }',
  deepEq: 'function(x, y, type){\n  var toString = {}.toString, hasOwnProperty = {}.hasOwnProperty,\n      has = function (obj, key) { return hasOwnProperty.call(obj, key); };\n  first = true;\n  return eq(x, y, []);\n  function eq(a, b, stack) {\n    var className, length, size, result, alength, blength, r, key, ref, sizeB;\n    if (a == null || b == null) { return a === b; }\n    if (a.__placeholder__ || b.__placeholder__) { return true; }\n    if (a === b) { return a !== 0 || 1 / a == 1 / b; }\n    className = toString.call(a);\n    if (toString.call(b) != className) { return false; }\n    switch (className) {\n      case \'[object String]\': return a == String(b);\n      case \'[object Number]\':\n        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);\n      case \'[object Date]\':\n      case \'[object Boolean]\':\n        return +a == +b;\n      case \'[object RegExp]\':\n        return a.source == b.source &&\n               a.global == b.global &&\n               a.multiline == b.multiline &&\n               a.ignoreCase == b.ignoreCase;\n    }\n    if (typeof a != \'object\' || typeof b != \'object\') { return false; }\n    length = stack.length;\n    while (length--) { if (stack[length] == a) { return true; } }\n    stack.push(a);\n    size = 0;\n    result = true;\n    if (className == \'[object Array]\') {\n      alength = a.length;\n      blength = b.length;\n      if (first) { \n        switch (type) {\n        case \'===\': result = alength === blength; break;\n        case \'<==\': result = alength <= blength; break;\n        case \'<<=\': result = alength < blength; break;\n        }\n        size = alength;\n        first = false;\n      } else {\n        result = alength === blength;\n        size = alength;\n      }\n      if (result) {\n        while (size--) {\n          if (!(result = size in a == size in b && eq(a[size], b[size], stack))){ break; }\n        }\n      }\n    } else {\n      if (\'constructor\' in a != \'constructor\' in b || a.constructor != b.constructor) {\n        return false;\n      }\n      for (key in a) {\n        if (has(a, key)) {\n          size++;\n          if (!(result = has(b, key) && eq(a[key], b[key], stack))) { break; }\n        }\n      }\n      if (result) {\n        sizeB = 0;\n        for (key in b) {\n          if (has(b, key)) { ++sizeB; }\n        }\n        if (first) {\n          if (type === \'<<=\') {\n            result = size < sizeB;\n          } else if (type === \'<==\') {\n            result = size <= sizeB\n          } else {\n            result = size === sizeB;\n          }\n        } else {\n          first = false;\n          result = size === sizeB;\n        }\n      }\n    }\n    stack.pop();\n    return result;\n  }\n}',
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
  this['<'] = this['>'] = this['<='] = this['>='] = this.of = this['instanceof'] = 0.5;
  this['<<='] = this['>>='] = this['<=='] = this['>=='] = this['+++'] = this['++'] = 0.5;
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
  return Scope.root.assign(it + '$', UTILS[it]);
}
function entab(code, tab){
  return code.replace(/\n/g, '\n' + tab);
}
function fold(f, memo, xs){
  var i$, len$, x;
  for (i$ = 0, len$ = xs.length; i$ < len$; ++i$) {
    x = xs[i$];
    memo = f(memo, x);
  }
  return memo;
}
function import$(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}
function clone$(it){
  function fun(){} fun.prototype = it;
  return new fun;
}
function extend$(sub, sup){
  function fun(){} fun.prototype = (sub.superclass = sup).prototype;
  (sub.prototype = new fun).constructor = sub;
  if (typeof sup.extended == 'function') sup.extended(sub);
  return sub;
}
function in$(x, arr){
  var i = -1, l = arr.length >>> 0;
  while (++i < l) if (x === arr[i] && i in arr) return true;
  return false;
}
function repeatString$(str, n){
  for (var r = ''; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;
  return r;
}
function importAll$(obj, src){
  for (var key in src) obj[key] = src[key];
  return obj;
}