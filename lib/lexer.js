var rewrite, able, string, TABS, INDENTS, LINES, JS_KEYWORDS, COCO_ALIASES, RESERVED, ID, SYMBOL, SPACE, MULTIDENT, SIMPLESTR, JSTOKEN, BSTOKEN, NUMBER, NUMBER_OMIT, REGEX, HEREGEX_OMIT, LASTDENT, LINE_CONTINUER, _ref, __clone = function(it){
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
  this.inter || (code = code.replace(/\r/g, ''));
  code = '\n' + code;
  this.tokens = [this.last = ['TERMINATOR', '\n', 0]];
  this.line = ~-o.line;
  this.dent = this.braces = 0;
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
    case '"':
      i = this.doString(code);
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
  if (this.inter) {
    this.rest != null || this.carp('unterminated interpolation');
  } else {
    this.newline();
  }
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
    case 'for':
      this.seenFor = true;
      // fallthrough
    case 'then':
      this.seenFrom = this.seenTo = false;
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
  num = (match[3] || match[0]).replace(NUMBER_OMIT, '');
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
    num = parseInt(rnum = match[2].replace(NUMBER_OMIT, ''), radix);
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
exports.doString = function(it){
  var q, parts, str;
  q = it.charAt(0);
  if (q === it.charAt(1)) {
    return q === it.charAt(2)
      ? this.doHeredoc(it, q)
      : (this.strnum(q + q), 2);
  }
  if (q === '"') {
    parts = this.interpolate(it, q);
    this.addInterpolated(parts, unlines);
    return 1 + parts.size;
  }
  str = (SIMPLESTR.exec(it) || this.carp('unterminated string'))[0];
  this.strnum(unlines(string(q, str.slice(1, -1))));
  return this.countLines(str).length;
};
exports.doHeredoc = function(it, q){
  var end, raw, doc, parts, tabs, i, t, _len;
  if (q === '\'') {
    ~(end = it.indexOf(q + q + q, 3)) || this.carp('unterminated heredoc');
    raw = it.slice(3, end);
    doc = raw.replace(LASTDENT, '');
    this.strnum(enlines(string(q, lchomp(detab(doc, heretabs(doc))))));
    return this.countLines(raw).length + 6;
  }
  parts = this.interpolate(it, q + q + q);
  tabs = heretabs(it.slice(3, parts.size).replace(LASTDENT, ''));
  for (i = 0, _len = parts.length; i < _len; ++i) {
    t = parts[i];
    if (t[0] === 'S') {
      if (i + 1 === parts.length) {
        t[1] = t[1].replace(LASTDENT, '');
      }
      t[1] = detab(t[1], tabs);
      if (i === 0) {
        t[1] = lchomp(t[1]);
      }
    }
  }
  this.addInterpolated(parts, enlines);
  return 3 + parts.size;
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
  var match;
  if (able(this.tokens)) {
    if (!this.last.spaced || /^\/[ =]/.test(it) || !(match = REGEX.exec(it))) {
      return 0;
    }
  } else {
    match = REGEX.exec(it) || this.carp('unterminated regex');
  }
  this.regex(match[1], match[2]);
  return match[0].length;
};
exports.doHeregex = function(it){
  var tokens, last, parts, rest, flag, i, t, dynaflag, val, bs, _len;
  tokens = this.tokens, last = this.last;
  parts = this.interpolate(it, '//');
  rest = it.slice(2 + parts.size);
  flag = /^[imgy]{0,4}/.exec(rest)[0];
  if (parts[1]) {
    tokens.push(['ID', 'RegExp', last[2]], ['CALL(', '', last[2]]);
    if ('?' === rest.charAt(0)) {
      ++parts.size;
      for (i = parts.length - 1; i >= 0; --i) {
        t = parts[i];
        if (t[0] === 'TOKENS') {
          dynaflag = parts.splice(i, 1)[0][1];
          break;
        }
      }
    }
    for (i = 0, _len = parts.length; i < _len; ++i) {
      t = parts[i];
      if (t[0] === 'TOKENS') {
        tokens.push.apply(tokens, t[1]);
      } else {
        val = t[1].replace(HEREGEX_OMIT, '');
        if (!val && bs) {
          continue;
        }
        tokens.push((t[0] = 'STRNUM', t[1] = string('\'', val.replace(bs || (bs = /\\/g), '\\\\')), t));
      }
      tokens.push(['+-', '+', tokens[tokens.length - 1][2]]);
    }
    tokens.pop();
    if (flag || dynaflag) {
      this.token(',', ',');
      if (dynaflag) {
        tokens.push.apply(tokens, dynaflag);
      } else {
        this.token('STRNUM', "'" + flag + "'");
      }
    }
    this.token(')CALL', '');
  } else {
    this.regex(parts[0][1].replace(HEREGEX_OMIT, '').replace(/\//g, '\\/'), flag);
  }
  return 2 + parts.size + flag.length;
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
  if (0 > (delta = tabs.length - this.dent)) {
    this.dedent(-delta);
    LINE_CONTINUER.test(it) || this.newline();
  } else {
    if (that = tabs && (this.emender || (this.emender = RegExp('[^' + tabs.charAt(0) + ']'))).exec(tabs)) {
      this.carp("contaminated indent " + escape(that));
    }
    if ((tag = last[0]) === 'ASSIGN' && ((_ref = '' + last[1]) !== '=' && _ref !== ':=' && _ref !== '+=') || (tag === '+-' || tag === 'DOT' || tag === 'LOGIC' || tag === 'MATH' || tag === 'COMPARE' || tag === 'RELATION' || tag === 'SHIFT' || tag === 'BITWISE')) {
      return length;
    }
    cont = LINE_CONTINUER.test(it);
    if (delta) {
      this.indent(delta, cont);
    } else {
      cont || this.newline();
    }
  }
  this.seenFrom = this.seenTo = false;
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
  case '{':
    if (this.able()) {
      this.token('CLONE', '');
    }
    ++this.braces;
    break;
  case '}':
    if (--this.braces >= 0) {
      break;
    }
    this.inter || this.carp('unmatched `}`');
    this.rest = it.slice(1);
    return 9e9;
  case '[':
    this.adi();
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
    if (debt < dent && !this.inter) {
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
exports.interpolate = function(str, end){
  var parts, end0, pos, i, ch, s, clone, nested, delta, that, _ref;
  parts = [];
  end0 = end.charAt(0);
  pos = 0;
  i = -1;
  str = str.slice(end.length);
  while (ch = str.charAt(++i)) {
    if (ch === '\\') {
      ++i;
      continue;
    }
    if (ch === end0) {
      if (end !== str.slice(i, i + end.length)) {
        continue;
      }
      parts.push(['S', this.countLines(str.slice(0, i)), this.line]);
      return parts.size = pos + i + end.length, parts;
    }
    if (!(ch === '#' && '{' === str.charAt(i + 1))) {
      continue;
    }
    if (i || nested && (typeof s == 'undefined' || s === null)) {
      s = parts.push(['S', this.countLines(str.slice(0, i)), this.line]);
    }
    clone = (_ref = __clone(exports), _ref.inter = true, _ref);
    nested = clone.tokenize(str.slice(i + 2), {
      line: this.line,
      raw: true
    });
    while (((_ref = nested[0]) != null ? _ref[0] : void 8) === 'TERMINATOR') {
      nested.shift();
    }
    this.countLines(str.slice(i, delta = str.length - clone.rest.length));
    pos += delta;
    str = clone.rest;
    i = -1;
    if (that = nested.length) {
      if (that > 1) {
        nested.unshift(['(', '(', nested[0][2]]);
        nested.push([')', ')', this.line]);
      }
      parts.push(['TOKENS', nested]);
    }
  }
  this.carp("missing `" + end + "`");
};
exports.addInterpolated = function(parts, nlines){
  var tokens, last, i, t, _len;
  if (!parts[1]) {
    return this.strnum(nlines(string('"', parts[0][1])));
  }
  this.adi();
  tokens = this.tokens, last = this.last;
  tokens.push(['(', '"', last[2]]);
  for (i = 0, _len = parts.length; i < _len; ++i) {
    t = parts[i];
    if (t[0] === 'TOKENS') {
      tokens.push.apply(tokens, t[1]);
    } else {
      if (i > 1 && !t[1]) {
        continue;
      }
      tokens.push(['STRNUM', nlines(string('"', t[1])), t[2]]);
    }
    tokens.push(['+-', '+', tokens[tokens.length - 1][2]]);
  }
  tokens.pop();
  return this.token(')', '', last[0] === 'DOT');
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
exports.regex = function(body, flag){
  try {
    RegExp(body);
  } catch (e) {
    this.carp(e.message);
  }
  return this.js("/" + (body || '(?:)') + "/" + (flag && flag.replace(/(.)(?=.*\1)/g, '')));
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
string = (function(escaped, descape, qs){
  return function(q, body){
    return q + body.replace(escaped, descape).replace(qs[q], '\\$&') + q;
  };
}.call(this, /\\(?:[\\0-7bfnrtuvx]|[^\n\S]|([\w\W]))?/g, function($0, $1){
  return $1 || ($0 === '\\' ? '\\\\' : $0);
}, {
  "'": /'/g,
  '"': /"/g
}));
function heretabs(doc){
  var dent, that, len;
  dent = 0 / 0;
  while (that = TABS.exec(doc)) {
    if (!(dent <= (len = that[0].length - 1))) {
      dent = len;
    }
  }
  return dent;
}
TABS = /\n[^\n\S]*(?!$)/mg;
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
function lchomp(it){
  return it.slice(1 + it.lastIndexOf('\n', 0));
}
JS_KEYWORDS = ['true', 'false', 'null', 'this', 'void', 'super', 'return', 'throw', 'break', 'continue', 'if', 'else', 'for', 'while', 'switch', 'case', 'default', 'try', 'catch', 'finally', 'class', 'extends', 'new', 'do', 'delete', 'typeof', 'in', 'instanceof', 'import', 'function', 'let', 'with', 'debugger'];
COCO_ALIASES = {
  not: ['UNARY', '!'],
  is: ['COMPARE', '==='],
  and: ['LOGIC', '&&'],
  or: ['LOGIC', '||']
};
RESERVED = ['var', 'const', 'enum', 'export', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'static', 'yield'];
ID = /^([$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*)([^\n\S]*:(?![:=]))?/;
SYMBOL = /^(?:[-+*\/%&|^:<>]=|\.{1,3}|([+&|:])\1|\([^\n\S]*\)|-[->]|[!=]==?|\?[.(]|~[.>]|<(?:<(?:=|<{0,2})|[-~])|>>>?=?|\*\*=?|@@|[^\s#])/;
SPACE = /^(?=.)[^\n\S]*(?:#.*)?/;
MULTIDENT = /^(?:\s*#.*)*(?:\n([^\n\S]*))+/;
SIMPLESTR = /^'[^\\']*(?:\\[\s\S][^\\']*)*'/;
JSTOKEN = /^`[^\\`]*(?:\\[\s\S][^\\`]*)*`/;
BSTOKEN = /^\\(?:(\S[^\s,;)}\]]*)|\s+)/;
NUMBER = /^(?:0x[\da-f][\da-f_]*|([2-9]|[12]\d|3[0-6])r([\da-z][\da-z_]*)|((?:\d[\d_]*(?:\.\d[\d_]*)?|\.\d[\d_]*)(?:e[+-]?\d[\d_]*)?)[a-z_]*)/i;
NUMBER_OMIT = /_+/g;
REGEX = /^\/([^[\/\n\\]*(?:(?:\\.|\[[^\]\n\\]*(?:\\.[^\]\n\\]*)*\])[^[\/\n\\]*)*)\/([imgy]{0,4})/;
HEREGEX_OMIT = /\s+(?:#.*)?/g;
LASTDENT = /\n[^\n\S]*$/;
LINE_CONTINUER = /^\s*(?:[,?&|^]|\.(?![.\d])|(?:and|or)(?![$\w\x7f-\uffff]|[^\n\S]*:(?![:=])))/;