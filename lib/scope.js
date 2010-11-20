(function(){
  var _ref;
  _ref = (exports.Scope = function(parent, expressions, method){
    this.parent = parent;
    this.expressions = expressions;
    this.method = method;
    this.variables = [
      {
        name: 'arguments',
        type: 'arguments'
      }
    ];
    this.positions = {
      arguments: 0
    };
    if (!this.parent) {
      this.constructor.root = this;
    }
    return this;
  }).prototype;
  _ref.add = function(name, type){
    var pos, v;
    if (name === "arguments" || name === "eval") {
      throw SyntaxError("redefining \"" + name + "\" is deprecated");
    }
    if (v = this.variables[pos = this.positions[name]]) {
      if ('function' === type || 'function' === v.type) {
        throw SyntaxError("redeclaration of \"" + name + "\"");
      }
      this.variables[pos].type = type;
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
    if ((_ref = scope.type(name)) !== "var" && _ref !== "param") {
      scope.add(name, 'var');
    }
    return this;
  };
  _ref.parameter = function(it){
    return this.add(it, 'param');
  };
  _ref.free = function(it){
    return this.add(it, 'reuse');
  };
  _ref.check = function(name, above){
    var found, _ref;
    found = this.positions[name] in this.variables;
    if (found || !above) {
      return found;
    }
    return !!((_ref = this.parent) != null ? _ref.check(name, above) : void 8);
  };
  _ref.pickTemp = function(name, index){
    return '_' + (name.length > 1 ? name + (index > 1 ? index : '') : (index + parseInt(name, 36)).toString(36).replace(/\d/g, 'a'));
  };
  _ref.type = function(name){
    var _ref;
    return (_ref = this.variables[this.positions[name]]) != null ? _ref.type : void 8;
  };
  _ref.temporary = function(name){
    var i, temp, _ref;
    i = 0;
    while ((_ref = this.type(temp = this.pickTemp(name, i))) !== 'reuse' && _ref !== void 8) {
      i++;
    }
    this.add(temp, 'var');
    return temp;
  };
  _ref.assign = function(name, value){
    return this.add(name, {
      value: value,
      assigned: true
    });
  };
  _ref.vars = function(){
    var asn, name, tmp, type, usr, _i, _len, _ref, _ref2;
    usr = [];
    tmp = [];
    asn = [];
    for (_i = 0, _len = (_ref = this.variables).length; _i < _len; ++_i) {
      _ref2 = _ref[_i], name = _ref2.name, type = _ref2.type;
      if (type === "var" || type === "reuse") {
        (name.charAt(0) === '_' ? tmp : usr).push(name);
      } else if (type.assigned) {
        asn.push(name + ' = ' + type.value);
      }
    }
    return usr.sort().concat(tmp.sort(), asn);
  };
}).call(this);
