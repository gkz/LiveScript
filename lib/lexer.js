var rewrite, able, string, detab, unlines, enlines, JS_KEYWORDS, COCO_ALIASES, RESERVED, IDENTIFIER, NUMBER, SYMBOL, SPACE, MULTIDENT, SIMPLESTR, JSTOKEN, REGEX, HEREGEX, HEREGEX_OMIT, LINE_CONTINUER, _ref, __clone = function(it){
  function fn(){ if (this.__proto__ !== it) this.__proto__ = it }
  return fn.prototype = it, new fn;
}, __indexOf = [].indexOf || function(x){
  for (var i = this.length; i-- && this[i] !== x;); return i;
};
_ref = require('./rewriter'), rewrite = _ref.rewrite, able = _ref.able;
exports.lex = function(code, options){
  return __clone(exports).tokenize(code || '', options || {});
};
exports.tokenize = function(code, o){
  var i;
  code = code.replace(/\r/g, '').replace(/\s+$/, '');
  this.tokens = [this.last = ['TERMINATOR', '', 0]];
  this.line = o.line | 0;
  this.indent = this.indebt = this.dedebt = 0;
  this.indents = [];
  if (/^[^\n\S]+(?!#(?!##(?!#)))\S/.test(code)) {
    code = '\n' + code;
    --this.line;
  }
  while (code = code.slice(i)) {
    switch (code.charAt(0)) {
    case ' ':
    case '#':
      i = this.spaceToken(code);
      break;
    case '\n':
      i = this.lineToken(code);
      break;
    case '\'':
      i = this.heredocToken(code, '\'') || this.singleStringToken(code);
      break;
    case '"':
      i = this.heredocToken(code, '"') || this.doubleStringToken(code);
      break;
    case '<':
      i = this['[' === code.charAt(1) ? 'wordsToken' : 'literalToken'](code);
      break;
    case '/':
      i = '*' === code.charAt(1)
        ? this.commentToken(code)
        : '//' === code.substr(1, 2)
          ? this.heregexToken(code)
          : this.regexToken(code) || this.literalToken(code);
      break;
    case '`':
      i = this.jsToken(code);
      break;
    default:
      i = this.identifierToken(code) || this.numberToken(code) || this.literalToken(code) || this.spaceToken(code);
    }
  }
  this.dedent(this.indent);
  this.tokens.shift();
  if (o.rewrite != 0) {
    rewrite(this.tokens);
  }
  return this.tokens;
};
exports.identifierToken = function(it){
  var match, id, at, tag, last, colon, callable, alias, _ref, _ref2;
  if (!(match = IDENTIFIER.exec(it))) {
    return 0;
  }
  if (at = '@' === (id = match[1]).charAt(0)) {
    id = id.slice(1);
    tag = 'THISPROP';
  } else {
    last = this.last;
    switch (id) {
    case 'own':
      if (!(last[0] === 'FOR' && last[1])) {
        break;
      }
      last[1] = '';
      return id.length;
    case 'from':
      if (((_ref = (_ref2 = this.tokens)[_ref2.length - 2]) != null ? _ref[0] : void 8) !== 'FOR') {
        break;
      }
      this.seenFor = false;
      this.seenFrom = true;
      return this.token('FROM', id).length;
    case 'ever':
      if (last[0] !== 'FOR') {
        break;
      }
      this.seenFor = false;
      return this.token('EVER', id).length;
    case 'to':
    case 'til':
      if (this.seenFrom) {
        this.seenFrom = false;
        this.seenTo = true;
        return this.token('TO', id).length;
      } else if (last[0] === 'STRNUM' && /^[-+\d.]/.test(last[1])) {
        last[0] = 'RANGE';
        last.op = id;
        return id.length;
      }
      break;
    case 'by':
      if (this.seenTo) {
        this.seenTo = false;
        return this.token('BY', id).length;
      } else if (last[0] === 'RANGE' && last.to) {
        last.by = true;
        return id.length;
      }
      break;
    case 'all':
      if (!(last[0] === 'IMPORT' && last[1] === '<<<')) {
        break;
      }
      last[1] += '<';
      return id.length;
    }
    tag = 'IDENTIFIER';
  }
  colon = match[2];
  if (at || colon || (last['::']
    ? this.token('DOT', '.')
    : last[0] === 'DOT')) {
    if (__indexOf.call(JS_KEYWORDS, id) >= 0 || __indexOf.call(RESERVED, id) >= 0) {
      (id = new String(id)).reserved = true;
    }
  } else if (__indexOf.call(JS_KEYWORDS, id) >= 0 || (id === 'then' || id === 'of' || id === 'arguments' || id === 'eval')) {
    switch (tag = id.toUpperCase()) {
    case 'FOR':
      this.seenFor = true;
      /* fallthrough */
    case 'THEN':
      this.seenFrom = this.seenTo = false;
      break;
    case 'IMPORT':
      id = '<<<';
      break;
    case 'THIS':
    case 'EVAL':
      callable = true;
      /* fallthrough */
    case 'TRUE':
    case 'FALSE':
    case 'NULL':
    case 'VOID':
    case 'ARGUMENTS':
    case 'DEBUGGER':
      tag = 'LITERAL';
      break;
    case 'NEW':
    case 'DO':
    case 'TYPEOF':
    case 'DELETE':
      tag = 'UNARY';
      break;
    case 'BREAK':
    case 'CONTINUE':
      tag = 'STATEMENT';
      break;
    case 'CATCH':
    case 'FUNCTION':
      id = '';
      break;
    case 'IN':
    case 'OF':
    case 'INSTANCEOF':
      if (tag !== 'INSTANCEOF' && this.seenFor) {
        if (tag === 'OF') {
          this.seenTo = true;
          id = last[0] === 'IDENTIFIER' && (_ref = this.tokens)[_ref.length - 2][0] === ',' && (this.tokens.splice(-2, 2), last[1]);
        }
        this.seenFor = false;
        tag = 'FOR' + tag;
        break;
      }
      if (last[1] === '!') {
        this.tokens.pop();
        id = '!' + id;
      }
      tag = 'RELATION';
    }
  } else if (alias = COCO_ALIASES.hasOwnProperty(id)) {
    if (id === 'not' && last.alias && last[1] === '===') {
      last[1] = '!==';
      return id.length;
    }
    _ref = COCO_ALIASES[id], tag = _ref[0], id = _ref[1];
  } else if (id === 'unless') {
    tag = 'IF';
  } else if (id === 'until') {
    tag = 'WHILE';
  } else if (__indexOf.call(RESERVED, id) >= 0) {
    this.carp("reserved word \"" + id + "\"");
  } else if (!last[1] && ((_ref = last[0]) === 'CATCH' || _ref === 'FUNCTION')) {
    return (last[1] = id).length;
  }
  this.token(tag, id);
  switch (false) {
  case !alias:
    this.last.alias = true;
    break;
  case !callable:
    this.last.callable = true;
    break;
  case !colon:
    this.token(':', ':');
  }
  return match[0].length;
};
exports.numberToken = function(it){
  var match, num, last, radix, rnum, sign, _ref;
  if (!(match = NUMBER.exec(it))) {
    return 0;
  }
  num = match[3] || match[0];
  last = this.last;
  switch (num.charAt(0)) {
  case '.':
    if (this.able()) {
      this.token('DOT', '.');
      this.token('STRNUM', num.slice(1));
      this.last.callable = true;
      return match[0].length;
    }
    break;
  case '0':
    if ((_ref = num.charAt(1)) !== '' && _ref !== 'x' && _ref !== '.') {
      this.carp("deprecated octal literal " + num);
    }
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
  if (sign = last[0] === '+-' && !last.spaced) {
    num = last[1] + num;
    this.tokens.pop();
    this.last = last = (_ref = this.tokens)[_ref.length - 1];
  }
  if (last[0] === 'RANGE' && (!last.to || last.by === true)) {
    last[last.to ? 'by' : 'to'] = num;
  } else if (sign) {
    this.token('STRNUM', num);
  } else {
    this.strnum(num);
  }
  return match[0].length;
};
exports.singleStringToken = function(it){
  var str;
  if (!(str = SIMPLESTR.exec(it))) {
    this.carp('unterminated string');
  }
  this.strnum(unlines(str = str[0]));
  return this.countLines(str).length;
};
exports.doubleStringToken = function(it){
  var str;
  str = this.balancedString(it, '"');
  if (0 < str.indexOf('#{', 1)) {
    this.interpolate(str.slice(1, -1), unlines);
  } else {
    this.strnum(unlines(str));
  }
  return this.countLines(str).length;
};
exports.heredocToken = function(code, q){
  var end, txt, doc, lnl, tabs, dent, m, len;
  if (!(code.slice(1, 3) === q + q && ~(end = code.indexOf(q + q + q, 3)))) {
    return 0;
  }
  txt = code.slice(3, end);
  lnl = txt !== (doc = txt.replace(/\n[^\n\S]*$/, ''));
  if (~doc.indexOf('\n')) {
    tabs = /\n[^\n\S]*(?!$)/mg;
    dent = 0 / 0;
    while (m = tabs.exec(doc)) {
      if (!(dent <= (len = m[0].length - 1))) {
        dent = len;
      }
    }
    doc = detab(doc, dent);
    if (doc.charAt(0) === '\n') {
      doc = doc.slice(1);
      ++this.line;
    }
  }
  if (q === '"' && ~doc.indexOf('#{')) {
    this.interpolate(doc, enlines);
  } else {
    this.strnum(enlines(string(doc, q)));
    this.countLines(doc);
  }
  if (lnl) {
    ++this.line;
  }
  return txt.length + 6;
};
exports.commentToken = function(it){
  var end, text, _ref;
  text = ~(end = it.indexOf('*/', 2))
    ? it.slice(0, end + 2)
    : it + '*/';
  if ((_ref = this.last[0]) === 'TERMINATOR' || _ref === 'INDENT' || _ref === 'THEN') {
    this.token('COMMENT', detab(text, this.indent));
    this.token('TERMINATOR', '\n');
  } else {
    this.last.spaced = true;
  }
  return this.countLines(text).length;
};
exports.jsToken = function(it){
  var js;
  if (!(js = JSTOKEN.exec(it))) {
    this.carp('unterminated JS literal');
  }
  this.token('LITERAL', new String(detab((js = js[0]).slice(1, -1), this.indent)));
  this.last[1].js = true;
  return this.countLines(js).length;
};
exports.regexToken = function(it){
  var re, _ref;
  if (((_ref = this.last[0]) === 'LITERAL' || _ref === 'CREMENT') || this.able(true) || !(re = REGEX.exec(it))) {
    return 0;
  }
  this.token('LITERAL', (re = re[0]) === '//' ? '/(?:)/' : re);
  return this.countLines(re).length;
};
exports.heregexToken = function(it){
  var match, heregex, body, flags, tokens, i, token, val, bs, _ref, _len, _ref2;
  if (!(match = HEREGEX.exec(it))) {
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
  for (i = 0, _len = (_ref = this.interpolate(body)).length; i < _len; ++i) {
    token = _ref[i];
    if (token[0] === 'TOKENS') {
      if (((_ref2 = token[1][1]) != null ? _ref2[1] : void 8) === '?') {
        tokens.pop();
        flags = token[1];
      } else {
        tokens.push.apply(tokens, token[1]);
      }
    } else {
      val = token[1].replace(HEREGEX_OMIT, '');
      if (i && !val) {
        continue;
      }
      val = val.replace(bs || (bs = /\\/g), '\\\\');
      tokens.push(['STRNUM', string(val, '\''), token[2]]);
    }
    tokens.push(['+-', '+', tokens[tokens.length - 1][2]]);
  }
  tokens.pop();
  if (flags) {
    this.token(',', ',');
    if (typeof flags === 'string') {
      this.token('STRNUM', "'" + flags + "'");
    } else {
      tokens.push.apply(tokens, flags.slice(2, -1));
    }
  }
  this.token(')CALL', '');
  return heregex.length;
};
exports.wordsToken = function(it){
  var end, tokens, line, row, w, that, word, _i, _ref, _len, _j, _len2, _ref2;
  if (!~(end = it.indexOf(']>', 2))) {
    this.carp('unterminated words');
  }
  if (this.able()) {
    this.token('DOT', '');
  }
  this.token('[', '[');
  tokens = this.tokens, line = this.line;
  for (_i = 0, _len = (_ref = it.slice(2, end).split('\n')).length; _i < _len; ++_i) {
    row = _ref[_i];
    if (that = row.match(w || (w = /\S+/g))) {
      for (_j = 0, _len2 = that.length; _j < _len2; ++_j) {
        word = that[_j];
        tokens.push((_ref2 = ['STRNUM', string(word, '\''), line], _ref2.spaced = true, _ref2));
      }
    }
    ++line;
  }
  this.line = line - 1;
  if (!word) {
    this.token('STRNUM', "''");
  }
  this.token(']', ']');
  return end + 2;
};
exports.lineToken = function(it){
  var indent, last, size, noNewline, _ref;
  this.countLines(indent = MULTIDENT.exec(it)[0]);
  last = this.last;
  last.eol = true;
  last.spaced = true;
  this.seenFrom = this.seenTo = false;
  size = indent.length - 1 - indent.lastIndexOf('\n');
  noNewline = LINE_CONTINUER.test(it) || ((_ref = last[0]) === '+-' || _ref === 'DOT' || _ref === 'ASSIGN' || _ref === 'LOGIC' || _ref === 'MATH' || _ref === 'COMPARE' || _ref === 'RELATION' || _ref === 'SHIFT' || _ref === 'IMPORT');
  if (size - this.indebt === this.indent) {
    noNewline || this.newline();
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
exports.spaceToken = function(it){
  var match;
  return (match = SPACE.exec(it)) && (this.last.spaced = true, match[0].length);
};
exports.literalToken = function(it){
  var val, tag, tokens, i, next, word, _ref;
  if (!(val = SYMBOL.exec(it))) {
    return 0;
  }
  switch (tag = val = val[0]) {
  case '.':
  case '?.':
  case '~.':
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
  case '<':
  case '>':
  case '<=':
  case '>=':
  case '==':
  case '!=':
    tag = 'COMPARE';
    break;
  case '&&':
  case '||':
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
  case '&':
  case '|':
  case '^':
    tag = 'BITWISE';
    break;
  case ';':
    tag = 'TERMINATOR';
    break;
  case '?(':
    tag = 'CALL(';
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
    tag = 'ASSIGN';
    switch (this.last[0]) {
    case 'LOGIC':
      (val = new String(val)).logic = this.tokens.pop()[1];
      break;
    case 'DOT':
      if (this.last[1] === '.') {
        this.last[1] += val;
        return val.length;
      }
    }
    break;
  case '*':
    tag = (_ref = this.last[0]) === '[' || _ref === '(' || _ref === 'DOT' || _ref === ',' || _ref === ';' ? 'STRNUM' : 'MATH';
    break;
  case '->':
  case '~>':
    this.tagParameters();
    tag = 'FUNC_ARROW';
    break;
  case '<-':
  case '<~':
    this.tagParameters();
    tag = 'BACKCALL';
    if (this.last[0] === ')PARAM') {
      break;
    }
    tokens = this.tokens;
    i = tokens.length;
    while ((_ref = tokens[--i][0]) !== 'TERMINATOR' && _ref !== 'INDENT' && _ref !== 'THEN') {}
    tokens.splice(i + 1, 0, ['PARAM(', '', tokens[i][2]]);
    this.token(')PARAM', '');
    break;
  default:
    switch (val) {
    case '\\\n':
      ++this.line;
      break;
    case '@':
      this.token('LITERAL', 'this');
      this.last.callable = true;
      break;
    case '@@':
      this.token('LITERAL', 'arguments');
      break;
    case '::':
      this.token('DOT', '');
      this.token('IDENTIFIER', 'prototype');
      this.last['::'] = true;
      break;
    default:
      next = true;
    }
    if (!next) {
      return val.length;
    }
    switch (val.charAt(0)) {
    case '\\':
      this.strnum('\\' === (word = val.slice(1)) ? "'\\\\'" : string(word, '\''));
      return val.length;
    case '(':
      if (val.length > 1) {
        this.token('CALL(', '(');
        this.token(')CALL', ')');
        return val.length;
      }
      if (this.able(true)) {
        tag = 'CALL(';
      }
      break;
    case '{':
      this.able() && this.token('CLONE', '');
      break;
    case '[':
      this.able() && this.token('DOT', '');
    }
  }
  return this.token(tag, val).length;
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
  var tokens, level, i, tok, that;
  if (!(this.last[0] === ')' && this.last[1])) {
    return;
  }
  tokens = this.tokens;
  level = 1;
  i = tokens.length - 1;
  while (tok = tokens[--i]) {
    switch (that = tok[0]) {
    case ')':
    case ')CALL':
      ++level;
      break;
    case '(':
    case 'CALL(':
      if (--level) {
        break;
      }
      if (that === '(') {
        tok[0] = 'PARAM(';
        this.last[0] = ')PARAM';
      }
      return;
    }
  }
};
exports.balancedString = function(str, end){
  var stack, i, chr;
  stack = [end];
  i = 0;
  while (chr = str.charAt(++i)) {
    if (chr === '\\') {
      ++i;
      continue;
    }
    switch (end) {
    case chr:
      stack.pop();
      if (!(end = stack[stack.length - 1])) {
        return str.slice(0, i + 1);
      }
      break;
    case '"':
      if ('{' === chr && '#' === str.charAt(i - 1)) {
        stack.push(end = '}');
      }
      break;
    case '}':
      switch (chr) {
      case '"':
      case '\'':
        stack.push(end = chr);
        break;
      case '{':
        stack.push(end = '}');
      }
    }
  }
  return this.carp("missing " + stack.pop() + " in a string");
};
exports.interpolate = function(str, nlines){
  var line, ts, pi, i, that, s, code, nested, len, tokens, dot, t, _ref, _len;
  line = this.line;
  ts = [];
  pi = 0;
  i = -1;
  while (that = str.charAt(++i)) {
    if (that === '\\') {
      ++i;
      continue;
    }
    if (!(that === '#' && '{' === str.charAt(i + 1))) {
      continue;
    }
    if (pi < i) {
      ts.push(['S', s = str.slice(pi, i), this.line]);
      this.countLines(s);
    }
    code = this.balancedString(str.slice(i + 1), '}');
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
    if (len = nested.length) {
      if (len > 1) {
        nested.unshift(['(', '(', nested[0][2]]);
        nested.push([')', ')', nested[len][2]]);
      }
      ts.push(['TOKENS', nested]);
    }
    this.countLines(code);
  }
  if (pi < str.length) {
    ts.push(['S', s = str.slice(pi), this.line]);
    this.countLines(s);
  }
  if (((_ref = ts[0]) != null ? _ref[0] : void 8) !== 'S') {
    ts.unshift(['S', '', line]);
  }
  if (nlines == null) {
    return ts;
  }
  tokens = this.tokens;
  dot = this.able()
    ? tokens.push(['DOT', '', line])
    : this.last[0] === 'DOT';
  tokens.push(['(', '(', line]);
  for (i = 0, _len = ts.length; i < _len; ++i) {
    t = ts[i];
    if (i) {
      tokens.push(['+-', '+', tokens[tokens.length - 1][2]]);
    }
    if (t[0] === 'TOKENS') {
      tokens.push.apply(tokens, t[1]);
    } else {
      tokens.push(['STRNUM', nlines(string(t[1], '"')), t[2]]);
    }
  }
  this.token(')', '');
  if (dot) {
    this.last.callable = true;
  }
};
exports.token = function(tag, value){
  this.tokens.push(this.last = [tag, value, this.line]);
  return value;
};
exports.strnum = function(it){
  var dot;
  dot = this.able() || this.last['::']
    ? !this.token('DOT', '')
    : this.last[0] === 'DOT';
  this.token('STRNUM', it);
  if (dot) {
    this.last.callable = true;
  }
};
exports.countLines = function(str){
  var pos;
  pos = 0;
  while (pos = 1 + str.indexOf('\n', pos)) {
    ++this.line;
  }
  return str;
};
exports.able = function(it){
  return !this.last.spaced && able(this.tokens, null, it);
};
exports.carp = function(it){
  throw SyntaxError("" + it + " on line " + (this.line + 1));
};
string = function(body, quote){
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
  return quote + body + quote;
};
detab = function(str, len){
  if (len) {
    return str.replace(RegExp('\\n[^\\n\\S]{' + len + '}', 'g'), '\n');
  } else {
    return str;
  }
};
unlines = function(it){
  return it.replace(/\n[^\n\S]*/g, '');
};
enlines = function(it){
  return it.replace(/\n/g, '\\n');
};
JS_KEYWORDS = ['true', 'false', 'null', 'this', 'void', 'super', 'return', 'throw', 'break', 'continue', 'if', 'else', 'for', 'while', 'switch', 'case', 'default', 'try', 'catch', 'finally', 'class', 'extends', 'new', 'do', 'delete', 'typeof', 'in', 'instanceof', 'import', 'function', 'debugger'];
COCO_ALIASES = {
  not: ['UNARY', '!'],
  is: ['COMPARE', '==='],
  and: ['LOGIC', '&&'],
  or: ['LOGIC', '||']
};
RESERVED = ['var', 'with', 'const', 'enum', 'export', 'implements', 'interface', 'let', 'package', 'private', 'protected', 'public', 'static', 'yield'];
IDENTIFIER = /^(@?[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*)([^\n\S]*:(?![:=]))?/;
NUMBER = /^(?:0x[\da-f]+|([1-9]\d?)r([\da-z]+)|((?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)[a-z]*)/i;
SYMBOL = /^(?:[-+*\/%&|^:<>]=|\\(?:\S[^\s,;)}\]]*|\n)|([+&|:])\1|-[->]|\([^\n\S]*\)|[!=]==?|\.{3}|\?[.(]|~[.>]|<(?:<(?:=|<<?)?|[-~])|>>>?=?|@@|\S)/;
SPACE = /^(?=.)[^\n\S]*(?:#.*)?/;
MULTIDENT = /^(?:\s*#.*)*(?:\n[^\n\S]*)+/;
SIMPLESTR = /^'[^\\']*(?:\\.[^\\']*)*'/;
JSTOKEN = /^`[^\\`]*(?:\\.[^\\`]*)*`/;
REGEX = /^\/(?!\s)[^[\/\n\\]*(?:(?:\\[\s\S]|\[[^\]\n\\]*(?:\\[\s\S][^\]\n\\]*)*])[^[\/\n\\]*)*\/[imgy]{0,4}(?!\w)/;
HEREGEX = /^\/{3}([\s\S]+?)\/{3}([imgy]{0,4})(?!\w)/;
HEREGEX_OMIT = /\s+(?:#.*)?/g;
LINE_CONTINUER = /^\s*(?:,|[?~]?\.(?!\.)|::)/;