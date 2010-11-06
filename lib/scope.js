(function(){
  var Scope, __importAll = function(obj, src){
    for (var key in src) obj[key] = src[key];
    return obj;
  };
  exports.Scope = Scope = function(_arg, _arg2, _arg3){
    this.parent = _arg;
    this.expressions = _arg2;
    this.method = _arg3;
    this.variables = [
      {
        name: 'arguments',
        type: 'arguments'
      }
    ];
    this.positions = {};
    if (!this.parent) {
      return Scope.root = this;
    }
  };
  __importAll(Scope.prototype, {
    add: function(name, type){
      var pos;
      if (typeof (pos = this.positions[name]) === 'number') {
        return this.variables[pos].type = type;
      } else {
        return this.positions[name] = -1 + this.variables.push({
          name: name,
          type: type
        });
      }
    },
    find: function(name, above){
      if (this.check(name, above)) {
        return true;
      }
      this.add(name, 'var');
      return false;
    },
    any: function(fn){
      var v, _i, _len, _ref;
      _ref = this.variables;
      for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
        v = _ref[_i];
        if (fn(v)) {
          return true;
        }
      }
      return false;
    },
    parameter: function(it){
      return this.add(it, 'param');
    },
    free: function(it){
      return this.add(it, 'reuse');
    },
    check: function(name, above){
      var found, _ref;
      found = !!this.type(name);
      if (found || !above) {
        return found;
      }
      return !!((_ref = this.parent) != null ? _ref.check(name, above) : void 0);
    },
    pickTemp: function(name, index){
      return '_' + (name.length > 1 ? name + (index > 1 ? index : '') : (index + parseInt(name, 36)).toString(36).replace(/\d/g, 'a'));
    },
    type: function(name){
      var v, _i, _len, _ref;
      _ref = this.variables;
      for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
        v = _ref[_i];
        if (v.name === name) {
          return v.type;
        }
      }
      return null;
    },
    temporary: function(name){
      var index, temp;
      index = 0;
      while (this.check(temp = this.pickTemp(name, index)) && this.type(temp) !== 'reuse') {
        index++;
      }
      this.add(temp, 'var');
      return temp;
    },
    assign: function(name, value){
      return this.add(name, {
        value: value,
        assigned: true
      });
    },
    hasDeclarations: function(body){
      return body === this.expressions && this.any(function(it){
        var _ref;
        return (_ref = it.type) === "var" || _ref === "reuse";
      });
    },
    hasAssignments: function(body){
      return body === this.expressions && this.any(function(it){
        return it.type.assigned;
      });
    },
    declaredVariables: function(){
      var tmp, usr, v, _i, _len, _ref, _ref2;
      usr = [];
      tmp = [];
      _ref = this.variables;
      for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
        v = _ref[_i];
        if ((_ref2 = v.type) === "var" || _ref2 === "reuse") {
          (v.name.charAt(0) === '_' ? tmp : usr).push(v.name);
        }
      }
      return usr.sort().concat(tmp.sort());
    },
    assignedVariables: function(){
      var v, _i, _len, _ref, _result;
      _ref = this.variables;
      _result = [];
      for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
        v = _ref[_i];
        if (v.type.assigned) {
          _result.push(v.name + ' = ' + v.type.value);
        }
      }
      return _result;
    }
  });
}).call(this);
