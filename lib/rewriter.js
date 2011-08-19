var character, OPENERS, CLOSERS, INVERSES, CHAIN, ARG, __indexOf = [].indexOf || function(x){
  var i = -1, l = this.length;
  while (++i < l) if (this.hasOwnProperty(i) && this[i] === x) return i;
  return -1;
}, __slice = [].slice;
exports.rewrite = rewrite;
exports.able = able;
function rewrite(it){
  transformParens(it);
  addImplicitIndentation(it);
  tagPostfixConditionals(it);
  addImplicitParentheses(it);
  addImplicitBraces(it);
  expandLiterals(it);
  return it;
}
function transformParens(tokens){
  var stack, i, token, start, _len, _ref, _ref2;
  stack = [];
  for (i = 0, _len = tokens.length; i < _len; ++i) {
    token = tokens[i];
    switch (token[0]) {
    case '(':
      stack.push(token);
      break;
    case ')':
      if (start = stack.pop()) {
        if (token[1] && ((_ref = (_ref2 = tokens[i + 1]) != null ? _ref2[0] : void 8) === '->' || _ref === '<-')) {
          start[0] = 'PARAM(';
          token[0] = ')PARAM';
          ++i;
        }
      }
    }
  }
}
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
  i = -1;
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
      if (((_ref = tokens[i - 1]) != null ? _ref[0] : void 8) === 'TERMINATOR') {
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
function addImplicitBraces(tokens){
  var stack, i, token, tag, start, paren, oneline, idx, _ref;
  stack = [];
  i = -1;
  while (token = tokens[++i]) {
    if (':' !== (tag = token[0])) {
      switch (false) {
      case __indexOf.call(CLOSERS, tag) < 0:
        start = stack.pop();
        break;
      case __indexOf.call(OPENERS, tag) < 0:
        if (tag === 'INDENT' && ((_ref = tokens[i - 1]) != null ? _ref[0] : void 8) === '{') {
          tag = '{';
        }
        stack.push([tag, i]);
      }
      continue;
    }
    paren = ((_ref = tokens[i - 1]) != null ? _ref[0] : void 8) === ')';
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
function addImplicitParentheses(tokens){
  var i, brackets, token, doblock, endi, tpair, tag, prev, seenSwitch, skipBlock, _ref, _ref2;
  i = -1;
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
    if (!i) {
      continue;
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
function expandLiterals(tokens){
  var i, token, sig, lno, from, char, to, tochar, by, ts, n, that, _ref, _step;
  i = -1;
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
    case ',':
      if (i && ((_ref = tokens[i - 1][0]) === ',' || _ref === '[' || _ref === 'CALL(' || _ref === 'PARAM(')) {
        tokens.splice(i++, 0, ['LITERAL', 'void', token[2]]);
      }
      continue;
    case 'INDENT':
      if (that = tokens[i - 1]) {
        if (that[1] === 'new') {
          tokens.splice(i++, 0, ['->', '', token[2]]);
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
      if (!(i && able(tokens, i))) {
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
function able(tokens, i, call){
  var token, tag;
  i == null && (i = tokens.length);
  tag = (token = tokens[i - 1])[0];
  return (tag === 'ID' || tag === ']' || tag === 'SUPER') || (call
    ? token.callable || (tag === '?' || tag === 'LET') || (tag === ')' || tag === ')CALL') && token[1]
    : tag === 'STRNUM' || tag === 'LITERAL' || tag === ')' || tag === ')CALL' || tag === '}');
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
function carp(msg, lno){
  throw SyntaxError(msg + " on line " + (-~lno));
}
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
CHAIN = ['(', '{', '[', 'ID', 'STRNUM', 'LITERAL', 'LET', 'WITH'];
ARG = CHAIN.concat(['->', '...', 'UNARY', 'CREMENT', 'PARAM(', 'FUNCTION', 'IF', 'SWITCH', 'TRY', 'CLASS', 'SUPER', 'RANGE', 'LABEL', 'DO']);