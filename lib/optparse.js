module.exports = function(flags, args, options){
  var MULTI, name, desc, arg, abbr, FLAG, i, literals, flag, value, _len, _i, _len2, _name;
  args || (args = process.argv.slice(2));
  options || (options = {});
  if ('[object Array]' !== {}.toString.call(flags)) {
    MULTI = /[*+]/;
    flags = (function(){
      var _ref, _results = [];
      for (name in flags) {
        _ref = [].concat(flags[name]), desc = _ref[0], arg = _ref[1], abbr = _ref[2];
        _results.push({
          name: name,
          desc: desc,
          arg: arg,
          abbr: abbr,
          long: '--' + name,
          short: abbr != 0 && ("-" + (abbr || name)).slice(0, 2),
          multi: arg && MULTI.test(arg)
        });
      }
      return _results;
    }());
  }
  args = Array.prototype.concat.apply([], args.map(function(it){
    if (/^-\w{2,}/.test(it)) {
      return it.slice(1).split('').map(function(it){
        return '-' + it;
      });
    } else {
      return it;
    }
  }));
  FLAG = /^-[-\w]+$/;
  ARGS:
  for (i = 0, _len = args.length; i < _len; ++i) {
    arg = args[i];
    if (arg === '--') {
      literals = args.slice(i + 1);
      break;
    }
    for (_i = 0, _len2 = flags.length; _i < _len2; ++_i) {
      flag = flags[_i];
      if (arg !== flag.short && arg !== flag.long) {
        continue;
      }
      value = flag.arg ? args[++i] : true;
      if (flag.multi) {
        (options[_name = flag.name] || (options[_name] = [])).push(value);
      } else {
        options[flag.name] = value;
      }
      continue ARGS;
    }
    if (FLAG.test(arg)) {
      throw Error("unrecognized option: " + arg);
    }
    break;
  }
  return options.$flags = flags, options.$args = args.slice(i), options.$literals = literals || [], options.toString = help, options;
};
function help(){
  var longs, width, pad;
  longs = this.$flags.map(function(it){
    var that;
    return it.long + ((that = it.arg) ? ' ' + that : '');
  });
  width = Math.max.apply(Math, longs.map(function(it){
    return it.length;
  }));
  pad = Array(width >> 1).join('  ');
  return this.$flags.map(function(flag, i){
    var that, sf, lf;
    sf = (that = flag.short) ? that + ',' : '   ';
    lf = (longs[i] + pad).slice(0, width);
    return "  " + sf + " " + lf + "  " + flag.desc;
  }).join('\n');
}