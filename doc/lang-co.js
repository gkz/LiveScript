(function(){
  var tint, hashbraces, regexes;
  tint = function(ext, shortcuts, fallthroughs){
    var rule, _i, _len;
    for (_i = 0, _len = shortcuts.length; _i < _len; ++_i) {
      rule = shortcuts[_i];
      if (rule.length < 4) {
        rule.splice(2, 0, 0);
      }
    }
    return PR.registerLangHandler(PR.createSimpleLexer(shortcuts, fallthroughs), [ext]);
  };
  tint('co', [['str', /^\\\S[^\s,;)}\]]*/, '\\'], ['str', /^'(?:''[^]*?''|[^\\']*(?:\\.[^\\']*)*)'/, '\''], ['lang-qq', /^("""[^]*?""")/, '"'], ['lang-qq', /^("[^\\"]*(?:\\.[^\\"]*)*")/, '"'], ['lang-qr', /^(\/{3}[^]+?\/{3}[imgy]{0,4})(?!\w)/, '/'], ['lang-at', /^(@+[$\w\x7f-\uffff]*)/, '@'], ['com', /^\#(?:\##[^#][^]*?###|.*)/, '#'], ['typ', /^(?:0x[\da-f]+|[1-9]\d?r[\da-z]+|(?:\d+(?:\.\d+)?)(?:e[+-]?\d+)?[a-z]*)/i, '0123456789'], ['lang-js', /^`([^\\`]*(?:\\.[^\\`]*)*)`/, '`']], [['pln', /^(?:(?:\@|(?:\.|::)\s*)[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*|[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*[^\n\S]*:(?!:)|\.{3})/], ['kwd', /^(?:t(?:ry|h(?:row|en)|ypeof)|f(?:or(?:own)?|inally|unction)|n(?:ew|ot)|c(?:ontinue|a(?:se|tch)|lass)|i(?:[fs]|n(?:stanceof)?|mport(?:all)?)|e(?:lse|xtends)|d(?:e(?:fault|lete|bugger)|o)|un(?:less|til)|o[fr]|return|break|while|switch|and)\b/], ['typ', /^(?:true|false|null|void)\b/], ['ctx', /^(?:th(?:is|at)|it|super|arguments|eval)\b/], ['glb', /^(?:Array|Boolean|Date|Error|Function|JSON|Math|Number|Object|RegExp|S(?:tring|yntaxError)|TypeError)\b(?![^\n\S]*:(?!:))/], ['var', /^[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*/], ['str', /^<(?!<)\[[^]*?]>/], ['lang-r', /^[^\/](\/(?![\s\/])[^[\/\n\\]*(?:(?:\\[^]|\[[^\]\n\\]*(?:\\[^][^\]\n\\]*)*])[^[\/\n\\]*)*\/[imgy]{0,4})(?!\w)/]]);
  hashbraces = ['lang-co', /^#{([^]*?)}/, '#'];
  regexes = ['lit', /^[^]+?/];
  tint('qq', [hashbraces], [['str', /^[^]+?/]]);
  tint('qr', [hashbraces], [['com', /^\s#(?!{).*/], regexes]);
  tint('r', [], [regexes]);
  tint('at', [['ctx', /^@+/, '@']], [['typ', /^\d+/]]);
}).call(this);
