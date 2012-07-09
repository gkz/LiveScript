var string, TABS, unlines, enlines, enslash, reslash, character, KEYWORDS_SHARED, KEYWORDS_UNUSED, KEYWORDS, ID, SYMBOL, SPACE, MULTIDENT, SIMPLESTR, BSTOKEN, NUMBER, NUMBER_OMIT, REGEX, HEREGEX_OMIT, LASTDENT, INLINEDENT, NONASCII, OPENERS, CLOSERS, INVERSES, CHAIN, ARG, __slice = [].slice;
exports.lex = function(code, options){
  return __clone(exports).tokenize(code || '', options || {});
};
exports.rewrite = function(it){
  var __ref;
  it || (it = this.tokens);
  firstPass(it);
  addImplicitIndentation(it);
  tagPostfixConditionals(it);
  addImplicitParentheses(it);
  addImplicitBraces(it);
  expandLiterals(it);
  if (((__ref = it[0]) != null ? __ref[0] : void 8) === 'NEWLINE') {
    it.shift();
  }
  return it;
};
exports.tokenize = function(code, o){
  var i, c, that;
  this.inter || (code = code.replace(/[\r\u2028\u2029\uFEFF]/g, ''));
  code = '\n' + code;
  this.tokens = [this.last = ['NEWLINE', '\n', 0]];
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
    default:
      i += this.doID(code, i) || this.doLiteral(code, i) || this.doSpace(code, i);
    }
  }
  this.dedent(this.dent);
  if (that = this.closes.pop()) {
    this.carp("missing `" + that + "`");
  }
  if (this.inter) {
    this.rest == null && this.carp('unterminated interpolation');
  } else {
    this.last.spaced = true;
    this.newline();
  }
  o.raw || this.rewrite();
  return this.tokens;
};
exports.dent = 0;
exports.identifiers = {};
exports.hasOwn = Object.prototype.hasOwnProperty;
exports.checkConsistency = function(camel, id){
  if (this.hasOwn.call(this.identifiers, camel) && this.identifiers[camel] !== id) {
    throw new ReferenceError("Inconsistent use of " + camel + " as " + id + " on line " + (-~this.line));
  } else {
    return this.identifiers[camel] = id;
  }
};
exports.doID = function(code, index){
  var match, input, id, last, tag, that, __ref;
  input = (match = (ID.lastIndex = index, ID).exec(code))[0];
  if (!input) {
    return 0;
  }
  id = match[1].replace(/-+([a-zA-Z0-9$_])/g, function(it){
    return it[1].toUpperCase();
  });
  if (/-/.test(match[1])) {
    this.checkConsistency(id, match[1]);
  }
  if (NONASCII.test(id)) {
    try {
      Function("var " + id);
    } catch (e) {
      this.carp("invalid identifier \"" + id + "\"");
    }
  }
  last = this.last;
  if (match[4] || last[0] === 'DOT' || this.adi()) {
    this.token('ID', __in(id, KEYWORDS) ? (__ref = Object(id), __ref.reserved = true, __ref) : id);
    if (match[4]) {
      this.token(':', ':');
    }
    return input.length;
  }
  switch (id) {
  case 'true':
  case 'false':
  case 'on':
  case 'off':
  case 'yes':
  case 'no':
  case 'null':
  case 'void':
  case 'undefined':
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
  case 'var':
  case 'const':
  case 'export':
    tag = 'DECL';
    break;
  case 'this':
  case 'eval':
  case 'super':
    return this.token('LITERAL', id, true).length;
  case 'for':
    this.seenFor = true;
    // fallthrough
  case 'then':
    this.wantBy = false;
    break;
  case 'catch':
  case 'function':
    id = '';
    break;
  case 'in':
  case 'of':
    if (this.seenFor) {
      this.seenFor = false;
      if (id === 'in') {
        id = '';
        this.wantBy = true;
        if (last[0] === 'ID' && (__ref = this.tokens)[__ref.length - 2][0] !== 'FOR') {
          id = this.tokens.pop()[1];
          if ((__ref = this.tokens)[__ref.length - 1][0] === ',') {
            this.tokens.pop();
          }
        }
      }
      break;
    }
    // fallthrough
  case 'instanceof':
    if (last[1] === '!') {
      id = this.tokens.pop()[1] + id;
    }
    tag = (__ref = this.tokens)[__ref.length - 1][0] === '(' ? 'BIOPR' : 'RELATION';
    break;
  case 'not':
    if (last.alias && last[1] === '===') {
      return last[1] = '!==', 3;
    }
    tag = 'UNARY';
    id = '!';
    break;
  case 'and':
  case 'or':
  case 'is':
  case 'isnt':
    this.unline();
    tag = id == 'is' || id == 'isnt' ? 'COMPARE' : 'LOGIC';
    if (last[0] === '(') {
      tag = 'BIOP';
    }
    this.token(tag, (function(){
      switch (id) {
      case 'is':
        return '===';
      case 'isnt':
        return '!==';
      case 'or':
        return '||';
      case 'and':
        return '&&';
      }
    }()));
    this.last.alias = true;
    return id.length;
  case 'unless':
    tag = 'IF';
    break;
  case 'until':
    tag = 'WHILE';
    break;
  case 'import':
    if (last[0] === '(') {
      id = '<<<';
      tag = 'BIOP';
    } else {
      if (able(this.tokens)) {
        id = '<<<';
      } else {
        tag = 'DECL';
      }
    }
    break;
  case 'with':
    tag = (function(){
      switch (false) {
      case !able(this.tokens):
        return 'CLONEPORT';
      case last[0] !== '(':
        return 'BIOP';
      default:
        return 'WITH';
      }
    }.call(this));
    break;
  case 'when':
    tag = 'CASE';
    // fallthrough
  case 'case':
    if (this.doCase()) {
      return input.length;
    }
    break;
  case 'loop':
    this.token('WHILE', id);
    this.token('LITERAL', 'true');
    return input.length;
  default:
    if (__in(id, KEYWORDS_SHARED)) {
      break;
    }
    if (__in(id, KEYWORDS_UNUSED)) {
      this.carp("reserved word \"" + id + "\"");
    }
    if (!last[1] && ((__ref = last[0]) == 'CATCH' || __ref == 'FUNCTION' || __ref == 'LABEL')) {
      last[1] = id;
      last.spaced = false;
      return id.length;
    }
    tag = 'ID';
    switch (id) {
    case 'own':
      if (last[0] === 'FOR') {
        tag = 'OWN';
      }
      break;
    case 'otherwise':
    case '_':
      if ((__ref = last[0]) == 'CASE' || __ref == '|') {
        last[0] = 'DEFAULT';
        return id.length;
      }
      break;
    case 'all':
      if (that = last[1] === '<<<' && '<' || last[1] === 'import' && 'All') {
        last[1] += that;
        return 3;
      }
      break;
    case 'from':
      this.forange() && (tag = 'FROM');
      break;
    case 'to':
    case 'til':
      this.forange() && this.tokens.push(['FROM', '', this.line], ['STRNUM', '0', this.line]);
      if (this.seenFrom) {
        this.seenFrom = false;
        this.wantBy = true;
        tag = 'TO';
      } else if (!last.callable && last[0] === 'STRNUM' && (__ref = this.tokens)[__ref.length - 2][0] === '[') {
        last[0] = 'RANGE';
        last.op = id;
        return id.length;
      } else if (__in(']', this.closes)) {
        this.token('TO', id);
        return id.length;
      }
      break;
    case 'by':
      if (last[0] === 'STRNUM' && (__ref = this.tokens)[__ref.length - 2][0] === 'RANGE' && (__ref = this.tokens)[__ref.length - 3][0] === '[') {
        tag = 'RANGE_BY';
      } else if (__in(']', this.closes)) {
        tag = 'BY';
      } else {
        this.wantBy && (this.wantBy = !(tag = 'BY'));
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
  tag || (tag = match[1].toUpperCase());
  if ((tag == 'COMPARE' || tag == 'LOGIC' || tag == 'RELATION') && last[0] === '(') {
    tag = tag === 'RELATION' ? 'BIOPR' : 'BIOP';
  }
  if (tag == 'RELATION' || tag == 'THEN' || tag == 'ELSE' || tag == 'CASE' || tag == 'DEFAULT' || tag == 'CATCH' || tag == 'FINALLY' || tag == 'IN' || tag == 'OF' || tag == 'FROM' || tag == 'TO' || tag == 'BY' || tag == 'EXTENDS' || tag == 'IMPLEMENTS') {
    this.unline();
  }
  this.token(tag, id);
  return input.length;
};
exports.doNumber = function(code, lastIndex){
  var match, input, last, radix, rnum, num, __ref;
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
    if (radix > 36 || radix < 2) {
      this.carp("invalid number base " + radix + " (with number " + rnum + "), base must be from 2 to 36");
    }
    if (isNaN(num) || num === parseInt(rnum.slice(0, -1), radix)) {
      this.carp("invalid number " + rnum + " in base " + radix);
    }
    num += '';
  } else {
    num = (match[3] || input).replace(NUMBER_OMIT, '');
    if (match[3] && num.charAt() === '0' && ((__ref = num.charAt(1)) != '' && __ref != '.')) {
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
  str = (SIMPLESTR.lastIndex = index, SIMPLESTR).exec(code)[0] || this.carp('unterminated string');
  this.strnum(unlines(string(q, str.slice(1, -1))));
  return this.countLines(str).length;
};
exports.doHeredoc = function(code, index, q){
  var end, raw, doc, parts, tabs, i, t, __len;
  if (q === '\'') {
    ~(end = code.indexOf(q + q + q, index + 3)) || this.carp('unterminated heredoc');
    raw = code.slice(index + 3, end);
    doc = raw.replace(LASTDENT, '');
    this.strnum(enlines(string(q, lchomp(detab(doc, heretabs(doc))))));
    return this.countLines(raw).length + 6;
  }
  parts = this.interpolate(code, index, q + q + q);
  tabs = heretabs(code.slice(index + 3, index + parts.size).replace(LASTDENT, ''));
  for (i = 0, __len = parts.length; i < __len; ++i) {
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
  var end, comment, __ref;
  comment = ~(end = code.indexOf('*/', index + 2))
    ? code.slice(index, end + 2)
    : code.slice(index) + '*/';
  if ((__ref = this.last[0]) == 'NEWLINE' || __ref == 'INDENT' || __ref == 'THEN' || __ref == '=>') {
    this.token('COMMENT', detab(comment, this.dent));
    this.token('NEWLINE', '\n');
  } else {
    this.last.spaced = true;
  }
  return this.countLines(comment).length;
};
exports.doRegex = function(code, index){
  var divisible, input, body, flag, __ref;
  if (divisible = able(this.tokens) || this.last[0] === 'CREMENT') {
    if (!this.last.spaced || ((__ref = code.charAt(index + 1)) == ' ' || __ref == '=')) {
      return 0;
    }
  }
  __ref = (REGEX.lastIndex = index, REGEX).exec(code), input = __ref[0], body = __ref[1], flag = __ref[2];
  if (input) {
    this.regex(body, flag);
  } else if (!divisible && this.last[0] !== '(') {
    this.carp('unterminated regex');
  }
  return input.length;
};
exports.doHeregex = function(code, index){
  var tokens, last, parts, rest, flag, i, t, dynaflag, val, one, __len;
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
    for (i = 0, __len = parts.length; i < __len; ++i) {
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
    --tokens.length;
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
  var input, word, __ref;
  BSTOKEN.lastIndex = lastIndex;
  __ref = BSTOKEN.exec(code), input = __ref[0], word = __ref[1];
  if (word) {
    this.strnum(string('\'', word));
  } else {
    this.countLines(input);
  }
  return input.length;
};
exports.doLine = function(code, index){
  var input, tabs, length, last, that, delta, tag, __ref;
  __ref = (MULTIDENT.lastIndex = index, MULTIDENT).exec(code), input = __ref[0], tabs = __ref[1];
  length = this.countLines(input).length;
  last = this.last;
  last.eol = true;
  last.spaced = true;
  if (index + length >= code.length) {
    return length;
  }
  if (that = tabs && (this.emender || (this.emender = RegExp('[^' + tabs.charAt() + ']'))).exec(tabs)) {
    this.carp("contaminated indent " + escape(that));
  }
  if (0 > (delta = tabs.length - this.dent)) {
    this.dedent(-delta);
    this.newline();
  } else {
    if (that = tabs && (this.emender || (this.emender = RegExp('[^' + tabs.charAt(0) + ']'))).exec(tabs)) {
      this.carp("contaminated indent " + escape(that));
    }
    if ((tag = last[0]) === 'ASSIGN' && ((__ref = '' + last[1]) != '=' && __ref != ':=' && __ref != '+=') || (tag == '+-' || tag == 'PIPE' || tag == 'BACKPIPE' || tag == 'DOT' || tag == 'LOGIC' || tag == 'MATH' || tag == 'COMPARE' || tag == 'RELATION' || tag == 'SHIFT' || tag == 'BITWISE' || tag == 'IN' || tag == 'OF' || tag == 'TO' || tag == 'BY' || tag == 'FROM' || tag == 'EXTENDS' || tag == 'IMPLEMENTS')) {
      return length;
    }
    if (delta) {
      this.indent(delta);
    } else {
      this.newline();
    }
  }
  this.wantBy = false;
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
exports.doCase = function(){
  var __ref, __ref1;
  if (((__ref = this.last[0]) == 'ASSIGN' || __ref == '->' || __ref == ':') || (this.last[0] === 'INDENT' && ((__ref = (__ref1 = this.tokens)[__ref1.length - 2][0]) == 'ASSIGN' || __ref == '->' || __ref == ':'))) {
    this.token('SWITCH', 'switch');
    this.line++;
    return this.token('CASE', 'case');
  }
};
exports.doLiteral = function(code, index){
  var sym, val, tag, arrow, i, t, that, up, __ref, __ref1, __this = this;
  if (!(sym = (SYMBOL.lastIndex = index, SYMBOL).exec(code)[0])) {
    return 0;
  }
  switch (tag = val = sym) {
  case '=>':
    tag = 'THEN';
    this.unline();
    break;
  case '|':
    tag = 'CASE';
    if (this.doCase()) {
      return sym.length;
    }
    break;
  case '|>':
    tag = 'PIPE';
    break;
  case '`':
    tag = 'BACKTICK';
    break;
  case '<<':
  case '>>':
    tag = 'COMPOSE';
    break;
  case '<|':
    tag = 'BACKPIPE';
    break;
  case '+':
  case '-':
    tag = '+-';
    break;
  case '&&':
  case '||':
    tag = 'LOGIC';
    break;
  case '.&.':
  case '.|.':
  case '.^.':
    tag = 'BITWISE';
    break;
  case '^^':
    tag = 'CLONE';
    break;
  case '**':
  case '^':
    tag = 'POWER';
    break;
  case '?':
  case '!?':
    if (this.last[0] === '(') {
      createItFunc();
    } else {
      if (this.last.spaced) {
        tag = 'LOGIC';
      }
    }
    break;
  case '/':
  case '%':
  case '%%':
    tag = 'MATH';
    break;
  case '+++':
    tag = 'CONCAT';
    break;
  case '++':
  case '--':
    tag = 'CREMENT';
    break;
  case '<<<':
  case '<<<<':
    tag = 'IMPORT';
    break;
  case ';':
    tag = 'NEWLINE';
    this.wantBy = false;
    break;
  case '.':
    if (this.last[0] === '(') {
      createItFunc();
    }
    if (this.last[1] === '?') {
      this.last[0] = '?';
    }
    tag = 'DOT';
    break;
  case ',':
    switch (this.last[0]) {
    case ',':
    case '[':
    case '(':
    case 'CALL(':
      this.token('LITERAL', 'void');
      break;
    case 'FOR':
    case 'OWN':
      this.token('ID', '');
    }
    break;
  case '!=':
    if (!(able(this.tokens) || ((__ref = this.last[0]) == '(' || __ref == 'CREMENT'))) {
      this.tokens.push(['UNARY', '!', this.line], ['ASSIGN', '=', this.line]);
      return 2;
    }
    // fallthrough
  case '===':
  case '!==':
  case '==':
    val = (function(){
      switch (val) {
      case '===':
        return '==';
      case '!==':
        return '!=';
      case '==':
        return '===';
      case '!=':
        return '!==';
      }
    }());
    tag = 'COMPARE';
    break;
  case '<':
  case '>':
  case '<=':
  case '>=':
    tag = 'COMPARE';
    break;
  case '.<<.':
  case '.>>.':
  case '.>>>.':
  case '<?':
  case '>?':
    tag = 'SHIFT';
    break;
  case '(':
    if (!(((__ref = this.last[0]) == 'FUNCTION' || __ref == 'LET') || this.able(true) || this.last[1] === '.@')) {
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
    if (this.inter && val !== (__ref = this.closes)[__ref.length - 1]) {
      this.rest = code.slice(index + 1);
      return 9e9;
    }
    // fallthrough
  case ']':
  case ')':
    if (tag === ')' && ((__ref = this.last[0]) == '+-' || __ref == 'COMPARE' || __ref == 'LOGIC' || __ref == 'MATH' || __ref == 'POWER' || __ref == 'SHIFT' || __ref == 'BITWISE' || __ref == 'CONCAT' || __ref == 'COMPOSE' || __ref == 'RELATION' || __ref == 'PIPE' || __ref == 'BACKPIPE' || __ref == 'IMPORT' || __ref == 'CLONEPORT' || __ref == 'ASSIGN')) {
      (__ref = this.tokens)[__ref.length - 1][0] = (function(){
        switch (this.last[0]) {
        case 'RELATION':
          return 'BIOPR';
        case 'PIPE':
          this.parameters(false, -1);
          return 'BIOPP';
        default:
          return 'BIOP';
        }
      }.call(this));
    }
    if (')' === (tag = val = this.pair(val))) {
      this.lpar = this.parens.pop();
    }
    break;
  case '=':
  case ':':
    if (this.last[0] === 'UNARY' && this.last[1] === '!' && ((__ref = (__ref1 = this.tokens)[__ref1.length - 2][1]) == '.@' || __ref == 'this')) {
      this.tokens.pop();
      this.token('CALL(', '(');
      this.token(')CALL', ')');
    }
    if (this.last[0] === ')CALL') {
      if (val === '=') {
        tag = 'ASSIGN';
      }
      arrow = '->';
      this.tokens.pop();
      this.token(')PARAM', ')');
      for (i = (__ref = this.tokens).length - 1; i >= 0; --i) {
        t = __ref[i];
        if (t[0] === 'CALL(') {
          break;
        }
      }
      this.tokens.splice(i, 1, [tag, val, this.line], ['PARAM(', '(', this.line]);
      if ((__ref = this.tokens[i - 1][1]) == '.@' || __ref == 'this') {
        this.tokens.splice(i - 1, 1);
        arrow = '~>';
        i--;
      }
      if (this.tokens[i - 2][1] === '!') {
        this.tokens.splice(i - 2, 1);
        this.tokens.splice(i, 0, ['UNARY', '!', this.line]);
      } else if (this.tokens[i - 2][1] === '.' && this.tokens[i - 3][1] === ')' && this.tokens[i - 4][1] === '!' && this.tokens[i - 5][1] === 'this') {
        this.tokens.splice(i - 4, 2);
        this.tokens.splice(i - 1, 0, ['UNARY', '!', this.line]);
      }
      this.token('->', arrow.charAt(0) + arrow);
      return sym.length;
    }
    if (val === ':') {
      if ((__ref = this.last[0]) != 'ID' && __ref != 'STRNUM' && __ref != ')') {
        tag = 'LABEL';
        val = '';
      }
      this.token(tag, val);
      return sym.length;
    }
    // fallthrough
  case ':=':
  case '+=':
  case '-=':
  case '*=':
  case '/=':
  case '%=':
  case '%%=':
  case '<?=':
  case '>?=':
  case '**=':
  case '^=':
    if (this.last[1] === '.' || this.last[0] === '?' && this.adi()) {
      this.last[1] += val;
      return val.length;
    }
    if (this.last[0] === 'LOGIC') {
      (val = Object(val)).logic = this.tokens.pop()[1];
    } else if ((val == '+=' || val == '-=') && !able(this.tokens) && ((__ref = this.last[0]) != '+-' && __ref != 'UNARY' && __ref != 'LABEL')) {
      this.token('UNARY', val.charAt());
      val = '=';
    }
    tag = 'ASSIGN';
    break;
  case '::=':
    this.token('DOT', '.');
    this.token('ID', 'prototype');
    this.token('IMPORT', '<<');
    return sym.length;
  case '*':
    if (that = ((__ref = this.last[0]) == 'NEWLINE' || __ref == 'INDENT' || __ref == 'THEN' || __ref == '=>') && (INLINEDENT.lastIndex = index + 1, INLINEDENT).exec(code)[0].length) {
      this.tokens.push(['LITERAL', 'void', this.line], ['ASSIGN', '=', this.line]);
      this.indent(index + that - 1 - this.dent - code.lastIndexOf('\n', index - 1));
      return that;
    }
    tag = able(this.tokens) || this.last[0] === 'CREMENT' && able(this.tokens, this.tokens.length - 1) || this.last[0] === '(' ? 'MATH' : 'STRNUM';
    break;
  case '@':
  case '@@':
    this.dotcat(val) || (val === '@' && this.token('LITERAL', 'this', true));
    return val.length;
  case '&':
    this.token('LITERAL', 'arguments');
    return 1;
  case '!':
    switch (false) {
    default:
      if (!this.last.spaced) {
        if (able(this.tokens, null, true)) {
          this.token('CALL(', '!');
          this.token(')CALL', ')');
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
  case '-->':
  case '~~>':
    up = '->';
    // fallthrough
  case '<-':
  case '<~':
  case '<--':
  case '<~~':
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
  if ((tag == '+-' || tag == 'COMPARE' || tag == 'LOGIC' || tag == 'MATH' || tag == 'POWER' || tag == 'SHIFT' || tag == 'BITWISE' || tag == 'CONCAT' || tag == 'COMPOSE' || tag == 'RELATION' || tag == 'PIPE' || tag == 'BACKPIPE' || tag == 'IMPORT') && this.last[0] === '(') {
    tag = tag === 'BACKPIPE' ? 'BIOPBP' : 'BIOP';
  }
  if (tag == ',' || tag == 'CASE' || tag == 'PIPE' || tag == 'BACKPIPE' || tag == 'DOT' || tag == 'LOGIC' || tag == 'COMPARE' || tag == 'MATH' || tag == 'POWER' || tag == 'IMPORT' || tag == 'SHIFT' || tag == 'BITWISE') {
    this.unline();
  }
  function createItFunc(nc){
    __this.token('PARAM(', '(');
    __this.token(')PARAM', ')');
    __this.token('->', '->');
    return __this.token('ID', 'it');
  }
  this.token(tag, val);
  return sym.length;
};
exports.token = function(tag, value, callable){
  this.tokens.push(this.last = [tag, value, this.line]);
  if (callable) {
    this.last.callable = true;
  }
  return value;
};
exports.indent = function(delta){
  this.dent += delta;
  this.dents.push(this.token('INDENT', delta));
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
  var __ref;
  this.last[1] === '\n' || this.tokens.push(this.last = (__ref = ['NEWLINE', '\n', this.line], __ref.spaced = true, __ref));
};
exports.unline = function(){
  var __ref;
  if (!this.tokens[1]) {
    return;
  }
  switch (this.last[0]) {
  case 'INDENT':
    (__ref = this.dents)[__ref.length - 1] += '';
    // fallthrough
  case 'NEWLINE':
    this.tokens.length--;
  }
};
exports.parameters = function(arrow, offset){
  var i, t, __ref, __ref1;
  if (this.last[0] === ')' && ')' === this.last[1]) {
    this.lpar[0] = 'PARAM(';
    this.last[0] = ')PARAM';
    return;
  }
  if (arrow === '->') {
    this.token('PARAM(', '');
  } else {
    for (i = (__ref = this.tokens).length - 1; i >= 0; --i) {
      t = __ref[i];
      if ((__ref1 = t[0]) == 'NEWLINE' || __ref1 == 'INDENT' || __ref1 == 'THEN' || __ref1 == '=>' || __ref1 == '(') {
        break;
      }
    }
    this.tokens.splice(i + 1, 0, ['PARAM(', '', t[2]]);
  }
  if (offset) {
    this.tokens.splice(this.tokens.length + offset, 0, [')PARAM', '', t[2]]);
  } else {
    this.token(')PARAM', '');
  }
};
exports.interpolate = function(str, idx, end){
  var parts, end0, pos, i, ch, idOrig, id, stringified, delta, nested, clone, __ref;
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
      if (id = idOrig = (ID.lastIndex = i + 1, ID).exec(str)[1]) {
        id = id.replace(/-+([a-zA-Z0-9$_])/g, __fn);
        if (id === 'this') {
          break;
        }
        try {
          Function("'use strict'; var " + id);
          break;
        } catch (__e) {}
        this.carp("invalid variable interpolation \"" + id + "\"");
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
      str = str.slice(delta = i + 1 + idOrig.length);
      parts.push(['TOKENS', nested = [['ID', id, this.line]]]);
    } else {
      clone = (__ref = __clone(exports), __ref.inter = true, __ref.emender = this.emender, __ref);
      nested = clone.tokenize(str.slice(i + 2), {
        line: this.line,
        raw: true
      });
      delta = str.length - clone.rest.length;
      str = clone.rest, this.line = clone.line;
      while (((__ref = nested[0]) != null ? __ref[0] : void 8) === 'NEWLINE') {
        nested.shift();
      }
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
  function __fn(it){
    return it[1].toUpperCase();
  }
};
exports.addInterpolated = function(parts, nlines){
  var tokens, last, left, right, joint, callable, i, t, __ref, __len;
  if (!parts[1]) {
    return this.strnum(nlines(string('"', parts[0][1])));
  }
  tokens = this.tokens, last = this.last;
  __ref = !last.spaced && last[1] === '%'
    ? (--tokens.length, this.last = last = tokens[tokens.length - 1], ['[', ']', [',', ',']])
    : ['(', ')', ['+-', '+']], left = __ref[0], right = __ref[1], joint = __ref[2];
  callable = this.adi();
  tokens.push([left, '"', last[2]]);
  for (i = 0, __len = parts.length; i < __len; ++i) {
    t = parts[i];
    if (t[0] === 'TOKENS') {
      tokens.push.apply(tokens, t[1]);
    } else {
      if (i > 1 && !t[1]) {
        continue;
      }
      tokens.push(['STRNUM', nlines(string('"', t[1])), t[2]]);
    }
    tokens.push(joint.concat(tokens[tokens.length - 1][2]));
  }
  --tokens.length;
  this.token(right, '', callable);
};
exports.strnum = function(it){
  this.token('STRNUM', it, this.adi() || this.last[0] === 'DOT');
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
  return this.token('LITERAL', "/" + (body || '(?:)') + "/" + this.validate(flag));
};
exports.adi = function(){
  if (this.last.spaced) {
    return;
  }
  if (this.last[0] === '!?') {
    this.last[0] = 'CALL(';
    this.tokens.push([')CALL', '', this.line], ['?', '?', this.line]);
  }
  if (able(this.tokens)) {
    return this.token('DOT', '.');
  }
};
exports.dotcat = function(it){
  if (this.last[1] === '.' || this.adi()) {
    return this.last[1] += it;
  }
};
exports.pair = function(it){
  var wanted, __ref;
  if (!(it === (wanted = (__ref = this.closes)[__ref.length - 1]) || ')CALL' === wanted && it === ')')) {
    if ('DEDENT' !== wanted) {
      this.carp("unmatched `" + it + "`");
    }
    this.dedent((__ref = this.dents)[__ref.length - 1]);
    return this.pair(it);
  }
  this.unline();
  return this.closes.pop();
};
exports.able = function(call){
  return !this.last.spaced && able(this.tokens, null, call);
};
exports.countLines = function(it){
  var pos;
  while (pos = 1 + it.indexOf('\n', pos)) {
    ++this.line;
  }
  return it;
};
exports.forange = function(){
  var __ref, __ref1;
  if (((__ref = (__ref = this.tokens)[__ref.length - 2 - ((__ref1 = this.last[0]) == 'NEWLINE' || __ref1 == 'INDENT')]) != null ? __ref[0] : void 8) === 'FOR') {
    return this.seenFor = false, this.seenFrom = true, this;
  }
};
exports.validate = function(flag){
  var that;
  if (that = flag && /(.).*\1/.exec(flag)) {
    this.carp("duplicate regex flag `" + that[1] + "`");
  }
  return flag;
};
exports.carp = function(it){
  carp(it, this.line);
};
function carp(msg, lno){
  throw SyntaxError(msg + " on line " + (-~lno));
}
function able(tokens, i, call){
  var token, tag;
  i == null && (i = tokens.length);
  tag = (token = tokens[i - 1])[0];
  return (tag == 'ID' || tag == ']' || tag == '?') || (call
    ? token.callable || (tag == ')' || tag == ')CALL' || tag == 'BIOPBP') && token[1]
    : tag == '}' || tag == ')' || tag == ')CALL' || tag == 'STRNUM' || tag == 'LITERAL' || tag == 'WORDS');
}
string = (function(escaped, descape, qs){
  return function(q, body){
    return q + body.replace(escaped, descape).replace(qs[q], '\\$&') + q;
  };
}.call(this, /\\(?:([0-3]?[0-7]{2}|[1-7]|0(?=[89]))|[\\0bfnrtuvx]|[^\n\S]|([\w\W]))?/g, function(it, oct, rest){
  if (oct) {
    return '\\x' + (0x100 + parseInt(oct, 8)).toString(16).slice(1);
  }
  return rest || (it === '\\' ? '\\\\' : it);
}, {
  "'": /'/g,
  '"': /"/g
}));
function heretabs(doc){
  var dent, that, __ref;
  dent = 0 / 0;
  while (that = TABS.exec(doc)) {
    dent <= (__ref = that[0].length - 1) || (dent = __ref);
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
function replacer(re, to){
  return function(it){
    return it.replace(re, to);
  };
}
unlines = replacer(/\n[^\n\S]*/g, '');
enlines = replacer(/\n/g, '\\n');
enslash = replacer(/\\/g, '\\\\');
reslash = replacer(/(\\.)|\//g, function(){
  return arguments[1] || '\\/';
});
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
  var i, token, __len;
  for (i = 0, __len = tokens.length; i < __len; ++i) {
    token = tokens[i];
    if (token[0] === 'IF') {
      detectEnd(tokens, i + 1, ok, go);
    }
  }
  function ok(it){
    var __ref;
    return (__ref = it[0]) == 'NEWLINE' || __ref == 'INDENT';
  }
  function go(it){
    it[0] === 'INDENT' && (it[1] || it.then) || (token[0] = 'POST_IF');
  }
}
function firstPass(tokens){
  var prev, i, token, tag, val, line, parens, j, k, t, __ref;
  prev = ['NEWLINE', '\n', 0];
  i = 0;
  while (token = tokens[++i]) {
    tag = token[0], val = token[1], line = token[2];
    switch (false) {
    case !(val === '.' && token.spaced && prev.spaced):
      tokens[i] = ['COMPOSE', '<<', line];
      break;
    case !(tag === ')' && prev[1] === '.'):
      tokens.splice(i, 0, ['[', '[', line], ['ID', 'it', line], [']', ']', line]);
      parens = 1;
      LOOP: for (j = i; j >= 0; --j) {
        switch (tokens[j][0]) {
        case ')':
          ++parens;
          break;
        case '(':
          if (--parens === 0) {
            tokens.splice(j + 1, 0, ['PARAM(', '(', line], ['ID', 'it', line], [')PARAM', ')', line], ['->', '->', line]);
            break LOOP;
          }
        }
      }
      break;
    case tag !== 'CLASS':
      k = i;
      while (t = tokens[++k]) {
        if ((__ref = t[0]) == 'THEN' || __ref == 'NEWLINE' || __ref == 'INDENT') {
          break;
        }
      }
      if (t[0] === 'NEWLINE') {
        tokens.splice(k, 0, ['THEN', 'THEN', line]);
      }
    }
    prev = token;
    continue;
  }
}
function addImplicitIndentation(tokens){
  var i, token, tag, next, indent, dedent, idx, seenSwitch, __ref;
  i = 0;
  while (token = tokens[++i]) {
    tag = token[0];
    if (tag != '->' && tag != 'THEN' && tag != 'ELSE' && tag != 'DEFAULT' && tag != 'TRY' && tag != 'CATCH' && tag != 'FINALLY' && tag != 'CONST' && tag != 'EXPORT') {
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
      (tokens[i] = indent).then = true;
    } else {
      tokens.splice(++i, 0, indent);
    }
    switch (false) {
    case next != 'DOT' && next != '?' && next != ',' && next != 'PIPE' && next != 'BACKPIPE':
      --i;
      // fallthrough
    case !((next == 'ID' || next == 'STRNUM' || next == 'LITERAL') && ',' === ((__ref = tokens[i + 2]) != null ? __ref[0] : void 8)):
      go(0, i += 2);
      ++i;
      break;
    case !((next == '(' || next == '[' || next == '{') && ',' === ((__ref = tokens[idx = 1 + indexOfPair(tokens, i + 1)]) != null ? __ref[0] : void 8)):
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
    case 'NEWLINE':
      return token[1] !== ';';
    case 'DOT':
    case '?':
    case ',':
    case 'PIPE':
    case 'BACKPIPE':
      return tokens[i - 1].eol;
    case 'ELSE':
      return tag === 'THEN';
    case 'CATCH':
      return tag === 'TRY';
    case 'FINALLY':
      return tag == 'TRY' || tag == 'CATCH' || tag == 'THEN';
    case 'SWITCH':
      return !(seenSwitch = true);
    case 'CASE':
    case 'DEFAULT':
      return !seenSwitch;
    }
  }
  function go(__arg, i){
    var prev;
    prev = tokens[i - 1];
    tokens.splice(prev[0] === ',' ? i - 1 : i, 0, (dedent[2] = prev[2], dedent));
  }
}
function addImplicitParentheses(tokens){
  var i, brackets, token, endi, tpair, tag, prev, seenSwitch, skipBlock, __ref;
  i = 0;
  brackets = [];
  while (token = tokens[++i]) {
    if (token[1] === 'do' && ((__ref = tokens[i + 1]) != null ? __ref[0] : void 8) === 'INDENT') {
      endi = indexOfPair(tokens, i + 1);
      if (tokens[endi + 1][0] === 'NEWLINE' && ((__ref = tokens[endi + 2]) != null ? __ref[0] : void 8) === 'WHILE') {
        token[0] = 'DO';
        tokens[endi + 2].done = true;
        tokens.splice(endi + 1, 1);
      } else {
        (token = tokens[1 + i])[0] = '(';
        (tpair = tokens[endi])[0] = ')';
        token.doblock = true;
        tokens.splice(i, 1);
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
    if (!(((__ref = prev[0]) == 'FUNCTION' || __ref == 'LET') || prev.spaced && able(tokens, i, true))) {
      continue;
    }
    if (token.doblock) {
      token[0] = 'CALL(';
      tpair[0] = ')CALL';
      continue;
    }
    if (!(__in(tag, ARG) || !token.spaced && (tag == '+-' || tag == 'CLONE'))) {
      continue;
    }
    if (tag === 'CREMENT') {
      if (token.spaced || !__in((__ref = tokens[i + 1]) != null ? __ref[0] : void 8, CHAIN)) {
        continue;
      }
    }
    skipBlock = seenSwitch = false;
    tokens.splice(i++, 0, ['CALL(', '', token[2]]);
    detectEnd(tokens, i, ok, go);
  }
  function ok(token, i){
    var tag, pre, __ref;
    tag = token[0];
    if (tag == 'POST_IF' || tag == 'PIPE' || tag == 'BACKPIPE') {
      return true;
    }
    if (!skipBlock) {
      if (token.alias && ((__ref = token[1]) == '&&' || __ref == '||') || (tag == 'TO' || tag == 'BY' || tag == 'IMPLEMENTS')) {
        return true;
      }
    }
    pre = tokens[i - 1];
    switch (tag) {
    case 'NEWLINE':
      return pre[0] !== ',';
    case 'DOT':
    case '?':
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
      return (__ref = pre[0]) != '{' && __ref != '[' && __ref != ',' && __ref != '->' && __ref != ':' && __ref != 'ELSE' && __ref != 'ASSIGN' && __ref != 'IMPORT' && __ref != 'UNARY' && __ref != 'DEFAULT' && __ref != 'TRY' && __ref != 'CATCH' && __ref != 'FINALLY' && __ref != 'HURL' && __ref != 'DO';
    case 'WHILE':
      if (token.done) {
        return false;
      }
      // fallthrough
    case 'FOR':
      skipBlock = true;
      return able(tokens, i) || pre[0] === 'CREMENT' || pre[0] === '...' && pre.spaced;
    }
    return false;
  }
  function go(token, i){
    tokens.splice(i, 0, [')CALL', '', tokens[i - 1][2]]);
  }
}
function addImplicitBraces(tokens){
  var stack, i, token, tag, start, paren, index, pre, inline, __ref;
  stack = [];
  i = 0;
  while (token = tokens[++i]) {
    if (':' !== (tag = token[0])) {
      switch (false) {
      case !__in(tag, CLOSERS):
        start = stack.pop();
        break;
      case !__in(tag, OPENERS):
        if (tag === 'INDENT' && tokens[i - 1][0] === '{') {
          tag = '{';
        }
        stack.push([tag, i]);
      }
      continue;
    }
    paren = tokens[i - 1][0] === ')';
    index = paren
      ? start[1]
      : i - 1;
    pre = tokens[index - 1];
    if (!(((__ref = pre[0]) == ':' || __ref == 'ASSIGN' || __ref == 'IMPORT') || ((__ref = stack[stack.length - 1]) != null ? __ref[0] : void 8) !== '{')) {
      continue;
    }
    stack.push(['{']);
    inline = !pre.doblock && ((__ref = pre[0]) != 'NEWLINE' && __ref != 'INDENT');
    while (((__ref = tokens[index - 2]) != null ? __ref[0] : void 8) === 'COMMENT') {
      index -= 2;
    }
    tokens.splice(index, 0, ['{', '{', tokens[index][2]]);
    detectEnd(tokens, ++i + 1, ok, go);
  }
  function ok(token, i){
    var tag, t1, __ref;
    switch (tag = token[0]) {
    case ',':
      break;
    case 'NEWLINE':
      if (inline) {
        return true;
      }
      break;
    case 'DEDENT':
      return true;
    case 'POST_IF':
    case 'FOR':
    case 'WHILE':
      return inline;
    default:
      return false;
    }
    t1 = (__ref = tokens[i + 1]) != null ? __ref[0] : void 8;
    return t1 !== (tag === ',' ? 'NEWLINE' : 'COMMENT') && ':' !== ((__ref = tokens[t1 === '('
      ? 1 + indexOfPair(tokens, i + 1)
      : i + 2]) != null ? __ref[0] : void 8);
  }
  function go(token, i){
    tokens.splice(i, 0, ['}', '', token[2]]);
  }
}
function expandLiterals(tokens){
  var i, token, sig, lno, fromNum, char, toNum, tochar, byNum, byp, ts, enc, add, n, word, that, __ref, __i, __len;
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
      lno = token[2];
      if (tokens[i - 1][0] === '[' && tokens[i + 1][0] === 'STRNUM' && ((tokens[i + 2][0] === ']' && (((__ref = tokens[i + 1][1].charAt(0)) == '\'' || __ref == '"') || +tokens[i + 1][1] >= 0)) || (tokens[i + 2][0] === 'RANGE_BY' && ((__ref = tokens[i + 3]) != null ? __ref[0] : void 8) === 'STRNUM' && ((__ref = tokens[i + 4]) != null ? __ref[0] : void 8) === ']'))) {
        __ref = decode(token[1], lno), fromNum = __ref[0], char = __ref[1];
        __ref = decode(tokens[i + 1][1], lno), toNum = __ref[0], tochar = __ref[1];
        if (char ^ tochar) {
          carp('bad "to" in range', lno);
        }
        byNum = 1;
        if (byp = ((__ref = tokens[i + 2]) != null ? __ref[0] : void 8) === 'RANGE_BY') {
          if (!(byNum = +((__ref = tokens[i + 3]) != null ? __ref[1] : void 8))) {
            carp('bad "by" in range', tokens[i + 2][2]);
          }
        }
        ts = [];
        enc = char ? character : String;
        add = __fn;
        if (token.op === 'to') {
          for (n = fromNum; byNum < 0 ? n >= toNum : n <= toNum; n += byNum) {
            add();
          }
        } else {
          for (n = fromNum; byNum < 0 ? n > toNum : n < toNum; n += byNum) {
            add();
          }
        }
        ts.pop() || carp('empty range', lno);
        tokens.splice.apply(tokens, [i, 2 + 2 * byp].concat(__slice.call(ts)));
        i += ts.length - 1;
      } else {
        token[0] = 'STRNUM';
        if (((__ref = tokens[i + 2]) != null ? __ref[0] : void 8) === 'RANGE_BY') {
          tokens.splice(i + 2, 1, ['BY', 'by', lno]);
        }
        tokens.splice(i + 1, 0, ['TO', token.op, lno]);
      }
      break;
    case 'WORDS':
      ts = [['[', '[', lno = token[2]]];
      for (__i = 0, __len = (__ref = token[1].match(/\S+/g) || '').length; __i < __len; ++__i) {
        word = __ref[__i];
        ts.push(['STRNUM', string('\'', word), lno], [',', ',', lno]);
      }
      tokens.splice.apply(tokens, [i, 1].concat(__slice.call(ts), [[']', ']', lno]]));
      i += ts.length;
      break;
    case 'INDENT':
      if (that = tokens[i - 1]) {
        if (that[1] === 'new') {
          tokens.splice(i++, 0, ['PARAM(', '', token[2]], [')PARAM', '', token[2]], ['->', '', token[2]]);
        } else if ((__ref = that[0]) == 'FUNCTION' || __ref == 'LET') {
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
    case 'BIOP':
      if (!token.spaced && ((__ref = token[1]) == '+' || __ref == '-') && tokens[i + 1][0] !== ')') {
        tokens[i][0] = '+-';
      }
      continue;
    default:
      continue;
    }
    if (token.spaced && __in(tokens[i + 1][0], ARG)) {
      tokens.splice(++i, 0, [',', ',', token[2]]);
    }
  }
  function __fn(){
    if (0x10000 < ts.push(['STRNUM', enc(n), lno], [',', ',', lno])) {
      carp('range limit exceeded', lno);
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
    if (0 > (levels += __in(tag, OPENERS) || -__in(tag, CLOSERS))) {
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
KEYWORDS_SHARED = ['true', 'false', 'null', 'this', 'void', 'super', 'return', 'throw', 'break', 'continue', 'if', 'else', 'for', 'while', 'switch', 'case', 'default', 'try', 'catch', 'finally', 'function', 'class', 'extends', 'implements', 'new', 'do', 'delete', 'typeof', 'in', 'instanceof', 'let', 'with', 'var', 'const', 'import', 'export', 'debugger'];
KEYWORDS_UNUSED = ['enum', 'interface', 'package', 'private', 'protected', 'public', 'static', 'yield'];
KEYWORDS = KEYWORDS_SHARED.concat(KEYWORDS_UNUSED);
ID = /((?!\d)(?:(?!\s)[\w$\xAA-\uFFDC])+((\-[a-zA-Z]+)?)*)([^\n\S]*:(?![:=]))?|/g;
SYMBOL = /[-+*\/^]=|%%?=|::?=|\.(?:[&\|\^]|<<|>>>?)\.|\.{1,3}|\^\^|\+\+\+|-->|~~>|<--|<~~|([-+&|:])\1|%%|&|\([^\n\S]*\)|[-~]>|<[-~]|[!=]==?|@@|<\[(?:[\s\S]*?\]>)?|<<<<?|<\||<<|>>|[<>]\??=?|!\?|\|>|\||=>|\*\*=?|\^|`|[^\s#]?/g;
SPACE = /[^\n\S]*(?:#.*)?/g;
MULTIDENT = /(?:\s*#.*)*(?:\n([^\n\S]*))+/g;
SIMPLESTR = /'[^\\']*(?:\\[\s\S][^\\']*)*'|/g;
BSTOKEN = /\\(?:(\S[^\s,;)}\]]*)|\s*)/g;
NUMBER = /0x[\dA-Fa-f][\dA-Fa-f_]*|(\d*)~([\dA-Za-z]\w*)|((\d[\d_]*)(\.\d[\d_]*)?(?:e[+-]?\d[\d_]*)?)[$\w]*|/g;
NUMBER_OMIT = /_+/g;
REGEX = /\/([^[\/\n\\]*(?:(?:\\.|\[[^\]\n\\]*(?:\\.[^\]\n\\]*)*\])[^[\/\n\\]*)*)\/([gimy]{1,4}|\$?)|/g;
HEREGEX_OMIT = /\s+(?:#.*)?/g;
LASTDENT = /\n[^\n\S]*$/;
INLINEDENT = /[^\n\S]*[^#\s]?/g;
NONASCII = /[\x80-\uFFFF]/;
OPENERS = ['(', '[', '{', 'CALL(', 'PARAM(', 'INDENT'];
CLOSERS = [')', ']', '}', ')CALL', ')PARAM', 'DEDENT'];
INVERSES = new function(){
  var i, o, __ref, __len;
  for (i = 0, __len = (__ref = OPENERS).length; i < __len; ++i) {
    o = __ref[i];
    this[this[o] = CLOSERS[i]] = o;
  }
};
CHAIN = ['(', '{', '[', 'ID', 'STRNUM', 'LITERAL', 'LET', 'WITH', 'WORDS'];
ARG = CHAIN.concat(['...', 'UNARY', 'CREMENT', 'PARAM(', 'FUNCTION', 'IF', 'SWITCH', 'TRY', 'CLASS', 'RANGE', 'LABEL', 'DO', 'BIOPBP']);
function __clone(it){
  function fun(){} fun.prototype = it;
  return new fun;
}
function __in(x, arr){
  var i = 0, l = arr.length >>> 0;
  while (i < l) if (x === arr[i++]) return true;
  return false;
}