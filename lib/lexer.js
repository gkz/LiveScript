var rewrite, able, string, TABS, INDENTS, LINES, BACKSLASHES, reslash, KEYWORDS_SHARED, KEYWORDS_UNUSED, KEYWORDS, COCO_ALIASES, ID, SYMBOL, SPACE, MULTIDENT, SIMPLESTR, JSTOKEN, BSTOKEN, NUMBER, NUMBER_OMIT, REGEX, HEREGEX_OMIT, LASTDENT, LINE_CONTINUER, _ref, __clone = function(it){
  function fn(){ if (this.__proto__ !== it) this.__proto__ = it }
  return fn.prototype = it, new fn;
}, __indexOf = [].indexOf || function(x){
  var i = -1, l = this.length;
  while (++i < l) if (this.hasOwnProperty(i) && this[i] === x) return i;
  return -1;
};
_ref = require('./rewriter'), rewrite = _ref.rewrite, able = _ref.able;
exports.lex = function(code, options){
  return (__clone(exports)).tokenize(code || '', options || {});
};
exports.tokenize = function(code, o){
  var i, c, that;
  this.inter || (code = code.replace(/\r/g, ''));
  code = '\n' + code;
  this.tokens = [this.last = ['TERMINATOR', '\n', 0]];
  this.line = ~-o.line;
  this.dents = [];
  this.closes = [];
  this.parens = [];
  i = 0;
  while (c = code.charAt(i)) {
    switch (c) {
    case ' ':
      i += this.doSpace(code, i);
      break;
    case '\n':
      i += this.doLine(code, i);
      break;
    case '\\':
      i += this.doBackslash(code, i);
      break;
    case '\'':
    case '"':
      i += this.doString(code, i, c);
      break;
    case '<':
      i += '[' === code.charAt(i + 1)
        ? this.doWords(code, i)
        : this.doLiteral(code, i);
      break;
    case '/':
      switch (code.charAt(i + 1)) {
      case '*':
        i += this.doComment(code, i);
        break;
      case '/':
        i += this.doHeregex(code, i);
        break;
      default:
        i += this.doRegex(code, i) || this.doLiteral(code, i);
      }
      break;
    case '`':
      i += this.doJS(code, i);
      break;
    default:
      i += this.doIdentifier(code, i) || this.doNumber(code, i) || this.doLiteral(code, i) || this.doSpace(code, i);
    }
  }
  this.tokens.shift();
  this.dedent(this.dent);
  if (that = this.closes.pop()) {
    this.carp("missing `" + that + "`");
  }
  if (this.inter) {
    this.rest != null || this.carp('unterminated interpolation');
  } else {
    this.last.spaced = true;
    this.newline();
  }
  o.raw || rewrite(this.tokens);
  return this.tokens;
};
exports.dent = 0;
exports.doIdentifier = function(code, lastIndex){
  var match, input, id, colon, last, tag, _ref;
  ID.lastIndex = lastIndex;
  if (!(input = (match = ID.exec(code))[0])) {
    return 0;
  }
  id = match[1], colon = match[2];
  last = this.last;
  if (colon || last[0] === 'DOT' || this.adi()) {
    tag = 'ID';
    if (__indexOf.call(KEYWORDS, id) >= 0) {
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
    case 'for':
      this.seenFor = true;
      // fallthrough
    case 'then':
      this.seenFrom = this.seenTo = false;
      break;
    case 'catch':
      this.unterminate();
      // fallthrough
    case 'function':
      id = '';
      break;
    case 'else':
    case 'case':
    case 'default':
    case 'finally':
      this.unterminate();
      break;
    case 'in':
    case 'of':
    case 'instanceof':
      if (id !== 'instanceof' && this.seenFor) {
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
    case 'import':
      id = '<<<';
      able(this.tokens) || this.token('LITERAL', 'this');
      break;
    default:
      if (__indexOf.call(KEYWORDS_SHARED, id) >= 0) {
        break;
      }
      if (__indexOf.call(KEYWORDS_UNUSED, id) >= 0) {
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
      case 'to':
      case 'til':
        if (this.seenFrom || ((_ref = (_ref = this.tokens)[_ref.length - 2]) != null ? _ref[0] : void 8) === 'FOR' && (this.token('FROM', ''), this.token('STRNUM', '0'))) {
          this.seenFrom = false;
          this.seenTo = true;
          tag = 'TO';
        } else if (last[0] === 'STRNUM' && !last.callable) {
          last[0] = 'RANGE';
          last.op = id;
          return id.length;
        }
        break;
      case 'by':
        if (last[0] === 'STRNUM' && (_ref = this.tokens)[_ref.length - 2][0] === 'RANGE') {
          tag = 'RANGE_BY';
        } else {
          this.seenTo && (this.seenTo = !(tag = 'BY'));
        }
        break;
      case 'ever':
        if (last[0] === 'FOR') {
          this.seenFor = false;
          last[0] = 'WHILE';
          tag = 'LITERAL';
          id = 'true';
        }
      }
    }
  }
  this.token(tag || match[1].toUpperCase(), id);
  if (colon) {
    this.token(':', ':');
  }
  return input.length;
};
exports.doNumber = function(code, lastIndex){
  var match, input, last, radix, rnum, num, _ref;
  NUMBER.lastIndex = lastIndex;
  if (!(input = (match = NUMBER.exec(code))[0])) {
    return 0;
  }
  last = this.last;
  if (match[5] && (last[0] === 'DOT' || this.adi())) {
    this.token('STRNUM', match[4].replace(NUMBER_OMIT, ''));
    return match[4].length;
  }
  if (radix = match[1]) {
    num = parseInt(rnum = match[2].replace(NUMBER_OMIT, ''), radix);
    if (isNaN(num) || num === parseInt(rnum.slice(0, -1), radix)) {
      this.carp("invalid number " + rnum + " in base " + radix);
    }
    num += '';
  } else {
    num = (match[3] || input).replace(NUMBER_OMIT, '');
    if (match[3] && num.charAt() === '0' && ((_ref = num.charAt(1)) !== '' && _ref !== '.')) {
      this.carp("deprecated octal literal " + match[4]);
    }
  }
  if (!last.spaced && last[0] === '+-') {
    last[0] = 'STRNUM';
    last[1] += num;
    return input.length;
  }
  this.strnum(num);
  return input.length;
};
exports.doString = function(code, index, q){
  var parts, str;
  if (q === code.charAt(index + 1)) {
    return q === code.charAt(index + 2)
      ? this.doHeredoc(code, index, q)
      : (this.strnum(q + q), 2);
  }
  if (q === '"') {
    parts = this.interpolate(code, index, q);
    this.addInterpolated(parts, unlines);
    return 1 + parts.size;
  }
  str = (SIMPLESTR.lastIndex = index, SIMPLESTR).exec(code)[0];
  str || this.carp('unterminated string');
  this.strnum(unlines(string(q, str.slice(1, -1))));
  return this.countLines(str).length;
};
exports.doHeredoc = function(code, index, q){
  var end, raw, doc, parts, tabs, i, t, _len;
  if (q === '\'') {
    ~(end = code.indexOf(q + q + q, index + 3)) || this.carp('unterminated heredoc');
    raw = code.slice(index + 3, end);
    doc = raw.replace(LASTDENT, '');
    this.strnum(enlines(string(q, lchomp(detab(doc, heretabs(doc))))));
    return this.countLines(raw).length + 6;
  }
  parts = this.interpolate(code, index, q + q + q);
  tabs = heretabs(code.slice(index + 3, index + parts.size).replace(LASTDENT, ''));
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
exports.doComment = function(code, index){
  var end, comment, _ref;
  comment = ~(end = code.indexOf('*/', index + 2))
    ? code.slice(index, end + 2)
    : code.slice(index) + '*/';
  if ((_ref = this.last[0]) === 'TERMINATOR' || _ref === 'INDENT' || _ref === 'THEN') {
    this.token('COMMENT', detab(comment, this.dent));
    this.token('TERMINATOR', '\n');
  } else {
    this.last.spaced = true;
  }
  return this.countLines(comment).length;
};
exports.doJS = function(code, lastIndex){
  var js;
  JSTOKEN.lastIndex = lastIndex;
  js = JSTOKEN.exec(code)[0];
  js || this.carp('unterminated JS literal');
  this.js(detab(js.slice(1, -1), this.dent));
  return this.countLines(js).length;
};
exports.doRegex = function(code, index){
  var divisable, input, body, flag, _ref;
  if (divisable = able(this.tokens)) {
    if (!this.last.spaced || ((_ref = code.charAt(index + 1)) === ' ' || _ref === '=')) {
      return 0;
    }
  }
  _ref = (REGEX.lastIndex = index, REGEX).exec(code), input = _ref[0], body = _ref[1], flag = _ref[2];
  if (input) {
    this.regex(body, flag);
  } else {
    divisable || this.carp('unterminated regex');
  }
  return input.length;
};
exports.doHeregex = function(code, index){
  var tokens, last, parts, rest, flag, i, t, dynaflag, val, one, _len;
  tokens = this.tokens, last = this.last;
  parts = this.interpolate(code, index, '//');
  rest = code.slice(index + 2 + parts.size);
  flag = this.validate(/^(?:[gimy]{1,4}|[?$]?)/.exec(rest)[0]);
  if (parts[1]) {
    if (flag === '$') {
      this.adi();
      this.token('(', '"');
    } else {
      tokens.push(['ID', 'RegExp', last[2]], ['CALL(', '', last[2]]);
      if (flag === '?') {
        for (i = parts.length - 1; i >= 0; --i) {
          t = parts[i];
          if (t[0] === 'TOKENS') {
            dynaflag = parts.splice(i, 1)[0][1];
            break;
          }
        }
      }
    }
    for (i = 0, _len = parts.length; i < _len; ++i) {
      t = parts[i];
      if (t[0] === 'TOKENS') {
        tokens.push.apply(tokens, t[1]);
      } else {
        val = t[1].replace(HEREGEX_OMIT, '');
        if (one && !val) {
          continue;
        }
        one = tokens.push((t[0] = 'STRNUM', t[1] = string('\'', enslash(val)), t));
      }
      tokens.push(['+-', '+', tokens[tokens.length - 1][2]]);
    }
    tokens.pop();
    if (dynaflag || flag >= 'g') {
      this.token(',', ',');
      if (dynaflag) {
        tokens.push.apply(tokens, dynaflag);
      } else {
        this.token('STRNUM', "'" + flag + "'");
      }
    }
    this.token(flag === '$' ? ')' : ')CALL', '');
  } else {
    this.regex(reslash(parts[0][1].replace(HEREGEX_OMIT, '')), flag);
  }
  return 2 + parts.size + flag.length;
};
exports.doBackslash = function(code, lastIndex){
  var input, word, _ref;
  BSTOKEN.lastIndex = lastIndex;
  _ref = BSTOKEN.exec(code), input = _ref[0], word = _ref[1];
  if (word) {
    this.strnum(string('\'', word));
  } else {
    this.countLines(input);
  }
  return input.length;
};
exports.doWords = function(code, index){
  var end, tokens, line, row, ws, that, word, _i, _ref, _len, _j, _len2, _ref2;
  if (!~(end = code.indexOf(']>', index + 2))) {
    this.carp('unterminated words');
  }
  this.adi();
  this.token('[', '[');
  tokens = this.tokens, line = this.line;
  for (_i = 0, _len = (_ref = code.slice(index + 2, end).split('\n')).length; _i < _len; ++_i) {
    row = _ref[_i];
    if (that = row.match(ws || (ws = /\S+/g))) {
      for (_j = 0, _len2 = that.length; _j < _len2; ++_j) {
        word = that[_j];
        tokens.push((_ref2 = ['STRNUM', string('\'', word), line], _ref2.spaced = true, _ref2));
      }
    }
    ++line;
  }
  this.line = line - 1;
  this.token(']', ']');
  return end + 2 - index;
};
exports.doLine = function(code, index){
  var input, tabs, length, last, delta, that, tag, cont, _ref;
  _ref = (MULTIDENT.lastIndex = index, MULTIDENT).exec(code), input = _ref[0], tabs = _ref[1];
  length = this.countLines(input).length;
  last = this.last;
  last.eol = true;
  last.spaced = true;
  if (index + length >= code.length) {
    return length;
  }
  if (0 > (delta = tabs.length - this.dent)) {
    this.dedent(-delta);
    LINE_CONTINUER.test(code.slice(index + 1)) || this.newline();
  } else {
    if (that = tabs && (this.emender || (this.emender = RegExp('[^' + tabs.charAt(0) + ']'))).exec(tabs)) {
      this.carp("contaminated indent " + escape(that));
    }
    if ((tag = last[0]) === 'ASSIGN' && ((_ref = '' + last[1]) !== '=' && _ref !== ':=' && _ref !== '+=') || (tag === '+-' || tag === 'DOT' || tag === 'LOGIC' || tag === 'MATH' || tag === 'COMPARE' || tag === 'RELATION' || tag === 'SHIFT' || tag === 'BITWISE' || tag === 'IN' || tag === 'OF' || tag === 'TO' || tag === 'BY' || tag === 'FROM')) {
      return length;
    }
    cont = LINE_CONTINUER.test(code.slice(index + 1));
    if (delta) {
      this.indent(delta, cont);
    } else {
      cont || this.newline();
    }
  }
  this.seenFrom = this.seenTo = false;
  return length;
};
exports.doSpace = function(code, lastIndex){
  var input;
  SPACE.lastIndex = lastIndex;
  if (input = SPACE.exec(code)[0]) {
    this.last.spaced = true;
  }
  return input.length;
};
exports.doLiteral = function(code, index){
  var sym, val, tag, that, tokens, i, _ref;
  if (!(sym = (SYMBOL.lastIndex = index, SYMBOL).exec(code)[0])) {
    return 0;
  }
  switch (tag = val = sym) {
  case '.':
  case '?.':
    tag = 'DOT';
    break;
  case '+':
  case '-':
    tag = '+-';
    break;
  case '&&':
  case '||':
    tag = 'LOGIC';
    break;
  case '?':
  case '!?':
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
  case '&':
  case '|':
    tag = 'BITWISE';
    break;
  case ';':
    tag = 'TERMINATOR';
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
  case '<<':
  case '>>':
  case '>>>':
  case '<?':
  case '>?':
    tag = 'SHIFT';
    break;
  case '(':
    if (!(((_ref = this.last[0]) === 'FUNCTION' || _ref === 'LET') || this.able(true))) {
      this.token('(', '(');
      this.closes.push(')');
      this.parens.push(this.last);
      return 1;
    }
    tag = 'CALL(';
    this.closes.push(')CALL');
    break;
  case '[':
  case '{':
    this.adi();
    this.closes.push(']}'.charAt(val === '{'));
    break;
  case '}':
    if (this.inter && val !== (_ref = this.closes)[_ref.length - 1]) {
      this.rest = code.slice(index + 1);
      return 9e9;
    }
    // fallthrough
  case ']':
  case ')':
    if (')' === (tag = val = this.pair(val))) {
      this.lpar = this.parens.pop();
    }
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
  case '<?=':
  case '>?=':
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
    if (that = ((_ref = this.last[0]) === 'TERMINATOR' || _ref === 'INDENT' || _ref === 'THEN') && /^.[^\n\S]*(?=\S)/.exec(code.slice(index))) {
      this.tokens.push(['{', '{', this.line], ['}', '}', this.line], ['ASSIGN', '=', this.line]);
      this.indent(val = that[0].length);
      return val;
    }
    tag = able(this.tokens) ? 'MATH' : 'STRNUM';
    break;
  case '@':
  case '@@':
    this.dotcat(val) || (val === '@'
      ? this.token('LITERAL', 'this', true)
      : this.token('LITERAL', 'arguments'));
    return val.length;
  case '!':
    CONTACT: {
      if (!this.last.spaced) {
        if (able(this.tokens, null, true)) {
          this.token('CALL(', '');
          this.token(')CALL', '!');
        } else if (this.last[1] === 'typeof') {
          this.last[1] = 'classof';
        } else {
          break CONTACT;
        }
        return 1;
      }
    }
    tag = 'UNARY';
    break;
  case '~':
    if (this.dotcat(val)) {
      return 1;
    }
    tag = 'UNARY';
    break;
  case '~>':
    tag = '->';
    // fallthrough
  case '->':
    this.parameters() || (this.token('PARAM(', ''), this.token(')PARAM', ''));
    break;
  case '<~':
    tag = '<-';
    // fallthrough
  case '<-':
    if (this.parameters()) {
      break;
    }
    tokens = this.tokens;
    i = tokens.length;
    while ((_ref = tokens[--i][0]) !== 'TERMINATOR' && _ref !== 'INDENT' && _ref !== 'THEN' && _ref !== '(') {}
    tokens.splice(i + 1, 0, ['PARAM(', '', tokens[i][2]]);
    this.token(')PARAM', '');
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
  this.closes.push('DEDENT');
};
exports.dedent = function(debt){
  var dent;
  this.dent -= debt;
  while (debt > 0 && (dent = this.dents.pop())) {
    if (debt < dent && !this.inter) {
      this.carp("unmatched dedent (" + debt + " for " + dent + ")");
    }
    this.pair('DEDENT');
    debt -= typeof dent === 'number' ? this.token('DEDENT', dent) : dent;
  }
};
exports.newline = function(){
  if (this.last[1] !== '\n') {
    this.token('TERMINATOR', '\n');
  }
};
exports.unterminate = function(){
  this.tokens.length -= this.last[0] === 'TERMINATOR';
};
exports.parameters = function(){
  return this.last[1] === ')' && (this.lpar[0] = 'PARAM(', this.last[0] = ')PARAM');
};
exports.interpolate = function(str, idx, end){
  var parts, end0, pos, i, ch, id, stringified, delta, nested, clone, _ref;
  parts = [];
  end0 = end.charAt(0);
  pos = 0;
  i = -1;
  str = str.slice(idx + end.length);
  while (ch = str.charAt(++i)) {
    switch (ch) {
    case end0:
      if (end !== str.slice(i, i + end.length)) {
        continue;
      }
      parts.push(['S', this.countLines(str.slice(0, i)), this.line]);
      return parts.size = pos + i + end.length, parts;
    case '#':
      if (id = (ID.lastIndex = i + 1, ID).exec(str)[1]) {
        if (id === 'this' || __indexOf.call(KEYWORDS, id) < 0) {
          break;
        }
        i += id.length;
        continue;
      }
      if ('{' !== str.charAt(i + 1)) {
        continue;
      }
      break;
    case '\\':
      ++i;
      // fallthrough
    default:
      continue;
    }
    if (i || nested && !stringified) {
      stringified = parts.push(['S', this.countLines(str.slice(0, i)), this.line]);
    }
    if (id) {
      str = str.slice(delta = i + 1 + id.length);
      parts.push(['TOKENS', nested = [['ID', id, this.line]]]);
    } else {
      clone = (_ref = __clone(exports), _ref.inter = true, _ref.emender = this.emender, _ref);
      nested = clone.tokenize(str.slice(i + 2), {
        line: this.line,
        raw: true
      });
      while (((_ref = nested[0]) != null ? _ref[0] : void 8) === 'TERMINATOR') {
        nested.shift();
      }
      this.countLines(str.slice(i, delta = str.length - clone.rest.length));
      str = clone.rest;
      if (nested.length) {
        nested.unshift(['(', '(', nested[0][2]]);
        nested.push([')', ')', this.line]);
        parts.push(['TOKENS', nested]);
      }
    }
    pos += delta;
    i = -1;
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
  if (flag === '$') {
    return this.strnum(string('\'', enslash(body)));
  }
  return this.js("/" + (body || '(?:)') + "/" + this.validate(flag));
};
exports.validate = function(flag){
  var that;
  if (that = flag && /(.).*\1/.exec(flag)) {
    this.carp("duplicate regex flag `" + that[1] + "`");
  }
  return flag;
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
exports.dotcat = function(it){
  var _ref;
  if (((_ref = this.last[1]) === '.' || _ref === '?.') || this.adi()) {
    return this.last[1] += it;
  }
};
exports.pair = function(it){
  var wanted, _ref;
  if (!(it === (wanted = (_ref = this.closes)[_ref.length - 1]) || ')CALL' === wanted && it === ')')) {
    if ('DEDENT' !== wanted) {
      this.carp("unmatched `" + it + "`");
    }
    this.dedent((_ref = this.dents)[_ref.length - 1]);
    return this.pair(it);
  }
  this.unterminate();
  return this.closes.pop();
};
exports.carp = function(it){
  throw SyntaxError(it + " on line " + (this.line + 1));
};
exports.lex.rewrite = rewrite;
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
  var dent, that, _ref;
  dent = 0 / 0;
  while (that = TABS.exec(doc)) {
    dent <= (_ref = that[0].length - 1) || (dent = _ref);
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
function enslash(it){
  return it.replace(BACKSLASHES, '\\\\');
}
BACKSLASHES = /\\/g;
reslash = (function(re, fn){
  return function(it){
    return it.replace(re, fn);
  };
}.call(this, /(\\.)|\//g, function(){
  return arguments[1] || '\\/';
}));
function lchomp(it){
  return it.slice(1 + it.lastIndexOf('\n', 0));
}
KEYWORDS_SHARED = ['true', 'false', 'null', 'this', 'void', 'super', 'return', 'throw', 'break', 'continue', 'if', 'else', 'for', 'while', 'switch', 'case', 'default', 'try', 'catch', 'finally', 'class', 'extends', 'new', 'do', 'delete', 'typeof', 'in', 'instanceof', 'import', 'function', 'let', 'with', 'debugger'];
KEYWORDS_UNUSED = ['var', 'const', 'enum', 'export', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'static', 'yield'];
KEYWORDS = KEYWORDS_SHARED.concat(KEYWORDS_UNUSED);
COCO_ALIASES = {
  not: ['UNARY', '!'],
  is: ['COMPARE', '==='],
  and: ['LOGIC', '&&'],
  or: ['LOGIC', '||']
};
ID = /([$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*)([^\n\S]*:(?![:=]))?|/g;
SYMBOL = /[-+*\/%&|^:<>]=|\.{1,3}|([+&|:])\1|\([^\n\S]*\)|-[->]|[!=]==?|\?\.|~[.>]|<(?:<(?:=|<{0,2})|[-~])|>>>?=?|[<>]\?=?|!\?|@@|\*\*=?|[^\s#]?/g;
SPACE = /(?=.)[^\n\S]*(?:#.*)?|/g;
MULTIDENT = /(?:\s*#.*)*(?:\n([^\n\S]*))+/g;
SIMPLESTR = /'[^\\']*(?:\\[\s\S][^\\']*)*'|/g;
JSTOKEN = /`[^\\`]*(?:\\[\s\S][^\\`]*)*`|/g;
BSTOKEN = /\\(?:(\S[^\s,;)}\]]*)|\s*)/g;
NUMBER = /0x[\da-f][\da-f_]*|([2-9]|[12]\d|3[0-6])r([\da-z][\da-z_]*)|((\d[\d_]*)(\.\d[\d_]*)?(?:e[+-]?\d[\d_]*)?)[a-z_]*|/ig;
NUMBER_OMIT = /_+/g;
REGEX = /\/([^[\/\n\\]*(?:(?:\\.|\[[^\]\n\\]*(?:\\.[^\]\n\\]*)*\])[^[\/\n\\]*)*)\/([gimy]{1,4}|\$?)|/g;
HEREGEX_OMIT = /\s+(?:#.*)?/g;
LASTDENT = /\n[^\n\S]*$/;
LINE_CONTINUER = /^\s*(?:[,&|>%]|\.(?!\.)|<(?![-~[])|!?\?|(?:and|or)(?![$\w\x7f-\uffff]|[^\n\S]*:(?![:=])))/;