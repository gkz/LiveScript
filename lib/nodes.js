(function(){
  var Accessor, Arr, Assign, Base, Call, Case, Class, Code, Comment, Existence, Expressions, Extends, For, IDENTIFIER, If, Import, Index, LEVEL_ACCESS, LEVEL_COND, LEVEL_LIST, LEVEL_OP, LEVEL_PAREN, LEVEL_TOP, Literal, METHOD_DEF, NUMBER, Obj, Of, Op, Param, Parens, Return, SIMPLENUM, Scope, Splat, Switch, TAB, TRAILING_WHITESPACE, Throw, Try, UTILITIES, Value, While, del, multident, utility, __importAll = function(obj, src){
    for (var key in src) obj[key] = src[key];
    return obj;
  }, __extends = function(child, parent){
    function ctor(){ this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.superclass = parent;
    return child;
  };
  Scope = require('./scope').Scope;
  exports.Base = Base = (function(){
    function Base(){}
    Base.name = "Base";
    __importAll(Base.prototype, {
      compile: function(o, level){
        var code, node, tmp, _i, _len, _ref;
        o = __importAll({}, o);
        if (level != null) {
          o.level = level;
        }
        node = this.unfoldSoak(o) || this;
        node.tab = o.indent;
        if (o.level === LEVEL_TOP || node.isPureStatement() || !node.isStatement(o)) {
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
      },
      compileClosure: function(o){
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
      },
      literalThis: function(it){
        return it instanceof Literal && it.value === 'this' || it instanceof Code && it.bound;
      },
      cache: function(o, level, reused){
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
      },
      compileLoopReference: function(o, name){
        var src, tmp;
        src = tmp = this.compile(o, LEVEL_LIST);
        if (!(NUMBER.test(src) || IDENTIFIER.test(src) && o.scope.check(src))) {
          src = "" + (tmp = o.scope.temporary(name)) + " = " + src;
        }
        return [src, tmp];
      },
      makeReturn: function(){
        return Return(this);
      },
      contains: function(pred){
        var contains;
        contains = false;
        this.traverseChildren(false, function(it){
          if (pred(it)) {
            return !(contains = true);
          }
        });
        return contains;
      },
      containsType: function(type){
        return this instanceof type || this.contains(function(it){
          return it instanceof type;
        });
      },
      containsPureStatement: function(){
        return this.isPureStatement() || this.contains(function(it){
          return it.isPureStatement();
        });
      },
      eachChild: function(func){
        var child, name, node, _i, _j, _len, _len2, _ref;
        if (!this.children) {
          return this;
        }
        for (_i = 0, _len = (_ref = this.children).length; _i < _len; ++_i) {
          name = _ref[_i];
          if (child = this[name]) {
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
        }
        return this;
      },
      collectChildren: function(){
        var nodes;
        nodes = [];
        this.eachChild(function(it){
          return nodes.push(it);
        });
        return nodes;
      },
      traverseChildren: function(crossScope, func){
        return this.eachChild(function(child){
          if (false === func(child)) {
            return false;
          }
          return child.traverseChildren(crossScope, func);
        });
      },
      invert: function(){
        return Op('!', this);
      },
      unwrapAll: function(){
        var node;
        node = this;
        while (node !== (node = node.unwrap())) {
          continue;
        }
        return node;
      },
      children: [],
      isStatement: NO,
      isPureStatement: NO,
      isComplex: YES,
      isChainable: NO,
      isAssignable: NO,
      isArray: NO,
      isObject: NO,
      assigns: NO,
      unwrap: THIS,
      unfoldSoak: NO,
      unfoldAssign: NO
    });
    Base.prototype.toString = function(idt, override){
      var child, children, name;
      idt == null && (idt = '');
      children = (function(){
        var _i, _len, _ref, _results = [];
        for (_i = 0, _len = (_ref = this.collectChildren()).length; _i < _len; ++_i) {
          child = _ref[_i];
          _results.push(child.toString(idt + TAB));
        }
        return _results;
      }.call(this));
      name = override || this.constructor.name;
      if (this.soak) {
        name += '?';
      }
      return '\n' + idt + name + children.join('');
    };
    return Base;
  }());
  exports.Expressions = Expressions = (function(){
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
    __importAll(Expressions.prototype, {
      children: ['expressions'],
      append: function(it){
        this.expressions.push(it);
        return this;
      },
      prepend: function(it){
        this.expressions.unshift(it);
        return this;
      },
      pop: function(){
        return this.expressions.pop();
      },
      unwrap: function(){
        if (this.expressions.length === 1) {
          return this.expressions[0];
        } else {
          return this;
        }
      },
      isEmpty: function(){
        return !this.expressions.length;
      },
      isStatement: function(o){
        var exp, _i, _len, _ref;
        for (_i = 0, _len = (_ref = this.expressions).length; _i < _len; ++_i) {
          exp = _ref[_i];
          if (exp.isPureStatement() || exp.isStatement(o)) {
            return true;
          }
        }
        return false;
      },
      makeReturn: function(){
        var end, idx, _ref;
        for (idx = (_ref = this.expressions).length - 1; idx >= 0; --idx) {
          end = _ref[idx];
          if (!(end instanceof Comment)) {
            this.expressions[idx] = end.makeReturn();
            break;
          }
        }
        return this;
      },
      compile: function(o, level){
        o == null && (o = {});
        if (o.scope) {
          return Expressions.superclass.prototype.compile.call(this, o, level);
        } else {
          return this.compileRoot(o);
        }
      },
      compileNode: function(o){
        var code, codes, node, top, _i, _len, _ref;
        o.expressions = this;
        this.tab = o.indent;
        top = o.level === LEVEL_TOP;
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
      },
      compileRoot: function(o){
        var code;
        o.indent = this.tab = o.bare ? '' : TAB;
        o.scope = new Scope(null, this, null);
        o.level = LEVEL_TOP;
        code = this.compileWithDeclarations(o);
        code = code.replace(TRAILING_WHITESPACE, '');
        if (o.bare) {
          return code;
        } else {
          return "(function(){\n" + code + "\n}).call(this);\n";
        }
      },
      compileWithDeclarations: function(o){
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
      }
    });
    return Expressions;
  }());
  exports.Literal = Literal = (function(){
    __extends(Literal, Base);
    function _ctor(){}
    _ctor.prototype = Literal.prototype;
    function Literal(_arg){
      var _this = new _ctor;
      _this.value = _arg;
      return _this;
    }
    Literal.name = "Literal";
    __importAll(Literal.prototype, {
      makeReturn: function(){
        if (this.isPureStatement()) {
          return this;
        } else {
          return Return(this);
        }
      },
      isPureStatement: function(){
        var _ref;
        return (_ref = this.value) === "break" || _ref === "continue" || _ref === "debugger";
      },
      isAssignable: function(){
        return IDENTIFIER.test(this.value);
      },
      isComplex: NO,
      assigns: function(it){
        return it === this.value;
      },
      compile: function(){
        if (this.value.reserved) {
          return "\"" + this.value + "\"";
        } else {
          return this.value;
        }
      }
    });
    Literal.prototype.toString = function(){
      return ' "' + this.value + '"';
    };
    return Literal;
  }());
  exports.Return = Return = (function(){
    __extends(Return, Base);
    function _ctor(){}
    _ctor.prototype = Return.prototype;
    function Return(_arg){
      var _this = new _ctor;
      _this.expression = _arg;
      return _this;
    }
    Return.name = "Return";
    __importAll(Return.prototype, {
      children: ['expression'],
      isStatement: YES,
      isPureStatement: YES,
      makeReturn: THIS,
      compile: function(o, level){
        var exp, _ref;
        exp = (_ref = this.expression) != null ? _ref.makeReturn() : void 0;
        if (exp && !(exp instanceof Return)) {
          return exp.compile(o, level);
        } else {
          exp = (exp != null ? exp.expression : void 0) || '';
          return o.indent + ("return" + (exp && ' ' + exp.compile(o, LEVEL_PAREN)) + ";");
        }
      }
    });
    return Return;
  }());
  exports.Value = Value = (function(){
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
    __importAll(Value.prototype, {
      children: ["base", "properties"],
      append: function(it){
        this.properties.push(it);
        return this;
      },
      hasProperties: function(){
        return !!this.properties.length;
      },
      isArray: function(){
        return !this.properties.length && this.base instanceof Arr;
      },
      isObject: function(){
        return !this.properties.length && this.base instanceof Obj;
      },
      isComplex: function(){
        return !!this.properties.length || this.base.isComplex();
      },
      isAssignable: function(){
        return !!this.properties.length || this.base.isAssignable();
      },
      isStatement: function(o){
        return !this.properties.length && this.base.isStatement(o);
      },
      assigns: function(name){
        return !this.properties.length && this.base.assigns(name);
      },
      makeReturn: function(){
        if (this.properties.length) {
          return Value.superclass.prototype.makeReturn.call(this);
        } else {
          return this.base.makeReturn();
        }
      },
      unwrap: function(){
        if (this.properties.length) {
          return this;
        } else {
          return this.base;
        }
      },
      cacheReference: function(o){
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
      },
      compileNode: function(o){
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
      },
      substituteStar: function(o){
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
          if (prop instanceof Index) {
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
        }
        return null;
      },
      unfoldSoak: function(o){
        var fst, i, ifn, prop, ref, snd, _len, _ref;
        if (ifn = this.base.unfoldSoak(o)) {
          (_ref = ifn.body.properties).push.apply(_ref, this.properties);
          return ifn;
        }
        for (i = 0, _len = (_ref = this.properties).length; i < _len; ++i) {
          prop = _ref[i];
          if (prop.soak) {
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
        }
        return null;
      },
      unfoldAssign: function(o){
        var asn, i, lhs, prop, rhs, _len, _ref, _ref2;
        if (asn = this.base.unfoldAssign(o)) {
          (_ref = asn.value.properties).push.apply(_ref, this.properties);
          return asn;
        }
        for (i = 0, _len = (_ref = this.properties).length; i < _len; ++i) {
          prop = _ref[i];
          if (prop.assign) {
            prop.assign = false;
            _ref2 = Value(this.base, this.properties.slice(0, i)).cacheReference(o), lhs = _ref2[0], rhs = _ref2[1];
            asn = Assign(lhs, Value(rhs, this.properties.slice(i)), '=');
            asn.access = true;
            return asn;
          }
        }
        return null;
      }
    });
    return Value;
  }());
  exports.Comment = Comment = (function(){
    __extends(Comment, Base);
    function _ctor(){}
    _ctor.prototype = Comment.prototype;
    function Comment(_arg){
      var _this = new _ctor;
      _this.comment = _arg;
      return _this;
    }
    Comment.name = "Comment";
    __importAll(Comment.prototype, {
      isPureStatement: YES,
      isStatement: YES,
      makeReturn: THIS,
      compile: function(o, level){
        var code;
        code = '/*' + multident(this.comment, o.indent) + '*/';
        if ((level != null ? level : o.level) === LEVEL_TOP) {
          code = o.indent + code;
        }
        return code;
      }
    });
    return Comment;
  }());
  exports.Call = Call = (function(){
    __extends(Call, Base);
    function _ctor(){}
    _ctor.prototype = Call.prototype;
    function Call(variable, _arg, _arg2){
      var _this = new _ctor;
      _this.args = _arg != null ? _arg : [];
      _this.soak = _arg2;
      _this["new"] = '';
      _this.isSuper = variable === 'super';
      _this.variable = _this.isSuper ? null : variable;
      return _this;
    }
    Call.name = "Call";
    __importAll(Call.prototype, {
      children: ["variable", "args"],
      newInstance: function(){
        this["new"] = 'new ';
        return this;
      },
      superReference: function(o){
        var clas, method, name;
        method = o.scope.method;
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
      },
      unfoldSoak: function(o){
        var call, ifn, left, rite, _i, _len, _ref;
        if (this.soak) {
          if (this.variable) {
            if (ifn = If.unfoldSoak(o, this, 'variable')) {
              return ifn;
            }
            _ref = Value(this.variable).cacheReference(o), left = _ref[0], rite = _ref[1];
          } else {
            left = Literal(this.superReference(o));
            rite = Value(left);
          }
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
      },
      digCalls: function(){
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
      },
      compileNode: function(o){
        var arg, args, asn, call, code, vr, _i, _len, _ref;
        if (vr = this.variable) {
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
              call.variable = asn.value;
              asn.value = Value(call);
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
          var _i, _len, _ref, _results = [];
          for (_i = 0, _len = (_ref = this.args).length; _i < _len; ++_i) {
            arg = _ref[_i];
            _results.push(arg.compile(o, LEVEL_LIST));
          }
          return _results;
        }.call(this)).join(', ');
        if (this.isSuper) {
          return this.superReference(o) + (".call(this" + (args && ', ' + args) + ")");
        } else {
          return this["new"] + this.variable.compile(o, LEVEL_ACCESS) + ("(" + args + ")");
        }
      },
      compileSplat: function(o, splatargs){
        var base, fun, idt, name, ref;
        if (this.isSuper) {
          return this.superReference(o) + (".apply(this, " + splatargs + ")");
        }
        if (this["new"]) {
          idt = this.tab + TAB;
          return "(function(func, args, ctor){\n" + idt + "ctor.prototype = func.prototype;\n" + idt + "var child = new ctor, result = func.apply(child, args);\n" + idt + "return result === Object(result) ? result : child;\n" + this.tab + "}(" + this.variable.compile(o, LEVEL_LIST) + ", " + splatargs + ", function(){}))";
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
        return "" + fun + ".apply(" + ref + ", " + splatargs + ")";
      }
    });
    return Call;
  }());
  exports.Extends = Extends = (function(){
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
    __importAll(Extends.prototype, {
      children: ["child", "parent"],
      compile: function(o){
        return Call(Value(Literal(utility('extends'))), [this.child, this.parent]).compile(o);
      }
    });
    return Extends;
  }());
  exports.Import = Import = (function(){
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
    __importAll(Import.prototype, {
      children: ["left", "right"],
      compile: function(o){
        return Call(Value(Literal(utility(this.util))), [this.left, this.right]).compile(o);
      }
    });
    return Import;
  }());
  exports.Accessor = Accessor = (function(){
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
    __importAll(Accessor.prototype, {
      children: ['name'],
      compile: function(o){
        var name, _ref;
        if ((_ref = (name = this.name.compile(o)).charAt(0)) === "\"" || _ref === "\'") {
          return "[" + name + "]";
        } else {
          return "." + name;
        }
      },
      isComplex: NO
    });
    Accessor.prototype.toString = function(idt){
      return Accessor.superclass.prototype.toString.call(this, idt, this.constructor.name + (this.assign ? '=' : ''));
    };
    return Accessor;
  }());
  exports.Index = Index = (function(){
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
    __importAll(Index.prototype, {
      children: ['index'],
      compile: function(o){
        return "[" + this.index.compile(o, LEVEL_PAREN) + "]";
      },
      isComplex: function(){
        return this.index.isComplex();
      }
    });
    Index.prototype.toString = Accessor.prototype.toString;
    return Index;
  }());
  exports.Obj = Obj = (function(){
    __extends(Obj, Base);
    function _ctor(){}
    _ctor.prototype = Obj.prototype;
    function Obj(props){
      var _this = new _ctor;
      _this.objects = _this.properties = props || [];
      return _this;
    }
    Obj.name = "Obj";
    __importAll(Obj.prototype, {
      children: ['properties'],
      isObject: YES,
      assigns: function(name){
        var prop, _i, _len, _ref;
        for (_i = 0, _len = (_ref = this.properties).length; _i < _len; ++_i) {
          prop = _ref[_i];
          if (prop.assigns(name)) {
            return true;
          }
        }
        return false;
      },
      compileNode: function(o){
        var code, i, idt, lastIndex, lastNonComment, prop, props, rest, _i, _len;
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
          if (prop instanceof Splat || (prop.variable || prop).base instanceof Parens) {
            rest = props.splice(i, 1 / 0);
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
        idt = o.indent += TAB;
        for (i = 0, _len = props.length; i < _len; ++i) {
          prop = props[i];
          if (!(prop instanceof Comment)) {
            code += idt;
          }
          code += prop instanceof Value && prop["this"] ? Assign(prop.properties[0].name, prop, ':').compile(o) : !(prop instanceof Assign || prop instanceof Comment) ? Assign(prop, prop, ':').compile(o) : prop.compile(o, LEVEL_TOP);
          code += i === lastIndex ? '' : prop === lastNonComment || prop instanceof Comment ? '\n' : ',\n';
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
      },
      compileDynamic: function(o, code, props){
        var acc, i, impt, key, oref, prop, ref, sp, val, _len, _ref;
        this.temps = [];
        for (i = 0, _len = props.length; i < _len; ++i) {
          prop = props[i];
          if (sp = prop instanceof Splat) {
            impt = Import(Literal(oref || code), prop.name, true).compile(o);
            code = oref ? code + ', ' + impt : impt;
            continue;
          }
          if (prop instanceof Comment) {
            code += ' ' + prop.compile(o, LEVEL_LIST);
            continue;
          }
          if (!oref) {
            this.temps.push(oref = o.scope.temporary('obj'));
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
              this.temps.push(ref = val);
            }
          }
          key = acc instanceof Literal && IDENTIFIER.test(key) ? '.' + key : '[' + key + ']';
          code += ', ' + oref + key + ' = ' + val;
        }
        if (!sp) {
          code += ', ' + oref;
        }
        if (o.level <= LEVEL_PAREN) {
          return code;
        } else {
          return "(" + code + ")";
        }
      }
    });
    return Obj;
  }());
  exports.Arr = Arr = (function(){
    __extends(Arr, Base);
    function _ctor(){}
    _ctor.prototype = Arr.prototype;
    function Arr(_arg){
      var _this = new _ctor;
      _this.objects = _arg != null ? _arg : [];
      return _this;
    }
    Arr.name = "Arr";
    __importAll(Arr.prototype, {
      children: ['objects'],
      isArray: YES,
      assigns: function(name){
        var obj, _i, _len, _ref;
        for (_i = 0, _len = (_ref = this.objects).length; _i < _len; ++_i) {
          obj = _ref[_i];
          if (obj.assigns(name)) {
            return true;
          }
        }
        return false;
      },
      compileNode: function(o){
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
      }
    });
    return Arr;
  }());
  exports.Class = Class = (function(){
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
    __importAll(Class.prototype, {
      children: ["variable", "parent", "body"],
      compileNode: function(o){
        var clas, ctor, decl, exps, i, last, lname, name, node, proto, _len, _ref;
        if (this.variable) {
          decl = (last = (_ref = this.variable.properties)[_ref.length - 1]) ? last instanceof Accessor && last.name.value : this.variable.base.value;
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
            exps[i] = Import(proto, node);
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
            ctor.body.append(Call('super', [Splat(Literal('arguments'))]));
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
      }
    });
    return Class;
  }());
  exports.Assign = Assign = (function(){
    __extends(Assign, Base);
    function _ctor(){}
    _ctor.prototype = Assign.prototype;
    function Assign(_arg, _arg2, _arg3){
      var _this = new _ctor;
      _this.variable = _arg;
      _this.value = _arg2;
      _this.context = _arg3;
      return _this;
    }
    Assign.name = "Assign";
    __importAll(Assign.prototype, {
      children: ["variable", "value"],
      assigns: function(name){
        return this[this.context === ':' ? 'value' : 'variable'].assigns(name);
      },
      unfoldSoak: function(o){
        return If.unfoldSoak(o, this, 'variable');
      },
      unfoldAssign: function(){
        return this.access && this;
      },
      compileNode: function(o){
        var match, name, val, value, variable, _ref;
        variable = this.variable, value = this.value;
        if (variable.isArray() || variable.isObject()) {
          return this.compileDestructuring(o);
        }
        if ((_ref = this.context) === "||=" || _ref === "&&=" || _ref === "?=") {
          return this.compileConditional(o);
        }
        name = variable.compile(o, LEVEL_LIST);
        if ((value instanceof Code || value instanceof Class) && (match = METHOD_DEF.exec(name))) {
          if (match[1]) {
            value.clas = match[1];
          }
          value.name || (value.name = match[2]);
        }
        val = value.compile(o, LEVEL_LIST);
        if (this.context === ':') {
          return name + ': ' + val;
        }
        if (!variable.isAssignable()) {
          throw SyntaxError("\"" + this.variable.compile(o) + "\" cannot be assigned");
        }
        if (!(variable instanceof Value && variable.hasProperties())) {
          if (this.context) {
            if (!o.scope.check(name, true)) {
              throw SyntaxError("assignment to undeclared variable \"" + name + "\"");
            }
          } else {
            o.scope.declare(name);
          }
        }
        name += (" " + (this.context || '=') + " ") + val;
        if (o.level <= LEVEL_LIST) {
          return name;
        } else {
          return "(" + name + ")";
        }
      },
      compileDestructuring: function(o){
        var acc, assigns, code, i, idx, isObject, ivar, obj, objects, olen, ref, rest, splat, top, val, value, vvar, _len, _ref, _ref2;
        top = o.level === LEVEL_TOP;
        value = this.value;
        objects = this.variable.unwrap().objects;
        if (!(olen = objects.length)) {
          return value.compile(o);
        }
        isObject = this.variable.isObject();
        if (top && olen === 1 && !((obj = objects[0]) instanceof Splat)) {
          if (obj instanceof Assign) {
            _ref = obj, (_ref2 = _ref.variable, idx = _ref2.base, _ref2), obj = _ref.value;
          } else {
            if (obj.base instanceof Parens) {
              _ref = Value(obj.unwrapAll()).cacheReference(o), obj = _ref[0], idx = _ref[1];
            } else {
              idx = isObject ? (obj["this"] ? obj.properties[0].name : obj) : Literal(0);
            }
          }
          acc = IDENTIFIER.test(idx.unwrap().value || 0);
          val = Value(value).append((acc ? Accessor : Index)(idx));
          return Assign(obj, val, this.context).compile(o);
        }
        vvar = value.compile(o, LEVEL_LIST);
        assigns = [];
        splat = false;
        if (!IDENTIFIER.test(vvar) || this.variable.assigns(vvar)) {
          assigns.push("" + (ref = o.scope.temporary('ref')) + " = " + vvar);
          vvar = ref;
        }
        for (i = 0, _len = objects.length; i < _len; ++i) {
          obj = objects[i];
          idx = i;
          if (isObject) {
            if (obj instanceof Assign) {
              _ref = obj, (_ref2 = _ref.variable, idx = _ref2.base, _ref2), obj = _ref.value;
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
              obj = obj.name.compile(o);
              throw SyntaxError("multiple splats are disallowed in an assignment: " + obj + " ...");
            }
            acc = typeof idx === 'number' ? (idx = Literal(splat || idx), false) : isObject && IDENTIFIER.test(idx.unwrap().value || 0);
            val = Value(Literal(vvar), [(acc ? Accessor : Index)(idx)]);
          }
          assigns.push(Assign(obj, val, this.context).compile(o, LEVEL_LIST));
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
      },
      compileConditional: function(o){
        var left, rite, _ref;
        _ref = this.variable.cacheReference(o), left = _ref[0], rite = _ref[1];
        return Op(this.context.slice(0, -1), left, Assign(rite, this.value, '=')).compile(o);
      }
    });
    return Assign;
  }());
  exports.Code = Code = (function(){
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
    __importAll(Code.prototype, {
      children: ["params", "body"],
      isStatement: function(){
        return !!this.statement;
      },
      makeReturn: function(){
        if (this.statement) {
          this.returns = true;
          return this;
        } else {
          return Return(this);
        }
      },
      compileNode: function(o){
        var body, code, exps, i, name, p, param, params, pscope, ref, scope, splats, sscope, statement, tab, v, val, vars, wasEmpty, _i, _len, _ref;
        pscope = o.scope;
        sscope = pscope.shared || pscope;
        scope = o.scope = new Scope((this.wrapper ? pscope : sscope), this.body, this);
        if (this.wrapper) {
          scope.shared = sscope;
        }
        delete o.bare;
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
      },
      traverseChildren: function(crossScope, func){
        if (crossScope) {
          return Code.superclass.prototype.traverseChildren.call(this, crossScope, func);
        }
      }
    });
    return Code;
  }());
  exports.Param = Param = (function(){
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
    __importAll(Param.prototype, {
      children: ["name", "value"],
      compile: function(o){
        return this.name.compile(o, LEVEL_LIST);
      },
      asReference: function(o){
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
      },
      isComplex: function(){
        return this.name.isComplex();
      }
    });
    return Param;
  }());
  exports.Splat = Splat = (function(){
    __extends(Splat, Base);
    function _ctor(){}
    _ctor.prototype = Splat.prototype;
    function Splat(name){
      var _this = new _ctor;
      _this.name = name.compile ? name : Literal(name);
      return _this;
    }
    Splat.name = "Splat";
    __importAll(Splat.prototype, {
      children: ['name'],
      isAssignable: YES,
      assigns: function(it){
        return this.name.assigns(it);
      },
      compile: function(){
        var _ref;
        return (_ref = this.name).compile.apply(_ref, arguments);
      }
    });
    Splat.compileArray = function(o, list, apply){
      var args, base, code, i, index, node, _len;
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
    __extends(While, Base);
    function _ctor(){}
    _ctor.prototype = While.prototype;
    function While(cond, options){
      var _this = new _ctor;
      options == null && (options = {});
      _this.condition = options.name === 'until' ? cond.invert() : cond;
      _this.guard = options.guard;
      return _this;
    }
    While.name = "While";
    __importAll(While.prototype, {
      children: ["condition", "guard", "body"],
      isStatement: YES,
      addBody: function(_arg){
        this.body = _arg;
        return this;
      },
      makeReturn: function(){
        this.returns = true;
        return this;
      },
      makePush: function(o, body){
        var exps, last, res;
        exps = body.expressions;
        if ((last = exps[exps.length - 1]) && !last.containsPureStatement() && !(last instanceof Throw)) {
          o.scope.assign('_results', '[]');
          exps[exps.length - 1] = Call(Literal('_results.push'), [last]);
          res = '_results';
        }
        return "\n" + this.tab + "return " + (res || '[]') + ";";
      },
      containsPureStatement: function(){
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
      },
      compileNode: function(o){
        var body, code, ret, set;
        o.indent += TAB;
        code = this.condition.compile(o, LEVEL_PAREN);
        set = '';
        body = this.body;
        if (body.isEmpty()) {
          body = '';
        } else {
          if (this.returns) {
            ret = this.makePush(o, body);
          }
          if (this.guard) {
            body = If(this.guard, body, {
              'statement': 'statement'
            });
          }
          body = "\n" + body.compile(o, LEVEL_TOP) + "\n" + this.tab;
        }
        code = set + this.tab + (code === 'true' ? 'for (;;' : "while (" + code);
        code += ") {" + body + "}";
        if (ret) {
          code += ret;
        }
        return code;
      }
    });
    return While;
  }());
  exports.Op = Op = (function(){
    var INVERSIONS, key, val;
    __extends(Op, Base);
    function _ctor(){}
    _ctor.prototype = Op.prototype;
    function Op(op, first, second, flip){
      var args, _this = new _ctor;
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
        if (first instanceof Call) {
          return first.newInstance();
        }
        if (first instanceof Code && first.bound) {
          first = Parens(first, true);
        }
      }
      _this.operator = op;
      _this.first = first;
      _this.second = second;
      _this.flip = !!flip;
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
    __importAll(Op.prototype, {
      children: ["first", "second"],
      isUnary: function(){
        return !this.second;
      },
      isChainable: function(){
        var _ref;
        return (_ref = this.operator) === "<" || _ref === ">" || _ref === ">=" || _ref === "<=" || _ref === "===" || _ref === "!==" || _ref === "==" || _ref === "!=";
      },
      invert: function(){
        var op;
        if (op = INVERSIONS[this.operator]) {
          this.operator = op;
          return this;
        } else if (this.second) {
          return Parens(this).invert();
        } else {
          return Op('!', this);
        }
      },
      unfoldSoak: function(o){
        var _ref;
        return ((_ref = this.operator) === "++" || _ref === "--" || _ref === "delete") && If.unfoldSoak(o, this, 'first');
      },
      compileNode: function(o){
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
      },
      compileChain: function(o){
        var code, ref, sub, _ref;
        _ref = this.first.second.cache(o), sub = _ref[0], ref = _ref[1];
        this.first.second = sub;
        code = this.first.compile(o, LEVEL_OP);
        if (code.charAt(0) === '(') {
          code = code.slice(1, -1);
        }
        code += " && " + ref.compile(o) + " " + this.operator + " " + this.second.compile(o, LEVEL_OP);
        if (sub !== ref) {
          o.scope.free(ref.value);
        }
        if (o.level < LEVEL_OP) {
          return code;
        } else {
          return "(" + code + ")";
        }
      },
      compileExistence: function(o){
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
      },
      compileUnary: function(o){
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
        if (o.level <= LEVEL_OP) {
          return code;
        } else {
          return "(" + code + ")";
        }
      },
      compileMultiIO: function(o){
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
      }
    });
    Op.prototype.toString = function(idt){
      return Op.superclass.prototype.toString.call(this, idt, this.constructor.name + ' ' + this.operator);
    };
    return Op;
  }());
  exports.Of = Of = (function(){
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
    __importAll(Of.prototype, {
      children: ["object", "array"],
      invert: NEGATE,
      compileNode: function(o){
        if (this.array.isArray()) {
          return this.compileOrTest(o);
        } else {
          return this.compileLoopTest(o);
        }
      },
      compileOrTest: function(o){
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
      },
      compileLoopTest: function(o){
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
      }
    });
    Of.prototype.toString = function(idt){
      return Of.superclass.prototype.toString.call(this, idt, this.constructor.name + (this.negated ? '!' : ''));
    };
    return Of;
  }());
  exports.Try = Try = (function(){
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
    __importAll(Try.prototype, {
      children: ["attempt", "recovery", "ensure"],
      isStatement: YES,
      makeReturn: function(){
        this.attempt && (this.attempt = this.attempt.makeReturn());
        this.recovery && (this.recovery = this.recovery.makeReturn());
        return this;
      },
      compileNode: function(o){
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
      }
    });
    return Try;
  }());
  exports.Throw = Throw = (function(){
    __extends(Throw, Base);
    function _ctor(){}
    _ctor.prototype = Throw.prototype;
    function Throw(_arg){
      var _this = new _ctor;
      _this.expression = _arg;
      return _this;
    }
    Throw.name = "Throw";
    __importAll(Throw.prototype, {
      children: ['expression'],
      isStatement: YES,
      makeReturn: THIS,
      compile: function(o){
        return o.indent + ("throw " + this.expression.compile(o, LEVEL_PAREN) + ";");
      }
    });
    return Throw;
  }());
  exports.Existence = Existence = (function(){
    __extends(Existence, Base);
    function _ctor(){}
    _ctor.prototype = Existence.prototype;
    function Existence(_arg){
      var _this = new _ctor;
      _this.expression = _arg;
      return _this;
    }
    Existence.name = "Existence";
    __importAll(Existence.prototype, {
      children: ['expression'],
      invert: NEGATE,
      compileNode: function(o){
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
      }
    });
    return Existence;
  }());
  exports.Parens = Parens = (function(){
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
    __importAll(Parens.prototype, {
      children: ['expression'],
      unwrap: function(){
        return this.expression;
      },
      isComplex: function(){
        return this.expression.isComplex();
      },
      makeReturn: function(){
        return this.expression.makeReturn();
      },
      compileNode: function(o){
        var code, expr;
        expr = this.expression;
        expr.front = this.front;
        if (!this.keep && ((expr instanceof Value || expr instanceof Call || expr instanceof Code || expr instanceof Parens) || o.level < LEVEL_OP && expr instanceof Op)) {
          return expr.compile(o);
        }
        code = expr.compile(o, LEVEL_PAREN);
        if (expr.isStatement()) {
          return code;
        } else {
          return "(" + code + ")";
        }
      }
    });
    return Parens;
  }());
  exports.For = For = (function(){
    __extends(For, While);
    function _ctor(){}
    _ctor.prototype = For.prototype;
    function For(head, _arg){
      var _this = new _ctor;
      _this.body = _arg;
      __importAll(_this, head);
      if (_this.index instanceof Value && !(_this.index = _this.index.base.value)) {
        throw SyntaxError('invalid index variable: ' + head.index);
      }
      return _this;
    }
    For.name = "For";
    __importAll(For.prototype, {
      children: ["source", "name", "from", "to", "step", "guard", "body"],
      compileNode: function(o){
        var body, code, cond, eq, forPart, index, lvar, name, ownPart, pvar, ret, scope, srcPart, step, svar, tail, tvar, vars, _ref;
        body = this.body, index = this.index;
        scope = o.scope;
        this.temps = [];
        if (index) {
          scope.declare(index);
        } else {
          this.temps.push(index = scope.temporary('i'));
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
          vars = index + ' = ' + this.from.compile(o);
          if (tail !== tvar) {
            vars += ', ' + tail;
            this.temps.push(tvar);
          }
          cond = +pvar ? "" + index + " " + (pvar < 0 ? '>' : '<') + eq + " " + tvar : "" + pvar + " < 0 ? " + index + " >" + eq + " " + tvar + " : " + index + " <" + eq + " " + tvar;
        } else {
          if (this.name || this.object && this.own) {
            _ref = this.source.compileLoopReference(o, 'ref'), srcPart = _ref[0], svar = _ref[1];
            if (srcPart !== svar) {
              this.temps.push(svar);
            }
          } else {
            srcPart = svar = this.source.compile(o, LEVEL_PAREN);
          }
          if (this.name) {
            name = Assign(this.name, Literal(svar + ("[" + index + "]"))).compile(o, LEVEL_TOP);
          }
          if (!this.object) {
            if (srcPart !== svar) {
              srcPart = "(" + srcPart + ")";
            }
            if (0 > pvar && (pvar | 0) === +pvar) {
              vars = "" + index + " = " + srcPart + ".length - 1";
              cond = "" + index + " >= 0";
            } else {
              this.temps.push(lvar = scope.temporary('len'));
              vars = "" + index + " = 0, " + lvar + " = " + srcPart + ".length";
              cond = "" + index + " < " + lvar;
            }
          }
        }
        if (this.object) {
          forPart = index + ' in ' + srcPart;
          if (this.own) {
            ownPart = "if (" + utility('owns') + ".call(" + svar + ", " + index + ")) ";
          }
        } else {
          if (step !== pvar) {
            vars += ', ' + step;
          }
          forPart = vars + ("; " + cond + "; ") + (function(){
            switch (+pvar) {
            case 1:
              return '++' + index;
            case -1:
              return '--' + index;
            default:
              return index + (pvar < 0 ? ' -= ' + pvar.slice(1) : ' += ' + pvar);
            }
          }());
        }
        code = '';
        if (!((_ref = this.name) != null ? _ref.isComplex() : void 0)) {
          code += this.pluckDirectCalls(o, body, (_ref = this.name) != null ? _ref.compile(o, LEVEL_LIST) : void 0, index);
        }
        o.indent += TAB;
        code += this.tab + ("for (" + forPart + ") " + (ownPart || '') + "{");
        if (name) {
          code += '\n' + o.indent + name + ';';
        }
        if (!body.isEmpty()) {
          if (this.returns) {
            ret = this.makePush(o, body);
          }
          if (this.guard) {
            body = If(this.guard, body, {
              'statement': 'statement'
            });
          }
          if (body = body.compile(o, LEVEL_TOP)) {
            code += '\n' + body + '\n' + this.tab;
          }
        }
        return code + '}' + (ret || '');
      },
      pluckDirectCalls: function(o, body, name, index){
        var a, args, base, defs, exp, fn, i, idx, ref, val, _len, _len2, _ref, _ref2;
        defs = '';
        for (idx = 0, _len = (_ref = body.expressions).length; idx < _len; ++idx) {
          exp = _ref[idx];
          if ((exp = exp.unwrapAll()) instanceof Call) {
            val = exp.variable.unwrapAll();
            if (!(val instanceof Code && !exp.args.length || val instanceof Value && val.base instanceof Code && val.properties.length === 1 && ((_ref2 = val.properties[0].name) != null ? _ref2.value : void 0) === 'call')) {
              continue;
            }
            this.temps.push(ref = o.scope.temporary('fn'));
            fn = val.base || val;
            base = Value(ref = Literal(ref));
            args = [].concat(name || [], index || []);
            if (this.object) {
              args.reverse();
            }
            for (i = 0, _len2 = args.length; i < _len2; ++i) {
              a = args[i];
              fn.params.push(Param(args[i] = Literal(a)));
            }
            if (val.base) {
              _ref2 = [base, val], val.base = _ref2[0], base = _ref2[1];
              args.unshift(Literal('this'));
            }
            body.expressions[idx] = Call(base, args);
            defs += this.tab + Assign(ref, fn, '=').compile(o, LEVEL_TOP) + ';\n';
          }
        }
        return defs;
      }
    });
    return For;
  }());
  exports.Switch = Switch = (function(){
    __extends(Switch, Base);
    function _ctor(){}
    _ctor.prototype = Switch.prototype;
    function Switch(_arg, _arg2, _arg3){
      var cs, test, _i, _len, _ref, _this = new _ctor;
      _this.subject = _arg;
      _this.cases = _arg2;
      _this.otherwise = _arg3;
      if (_this.subject) {
        return _this;
      }
      _this.subject = Literal(false);
      for (_i = 0, _len = (_ref = _this.cases).length; _i < _len; ++_i) {
        cs = _ref[_i];
        cs.tests = (function(){
          var _i, _len, _ref, _results = [];
          for (_i = 0, _len = (_ref = cs.tests).length; _i < _len; ++_i) {
            test = _ref[_i];
            _results.push(test.invert());
          }
          return _results;
        }());
      }
      return _this;
    }
    Switch.name = "Switch";
    __importAll(Switch.prototype, {
      children: ["subject", "cases", "otherwise"],
      isStatement: YES,
      makeReturn: function(){
        var cs, _i, _len, _ref;
        for (_i = 0, _len = (_ref = this.cases).length; _i < _len; ++_i) {
          cs = _ref[_i];
          cs.body.makeReturn();
        }
        if ((_ref = this.otherwise) != null) {
          _ref.makeReturn();
        }
        return this;
      },
      compileNode: function(o){
        var code, cs, exp, i, lastIndex, tab, _i, _len, _ref, _ref2;
        o.indent += TAB;
        tab = this.tab;
        code = tab + ("switch (" + this.subject.compile(o, LEVEL_PAREN) + ") {\n");
        lastIndex = this.otherwise ? -1 : this.cases.length - 1;
        for (i = 0, _len = (_ref = this.cases).length; i < _len; ++i) {
          cs = _ref[i];
          code += cs.compile(o, tab);
          if (i === lastIndex) {
            break;
          }
          for (_i = (_ref2 = cs.body.expressions).length - 1; _i >= 0; --_i) {
            exp = _ref2[_i];
            if (!(exp instanceof Comment)) {
              if (!(exp instanceof Return)) {
                code += o.indent + 'break;\n';
              }
              break;
            }
          }
        }
        if (this.otherwise) {
          code += tab + ("default:\n" + this.otherwise.compile(o, LEVEL_TOP) + "\n");
        }
        return code + tab + '}';
      }
    });
    return Switch;
  }());
  exports.Case = Case = (function(){
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
    __importAll(Case.prototype, {
      children: ["tests", "body"],
      compile: function(o, tab){
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
      }
    });
    return Case;
  }());
  exports.If = If = (function(){
    __extends(If, Base);
    function _ctor(){}
    _ctor.prototype = If.prototype;
    function If(cond, _arg, options){
      var _this = new _ctor;
      _this.body = _arg;
      options == null && (options = {});
      _this.condition = options.name === 'unless' ? cond.invert() : cond;
      _this.elseBody = null;
      _this.isChain = false;
      _this.soak = options.soak, _this.statement = options.statement;
      return _this;
    }
    If.name = "If";
    __importAll(If.prototype, {
      children: ["condition", "body", "elseBody"],
      bodyNode: function(){
        var _ref;
        return (_ref = this.body) != null ? _ref.unwrap() : void 0;
      },
      elseBodyNode: function(){
        var _ref;
        return (_ref = this.elseBody) != null ? _ref.unwrap() : void 0;
      },
      addElse: function(elseBody){
        if (this.isChain) {
          this.elseBodyNode().addElse(elseBody);
        } else {
          this.isChain = elseBody instanceof If;
          this.elseBody = Expressions(elseBody);
        }
        return this;
      },
      isStatement: function(o){
        var _ref;
        return this.statement || (o != null ? o.level : void 0) === LEVEL_TOP || this.bodyNode().isStatement(o) || ((_ref = this.elseBodyNode()) != null ? _ref.isStatement(o) : void 0);
      },
      compileNode: function(o){
        if (this.isStatement(o)) {
          return this.compileStatement(o);
        } else {
          return this.compileExpression(o);
        }
      },
      makeReturn: function(){
        this.body && (this.body = Expressions(this.body.makeReturn()));
        this.elseBody && (this.elseBody = Expressions(this.elseBody.makeReturn()));
        return this;
      },
      compileStatement: function(o){
        var body, child, cond, ifPart;
        child = del(o, 'chainChild');
        cond = this.condition.compile(o, LEVEL_PAREN);
        o.indent += TAB;
        body = Expressions(this.body).compile(o);
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
        return ifPart + ' else ' + (this.isChain ? (o.indent = this.tab, o.chainChild = true, this.elseBody.unwrap().compile(o, LEVEL_TOP)) : "{\n" + this.elseBody.compile(o, LEVEL_TOP) + "\n" + this.tab + "}");
      },
      compileExpression: function(o){
        var code, _ref;
        code = this.condition.compile(o, LEVEL_COND) + ' ? ' + this.bodyNode().compile(o, LEVEL_LIST) + ' : ' + (((_ref = this.elseBodyNode()) != null ? _ref.compile(o, LEVEL_LIST) : void 0) || 'void 0');
        if (o.level >= LEVEL_COND) {
          return "(" + code + ")";
        } else {
          return code;
        }
      },
      unfoldSoak: function(){
        return this.soak && this;
      }
    });
    If.unfoldSoak = function(o, parent, name){
      var ifn;
      if (!(ifn = parent[name].unfoldSoak(o))) {
        return;
      }
      parent[name] = ifn.body;
      ifn.body = Value(parent);
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
    bind: 'function(func, context){\n  return function(){ return func.apply(context, arguments); };\n}',
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
}).call(this);
