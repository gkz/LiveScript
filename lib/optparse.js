(function(){
  var LONG_FLAG, MULTI_FLAG, OPTIONAL, SHORT_FLAG, buildRule, buildRules, normalizeArguments;
  exports.OptionParser = (function(){
    var _ref;
    function OptionParser(rules, _arg){
      this.banner = _arg;
      this.rules = buildRules(rules);
    }
    OptionParser.name = "OptionParser";
    _ref = OptionParser.prototype, _ref.parse = function(args){
      var arg, i, isOption, matchedRule, options, rule, value, _i, _len, _len2, _ref;
      options = {
        arguments: []
      };
      args = normalizeArguments(args);
      for (i = 0, _len = args.length; i < _len; ++i) {
        arg = args[i];
        isOption = !!(LONG_FLAG.test(arg) || SHORT_FLAG.test(arg));
        matchedRule = false;
        for (_i = 0, _len2 = (_ref = this.rules).length; _i < _len2; ++_i) {
          rule = _ref[_i];
          if (arg === rule.shortFlag || arg === rule.longFlag) {
            value = rule.hasArgument ? args[i += 1] : true;
            options[rule.name] = rule.isList ? (options[rule.name] || []).concat(value) : value;
            matchedRule = true;
            break;
          }
        }
        if (isOption && !matchedRule) {
          throw Error("unrecognized option: " + arg);
        }
        if (!isOption) {
          options.arguments = args.slice(i);
          break;
        }
      }
      return options;
    }, _ref.help = function(){
      var lf, lines, pad, rule, sf, width, _i, _len, _ref;
      lines = ['Available options:'];
      if (this.banner) {
        lines.unshift(this.banner + '\n');
      }
      width = Math.max.apply(Math, (function(){
        var _i, _len, _ref, _results = [];
        for (_i = 0, _len = (_ref = this.rules).length; _i < _len; ++_i) {
          rule = _ref[_i];
          _results.push(rule.longFlag.length);
        }
        return _results;
      }.call(this)));
      pad = Array(width).join(' ');
      for (_i = 0, _len = (_ref = this.rules).length; _i < _len; ++_i) {
        rule = _ref[_i];
        sf = rule.shortFlag ? rule.shortFlag + ',' : '   ';
        lf = (rule.longFlag + pad).slice(0, width);
        lines.push("  " + sf + " " + lf + "  " + rule.description);
      }
      return "\n" + lines.join('\n') + "\n";
    };
    return OptionParser;
  }());
  LONG_FLAG = /^--\w[\w\-]+/;
  SHORT_FLAG = /^-\w/;
  MULTI_FLAG = /^-(\w{2,})/;
  OPTIONAL = /\[(\w+(\*?))\]/;
  buildRules = function(rules){
    var tuple, _i, _len, _results = [];
    for (_i = 0, _len = rules.length; _i < _len; ++_i) {
      tuple = rules[_i];
      if (tuple.length < 3) {
        tuple.unshift(null);
      }
      _results.push(buildRule.apply(null, tuple));
    }
    return _results;
  };
  buildRule = function(shortFlag, longFlag, description){
    var match;
    match = longFlag.match(OPTIONAL);
    longFlag = longFlag.match(LONG_FLAG)[0];
    return {
      shortFlag: shortFlag,
      longFlag: longFlag,
      description: description,
      name: longFlag.slice(2),
      hasArgument: !!(match != null ? match[1] : void 0),
      isList: !!(match != null ? match[2] : void 0)
    };
  };
  normalizeArguments = function(args){
    var arg, l, match, results, _ref;
    results = (function(){
      var _i, _len, _ref, _results = [];
      for (_i = 0, _len = (_ref = args).length; _i < _len; ++_i) {
        arg = _ref[_i];
        _results.push((function(){
          var _i, _len, _ref, _results = [];
          if (match = MULTI_FLAG.exec(arg)) {
            for (_i = 0, _len = (_ref = match[1].split('')).length; _i < _len; ++_i) {
              l = _ref[_i];
              _results.push('-' + l);
            }
            return _results;
          } else {
            return arg;
          }
        }()));
      }
      return _results;
    }());
    return (_ref = []).concat.apply(_ref, results);
  };
}).call(this);
