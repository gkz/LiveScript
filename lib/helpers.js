(function(){
  var flatten;
  exports.count = function(string, letter){
    var num, pos;
    num = pos = 0;
    while (pos = 1 + string.indexOf(letter, pos)) {
      num++;
    }
    return num;
  };
  exports.flatten = flatten = function(array){
    var element, flattened, _i, _len;
    flattened = [];
    for (_i = 0, _len = array.length; _i < _len; ++_i) {
      element = array[_i];
      if (element instanceof Array) {
        flattened = flattened.concat(flatten(element));
      } else {
        flattened.push(element);
      }
    }
    return flattened;
  };
  exports.del = function(obj, key){
    var val;
    val = obj[key];
    delete obj[key];
    return val;
  };
  exports.last = function(array, back){
    return array[array.length - (back || 0) - 1];
  };
}).call(this);
