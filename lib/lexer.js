var rewrite, able, string, INDENTS, LINES, JS_KEYWORDS, COCO_ALIASES, RESERVED, ID, NUMBER, SYMBOL, SPACE, MULTIDENT, SIMPLESTR, JSTOKEN, BSTOKEN, REGEX, HEREGEX, HEREGEX_OMIT, LINE_CONTINUER, _ref, __clone = function(it){
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
  this.dent = 0;
  this.dents = [];
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
      i = this.doHeredoc(code, '\'') || this.doString(code, '\'');
      break;
    case '"':
      i = this.doHeredoc(code, '"') || this.doString(code, '"');
      break;
    case '<':
      i = '[' === code.charAt(1)
        ? this.doWords(code)
        : this.doLiteral(code);
      break;
    case '/':
      switch (code.charAt(1)) {
      case '*':
        i = this.doComment(code);
        break;
      case '/':
        i = this.doHeregex(code);
        break;
      default:
        i = this.doRegex(code) || this.doLiteral(code);
      }
      break;
    case '`':
      i = this.doJS(code);
      break;
    default:
      i = this.doIdentifier(code) || this.doNumber(code) || this.doLiteral(code) || this.doSpace(code);
    }
  }
  this.tokens.shift();
  this.dedent(this.dent);
  o.inter || this.newline();
  o.raw || rewrite(this.tokens);
  return this.tokens;
};
exports.doIdentifier = function(it){
  var match, id, colon, last, tag, _ref;
  if (!(match = ID.exec(it))) {
    return 0;
  }
  id = match[1], colon = match[2];
  last = this.last;
  if (colon || last[0] === 'DOT' || this.adi()) {
    tag = 'ID';
    if (__indexOf.call(JS_KEYWORDS, id) >= 0 || __indexOf.call(RESERVED, id) >= 0) {
      (id = new String(id)).reserved = true;
    }
  } else {
    switch (id) {
    case 'for':
      this.seenFor = true;
      // fallthrough
    case 'then':
      this.seenFrom = this.seenTo = false;
      break;
    case 'this':
    case 'eval':
      return this.token('LITERAL', id, true).length;
    case 'true':
    case 'false':
    case 'null':
    case 'void':
    case 'arguments':
    case 'debugger':
      tag = 'LITERAL';
      break;
    case 'new':
    case 'do':
    case 'typeof':
    case 'delete':
      tag = 'UNARY';
      break;
    case 'return':
    case 'throw':
      tag = 'HURL';
      break;
    case 'break':
    case 'continue':
      tag = 'JUMP';
      break;
    case 'catch':
    case 'function':
      id = '';
      break;
    case 'import':
      id = '<<<';
      break;
    case 'in':
    case 'of':
    case 'instanceof':
      if (id !== 'instanceof' && this.seenFor) {
        tag = 'FOR' + id.toUpperCase();
        this.seenFor = false;
        if (id === 'of') {
          id = '';
          this.seenTo = true;
          if (last[0] === 'ID') {
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
        break;
      }
      if (last[1] === '!') {
        this.tokens.pop();
        id = '!' + id;
      }
      tag = 'RELATION';
      break;
    case 'and':
    case 'or':
    case 'is':
    case 'not':
      if (id === 'not' && last.alias && last[1] === '===') {
        last[1] = '!==';
      } else {
        this.token.apply(this, COCO_ALIASES[id]);
        this.last.alias = true;
      }
      return id.length;
    case 'unless':
      tag = 'IF';
      break;
    case 'until':
      tag = 'WHILE';
      break;
    default:
      if (__indexOf.call(JS_KEYWORDS, id) >= 0) {
        break;
      }
      if (__indexOf.call(RESERVED, id) >= 0) {
        this.carp("reserved word \"" + id + "\"");
      }
      if (!last[1] && ((_ref = last[0]) === 'CATCH' || _ref === 'FUNCTION' || _ref === 'LABEL')) {
        return (last[1] = id).length;
      }
      tag = 'ID';
      switch (id) {
      case 'own':
        if (last[0] === 'FOR') {
          tag = 'OWN';
        }
        break;
      case 'all':
        if (last[1] === '<<<') {
          last[1] += '<';
          return 3;
        }
        break;
      case 'from':
        if (((_ref = (_ref = this.tokens)[_ref.length - 2]) != null ? _ref[0] : void 8) === 'FOR') {
          this.seenFor = false;
          this.seenFrom = true;
          tag = 'FROM';
        }
        break;
      case 'ever':
        if (last[0] === 'FOR') {
          this.seenFor = false;
          tag = 'EVER';
        }
        break;
      case 'to':
      case 'til':
        if (this.seenFrom) {
          this.seenFrom = false;
          this.seenTo = true;
          tag = 'TO';
        } else if (last[0] === 'STRNUM' && !isNaN(last[1])) {
          last[0] = 'RANGE';
          last.op = id;
          return id.length;
        }
        break;
      case 'by':
        if (this.seenTo) {
          this.seenTo = false;
          tag = 'BY';
        } else if (last[0] === 'RANGE' && last.to) {
          last.by = true;
          return 2;
        }
      }
    }
  }
  this.token(tag || match[1].toUpperCase(), id);
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
      return this.token('STRNUM', num.slice(1), true).length + 1;
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
exports.doString = function(code, q){
  var str;
  if (q === '"') {
    str = this.balancedString(code, q);
    if (0 < str.indexOf('#{', 1)) {
      this.interpolate(str.slice(1, -1), unlines);
      return str.length;
    }
  } else {
    str = (SIMPLESTR.exec(code) || this.carp('unterminated string'))[0];
  }
  this.strnum(unlines(string(q, str.slice(1, -1))));
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
    this.strnum(enlines(string(q, doc)));
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
    this.token('COMMENT', detab(text, this.dent));
    this.token('TERMINATOR', '\n');
  } else {
    this.last.spaced = true;
  }
  return this.countLines(text).length;
};
exports.doJS = function(it){
  var js;
  js = (JSTOKEN.exec(it) || this.carp('unterminated JS literal'))[0];
  this.js(detab(js.slice(1, -1), this.dent));
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
  this.regex(re[1], re[2]);
  return re[0].length;
};
exports.doHeregex = function(it){
  var heregex, body, flags, dynaflag, tokens, interp, i, token, val, BS, _ref, _len;
  _ref = HEREGEX.exec(it) || this.carp('unterminated heregex'), heregex = _ref[0], body = _ref[1], flags = _ref[2];
  if (dynaflag = flags === '?') {
    flags = '';
  }
  if (0 > body.indexOf('#{')) {
    this.regex(body.replace(HEREGEX_OMIT, '').replace(/\//g, '\\/'), flags);
    return this.countLines(heregex).length;
  }
  this.token('ID', 'RegExp');
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
      if (!val && i > 1) {
        continue;
      }
      tokens.push((token[0] = 'STRNUM', token[1] = string('\'', val.replace(BS || (BS = /\\/g), '\\\\')), token));
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
  var input, word, _ref;
  _ref = BSTOKEN.exec(it), input = _ref[0], word = _ref[1];
  if (word) {
    this.strnum(string('\'', word));
  } else {
    this.countLines(input);
  }
  return input.length;
};
exports.doWords = function(it){
  var end, tokens, line, row, WS, that, word, _i, _ref, _len, _j, _len2, _ref2;
  if (!~(end = it.indexOf(']>', 2))) {
    this.carp('unterminated words');
  }
  this.adi();
  this.token('[', '[');
  tokens = this.tokens, line = this.line;
  for (_i = 0, _len = (_ref = it.slice(2, end).split('\n')).length; _i < _len; ++_i) {
    row = _ref[_i];
    if (that = row.match(WS || (WS = /\S+/g))) {
      for (_j = 0, _len2 = that.length; _j < _len2; ++_j) {
        word = that[_j];
        tokens.push((_ref2 = ['STRNUM', string('\'', word), line], _ref2.spaced = true, _ref2));
      }
    }
    ++line;
  }
  this.line = line - 1;
  this.token(']', ']');
  return end + 2;
};
exports.doLine = function(it){
  var input, tabs, last, length, delta, that, tag, cont, _ref;
  _ref = MULTIDENT.exec(it), input = _ref[0], tabs = _ref[1];
  this.countLines(input);
  last = this.last;
  length = input.length;
  last.eol = true;
  last.spaced = true;
  if (length >= it.length) {
    return length;
  }
  delta = tabs.length - this.dent;
  if (delta < 0) {
    this.dedent(-delta);
    LINE_CONTINUER.test(it) || this.newline();
  } else {
    if (that = tabs && (this.emender || (this.emender = RegExp('[^' + tabs.charAt(0) + ']'))).exec(tabs)) {
      this.carp("contaminated indent " + escape(that));
    }
    if ((tag = last[0]) === 'ASSIGN' && ((_ref = '' + last[1]) !== '=' && _ref !== ':=') || (tag === '+-' || tag === 'DOT' || tag === 'LOGIC' || tag === 'MATH' || tag === 'COMPARE' || tag === 'RELATION' || tag === 'SHIFT' || tag === 'BITWISE')) {
      return length;
    }
    cont = LINE_CONTINUER.test(it);
    if (delta) {
      this.indent(delta, cont);
    } else {
      cont || this.newline();
    }
  }
  this.seenFrom = false;
  this.seenTo = false;
  return length;
};
exports.doSpace = function(it){
  var match;
  return (match = SPACE.exec(it)) && (this.last.spaced = true, match[0].length);
};
exports.doLiteral = function(it){
  var sym, val, tag, that, tokens, i, _ref;
  if (!(sym = SYMBOL.exec(it))) {
    return 0;
  }
  switch (tag = val = sym = sym[0]) {
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
  case '**':
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
  case '(':
    if (this.able(true)) {
      tag = 'CALL(';
    }
    break;
  case '?(':
    tag = 'CALL(';
    break;
  case ';':
    tag = 'TERMINATOR';
    break;
  case ':':
    if ((_ref = this.last[0]) !== 'ID' && _ref !== 'STRNUM' && _ref !== ')') {
      tag = 'LABEL';
      val = '';
    }
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
  case '**=':
    tag = 'ASSIGN';
    if (this.last[0] === 'LOGIC') {
      (val = new String(val)).logic = this.tokens.pop()[1];
    } else if (((_ref = this.last[1]) === '.' || _ref === '?.') || this.last[0] === '?' && this.adi()) {
      this.last[1] += val;
      return val.length;
    }
    break;
  case '*':
    if (that = ((_ref = this.last[0]) === 'TERMINATOR' || _ref === 'INDENT' || _ref === 'THEN') && /^.[^\n\S]*(?=\S)/.exec(it)) {
      this.tokens.push(['{', '{', this.line], ['}', '}', this.line], ['ASSIGN', '=', this.line]);
      this.indent(val = that[0].length);
      return val;
    }
    tag = able(this.tokens) ? 'MATH' : 'STRNUM';
    break;
  case '@':
    if (((_ref = this.last[1]) === '.' || _ref === '?.') || this.adi()) {
      this.last[1] += val;
    } else {
      this.token('LITERAL', 'this', true);
    }
    return 1;
  case '!':
    if (!this.last.spaced && this.last[1] === 'typeof') {
      return (this.last[1] = 'classof', 1);
    }
    // fallthrough
  case '~':
    if (((_ref = this.last[1]) === '.' || _ref === '?.') || this.adi()) {
      return (this.last[1] += val, 1);
    }
    tag = 'UNARY';
    break;
  case '~>':
    tag = '->';
    break;
  case '<~':
    tag = '<-';
    // fallthrough
  case '<-':
    if (this.last[1] === ')') {
      break;
    }
    tokens = this.tokens;
    i = tokens.length;
    while ((_ref = tokens[--i][0]) !== 'TERMINATOR' && _ref !== 'INDENT' && _ref !== 'THEN' && _ref !== '(') {}
    tokens.splice(i + 1, 0, ['PARAM(', '', tokens[i][2]]);
    this.token(')PARAM', '');
    break;
  case '[':
    this.adi();
    break;
  case '{':
    if (this.able()) {
      this.token('CLONE', '');
    }
    break;
  case '@@':
    tag = 'LITERAL';
    val = 'arguments';
    break;
  case '::':
    i = 'prototype';
    // fallthrough
  case '..':
    this.adi();
    tag = 'ID';
    val = i || 'constructor';
    break;
  default:
    if ('(' === val.charAt(0)) {
      this.token('CALL(', '(');
      tag = ')CALL';
      val = ')';
    }
  }
  this.token(tag, val);
  return sym.length;
};
exports.indent = function(delta, dummy){
  this.dent += delta;
  this.dents.push(dummy
    ? '' + delta
    : this.token('INDENT', delta));
};
exports.dedent = function(debt){
  var dent;
  this.dent -= debt;
  while (debt > 0 && (dent = this.dents.pop())) {
    if (debt < dent) {
      this.carp("unmatched dedent (" + debt + " for " + dent + ")");
    }
    debt -= typeof dent === 'number' ? this.token('DEDENT', dent) : dent;
  }
};
exports.newline = function(){
  if (this.last[1] !== '\n') {
    return this.token('TERMINATOR', '\n');
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
  tokens.push(['(', '"', line]);
  for (i = 0, _len = ts.length; i < _len; ++i) {
    t = ts[i];
    if (t[0] === 'TOKENS') {
      tokens.push.apply(tokens, t[1]);
    } else {
      s = nlines(string('"', t[1]));
      if (i > 1 && s.length < 3) {
        continue;
      }
      tokens.push(['STRNUM', s, t[2]]);
    }
    tokens.push(['+-', '+', tokens[tokens.length - 1][2]]);
  }
  tokens.pop();
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
exports.regex = function(body, flags){
  try {
    RegExp(body);
  } catch (e) {
    this.carp(e.message);
  }
  return this.js("/" + (body || '(?:)') + "/" + (flags && flags.replace(/(.)(?=.*\1)/g, '')));
};
exports.countLines = function(it){
  var pos;
  while (pos = 1 + it.indexOf('\n', pos)) {
    ++this.line;
  }
  return it;
};
exports.able = function(call){
  return !this.last.spaced && able(this.tokens, null, call);
};
exports.adi = function(){
  var _ref;
  return !this.last.spaced && (this.last[0] === '?'
    ? (_ref = this.last, _ref[0] = 'DOT', _ref[1] = '?.', _ref)
    : able(this.tokens) && this.token('DOT', '.'));
};
exports.carp = function(it){
  throw SyntaxError(it + " on line " + (this.line + 1));
};
string = function(escaped, descape, qs){
  return function(q, body){
    return q + body.replace(escaped, descape).replace(qs[q], '\\$&') + q;
  };
}(/\\(?:[\\0-7bfnrtuvx]|([\w\W]))?/g, function($0, $1){
  return $1 || ($0.length > 1 ? $0 : '\\\\');
}, {
  "'": /'/g,
  '"': /"/g
});
function detab(str, len){
  if (len) {
    return str.replace(detab[len] || (detab[len] = RegExp('\\n[^\\n\\S]{1,' + len + '}', 'g')), '\n');
  } else {
    return str;
  }
}
function unlines(it){
  return it.replace(INDENTS, '');
}
INDENTS = /\n[^\n\S]*/g;
function enlines(it){
  return it.replace(LINES, '\\n');
}
LINES = /\n/g;
JS_KEYWORDS = ['true', 'false', 'null', 'this', 'void', 'super', 'return', 'throw', 'break', 'continue', 'if', 'else', 'for', 'while', 'switch', 'case', 'default', 'try', 'catch', 'finally', 'class', 'extends', 'new', 'do', 'delete', 'typeof', 'in', 'instanceof', 'import', 'function', 'let', 'with', 'debugger'];
COCO_ALIASES = {
  not: ['UNARY', '!'],
  is: ['COMPARE', '==='],
  and: ['LOGIC', '&&'],
  or: ['LOGIC', '||']
};
RESERVED = ['var', 'const', 'enum', 'export', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'static', 'yield'];
ID = /^([$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*)([^\n\S]*:(?![:=]))?/;
NUMBER = /^(?:0x[\da-f]+|([2-9]|[12]\d|3[0-6])r([\da-z]+)|((?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)[a-z_]*)/i;
SYMBOL = /^(?:[-+*\/%&|^:<>]=|\.{1,3}|([+&|:])\1|\([^\n\S]*\)|-[->]|[!=]==?|\?[.(]|~[.>]|<(?:<(?:=|<{0,2})|[-~])|>>>?=?|\*\*=?|@@|[^\s#])/;
SPACE = /^(?=.)[^\n\S]*(?:#.*)?/;
MULTIDENT = /^(?:\s*#.*)*(?:\n([^\n\S]*))+/;
SIMPLESTR = /^'[^\\']*(?:\\[\s\S][^\\']*)*'/;
JSTOKEN = /^`[^\\`]*(?:\\[\s\S][^\\`]*)*`/;
BSTOKEN = /^\\(?:(\S[^\s,;)}\]]*)|\s+)/;
REGEX = /^\/((?![\s=])[^[\/\n\\]*(?:(?:\\.|\[[^\]\n\\]*(?:\\.[^\]\n\\]*)*\])[^[\/\n\\]*)*)\/([imgy]{0,4})(?!\d)/;
HEREGEX = /^\/\/([\s\S]*?)\/\/([imgy]{1,4}|\??)/;
HEREGEX_OMIT = /\s+(?:#.*)?/g;
LINE_CONTINUER = /^\s*(?:,|\?\.|\.(?![.\d]))/;