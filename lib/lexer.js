var string, TABS, INDENTS, LINES, BACKSLASHES, reslash, character, KEYWORDS_SHARED, KEYWORDS_UNUSED, KEYWORDS, COCO_ALIASES, ID, SYMBOL, SPACE, MULTIDENT, SIMPLESTR, JSTOKEN, BSTOKEN, NUMBER, NUMBER_OMIT, REGEX, HEREGEX_OMIT, LASTDENT, LINE_CONTINUER, OPENERS, CLOSERS, INVERSES, CHAIN, ARG, __indexOf = [].indexOf || function(x){
  var i = -1, l = this.length;
  while (++i < l) if (this.hasOwnProperty(i) && this[i] === x) return i;
  return -1;
}, __slice = [].slice;
exports.lex = function(code, options){
  return (__clone(exports)).tokenize(code || '', options || {});
};
exports.rewrite = function(it){
  var _ref;
  it || (it = this.tokens);
  addImplicitIndentation(it);
  tagPostfixConditionals(it);
  addImplicitParentheses(it);
  addImplicitBraces(it);
  expandLiterals(it);
  if (((_ref = it[0]) != null ? _ref[0] : void 8) === 'TERMINATOR') {
    it.shift();
  }
  return it;
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
    case "0":
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
      i += this.doNumber(code, i);
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
      i += this.doID(code, i) || this.doLiteral(code, i) || this.doSpace(code, i);
    }
  }
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
  o.raw || this.rewrite();
  return this.tokens;
};
exports.dent = 0;
exports.doID = function(code, lastIndex){
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
  var sym, val, tag, that, up, _ref;
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
    switch (false) {
    default:
      if (!this.last.spaced) {
        if (able(this.tokens, null, true)) {
          this.token('CALL(', '');
          this.token(')CALL', '!');
        } else if (this.last[1] === 'typeof') {
          this.last[1] = 'classof';
        } else {
          break;
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
  case '->':
  case '~>':
    up = '->';
    // fallthrough
  case '<-':
  case '<~':
    this.parameters(tag = up || '<-');
    break;
  case '::':
    up = 'prototype';
    // fallthrough
  case '..':
    this.adi();
    tag = 'ID';
    val = up || 'constructor';
    break;
  default:
    switch (val.charAt(0)) {
    case '(':
      this.token('CALL(', '(');
      tag = ')CALL';
      val = ')';
      break;
    case '<':
      if (val.length < 4) {
        this.carp('unterminated words');
      }
      this.adi();
      tag = 'WORDS';
      val = val.slice(2, -2);
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
exports.parameters = function(arrow){
  var i, t, _ref, _ref2;
  if (this.last[1] === ')') {
    this.lpar[0] = 'PARAM(';
    this.last[0] = ')PARAM';
    return;
  }
  if (arrow === '->') {
    this.token('PARAM(', '');
  } else {
    for (i = (_ref = this.tokens).length - 1; i >= 0; --i) {
      t = _ref[i];
      if ((_ref2 = t[0]) === 'TERMINATOR' || _ref2 === 'INDENT' || _ref2 === 'THEN' || _ref2 === '(') {
        break;
      }
    }
    this.tokens.splice(i + 1, 0, ['PARAM(', '', t[2]]);
  }
  return this.token(')PARAM', '');
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
  if (this.last.spaced) {
    return;
  }
  switch (this.last[0]) {
  case '?':
    return _ref = this.last, _ref[0] = 'DOT', _ref[1] = '?.', _ref;
  case '!?':
    _ref = this.last;
    _ref[0] = 'CALL(';
    _ref[1] = '';
    this.token(')CALL', '!');
    return this.token('DOT', '?.');
  default:
    return able(this.tokens) && this.token('DOT', '.');
  }
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
  return carp(it, this.line);
};
function carp(msg, lno){
  throw SyntaxError(msg + " on line " + (-~lno));
}
function able(tokens, i, call){
  var token, tag;
  i == null && (i = tokens.length);
  tag = (token = tokens[i - 1])[0];
  return (tag === 'ID' || tag === ']' || tag === 'SUPER') || (call
    ? token.callable || tag === '?' || (tag === ')' || tag === ')CALL') && token[1]
    : tag === '}' || tag === ')' || tag === ')CALL' || tag === 'STRNUM' || tag === 'LITERAL' || tag === 'WORDS');
}
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
function decode(val, lno){
  if (!isNaN(val)) {
    return [+val];
  }
  val = val.length > 8
    ? 'ng'
    : Function('return' + val)();
  val.length === 1 || carp('bad string in range', lno);
  return [val.charCodeAt(), true];
}
function uxxxx(it){
  return '"\\u' + ('000' + it.toString(16)).slice(-4) + '"';
}
character = typeof JSON == 'undefined' || JSON === null
  ? uxxxx
  : function(it){
    switch (it) {
    case 0x2028:
    case 0x2029:
      return uxxxx(it);
    default:
      return JSON.stringify(String.fromCharCode(it));
    }
  };
function tagPostfixConditionals(tokens){
  var i, token, _len;
  for (i = 0, _len = tokens.length; i < _len; ++i) {
    token = tokens[i];
    if (token[0] === 'IF') {
      detectEnd(tokens, i + 1, ok, go);
    }
  }
  function ok(it){
    var _ref;
    return (_ref = it[0]) === 'TERMINATOR' || _ref === 'INDENT';
  }
  function go(it){
    return it[0] === 'INDENT' && (it[1] || it.then) || (token[0] = 'POST_IF');
  }
}
function addImplicitIndentation(tokens){
  var i, token, tag, next, indent, dedent, idx, seenSwitch, _ref;
  i = 0;
  while (token = tokens[++i]) {
    tag = token[0];
    if (tag !== 'THEN' && tag !== '->' && tag !== 'ELSE' && tag !== 'DEFAULT' && tag !== 'TRY' && tag !== 'CATCH' && tag !== 'FINALLY') {
      continue;
    }
    switch (next = tokens[i + 1][0]) {
    case 'IF':
      if (tag === 'ELSE') {
        continue;
      }
      break;
    case 'INDENT':
    case 'THEN':
      if (tag === 'THEN') {
        tokens.splice(i--, 1);
      }
      continue;
    }
    indent = ['INDENT', 0, token[2]];
    dedent = ['DEDENT', 0];
    if (tag === 'THEN') {
      if (tokens[i - 1][0] === 'TERMINATOR') {
        tokens.splice(--i, 1);
      }
      (tokens[i] = indent).then = true;
    } else {
      tokens.splice(++i, 0, indent);
    }
    switch (false) {
    case next !== ',' && next !== 'DOT':
      --i;
      // fallthrough
    case !((next === 'ID' || next === 'STRNUM' || next === 'LITERAL' || next === 'SUPER') && ',' === ((_ref = tokens[i + 2]) != null ? _ref[0] : void 8)):
      go(0, i += 2);
      ++i;
      break;
    case !((next === '(' || next === '[' || next === '{') && ',' === ((_ref = tokens[idx = 1 + indexOfPair(tokens, i + 1)]) != null ? _ref[0] : void 8)):
      go(0, idx);
      ++i;
      break;
    default:
      seenSwitch = false;
      detectEnd(tokens, i + 1, ok, go);
    }
  }
  function ok(token, i){
    switch (token[0]) {
    case 'DEDENT':
      return true;
    case 'TERMINATOR':
      return token[1] !== ';';
    case ',':
    case 'DOT':
      return tokens[i - 1].eol;
    case 'ELSE':
      return tag === 'THEN';
    case 'CATCH':
      return tag === 'TRY';
    case 'FINALLY':
      return tag === 'TRY' || tag === 'CATCH' || tag === 'THEN';
    case 'SWITCH':
      return !(seenSwitch = true);
    case 'CASE':
    case 'DEFAULT':
      return !seenSwitch;
    }
  }
  function go(_arg, i){
    var prev;
    prev = tokens[i - 1];
    return tokens.splice(prev[0] === ',' ? i - 1 : i, 0, (dedent[2] = prev[2], dedent));
  }
}
function addImplicitParentheses(tokens){
  var i, brackets, token, doblock, endi, tpair, tag, prev, seenSwitch, skipBlock, _ref, _ref2;
  i = 0;
  brackets = [];
  while (token = tokens[++i]) {
    doblock = false;
    if (token[1] === 'do' && ((_ref = tokens[i + 1]) != null ? _ref[0] : void 8) === 'INDENT') {
      endi = indexOfPair(tokens, i + 1);
      if (tokens[endi + 1][0] === 'TERMINATOR' && ((_ref = tokens[endi + 2]) != null ? _ref[0] : void 8) === 'WHILE') {
        token[0] = 'DO';
        tokens[endi + 2].done = true;
        tokens.splice(endi + 1, 1);
      } else {
        (token = tokens[1 + i])[0] = '(';
        (tpair = tokens[endi])[0] = ')';
        doblock = tokens.splice(i, 1);
      }
    }
    tag = token[0];
    prev = tokens[i - 1];
    if (tag === '[') {
      brackets.push(prev[0] === 'DOT');
    }
    if (prev[0] === ']') {
      if (brackets.pop()) {
        prev.index = true;
      } else {
        continue;
      }
    }
    if ((_ref = prev[0]) !== 'FUNCTION' && _ref !== 'LET') {
      if (!(prev.spaced && able(tokens, i, true))) {
        continue;
      }
    }
    if (doblock) {
      token[0] = 'CALL(';
      tpair[0] = ')CALL';
      continue;
    }
    if (!(__indexOf.call(ARG, tag) >= 0 || !token.spaced && (tag === '+-' || tag === '^'))) {
      continue;
    }
    if (tag === 'CREMENT') {
      if (token.spaced || (_ref = (_ref2 = tokens[i + 1]) != null ? _ref2[0] : void 8, __indexOf.call(CHAIN, _ref) < 0)) {
        continue;
      }
    }
    skipBlock = seenSwitch = false;
    tokens.splice(i++, 0, ['CALL(', '', token[2]]);
    detectEnd(tokens, i, ok, go);
  }
  function ok(token, i){
    var pre, _ref;
    if (!skipBlock && token.alias && ((_ref = token[1]) === '&&' || _ref === '||')) {
      return true;
    }
    pre = tokens[i - 1];
    switch (token[0]) {
    case 'DOT':
      return !skipBlock && (pre.spaced || pre[0] === 'DEDENT');
    case 'SWITCH':
      seenSwitch = true;
      // fallthrough
    case 'IF':
    case 'CLASS':
    case 'FUNCTION':
    case 'LET':
    case 'WITH':
      skipBlock = true;
      break;
    case 'CASE':
      if (seenSwitch) {
        skipBlock = true;
      } else {
        return true;
      }
      break;
    case 'INDENT':
      if (skipBlock) {
        return skipBlock = false;
      }
      return (_ref = pre[0]) !== '{' && _ref !== '[' && _ref !== ',' && _ref !== '->' && _ref !== ':' && _ref !== 'ELSE' && _ref !== 'ASSIGN' && _ref !== 'IMPORT' && _ref !== 'UNARY' && _ref !== 'DEFAULT' && _ref !== 'TRY' && _ref !== 'CATCH' && _ref !== 'FINALLY' && _ref !== 'HURL' && _ref !== 'DO';
    case 'WHILE':
      if (token.done) {
        return false;
      }
      // fallthrough
    case 'TERMINATOR':
    case 'POST_IF':
    case 'FOR':
    case 'BY':
    case 'TO':
      return pre[0] !== ',';
    }
    return false;
  }
  function go(token, i){
    return tokens.splice(i, 0, [')CALL', '', tokens[i - 1][2]]);
  }
}
function addImplicitBraces(tokens){
  var stack, i, token, tag, start, paren, oneline, idx, _ref;
  stack = [];
  i = 0;
  while (token = tokens[++i]) {
    if (':' !== (tag = token[0])) {
      switch (false) {
      case __indexOf.call(CLOSERS, tag) < 0:
        start = stack.pop();
        break;
      case __indexOf.call(OPENERS, tag) < 0:
        if (tag === 'INDENT' && tokens[i - 1][0] === '{') {
          tag = '{';
        }
        stack.push([tag, i]);
      }
      continue;
    }
    paren = tokens[i - 1][0] === ')';
    oneline = paren && ((_ref = tokens[start[1] - 1]) != null ? _ref[0] : void 8) === ':' || ((_ref = tokens[i - 2]) != null ? _ref[0] : void 8) === ':';
    if (!(oneline || ((_ref = stack[stack.length - 1]) != null ? _ref[0] : void 8) !== '{')) {
      continue;
    }
    stack.push(['{']);
    idx = paren
      ? start[1]
      : i - 1;
    while (((_ref = tokens[idx - 2]) != null ? _ref[0] : void 8) === 'COMMENT') {
      idx -= 2;
    }
    tokens.splice(idx, 0, ['{', '{', token[2]]);
    detectEnd(tokens, ++i + 1, ok, go);
  }
  function ok(token, i){
    var tag, t1, _ref;
    if (token[1] === ';' || 'DEDENT' === (tag = token[0])) {
      return true;
    }
    switch (tag) {
    case ',':
      break;
    case 'TERMINATOR':
      if (oneline) {
        return true;
      }
      break;
    default:
      return false;
    }
    t1 = (_ref = tokens[i + 1]) != null ? _ref[0] : void 8;
    return t1 !== (tag === ',' ? 'TERMINATOR' : 'COMMENT') && ':' !== ((_ref = tokens[t1 === '('
      ? 1 + indexOfPair(tokens, i + 1)
      : i + 2]) != null ? _ref[0] : void 8);
  }
  function go(token, i){
    return tokens.splice(i, 0, ['}', '', token[2]]);
  }
}
function expandLiterals(tokens){
  var i, token, sig, lno, from, char, to, tochar, by, ts, n, word, that, _ref, _step, _i, _len;
  i = 0;
  while (token = tokens[++i]) {
    switch (token[0]) {
    case 'STRNUM':
      if (~'-+'.indexOf(sig = token[1].charAt(0))) {
        token[1] = token[1].slice(1);
        tokens.splice(i++, 0, ['+-', sig, token[2]]);
      }
      if (token.callable) {
        continue;
      }
      break;
    case 'RANGE':
      _ref = decode(token[1], lno = token[2]), from = _ref[0], char = _ref[1];
      _ref = decode(tokens[i + 1][1], lno), to = _ref[0], tochar = _ref[1];
      if (char ^ tochar) {
        carp('bad "to" in range');
      }
      if (by = ((_ref = tokens[i + 2]) != null ? _ref[0] : void 8) === 'RANGE_BY') {
        if (isNaN(by = (_ref = tokens[i + 3]) != null ? _ref[1] : void 8)) {
          carp('bad "by" in range');
        }
      }
      ts = [];
      to -= token.op === 'til' && 1e-15;
      for (n = from, _step = +by || 1; _step < 0 ? n >= to : n <= to; n += _step) {
        if (0x10000 < ts.push([
          'STRNUM', char
            ? character(n)
            : n + "", lno
        ], [',', ',', lno])) {
          carp('range limit exceeded', lno);
        }
      }
      if (ts.length) {
        ts.pop();
      } else {
        carp('empty range', lno);
      }
      tokens.splice.apply(tokens, [i, by ? 4 : 2].concat(__slice.call(ts)));
      i += ts.length - 1;
      break;
    case 'WORDS':
      ts = [['[', '[', lno = token[2]]];
      for (_i = 0, _len = (_ref = token[1].match(/\S+/g) || '').length; _i < _len; ++_i) {
        word = _ref[_i];
        ts.push(['STRNUM', string('\'', word), lno], [',', ',', lno]);
      }
      tokens.splice.apply(tokens, [i, 1].concat(__slice.call(ts), [[']', ']', lno]]));
      i += ts.length;
      break;
    case ',':
      if ((_ref = tokens[i - 1][0]) === ',' || _ref === '[' || _ref === 'CALL(' || _ref === 'PARAM(') {
        tokens.splice(i++, 0, ['LITERAL', 'void', token[2]]);
      }
      continue;
    case 'INDENT':
      if (that = tokens[i - 1]) {
        if (that[1] === 'new') {
          tokens.splice(i++, 0, ['PARAM(', '', token[2]], [')PARAM', '', token[2]], ['->', '', token[2]]);
        } else if ((_ref = that[0]) === 'FUNCTION' || _ref === 'LET') {
          tokens.splice(i, 0, ['CALL(', '', token[2]], [')CALL', '', token[2]]);
          i += 2;
        }
      }
      continue;
    case 'LITERAL':
    case '}':
    case '!?':
      break;
    case ')':
    case ')CALL':
      if (token[1]) {
        continue;
      }
      break;
    case ']':
      if (token.index) {
        continue;
      }
      break;
    case 'CREMENT':
      if (!able(tokens, i)) {
        continue;
      }
      break;
    default:
      continue;
    }
    if (token.spaced && (_ref = tokens[i + 1][0], __indexOf.call(ARG, _ref) >= 0)) {
      tokens.splice(++i, 0, [',', ',', token[2]]);
    }
  }
}
function detectEnd(tokens, i, ok, go){
  var levels, token, tag;
  levels = 0;
  for (; token = tokens[i]; ++i) {
    if (!levels && ok(token, i)) {
      return go(token, i);
    }
    tag = token[0];
    if (0 > (levels += __indexOf.call(OPENERS, tag) >= 0 || -(__indexOf.call(CLOSERS, tag) >= 0))) {
      return go(token, i);
    }
  }
}
function indexOfPair(tokens, i){
  var level, start, end, that;
  level = 1;
  end = INVERSES[start = tokens[i][0]];
  while (that = tokens[++i]) {
    switch (that[0]) {
    case start:
      ++level;
      break;
    case end:
      if (!--level) {
        return i;
      }
    }
  }
  return -1;
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
SYMBOL = /[-+*\/%&|^:<>]=|\.{1,3}|([+&|:])\1|\([^\n\S]*\)|-[->]|[!=]==?|\?\.|~[.>]|@@|<\[(?:[\s\S]*?\]>)?|<(?:<(?:=|<{0,2})|[-~])|>>>?=?|[<>]\?=?|!\?|\*\*=?|[^\s#]?/g;
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
OPENERS = ['(', '[', '{', 'CALL(', 'PARAM(', 'INDENT'];
CLOSERS = [')', ']', '}', ')CALL', ')PARAM', 'DEDENT'];
INVERSES = new function(){
  var i, o, c, _ref, _len;
  for (i = 0, _len = (_ref = OPENERS).length; i < _len; ++i) {
    o = _ref[i];
    this[c = CLOSERS[i]] = o;
    this[o] = c;
  }
};
CHAIN = ['(', '{', '[', 'ID', 'STRNUM', 'LITERAL', 'LET', 'WITH', 'WORDS'];
ARG = CHAIN.concat(['...', 'UNARY', 'CREMENT', 'PARAM(', 'FUNCTION', 'IF', 'SWITCH', 'TRY', 'CLASS', 'SUPER', 'RANGE', 'LABEL', 'DO']);
function __clone(it){
  function fn(){ if (this.__proto__ !== it) this.__proto__ = it }
  return fn.prototype = it, new fn;
}