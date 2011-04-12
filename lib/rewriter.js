var BALANCED_PAIRS, INVERSES, EXPR_START, EXPR_END, left, rite, ARG, _i, _len, _ref, __indexOf = [].indexOf || function(x){
  for (var i = this.length; i-- && this[i] !== x;); return i;
}, __slice = [].slice;
exports.rewrite = rewrite;
exports.able = able;
function rewrite(it){
  removeTerminators(it);
  transformParens(it);
  addImplicitIndentation(it);
  tagPostfixConditionals(it);
  addImplicitParentheses(it);
  addImplicitBraces(it);
  ensureBalance(it);
  rewriteClosingParens(it);
  expandLiterals(it);
  return it;
}
function removeTerminators(tokens){
  var i, that;
  i = -1;
  while (that = tokens[++i]) {
    if (that[0] !== 'TERMINATOR') {
      break;
    }
  }
  i && tokens.splice(0, i);
  i = 1;
  while (that = tokens[++i]) {
    if (tokens[i - 1][0] !== 'TERMINATOR') {
      continue;
    }
    that = that[0];
    if (__indexOf.call(EXPR_END, that) >= 0 || (that === 'ELSE' || that === 'CASE' || that === 'DEFAULT' || that === 'CATCH' || that === 'FINALLY')) {
      tokens.splice(i - 1, 1);
    }
  }
}
function transformParens(tokens){
  var stack, i, token, pair, _len, _ref, _ref2;
  stack = [];
  for (i = 0, _len = tokens.length; i < _len; ++i) {
    token = tokens[i];
    switch (token[0]) {
    case '(':
    case 'CALL(':
      stack.push(token);
      break;
    case ')':
    case ')CALL':
      if (pair = stack.pop()) {
        if (pair[0] === 'CALL(') {
          token[0] = ')CALL';
        } else if (token[1] && ((_ref = (_ref2 = tokens[i + 1]) != null ? _ref2[0] : void 8) === '->' || _ref === '<-')) {
          pair[0] = 'PARAM(';
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
    if (it[0] !== 'INDENT') {
      return token[0] = 'POST_IF';
    }
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
    case 'INDENT':
    case 'THEN':
      continue;
    case 'IF':
      if (tag === 'ELSE') {
        continue;
      }
    }
    indent = ['INDENT', 0, token[2]];
    dedent = ['DEDENT', 0];
    if (tag === 'THEN') {
      if (((_ref = tokens[i - 1]) != null ? _ref[0] : void 8) === 'TERMINATOR') {
        tokens.splice(--i, 1);
      }
      tokens[i] = indent;
    } else {
      tokens.splice(++i, 0, indent);
    }
    switch (false) {
    case next !== ',' && next !== 'DOT':
      --i;
      // fallthrough
    case ',' !== ((_ref = tokens[i + 2]) != null ? _ref[0] : void 8):
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
    return tokens.splice(tokens[i - 1][0] === ',' ? i - 1 : i, 0, (dedent[2] = tokens[i][2], dedent));
  }
}
function addImplicitBraces(tokens){
  var stack, i, token, tag, start, paren, oneline, idx, _ref;
  stack = [];
  i = -1;
  while (token = tokens[++i]) {
    if (':' !== (tag = token[0])) {
      switch (false) {
      case __indexOf.call(EXPR_START, tag) < 0:
        if (tag === 'INDENT' && ((_ref = tokens[i - 1]) != null ? _ref[0] : void 8) === '{') {
          tag = '{';
        }
        stack.push([tag, i]);
        break;
      case __indexOf.call(EXPR_END, tag) < 0:
        start = stack.pop();
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
  var i, brackets, token, doblock, tpair, tag, prev, soak, seenSwitch, skipBlock, _ref;
  i = -1;
  brackets = [];
  while (token = tokens[++i]) {
    if (doblock = token[1] === 'do' && ((_ref = tokens[i + 1]) != null ? _ref[0] : void 8) === 'INDENT') {
      tokens.splice(i, 1);
      (tpair = tokens[indexOfPair(tokens, i)])[0] = ')';
      (token = tokens[i])[0] = '(';
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
        token.index = true;
      } else {
        continue;
      }
    }
    if (!(prev.spaced && able(tokens, i, true))) {
      continue;
    }
    soak = prev[0] === '?';
    if (doblock) {
      token[0] = 'CALL(';
      tpair[0] = ')CALL';
      if (soak) {
        tokens.splice(i - 1, 1);
        token[1] = '?(';
      }
      continue;
    }
    if (!(__indexOf.call(ARG, tag) >= 0 || tag === '+-' && !(token.spaced || token.eol))) {
      continue;
    }
    skipBlock = seenSwitch = false;
    if (soak) {
      tokens.splice(--i, 1);
    }
    tokens.splice(i++, 0, ['CALL(', soak ? '?(' : '(', token[2]]);
    detectEnd(tokens, i, ok, go);
  }
  function ok(token, i){
    var pre, _ref;
    if (token.alias && ((_ref = token[1]) === '&&' || _ref === '||')) {
      return true;
    }
    pre = tokens[i - 1];
    switch (token[0]) {
    case 'SWITCH':
      seenSwitch = true;
      // fallthrough
    case 'IF':
    case 'CLASS':
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
    case 'DOT':
      if (pre.eol || pre[0] === 'DEDENT') {
        return true;
      }
      break;
    case 'INDENT':
      if (skipBlock) {
        return skipBlock = false;
      }
      return (_ref = pre[0]) !== '{' && _ref !== '[' && _ref !== ',' && _ref !== '->' && _ref !== ':' && _ref !== 'ELSE' && _ref !== 'ASSIGN' && _ref !== 'IMPORT' && _ref !== 'UNARY' && _ref !== 'DEFAULT' && _ref !== 'TRY' && _ref !== 'CATCH' && _ref !== 'FINALLY' && _ref !== 'HURL';
    case 'TERMINATOR':
    case 'POST_IF':
    case 'FOR':
    case 'WHILE':
    case 'BY':
    case 'TO':
      return pre[0] !== ',';
    }
    return false;
  }
  function go(token, i){
    return tokens.splice(i + (token[0] === 'DEDENT'), 0, [')CALL', '', token[2]]);
  }
}
function ensureBalance(tokens){
  var levels, olines, token, tag, open, close, level, _i, _len, _j, _ref, _len2, _ref2;
  levels = {};
  olines = {};
  for (_i = 0, _len = tokens.length; _i < _len; ++_i) {
    token = tokens[_i];
    tag = token[0];
    for (_j = 0, _len2 = (_ref = BALANCED_PAIRS).length; _j < _len2; ++_j) {
      _ref2 = _ref[_j], open = _ref2[0], close = _ref2[1];
      levels[open] |= 0;
      if (tag === open) {
        if (levels[open]++ === 0) {
          olines[open] = token[2];
        }
      } else if (tag === close && --levels[open] < 0) {
        carp("too many `" + token[1] + "`", token[2]);
      }
    }
  }
  for (open in levels) {
    level = levels[open];
    if (level > 0) {
      carp("unclosed " + open, olines[open]);
    }
  }
}
function rewriteClosingParens(tokens){
  var debt, key, stack, i, token, tag, inv, stoken, start, end;
  debt = {};
  for (key in INVERSES) {
    debt[key] = 0;
  }
  stack = [];
  i = -1;
  while (token = tokens[++i]) {
    tag = token[0];
    if (__indexOf.call(EXPR_END, tag) < 0) {
      if (__indexOf.call(EXPR_START, tag) >= 0) {
        stack.push(token);
      }
      continue;
    }
    if (debt[inv = INVERSES[tag]] > 0) {
      --debt[inv];
      tokens.splice(i--, 1);
      continue;
    }
    stoken = stack.pop();
    if (tag === (end = INVERSES[start = stoken[0]])) {
      continue;
    }
    ++debt[start];
    tokens.splice(i, 0, [end, start === 'INDENT' ? stoken[1] : end, token[2]]);
  }
}
function expandLiterals(tokens){
  var i, token, num, sig, ts, lno, to, n, _step, _ref;
  i = -1;
  while (token = tokens[++i]) {
    switch (token[0]) {
    case 'STRNUM':
      if (~'-+'.indexOf(sig = (num = '' + token[1]).charAt(0))) {
        token[1] = num.slice(1);
        tokens.splice(i++, 0, ['+-', sig, token[2]]);
      }
      break;
    case 'RANGE':
      ts = [];
      lno = token[2];
      to = token.to - (token.op === 'to' ? 0 : 1e-15);
      for (n = +token[1], _step = +token.by || 1; _step < 0 ? n >= to : n <= to; n += _step) {
        if (2048 < ts.push(['STRNUM', n, lno], [',', ',', lno])) {
          carp('range limit exceeded', lno);
        }
      }
      if (ts.length) {
        ts.pop();
      } else {
        carp('empty range', lno);
      }
      tokens.splice.apply(tokens, [i, 1].concat(__slice.call(ts)));
      i += ts.length - 1;
      break;
    case 'LITERAL':
      break;
    case ')':
    case ')CALL':
      if (!token[1]) {
        break;
      }
      break;
    case ']':
      if (!token.index) {
        break;
      }
      break;
    case '}':
      if (token[1]) {
        break;
      }
      break;
    case 'CREMENT':
      if (i && able(tokens, i - 1)) {
        break;
      }
      break;
    case 'DOT':
      if (i && tokens[i - 1][0] === 'TERMINATOR') {
        tokens.splice(--i, 1);
      }
      continue;
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
  while (token = tokens[i]) {
    if (!levels) {
      if (ok(token, i)) {
        return go(token, i);
      }
    } else if (0 > levels) {
      return go(token, i - 1);
    }
    tag = token[0];
    if (__indexOf.call(EXPR_START, tag) >= 0) {
      ++levels;
    } else if (__indexOf.call(EXPR_END, tag) >= 0) {
      --levels;
    }
    ++i;
  }
}
function able(tokens, i, call){
  var token, tag;
  i == null && (i = tokens.length);
  tag = (token = tokens[i - 1])[0];
  return (tag === 'ID' || tag === ']' || tag === 'SUPER') || (call
    ? token.callable || tag === '?' || (tag === ')' || tag === ')CALL') && token[1]
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
function carp(msg, lno){
  throw SyntaxError(msg + " on line " + (-~lno));
}
BALANCED_PAIRS = [['(', ')'], ['[', ']'], ['{', '}'], ['CALL(', ')CALL'], ['PARAM(', ')PARAM'], ['INDENT', 'DEDENT']];
INVERSES = {};
EXPR_START = [];
EXPR_END = [];
for (_i = 0, _len = BALANCED_PAIRS.length; _i < _len; ++_i) {
  _ref = BALANCED_PAIRS[_i], left = _ref[0], rite = _ref[1];
  EXPR_START.push(INVERSES[rite] = left);
  EXPR_END.push(INVERSES[left] = rite);
}
ARG = ['ID', 'STRNUM', 'LITERAL', '(', '[', '{', '->', 'PARAM(', 'FUNCTION', 'UNARY', 'CREMENT', '...', 'IF', 'TRY', 'CLASS', 'SWITCH', 'LET', 'WITH', 'RANGE', 'SUPER', 'LABEL'];