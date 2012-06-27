var __toString = {}.toString;
module.exports = function(flags, args, options){
  var MULTI, name, desc, arg, abbr, FLAG, unknowns, i, a, flag, value, __res, __ref, __len, __i, __len1, __j, __len2, __key;
  args || (args = process.argv.slice(2));
  options || (options = {});
  if (__toString.call(flags).slice(8, -1) !== 'Array') {
    MULTI = /[*+]/;
    __res = [];
    for (name in flags) {
      __ref = ([]).concat(flags[name]), desc = __ref[0], arg = __ref[1], abbr = __ref[2];
      __res.push({
        name: name,
        desc: desc,
        arg: arg,
        abbr: abbr,
        long: '--' + name,
        short: abbr !== 0 && ("-" + (abbr || name)).slice(0, 2),
        multi: !!arg && MULTI.test(arg)
      });
    }
    flags = __res;
  }
  FLAG = /^-[-\w]+$/;
  unknowns = [];
  ARGS: for (i = 0, __len = args.length; i < __len; ++i) {
    arg = args[i];
    if (arg === '--') {
      ++i;
      break;
    }
    ARG: for (__i = 0, __len1 = (__ref = expand(arg)).length; __i < __len1; ++__i) {
      a = __ref[__i];
      for (__j = 0, __len2 = flags.length; __j < __len2; ++__j) {
        flag = flags[__j];
        if (a != flag['short'] && a != flag['long']) {
          continue;
        }
        value = flag.arg ? args[++i] : true;
        if (flag.multi) {
          (options[__key = flag.name] || (options[__key] = [])).push(value);
        } else {
          options[flag.name] = value;
        }
        continue ARG;
      }
      if (FLAG.test(a)) {
        unknowns.push(a);
      } else {
        break ARGS;
      }
    }
  }
  return options.$flags = flags, options.$args = args.slice(i), options.$unknowns = unknowns, options.toString = help, options;
};
function expand(it){
  if (/^-\w{2,}/.test(it)) {
    return [].map.call(it.slice(1), function(it){
      return "-" + it;
    });
  } else {
    return [it];
  }
}
function help(){
  var longs, width, pad;
  longs = this.$flags.map(function(it){
    var that;
    return it.long + ((that = it.arg) ? ' ' + that : '');
  });
  width = Math.max.apply(Math, longs.map(function(it){
    return it.length;
  }));
  pad = __repeatString(' ', width);
  return this.$flags.map(function(flag, i){
    var that, sf, lf;
    sf = (that = flag.short) ? that + ',' : '   ';
    lf = (longs[i] + pad).slice(0, width);
    return "  " + sf + " " + lf + "  " + flag.desc;
  }).join('\n');
}
function __repeatString(str, n){
  for (var r = ''; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;
  return r;
}