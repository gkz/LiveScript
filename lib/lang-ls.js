var tint, ident, kwend, interps, regexes;
tint = function(ext, shortcuts, fallthroughs){
  var rule;
  for (rule in shortcuts) {
    if (rule.length < 4) {
      rule.splice(2, 0, 0);
    }
  }
  return PR.registerLangHandler(PR.createSimpleLexer(shortcuts, fallthroughs), [ext]);
};
ident = '(?:[$A-Za-z_\\x7f-\\uffff][$\\w\\x7f-\\uffff]*)';
kwend = '(?![$\\w\\x7f-\\uffff])';
tint('ls', [['str', /^'(?:''[\S\s]*?''|[^\\']*(?:\\[\S\s][^\\']*)*)'/, '\''], ['lang-ls-qq', /(^"(?:""[\S\s]*?""|[^\\"]*(?:\\[\S\s][^\\"]*)*)")/, '"'], ['lang-ls-qr', /(^\/\/[\S\s]*?\/\/[gimy$?]{0,4})/, '/'], ['lang-ls-at', RegExp('(^@@?' + ident + '?)'), '@'], ['com', /^#.*/, '#'], ['typ', /^(?:0x[\da-f][\da-f_]*|(?:[2-9]|[12]\d|3[0-6])r[\da-z][\da-z_]*|\d[\d_]*(?:\.\d[\d_]*)?(?:e[+-]?\d[\d_]*)?[a-z_]*)/i, '0123456789'], ['lang-js', /^`([^\\`]*(?:\\[\S\s][^\\`]*)*)`/, '`']], [['str', /^\\\S[^\s,;)}\]]*/], ['com', /^\/\*[\S\s]*\*\//], ['pln', RegExp('^(?:\\.{3}|(?:\\.\\s*(?:(?:[-+*/%&|^:]|>>>?|<<)?=|[~!@])?\\s*|[)}\\]?]|::)(?:' + ident + '[?~!@]?)+|' + ident + '[^\\n\\S]*:(?![:=]))')], ['kwd', RegExp('^(?:t(?:ry|h(?:row|en)|ypeof!?)|f(?:or(?:[^\\n\\S]+(?:own|ever))?|inally|unction)|n(?:ew|ot)|c(?:ontinue|a(?:se|tch)|lass)|i(?:[fs]|n(?:stanceof)?|mport(?:[^\\n\\S]+all)?)|e(?:lse|x(?:tends|port))|d(?:e(?:fault|lete|bugger)|o)|un(?:less|til)|w(?:hile|ith)|o[fr]|return|break|switch|and|let)' + kwend)], ['typ', RegExp('^(?:true|false|null|void)' + kwend)], ['ctx', RegExp('^(?:t(?:h(?:is|at)|o|il)|f(?:rom|allthrough)|it|arguments|eval|by|super|prototype)' + kwend)], ['glb', RegExp('^(?:Array|Boolean|Date|Error|Function|JSON|Math|Number|Object|RegExp|S(?:tring|yntaxError)|TypeError|is(?:NaN|Finite)|parse(?:Int|Float)|(?:en|de)codeURI(?:Component)?)' + kwend)], ['var', RegExp('^' + ident)], ['str', /^<\[[\S\s]*?]>/], ['lang-ls-r', /^[^\/](\/(?![\s\/])[^[\/\n\\]*(?:(?:\\.|\[[^\]\n\\]*(?:\\.[^\]\n\\]*)*\])[^[\/\n\\]*)*\/[gimy$]{0,4})(?!\d)/]]);
interps = ['lang-ls', RegExp('^#({[\\S\\s]*?}|' + ident + ')'), '#'];
regexes = ['lit', /^[\S\s]+?/];
tint('ls-qq', [interps], [['str', /^[\S\s]+?/]]);
tint('ls-qr', [interps], [['com', /^\s#(?!{).*/], regexes]);
tint('ls-r', [], [regexes]);
tint('ls-at', [['ctx', /^@+/, '@']], []);