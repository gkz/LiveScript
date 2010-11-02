(function(){
  exports.count = function(string, letter){
    var num, pos;
    num = pos = 0;
    while (pos = 1 + string.indexOf(letter, pos)) {
      num++;
    }
    return num;
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
