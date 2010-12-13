(function(){
  var string, untabify, JS_KEYWORDS, COCO_KEYWORDS, COCO_ALIASES, RESERVED, FORBIDDEN, IDENTIFIER, NUMBER, SYMBOL, SPACE, MULTIDENT, SIMPLESTR, JSTOKEN, REGEX, HEREGEX, HEREGEX_OMIT, MULTILINER, LINE_CONTINUER, CALLABLE, INDEXABLE, __clone = function(it){
  function fn(){ if (this.__proto__ !== it) this.__proto__ = it }
  return fn.prototype = it, new fn;
}, __indexOf = [].indexOf || function(x){
  for (var i = this.length; i-- && this[i] !== x;); return i;
};
  exports.lex = function(code, options){
    return __clone(this).tokenize(code, options || {});
  };
  exports.tokenize = function(code, o){
    var i;
    this.tokens = [this.last = ['DUMMY', '', 0]];
    this.line = o.line || 0;
    this.indent = this.indebt = this.dedebt = 0;
    this.indents = [];
    this.seenFor = this.seenFrom = this.seenRange = false;
    code = code.replace(/\r/g, '').replace(/\s+$/, '');
    i = 0;
    while (this.chunk = code.slice(i)) {
      switch (code.charAt(i)) {
      case ' ':
        i += this.spaceToken();
        break;
      case '\n':
        i += this.lineToken();
        break;
      case "'":
        i += this.heredocToken("'") || this.singleStringToken();
        break;
      case '"':
        i += this.heredocToken('"') || this.doubleStringToken();
        break;
      case '<':
        i += '[' === code.charAt(i + 1)
          ? this.wordsToken()
          : this.literalToken();
        break;
      case '/':
        i += '//' === code.substr(i + 1, 2)
          ? this.heregexToken()
          : this.regexToken() || this.literalToken();
        break;
      case '#':
        i += this.spaceToken() || this.commentToken();
        break;
      case '`':
        i += this.jsToken();
        break;
      default:
        i += this.identifierToken() || this.numberToken() || this.literalToken() || this.spaceToken();
      }
    }
    this.dedent(this.indent);
    this.tokens.shift();
    if (o.rewrite != 0) {
      require('./rewriter').rewrite(this.tokens);
    }
    return this.tokens;
  };
  exports.identifierToken = function(){
    var match, id, at, tag, input, colon, prev, forcedIdentifier, _ref, _ref2;
    if (!(match = IDENTIFIER.exec(this.chunk))) {
      return 0;
    }
    switch (id = match[1]) {
    case 'own':
      if (!(this.last[0] === 'FOR' && this.last[1])) {
        break;
      }
      this.last[1] = '';
      return id.length;
    case 'from':
      if (((_ref = (_ref2 = this.tokens)[_ref2.length - 2]) != null ? _ref[0] : void 8) !== 'FOR') {
        break;
      }
      this.seenFor = false;
      this.seenFrom = true;
      return this.token('FROM', id).length;
    case 'ever':
      if (this.last[0] !== 'FOR') {
        break;
      }
      this.seenFor = false;
      return this.token('EVER', id).length;
    case 'to':
    case 'til':
      if (!this.seenFrom) {
        break;
      }
      this.seenFrom = false;
      this.seenRange = true;
      return this.token('TO', id).length;
    case 'by':
      if (!this.seenRange) {
        break;
      }
      this.seenRange = false;
      return this.token('BY', id).length;
    case 'all':
      if (!(this.last[0] === 'IMPORT' && this.last[1] === '<<<')) {
        break;
      }
      this.last[1] += '<';
      return id.length;
    }
    tag = (at = id.charAt(0) === '@') ? (id = id.slice(1), 'THISPROP') : 'IDENTIFIER';
    input = match[0], colon = match[2];
    forcedIdentifier = at || colon || (!(prev = this.last).spaced && prev[1].colon2
      ? this.token('DOT', '.')
      : prev[0] === 'DOT');
    if (forcedIdentifier) {
      if (__indexOf.call(FORBIDDEN, id) >= 0) {
        (id = new String(id)).reserved = true;
      }
    } else if (__indexOf.call(COCO_KEYWORDS, id) >= 0) {
      switch (tag = id.toUpperCase()) {
      case 'FOR':
        this.seenFor = true;
        break;
      case 'IMPORT':
        id = '<<<';
        break;
      case 'UNLESS':
        tag = 'IF';
        break;
      case 'UNTIL':
        tag = 'WHILE';
        break;
      case 'NEW':
      case 'DO':
      case 'TYPEOF':
      case 'DELETE':
        tag = 'UNARY';
        break;
      case 'TRUE':
      case 'FALSE':
      case 'NULL':
      case 'VOID':
        tag = 'LITERAL';
        break;
      case 'BREAK':
      case 'CONTINUE':
      case 'DEBUGGER':
        tag = 'STATEMENT';
        break;
      case 'IN':
      case 'OF':
      case 'INSTANCEOF':
        if (tag !== 'INSTANCEOF' && this.seenFor) {
          if (tag === 'OF') {
            this.seenRange = true;
            id = prev[0] === 'IDENTIFIER' && (_ref = this.tokens)[_ref.length - 2][0] === ',' && (this.tokens.splice(-2, 2), prev[1]);
          }
          this.seenFor = false;
          tag = 'FOR' + tag;
          break;
        }
        if (this.last[1] === '!') {
          this.tokens.pop();
          id = '!' + id;
        }
        tag = 'RELATION';
      }
      if (this.seenRange && (tag === 'FOR' || tag === 'THEN')) {
        this.seenRange = false;
      }
    } else if (COCO_ALIASES.hasOwnProperty(id)) {
      _ref = COCO_ALIASES[id], tag = _ref[0], id = _ref[1];
    } else if (__indexOf.call(RESERVED, id) >= 0) {
      this.carp("reserved word \"" + id + "\"");
    }
    this.token(tag, id);
    if (colon) {
      this.token(':', ':');
    }
    return input.length;
  };
  exports.numberToken = function(){
    var match, num, radix, rnum, _ref;
    if (!(match = NUMBER.exec(this.chunk))) {
      return 0;
    }
    num = match[3] || match[0];
    if (num.charAt(0) === '.' && !this.last.spaced && (_ref = this.last[0], __indexOf.call(INDEXABLE, _ref) >= 0)) {
      this.token('DOT', '.');
      this.token('STRNUM', num.slice(1));
      return match[0].length;
    }
    if (radix = match[1]) {
      if (!(2 <= radix && radix <= 36)) {
        this.carp("invalid radix " + radix);
      }
      num = parseInt(rnum = match[2], radix);
      if (isNaN(num) || num === parseInt(rnum.slice(0, -1), radix)) {
        this.carp("invalid number " + rnum + " in base " + radix);
      }
    }
    this.token('STRNUM', num);
    return match[0].length;
  };
  exports.singleStringToken = function(){
    var str;
    if (!(str = SIMPLESTR.exec(this.chunk))) {
      this.carp('unterminated string');
    }
    this.token('STRNUM', (str = str[0]).replace(MULTILINER, '\\\n'));
    return this.countLines(str).length;
  };
  exports.doubleStringToken = function(){
    var str;
    str = this.balancedString(this.chunk, [['"', '"'], ['#{', '}']]);
    if (0 < str.indexOf('#{', 1)) {
      this.interpolateString(str.slice(1, -1), '');
    } else {
      this.token('STRNUM', str.replace(MULTILINER, ''));
    }
    return this.countLines(str).length;
  };
  exports.heredocToken = function(q){
    var end, txt, doc, lnl, tabs, dent, m, len;
    if (!(this.chunk.slice(1, 3) === q + q && ~(end = this.chunk.indexOf(q + q + q, 3)))) {
      return 0;
    }
    txt = this.chunk.slice(3, end);
    lnl = txt !== (doc = txt.replace(/\n[^\n\S]*$/, ''));
    if (~doc.indexOf('\n')) {
      tabs = /\n[^\n\S]*(?!$)/mg;
      dent = 0 / 0;
      while (m = tabs.exec(doc)) {
        if (!(dent <= (len = m[0].length - 1))) {
          dent = len;
        }
      }
      doc = untabify(doc, dent);
      if (doc.charAt(0) === '\n') {
        doc = doc.slice(1);
        ++this.line;
      }
    }
    if (q === '"' && ~doc.indexOf('#{')) {
      this.interpolateString(doc, '\\n');
    } else {
      this.token('STRNUM', string(doc, q, '\\n'));
      this.countLines(doc);
    }
    if (lnl) {
      ++this.line;
    }
    return txt.length + 6;
  };
  exports.commentToken = function(){
    var end, text;
    text = this.chunk.slice(3, ~(end = this.chunk.indexOf('###', 3)) ? end : 9e9);
    this.token('COMMENT', untabify(text, this.indent));
    this.token('TERMINATOR', '\n');
    return this.countLines(text).length + 6;
  };
  exports.jsToken = function(){
    var js;
    if (!(js = JSTOKEN.exec(this.chunk))) {
      this.carp('unterminated JS literal');
    }
    (js = new String(js[0].slice(1, -1))).js = true;
    return this.countLines(this.token('LITERAL', js)).length + 2;
  };
  exports.regexToken = function(){
    var prev, regex, _ref;
    if (((_ref = (prev = this.last)[0]) === 'STRNUM' || _ref === 'LITERAL' || _ref === 'CREMENT') || !prev.spaced && (_ref = prev[0], __indexOf.call(CALLABLE, _ref) >= 0) || !(regex = REGEX.exec(this.chunk))) {
      return 0;
    }
    this.token('LITERAL', (regex = regex[0]) === '//' ? '/(?:)/' : regex);
    return this.countLines(regex).length;
  };
  exports.heregexToken = function(){
    var match, heregex, body, flags, tokens, i, token, val, bs, _ref, _len;
    if (!(match = HEREGEX.exec(this.chunk))) {
      this.carp('unterminated heregex');
    }
    heregex = match[0], body = match[1], flags = match[2];
    if (0 > body.indexOf('#{')) {
      body = body.replace(HEREGEX_OMIT, '').replace(/\//g, '\\/');
      this.token('LITERAL', "/" + (body || '(?:)') + "/" + flags);
      return this.countLines(heregex).length;
    }
    this.token('IDENTIFIER', 'RegExp');
    this.token('CALL(', '(');
    tokens = this.tokens;
    for (i = 0, _len = (_ref = this.interpolateString(body)).length; i < _len; ++i) {
      token = _ref[i];
      if (token[0] === 'TOKENS') {
        tokens.push.apply(tokens, token[1]);
      } else {
        val = token[1].replace(HEREGEX_OMIT, '');
        if (i && !val) {
          continue;
        }
        val = val.replace(bs || (bs = /\\/g), '\\\\');
        tokens.push(['STRNUM', string(val, "'", '\\n'), token[2]]);
      }
      tokens.push(['+-', '+', tokens[tokens.length - 1][2]]);
    }
    tokens.pop();
    if (flags) {
      this.token(',', ',');
      this.token('STRNUM', "'" + flags + "'");
    }
    this.token(')', ')');
    return heregex.length;
  };
  exports.wordsToken = function(){
    var end, call, line, re, that, word, _ref, _i, _len, _j, _len2;
    if (!~(end = this.chunk.indexOf(']>', 2))) {
      this.carp('unterminated words');
    }
    if (call = !this.last.spaced && (_ref = this.last[0], __indexOf.call(CALLABLE, _ref) >= 0)) {
      this.token('CALL(', '(');
    } else {
      this.token('[', '[');
    }
    for (_i = 0, _len = (_ref = this.chunk.slice(2, end).split('\n')).length; _i < _len; ++_i) {
      line = _ref[_i];
      if (that = line.match(re || (re = /\S+/g))) {
        for (_j = 0, _len2 = that.length; _j < _len2; ++_j) {
          word = that[_j];
          this.tokens.push(['STRNUM', string(word, "'"), this.line], [',', ',', this.line]);
        }
      }
      ++this.line;
    }
    --this.line;
    if (word) {
      this.tokens.pop();
    } else {
      this.token('STRNUM', '\'\'');
    }
    if (call) {
      this.token(')', ')');
    } else {
      this.token(']', ']');
    }
    return end + 2;
  };
  exports.lineToken = function(){
    var indent, size, noNewline, _ref;
    this.countLines(indent = MULTIDENT.exec(this.chunk)[0]);
    this.last.eol = true;
    this.seenRange = false;
    size = indent.length - 1 - indent.lastIndexOf('\n');
    noNewline = LINE_CONTINUER.test(this.chunk) || ((_ref = this.last[0]) === '+-' || _ref === 'DOT' || _ref === 'INDEX[' || _ref === 'ASSIGN' || _ref === 'COMPOUND_ASSIGN' || _ref === 'LOGIC' || _ref === 'MATH' || _ref === 'COMPARE' || _ref === 'RELATION' || _ref === 'SHIFT' || _ref === 'IMPORT');
    if (size - this.indebt === this.indent) {
      if (!noNewline) {
        this.newline();
      }
      return indent.length;
    }
    if (size > this.indent) {
      if (noNewline) {
        this.indebt = size - this.indent;
        return indent.length;
      }
      this.indents.push(this.token('INDENT', size - this.indent + this.dedebt));
      this.dedebt = this.indebt = 0;
    } else {
      this.indebt = 0;
      this.dedent(this.indent - size, noNewline);
    }
    this.indent = size;
    return indent.length;
  };
  exports.spaceToken = function(){
    var match;
    return (match = SPACE.exec(this.chunk)) && (this.last.spaced = true, match[0].length);
  };
  exports.literalToken = function(){
    var value, tag, id, prev, _ref;
    value = SYMBOL.exec(this.chunk)[0];
    switch (tag = value) {
    case ')':
      if (this.last[0] === '(') {
        this.last[0] = 'CALL(';
      }
      break;
    case '->':
    case '=>':
      this.tagParameters();
      tag = 'FUNC_ARROW';
      break;
    case '=':
    case ':=':
    case '+=':
    case '-=':
    case '*=':
    case '/=':
    case '%=':
    case '&=':
    case '^=':
    case '|=':
    case '<<=':
    case '>>=':
    case '>>>=':
      tag = value === '=' || value === ':=' ? 'ASSIGN' : 'COMPOUND_ASSIGN';
      if (this.last[0] === 'LOGIC') {
        this.tokens.pop();
        (value = new String(value)).logic = this.last[1];
      }
      break;
    case '.':
    case '?.':
    case '&.':
    case '.=':
      tag = 'DOT';
      break;
    case '+':
    case '-':
      tag = '+-';
      break;
    case '!':
    case '~':
      tag = 'UNARY';
      break;
    case '===':
    case '!==':
    case '<=':
    case '<':
    case '>':
    case '>=':
    case '==':
    case '!=':
      tag = 'COMPARE';
      break;
    case '&&':
    case '||':
    case '&':
    case '|':
    case '^':
      tag = 'LOGIC';
      break;
    case '?':
      if (this.last.spaced) {
        tag = 'LOGIC';
      }
      break;
    case '/':
    case '%':
      tag = 'MATH';
      break;
    case '++':
    case '--':
      tag = 'CREMENT';
      break;
    case '<<<':
    case '<<<<':
      tag = 'IMPORT';
      break;
    case '<<':
    case '>>':
    case '>>>':
      tag = 'SHIFT';
      break;
    case '?[':
    case '&[':
    case '[=':
      tag = 'INDEX[';
      break;
    case '@':
      tag = 'THIS';
      break;
    case ';':
      tag = 'TERMINATOR';
      break;
    case '*':
      tag = (_ref = this.last[0]) === 'INDEX[' || _ref === '(' || _ref === 'DOT' ? 'STRNUM' : 'MATH';
      break;
    case '::':
      (id = new String('prototype')).colon2 = true;
      this.token('DOT', '.');
      this.token('IDENTIFIER', id);
      /* fallthrough */
    case '\\\n':
      return value.length;
    default:
      if (value.charAt(0) === '@') {
        this.token('IDENTIFIER', 'arguments');
        this.token('DOT', '.');
        this.token('STRNUM', value.slice(1));
        return value.length;
      }
      if (!(prev = this.last).spaced) {
        if (value === '(' && (_ref = prev[0], __indexOf.call(CALLABLE, _ref) >= 0)) {
          if (prev[0] === '?') {
            prev[0] = 'CALL(';
            prev[1] += '(';
            return value.length;
          }
          tag = 'CALL(';
        } else if (value === '[' && (_ref = prev[0], __indexOf.call(INDEXABLE, _ref) >= 0)) {
          tag = 'INDEX[';
        }
      }
    }
    return this.token(tag, value).length;
  };
  exports.dedent = function(moveOut, noNewline){
    var idt, _ref;
    while (moveOut > 0) {
      if (!(idt = (_ref = this.indents)[_ref.length - 1])) {
        moveOut = 0;
      } else if (idt <= this.dedebt) {
        moveOut -= idt;
        this.dedebt -= idt;
      } else {
        moveOut -= this.token('DEDENT', this.indents.pop() - this.dedebt);
        this.dedebt = 0;
      }
    }
    this.dedebt -= moveOut;
    if (!noNewline) {
      return this.newline();
    }
  };
  exports.newline = function(){
    if (this.last[0] !== 'TERMINATOR') {
      return this.token('TERMINATOR', '\n');
    }
  };
  exports.tagParameters = function(){
    var tokens, level, i, tok;
    if (this.last[0] !== ')') {
      return;
    }
    tokens = this.tokens;
    level = 1;
    tokens[i = (tokens.length) - 1][0] = ')PARAM';
    while (tok = tokens[--i]) {
      switch (tok[0]) {
      case ')':
        ++level;
        break;
      case '(':
      case 'CALL(':
        if (!--level) {
          return tok[0] = 'PARAM(';
        }
      }
    }
  };
  exports.balancedString = function(str, delimited){
    var stack, i, pair, open, _to, _i, _len;
    stack = [delimited[0]];
    for (i = 1, _to = str.length; i < _to; ++i) {
      switch (str.charAt(i)) {
      case '\\':
        ++i;
        continue;
      case stack[stack.length - 1][1]:
        stack.pop();
        if (!stack.length) {
          return str.slice(0, i + 1);
        }
        continue;
      }
      for (_i = 0, _len = delimited.length; _i < _len; ++_i) {
        pair = delimited[_i];
        if ((open = pair[0]) !== str.substr(i, open.length)) {
          continue;
        }
        stack.push(pair);
        i += open.length - 1;
        break;
      }
    }
    return this.carp("unterminated " + stack.pop()[0]);
  };
  exports.interpolateString = function(str, newline){
    var line, ts, pi, i, that, s, code, nested, tokens, t, _ref, _len;
    line = this.line;
    ts = [];
    pi = 0;
    i = -1;
    while (that = str.charAt(++i)) {
      if (that === '\\') {
        ++i;
        continue;
      }
      if (!(that === '#' && str.charAt(i + 1) === '{')) {
        continue;
      }
      if (pi < i) {
        ts.push(['S', s = str.slice(pi, i), this.line]);
        this.countLines(s);
      }
      code = this.balancedString(str.slice(i + 1), [['{', '}']]);
      pi = 1 + (i += code.length);
      if (!(code = code.slice(1, -1))) {
        continue;
      }
      nested = this.lex(code, {
        line: this.line,
        rewrite: false
      });
      nested.pop();
      if (((_ref = nested[0]) != null ? _ref[0] : void 8) === 'TERMINATOR') {
        nested.shift();
      }
      if (nested.length > 1) {
        nested.unshift(['(', '(', nested[0][2]]);
        nested.push([')', ')', nested[nested.length - 1][2]]);
      }
      ts.push(['TOKENS', nested]);
      this.countLines(code);
    }
    if (pi < str.length) {
      ts.push(['S', s = str.slice(pi), this.line]);
      this.countLines(s);
    }
    if (((_ref = ts[0]) != null ? _ref[0] : void 8) !== 'S') {
      ts.unshift(['S', '', line]);
    }
    if (newline == null) {
      return ts;
    }
    tokens = this.tokens;
    tokens.push(['(', '(', line]);
    for (i = 0, _len = ts.length; i < _len; ++i) {
      t = ts[i];
      if (i) {
        tokens.push(['+-', '+', tokens[tokens.length - 1][2]]);
      }
      if (t[0] === 'TOKENS') {
        tokens.push.apply(tokens, t[1]);
      } else {
        tokens.push(['STRNUM', string(t[1], '"', newline), t[2]]);
      }
    }
    this.token(')', ')');
    return ts;
  };
  exports.token = function(tag, value){
    this.tokens.push(this.last = [tag, value, this.line]);
    return value;
  };
  exports.countLines = function(str){
    var pos;
    pos = 0;
    while (pos = 1 + str.indexOf('\n', pos)) {
      ++this.line;
    }
    return str;
  };
  exports.carp = function(it){
    throw SyntaxError("" + it + " on line " + (this.line + 1));
  };
  string = function(body, quote, newline){
    if (!body) {
      return quote + quote;
    }
    body = body.replace(/\\([\s\S])/g, function($0, $1){
      if ($1 === '\n' || $1 === quote) {
        return $1;
      } else {
        return $0;
      }
    }).replace(RegExp('' + quote, 'g'), '\\$&');
    if (newline != null) {
      body = body.replace(MULTILINER, newline);
    }
    return quote + body + quote;
  };
  untabify = function(str, num){
    if (num) {
      return str.replace(RegExp('\\n[^\\n\\S]{' + num + '}', 'g'), '\n');
    } else {
      return str;
    }
  };
  JS_KEYWORDS = ['true', 'false', 'null', 'this', 'void', 'super', 'return', 'throw', 'break', 'continue', 'if', 'else', 'for', 'while', 'switch', 'case', 'default', 'try', 'catch', 'finally', 'class', 'extends', 'new', 'do', 'delete', 'typeof', 'in', 'instanceof', 'import', 'function', 'debugger'];
  COCO_KEYWORDS = JS_KEYWORDS.concat('then', 'of', 'unless', 'until');
  COCO_ALIASES = {
    not: ['UNARY', '!'],
    and: ['LOGIC', '&&'],
    or: ['LOGIC', '||'],
    is: ['COMPARE', '==='],
    isnt: ['COMPARE', '!==']
  };
  RESERVED = ['var', 'with', 'const', 'let', 'enum', 'export', 'native'];
  FORBIDDEN = JS_KEYWORDS.concat(RESERVED);
  IDENTIFIER = /^(@?[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*)([^\n\S]*:(?![:=]))?/;
  NUMBER = /^0x[\da-f]+|^([1-9]\d*)r([\da-z]+)|^((?:\d+(\.\d+)?|\.\d+)(?:e[+-]?\d+)?)[a-z]*/i;
  SYMBOL = /^(?:[-+*\/%&|^:.[<>]=|([-+&|:])\1|[!=]==?|[-=]>|\.{3}|[?&][.[]|<<<<?|<<=?|>>>?=?|@\d+|\\\n|\S)/;
  SPACE = /^(?=.)[^\n\S]*(?:#(?!##[^#]).*)?/;
  MULTIDENT = /^(?:\s*#(?!##[^#]).*)*(?:\n[^\n\S]*)+/;
  SIMPLESTR = /^'[^\\']*(?:\\.[^\\']*)*'/;
  JSTOKEN = /^`[^\\`]*(?:\\.[^\\`]*)*`/;
  REGEX = /^\/(?!\s)[^[\/\n\\]*(?:(?:\\[\s\S]|\[[^\]\n\\]*(?:\\[\s\S][^\]\n\\]*)*])[^[\/\n\\]*)*\/[imgy]{0,4}(?!\w)/;
  HEREGEX = /^\/{3}([\s\S]+?)\/{3}([imgy]{0,4})(?!\w)/;
  HEREGEX_OMIT = /\s+(?:#.*)?/g;
  MULTILINER = /\n/g;
  LINE_CONTINUER = /^\s*(?:,|[?&]?\.(?!\.)|::)/;
  CALLABLE = ['IDENTIFIER', 'THISPROP', ')', ']', 'STRNUM', 'SUPER', 'THIS'];
  INDEXABLE = CALLABLE.concat('}', 'LITERAL');
  CALLABLE.push('?');
}).call(this);
