var string, TABS, unlines, enlines, enslash, reslash, camelize, character, KEYWORDS_SHARED, KEYWORDS_UNUSED, KEYWORDS, ID, SYMBOL, SPACE, MULTIDENT, SIMPLESTR, JSTOKEN, BSTOKEN, NUMBER, NUMBER_OMIT, REGEX, HEREGEX_OMIT, LASTDENT, INLINEDENT, NONASCII, OPENERS, CLOSERS, INVERSES, CHAIN, ARG, BLOCK_USERS, slice$ = [].slice;
exports.lex = function(code, options){
  return (clone$(exports)).tokenize(code || '', options || {});
};
exports.rewrite = function(it){
  var ref$;
  it || (it = this.tokens);
  addImplicitIndentation(it);
  rewriteBlockless(it);
  addImplicitParentheses(it);
  addImplicitBraces(it);
  expandLiterals(it);
  if (((ref$ = it[0]) != null ? ref$[0] : void 8) === 'NEWLINE') {
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
    this.rest == null && this.carp('unterminated interpolation');
  } else {
    this.last.spaced = true;
    this.newline();
  }
  o.raw || this.rewrite();
  return this.tokens;
};
exports.dent = 0;
exports.doID = function(code, index){
  var match, input, id, e, last, ref$, tag, that;
  input = (match = (ID.lastIndex = index, ID).exec(code))[0];
  if (!input) {
    return 0;
  }
  id = camelize(match[1]);
  if (NONASCII.test(id)) {
    try {
      Function("var " + id);
    } catch (e$) {
      e = e$;
      this.carp("invalid identifier \"" + id + "\"");
    }
  }
  last = this.last;
  if (match[2] || last[0] === 'DOT' || this.adi()) {
    this.token('ID', of$(id, KEYWORDS) ? (ref$ = Object(id), ref$.reserved = true, ref$) : id);
    if (match[2]) {
      this.token(':', ':');
    }
    return input.length;
  }
  switch (id) {
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
      if (id === 'of') {
        id = '';
        this.wantBy = true;
        if (last[0] === 'ID' && (ref$ = this.tokens)[ref$.length - 2][0] !== 'FOR') {
          id = this.tokens.pop()[1];
          if ((ref$ = this.tokens)[ref$.length - 1][0] === ',') {
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
    tag = 'RELATION';
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
    this.unline();
    if (id === 'is') {
      this.token('COMPARE', '===');
    } else {
      this.token('LOGIC', id === 'or' ? '||' : '&&');
    }
    this.last.alias = true;
    return id.length;
  case 'unless':
    tag = 'IF';
    break;
  case 'until':
    tag = 'WHILE';
    break;
  case 'import':
    if (able(this.tokens)) {
      id = '<<<';
      break;
    }
    // fallthrough
  case 'export':
  case 'const':
  case 'var':
    tag = 'DECL';
    break;
  default:
    if (of$(id, KEYWORDS_SHARED)) {
      break;
    }
    if (of$(id, KEYWORDS_UNUSED)) {
      this.carp("reserved word \"" + id + "\"");
    }
    if (!last[1] && ((ref$ = last[0]) === 'CATCH' || ref$ === 'FUNCTION' || ref$ === 'LABEL')) {
      last[1] = id;
      last.spaced = false;
      return input.length;
    }
    tag = 'ID';
    switch (id) {
    case 'own':
      if (last[0] === 'FOR') {
        tag = 'OWN';
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
      } else if (last[0] === 'STRNUM' && !last.callable) {
        last[0] = 'RANGE';
        last.op = id;
        return id.length;
      }
      break;
    case 'by':
      if (last[0] === 'STRNUM' && (ref$ = this.tokens)[ref$.length - 2][0] === 'RANGE') {
        tag = 'RANGE_BY';
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
  if (tag === 'RELATION' || tag === 'THEN' || tag === 'ELSE' || tag === 'CASE' || tag === 'DEFAULT' || tag === 'CATCH' || tag === 'FINALLY' || tag === 'IN' || tag === 'OF' || tag === 'FROM' || tag === 'TO' || tag === 'BY' || tag === 'EXTENDS' || tag === 'IMPLEMENTS') {
    this.unline();
  }
  this.token(tag, id);
  return input.length;
};
exports.doNumber = function(code, lastIndex){
  var match, input, last, radix, rnum, num, ref$;
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
    if (match[3] && num.charAt() === '0' && ((ref$ = num.charAt(1)) !== '' && ref$ !== '.')) {
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
  this.strnum(unlines(this.string(q, str.slice(1, -1))));
  return this.countLines(str).length;
};
exports.doHeredoc = function(code, index, q){
  var end, raw, doc, parts, tabs, i, len$, t;
  if (q === '\'') {
    ~(end = code.indexOf(q + q + q, index + 3)) || this.carp('unterminated heredoc');
    raw = code.slice(index + 3, end);
    doc = raw.replace(LASTDENT, '');
    this.strnum(enlines(this.string(q, lchomp(detab(doc, heretabs(doc))))));
    return this.countLines(raw).length + 6;
  }
  parts = this.interpolate(code, index, q + q + q);
  tabs = heretabs(code.slice(index + 3, index + parts.size).replace(LASTDENT, ''));
  for (i = 0, len$ = parts.length; i < len$; ++i) {
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
  var end, comment, ref$;
  comment = ~(end = code.indexOf('*/', index + 2))
    ? code.slice(index, end + 2)
    : code.slice(index) + '*/';
  if ((ref$ = this.last[0]) === 'NEWLINE' || ref$ === 'INDENT' || ref$ === 'THEN') {
    this.token('COMMENT', detab(comment, this.dent));
    this.token('NEWLINE', '\n');
  }
  return this.countLines(comment).length;
};
exports.doJS = function(code, lastIndex){
  var js, ref$;
  JSTOKEN.lastIndex = lastIndex;
  js = JSTOKEN.exec(code)[0] || this.carp('unterminated JS literal');
  this.token('LITERAL', (ref$ = Object(detab(js.slice(1, -1), this.dent)), ref$.js = true, ref$), true);
  return this.countLines(js).length;
};
exports.doRegex = function(code, index){
  var divisible, ref$, input, body, flag;
  if (divisible = able(this.tokens) || this.last[0] === 'CREMENT') {
    if (!this.last.spaced || ((ref$ = code.charAt(index + 1)) === ' ' || ref$ === '=')) {
      return 0;
    }
  }
  ref$ = (REGEX.lastIndex = index, REGEX).exec(code), input = ref$[0], body = ref$[1], flag = ref$[2];
  if (input) {
    this.regex(body, flag);
  } else {
    divisible || this.carp('unterminated regex');
  }
  return input.length;
};
exports.doHeregex = function(code, index){
  var tokens, last, parts, rest, flag, i, t, dynaflag, len$, val, one;
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
    for (i = 0, len$ = parts.length; i < len$; ++i) {
      t = parts[i];
      if (t[0] === 'TOKENS') {
        tokens.push.apply(tokens, t[1]);
      } else {
        val = t[1].replace(HEREGEX_OMIT, '');
        if (one && !val) {
          continue;
        }
        one = tokens.push((t[0] = 'STRNUM', t[1] = this.string('\'', enslash(val)), t));
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
  var ref$, input, word;
  BSTOKEN.lastIndex = lastIndex;
  ref$ = BSTOKEN.exec(code), input = ref$[0], word = ref$[1];
  if (word) {
    this.strnum(this.string('\'', word));
  } else {
    this.countLines(input);
  }
  return input.length;
};
exports.doLine = function(code, index){
  var ref$, input, tabs, length, last, that, delta, tag;
  ref$ = (MULTIDENT.lastIndex = index, MULTIDENT).exec(code), input = ref$[0], tabs = ref$[1];
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
    if ((tag = last[0]) === 'ASSIGN' && ((ref$ = '' + last[1]) !== '=' && ref$ !== ':=' && ref$ !== '+=') || (tag === '+-' || tag === '|>' || tag === 'DOT' || tag === 'LOGIC' || tag === 'MATH' || tag === 'COMPARE' || tag === 'RELATION' || tag === 'SHIFT' || tag === 'BITWISE' || tag === 'IN' || tag === 'OF' || tag === 'TO' || tag === 'BY' || tag === 'FROM' || tag === 'EXTENDS' || tag === 'IMPLEMENTS')) {
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
exports.doLiteral = function(code, index){
  var sym, val, tag, ref$, that, up;
  if (!(sym = (SYMBOL.lastIndex = index, SYMBOL).exec(code)[0])) {
    return 0;
  }
  switch (tag = val = sym) {
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
  case ';':
    tag = 'NEWLINE';
    this.wantBy = false;
    break;
  case '.':
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
    if (!(able(this.tokens) || this.last[0] === 'CREMENT')) {
      this.tokens.push(['UNARY', '!', this.line], ['ASSIGN', '=', this.line]);
      return 2;
    }
    // fallthrough
  case '===':
  case '!==':
  case '<':
  case '>':
  case '<=':
  case '>=':
  case '==':
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
    if (!(((ref$ = this.last[0]) === 'FUNCTION' || ref$ === 'LET') || this.able(true))) {
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
    if (this.inter && val !== (ref$ = this.closes)[ref$.length - 1]) {
      this.rest = code.slice(index + 1);
      return 9e9;
    }
    // fallthrough
  case ']':
  case ')':
    if (')' === (tag = val = this.pair(val))) {
      if (this.last === (this.lpar = this.parens.pop())) {
        this.last[0] = 'CALL(';
        tag = ')CALL';
      }
    }
    break;
  case ':':
    switch (this.last[0]) {
    case 'ID':
    case 'STRNUM':
    case ')':
      break;
    case '...':
      this.last[0] = 'STRNUM';
      break;
    default:
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
    if (this.last[1] === '.' || this.last[0] === '?' && this.adi()) {
      this.last[1] += val;
      return val.length;
    }
    if (this.last[0] === 'LOGIC') {
      (val = Object(val)).logic = this.tokens.pop()[1];
    } else if ((val === '+=' || val === '-=' || val === '^=') && !able(this.tokens) && ((ref$ = this.last[0]) !== '+-' && ref$ !== '^' && ref$ !== 'UNARY' && ref$ !== 'LABEL')) {
      this.token('UNARY', val.charAt());
      val = '=';
    }
    tag = 'ASSIGN';
    break;
  case '*':
    if (that = ((ref$ = this.last[0]) === 'NEWLINE' || ref$ === 'INDENT' || ref$ === 'THEN') && this.doInlinedent(code, index + 1, 'list')) {
      return that;
    }
    tag = able(this.tokens) || this.last[0] === 'CREMENT' && able(this.tokens, this.tokens.length - 1) ? 'MATH' : 'STRNUM';
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
  case '&':
    if (!able(this.tokens)) {
      tag = 'LITERAL';
      break;
    }
    // fallthrough
  case '|':
    tag = 'BITWISE';
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
  case '=>':
    this.unline();
    if (that = this.doInlinedent(code, index + 2)) {
      return 1 + that;
    }
    tag = 'THEN';
    break;
  default:
    if ('<' === val.charAt(0)) {
      if (val.length < 4) {
        this.carp('unterminated words');
      }
      this.token('WORDS', val, this.adi());
      return val.length;
    }
  }
  if (tag === ',' || tag === '|>' || tag === 'DOT' || tag === 'LOGIC' || tag === 'COMPARE' || tag === 'MATH' || tag === 'IMPORT' || tag === 'SHIFT' || tag === 'BITWISE') {
    this.unline();
  }
  this.token(tag, val);
  return sym.length;
};
exports.doInlinedent = function(code, index, list){
  var d;
  if (!(d = (INLINEDENT.lastIndex = index, INLINEDENT).exec(code)[0].length)) {
    return 0;
  }
  list && this.tokens.push(['LITERAL', 'void', this.line], ['ASSIGN', '=', this.line]);
  this.indent(index + d - this.dent - 2 - code.lastIndexOf('\n', index));
  return d;
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
  var ref$;
  this.last[1] === '\n' || this.tokens.push(this.last = (ref$ = ['NEWLINE', '\n', this.line], ref$.spaced = true, ref$));
};
exports.unline = function(){
  var ref$;
  if (!this.tokens[1]) {
    return;
  }
  switch (this.last[0]) {
  case 'INDENT':
    (ref$ = this.dents)[ref$.length - 1] += '';
    // fallthrough
  case 'NEWLINE':
    this.tokens.length--;
  }
};
exports.parameters = function(arrow){
  var i, ref$, t, ref1$;
  if (this.last[0] === ')' && ')' === this.last[1]) {
    this.lpar[0] = 'PARAM(';
    this.last[0] = ')PARAM';
    return;
  }
  if (arrow === '->') {
    this.token('PARAM(', '');
  } else {
    for (i = (ref$ = this.tokens).length - 1; i >= 0; --i) {
      t = ref$[i];
      if ((ref1$ = t[0]) === 'NEWLINE' || ref1$ === 'INDENT' || ref1$ === 'THEN' || ref1$ === '(') {
        break;
      }
    }
    this.tokens.splice(i + 1, 0, ['PARAM(', '', t[2]]);
  }
  this.token(')PARAM', '');
};
exports.interpolate = function(str, idx, end){
  var parts, end0, pos, i, ch, id, stringified, length, e, delta, nested, ref$, clone;
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
      if (!((id = (ID.lastIndex = i + 1, ID).exec(str)[1]) || '{' === str.charAt(i + 1))) {
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
      length = id.length;
      if (id !== 'this') {
        id = camelize(id);
        try {
          Function("'use strict'; var " + id);
        } catch (e$) {
          e = e$;
          this.carp("invalid variable interpolation \"" + id + "\"");
        }
      }
      str = str.slice(delta = i + 1 + length);
      parts.push(['TOKENS', nested = [['ID', id, this.line]]]);
    } else {
      clone = (ref$ = clone$(exports), ref$.inter = true, ref$.emender = this.emender, ref$);
      nested = clone.tokenize(str.slice(i + 2), {
        line: this.line,
        raw: true
      });
      delta = str.length - clone.rest.length;
      str = clone.rest, this.line = clone.line;
      while (((ref$ = nested[0]) != null ? ref$[0] : void 8) === 'NEWLINE') {
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
};
exports.addInterpolated = function(parts, nlines){
  var tokens, last, ref$, left, right, joint, callable, i, len$, t;
  if (!parts[1]) {
    return this.strnum(nlines(this.string('"', parts[0][1])));
  }
  tokens = this.tokens, last = this.last;
  ref$ = !last.spaced && last[1] === '%'
    ? (--tokens.length, this.last = last = tokens[tokens.length - 1], ['[', ']', [',', ',']])
    : ['(', ')', ['+-', '+']], left = ref$[0], right = ref$[1], joint = ref$[2];
  callable = this.adi();
  tokens.push([left, '"', last[2]]);
  for (i = 0, len$ = parts.length; i < len$; ++i) {
    t = parts[i];
    if (t[0] === 'TOKENS') {
      tokens.push.apply(tokens, t[1]);
    } else {
      if (i > 1 && !t[1]) {
        continue;
      }
      tokens.push(['STRNUM', nlines(this.string('"', t[1])), t[2]]);
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
  var e;
  try {
    RegExp(body);
  } catch (e$) {
    e = e$;
    this.carp(e.message);
  }
  if (flag === '$') {
    return this.strnum(this.string('\'', enslash(body)));
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
  var ref$, wanted;
  if (!(it === (wanted = (ref$ = this.closes)[ref$.length - 1]) || ')CALL' === wanted && it === ')')) {
    if ('DEDENT' !== wanted) {
      this.carp("unmatched `" + it + "`");
    }
    this.dedent((ref$ = this.dents)[ref$.length - 1]);
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
  var ref$, ref1$;
  if (((ref$ = (ref$ = this.tokens)[ref$.length - 2 - ((ref1$ = this.last[0]) === 'NEWLINE' || ref1$ === 'INDENT')]) != null ? ref$[0] : void 8) === 'FOR') {
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
exports.string = function(q, body){
  return string(q, body, this.line);
};
function carp(msg, lno){
  throw SyntaxError(msg + " on line " + (-~lno));
}
function able(tokens, i, call){
  var token, tag;
  i == null && (i = tokens.length);
  tag = (token = tokens[i - 1])[0];
  return (tag === 'ID' || tag === ']' || tag === '?') || (call
    ? token.callable || (tag === ')' || tag === ')CALL') && token[1]
    : tag === '}' || tag === ')' || tag === ')CALL' || tag === 'STRNUM' || tag === 'LITERAL' || tag === 'WORDS');
}
string = (function(re){
  return function(q, body, lno){
    body = body.replace(re, function(it, oct, xu, rest){
      if (it === q || it === '\\') {
        return '\\' + it;
      }
      if (oct) {
        return '\\x' + (0x100 + parseInt(oct, 8)).toString(16).slice(1);
      }
      if (xu) {
        carp('malformed character escape sequence', lno);
      }
      if (!rest || q === rest) {
        return it;
      } else {
        return rest;
      }
    });
    return q + body + q;
  };
}.call(this, /['"]|\\(?:([0-3]?[0-7]{2}|[1-7]|0(?=[89]))|x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|([xu])|[\\0bfnrtv]|[^\n\S]|([\w\W]))?/g));
function heretabs(doc){
  var dent, that, ref$;
  dent = 0 / 0;
  while (that = TABS.exec(doc)) {
    dent <= (ref$ = that[0].length - 1) || (dent = ref$);
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
camelize = replacer(/-[a-z]/ig, function(it){
  return it.charAt(1).toUpperCase();
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
function rewriteBlockless(tokens){
  var i, len$, token, tag;
  for (i = 0, len$ = tokens.length; i < len$; ++i) {
    token = tokens[i], tag = token[0];
    if (tag === 'IF' || tag === 'CLASS') {
      detectEnd(tokens, i + 1, ok, go);
    }
  }
  function ok(it){
    var ref$;
    return (ref$ = it[0]) === 'NEWLINE' || ref$ === 'INDENT';
  }
  function go(it, i){
    var lno;
    if (tag === 'IF') {
      if (it[0] !== 'INDENT' || !it[1] && !it.then || of$(tokens[i - 1][0], BLOCK_USERS)) {
        token[0] = 'POST_IF';
      }
    } else if (it[0] !== 'INDENT') {
      tokens.splice(i, 0, ['INDENT', 0, lno = tokens[i - 1][2]], ['DEDENT', 0, lno]);
    }
  }
}
function addImplicitIndentation(tokens){
  var i, token, tag, next, indent, dedent, ref$, idx;
  i = 0;
  while (token = tokens[++i]) {
    tag = token[0];
    if (tag !== '->' && tag !== 'THEN' && tag !== 'ELSE' && tag !== 'DEFAULT' && tag !== 'TRY' && tag !== 'CATCH' && tag !== 'FINALLY' && tag !== 'DECL') {
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
    case tag !== 'DECL':
      break;
    case next !== 'DOT' && next !== '?' && next !== ',' && next !== '|>':
      --i;
      // fallthrough
    case !((next === 'ID' || next === 'STRNUM' || next === 'LITERAL') && ',' === ((ref$ = tokens[i + 2]) != null ? ref$[0] : void 8)):
      go(0, i += 2);
      ++i;
      continue;
    case !((next === '(' || next === '[' || next === '{') && ',' === ((ref$ = tokens[idx = 1 + indexOfPair(tokens, i + 1)]) != null ? ref$[0] : void 8)):
      go(0, idx);
      ++i;
      continue;
    }
    detectEnd(tokens, i + 1, ok, go);
  }
  function ok(token, i){
    var t0, t;
    t0 = token[0];
    t = tag;
    if (tag === t0 || tag === 'THEN' && t0 === 'SWITCH') {
      tag = '';
    }
    switch (t0) {
    case 'NEWLINE':
      return token[1] !== ';';
    case 'DOT':
    case '?':
    case ',':
    case '|>':
      return tokens[i - 1].eol;
    case 'ELSE':
      return t === 'THEN';
    case 'CATCH':
      return t === 'TRY';
    case 'FINALLY':
      return t === 'TRY' || t === 'CATCH' || t === 'THEN';
    case 'CASE':
    case 'DEFAULT':
      return t === 'CASE' || t === 'THEN';
    }
  }
  function go(arg$, i){
    var prev;
    prev = tokens[i - 1];
    tokens.splice(prev[0] === ',' ? i - 1 : i, 0, (dedent[2] = prev[2], dedent));
  }
}
function addImplicitParentheses(tokens){
  var i, brackets, token, ref$, endi, tpair, tag, prev, seenSwitch, skipBlock;
  i = 0;
  brackets = [];
  while (token = tokens[++i]) {
    if (token[1] === 'do' && ((ref$ = tokens[i + 1]) != null ? ref$[0] : void 8) === 'INDENT') {
      endi = indexOfPair(tokens, i + 1);
      if (tokens[endi + 1][0] === 'NEWLINE' && ((ref$ = tokens[endi + 2]) != null ? ref$[0] : void 8) === 'WHILE') {
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
    if (!(((ref$ = prev[0]) === 'FUNCTION' || ref$ === 'LET') || prev.spaced && able(tokens, i, true))) {
      continue;
    }
    if (token.doblock) {
      token[0] = 'CALL(';
      tpair[0] = ')CALL';
      continue;
    }
    if (!(of$(tag, ARG) || !token.spaced && (tag === '+-' || tag === '^'))) {
      continue;
    }
    if (tag === 'CREMENT') {
      if (token.spaced || !of$((ref$ = tokens[i + 1]) != null ? ref$[0] : void 8, CHAIN)) {
        continue;
      }
    }
    skipBlock = seenSwitch = false;
    tokens.splice(i++, 0, ['CALL(', '', token[2]]);
    detectEnd(tokens, i, ok, go);
  }
  function ok(token, i){
    var tag, ref$, pre;
    tag = token[0];
    if (tag === '|>' || tag === 'POST_IF') {
      return true;
    }
    if (!skipBlock) {
      if (token.alias && ((ref$ = token[1]) === '&&' || ref$ === '||') || (tag === 'TO' || tag === 'BY' || tag === 'IMPLEMENTS')) {
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
      return !of$(pre[0], BLOCK_USERS);
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
  var stack, i, token, tag, start, paren, index, pre, ref$, inline;
  stack = [];
  i = 0;
  while (token = tokens[++i]) {
    if (':' !== (tag = token[0])) {
      switch (false) {
      case !of$(tag, CLOSERS):
        start = stack.pop();
        break;
      case !of$(tag, OPENERS):
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
    if (!(((ref$ = pre[0]) === ':' || ref$ === 'ASSIGN' || ref$ === 'IMPORT') || ((ref$ = stack[stack.length - 1]) != null ? ref$[0] : void 8) !== '{')) {
      continue;
    }
    stack.push(['{']);
    inline = !pre.doblock && ((ref$ = pre[0]) !== 'NEWLINE' && ref$ !== 'INDENT');
    while (((ref$ = tokens[index - 2]) != null ? ref$[0] : void 8) === 'COMMENT') {
      index -= 2;
    }
    tokens.splice(index, 0, ['{', '{', tokens[index][2]]);
    detectEnd(tokens, ++i + 1, ok, go);
  }
  function ok(token, i){
    var tag, ref$, t1;
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
    t1 = (ref$ = tokens[i + 1]) != null ? ref$[0] : void 8;
    return t1 !== (tag === ',' ? 'NEWLINE' : 'COMMENT') && ':' !== ((ref$ = tokens[t1 === '('
      ? 1 + indexOfPair(tokens, i + 1)
      : i + 2]) != null ? ref$[0] : void 8);
  }
  function go(token, i){
    tokens.splice(i, 0, ['}', '', token[2]]);
  }
}
function expandLiterals(tokens){
  var i, token, sig, next, lno, ref$, from, char, to, tochar, by, byp, ts, enc, add, n, i$, len$, word, that;
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
      next = tokens[i + 1];
      lno = token[2];
      ref$ = decode(token[1], lno), from = ref$[0], char = ref$[1];
      ref$ = next[0] === 'STRNUM' && decode(next[1], lno), to = ref$[0], tochar = ref$[1];
      if (to == null || char ^ tochar) {
        carp('bad "to" in range', lno);
      }
      by = 1;
      if (byp = ((ref$ = tokens[i + 2]) != null ? ref$[0] : void 8) === 'RANGE_BY') {
        if (!(by = +((ref$ = tokens[i + 3]) != null ? ref$[1] : void 8))) {
          carp('bad "by" in range', tokens[i + 2][2]);
        }
      }
      ts = [];
      enc = char ? character : String;
      add = fn$;
      if (token.op === 'to') {
        for (n = from; by < 0 ? n >= to : n <= to; n += by) {
          add();
        }
      } else {
        for (n = from; by < 0 ? n > to : n < to; n += by) {
          add();
        }
      }
      ts.pop() || carp('empty range', lno);
      tokens.splice.apply(tokens, [i, 2 + 2 * byp].concat(slice$.call(ts)));
      i += ts.length - 1;
      break;
    case 'WORDS':
      ts = [['[', '[', lno = token[2]]];
      for (i$ = 0, len$ = (ref$ = token[1].slice(2, -2).match(/\S+/g) || '').length; i$ < len$; ++i$) {
        word = ref$[i$];
        ts.push(['STRNUM', string('\'', word, lno), lno], [',', ',', lno]);
      }
      tokens.splice.apply(tokens, [i, 1].concat(slice$.call(ts), [[']', ']', lno]]));
      i += ts.length;
      break;
    case 'INDENT':
      if (that = tokens[i - 1]) {
        if (that[1] === 'new') {
          tokens.splice(i++, 0, ['PARAM(', '', token[2]], [')PARAM', '', token[2]], ['->', '', token[2]]);
        } else if ((ref$ = that[0]) === 'FUNCTION' || ref$ === 'LET') {
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
    if (token.spaced && of$(tokens[i + 1][0], ARG)) {
      tokens.splice(++i, 0, [',', ',', token[2]]);
    }
  }
  function fn$(){
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
    if (0 > (levels += of$(tag, OPENERS) || -of$(tag, CLOSERS))) {
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
ID = /((?!\s)[a-z_$\xAA-\uFFDC](?:(?!\s)[\w$\xAA-\uFFDC]|-[a-z])*)([^\n\S]*:(?![:=]))?|/ig;
SYMBOL = /[-+*\/%&|^:]=|\.{1,3}|([-+&|@:])\1|[-~=|]>|[!=]==?|<(?:<(?:=|<{0,2})|[-~]|\[(?:[\s\S]*?\]>)?)|>>>?=?|[<>]\??=?|!\?|\*\*=?|[^\s#]?/g;
SPACE = /[^\n\S]*(?:#.*)?/g;
MULTIDENT = /(?:\s*#.*)*(?:\n([^\n\S]*))+/g;
SIMPLESTR = /'[^\\']*(?:\\[\s\S][^\\']*)*'|/g;
JSTOKEN = /`[^\\`]*(?:\\[\s\S][^\\`]*)*`|/g;
BSTOKEN = /\\(?:(\S[^\s,;)}\]]*)|\s*)/g;
NUMBER = /0x[\dA-Fa-f][\dA-Fa-f_]*|([2-9]|[12]\d|3[0-6])r([\dA-Za-z]\w*)|((\d[\d_]*)(\.\d[\d_]*)?(?:e[+-]?\d[\d_]*)?)[$\w]*|/g;
NUMBER_OMIT = /_+/g;
REGEX = /\/([^[\/\n\\]*(?:(?:\\.|\[[^\]\n\\]*(?:\\.[^\]\n\\]*)*\])[^[\/\n\\]*)*)\/([gimy]{1,4}|\$?)|/g;
HEREGEX_OMIT = /\s+(?:#.*)?/g;
LASTDENT = /\n[^\n\S]*$/;
INLINEDENT = /[^\n\S]*[^#\s]?/g;
NONASCII = /[\x80-\uFFFF]/;
OPENERS = ['(', '[', '{', 'CALL(', 'PARAM(', 'INDENT'];
CLOSERS = [')', ']', '}', ')CALL', ')PARAM', 'DEDENT'];
INVERSES = new function(){
  var i, ref$, len$, o;
  for (i = 0, len$ = (ref$ = OPENERS).length; i < len$; ++i) {
    o = ref$[i];
    this[this[o] = CLOSERS[i]] = o;
  }
};
CHAIN = ['(', '{', '[', 'ID', 'STRNUM', 'LITERAL', 'LET', 'WITH', 'WORDS'];
ARG = CHAIN.concat(['...', 'UNARY', 'CREMENT', 'PARAM(', 'FUNCTION', 'IF', 'SWITCH', 'TRY', 'CLASS', 'RANGE', 'LABEL', 'DECL', 'DO']);
BLOCK_USERS = [',', ':', '->', 'ELSE', 'ASSIGN', 'IMPORT', 'UNARY', 'DEFAULT', 'TRY', 'CATCH', 'FINALLY', 'HURL', 'DECL', 'DO', 'LET', 'FUNCTION'];
function clone$(it){
  function fun(){} fun.prototype = it;
  return new fun;
}
function of$(x, arr){
  var i = 0, l = arr.length >>> 0;
  while (i < l) if (x === arr[i++]) return true;
  return false;
}