(function(){
  var Accessor, Arr, Assign, Base, Call, Class, Closure, Code, Comment, Existence, Expressions, Extends, For, IDENTIFIER, If, Import, In, Index, LEVEL_ACCESS, LEVEL_COND, LEVEL_LIST, LEVEL_OP, LEVEL_PAREN, LEVEL_TOP, Literal, METHOD_DEF, NO, NUMBER, Obj, Op, Param, Parens, Push, Return, SIMPLENUM, Scope, Splat, Switch, TAB, THIS, TRAILING_WHITESPACE, Throw, Try, UTILITIES, Value, While, YES, del, flatten, last, multident, utility, _ref, __importAll = function(obj, src){
    for (var key in src) obj[key] = src[key];
    return obj;
  }, __extends = function(child, parent){
    function ctor(){ this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    if (typeof parent.extended == "function") parent.extended(child);
    child.__super__ = parent.prototype;
  }, __slice = Array.prototype.slice, __import = function(obj, src){
    var own = Object.prototype.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
  };
  Scope = require('./scope').Scope;
  _ref = require('./helpers'), flatten = _ref.flatten, del = _ref.del, last = _ref.last;
  exports.extend = function(left, rite){
    return __importAll(left, rite);
  };
  YES = function(){
    return true;
  };
  NO = function(){
    return false;
  };
  THIS = function(){
    return this;
  };
  exports.Base = (function(){
    Base = (function(){
      function Base(){
        return this;
      }
      return Base;
    })();
    Base.prototype.compile = function(o, level){
      var node;
      o = o ? __importAll({}, o) : {};
      if (level != null) {
        o.level = level;
      }
      node = this.unfoldSoak(o) || this;
      node.tab = o.indent;
      return o.level === LEVEL_TOP || node.isPureStatement() || !node.isStatement(o) ? node.compileNode(o) : node.compileClosure(o);
    };
    Base.prototype.compileClosure = function(o){
      if (this.containsPureStatement()) {
        throw SyntaxError('cannot include a pure statement in an expression.');
      }
      o.sharedScope = o.scope;
      return Closure.wrap(this).compileNode(o);
    };
    Base.prototype.cache = function(o, level, reused){
      var ref, sub;
      if (!this.isComplex()) {
        ref = level ? this.compile(o, level) : this;
        return [ref, ref];
      } else {
        ref = new Literal(reused || o.scope.freeVariable('ref'));
        sub = new Assign(ref, this, '=');
        return level ? [sub.compile(o, level), ref.value] : [sub, ref];
      }
    };
    Base.prototype.compileLoopReference = function(o, name){
      var src, tmp;
      src = tmp = this.compile(o, LEVEL_LIST);
      if (!(NUMBER.test(src) || IDENTIFIER.test(src) && o.scope.check(src, true))) {
        src = "" + (tmp = o.scope.freeVariable(name)) + " = " + src;
      }
      return [src, tmp];
    };
    Base.prototype.idt = function(tabs){
      return (this.tab || '') + Array((tabs || 0) + 1).join(TAB);
    };
    Base.prototype.makeReturn = function(){
      return new Return(this);
    };
    Base.prototype.contains = function(pred){
      var contains;
      contains = false;
      this.traverseChildren(false, function(it){
        if (pred(it)) {
          contains = true;
          return false;
        }
      });
      return contains;
    };
    Base.prototype.containsType = function(type){
      return this instanceof type || this.contains(function(it){
        return it instanceof type;
      });
    };
    Base.prototype.containsPureStatement = function(){
      return this.isPureStatement() || this.contains(function(it){
        return it.isPureStatement();
      });
    };
    Base.prototype.toString = function(idt, override){
      var child, children, name, _i, _len, _ref, _result;
      idt == null && (idt = '');
      children = (function(){
        _ref = this.collectChildren();
        _result = [];
        for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
          child = _ref[_i];
          _result.push(child.toString(idt + TAB));
        }
        return _result;
      }.call(this));
      name = override || this.constructor.name;
      if (this.soak) {
        name += '?';
      }
      return '\n' + idt + name + children.join('');
    };
    Base.prototype.eachChild = function(func){
      var attr, child, _i, _j, _len, _len2, _ref, _ref2;
      if (!this.children) {
        return this;
      }
      _ref = this.children;
      for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
        attr = _ref[_i];
        if (this[attr]) {
          _ref2 = flatten([this[attr]]);
          for (_j = 0, _len2 = _ref2.length; _j < _len2; ++_j) {
            child = _ref2[_j];
            if (func(child) === false) {
              return this;
            }
          }
        }
      }
      return this;
    };
    Base.prototype.collectChildren = function(){
      var nodes;
      nodes = [];
      this.eachChild(function(it){
        return nodes.push(it);
      });
      return nodes;
    };
    Base.prototype.traverseChildren = function(crossScope, func){
      return this.eachChild(function(child){
        if (false === func(child)) {
          return false;
        }
        return child.traverseChildren(crossScope, func);
      });
    };
    Base.prototype.invert = function(){
      return new Op('!', this);
    };
    Base.prototype.unwrapAll = function(){
      var node;
      node = this;
      while (node !== (node = node.unwrap())) {
        continue;
      }
      return node;
    };
    Base.prototype.children = [];
    Base.prototype.isStatement = NO;
    Base.prototype.isPureStatement = NO;
    Base.prototype.isComplex = YES;
    Base.prototype.isChainable = NO;
    Base.prototype.isAssignable = NO;
    Base.prototype.unwrap = THIS;
    Base.prototype.unfoldSoak = NO;
    Base.prototype.unfoldAssign = NO;
    Base.prototype.assigns = NO;
    return Base;
  }());
  exports.Expressions = (function(){
    Expressions = (function(){
      function Expressions(nodes){
        this.expressions = nodes ? flatten(nodes) : [];
        return this;
      }
      return Expressions;
    })();
    __extends(Expressions, Base);
    Expressions.prototype.children = ['expressions'];
    Expressions.prototype.isStatement = YES;
    Expressions.prototype.append = function(it){
      this.expressions.push(it);
      return this;
    };
    Expressions.prototype.prepend = function(it){
      this.expressions.unshift(it);
      return this;
    };
    Expressions.prototype.pop = function(){
      return this.expressions.pop();
    };
    Expressions.prototype.unwrap = function(){
      return this.expressions.length === 1 ? this.expressions[0] : this;
    };
    Expressions.prototype.isEmpty = function(){
      return !this.expressions.length;
    };
    Expressions.prototype.makeReturn = function(){
      var end, idx, _ref;
      _ref = this.expressions;
      for (idx = _ref.length - 1; idx >= 0; --idx) {
        end = _ref[idx];
        if (!(end instanceof Comment)) {
          this.expressions[idx] = end.makeReturn();
          break;
        }
      }
      return this;
    };
    Expressions.prototype.compile = function(o, level){
      o == null && (o = {});
      return o.scope ? Expressions.__super__.compile.call(this, o, level) : this.compileRoot(o);
    };
    Expressions.prototype.compileNode = function(o){
      var node, _i, _len, _ref, _result;
      this.tab = o.indent;
      return (function(){
        _ref = this.expressions;
        _result = [];
        for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
          node = _ref[_i];
          _result.push(this.compileExpression(node, o));
        }
        return _result;
      }.call(this)).join('\n');
    };
    Expressions.prototype.compileRoot = function(o){
      var code;
      o.indent = this.tab = o.bare ? '' : TAB;
      o.scope = new Scope(null, this, null);
      o.level = LEVEL_TOP;
      code = this.compileWithDeclarations(o);
      code = code.replace(TRAILING_WHITESPACE, '');
      return o.bare ? code : "(function(){\n" + code + "\n}).call(this);\n";
    };
    Expressions.prototype.compileWithDeclarations = function(o){
      var code, scope, vars;
      vars = '';
      code = this.compileNode(o);
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
    Expressions.prototype.compileExpression = function(node, o){
      var code;
      node = node.unwrapAll();
      node = node.unfoldSoak(o) || node;
      node.front = true;
      o.level = LEVEL_TOP;
      code = node.compile(o);
      return node.isStatement(o) ? code : this.tab + code + ';';
    };
    Expressions.wrap = function(nodes){
      if (nodes.length === 1 && nodes[0] instanceof Expressions) {
        return nodes[0];
      }
      return new Expressions(nodes);
    };
    return Expressions;
  }.call(this));
  exports.Literal = (function(){
    Literal = (function(){
      function Literal(_arg){
        this.value = _arg;
        return this;
      }
      return Literal;
    })();
    __extends(Literal, Base);
    Literal.prototype.makeReturn = function(){
      return this.isStatement() ? this : Literal.__super__.makeReturn.call(this);
    };
    Literal.prototype.isPureStatement = function(){
      var _ref;
      return (_ref = this.value) === 'break' || _ref === 'continue' || _ref === 'debugger';
    };
    Literal.prototype.isAssignable = function(){
      return IDENTIFIER.test(this.value);
    };
    Literal.prototype.isComplex = NO;
    Literal.prototype.assigns = function(it){
      return it === this.value;
    };
    Literal.prototype.compile = function(){
      return this.value.reserved ? "\"" + this.value + "\"" : this.value;
    };
    Literal.prototype.toString = function(){
      return ' "' + this.value + '"';
    };
    return Literal;
  }());
  exports.Return = (function(){
    Return = (function(){
      function Return(_arg){
        this.expression = _arg;
        return this;
      }
      return Return;
    })();
    __extends(Return, Base);
    Return.prototype.children = ['expression'];
    Return.prototype.isStatement = YES;
    Return.prototype.isPureStatement = YES;
    Return.prototype.makeReturn = THIS;
    Return.prototype.compile = function(o, level){
      var expr, _ref;
      expr = (_ref = this.expression) != null ? _ref.makeReturn() : void 0;
      return expr && !(expr instanceof Return) ? expr.compile(o, level) : Return.__super__.compile.call(this, o, level);
    };
    Return.prototype.compileNode = function(o){
      o.level = LEVEL_PAREN;
      return this.tab + ("return" + (this.expression ? ' ' + this.expression.compile(o) : '') + ";");
    };
    return Return;
  }());
  exports.Value = (function(){
    Value = (function(){
      function Value(base, props, tag){
        if (!props && base instanceof Value) {
          return base;
        }
        this.base = base;
        this.properties = props || [];
        if (tag) {
          this[tag] = true;
        }
        return this;
      }
      return Value;
    })();
    __extends(Value, Base);
    Value.prototype.children = ["base", "properties"];
    Value.prototype.append = function(it){
      this.properties.push(it);
      return this;
    };
    Value.prototype.hasProperties = function(){
      return !!this.properties.length;
    };
    Value.prototype.isArray = function(){
      return !this.properties.length && this.base instanceof Arr;
    };
    Value.prototype.isObject = function(){
      return !this.properties.length && this.base instanceof Obj;
    };
    Value.prototype.isComplex = function(){
      return this.hasProperties() || this.base.isComplex();
    };
    Value.prototype.isAssignable = function(){
      return this.hasProperties() || this.base.isAssignable();
    };
    Value.prototype.isSimpleNumber = function(){
      return this.base instanceof Literal && SIMPLENUM.test(this.base.value);
    };
    Value.prototype.isAtomic = function(){
      var node, _i, _len, _ref;
      _ref = this.properties.concat(this.base);
      for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
        node = _ref[_i];
        if (node.soak) {
          return false;
        }
      }
      return true;
    };
    Value.prototype.isStatement = function(o){
      return !this.properties.length && this.base.isStatement(o);
    };
    Value.prototype.assigns = function(name){
      return !this.properties.length && this.base.assigns(name);
    };
    Value.prototype.makeReturn = function(){
      return this.properties.length ? Value.__super__.makeReturn.call(this) : this.base.makeReturn();
    };
    Value.prototype.unwrap = function(){
      return this.properties.length ? this : this.base;
    };
    Value.prototype.cacheReference = function(o){
      var base, bref, name, nref;
      name = last(this.properties);
      if (this.properties.length < 2 && !this.base.isComplex() && !(name != null ? name.isComplex() : void 0)) {
        return [this, this];
      }
      base = new Value(this.base, this.properties.slice(0, -1));
      if (base.isComplex()) {
        bref = new Literal(o.scope.freeVariable('base'));
        base = new Value(new Parens(new Assign(bref, base, '=')));
      }
      if (!name) {
        return [base, bref];
      }
      if (name.isComplex()) {
        nref = new Literal(o.scope.freeVariable('name'));
        name = new Index(new Assign(nref, name.index, '='));
        nref = new Index(nref);
      }
      return [base.append(name), new Value(bref || base.base, [nref || name])];
    };
    Value.prototype.compileNode = function(o){
      var asn, code, prop, props, _i, _len;
      if (asn = this.unfoldAssign(o)) {
        return asn.compile(o);
      }
      this.base.front = this.front;
      props = this.properties;
      code = this.base.compile(o, props.length ? LEVEL_ACCESS : null);
      if (props[0] instanceof Accessor && this.isSimpleNumber()) {
        code = "(" + code + ")";
      }
      for (_i = 0, _len = props.length; _i < _len; ++_i) {
        prop = props[_i];
        code += prop.compile(o);
      }
      return code;
    };
    Value.prototype.unfoldSoak = function(o){
      var fst, i, ifn, prop, ref, snd, _len, _ref, _this;
      if (ifn = this.base.unfoldSoak(o)) {
        (_this = ifn.body.properties).push.apply(_this, this.properties);
        return ifn;
      }
      _ref = this.properties;
      for (i = 0, _len = _ref.length; i < _len; ++i) {
        prop = _ref[i];
        if (prop.soak) {
          prop.soak = false;
          fst = new Value(this.base, this.properties.slice(0, i));
          snd = new Value(this.base, this.properties.slice(i));
          if (fst.isComplex()) {
            ref = new Literal(o.scope.freeVariable('ref'));
            fst = new Parens(new Assign(ref, fst, '='));
            snd.base = ref;
          }
          return new If(new Existence(fst), snd, {
            soak: true
          });
        }
      }
      return null;
    };
    Value.prototype.unfoldAssign = function(o){
      var asn, i, lhs, prop, rhs, _len, _ref, _ref2, _this;
      if (asn = this.base.unfoldAssign(o)) {
        (_this = asn.value.properties).push.apply(_this, this.properties);
        return asn;
      }
      _ref = this.properties;
      for (i = 0, _len = _ref.length; i < _len; ++i) {
        prop = _ref[i];
        if (prop.assign) {
          prop.assign = false;
          _ref2 = new Value(this.base, this.properties.slice(0, i)).cacheReference(o), lhs = _ref2[0], rhs = _ref2[1];
          asn = new Assign(lhs, new Value(rhs, this.properties.slice(i)), '=');
          asn.access = true;
          return asn;
        }
      }
      return null;
    };
    return Value;
  }());
  exports.Comment = (function(){
    Comment = (function(){
      function Comment(_arg){
        this.comment = _arg;
        return this;
      }
      return Comment;
    })();
    __extends(Comment, Base);
    Comment.prototype.isPureStatement = YES;
    Comment.prototype.isStatement = YES;
    Comment.prototype.makeReturn = THIS;
    Comment.prototype.compileNode = function(){
      return this.tab + '/*' + multident(this.comment, this.tab) + '*/';
    };
    return Comment;
  }());
  exports.Call = (function(){
    Call = (function(){
      function Call(variable, _arg, _arg2){
        this.args = _arg != null ? _arg : [];
        this.soak = _arg2;
        this["new"] = '';
        this.isSuper = variable === 'super';
        this.variable = this.isSuper ? null : variable;
        return this;
      }
      return Call;
    })();
    __extends(Call, Base);
    Call.prototype.children = ["variable", "args"];
    Call.prototype.newInstance = function(){
      this["new"] = 'new ';
      return this;
    };
    Call.prototype.superReference = function(o){
      var method, name;
      method = o.scope.method;
      if (!method) {
        throw SyntaxError('cannot call super outside of a function.');
      }
      name = method.name;
      if (!name) {
        throw SyntaxError('cannot call super on an anonymous function.');
      }
      return method.clas ? "" + method.clas + ".__super__." + name : "" + name + ".__super__.constructor";
    };
    Call.prototype.unfoldSoak = function(o){
      var call, ifn, left, rite, _i, _len, _ref, _ref2;
      if (this.soak) {
        if (this.variable) {
          if (ifn = If.unfoldSoak(o, this, 'variable')) {
            return ifn;
          }
          _ref = new Value(this.variable).cacheReference(o), left = _ref[0], rite = _ref[1];
        } else {
          left = new Literal(this.superReference(o));
          rite = new Value(left);
        }
        rite = new Call(rite, this.args);
        rite["new"] = this["new"];
        left = new Literal("typeof " + left.compile(o) + " == \"function\"");
        return new If(left, new Value(rite), {
          soak: true
        });
      }
      _ref2 = this.digCalls();
      for (_i = 0, _len = _ref2.length; _i < _len; ++_i) {
        call = _ref2[_i];
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
    };
    Call.prototype.digCalls = function(){
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
    };
    Call.prototype.compileNode = function(o){
      var arg, args, asn, call, code, vr, _i, _j, _len, _len2, _ref, _ref2, _result;
      if (vr = this.variable) {
        _ref = this.digCalls();
        for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
          call = _ref[_i];
          if (asn) {
            if (call.variable instanceof Call) {
              call.variable = asn;
            } else {
              call.variable.base = asn;
            }
          }
          if (asn = call.variable.unfoldAssign(o)) {
            call.variable = asn.value;
            asn.value = new Value(call);
          }
        }
        if (asn) {
          return asn.compile(o);
        }
        vr.front = this.front;
      }
      if (code = Splat.compileArray(o, this.args, true)) {
        return this.compileSplat(o, code);
      }
      args = (function(){
        _ref2 = this.args;
        _result = [];
        for (_j = 0, _len2 = _ref2.length; _j < _len2; ++_j) {
          arg = _ref2[_j];
          _result.push(arg.compile(o, LEVEL_LIST));
        }
        return _result;
      }.call(this)).join(', ');
      return this.isSuper ? this.compileSuper(args, o) : this["new"] + this.variable.compile(o, LEVEL_ACCESS) + ("(" + args + ")");
    };
    Call.prototype.compileSuper = function(args, o){
      return "" + this.superReference(o) + ".call(this" + (args.length ? ', ' : '') + args + ")";
    };
    Call.prototype.compileSplat = function(o, splatargs){
      var base, fun, idt, name, ref;
      if (this.isSuper) {
        return "" + this.superReference(o) + ".apply(this, " + splatargs + ")";
      }
      if (!this["new"]) {
        base = new Value(this.variable);
        if ((name = base.properties.pop()) && base.isComplex()) {
          ref = o.scope.freeVariable('this');
          fun = "(" + ref + " = " + base.compile(o, LEVEL_LIST) + ")" + name.compile(o);
        } else {
          fun = ref = base.compile(o, LEVEL_ACCESS);
          if (name) {
            fun += name.compile(o);
          }
        }
        return "" + fun + ".apply(" + ref + ", " + splatargs + ")";
      }
      idt = this.idt(1);
      return "(function(func, args, ctor){\n" + idt + "ctor.prototype = func.prototype;\n" + idt + "var child = new ctor, result = func.apply(child, args);\n" + idt + "return typeof result == \"object\" ? result : child;\n" + this.tab + "}(" + this.variable.compile(o, LEVEL_LIST) + ", " + splatargs + ", function(){}))";
    };
    return Call;
  }());
  exports.Extends = (function(){
    Extends = (function(){
      function Extends(_arg, _arg2){
        this.child = _arg;
        this.parent = _arg2;
        return this;
      }
      return Extends;
    })();
    __extends(Extends, Base);
    Extends.prototype.children = ["child", "parent"];
    Extends.prototype.compile = function(o){
      return new Call(new Value(new Literal(utility('extends'))), [this.child, this.parent]).compile(o);
    };
    return Extends;
  }());
  exports.Import = (function(){
    Import = (function(){
      function Import(_arg, _arg2, _arg3){
        this.left = _arg;
        this.right = _arg2;
        this.own = _arg3;
        return this;
      }
      return Import;
    })();
    __extends(Import, Base);
    Import.prototype.children = ["left", "right"];
    Import.prototype.compile = function(o){
      var util;
      util = new Value(new Literal(utility(this.own ? 'import' : 'importAll')));
      return new Call(util, [this.left, this.right]).compile(o);
    };
    return Import;
  }());
  exports.Accessor = (function(){
    Accessor = (function(){
      function Accessor(_arg, symbol){
        this.name = _arg;
        switch (symbol) {
        case '?.':
          this.soak = true;
          break;
        case '.=':
          this.assign = true;
        }
        return this;
      }
      return Accessor;
    })();
    __extends(Accessor, Base);
    Accessor.prototype.children = ['name'];
    Accessor.prototype.compile = function(o){
      var name, _ref;
      return (_ref = (name = this.name.compile(o)).charAt(0)) === "\"" || _ref === "\'" ? "[" + name + "]" : "." + name;
    };
    Accessor.prototype.isComplex = NO;
    Accessor.prototype.toString = function(idt){
      return Accessor.__super__.toString.call(this, idt, this.constructor.name + (this.assign ? '=' : ''));
    };
    return Accessor;
  }());
  exports.Index = (function(){
    Index = (function(){
      function Index(_arg, symbol){
        this.index = _arg;
        switch (symbol) {
        case '?[':
          this.soak = true;
          break;
        case '[=':
          this.assign = true;
        }
        return this;
      }
      return Index;
    })();
    __extends(Index, Base);
    Index.prototype.children = ['index'];
    Index.prototype.compile = function(o){
      return "[" + this.index.compile(o, LEVEL_PAREN) + "]";
    };
    Index.prototype.isComplex = function(){
      return this.index.isComplex();
    };
    Index.prototype.toString = Accessor.prototype.toString;
    return Index;
  }());
  exports.Obj = (function(){
    Obj = (function(){
      function Obj(props){
        this.objects = this.properties = props || [];
        return this;
      }
      return Obj;
    })();
    __extends(Obj, Base);
    Obj.prototype.children = ['properties'];
    Obj.prototype.compileNode = function(o){
      var code, i, idt, lastIndex, lastNonComment, prop, props, rest, _i, _len, _len2, _ref;
      _ref = props = this.properties;
      for (i = 0, _len = _ref.length; i < _len; ++i) {
        prop = _ref[i];
        if (prop instanceof Splat || (prop.variable || prop).base instanceof Parens) {
          rest = props.splice(i);
          break;
        }
      }
      lastIndex = props.length - 1;
      for (_i = props.length - 1; _i >= 0; --_i) {
        prop = props[_i];
        if (!(prop instanceof Comment)) {
          lastNonComment = prop;
          break;
        }
      }
      code = '';
      idt = o.indent = this.idt(1);
      for (i = 0, _len2 = props.length; i < _len2; ++i) {
        prop = props[i];
        if (!(prop instanceof Comment)) {
          code += idt;
        }
        code += prop instanceof Value && prop["this"] ? new Assign(prop.properties[0].name, prop, 'object').compile(o) : !(prop instanceof Assign || prop instanceof Comment) ? new Assign(prop, prop, 'object').compile(o) : prop.compile(o);
        code += i === lastIndex ? '' : prop === lastNonComment || prop instanceof Comment ? '\n' : ',\n';
      }
      code = "{" + (code && '\n' + code + '\n' + this.tab) + "}";
      if (rest) {
        return this.compileDynamic(o, code, rest);
      }
      return this.front ? "(" + code + ")" : code;
    };
    Obj.prototype.compileDynamic = function(o, code, props){
      var acc, i, impt, key, oref, prop, ref, sp, val, _len, _ref;
      for (i = 0, _len = props.length; i < _len; ++i) {
        prop = props[i];
        if (sp = prop instanceof Splat) {
          impt = new Import(new Literal(oref || code), prop.name, true).compile(o);
          code = oref ? code + ', ' + impt : impt;
          continue;
        }
        if (prop instanceof Comment) {
          code += ' ' + prop.compile(o);
          continue;
        }
        if (!oref) {
          oref = o.scope.freeVariable('obj');
          code = oref + ' = ' + code;
        }
        if (prop instanceof Assign) {
          acc = prop.variable.base;
          key = acc.compile(o, LEVEL_PAREN);
          val = prop.value.compile(o, LEVEL_LIST);
        } else {
          acc = prop.base;
          _ref = acc.cache(o, LEVEL_LIST, ref), key = _ref[0], val = _ref[1];
          if (key !== val) {
            ref = val;
          }
        }
        key = acc instanceof Literal && IDENTIFIER.test(key) ? '.' + key : '[' + key + ']';
        code += ', ' + oref + key + ' = ' + val;
      }
      if (!sp) {
        code += ', ' + oref;
      }
      return o.level <= LEVEL_PAREN ? code : "(" + code + ")";
    };
    Obj.prototype.assigns = function(name){
      var prop, _i, _len, _ref;
      _ref = this.properties;
      for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
        prop = _ref[_i];
        if (prop.assigns(name)) {
          return true;
        }
      }
      return false;
    };
    return Obj;
  }());
  exports.Arr = (function(){
    Arr = (function(){
      function Arr(_arg){
        this.objects = _arg != null ? _arg : [];
        return this;
      }
      return Arr;
    })();
    __extends(Arr, Base);
    Arr.prototype.children = ['objects'];
    Arr.prototype.compileNode = function(o){
      var code, i, obj, objects, _len, _ref;
      o.indent = this.idt(1);
      if (code = Splat.compileArray(o, this.objects)) {
        return code;
      }
      objects = [];
      _ref = this.objects;
      for (i = 0, _len = _ref.length; i < _len; ++i) {
        obj = _ref[i];
        code = obj.compile(o, LEVEL_LIST);
        objects.push((obj instanceof Comment ? "\n" + code + "\n" + o.indent : i === this.objects.length - 1 ? code : code + ', '));
      }
      objects = objects.join('');
      return 0 < objects.indexOf('\n') ? "[\n" + o.indent + objects + "\n" + this.tab + "]" : "[" + objects + "]";
    };
    Arr.prototype.assigns = function(name){
      var obj, _i, _len, _ref;
      _ref = this.objects;
      for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
        obj = _ref[_i];
        if (obj.assigns(name)) {
          return true;
        }
      }
      return false;
    };
    return Arr;
  }());
  exports.Class = (function(){
    Class = (function(){
      function Class(_arg, _arg2, _arg3){
        this.variable = _arg;
        this.parent = _arg2;
        this.properties = _arg3 != null ? _arg3 : [];
        return this;
      }
      return Class;
    })();
    __extends(Class, Base);
    Class.prototype.children = ["variable", "parent", "properties"];
    Class.prototype.isStatement = YES;
    Class.prototype.makeReturn = function(){
      this.returns = true;
      return this;
    };
    Class.prototype.compileNode = function(o){
      var accs, applied, apply, className, code, constScope, ctor, extension, func, me, pname, prop, props, pvar, ref, ret, variable, _i, _len, _ref, _ref2;
      variable = this.variable || new Literal(o.scope.freeVariable('ctor'));
      extension = this.parent && new Extends(variable, this.parent);
      props = new Expressions;
      me = null;
      className = variable.compile(o);
      constScope = null;
      if (this.parent) {
        applied = new Value(this.parent, [new Accessor(new Literal('apply'))]);
        ctor = new Code([], new Expressions([new Call(applied, [new Literal('this'), new Literal('arguments')])]));
      } else {
        ctor = new Code([], new Expressions([new Return(new Literal('this'))]));
      }
      _ref = this.properties;
      for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
        prop = _ref[_i];
        pvar = prop.variable, func = prop.value;
        if (pvar && pvar.base.value === 'constructor') {
          if (!(func instanceof Code)) {
            _ref2 = func.cache(o), func = _ref2[0], ref = _ref2[1];
            if (func !== ref) {
              props.append(func);
            }
            apply = new Call(new Value(ref, [new Accessor(new Literal('apply'))]), [new Literal('this'), new Literal('arguments')]);
            func = new Code([], new Expressions([apply]));
          }
          if (func.bound) {
            throw SyntaxError('cannot define a constructor as a bound function.');
          }
          func.name = className;
          func.body.append(new Return(new Literal('this')));
          variable = new Value(variable);
          ctor = func;
          if (last(props.expressions) instanceof Comment) {
            ctor.comment = props.pop();
          }
          continue;
        }
        if (func instanceof Code && func.bound) {
          if (prop.context === 'this') {
            func.context = className;
          } else {
            func.bound = false;
            constScope || (constScope = new Scope(o.scope, ctor.body, ctor));
            me || (me = constScope.freeVariable('this'));
            pname = pvar.compile(o);
            if (ctor.body.isEmpty()) {
              ctor.body.append(new Return(new Literal('this')));
            }
            ret = "return " + className + ".prototype." + pname + ".apply(" + me + ", arguments);";
            ctor.body.prepend(new Literal("this." + pname + " = function(){ " + ret + " }"));
          }
        }
        if (pvar) {
          accs = prop.context === 'this' ? [pvar.properties[0]] : [new Accessor(new Literal('prototype')), new Accessor(pvar)];
          prop = new Assign(new Value(variable, accs), func, '=');
        }
        props.append(prop);
      }
      ctor.className = className.match(/[$\w]+$/);
      if (me) {
        ctor.body.prepend(new Literal("" + me + " = this"));
      }
      o.sharedScope = constScope;
      code = this.tab + new Assign(variable, ctor).compile(o) + ';';
      if (extension) {
        code += '\n' + this.tab + extension.compile(o) + ';';
      }
      if (!props.isEmpty()) {
        code += '\n' + props.compile(o);
      }
      if (this.returns) {
        code += '\n' + new Return(variable).compile(o);
      }
      return code;
    };
    return Class;
  }());
  exports.Assign = (function(){
    Assign = (function(){
      function Assign(_arg, _arg2, _arg3){
        this.variable = _arg;
        this.value = _arg2;
        this.context = _arg3;
        return this;
      }
      return Assign;
    })();
    __extends(Assign, Base);
    Assign.prototype.children = ["variable", "value"];
    Assign.prototype.assigns = function(name){
      return this[this.context === 'object' ? 'value' : 'variable'].assigns(name);
    };
    Assign.prototype.unfoldSoak = function(o){
      return If.unfoldSoak(o, this, 'variable');
    };
    Assign.prototype.unfoldAssign = function(){
      return this.access && this;
    };
    Assign.prototype.compileNode = function(o){
      var isValue, match, name, val, value, variable, _, _ref;
      variable = this.variable, value = this.value;
      if (isValue = variable instanceof Value) {
        if (variable.isArray() || variable.isObject()) {
          return this.compileDestructuring(o);
        }
        if ((_ref = this.context) === "||=" || _ref === "&&=" || _ref === "?=") {
          return this.compileConditional(o);
        }
      }
      name = variable.compile(o, LEVEL_LIST);
      if (value instanceof Code && (match = METHOD_DEF.exec(name))) {
        _ = match[0], value.clas = match[1], value.name = match[2];
      }
      val = value.compile(o, LEVEL_LIST);
      if (this.context === 'object') {
        return "" + name + ": " + val;
      }
      if (!variable.isAssignable()) {
        throw SyntaxError("\"" + this.variable.compile(o) + "\" cannot be assigned.");
      }
      if (!(this.context || isValue && variable.hasProperties())) {
        o.scope.find(name);
      }
      name += (" " + (this.context || '=') + " ") + val;
      return o.level <= LEVEL_LIST ? name : "(" + name + ")";
    };
    Assign.prototype.compileDestructuring = function(o){
      var acc, assigns, code, i, idx, isObject, ivar, obj, objects, olen, ref, rest, splat, top, val, value, vvar, _len, _ref, _ref2, _ref3, _ref4, _ref5, _ref6;
      top = o.level === LEVEL_TOP;
      value = this.value;
      objects = this.variable.base.objects;
      if (!(olen = objects.length)) {
        return value.compile(o);
      }
      isObject = this.variable.isObject();
      if (top && olen === 1 && !((obj = objects[0]) instanceof Splat)) {
        if (obj instanceof Assign) {
          _ref = obj, (_ref2 = _ref.variable, idx = _ref2.base, _ref2), obj = _ref.value;
        } else {
          if (obj.base instanceof Parens) {
            _ref3 = new Value(obj.unwrapAll()).cacheReference(o), obj = _ref3[0], idx = _ref3[1];
          } else {
            idx = isObject ? (obj["this"] ? obj.properties[0].name : obj) : new Literal(0);
          }
        }
        acc = IDENTIFIER.test(idx.unwrap().value || 0);
        val = new Value(value).append(new (acc ? Accessor : Index)(idx));
        return new Assign(obj, val).compile(o);
      }
      vvar = value.compile(o, LEVEL_LIST);
      assigns = [];
      splat = false;
      if (!IDENTIFIER.test(vvar) || this.variable.assigns(vvar)) {
        assigns.push("" + (ref = o.scope.freeVariable('ref')) + " = " + vvar);
        vvar = ref;
      }
      for (i = 0, _len = objects.length; i < _len; ++i) {
        obj = objects[i];
        idx = i;
        if (isObject) {
          if (obj instanceof Assign) {
            _ref4 = obj, (_ref5 = _ref4.variable, idx = _ref5.base, _ref5), obj = _ref4.value;
          } else {
            if (obj.base instanceof Parens) {
              _ref6 = new Value(obj.unwrapAll()).cacheReference(o), obj = _ref6[0], idx = _ref6[1];
            } else {
              idx = obj["this"] ? obj.properties[0].name : obj;
            }
          }
        }
        if (!splat && obj instanceof Splat) {
          val = "" + olen + " <= " + vvar + ".length ? " + utility('slice') + ".call(" + vvar + ", " + i;
          if (rest = olen - i - 1) {
            ivar = o.scope.freeVariable('i');
            val += ", " + ivar + " = " + vvar + ".length - " + rest + ") : (" + ivar + " = " + i + ", [])";
          } else {
            val += ") : []";
          }
          val = new Literal(val);
          splat = "" + ivar + "++";
        } else {
          if (obj instanceof Splat) {
            obj = obj.name.compile(o);
            throw SyntaxError("multiple splats are disallowed in an assignment: " + obj + " ...");
          }
          if (typeof idx === 'number') {
            idx = new Literal(splat || idx);
            acc = false;
          } else {
            acc = isObject && IDENTIFIER.test(idx.unwrap().value || 0);
          }
          val = new Value(new Literal(vvar), [new (acc ? Accessor : Index)(idx)]);
        }
        assigns.push(new Assign(obj, val).compile(o, LEVEL_LIST));
      }
      if (!top) {
        assigns.push(vvar);
      }
      code = assigns.join(', ');
      return o.level < LEVEL_LIST ? code : "(" + code + ")";
    };
    Assign.prototype.compileConditional = function(o){
      var left, rite, _ref;
      _ref = this.variable.cacheReference(o), left = _ref[0], rite = _ref[1];
      return new Op(this.context.slice(0, -1), left, new Assign(rite, this.value, '=')).compile(o);
    };
    Assign.prototype.compileAccess = function(o){
      var acc, base, call, code, left, rite, val, _ref;
      val = this.value;
      if (call = val instanceof Call) {
        val = val.variable;
      }
      if (!(val instanceof Value && ((base = val.base) instanceof Literal || base instanceof Arr && base.objects.length === 1))) {
        throw SyntaxError('invalid right hand side for ".=": ' + this.value.compile(o));
      }
      _ref = this.variable.cacheReference(o), left = _ref[0], rite = _ref[1];
      acc = base instanceof Arr ? new Index(base.objects[0]) : new Accessor(base);
      val.properties.unshift(acc);
      val.base = rite;
      code = left.compile(o) + ' = ' + this.value.compile(o);
      return o.level <= LEVEL_LIST ? code : "(" + code + ")";
    };
    return Assign;
  }());
  exports.Code = (function(){
    Code = (function(){
      function Code(_arg, _arg2, tag){
        this.params = _arg != null ? _arg : [];
        this.body = _arg2 != null ? _arg2 : new Expressions;
        this.bound = tag === 'boundfunc';
        if (this.bound) {
          this.context = 'this';
        }
        return this;
      }
      return Code;
    })();
    __extends(Code, Base);
    Code.prototype.children = ["params", "body"];
    Code.prototype.compileNode = function(o){
      var close, code, comm, exprs, func, i, idt, lit, open, p, param, ref, scope, sharedScope, splats, v, val, vars, wasEmpty, _i, _j, _len, _len2, _len3, _ref, _ref2, _result, _this;
      sharedScope = del(o, 'sharedScope');
      o.scope = scope = sharedScope || new Scope(o.scope, this.body, this);
      o.indent = this.idt(1);
      delete o.bare;
      delete o.globals;
      vars = [];
      exprs = [];
      _ref = this.params;
      for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
        param = _ref[_i];
        if (param.splat) {
          splats = new Assign(new Value(new Arr((function(){
            _ref2 = this.params;
            _result = [];
            for (_j = 0, _len2 = _ref2.length; _j < _len2; ++_j) {
              p = _ref2[_j];
              _result.push(p.asReference(o));
            }
            return _result;
          }.call(this)))), new Value(new Literal('arguments')));
          break;
        }
      }
      _ref2 = this.params;
      for (_j = 0, _len2 = _ref2.length; _j < _len2; ++_j) {
        param = _ref2[_j];
        if (param.isComplex()) {
          val = ref = param.asReference(o);
          if (param.value) {
            val = new Op('?', ref, param.value);
          }
          exprs.push(new Assign(new Value(param.name), val, '='));
        } else {
          ref = param;
          if (param.value) {
            lit = new Literal(ref.name.value + ' == null');
            val = new Assign(new Value(param.name), param.value, '=');
            exprs.push(new Op('&&', lit, val));
          }
        }
        if (!splats) {
          vars.push(ref);
        }
      }
      scope.startLevel();
      wasEmpty = this.body.isEmpty();
      if (splats) {
        exprs.unshift(splats);
      }
      if (exprs.length) {
        (_this = this.body.expressions).splice.apply(_this, [0, 0].concat(__slice.call(exprs)));
      }
      if (!(wasEmpty || this.noReturn)) {
        this.body.makeReturn();
      }
      if (!splats) {
        for (i = 0, _len3 = vars.length; i < _len3; ++i) {
          v = vars[i];
          scope.parameter(vars[i] = v.compile(o));
        }
      }
      if (!vars.length && this.body.contains(function(it){
        return it.value === 'it';
      })) {
        vars.push('it');
      }
      comm = this.comment ? this.comment.compile(o) + '\n' : '';
      if (this.className) {
        o.indent = this.idt(2);
      }
      idt = this.idt(1);
      code = this.body.isEmpty() ? '' : "\n" + this.body.compileWithDeclarations(o) + "\n";
      if (this.className) {
        open = "(function(){\n" + comm + idt + "function " + this.className + "(";
        close = "" + (code && idt) + "}\n" + idt + "return " + this.className + ";\n" + this.tab + "})()";
      } else {
        open = 'function(';
        close = "" + (code && this.tab) + "}";
      }
      func = "" + open + vars.join(', ') + "){" + code + close;
      scope.endLevel();
      if (this.bound) {
        return "" + utility('bind') + "(" + func + ", " + this.context + ")";
      }
      return this.front ? "(" + func + ")" : func;
    };
    Code.prototype.traverseChildren = function(crossScope, func){
      if (crossScope) {
        return Code.__super__.traverseChildren.call(this, crossScope, func);
      }
    };
    return Code;
  }());
  exports.Param = (function(){
    Param = (function(){
      function Param(_arg, _arg2, _arg3){
        this.name = _arg;
        this.value = _arg2;
        this.splat = _arg3;
        return this;
      }
      return Param;
    })();
    __extends(Param, Base);
    Param.prototype.children = ["name", "value"];
    Param.prototype.compile = function(o){
      return this.name.compile(o, LEVEL_LIST);
    };
    Param.prototype.asReference = function(o){
      var node;
      if (this.reference) {
        return this.reference;
      }
      node = this.isComplex() ? new Literal(o.scope.freeVariable('arg')) : this.name;
      node = new Value(node);
      if (this.splat) {
        node = new Splat(node);
      }
      return this.reference = node;
    };
    Param.prototype.isComplex = function(){
      return this.name.isComplex();
    };
    return Param;
  }());
  exports.Splat = (function(){
    Splat = (function(){
      function Splat(name){
        this.name = name.compile ? name : new Literal(name);
        return this;
      }
      return Splat;
    })();
    __extends(Splat, Base);
    Splat.prototype.children = ['name'];
    Splat.prototype.isAssignable = YES;
    Splat.prototype.assigns = function(it){
      return this.name.assigns(it);
    };
    Splat.prototype.compile = function(o){
      return this.index != null ? this.compileParam(o) : this.name.compile(o);
    };
    Splat.compileArray = function(o, list, apply){
      var args, base, code, i, index, node, _i, _len, _len2, _ref, _result;
      index = -1;
      while ((node = list[++index]) && !(node instanceof Splat)) {
        continue;
      }
      if (index >= list.length) {
        return '';
      }
      if (list.length === 1) {
        code = list[0].compile(o, LEVEL_LIST);
        if (apply) {
          return code;
        }
        return "" + utility('slice') + ".call(" + code + ")";
      }
      args = list.slice(index);
      for (i = 0, _len = args.length; i < _len; ++i) {
        node = args[i];
        code = node.compile(o, LEVEL_LIST);
        args[i] = node instanceof Splat ? "" + utility('slice') + ".call(" + code + ")" : "[" + code + "]";
      }
      if (index === 0) {
        return args[0] + (".concat(" + args.slice(1).join(', ') + ")");
      }
      base = (function(){
        _ref = list.slice(0, index);
        _result = [];
        for (_i = 0, _len2 = _ref.length; _i < _len2; ++_i) {
          node = _ref[_i];
          _result.push(node.compile(o, LEVEL_LIST));
        }
        return _result;
      }());
      return "[" + base.join(', ') + "].concat(" + args.join(', ') + ")";
    };
    return Splat;
  }.call(this));
  exports.While = (function(){
    While = (function(){
      function While(cond, options){
        options == null && (options = {});
        this.condition = options.name === 'until' ? cond.invert() : cond;
        this.guard = options.guard;
        return this;
      }
      return While;
    })();
    __extends(While, Base);
    While.prototype.children = ["condition", "guard", "body"];
    While.prototype.isStatement = YES;
    While.prototype.addBody = function(_arg){
      this.body = _arg;
      return this;
    };
    While.prototype.makeReturn = function(){
      this.returns = true;
      return this;
    };
    While.prototype.containsPureStatement = function(){
      var expressions, i, ret, _ref;
      expressions = this.body.expressions;
      i = expressions.length;
      if ((_ref = expressions[--i]) != null ? _ref.containsPureStatement() : void 0) {
        return true;
      }
      ret = function(it){
        return it instanceof Return;
      };
      while (i) {
        if (expressions[--i].contains(ret)) {
          return true;
        }
      }
      return false;
    };
    While.prototype.compileNode = function(o){
      var body, code, rvar, set;
      o.indent = this.idt(1);
      set = '';
      code = this.condition.compile(o, LEVEL_PAREN);
      body = this.body;
      if (body.isEmpty()) {
        body = '';
      } else {
        if (o.level > LEVEL_TOP || this.returns) {
          rvar = o.scope.freeVariable('result');
          set = "" + this.tab + rvar + " = [];\n";
          if (body) {
            body = Push.wrap(rvar, body);
          }
        }
        if (this.guard) {
          body = Expressions.wrap([new If(this.guard, body)]);
        }
        body = "\n" + body.compile(o, LEVEL_TOP) + "\n" + this.tab;
      }
      code = set + this.tab + (code === 'true' ? 'for (;;' : "while (" + code);
      code += ") {" + body + "}";
      if (this.returns) {
        o.indent = this.tab;
        code += '\n' + new Return(new Literal(rvar)).compile(o);
      }
      return code;
    };
    return While;
  }());
  exports.Op = (function(){
    Op = (function(){
      function Op(op, first, second, flip){
        var args;
        if (op === 'in') {
          return new In(first, second);
        }
        if (op === 'do') {
          if (first instanceof Code && first.bound) {
            first.bound = false;
            first = new Value(first, [new Accessor(new Literal('call'))]);
            args = [new Literal('this')];
          }
          return new Call(first, args);
        }
        if (op === 'new') {
          if (first instanceof Call) {
            return first.newInstance();
          }
          if (first instanceof Code && first.bound) {
            first = new Parens(first);
          }
          first.keep = true;
        }
        this.operator = this.CONVERSIONS[op] || op;
        this.first = first;
        this.second = second;
        this.flip = !!flip;
        return this;
      }
      return Op;
    })();
    __extends(Op, Base);
    Op.prototype.CONVERSIONS = {
      'of': 'in'
    };
    Op.prototype.INVERSIONS = {
      '!==': '===',
      '===': '!==',
      '!=': '==',
      '==': '!='
    };
    Op.prototype.children = ["first", "second"];
    Op.prototype.isUnary = function(){
      return !this.second;
    };
    Op.prototype.isChainable = function(){
      var _ref;
      return (_ref = this.operator) === "<" || _ref === ">" || _ref === ">=" || _ref === "<=" || _ref === "===" || _ref === "!==" || _ref === "==" || _ref === "!=";
    };
    Op.prototype.invert = function(){
      var op;
      if (op = this.INVERSIONS[this.operator]) {
        this.operator = op;
        return this;
      } else       return this.second ? new Parens(this).invert() : Op.__super__.invert.call(this);
    };
    Op.prototype.unfoldSoak = function(o){
      var _ref;
      return ((_ref = this.operator) === "++" || _ref === "--" || _ref === "delete") && If.unfoldSoak(o, this, 'first');
    };
    Op.prototype.compileNode = function(o){
      if (this.isUnary()) {
        return this.compileUnary(o);
      }
      if (this.isChainable() && this.first.isChainable()) {
        return this.compileChain(o);
      }
      if (this.operator === '?') {
        return this.compileExistence(o);
      }
      if (this.operator === 'instanceof' && this.second.isArray()) {
        return this.compileMultiIO(o);
      }
      this.first.front = this.front;
      return "" + this.first.compile(o, LEVEL_OP) + " " + this.operator + " " + this.second.compile(o, LEVEL_OP);
    };
    Op.prototype.compileChain = function(o){
      var code, fst, shared, _ref;
      _ref = this.first.second.cache(o), this.first.second = _ref[0], shared = _ref[1];
      fst = this.first.compile(o, LEVEL_OP);
      if (fst.charAt(0) === '(') {
        fst = fst.slice(1, -1);
      }
      code = "" + fst + " && " + shared.compile(o) + " " + this.operator + " " + this.second.compile(o, LEVEL_OP);
      return o.level < LEVEL_OP ? code : "(" + code + ")";
    };
    Op.prototype.compileExistence = function(o){
      var fst, ref;
      if (this.first.isComplex()) {
        ref = o.scope.freeVariable('ref');
        fst = new Parens(new Assign(new Literal(ref), this.first, '='));
      } else {
        fst = this.first;
        ref = fst.compile(o);
      }
      return new Existence(fst).compile(o) + (" ? " + ref + " : " + this.second.compile(o, LEVEL_LIST));
    };
    Op.prototype.compileUnary = function(o){
      var code, op, parts;
      parts = [op = this.operator];
      if ((op === "new" || op === "typeof" || op === "delete" || op === "void") || (op === "+" || op === "-") && this.first.operator === op) {
        parts.push(' ');
      }
      parts.push(this.first.compile(o, LEVEL_OP));
      if (this.flip) {
        parts.reverse();
      }
      code = parts.join('');
      return o.level <= LEVEL_OP ? code : "(" + code + ")";
    };
    Op.prototype.compileMultiIO = function(o){
      var code, i, item, ref, sub, tests, _len, _ref, _ref2, _result;
      _ref = this.first.cache(o, LEVEL_OP), sub = _ref[0], ref = _ref[1];
      tests = (function(){
        _ref2 = this.second.base.objects;
        _result = [];
        for (i = 0, _len = _ref2.length; i < _len; ++i) {
          item = _ref2[i];
          _result.push((i ? ref : sub) + ' instanceof ' + item.compile(o));
        }
        return _result;
      }.call(this));
      code = tests.join(' || ');
      return o.level < LEVEL_OP ? code : "(" + code + ")";
    };
    Op.prototype.toString = function(idt){
      return Op.__super__.toString.call(this, idt, this.constructor.name + ' ' + this.operator);
    };
    return Op;
  }());
  exports.In = (function(){
    In = (function(){
      function In(_arg, _arg2){
        this.object = _arg;
        this.array = _arg2;
        return this;
      }
      return In;
    })();
    __extends(In, Base);
    In.prototype.children = ["object", "array"];
    In.prototype.invert = function(){
      this.negated = !this.negated;
      return this;
    };
    In.prototype.compileNode = function(o){
      return this.array instanceof Value && this.array.isArray() ? this.compileOrTest(o) : this.compileLoopTest(o);
    };
    In.prototype.compileOrTest = function(o){
      var cmp, cnj, code, i, item, ref, sub, tests, _len, _ref, _ref2, _ref3, _result;
      _ref = this.object.cache(o, LEVEL_OP), sub = _ref[0], ref = _ref[1];
      _ref2 = this.negated ? [' !== ', ' && '] : [' === ', ' || '], cmp = _ref2[0], cnj = _ref2[1];
      tests = (function(){
        _ref3 = this.array.base.objects;
        _result = [];
        for (i = 0, _len = _ref3.length; i < _len; ++i) {
          item = _ref3[i];
          _result.push((i ? ref : sub) + cmp + item.compile(o));
        }
        return _result;
      }.call(this));
      code = tests.join(cnj);
      return o.level < LEVEL_OP ? code : "(" + code + ")";
    };
    In.prototype.compileLoopTest = function(o){
      var code, ref, sub, _ref;
      _ref = this.object.cache(o, LEVEL_LIST), sub = _ref[0], ref = _ref[1];
      code = utility('indexOf') + (".call(" + this.array.compile(o) + ", " + ref + ") ") + (this.negated ? '< 0' : '>= 0');
      if (sub === ref) {
        return code;
      }
      code = sub + ', ' + code;
      return o.level < LEVEL_LIST ? code : "(" + code + ")";
    };
    In.prototype.toString = function(idt){
      return In.__super__.toString.call(this, idt, this.constructor.name + (this.negated ? '!' : ''));
    };
    return In;
  }());
  exports.Try = (function(){
    Try = (function(){
      function Try(_arg, _arg2, _arg3, _arg4){
        this.attempt = _arg;
        this.error = _arg2;
        this.recovery = _arg3;
        this.ensure = _arg4;
        return this;
      }
      return Try;
    })();
    __extends(Try, Base);
    Try.prototype.children = ["attempt", "recovery", "ensure"];
    Try.prototype.isStatement = YES;
    Try.prototype.makeReturn = function(){
      if (this.attempt) {
        this.attempt = this.attempt.makeReturn();
      }
      if (this.recovery) {
        this.recovery = this.recovery.makeReturn();
      }
      return this;
    };
    Try.prototype.compileNode = function(o){
      var catchPart, errorPart;
      o.indent = this.idt(1);
      errorPart = this.error ? " (" + this.error.compile(o) + ") " : ' ';
      catchPart = this.recovery ? " catch" + errorPart + "{\n" + this.recovery.compile(o, LEVEL_TOP) + "\n" + this.tab + "}" : !(this.ensure || this.recovery) ? ' catch (_e) {}' : void 0;
      return ("" + this.tab + "try {\n" + this.attempt.compile(o, LEVEL_TOP) + "\n" + this.tab + "}" + (catchPart || '')) + (this.ensure ? " finally {\n" + this.ensure.compile(o, LEVEL_TOP) + "\n" + this.tab + "}" : '');
    };
    return Try;
  }());
  exports.Throw = (function(){
    Throw = (function(){
      function Throw(_arg){
        this.expression = _arg;
        return this;
      }
      return Throw;
    })();
    __extends(Throw, Base);
    Throw.prototype.children = ['expression'];
    Throw.prototype.isStatement = YES;
    Throw.prototype.makeReturn = THIS;
    Throw.prototype.compileNode = function(o){
      return this.tab + ("throw " + this.expression.compile(o) + ";");
    };
    return Throw;
  }());
  exports.Existence = (function(){
    Existence = (function(){
      function Existence(_arg){
        this.expression = _arg;
        return this;
      }
      return Existence;
    })();
    __extends(Existence, Base);
    Existence.prototype.children = ['expression'];
    Existence.prototype.compileNode = function(o){
      var code;
      code = this.expression.compile(o);
      code = IDENTIFIER.test(code) && !o.scope.check(code) ? "typeof " + code + " != \"undefined\" && " + code + " !== null" : "" + code + " != null";
      return o.level <= LEVEL_COND ? code : "(" + code + ")";
    };
    return Existence;
  }());
  exports.Parens = (function(){
    Parens = (function(){
      function Parens(_arg, _arg2){
        this.expression = _arg;
        this.keep = _arg2;
        return this;
      }
      return Parens;
    })();
    __extends(Parens, Base);
    Parens.prototype.children = ['expression'];
    Parens.prototype.unwrap = function(){
      return this.expression;
    };
    Parens.prototype.isComplex = function(){
      return this.expression.isComplex();
    };
    Parens.prototype.makeReturn = function(){
      return this.expression.makeReturn();
    };
    Parens.prototype.compileNode = function(o){
      var code, expr;
      expr = this.expression;
      expr.front = this.front;
      if (!this.keep && ((expr instanceof Value || expr instanceof Call || expr instanceof Code || expr instanceof Parens) || o.level < LEVEL_OP && expr instanceof Op)) {
        return expr.compile(o);
      }
      code = expr.compile(o, LEVEL_PAREN);
      return expr.isStatement() ? code : "(" + code + ")";
    };
    return Parens;
  }());
  exports.For = (function(){
    For = (function(){
      function For(body, head){
        if (head.index instanceof Value) {
          throw SyntaxError('index variable of "for" cannot be destructuring');
        }
        __import(this, head);
        this.body = Expressions.wrap([body]);
        if (!this.object) {
          this.step || (this.step = new Literal(1));
        }
        this.pattern = this.name instanceof Value;
        this.returns = false;
        return this;
      }
      return For;
    })();
    __extends(For, Base);
    For.prototype.children = ["body", "source", "guard", "step", "from", "to"];
    For.prototype.isStatement = YES;
    For.prototype.makeReturn = function(){
      this.returns = true;
      return this;
    };
    For.prototype.containsPureStatement = While.prototype.containsPureStatement;
    For.prototype.compileReturnValue = function(o, val){
      if (this.returns) {
        return '\n' + new Return(new Literal(val)).compile(o);
      }
      if (val) {
        return '\n' + val;
      }
      return '';
    };
    For.prototype.compileNode = function(o){
      var body, code, cond, defPart, eq, forPart, guardPart, idt, index, ivar, lvar, name, namePart, pvar, retPart, rvar, scope, sourcePart, step, svar, tail, tvar, varPart, vars, _ref, _ref2, _ref3, _ref4, _ref5;
      scope = o.scope;
      body = this.body;
      name = !this.pattern && ((_ref = this.name) != null ? _ref.compile(o) : void 0);
      index = (_ref2 = this.index) != null ? _ref2.compile(o) : void 0;
      ivar = !index ? scope.freeVariable('i') : index;
      varPart = guardPart = defPart = retPart = '';
      idt = this.idt(1);
      if (name) {
        scope.find(name, true);
      }
      if (index) {
        scope.find(index, true);
      }
      if (this.step) {
        _ref3 = this.step.compileLoopReference(o, 'step'), step = _ref3[0], pvar = _ref3[1];
      }
      if (this.from) {
        eq = this.op === 'til' ? '' : '=';
        _ref4 = this.to.compileLoopReference(o, 'to'), tail = _ref4[0], tvar = _ref4[1];
        vars = ivar + ' = ' + this.from.compile(o);
        if (tail !== tvar) {
          vars += ', ' + tail;
        }
        cond = +pvar ? "" + ivar + " " + (pvar < 0 ? '>' : '<') + eq + " " + tvar : "" + pvar + " < 0 ? " + ivar + " >" + eq + " " + tvar + " : " + ivar + " <" + eq + " " + tvar;
      } else {
        if (name || this.object && !this.raw) {
          _ref5 = this.source.compileLoopReference(o, 'ref'), sourcePart = _ref5[0], svar = _ref5[1];
        } else {
          sourcePart = svar = this.source.compile(o, LEVEL_PAREN);
        }
        namePart = this.pattern ? new Assign(this.name, new Literal("" + svar + "[" + ivar + "]")).compile(o, LEVEL_TOP) : name ? "" + name + " = " + svar + "[" + ivar + "]" : void 0;
        if (!this.object) {
          if (0 > pvar && (pvar | 0) === +pvar) {
            vars = "" + ivar + " = " + svar + ".length - 1";
            cond = "" + ivar + " >= 0";
          } else {
            lvar = scope.freeVariable('len');
            vars = "" + ivar + " = 0, " + lvar + " = " + svar + ".length";
            cond = "" + ivar + " < " + lvar;
          }
        }
      }
      if (this.object) {
        forPart = ivar + ' in ' + sourcePart;
        guardPart = this.raw ? '' : idt + ("if (!" + utility('owns') + ".call(" + svar + ", " + ivar + ")) continue;\n");
      } else {
        if (step !== pvar) {
          vars += ', ' + step;
        }
        if (svar !== sourcePart) {
          defPart = this.tab + sourcePart + ';\n';
        }
        forPart = vars + ("; " + cond + "; ") + (function(){
          switch (+pvar) {
          case 1:
            return '++' + ivar;
          case -1:
            return '--' + ivar;
          default:
            return ivar + (pvar < 0 ? ' -= ' + pvar.slice(1) : ' += ' + pvar);
          }
        }());
      }
      if (namePart) {
        varPart = idt + namePart + ';\n';
      }
      if (!this.pattern) {
        defPart += this.pluckDirectCalls(o, body, name, index);
      }
      code = guardPart + varPart;
      if (!body.isEmpty()) {
        if (o.level > LEVEL_TOP || this.returns) {
          rvar = scope.freeVariable('result');
          defPart += this.tab + rvar + ' = [];\n';
          retPart = this.compileReturnValue(o, rvar);
          body = Push.wrap(rvar, body);
        }
        if (this.guard) {
          body = Expressions.wrap([new If(this.guard, body)]);
        }
        o.indent = idt;
        code += body.compile(o, LEVEL_TOP);
      }
      if (code) {
        code = '\n' + code + '\n' + this.tab;
      }
      return defPart + this.tab + ("for (" + forPart + ") {" + code + "}") + retPart;
    };
    For.prototype.pluckDirectCalls = function(o, body, name, index){
      var a, args, base, defs, exp, fn, i, idx, ref, val, _len, _len2, _ref, _ref2, _ref3;
      defs = '';
      _ref = body.expressions;
      for (idx = 0, _len = _ref.length; idx < _len; ++idx) {
        exp = _ref[idx];
        if ((exp = exp.unwrapAll()) instanceof Call) {
          val = exp.variable.unwrapAll();
          if (!(val instanceof Code && !exp.args.length || val instanceof Value && val.base instanceof Code && val.properties.length === 1 && ((_ref2 = val.properties[0].name) != null ? _ref2.value : void 0) === 'call')) {
            continue;
          }
          fn = val.base || val;
          ref = new Literal(o.scope.freeVariable('fn'));
          base = new Value(ref);
          args = [].concat(name || [], index || []);
          if (this.object) {
            args.reverse();
          }
          for (i = 0, _len2 = args.length; i < _len2; ++i) {
            a = args[i];
            fn.params.push(new Param(args[i] = new Literal(a)));
          }
          if (val.base) {
            _ref3 = [base, val], val.base = _ref3[0], base = _ref3[1];
            args.unshift(new Literal('this'));
          }
          body.expressions[idx] = new Call(base, args);
          defs += this.tab + new Assign(ref, fn, '=').compile(o, LEVEL_TOP) + ';\n';
        }
      }
      return defs;
    };
    return For;
  }());
  exports.Switch = (function(){
    Switch = (function(){
      function Switch(_arg, _arg2, _arg3){
        this.subject = _arg;
        this.cases = _arg2;
        this.otherwise = _arg3;
        return this;
      }
      return Switch;
    })();
    __extends(Switch, Base);
    Switch.prototype.children = ["subject", "cases", "otherwise"];
    Switch.prototype.isStatement = YES;
    Switch.prototype.makeReturn = function(){
      var pair, _i, _len, _ref, _ref2;
      _ref = this.cases;
      for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
        pair = _ref[_i];
        pair[1].makeReturn();
      }
      if ((_ref2 = this.otherwise) != null) {
        _ref2.makeReturn();
      }
      return this;
    };
    Switch.prototype.compileNode = function(o){
      var block, body, code, cond, conditions, expr, i, idt, tab, _i, _j, _len, _len2, _ref, _ref2, _ref3, _ref4;
      tab = this.tab;
      idt = o.indent = this.idt(1);
      code = tab + ("switch (" + (((_ref = this.subject) != null ? _ref.compile(o, LEVEL_PAREN) : void 0) || false) + ") {\n");
      for (i = 0, _len = this.cases.length; i < _len; ++i) {
        _ref2 = this.cases[i], conditions = _ref2[0], block = _ref2[1];
        _ref3 = flatten([conditions]);
        for (_i = 0, _len2 = _ref3.length; _i < _len2; ++_i) {
          cond = _ref3[_i];
          if (!this.subject) {
            cond = cond.invert();
          }
          code += tab + ("case " + cond.compile(o, LEVEL_PAREN) + ":\n");
        }
        if (body = block.compile(o, LEVEL_TOP)) {
          code += body + '\n';
        }
        if (i === this.cases.length - 1 && !this.otherwise) {
          break;
        }
        _ref4 = block.expressions;
        for (_j = _ref4.length - 1; _j >= 0; --_j) {
          expr = _ref4[_j];
          if (!(expr instanceof Comment)) {
            if (!(expr instanceof Return)) {
              code += idt + 'break;\n';
            }
            break;
          }
        }
      }
      if (this.otherwise) {
        code += tab + ("default:\n" + this.otherwise.compile(o, LEVEL_TOP) + "\n");
      }
      return code + tab + '}';
    };
    return Switch;
  }());
  exports.If = (function(){
    If = (function(){
      function If(cond, _arg, options){
        this.body = _arg;
        options == null && (options = {});
        this.condition = options.name === 'unless' ? cond.invert() : cond;
        this.elseBody = null;
        this.isChain = false;
        this.soak = options.soak, this.statement = options.statement;
        return this;
      }
      return If;
    })();
    __extends(If, Base);
    If.prototype.children = ["condition", "body", "elseBody"];
    If.prototype.bodyNode = function(){
      var _ref;
      return (_ref = this.body) != null ? _ref.unwrap() : void 0;
    };
    If.prototype.elseBodyNode = function(){
      var _ref;
      return (_ref = this.elseBody) != null ? _ref.unwrap() : void 0;
    };
    If.prototype.addElse = function(elseBody){
      if (this.isChain) {
        this.elseBodyNode().addElse(elseBody);
      } else {
        this.isChain = elseBody instanceof If;
        this.elseBody = this.ensureExpressions(elseBody);
      }
      return this;
    };
    If.prototype.isStatement = function(o){
      var _ref;
      return this.statement || (o != null ? o.level : void 0) === LEVEL_TOP || this.bodyNode().isStatement(o) || ((_ref = this.elseBodyNode()) != null ? _ref.isStatement(o) : void 0);
    };
    If.prototype.compileNode = function(o){
      return this.isStatement(o) ? this.compileStatement(o) : this.compileExpression(o);
    };
    If.prototype.makeReturn = function(){
      if (this.isStatement()) {
        this.body && (this.body = this.ensureExpressions(this.body.makeReturn()));
        this.elseBody && (this.elseBody = this.ensureExpressions(this.elseBody.makeReturn()));
        return this;
      } else {
        return new Return(this);
      }
    };
    If.prototype.ensureExpressions = function(it){
      return it instanceof Expressions ? it : new Expressions([it]);
    };
    If.prototype.compileStatement = function(o){
      var body, child, cond, ifPart;
      child = del(o, 'chainChild');
      cond = this.condition.compile(o, LEVEL_PAREN);
      o.indent = this.idt(1);
      body = this.ensureExpressions(this.body).compile(o);
      if (body) {
        body = "\n" + body + "\n" + this.tab;
      }
      ifPart = "if (" + cond + ") {" + body + "}";
      if (!child) {
        ifPart = this.tab + ifPart;
      }
      if (!this.elseBody) {
        return ifPart;
      }
      return ifPart + ' else ' + (this.isChain ? this.elseBodyNode().compile(__import(o, {
        indent: this.tab,
        chainChild: true
      })) : "{\n" + this.elseBody.compile(o, LEVEL_TOP) + "\n" + this.tab + "}");
    };
    If.prototype.compileExpression = function(o){
      var code, _ref;
      code = this.condition.compile(o, LEVEL_COND) + ' ? ' + this.bodyNode().compile(o, LEVEL_LIST) + ' : ' + (((_ref = this.elseBodyNode()) != null ? _ref.compile(o, LEVEL_LIST) : void 0) || 'void 0');
      return o.level >= LEVEL_COND ? "(" + code + ")" : code;
    };
    If.prototype.unfoldSoak = function(){
      return this.soak && this;
    };
    If.unfoldSoak = function(o, parent, name){
      var ifn;
      if (!(ifn = parent[name].unfoldSoak(o))) {
        return;
      }
      parent[name] = ifn.body;
      ifn.body = new Value(parent);
      return ifn;
    };
    return If;
  }.call(this));
  Push = {
    wrap: function(name, exps){
      if (exps.isEmpty() || last(exps.expressions).containsPureStatement()) {
        return exps;
      }
      return exps.append(new Call(new Value(new Literal(name), [new Accessor(new Literal('push'))]), [exps.pop()]));
    }
  };
  Closure = {
    wrap: function(expressions, statement, noReturn){
      var args, call, func, mentionsArgs, meth;
      if (expressions.containsPureStatement()) {
        return expressions;
      }
      func = new Code([], Expressions.wrap([expressions]));
      args = [];
      if ((mentionsArgs = expressions.contains(this.literalArgs)) || expressions.contains(this.literalThis)) {
        meth = new Literal(mentionsArgs ? 'apply' : 'call');
        args = [new Literal('this')];
        if (mentionsArgs) {
          args.push(new Literal('arguments'));
        }
        func = new Value(func, [new Accessor(meth)]);
        func.noReturn = noReturn;
      }
      call = new Parens(new Call(func, args), true);
      return statement ? Expressions.wrap([call]) : call;
    },
    literalArgs: function(it){
      return it instanceof Literal && it.value === 'arguments';
    },
    literalThis: function(it){
      return it instanceof Literal && it.value === 'this' || it instanceof Code && it.bound;
    }
  };
  UTILITIES = {
    "extends": 'function(child, parent){\n  function ctor(){ this.constructor = child; }\n  ctor.prototype = parent.prototype;\n  child.prototype = new ctor;\n  if (typeof parent.extended == "function") parent.extended(child);\n  child.__super__ = parent.prototype;\n}',
    bind: 'function(func, context){\n  return function(){ return func.apply(context, arguments); };\n}',
    indexOf: 'Array.prototype.indexOf || function(item){\n  for (var i = 0, l = this.length; i < l; ++i)\n    if (this[i] === item) return i;\n  return -1;\n}',
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
  SIMPLENUM = /^[+-]?\d+$/;
  METHOD_DEF = /^(?:(\S+)\.prototype\.)?([$A-Za-z_][$\w]*)$/;
  utility = function(name){
    var ref;
    ref = "__" + name;
    Scope.root.assign(ref, UTILITIES[name]);
    return ref;
  };
  multident = function(code, tab){
    return code.replace(/\n/g, '$&' + tab);
  };
}).call(this);
