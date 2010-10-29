(function(){
  var key, val, _ref;
  var __owns = Object.prototype.hasOwnProperty;
  for (key in _ref = require('./coffee-script')) {
    if (!__owns.call(_ref, key)) continue;
    val = _ref[key];
    exports[key] = val;
  }
}).call(this);
