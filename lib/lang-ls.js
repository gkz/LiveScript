var tint, ident, kwend, interps, regexes;
tint = function(ext, shortcuts, fallthroughs){
  var rule, __i, __len;
  for (__i = 0, __len = shortcuts.length; __i < __len; ++__i) {
    rule = shortcuts[__i];
    if (rule.length < 4) {
      rule.splice(2, 0, 0);
    }
  }
  return PR.registerLangHandler(PR.createSimpleLexer(shortcuts, fallthroughs), [ext]);
};
ident = '(?:[$A-Za-z_\\x7f-\\uffff][$\\w\\x7f-\\uffff]*)';
kwend = '(?![$\\w\\x7f-\\uffff])';
tint('ls', [['str', /^'(?:''[\S\s]*?''|[^\\']*(?:\\[\S\s][^\\']*)*)'/, '\''], ['lang-ls-qq', /(^"(?:""[\S\s]*?""|[^\\"]*(?:\\[\S\s][^\\"]*)*)")/, '"'], ['lang-ls-qr', /(^\/\/[\S\s]*?\/\/[gimy$?]{0,4})/, '/'], ['lang-ls-at', RegExp('(^@@?' + ident + '?)'), '@'], ['com', /^#.*/, '#'], ['typ', /^(?:0x[\dA-Fa-f][\dA-Fa-f_]*|(\d*)~([\dA-Za-z]\w*)|((\d[\d_]*)(\.\d[\d_]*)?(?:e[+-]?\d[\d_]*)?)[$\w]*)/i, '0123456789'], ['lang-js', /^`([^\\`]*(?:\\[\S\s][^\\`]*)*)`/, '`']], [['str', /^\\\S[^\s,;)}\]]*/], ['com', /^\/\*[\S\s]*\*\//], ['pln', RegExp('^(?:\\.{3}|(?:\\.\\s*(?:(?:[-+*/%&|^:]|>>>?|<<)?=|[~!@])?\\s*|[)}\\]?]|::)(?:' + ident + '[?~!@]?)+|' + ident + '[^\\n\\S]*:(?![:=]))')], ['kwd', RegExp('^(?:t(?:ry|h(?:row|en)|ypeof!?)|f(?:or(?:[^\\n\\S]+(?:own|ever))?|inally|unction)|n(?:ew|ot)|c(?:ontinue|a(?:se|tch)|lass)|i(?:[fs]|snt|n(?:stanceof)?|mport(?:[^\\n\\S]+all)?)|e(?:lse|x(?:tends|port))|d(?:e(?:fault|lete|bugger)|o)|un(?:less|til)|w(?:hile|ith|hen)|o[fr]|return|break|switch|and|let|loop)' + kwend)], ['typ', RegExp('^(?:true|false|null|void)' + kwend)], ['ctx', RegExp('^(?:t(?:h(?:is|at)|o|il)|f(?:rom|allthrough)|it|arguments|eval|by|super|prototype)' + kwend)], ['glb', RegExp('^(?:Array|Boolean|Date|Error|Function|JSON|Math|Number|Object|RegExp|S(?:tring|yntaxError)|TypeError|is(?:NaN|Finite)|parse(?:Int|Float)|(?:en|de)codeURI(?:Component)?)' + kwend)], ['var', RegExp('^' + ident)], ['str', /^<\[[\S\s]*?]>/], ['lang-ls-r', /^[^\/](\/(?![\s\/])[^[\/\n\\]*(?:(?:\\.|\[[^\]\n\\]*(?:\\.[^\]\n\\]*)*\])[^[\/\n\\]*)*\/[gimy$]{0,4})(?!\d)/]]);
interps = ['lang-ls', RegExp('^#({[\\S\\s]*?}|' + ident + ')'), '#'];
regexes = ['lit', /^[\S\s]+?/];
tint('ls-qq', [interps], [['str', /^[\S\s]+?/]]);
tint('ls-qr', [interps], [['com', /^\s#(?!{).*/], regexes]);
tint('ls-r', [], [regexes]);
tint('ls-at', [['ctx', /^@+/, '@']], []);