var rewrite, able, string, detab, unlines, enlines, JS_KEYWORDS, COCO_ALIASES, RESERVED, IDENTIFIER, NUMBER, SYMBOL, SPACE, MULTIDENT, SIMPLESTR, JSTOKEN, WORD, REGEX, HEREGEX, HEREGEX_OMIT, LINE_CONTINUER, _ref, __clone = function(it){
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
  code = '\n' + code.replace(/\r/g, '');
  this.tokens = [this.last = ['TERMINATOR', '\n', 0]];
  this.line = ~-o.line;
  this.indent = 0;
  this.indents = [];
  while (code = code.slice(i)) {
    switch (code.charAt(0)) {
    case ' ':
      i = this.doSpace(code);
      break;
    case '\n':
      i = this.doLine(code);
      break;
    case '\\':
      i = this.doBackslash(code);
      break;
    case '\'':
      i = this.doHeredoc(code, '\'') || this.doString(code);
      break;
    case '"':
      i = this.doHeredoc(code, '"') || this.doString(code, 2);
      break;
    case '<':
      i = this['[' === code.charAt(1) ? 'doWords' : 'doLiteral'](code);
      break;
    case '/':
      i = '*' === code.charAt(1)
        ? this.doComment(code)
        : '//' === code.substr(1, 2)
          ? this.doHeregex(code)
          : this.doRegex(code) || this.doLiteral(code);
      break;
    case '`':
      i = this.doJS(code);
      break;
    default:
      i = this.doIdentifier(code) || this.doNumber(code) || this.doLiteral(code) || this.doSpace(code);
    }
  }
  this.tokens.shift();
  this.dedent(this.indent);
  o.inter || this.newline();
  o.raw || rewrite(this.tokens);
  return this.tokens;
};
exports.doIdentifier = function(it){
  var match, last, id, tag, colon, _ref;
  if (!(match = IDENTIFIER.exec(it))) {
    return 0;
  }
  last = this.last;
  switch (id = match[1]) {
  case 'from':
    if (((_ref = (_ref = this.tokens)[_ref.length - 2]) != null ? _ref[0] : void 8) !== 'FOR') {
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
  colon = match[2];
  if (colon || last[0] === 'DOT' || this.adi()) {
    if (__indexOf.call(JS_KEYWORDS, id) >= 0 || __indexOf.call(RESERVED, id) >= 0) {
      (id = new String(id)).reserved = true;
    }
  } else if (id === 'this' || id === 'eval') {
    this.token('LITERAL', id, true);
    return id.length;
  } else if (__indexOf.call(JS_KEYWORDS, id) >= 0 || (id === 'then' || id === 'of' || id === 'arguments')) {
    switch (tag = id.toUpperCase()) {
    case 'FOR':
      this.seenFor = true;
      // fallthrough
    case 'THEN':
      this.seenFrom = this.seenTo = false;
      break;
    case 'IMPORT':
      id = '<<<';
      break;
    case 'CATCH':
    case 'FUNCTION':
      id = '';
      break;
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
      tag = 'JUMP';
      break;
    case 'IN':
    case 'OF':
    case 'INSTANCEOF':
      if (tag !== 'INSTANCEOF' && this.seenFor) {
        if (tag === 'OF') {
          id = '';
          this.seenTo = true;
          if (last[0] === 'IDENTIFIER') {
            switch ((_ref = this.tokens)[_ref.length - 2][0]) {
            case ',':
              this.tokens.splice(-2, 1);
              // fallthrough
            case '}':
            case ']':
              this.tokens.pop();
              id = last[1];
            }
          }
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
  } else {
    switch (id) {
    case 'and':
    case 'or':
    case 'is':
    case 'not':
      if (id === 'not' && last.alias && last[1] === '===') {
        last[1] = '!==';
        return id.length;
      }
      this.token.apply(this, COCO_ALIASES[id]);
      this.last.alias = true;
      return id.length;
    case 'unless':
      tag = 'IF';
      break;
    case 'until':
      tag = 'WHILE';
      break;
    default:
      if (__indexOf.call(RESERVED, id) >= 0) {
        this.carp("reserved word \"" + id + "\"");
      }
      if (!last[1] && ((_ref = last[0]) === 'CATCH' || _ref === 'FUNCTION' || _ref === 'LABEL')) {
        return (last[1] = id).length;
      }
      if (id === 'own' && last[0] === 'FOR') {
        tag = 'OWN';
      }
    }
  }
  this.token(tag, id);
  if (colon) {
    this.token(':', ':');
  }
  return match[0].length;
};
exports.doNumber = function(it){
  var match, num, last, radix, rnum, sign, dotpos, _ref;
  if (!(match = NUMBER.exec(it))) {
    return 0;
  }
  num = match[3] || match[0];
  last = this.last;
  switch (num.charAt(0)) {
  case '.':
    if (this.adi()) {
      this.token('STRNUM', num.slice(1), true);
      return match[0].length;
    }
    break;
  case '0':
    if ((_ref = num.charAt(1)) !== '' && _ref !== '.' && _ref !== 'x' && _ref !== 'X') {
      this.carp("deprecated octal literal " + num);
    }
  }
  if (radix = match[1]) {
    num = parseInt(rnum = match[2], radix);
    if (isNaN(num) || num === parseInt(rnum.slice(0, -1), radix)) {
      this.carp("invalid number " + rnum + " in base " + radix);
    }
  }
  if (!last.spaced) {
    if (sign = last[0] === '+-') {
      num = last[1] + num;
      this.tokens.pop();
      this.last = last = (_ref = this.tokens)[_ref.length - 1];
    } else if (match[3] && ~(dotpos = num.indexOf('.')) && able(this.tokens)) {
      match[0] = num = num.slice(0, dotpos);
    }
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
exports.doString = function(code, double){
  var str;
  if (double) {
    str = this.balancedString(code, '"');
    if (0 < str.indexOf('#{', 1)) {
      this.interpolate(str.slice(1, -1), unlines);
      return str.length;
    }
  } else {
    str = (SIMPLESTR.exec(code) || this.carp('unterminated string'))[0];
  }
  this.strnum(unlines(str));
  return this.countLines(str).length;
};
exports.doHeredoc = function(code, q){
  var end, txt, doc, lnl, tabs, dent, that, len;
  if (!(code.slice(1, 3) === q + q && ~(end = code.indexOf(q + q + q, 3)))) {
    return 0;
  }
  txt = code.slice(3, end);
  lnl = txt !== (doc = txt.replace(/\n[^\n\S]*$/, ''));
  if (~doc.indexOf('\n')) {
    tabs = /\n[^\n\S]*(?!$)/mg;
    dent = 0 / 0;
    while (that = tabs.exec(doc)) {
      if (!(dent <= (len = that[0].length - 1))) {
        dent = len;
      }
    }
    doc = detab(doc, dent);
    if ('\n' === doc.charAt(0)) {
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
exports.doComment = function(it){
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
exports.doJS = function(it){
  var js;
  js = (JSTOKEN.exec(it) || this.carp('unterminated JS literal'))[0];
  this.js(detab(js.slice(1, -1), this.indent));
  return this.countLines(js).length;
};
exports.doRegex = function(it){
  var re;
  if (able(this.tokens, null)) {
    if (!(this.last.spaced && (re = REGEX.exec(it)))) {
      return 0;
    }
  } else {
    re = REGEX.exec(it) || this.carp('unterminated regex');
  }
  this.js((re = re[0]) === '//' ? '/(?:)/' : re);
  return re.length;
};
exports.doHeregex = function(it){
  var heregex, body, flags, dynaflag, tokens, interp, i, token, val, bs, _ref, _len;
  _ref = HEREGEX.exec(it) || this.carp('unterminated heregex'), heregex = _ref[0], body = _ref[1], flags = _ref[2];
  if (dynaflag = flags === '?') {
    flags = '';
  }
  if (0 > body.indexOf('#{')) {
    body = body.replace(HEREGEX_OMIT, '').replace(/\//g, '\\/');
    this.js("/" + (body || '(?:)') + "/" + flags);
    return this.countLines(heregex).length;
  }
  this.token('IDENTIFIER', 'RegExp');
  this.token('CALL(', '');
  tokens = this.tokens;
  interp = this.interpolate(body);
  if (dynaflag && interp[interp.length - 1][0] === 'TOKENS') {
    flags = interp.pop()[1];
  }
  for (i = 0, _len = interp.length; i < _len; ++i) {
    token = interp[i];
    if (token[0] === 'TOKENS') {
      tokens.push.apply(tokens, token[1]);
    } else {
      val = token[1].replace(HEREGEX_OMIT, '');
      if (i && !val) {
        continue;
      }
      tokens.push((token[0] = 'STRNUM', token[1] = string(val.replace(bs || (bs = /\\/g), '\\\\'), '\''), token));
    }
    tokens.push(['+-', '+', tokens[tokens.length - 1][2]]);
  }
  tokens.pop();
  if (flags) {
    this.token(',', ',');
    if (typeof flags === 'string') {
      this.token('STRNUM', "'" + flags + "'");
    } else {
      tokens.push.apply(tokens, flags);
    }
  }
  this.token(')CALL', '');
  return heregex.length;
};
exports.doBackslash = function(it){
  var word;
  if (!(word = WORD.exec(it))) {
    if ('\n' === it.charAt(1)) {
      ++this.line;
    }
    return 2;
  }
  word = word[0].slice(1);
  this.strnum('\\' === word ? "'\\\\'" : string(word, '\''));
  return word.length + 1;
};
exports.doWords = function(it){
  var end, tokens, line, row, w, that, word, _i, _ref, _len, _j, _len2, _ref2;
  if (!~(end = it.indexOf(']>', 2))) {
    this.carp('unterminated words');
  }
  this.adi();
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
exports.doLine = function(it){
  var input, tabs, last, length, indent, that, tag, _ref;
  _ref = MULTIDENT.exec(it), input = _ref[0], tabs = _ref[1];
  this.countLines(input);
  last = this.last;
  length = input.length;
  last.eol = true;
  last.spaced = true;
  if (length >= it.length) {
    return length;
  }
  indent = tabs.length;
  if (indent < this.indent) {
    this.dedent(this.indent - indent);
    LINE_CONTINUER.test(it) || this.newline();
  } else {
    if (that = tabs && (this.emender || (this.emender = RegExp('[^' + tabs.charAt(0) + ']'))).exec(tabs)) {
      this.carp("contaminated indent " + escape(that));
    }
    if ((tag = last[0]) === 'ASSIGN' && ((_ref = '' + last[1]) !== '=' && _ref !== ':=') || (tag === '+-' || tag === 'DOT' || tag === 'LOGIC' || tag === 'MATH' || tag === 'COMPARE' || tag === 'RELATION' || tag === 'SHIFT' || tag === 'BITWISE') || LINE_CONTINUER.test(it)) {
      return length;
    }
    if (this.indent < indent) {
      this.indents.push(this.token('INDENT', indent - this.indent));
    } else {
      this.newline();
    }
  }
  this.indent = indent;
  this.seenFrom = false;
  this.seenTo = false;
  return length;
};
exports.doSpace = function(it){
  var match;
  return (match = SPACE.exec(it)) && (this.last.spaced = true, match[0].length);
};
exports.doLiteral = function(it){
  var val, tag, tokens, i, _ref;
  if (!(val = SYMBOL.exec(it))) {
    return 0;
  }
  switch (tag = val = val[0]) {
  case '.':
  case '?.':
    tag = 'DOT';
    break;
  case '+':
  case '-':
    tag = '+-';
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
    if (this.last[0] === 'LOGIC') {
      (val = new String(val)).logic = this.tokens.pop()[1];
    } else if ((_ref = this.last[1]) === '.' || _ref === '?.') {
      this.last[1] += val;
      return val.length;
    }
    break;
  case ':':
    if ((_ref = this.last[0]) !== 'IDENTIFIER' && _ref !== 'STRNUM' && _ref !== ')') {
      this.token('LABEL', '');
      return 1;
    }
    break;
  case '*':
    tag = able(this.tokens) ? 'MATH' : 'STRNUM';
    break;
  case '!':
    if (!this.last.spaced && this.last[1] === 'typeof') {
      this.last[1] = 'classof';
      return 1;
    }
    // fallthrough
  case '~':
    if (((_ref = this.last[1]) === '.' || _ref === '?.') || this.adi()) {
      this.last[1] += val;
      return 1;
    }
    tag = 'UNARY';
    break;
  case '->':
  case '~>':
    this.tagParameters();
    tag = '->';
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
    while ((_ref = tokens[--i][0]) !== 'TERMINATOR' && _ref !== 'INDENT' && _ref !== 'THEN' && _ref !== '(') {}
    tokens.splice(i + 1, 0, ['PARAM(', '', tokens[i][2]]);
    this.token(')PARAM', '');
    break;
  default:
    ALIASES: {
      switch (val) {
      case '@':
        if (this.last[1] === '.' || this.adi()) {
          this.last[1] += val;
        } else {
          this.token('LITERAL', 'this', true);
        }
        break;
      case '@@':
        this.token('LITERAL', 'arguments');
        break;
      case '::':
        this.adi();
        this.token('IDENTIFIER', 'prototype');
        break;
      default:
        break ALIASES;
      }
      return val.length;
    }
    switch (val.charAt(0)) {
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
    case '[':
      this.adi();
      break;
    case '{':
      if (this.able()) {
        this.token('CLONE', '');
      }
    }
  }
  return this.token(tag, val).length;
};
exports.dedent = function(count){
  var indent;
  while (count > 0 && (indent = this.indents.pop())) {
    if (count < indent) {
      this.carp("unmatched dedent (" + count + " for " + indent + ")");
    }
    count -= this.token('DEDENT', indent);
  }
};
exports.newline = function(){
  if (this.last[1] !== '\n') {
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
  return this.carp("missing `" + stack.pop() + "` in a string");
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
    if (pi < i || nested && s >= '') {
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
      inter: true,
      raw: true
    });
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
  if (s == null) {
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
  this.token(')', '', dot);
};
exports.token = function(tag, value, callable){
  this.tokens.push(this.last = [tag, value, this.line]);
  if (callable) {
    this.last.callable = true;
  }
  return value;
};
exports.strnum = function(it){
  this.token('STRNUM', it, this.adi() || this.last[0] === 'DOT');
};
exports.js = function(it){
  var _ref;
  return this.token('LITERAL', (_ref = new String(it), _ref.js = true, _ref));
};
exports.countLines = function(str){
  var pos;
  pos = 0;
  while (pos = 1 + str.indexOf('\n', pos)) {
    ++this.line;
  }
  return str;
};
exports.able = function(call){
  return !this.last.spaced && able(this.tokens, null, call);
};
exports.adi = function(){
  if (this.able()) {
    return this.token('DOT', '.');
  }
};
exports.carp = function(it){
  throw SyntaxError(it + " on line " + (this.line + 1));
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
JS_KEYWORDS = ['true', 'false', 'null', 'this', 'void', 'super', 'return', 'throw', 'break', 'continue', 'if', 'else', 'for', 'while', 'switch', 'case', 'default', 'try', 'catch', 'finally', 'class', 'extends', 'new', 'do', 'delete', 'typeof', 'in', 'instanceof', 'import', 'function', 'let', 'with', 'debugger'];
COCO_ALIASES = {
  not: ['UNARY', '!'],
  is: ['COMPARE', '==='],
  and: ['LOGIC', '&&'],
  or: ['LOGIC', '||']
};
RESERVED = ['var', 'const', 'enum', 'export', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'static', 'yield'];
IDENTIFIER = /^([$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*)([^\n\S]*:(?![:=]))?/;
NUMBER = /^(?:0x[\da-f]+|([2-9]|[12]\d|3[0-6])r([\da-z]+)|((?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)[a-z_]*)/i;
SYMBOL = /^(?:[-+*\/%&|^:<>]=|([+&|:])\1|-[->]|\([^\n\S]*\)|[!=]==?|\.{3}|\?[.(]|~[.>]|<(?:<(?:=|<<?)?|[-~])|>>>?=?|@@|[^\s#])/;
SPACE = /^(?=.)[^\n\S]*(?:#.*)?/;
MULTIDENT = /^(?:\s*#.*)*(?:\n([^\n\S]*))+/;
SIMPLESTR = /^'[^\\']*(?:\\.[^\\']*)*'/;
JSTOKEN = /^`[^\\`]*(?:\\.[^\\`]*)*`/;
WORD = /^\\\S[^\s,;)}\]]*/;
REGEX = /^\/(?!\s)[^[\/\n\\]*(?:(?:\\.|\[[^\]\n\\]*(?:\\.[^\]\n\\]*)*\])[^[\/\n\\]*)*\/[imgy]{0,4}(?!\d)/;
HEREGEX = /^\/{3}([\s\S]*?)\/{3}(\?|[imgy]{0,4})/;
HEREGEX_OMIT = /\s+(?:#.*)?/g;
LINE_CONTINUER = /^\s*(?:,|\??\.(?![.\d]))/;