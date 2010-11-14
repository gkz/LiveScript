(function(){
  var Accessor, Arr, Assign, Base, Call, Case, Class, Code, Comment, Existence, Expressions, Extends, For, IDENTIFIER, If, Import, Index, LEVEL_ACCESS, LEVEL_COND, LEVEL_LIST, LEVEL_OP, LEVEL_PAREN, LEVEL_TOP, Literal, METHOD_DEF, NUMBER, Obj, Of, Op, Param, Parens, Return, SIMPLENUM, Scope, Splat, Switch, TAB, TRAILING_WHITESPACE, Throw, Try, UTILITIES, Value, While, del, lastNonComment, multident, utility, __extends = function(child, parent){
    function ctor(){ this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.superclass = parent;
    return child;
  }, __importAll = function(obj, src){
    for (var key in src) obj[key] = src[key];
    return obj;
  }, __owns = Object.prototype.hasOwnProperty;
  Scope = require('./scope').Scope;
  exports.Base = Base = (function(){
    var _ref;
    function Base(){}
    Base.name = "Base";
    _ref = Base.prototype, _ref.compile = function(options, level){
      var code, key, node, o, tmp, _i, _len, _ref;
      o = {};
      for (key in options) {
        o[key] = options[key];
      }
      if (level != null) {
        o.level = level;
      }
      node = this.unfoldSoak(o) || this;
      node.tab = o.indent;
      if (!o.level || node.isPureStatement() || !node.isStatement(o)) {
        code = node.compileNode(o);
        if (node.temps) {
          for (_i = 0, _len = (_ref = node.temps).length; _i < _len; ++_i) {
            tmp = _ref[_i];
            o.scope.free(tmp);
          }
        }
        return code;
      } else {
        return node.compileClosure(o);
      }
    }, _ref.compileClosure = function(o){
      var args, call, func, mentionsArgs;
      if (this.containsPureStatement()) {
        throw SyntaxError('cannot include a pure statement in an expression');
      }
      args = [];
      func = Code([], Expressions(this));
      func.wrapper = true;
      if (this.contains(this.literalThis)) {
        args.push(Literal('this'));
        call = Value(func, [Accessor(Literal('call'))]);
      }
      mentionsArgs = false;
      this.traverseChildren(false, function(it){
        if (it instanceof Literal && it.value === 'arguments') {
          return mentionsArgs = it.value = '_args';
        }
      });
      if (mentionsArgs) {
        args.push(Literal('arguments'));
        func.params.push(Param(Literal('_args')));
      }
      return Parens(Call(call || func, args), true).compileNode(o);
    }, _ref.literalThis = function(it){
      return it instanceof Literal && it.value === 'this' || it instanceof Code && it.bound;
    }, _ref.cache = function(o, level, reused){
      var ref, sub;
      if (!this.isComplex()) {
        ref = level ? this.compile(o, level) : this;
        return [ref, ref];
      } else {
        ref = Literal(reused || o.scope.temporary('ref'));
        sub = Assign(ref, this, '=');
        if (level) {
          return [sub.compile(o, level), ref.value];
        } else {
          return [sub, ref];
        }
      }
    }, _ref.compileLoopReference = function(o, name){
      var src, tmp;
      src = tmp = this.compile(o, LEVEL_LIST);
      if (!(NUMBER.test(src) || IDENTIFIER.test(src) && o.scope.check(src))) {
        src = "" + (tmp = o.scope.temporary(name)) + " = " + src;
      }
      return [src, tmp];
    }, _ref.makeReturn = function(){
      return Return(this);
    }, _ref.contains = function(pred){
      var contains;
      contains = false;
      this.traverseChildren(false, function(it){
        if (pred(it)) {
          return !(contains = true);
        }
      });
      return contains;
    }, _ref.containsType = function(type){
      return this instanceof type || this.contains(function(it){
        return it instanceof type;
      });
    }, _ref.containsPureStatement = function(){
      return this.isPureStatement() || this.contains(function(it){
        return it.isPureStatement();
      });
    }, _ref.eachChild = function(func){
      var child, name, node, _i, _j, _len, _len2, _ref;
      if (!this.children) {
        return this;
      }
      for (_i = 0, _len = (_ref = this.children).length; _i < _len; ++_i) {
        name = _ref[_i];
        if (!(child = this[name])) continue;
        if ('length' in child) {
          for (_j = 0, _len2 = child.length; _j < _len2; ++_j) {
            node = child[_j];
            if (false === func(node)) {
              return this;
            }
          }
        } else {
          if (false === func(child)) {
            return this;
          }
        }
      }
      return this;
    }, _ref.traverseChildren = function(crossScope, func){
      return this.eachChild(function(child){
        if (false === func(child)) {
          return false;
        }
        return child.traverseChildren(crossScope, func);
      });
    }, _ref.invert = function(){
      return Op('!', this);
    }, _ref.unwrapAll = function(){
      var node;
      node = this;
      while (node !== (node = node.unwrap())) {}
      return node;
    }, _ref.children = [], _ref.isStatement = NO, _ref.isPureStatement = NO, _ref.isComplex = YES, _ref.isChainable = NO, _ref.isAssignable = NO, _ref.isArray = NO, _ref.isObject = NO, _ref.assigns = NO, _ref.unwrap = THIS, _ref.unfoldSoak = NO, _ref.unfoldAssign = NO, _ref.toString = function(idt, name){
      var tree;
      idt == null && (idt = '');
      name == null && (name = this.constructor.name);
      tree = '\n' + idt + name;
      if (this.soak) {
        tree += '?';
      }
      this.eachChild(function(it){
        return tree += it.toString(idt + TAB);
      });
      return tree;
    };
    return Base;
  }());
  exports.Expressions = Expressions = (function(){
    var _ref;
    __extends(Expressions, Base);
    function _ctor(){}
    _ctor.prototype = Expressions.prototype;
    function Expressions(node){
      var _this = new _ctor;
      if (node instanceof Expressions) {
        return node;
      }
      _this.expressions = node ? [node] : [];
      return _this;
    }
    Expressions.name = "Expressions";
    _ref = Expressions.prototype, _ref.children = ['expressions'], _ref.append = function(it){
      this.expressions.push(it);
      return this;
    }, _ref.prepend = function(it){
      this.expressions.unshift(it);
      return this;
    }, _ref.pop = function(){
      return this.expressions.pop();
    }, _ref.unwrap = function(){
      if (this.expressions.length === 1) {
        return this.expressions[0];
      } else {
        return this;
      }
    }, _ref.isEmpty = function(){
      return !this.expressions.length;
    }, _ref.isStatement = function(o){
      var exp, _i, _len, _ref;
      for (_i = 0, _len = (_ref = this.expressions).length; _i < _len; ++_i) {
        exp = _ref[_i];
        if (!(exp.isPureStatement() || exp.isStatement(o))) continue;
        return true;
      }
      return false;
    }, _ref.makeReturn = function(){
      var i, node, _ref;
      _ref = lastNonComment(this.expressions), node = _ref[0], i = _ref[1];
      if (node) {
        this.expressions[i] = node.makeReturn();
      }
      return this;
    }, _ref.compile = function(o, level){
      o == null && (o = {});
      if (o.scope) {
        return Expressions.superclass.prototype.compile.call(this, o, level);
      } else {
        return this.compileRoot(o);
      }
    }, _ref.compileNode = function(o){
      var code, codes, node, top, _i, _len, _ref;
      o.expressions = this;
      this.tab = o.indent;
      top = !o.level;
      codes = [];
      for (_i = 0, _len = (_ref = this.expressions).length; _i < _len; ++_i) {
        node = _ref[_i];
        node = (node = node.unwrapAll()).unfoldSoak(o) || node;
        if (top) {
          node.front = true;
          code = node.compile(o);
          codes.push(node.isStatement(o) ? code : this.tab + code + ';');
        } else {
          codes.push(node.compile(o, LEVEL_LIST));
        }
      }
      if (top) {
        return codes.join('\n');
      }
      code = codes.join(', ') || 'void 0';
      if (codes.length > 1 && o.level >= LEVEL_LIST) {
        return "(" + code + ")";
      } else {
        return code;
      }
    }, _ref.compileRoot = function(o){
      var bare, code;
      o.indent = this.tab = (bare = del(o, 'bare')) ? '' : TAB;
      o.scope = new Scope(null, this, null);
      o.level = LEVEL_TOP;
      code = this.compileWithDeclarations(o);
      code = code.replace(TRAILING_WHITESPACE, '');
      if (bare) {
        return code;
      } else {
        return "(function(){\n" + code + "\n}).call(this);\n";
      }
    }, _ref.compileWithDeclarations = function(o){
      var code, scope, vars;
      o.level = LEVEL_TOP;
      code = this.compileNode(o);
      vars = '';
      scope = o.scope;
      if (!o.globals && scope.hasDeclarations(this)) {
        vars += scope.declaredVariables().join(', ');
      }
      if (scope.hasAssignments(this)) {
        if (vars) {
          vars += ', ';
        }
        vars += multident(scope.assignedVariables().join(', '), this.tab);
      }
      if (vars) {
        code = this.tab + ("var " + vars + ";\n") + code;
      }
      return code;
    };
    return Expressions;
  }());
  exports.Literal = Literal = (function(){
    var _ref;
    __extends(Literal, Base);
    function _ctor(){}
    _ctor.prototype = Literal.prototype;
    function Literal(_arg){
      var _this = new _ctor;
      _this.value = _arg;
      return _this;
    }
    Literal.name = "Literal";
    _ref = Literal.prototype, _ref.makeReturn = function(){
      if (this.isPureStatement()) {
        return this;
      } else {
        return Return(this);
      }
    }, _ref.isPureStatement = function(){
      var _ref;
      return (_ref = this.value) === "break" || _ref === "continue" || _ref === "debugger";
    }, _ref.isAssignable = function(){
      return IDENTIFIER.test(this.value);
    }, _ref.isComplex = NO, _ref.assigns = function(it){
      return it === this.value;
    }, _ref.compile = function(){
      if (this.value.reserved) {
        return "\"" + this.value + "\"";
      } else {
        return this.value;
      }
    }, _ref.toString = function(){
      return ' "' + this.value + '"';
    };
    return Literal;
  }());
  exports.Return = Return = (function(){
    var _ref;
    __extends(Return, Base);
    function _ctor(){}
    _ctor.prototype = Return.prototype;
    function Return(_arg){
      var _this = new _ctor;
      _this.expression = _arg;
      return _this;
    }
    Return.name = "Return";
    _ref = Return.prototype, _ref.children = ['expression'], _ref.isStatement = YES, _ref.isPureStatement = YES, _ref.makeReturn = THIS, _ref.compile = function(o, level){
      var exp, _ref;
      exp = (_ref = this.expression) != null ? _ref.makeReturn() : void 0;
      if (exp && !(exp instanceof Return)) {
        return exp.compile(o, level);
      } else {
        exp = (exp != null ? exp.expression : void 0) || '';
        return o.indent + ("return" + (exp && ' ' + exp.compile(o, LEVEL_PAREN)) + ";");
      }
    };
    return Return;
  }());
  exports.Value = Value = (function(){
    var _ref;
    __extends(Value, Base);
    function _ctor(){}
    _ctor.prototype = Value.prototype;
    function Value(base, props, tag){
      var _this = new _ctor;
      if (!props && base instanceof Value) {
        return base;
      }
      _this.base = base;
      _this.properties = props || [];
      if (tag) {
        _this[tag] = true;
      }
      return _this;
    }
    Value.name = "Value";
    _ref = Value.prototype, _ref.children = ["base", "properties"], _ref.append = function(it){
      this.properties.push(it);
      return this;
    }, _ref.hasProperties = function(){
      return !!this.properties.length;
    }, _ref.assigns = function(it){
      return !this.properties.length && this.base.assigns(it);
    }, _ref.isStatement = function(it){
      return !this.properties.length && this.base.isStatement(it);
    }, _ref.isArray = function(){
      return !this.properties.length && this.base instanceof Arr;
    }, _ref.isObject = function(){
      return !this.properties.length && this.base instanceof Obj;
    }, _ref.isComplex = function(){
      return !!this.properties.length || this.base.isComplex();
    }, _ref.isAssignable = function(){
      return !!this.properties.length || this.base.isAssignable();
    }, _ref.makeReturn = function(){
      if (this.properties.length) {
        return Return(this);
      } else {
        return this.base.makeReturn();
      }
    }, _ref.unwrap = function(){
      if (this.properties.length) {
        return this;
      } else {
        return this.base;
      }
    }, _ref.cacheReference = function(o){
      var base, bref, name, nref, ref, _ref;
      name = (_ref = this.properties)[_ref.length - 1];
      if (this.properties.length < 2 && !this.base.isComplex() && !(name != null ? name.isComplex() : void 0)) {
        return [this, this];
      }
      base = Value(this.base, this.properties.slice(0, -1));
      if (base.isComplex()) {
        ref = Literal(o.scope.temporary('base'));
        base = Value(Parens(Assign(ref, base, '=')));
        bref = Value(ref);
        bref.temps = [ref.value];
      }
      if (!name) {
        return [base, bref];
      }
      if (name.isComplex()) {
        ref = Literal(o.scope.temporary('name'));
        name = Index(Assign(ref, name.index, '='));
        nref = Index(ref);
        nref.temps = [ref.value];
      }
      return [base.append(name), Value(bref || base.base, [nref || name])];
    }, _ref.compileNode = function(o){
      var asn, code, p, ps, v, _i, _len;
      if (asn = this.unfoldAssign(o)) {
        return asn.compile(o);
      }
      this.base.front = this.front;
      v = (this.properties.length && this.substituteStar(o)) || this;
      ps = v.properties;
      code = v.base.compile(o, ps.length ? LEVEL_ACCESS : null);
      if (ps[0] instanceof Accessor && SIMPLENUM.test(code)) {
        code += ' ';
      }
      for (_i = 0, _len = ps.length; _i < _len; ++_i) {
        p = ps[_i];
        code += p.compile(o);
      }
      return code;
    }, _ref.substituteStar = function(o){
      var find, i, prop, ref, star, sub, _len, _ref, _ref2;
      star = null;
      find = function(it){
        if (it instanceof Index) {
          return false;
        }
        if (it instanceof Literal && it.value === '*') {
          star = it;
          return false;
        }
      };
      for (i = 0, _len = (_ref = this.properties).length; i < _len; ++i) {
        prop = _ref[i];
        if (!(prop instanceof Index)) continue;
        prop.traverseChildren(false, find);
        if (!star) {
          continue;
        }
        _ref2 = Value(this.base, this.properties.slice(0, i)).cache(o), sub = _ref2[0], ref = _ref2[1];
        if (sub !== ref) {
          this.temps = [ref.value];
        }
        if (SIMPLENUM.test(ref = ref.compile(o))) {
          ref += ' ';
        }
        star.value = ref + '.length';
        return Value(sub, this.properties.slice(i));
      }
      return null;
    }, _ref.unfoldSoak = function(o){
      var fst, i, ifn, prop, ref, snd, _len, _ref;
      if (ifn = this.base.unfoldSoak(o)) {
        (_ref = ifn.then.properties).push.apply(_ref, this.properties);
        return ifn;
      }
      for (i = 0, _len = (_ref = this.properties).length; i < _len; ++i) {
        prop = _ref[i];
        if (!prop.soak) continue;
        prop.soak = false;
        fst = Value(this.base, this.properties.slice(0, i));
        snd = Value(this.base, this.properties.slice(i));
        if (fst.isComplex()) {
          ref = Literal(o.scope.temporary('ref'));
          fst = Parens(Assign(ref, fst, '='));
          snd.base = ref;
        }
        ifn = If(Existence(fst), snd, {
          soak: true
        });
        if (ref) {
          ifn.temps = [ref.value];
        }
        return ifn;
      }
      return null;
    }, _ref.unfoldAssign = function(o){
      var asn, i, lhs, prop, rhs, _len, _ref, _ref2;
      if (asn = this.base.unfoldAssign(o)) {
        (_ref = asn.right.properties).push.apply(_ref, this.properties);
        return asn;
      }
      for (i = 0, _len = (_ref = this.properties).length; i < _len; ++i) {
        prop = _ref[i];
        if (!prop.assign) continue;
        prop.assign = false;
        _ref2 = Value(this.base, this.properties.slice(0, i)).cacheReference(o), lhs = _ref2[0], rhs = _ref2[1];
        asn = Assign(lhs, Value(rhs, this.properties.slice(i)), '=');
        asn.access = true;
        return asn;
      }
      return null;
    };
    return Value;
  }());
  exports.Comment = Comment = (function(){
    var _ref;
    __extends(Comment, Base);
    function _ctor(){}
    _ctor.prototype = Comment.prototype;
    function Comment(_arg){
      var _this = new _ctor;
      _this.comment = _arg;
      return _this;
    }
    Comment.name = "Comment";
    _ref = Comment.prototype, _ref.isPureStatement = YES, _ref.isStatement = YES, _ref.makeReturn = THIS, _ref.compile = function(o, level){
      var code;
      code = '/*' + multident(this.comment, o.indent) + '*/';
      if (level != null ? level : o.level) {
        return code;
      } else {
        return o.indent + code;
      }
    };
    return Comment;
  }());
  exports.Call = Call = (function(){
    var _ref;
    __extends(Call, Base);
    function _ctor(){}
    _ctor.prototype = Call.prototype;
    function Call(_arg, _arg2, _arg3){
      var _this = new _ctor;
      _this.variable = _arg != null ? _arg : _this["super"] = Literal('this');
      _this.args = _arg2 != null ? _arg2 : [];
      _this.soak = _arg3;
      _this["new"] = '';
      return _this;
    }
    Call.name = "Call";
    _ref = Call.prototype, _ref.children = ["variable", "args"], _ref.newInstance = function(){
      this["new"] = 'new ';
      return this;
    }, _ref.superReference = function(o){
      var clas, method, name;
      method = (o.scope.shared || o.scope).method;
      if (!method) {
        throw SyntaxError('cannot call super outside of a function');
      }
      name = method.name, clas = method.clas;
      if (!name) {
        throw SyntaxError('cannot call super on an anonymous function');
      }
      if (clas) {
        return clas + '.superclass.prototype.' + name;
      } else {
        return name + '.superclass';
      }
    }, _ref.unfoldSoak = function(o){
      var call, ifn, left, rite, _i, _len, _ref;
      if (this.soak) {
        if (ifn = If.unfoldSoak(o, this, 'variable')) {
          return ifn;
        }
        _ref = Value(this.variable).cacheReference(o), left = _ref[0], rite = _ref[1];
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
          if (call.variable instanceof Call) {
            call.variable = ifn;
          } else {
            call.variable.base = ifn;
          }
        }
        ifn = If.unfoldSoak(o, call, 'variable');
      }
      return ifn;
    }, _ref.digCalls = function(){
      var call, list;
      call = this;
      list = [];
      while (true) {
        if (call.variable instanceof Call) {
          list.push(call);
          call = call.variable;
          continue;
        }
        if (!(call.variable instanceof Value)) {
          break;
        }
        list.push(call);
        if (!((call = call.variable.base) instanceof Call)) {
          break;
        }
      }
      return list.reverse();
    }, _ref.unfoldAssign = function(o){
      var asn, call, _i, _len, _ref;
      if (this["super"]) {
        return;
      }
      for (_i = 0, _len = (_ref = this.digCalls()).length; _i < _len; ++_i) {
        call = _ref[_i];
        if (asn) {
          if (call.variable instanceof Call) {
            call.variable = asn;
          } else {
            call.variable.base = asn;
          }
        }
        if (asn = call.variable.unfoldAssign(o)) {
          call.variable = asn.right;
          asn.right = Value(call);
        }
      }
      return asn;
    }, _ref.compileNode = function(o){
      var arg, args, asn, sup;
      if (!this["super"]) {
        if (asn = this.unfoldAssign(o)) {
          return asn.compile(o);
        }
        this.variable.front = this.front;
      }
      if (args = Splat.compileArray(o, this.args, true)) {
        return this.compileSplat(o, args);
      }
      args = (function(){
        var _i, _len, _ref, _results = [];
        for (_i = 0, _len = (_ref = this.args).length; _i < _len; ++_i) {
          arg = _ref[_i];
          _results.push(arg.compile(o, LEVEL_LIST));
        }
        return _results;
      }.call(this)).join(', ');
      if (this["super"]) {
        sup = this.superReference(o);
        if (this["new"]) {
          return "new " + sup + "(" + args + ")";
        } else {
          return "" + sup + ".call(" + this["super"].value + (args && ', ' + args) + ")";
        }
      } else {
        return this["new"] + this.variable.compile(o, LEVEL_ACCESS) + ("(" + args + ")");
      }
    }, _ref.compileSplat = function(o, args){
      var base, fun, idt, name, ref, sup;
      if (this["new"]) {
        idt = this.tab + TAB;
        sup = this["super"] ? this.superReference(o) : this.variable.compile(o, LEVEL_LIST);
        return "(function(func, args, ctor){\n" + idt + "ctor.prototype = func.prototype;\n" + idt + "var child = new ctor, result = func.apply(child, args);\n" + idt + "return result === Object(result) ? result : child;\n" + this.tab + "}(" + sup + ", " + args + ", function(){}))";
      }
      if (this["super"]) {
        return this.superReference(o) + (".apply(" + this["super"].value + ", " + args + ")");
      }
      base = Value(this.variable);
      if ((name = base.properties.pop()) && base.isComplex()) {
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
    __extends(Extends, Base);
    function _ctor(){}
    _ctor.prototype = Extends.prototype;
    function Extends(_arg, _arg2){
      var _this = new _ctor;
      _this.child = _arg;
      _this.parent = _arg2;
      return _this;
    }
    Extends.name = "Extends";
    _ref = Extends.prototype, _ref.children = ["child", "parent"], _ref.compile = function(o){
      return Call(Value(Literal(utility('extends'))), [this.child, this.parent]).compile(o);
    };
    return Extends;
  }());
  exports.Import = Import = (function(){
    var _ref;
    __extends(Import, Base);
    function _ctor(){}
    _ctor.prototype = Import.prototype;
    function Import(_arg, _arg2, own){
      var _this = new _ctor;
      _this.left = _arg;
      _this.right = _arg2;
      _this.util = own ? 'import' : 'importAll';
      return _this;
    }
    Import.name = "Import";
    _ref = Import.prototype, _ref.children = ["left", "right"], _ref.compileNode = function(o){
      var acc, code, com, key, lref, node, nodes, ref, sub, val, _i, _len, _ref;
      if (!(this.util === 'import' && this.right.isObject())) {
        return Call(Value(Literal(utility(this.util))), [this.left, this.right]).compile(o);
      }
      nodes = this.right.unwrap().properties;
      if (nodes.length > 1) {
        _ref = this.left.cache(o, LEVEL_LIST), sub = _ref[0], lref = _ref[1];
      } else {
        sub = lref = this.left.compile(o, LEVEL_LIST);
      }
      this.temps = [];
      code = '';
      for (_i = 0, _len = nodes.length; _i < _len; ++_i) {
        node = nodes[_i];
        code += com ? ' ' : ', ';
        if (com = node instanceof Comment) {
          code += node.compile(o, LEVEL_LIST);
          continue;
        }
        if (node instanceof Splat) {
          code += Import(Literal(lref), node.name, true).compile(o, LEVEL_TOP);
          continue;
        }
        if (node instanceof Assign) {
          val = node.right, acc = node.left.base;
          key = acc.compile(o, LEVEL_PAREN);
          if ((val instanceof Code || val instanceof Class) && IDENTIFIER.test(key)) {
            val.name = key;
          }
          val = val.compile(o, LEVEL_LIST);
        } else {
          if (node["this"]) {
            key = (acc = node.properties[0].name).value;
            val = node.compile(o, LEVEL_LIST);
          } else {
            _ref = (acc = node.unwrapAll()).cache(o, LEVEL_LIST, ref), key = _ref[0], val = _ref[1];
            if (key !== val) {
              this.temps.push(ref = val);
            }
          }
        }
        key = acc instanceof Literal && IDENTIFIER.test(key) ? '.' + key : '[' + key + ']';
        code += lref + key + ' = ' + val;
      }
      code = sub === lref ? code.slice(2) : sub + code;
      if (!o.level) {
        return code;
      }
      if (!(node instanceof Splat)) {
        code += (com ? ' ' : ', ') + lref;
      }
      if (o.level < LEVEL_LIST) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    return Import;
  }());
  exports.Accessor = Accessor = (function(){
    var _ref;
    __extends(Accessor, Base);
    function _ctor(){}
    _ctor.prototype = Accessor.prototype;
    function Accessor(_arg, symbol){
      var _this = new _ctor;
      _this.name = _arg;
      switch (symbol) {
      case '?.':
        _this.soak = true;
        break;
      case '.=':
        _this.assign = true;
      }
      return _this;
    }
    Accessor.name = "Accessor";
    _ref = Accessor.prototype, _ref.children = ['name'], _ref.compile = function(o){
      var name, _ref;
      if ((_ref = (name = this.name.compile(o)).charAt(0)) === "\"" || _ref === "\'") {
        return "[" + name + "]";
      } else {
        return "." + name;
      }
    }, _ref.isComplex = NO, _ref.toString = function(idt){
      return Accessor.superclass.prototype.toString.call(this, idt, this.constructor.name + (this.assign ? '=' : ''));
    };
    return Accessor;
  }());
  exports.Index = Index = (function(){
    var _ref;
    __extends(Index, Base);
    function _ctor(){}
    _ctor.prototype = Index.prototype;
    function Index(_arg, symbol){
      var _this = new _ctor;
      _this.index = _arg;
      switch (symbol) {
      case '?[':
        _this.soak = true;
        break;
      case '[=':
        _this.assign = true;
      }
      return _this;
    }
    Index.name = "Index";
    _ref = Index.prototype, _ref.children = ['index'], _ref.compile = function(o){
      return "[" + this.index.compile(o, LEVEL_PAREN) + "]";
    }, _ref.isComplex = function(){
      return this.index.isComplex();
    }, _ref.toString = Accessor.prototype.toString;
    return Index;
  }());
  exports.Obj = Obj = (function(){
    var _ref;
    __extends(Obj, Base);
    function _ctor(){}
    _ctor.prototype = Obj.prototype;
    function Obj(props){
      var _this = new _ctor;
      _this.objects = _this.properties = props || [];
      return _this;
    }
    Obj.name = "Obj";
    _ref = Obj.prototype, _ref.children = ['properties'], _ref.isObject = YES, _ref.assigns = function(name){
      var prop, _i, _len, _ref;
      for (_i = 0, _len = (_ref = this.properties).length; _i < _len; ++_i) {
        prop = _ref[_i];
        if (!prop.assigns(name)) continue;
        return true;
      }
      return false;
    }, _ref.compileNode = function(o){
      var code, i, idt, lastIndex, lastNC, prop, props, rest, _len;
      props = this.properties;
      if (!props.length) {
        if (this.front) {
          return '({})';
        } else {
          return '{}';
        }
      }
      for (i = 0, _len = props.length; i < _len; ++i) {
        prop = props[i];
        if (prop instanceof Splat || (prop.left || prop).base instanceof Parens) {
          rest = props.splice(i, 1 / 0);
          break;
        }
      }
      lastIndex = props.length - 1;
      lastNC = lastNonComment(props)[0];
      code = '';
      idt = o.indent += TAB;
      for (i = 0, _len = props.length; i < _len; ++i) {
        prop = props[i];
        if (!(prop instanceof Comment)) {
          code += idt;
        }
        code += prop instanceof Value && prop["this"] ? Assign(prop.properties[0].name, prop, ':').compile(o) : !(prop instanceof Assign || prop instanceof Comment) ? Assign(prop, prop, ':').compile(o) : prop.compile(o, LEVEL_TOP);
        code += i === lastIndex ? '' : prop === lastNC || prop instanceof Comment ? '\n' : ',\n';
      }
      code = "{" + (code && '\n' + code + '\n' + this.tab) + "}";
      if (rest) {
        return this.compileDynamic(o, code, rest);
      }
      if (this.front) {
        return "(" + code + ")";
      } else {
        return code;
      }
    }, _ref.compileDynamic = function(o, code, props){
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
    __extends(Arr, Base);
    function _ctor(){}
    _ctor.prototype = Arr.prototype;
    function Arr(_arg){
      var _this = new _ctor;
      _this.objects = _arg != null ? _arg : [];
      return _this;
    }
    Arr.name = "Arr";
    _ref = Arr.prototype, _ref.children = ['objects'], _ref.isArray = YES, _ref.assigns = function(name){
      var obj, _i, _len, _ref;
      for (_i = 0, _len = (_ref = this.objects).length; _i < _len; ++_i) {
        obj = _ref[_i];
        if (!obj.assigns(name)) continue;
        return true;
      }
      return false;
    }, _ref.compileNode = function(o){
      var code, obj;
      if (!this.objects.length) {
        return '[]';
      }
      o.indent += TAB;
      if (code = Splat.compileArray(o, this.objects)) {
        return code;
      }
      code = (function(){
        var _i, _len, _ref, _results = [];
        for (_i = 0, _len = (_ref = this.objects).length; _i < _len; ++_i) {
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
    __extends(Class, Base);
    function _ctor(){}
    _ctor.prototype = Class.prototype;
    function Class(_arg, _arg2, _arg3){
      var _this = new _ctor;
      _this.variable = _arg;
      _this.parent = _arg2;
      _this.body = _arg3 != null ? _arg3 : Expressions();
      return _this;
    }
    Class.name = "Class";
    _ref = Class.prototype, _ref.children = ["variable", "parent", "body"], _ref.compileNode = function(o){
      var clas, ctor, decl, exps, i, lname, name, node, proto, _len, _ref, _ref2;
      if (this.variable) {
        decl = this.variable instanceof Value ? (_ref = (_ref2 = this.variable.properties)[_ref2.length - 1].name) != null ? _ref.value : void 0 : this.variable.value;
        decl && (decl = IDENTIFIER.test(decl) && decl);
      }
      name = decl || this.name || '_Class';
      lname = Literal(name);
      proto = Value(lname, [Accessor(Literal('prototype'))]);
      this.body.traverseChildren(false, function(it){
        if (it.value === 'this') {
          return it.value = name;
        } else if (it instanceof Code) {
          it.clas = name;
          return it.bound && (it.bound = name);
        }
      });
      for (i = 0, _len = (_ref = exps = this.body.expressions).length; i < _len; ++i) {
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
        if (this.parent) {
          ctor.body.append(Call(null, [Splat(Literal('arguments'))]));
        }
      }
      ctor.ctor = ctor.statement = true;
      ctor.name = name;
      ctor.clas = null;
      if (this.parent) {
        exps.unshift(Extends(lname, this.parent));
      }
      exps.push(lname);
      clas = Parens(Call(Code([], this.body)), true);
      if (decl && ((_ref = this.variable) != null ? _ref.isComplex() : void 0)) {
        clas = Assign(lname, clas);
      }
      if (this.variable) {
        clas = Assign(this.variable, clas);
      }
      return clas.compile(o);
    };
    return Class;
  }());
  exports.Assign = Assign = (function(){
    var _ref;
    __extends(Assign, Base);
    function _ctor(){}
    _ctor.prototype = Assign.prototype;
    function Assign(_arg, _arg2, _arg3){
      var _this = new _ctor;
      _this.left = _arg;
      _this.right = _arg2;
      _this.op = _arg3 != null ? _arg3 : '=';
      return _this;
    }
    Assign.name = "Assign";
    _ref = Assign.prototype, _ref.children = ["left", "right"], _ref.assigns = function(name){
      return this[this.op === ':' ? 'right' : 'left'].assigns(name);
    }, _ref.unfoldSoak = function(o){
      return If.unfoldSoak(o, this, 'left');
    }, _ref.unfoldAssign = function(){
      return this.access && this;
    }, _ref.compileNode = function(o){
      var code, left, match, name, right, val, _ref;
      left = this.left, right = this.right;
      if (left.isArray() || left.isObject()) {
        return this.compileDestructuring(o);
      }
      if ((_ref = this.op) === "||=" || _ref === "&&=" || _ref === "?=") {
        return this.compileConditional(o);
      }
      name = left.compile(o, LEVEL_LIST);
      if ((right instanceof Code || right instanceof Class) && (match = METHOD_DEF.exec(name))) {
        if (match[1]) {
          right.clas = match[1];
        }
        right.name || (right.name = match[2]);
      }
      val = right.compile(o, LEVEL_LIST);
      if (this.op === ':') {
        return name + ': ' + val;
      }
      if (!left.isAssignable()) {
        throw SyntaxError("\"" + this.left.compile(o) + "\" cannot be assigned");
      }
      if (!(left instanceof Value && left.hasProperties())) {
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
    }, _ref.compileDestructuring = function(o){
      var acc, assigns, code, i, idx, isObject, ivar, obj, objects, olen, ref, rest, right, splat, top, val, vvar, _len, _ref;
      top = !o.level;
      right = this.right;
      objects = this.left.unwrap().objects;
      if (!(olen = objects.length)) {
        return right.compile(o);
      }
      isObject = this.left.isObject();
      if (top && olen === 1 && !((obj = objects[0]) instanceof Splat)) {
        if (obj instanceof Assign) {
          _ref = obj, obj = _ref.right, idx = _ref.left.base;
        } else {
          if (obj.base instanceof Parens) {
            _ref = Value(obj.unwrapAll()).cacheReference(o), obj = _ref[0], idx = _ref[1];
          } else {
            idx = isObject ? obj["this"] ? obj.properties[0].name : obj : Literal(0);
          }
        }
        acc = IDENTIFIER.test(idx.unwrap().value || 0);
        val = Value(right).append((acc ? Accessor : Index)(idx));
        return Assign(obj, val, this.op).compile(o);
      }
      vvar = right.compile(o, LEVEL_LIST);
      assigns = [];
      splat = false;
      if (!IDENTIFIER.test(vvar) || this.left.assigns(vvar)) {
        assigns.push("" + (ref = o.scope.temporary('ref')) + " = " + vvar);
        vvar = ref;
      }
      for (i = 0, _len = objects.length; i < _len; ++i) {
        obj = objects[i];
        idx = i;
        if (isObject) {
          if (obj instanceof Assign) {
            _ref = obj, obj = _ref.right, idx = _ref.left.base;
          } else {
            if (obj.base instanceof Parens) {
              _ref = Value(obj.unwrapAll()).cacheReference(o), obj = _ref[0], idx = _ref[1];
            } else {
              idx = obj["this"] ? obj.properties[0].name : obj;
            }
          }
        }
        if (!splat && obj instanceof Splat) {
          val = "" + olen + " <= " + vvar + ".length ? " + utility('slice') + ".call(" + vvar + ", " + i;
          if (rest = olen - i - 1) {
            ivar = o.scope.temporary('i');
            val += ", " + ivar + " = " + vvar + ".length - " + rest + ") : (" + ivar + " = " + i + ", [])";
          } else {
            val += ") : []";
          }
          val = Literal(val);
          splat = "" + ivar + "++";
        } else {
          if (obj instanceof Splat) {
            throw SyntaxError("multiple splats in an assignment: " + obj.compile(o));
          }
          acc = typeof idx === 'number' ? (idx = Literal(splat || idx), false) : isObject && IDENTIFIER.test(idx.unwrap().value || 0);
          val = Value(Literal(vvar), [(acc ? Accessor : Index)(idx)]);
        }
        assigns.push(Assign(obj, val, this.op).compile(o, LEVEL_TOP));
      }
      if (ref) {
        o.scope.free(ref);
      }
      if (!top) {
        assigns.push(vvar);
      }
      code = assigns.join(', ');
      if (o.level < LEVEL_LIST) {
        return code;
      } else {
        return "(" + code + ")";
      }
    }, _ref.compileConditional = function(o){
      var left, rite, _ref;
      _ref = Value(this.left).cacheReference(o), left = _ref[0], rite = _ref[1];
      return Op(this.op.slice(0, -1), left, Assign(rite, this.right, ':=')).compile(o);
    }, _ref.toString = function(idt){
      return Assign.superclass.prototype.toString.call(this, idt, this.constructor.name + ' ' + this.op);
    };
    return Assign;
  }());
  exports.Code = Code = (function(){
    var _ref;
    __extends(Code, Base);
    function _ctor(){}
    _ctor.prototype = Code.prototype;
    function Code(_arg, _arg2, tag){
      var _this = new _ctor;
      _this.params = _arg != null ? _arg : [];
      _this.body = _arg2 != null ? _arg2 : Expressions();
      if (tag === '=>') {
        _this.bound = 'this';
      }
      return _this;
    }
    Code.name = "Code";
    _ref = Code.prototype, _ref.children = ["params", "body"], _ref.isStatement = function(){
      return !!this.statement;
    }, _ref.makeReturn = function(){
      if (this.statement) {
        this.returns = true;
        return this;
      } else {
        return Return(this);
      }
    }, _ref.compileNode = function(o){
      var body, code, exps, i, name, p, param, params, pscope, ref, scope, splats, sscope, statement, tab, v, val, vars, wasEmpty, _i, _len, _ref;
      pscope = o.scope;
      sscope = pscope.shared || pscope;
      scope = o.scope = new Scope((this.wrapper ? pscope : sscope), this.body, this);
      if (this.wrapper) {
        scope.shared = sscope;
      }
      delete o.globals;
      o.indent += TAB;
      params = this.params, body = this.body, name = this.name, statement = this.statement, tab = this.tab;
      code = 'function';
      if (this.ctor && this.bound) {
        code += " _ctor(){}\n" + tab + "_ctor.prototype = " + name + ".prototype;\n" + tab + "function";
        scope.assign('_this', 'new _ctor');
        Base.prototype.traverseChildren.call(this, false, function(it){
          switch (false) {
          case it.value !== 'this':
            return it.value = '_this';
          case !(it instanceof Code):
            return it.bound && (it.bound = '_this');
          case !(it instanceof Return):
            return it.expression || (it.expression = Literal('_this'));
          }
        });
        body.append(Literal('return _this'));
      }
      vars = [];
      exps = [];
      for (_i = 0, _len = params.length; _i < _len; ++_i) {
        param = params[_i];
        if (!param.splat) continue;
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
      for (_i = 0, _len = params.length; _i < _len; ++_i) {
        param = params[_i];
        if (param.isComplex()) {
          val = ref = param.asReference(o);
          if (param.value) {
            val = Op('?', ref, param.value);
          }
          exps.push(Assign(param.name, val));
        } else {
          ref = param;
          if (param.value) {
            exps.push(Op('&&', Literal(ref.name.value + ' == null'), Assign(param.name, param.value)));
          }
        }
        if (!splats) {
          vars.push(ref);
        }
      }
      wasEmpty = body.isEmpty();
      if (splats) {
        exps.unshift(splats);
      }
      if (exps.length) {
        (_ref = body.expressions).unshift.apply(_ref, exps);
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
        if (o.expressions !== pscope.expressions) {
          throw SyntaxError('cannot declare a function under a statement');
        }
        if (!this.returns) {
          pscope.add(name, 'function');
        }
        code += ' ' + name;
      }
      code += '(' + vars.join(', ') + '){';
      if (!body.isEmpty()) {
        code += "\n" + body.compileWithDeclarations(o) + "\n" + tab;
      }
      code += '}';
      if (statement && name.charAt(0) !== '_') {
        code += "\n" + tab + name + ".name = \"" + name + "\";";
      }
      if (this.returns) {
        code += "\n" + tab + "return " + name + ";";
      }
      if (statement) {
        return tab + code;
      }
      if (this.bound) {
        return utility('bind') + ("(" + code + ", " + this.bound + ")");
      }
      if (this.front) {
        return "(" + code + ")";
      } else {
        return code;
      }
    }, _ref.traverseChildren = function(crossScope, func){
      if (crossScope) {
        return Code.superclass.prototype.traverseChildren.call(this, crossScope, func);
      }
    };
    return Code;
  }());
  exports.Param = Param = (function(){
    var _ref;
    __extends(Param, Base);
    function _ctor(){}
    _ctor.prototype = Param.prototype;
    function Param(_arg, _arg2, _arg3){
      var _this = new _ctor;
      _this.name = _arg;
      _this.value = _arg2;
      _this.splat = _arg3;
      return _this;
    }
    Param.name = "Param";
    _ref = Param.prototype, _ref.children = ["name", "value"], _ref.compile = function(o){
      return this.name.compile(o, LEVEL_LIST);
    }, _ref.asReference = function(o){
      var node;
      if (this.reference) {
        return this.reference;
      }
      node = this.isComplex() ? Literal(o.scope.temporary('arg')) : this.name;
      node = Value(node);
      if (this.splat) {
        node = Splat(node);
      }
      return this.reference = node;
    }, _ref.isComplex = function(){
      return this.name.isComplex();
    };
    return Param;
  }());
  exports.Splat = Splat = (function(){
    var _ref;
    __extends(Splat, Base);
    function _ctor(){}
    _ctor.prototype = Splat.prototype;
    function Splat(name){
      var _this = new _ctor;
      _this.name = name.compile ? name : Literal(name);
      return _this;
    }
    Splat.name = "Splat";
    _ref = Splat.prototype, _ref.children = ['name'], _ref.isAssignable = YES, _ref.assigns = function(it){
      return this.name.assigns(it);
    }, _ref.compile = function(){
      var _ref;
      return (_ref = this.name).compile.apply(_ref, arguments);
    };
    Splat.compileArray = function(o, list, apply){
      var args, base, code, i, index, node, _len;
      index = -1;
      while ((node = list[++index]) && !(node instanceof Splat)) {}
      if (index >= list.length) {
        return '';
      }
      if (list.length === 1) {
        code = list[0].compile(o, LEVEL_LIST);
        if (apply) {
          return code;
        }
        return utility('slice') + (".call(" + code + ")");
      }
      args = list.slice(index);
      for (i = 0, _len = args.length; i < _len; ++i) {
        node = args[i];
        code = node.compile(o, LEVEL_LIST);
        args[i] = node instanceof Splat ? utility('slice') + (".call(" + code + ")") : "[" + code + "]";
      }
      if (index === 0) {
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
    __extends(While, Base);
    function _ctor(){}
    _ctor.prototype = While.prototype;
    function While(_arg, _arg2){
      var name, _ref, _this = new _ctor;
      _this.condition = _arg;
      _ref = _arg2 != null ? _arg2 : {}, _this.guard = _ref.guard, name = _ref.name;
      if (name === 'until') {
        _this.condition = _this.condition.invert();
      }
      return _this;
    }
    While.name = "While";
    _ref = While.prototype, _ref.children = ["condition", "guard", "body"], _ref.isStatement = YES, _ref.containsPureStatement = function(){
      var expressions, i, ret, _ref;
      expressions = this.body.expressions;
      if (!(i = expressions.length)) {
        return false;
      }
      if ((_ref = expressions[--i]) != null ? _ref.containsPureStatement() : void 0) {
        return true;
      }
      ret = function(it){
        return it instanceof Return;
      };
      while (i) {
        if (!expressions[--i].contains(ret)) continue;
        return true;
      }
      return false;
    }, _ref.addBody = function(_arg){
      this.body = _arg;
      return this;
    }, _ref.makeReturn = function(){
      this.returns = true;
      return this;
    }, _ref.compileNode = function(o){
      var code;
      code = this.condition.compile(o, LEVEL_PAREN);
      code = this.tab + (code === 'true' ? 'for (;;' : "while (" + code);
      o.indent += TAB;
      return code + ') {' + this.compileBody(o);
    }, _ref.compileBody = function(o){
      var body, code, exps, i, node, res, ret, _ref;
      body = this.body;
      _ref = lastNonComment(exps = body.expressions), node = _ref[0], i = _ref[1];
      if ((node != null ? node.value : void 0) === 'continue') {
        exps.splice(i, 1);
        _ref = lastNonComment(exps), node = _ref[0], i = _ref[1];
      }
      ret = '';
      if (this.returns && !(node instanceof Return)) {
        if (node && !node.containsPureStatement() && !(node instanceof Throw)) {
          o.scope.assign('_results', '[]');
          exps[i] = Call(Literal('_results.push'), [node]);
          res = '_results';
        }
        ret = "\n" + this.tab + "return " + (res || '[]') + ";";
      }
      if (!exps.length) {
        return '}' + ret;
      }
      code = '\n';
      if (this.guard) {
        code += o.indent + ("if (" + this.guard.invert().compile(o, LEVEL_PAREN) + ") continue;\n");
      }
      return code + body.compile(o, LEVEL_TOP) + ("\n" + this.tab + "}") + ret;
    };
    return While;
  }());
  exports.Op = Op = (function(){
    var INVERSIONS, key, val, _ref;
    __extends(Op, Base);
    function _ctor(){}
    _ctor.prototype = Op.prototype;
    function Op(op, first, second, flip){
      var args, call, _this = new _ctor;
      if (op === 'of') {
        return Of(first, second);
      }
      if (op === 'do') {
        if (first instanceof Code && first.bound) {
          first.bound = '';
          first = Value(first, [Accessor(Literal('call'))]);
          args = [Literal('this')];
        }
        return Call(first, args);
      }
      if (op === 'new') {
        if ((call = first.base || first) instanceof Call) {
          call.newInstance();
          return first;
        }
        if (first instanceof Code && first.bound) {
          first = Parens(first, true);
        }
      }
      _this.op = op, _this.first = first, _this.second = second, _this.flip = flip;
      return _this;
    }
    Op.name = "Op";
    INVERSIONS = {
      '===': '!==',
      '==': '!=',
      '>': '<=',
      '<': '>='
    };
    for (key in INVERSIONS) {
      val = INVERSIONS[key];
      INVERSIONS[val] = key;
    }
    _ref = Op.prototype, _ref.children = ["first", "second"], _ref.isChainable = function(){
      return this.op in INVERSIONS;
    }, _ref.invert = function(){
      var fst, op, _ref;
      if (op = INVERSIONS[this.op]) {
        this.op = op;
        return this;
      } else if (this.second) {
        return Parens(this).invert();
      } else if (this.op === '!' && (fst = this.first.unwrap()) instanceof Op && ((_ref = fst.op) === "!" || _ref === "in" || _ref === "instanceof")) {
        return fst;
      } else {
        return Op('!', this);
      }
    }, _ref.unfoldSoak = function(o){
      var _ref;
      return ((_ref = this.op) === "++" || _ref === "--" || _ref === "delete") && If.unfoldSoak(o, this, 'first');
    }, _ref.compileNode = function(o){
      var code;
      if (!this.second) {
        return this.compileUnary(o);
      }
      if (this.isChainable() && this.first.isChainable()) {
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
    }, _ref.compileChain = function(o){
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
    }, _ref.compileExistence = function(o){
      var code, fst, ref, tmp;
      if (this.first.isComplex()) {
        ref = tmp = o.scope.temporary('ref');
        fst = Parens(Assign(Literal(ref), this.first, '='));
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
    }, _ref.compileUnary = function(o){
      var code, op, parts;
      parts = [op = this.op];
      if ((op === "new" || op === "typeof" || op === "delete" || op === "void") || (op === "+" || op === "-") && this.first.op === op) {
        parts.push(' ');
      }
      parts.push(this.first.compile(o, LEVEL_OP));
      if (this.flip) {
        parts.reverse();
      }
      code = parts.join('');
      if (o.level <= LEVEL_OP) {
        return code;
      } else {
        return "(" + code + ")";
      }
    }, _ref.compileMultiIO = function(o){
      var code, i, item, ref, sub, tests, _ref;
      _ref = this.first.cache(o, LEVEL_OP), sub = _ref[0], ref = _ref[1];
      tests = (function(){
        var _len, _ref, _results = [];
        for (i = 0, _len = (_ref = this.second.base.objects).length; i < _len; ++i) {
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
    }, _ref.toString = Assign.prototype.toString;
    return Op;
  }());
  exports.Of = Of = (function(){
    var _ref;
    __extends(Of, Base);
    function _ctor(){}
    _ctor.prototype = Of.prototype;
    function Of(_arg, _arg2){
      var _this = new _ctor;
      _this.object = _arg;
      _this.array = _arg2;
      return _this;
    }
    Of.name = "Of";
    _ref = Of.prototype, _ref.children = ["object", "array"], _ref.invert = NEGATE, _ref.compileNode = function(o){
      if (this.array.isArray()) {
        return this.compileOrTest(o);
      } else {
        return this.compileLoopTest(o);
      }
    }, _ref.compileOrTest = function(o){
      var cmp, cnj, code, i, item, ref, sub, tests, _ref;
      _ref = this.object.cache(o, LEVEL_OP), sub = _ref[0], ref = _ref[1];
      _ref = this.negated ? [' !== ', ' && '] : [' === ', ' || '], cmp = _ref[0], cnj = _ref[1];
      tests = (function(){
        var _len, _ref, _results = [];
        for (i = 0, _len = (_ref = this.array.base.objects).length; i < _len; ++i) {
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
    }, _ref.compileLoopTest = function(o){
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
    }, _ref.toString = function(idt){
      return Of.superclass.prototype.toString.call(this, idt, this.constructor.name + (this.negated ? '!' : ''));
    };
    return Of;
  }());
  exports.Try = Try = (function(){
    var _ref;
    __extends(Try, Base);
    function _ctor(){}
    _ctor.prototype = Try.prototype;
    function Try(_arg, _arg2, _arg3, _arg4){
      var _this = new _ctor;
      _this.attempt = _arg;
      _this.thrown = _arg2;
      _this.recovery = _arg3;
      _this.ensure = _arg4;
      return _this;
    }
    Try.name = "Try";
    _ref = Try.prototype, _ref.children = ["attempt", "recovery", "ensure"], _ref.isStatement = YES, _ref.makeReturn = function(){
      this.attempt && (this.attempt = this.attempt.makeReturn());
      this.recovery && (this.recovery = this.recovery.makeReturn());
      return this;
    }, _ref.compileNode = function(o){
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
  exports.Throw = Throw = (function(){
    var _ref;
    __extends(Throw, Base);
    function _ctor(){}
    _ctor.prototype = Throw.prototype;
    function Throw(_arg){
      var _this = new _ctor;
      _this.expression = _arg;
      return _this;
    }
    Throw.name = "Throw";
    _ref = Throw.prototype, _ref.children = ['expression'], _ref.isStatement = YES, _ref.makeReturn = THIS, _ref.compile = function(o){
      return o.indent + ("throw " + this.expression.compile(o, LEVEL_PAREN) + ";");
    };
    return Throw;
  }());
  exports.Existence = Existence = (function(){
    var _ref;
    __extends(Existence, Base);
    function _ctor(){}
    _ctor.prototype = Existence.prototype;
    function Existence(_arg){
      var _this = new _ctor;
      _this.expression = _arg;
      return _this;
    }
    Existence.name = "Existence";
    _ref = Existence.prototype, _ref.children = ['expression'], _ref.invert = NEGATE, _ref.compileNode = function(o){
      var code;
      code = this.expression.compile(o, LEVEL_OP);
      if (IDENTIFIER.test(code) && !o.scope.check(code, true)) {
        code = 'typeof ' + code + (this.negated ? " == \"undefined\" || " + code + " === null" : " != \"undefined\" && " + code + " !== null");
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
    __extends(Parens, Base);
    function _ctor(){}
    _ctor.prototype = Parens.prototype;
    function Parens(_arg, _arg2){
      var _this = new _ctor;
      _this.expression = _arg;
      _this.keep = _arg2;
      return _this;
    }
    Parens.name = "Parens";
    _ref = Parens.prototype, _ref.children = ['expression'], _ref.unwrap = function(){
      return this.expression;
    }, _ref.isComplex = function(){
      return this.expression.isComplex();
    }, _ref.makeReturn = function(){
      return this.expression.makeReturn();
    }, _ref.compileNode = function(o){
      var code, expr;
      expr = (this.expression.front = this.front, this.expression);
      if (!this.keep && ((expr instanceof Value || expr instanceof Call || expr instanceof Code || expr instanceof Parens) || o.level < LEVEL_OP && expr instanceof Op)) {
        return expr.compile(o);
      }
      code = expr.compile(o, LEVEL_PAREN);
      if (expr.isStatement()) {
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
    function _ctor(){}
    _ctor.prototype = For.prototype;
    function For(head, _arg){
      var _this = new _ctor;
      _this.body = _arg;
      __importAll(_this, head);
      if (_this.index instanceof Base && !(_this.index = _this.index.unwrap().value)) {
        throw SyntaxError('invalid index variable: ' + head.index);
      }
      return _this;
    }
    For.name = "For";
    _ref = For.prototype, _ref.children = ["source", "name", "from", "to", "step", "guard", "body"], _ref.compileNode = function(o){
      var body, cond, eq, forPart, head, idx, item, lvar, ownPart, pvar, scope, srcPart, step, svar, tail, tvar, vars, _ref;
      scope = o.scope;
      this.temps = [];
      if (idx = this.index) {
        scope.declare(idx);
      } else {
        this.temps.push(idx = scope.temporary('i'));
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
        cond = +pvar ? "" + idx + " " + (pvar < 0 ? '>' : '<') + eq + " " + tvar : "" + pvar + " < 0 ? " + idx + " >" + eq + " " + tvar + " : " + idx + " <" + eq + " " + tvar;
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
            this.temps.push(lvar = scope.temporary('len'));
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
            return idx + (pvar < 0 ? ' -= ' + pvar.slice(1) : ' += ' + pvar);
          }
        }());
      }
      head = this.pluckDirectCalls(o, this.body.expressions, this.name, idx);
      head += this.tab + ("for (" + forPart + ") " + (ownPart || '') + "{");
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
    }, _ref.pluckDirectCalls = function(o, exps, name, index){
      var args, base, defs, exp, fn, idx, li, ref, val, _len, _ref;
      defs = '';
      for (idx = 0, _len = exps.length; idx < _len; ++idx) {
        exp = exps[idx];
        if (!((exp = exp.unwrapAll()) instanceof Call)) continue;
        val = exp.variable.unwrapAll();
        if (!(val instanceof Code && !exp.args.length || val instanceof Value && val.base instanceof Code && val.properties.length === 1 && ((_ref = val.properties[0].name) != null ? _ref.value : void 0) === 'call')) {
          continue;
        }
        this.temps.push(ref = o.scope.temporary('fn'));
        fn = val.base || val;
        base = Value(ref = Literal(ref));
        args = [];
        if (val.base) {
          args.push(exp.args[0]);
          _ref = [base, val], val.base = _ref[0], base = _ref[1];
        }
        if (index) {
          args.push(li = Literal(index));
          fn.params.push(Param(li));
        }
        if (name) {
          if (!this.nref) {
            this.temps.push(this.nref = o.scope.temporary('ref'));
          }
          args.push(Literal(this.nref));
          fn.params.push(Param(name));
        }
        exps[idx] = Call(base, args);
        defs += this.tab + Assign(ref, fn, '=').compile(o, LEVEL_TOP) + ';\n';
      }
      return defs;
    };
    return For;
  }());
  exports.Switch = Switch = (function(){
    var _ref;
    __extends(Switch, Base);
    function _ctor(){}
    _ctor.prototype = Switch.prototype;
    function Switch(_arg, _arg2, _arg3){
      var i, tests, _i, _len, _ref, _this = new _ctor;
      _this["switch"] = _arg;
      _this.cases = _arg2;
      _this["default"] = _arg3;
      if (_this["switch"]) {
        return _this;
      }
      for (_i = 0, _len = (_ref = _this.cases).length; _i < _len; ++_i) {
        tests = _ref[_i].tests;
        for (i in tests) if (__owns.call(tests, i)) {
          tests[i] = tests[i].invert();
        }
      }
      return _this;
    }
    Switch.name = "Switch";
    _ref = Switch.prototype, _ref.children = ["switch", "cases", "default"], _ref.isStatement = YES, _ref.makeReturn = function(){
      var cs, _i, _len, _ref;
      for (_i = 0, _len = (_ref = this.cases).length; _i < _len; ++_i) {
        cs = _ref[_i];
        cs.body.makeReturn();
      }
      if ((_ref = this["default"]) != null) {
        _ref.makeReturn();
      }
      return this;
    }, _ref.compileNode = function(o){
      var code, cs, def, i, lnc, stop, tab, _len, _ref, _ref2;
      tab = this.tab;
      o.indent += TAB;
      code = tab + ("switch (" + (((_ref = this["switch"]) != null ? _ref.compile(o, LEVEL_PAREN) : void 0) || false) + ") {\n");
      stop = this["default"] || this.cases.length - 1;
      for (i = 0, _len = (_ref = this.cases).length; i < _len; ++i) {
        cs = _ref[i];
        code += cs.compile(o, tab);
        if (i === stop) {
          break;
        }
        lnc = lastNonComment(cs.body.expressions)[0];
        if (!((lnc instanceof Return || lnc instanceof Throw) || ((_ref2 = lnc.value) === "continue" || _ref2 === "break"))) {
          code += o.indent + 'break;\n';
        }
      }
      if (this["default"]) {
        def = this["default"].compile(o, LEVEL_TOP);
        code += tab + ("default:" + (def && '\n' + def) + "\n");
      }
      return code + tab + '}';
    };
    return Switch;
  }());
  exports.Case = Case = (function(){
    var _ref;
    __extends(Case, Base);
    function _ctor(){}
    _ctor.prototype = Case.prototype;
    function Case(_arg, _arg2){
      var _this = new _ctor;
      _this.tests = _arg;
      _this.body = _arg2;
      return _this;
    }
    Case.name = "Case";
    _ref = Case.prototype, _ref.children = ["tests", "body"], _ref.compile = function(o, tab){
      var add, body, c, code, test, _i, _j, _len, _len2, _ref, _ref2;
      code = '';
      add = function(it){
        return code += tab + ("case " + it.compile(o, LEVEL_PAREN) + ":\n");
      };
      for (_i = 0, _len = (_ref = this.tests).length; _i < _len; ++_i) {
        test = _ref[_i];
        if ((test = test.unwrap()) instanceof Arr) {
          for (_j = 0, _len2 = (_ref2 = test.objects).length; _j < _len2; ++_j) {
            c = _ref2[_j];
            add(c);
          }
        } else {
          add(test);
        }
      }
      if (body = this.body.compile(o, LEVEL_TOP)) {
        code += body + '\n';
      }
      return code;
    };
    return Case;
  }());
  exports.If = If = (function(){
    var _ref;
    __extends(If, Base);
    function _ctor(){}
    _ctor.prototype = If.prototype;
    function If(_arg, _arg2, _arg3){
      var name, _ref, _this = new _ctor;
      _this["if"] = _arg;
      _this.then = _arg2;
      _ref = _arg3 != null ? _arg3 : {}, _this.statement = _ref.statement, _this.soak = _ref.soak, name = _ref.name;
      if (name === 'unless') {
        _this["if"] = _this["if"].invert();
      }
      return _this;
    }
    If.name = "If";
    _ref = If.prototype, _ref.children = ["if", "then", "else"], _ref.addElse = function(it){
      if (this.chain) {
        this["else"].addElse(it);
      } else {
        this.chain = it instanceof If;
        this["else"] = it;
      }
      return this;
    }, _ref.isStatement = function(o){
      var _ref;
      return this.statement || (o != null ? o.level : void 0) === LEVEL_TOP || this.then.isStatement(o) || ((_ref = this["else"]) != null ? _ref.isStatement(o) : void 0);
    }, _ref.makeReturn = function(){
      this.then = this.then.makeReturn();
      if (this["else"]) {
        this["else"] = this["else"].makeReturn();
      }
      return this;
    }, _ref.compileNode = function(o){
      if (this.isStatement(o)) {
        return this.compileStatement(o);
      } else {
        return this.compileExpression(o);
      }
    }, _ref.compileStatement = function(o){
      var body, code;
      code = del(o, 'chainChild') ? '' : this.tab;
      code += "if (" + this["if"].compile(o, LEVEL_PAREN) + ") {";
      o.indent += TAB;
      body = Expressions(this.then).compile(o);
      code += (body && ("\n" + body + "\n" + this.tab)) + '}';
      if (!this["else"]) {
        return code;
      }
      return code + ' else ' + (this.chain ? this["else"].compile((o.indent = this.tab, o.chainChild = true, o), LEVEL_TOP) : (body = this["else"].compile(o, LEVEL_TOP)) ? "{\n" + body + "\n" + this.tab + "}" : '{}');
    }, _ref.compileExpression = function(o){
      var code, _ref;
      code = this["if"].compile(o, LEVEL_COND) + ' ? ' + this.then.compile(o, LEVEL_LIST) + ' : ' + (((_ref = this["else"]) != null ? _ref.compile(o, LEVEL_LIST) : void 0) || 'void 0');
      if (o.level < LEVEL_COND) {
        return code;
      } else {
        return "(" + code + ")";
      }
    }, _ref.unfoldSoak = function(){
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
  exports.mix = __importAll;
  function YES(){
    return true;
  }
  YES.name = "YES";
  function NO(){
    return false;
  }
  NO.name = "NO";
  function THIS(){
    return this;
  }
  THIS.name = "THIS";
  function NEGATE(){
    this.negated ^= 1;
    return this;
  }
  NEGATE.name = "NEGATE";
  UTILITIES = {
    "extends": 'function(child, parent){\n  function ctor(){ this.constructor = child; }\n  ctor.prototype = parent.prototype;\n  child.prototype = new ctor;\n  child.superclass = parent;\n  return child;\n}',
    bind: 'function(fn, me){ return function(){ return fn.apply(me, arguments); }; }',
    indexOf: 'Array.prototype.indexOf || function(item){\n  for (var i = 0, l = this.length; i < l; ++i) if (this[i] === item) return i;\n  return -1;\n}',
    "import": 'function(obj, src){\n  var own = Object.prototype.hasOwnProperty;\n  for (var key in src) if (own.call(src, key)) obj[key] = src[key];\n  return obj;\n}',
    importAll: 'function(obj, src){\n  for (var key in src) obj[key] = src[key];\n  return obj;\n}',
    owns: 'Object.prototype.hasOwnProperty',
    slice: 'Array.prototype.slice'
  };
  LEVEL_TOP = 0;
  LEVEL_PAREN = 1;
  LEVEL_LIST = 2;
  LEVEL_COND = 3;
  LEVEL_OP = 4;
  LEVEL_ACCESS = 5;
  TAB = '  ';
  TRAILING_WHITESPACE = /[ \t]+$/gm;
  IDENTIFIER = /^[$A-Za-z_][$\w]*$/;
  NUMBER = /^-?(?:0x[\da-f]+|(?:\d+(\.\d+)?|\.\d+)(?:e[+-]?\d+)?)$/i;
  SIMPLENUM = /^\d+$/;
  METHOD_DEF = /^(?:(\S+)\.prototype\.|\S*?)\b([$A-Za-z_][$\w]*)$/;
  utility = function(name){
    var ref;
    Scope.root.assign(ref = '__' + name, UTILITIES[name]);
    return ref;
  };
  del = function(obj, key){
    var val;
    val = obj[key];
    delete obj[key];
    return val;
  };
  multident = function(code, tab){
    return code.replace(/\n/g, '$&' + tab);
  };
  lastNonComment = function(nodes){
    var i, node;
    for (i = nodes.length - 1; i >= 0; --i) {
      node = nodes[i];
      if (node instanceof Comment) continue;
      break;
    }
    return [i >= 0 && node, i];
  };
}).call(this);
