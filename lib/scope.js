(function(){
  var _ref;
  _ref = (exports.Scope = function(parent, shared){
    this.parent = parent;
    this.shared = shared;
    this.variables = [
      {
        name: 'arguments',
        type: 'arguments'
      }
    ];
    this.positions = {
      arguments: 0
    };
    return this;
  }).prototype;
  _ref.add = function(name, type){
    var v;
    if (name === 'arguments' || name === 'eval') {
      throw SyntaxError("redefining \"" + name + "\" is deprecated");
    }
    if (v = this.variables[this.positions[name]]) {
      if ('function' === type || 'function' === v.type) {
        throw SyntaxError("redeclaration of \"" + name + "\"");
      }
      v.type = type;
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
    if ((_ref = scope.type(name)) !== 'var' && _ref !== 'param') {
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
  _ref.parameter = function(it){
    return this.add(it, 'param');
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
  _ref.vars = function(){
    var asn, name, tmp, type, usr, _i, _len, _ref, _ref2;
    usr = [];
    tmp = [];
    asn = [];
    for (_i = 0, _len = (_ref = this.variables).length; _i < _len; ++_i) {
      _ref2 = _ref[_i], name = _ref2.name, type = _ref2.type;
      if (type === 'var' || type === 'reuse') {
        (name.charAt(0) === '_' ? tmp : usr).push(name);
      } else if (type.value) {
        asn.push(name + ' = ' + type.value);
      }
    }
    return usr.sort().concat(tmp.sort(), asn.sort());
  };
}).call(this);
