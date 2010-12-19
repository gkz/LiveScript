var FLAG, LONG_FLAG;
exports.OptionParser = (function(){
  var _proto = OptionParser.prototype;
  function _ctor(){} _ctor.prototype = _proto;
  function OptionParser(it){
    var _this = new _ctor;
    _this.rules = it.map(function(_arg){
      var shortFlag, longFlag, description, flag, hasArg, isList, _ref;
      shortFlag = _arg[0], longFlag = _arg[1], description = _arg[2];
      _ref = LONG_FLAG.exec(longFlag), flag = _ref[0], hasArg = _ref[1], isList = _ref[2];
      return {
        name: flag.slice(2),
        flag: flag,
        shortFlag: shortFlag,
        longFlag: longFlag,
        description: description,
        hasArg: hasArg,
        isList: isList
      };
    });
    return _this;
  } OptionParser.name = 'OptionParser';
  _proto.parse = function(args, options){
    var i, arg, literals, rule, value, _len, _i, _ref, _len2, _name;
    options == null && (options = {});
    args = Array.prototype.concat.apply([], args.map(function(it){
      if (/^-\w{2,}/.test(it)) {
        return it.slice(1).split('').map(function(it){
          return '-' + it;
        });
      } else {
        return it;
      }
    }));
    ARGS:
    for (i = 0, _len = args.length; i < _len; ++i) {
      arg = args[i];
      if (arg === '--') {
        literals = args.slice(i + 1);
        break;
      }
      for (_i = 0, _len2 = (_ref = this.rules).length; _i < _len2; ++_i) {
        rule = _ref[_i];
        if (arg !== rule.shortFlag && arg !== rule.flag) {
          continue;
        }
        value = rule.hasArg ? args[++i] : true;
        if (rule.isList) {
          (options[_name = rule.name] || (options[_name] = [])).push(value);
        } else {
          options[rule.name] = value;
        }
        continue ARGS;
      }
      if (FLAG.test(arg)) {
        console.error('unrecognized option: %s', arg);
        process.exit(1);
      }
      break;
    }
    literals || (literals = []);
    return options.literals = literals, options.arguments = args.slice(i), options;
  };
  _proto.help = function(){
    var lines, width, pad, rule, sf, lf, _i, _ref, _len;
    lines = ['Available options:'];
    width = Math.max.apply(Math, this.rules.map(function(it){
      return it.longFlag.length;
    }));
    pad = Array(width >> 1).join('  ');
    for (_i = 0, _len = (_ref = this.rules).length; _i < _len; ++_i) {
      rule = _ref[_i];
      sf = (rule.shortFlag && (rule.shortFlag += ',')) || '   ';
      lf = (rule.longFlag + pad).slice(0, width);
      lines.push("  " + sf + " " + lf + "  " + rule.description);
    }
    return lines.join('\n');
  };
  return OptionParser;
}());
FLAG = /^-[-\w]+$/;
LONG_FLAG = /^--\w[-\w]+(?=(\s+[^\s*]+(\*)?)?)/;