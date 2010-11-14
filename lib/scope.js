(function(){
  var Scope;
  exports.Scope = Scope = (function(){
    var _ref;
    function Scope(_arg, _arg2, _arg3){
      this.parent = _arg;
      this.expressions = _arg2;
      this.method = _arg3;
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
        Scope.root = this;
      }
    }
    Scope.name = "Scope";
    _ref = Scope.prototype, _ref.add = function(name, type){
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
    }, _ref.any = function(fn){
      var v, _i, _len, _ref;
      for (_i = 0, _len = (_ref = this.variables).length; _i < _len; ++_i) {
        v = _ref[_i];
        if (!fn(v)) continue;
        return true;
      }
      return false;
    }, _ref.declare = function(name){
      var scope, _ref;
      scope = this.shared || this;
      if ((_ref = scope.type(name)) !== "var" && _ref !== "param") {
        scope.add(name, 'var');
      }
      return this;
    }, _ref.parameter = function(it){
      return this.add(it, 'param');
    }, _ref.free = function(it){
      return this.add(it, 'reuse');
    }, _ref.check = function(name, above){
      var found, _ref;
      found = this.positions[name] in this.variables;
      if (found || !above) {
        return found;
      }
      return !!((_ref = this.parent) != null ? _ref.check(name, above) : void 0);
    }, _ref.pickTemp = function(name, index){
      return '_' + (name.length > 1 ? name + (index > 1 ? index : '') : (index + parseInt(name, 36)).toString(36).replace(/\d/g, 'a'));
    }, _ref.type = function(name){
      var _ref;
      return (_ref = this.variables[this.positions[name]]) != null ? _ref.type : void 0;
    }, _ref.temporary = function(name){
      var i, temp, _ref;
      i = 0;
      while ((_ref = this.type(temp = this.pickTemp(name, i))) !== 'reuse' && _ref !== void 0) {
        i++;
      }
      this.add(temp, 'var');
      return temp;
    }, _ref.assign = function(name, value){
      return this.add(name, {
        value: value,
        assigned: true
      });
    }, _ref.hasDeclarations = function(body){
      return body === this.expressions && this.any(function(it){
        var _ref;
        return (_ref = it.type) === "var" || _ref === "reuse";
      });
    }, _ref.hasAssignments = function(body){
      return body === this.expressions && this.any(function(it){
        return it.type.assigned;
      });
    }, _ref.declaredVariables = function(){
      var tmp, usr, v, _i, _len, _ref, _ref2;
      usr = [];
      tmp = [];
      for (_i = 0, _len = (_ref = this.variables).length; _i < _len; ++_i) {
        v = _ref[_i];
        if ((_ref2 = v.type) !== "var" && _ref2 !== "reuse") continue;
        (v.name.charAt(0) === '_' ? tmp : usr).push(v.name);
      }
      return usr.sort().concat(tmp.sort());
    }, _ref.assignedVariables = function(){
      var v, _i, _len, _ref, _results = [];
      for (_i = 0, _len = (_ref = this.variables).length; _i < _len; ++_i) {
        v = _ref[_i];
        if (!v.type.assigned) continue;
        _results.push(v.name + ' = ' + v.type.value);
      }
      return _results;
    };
    return Scope;
  }());
}).call(this);
