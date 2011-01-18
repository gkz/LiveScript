var BALANCED_PAIRS, INVERSES, EXPR_START, EXPR_END, left, rite, _i, _len, _ref, __indexOf = [].indexOf || function(x){
  for (var i = this.length; i-- && this[i] !== x;); return i;
}, __slice = [].slice;
exports.rewrite = rewrite;
exports.able = able;
function rewrite(it){
  return expandNumbers(rewriteClosingParens(ensureBalance(addImplicitParentheses(addImplicitBraces(tagPostfixConditionals(addImplicitIndentation(closeCalls(removeMidExpressionTerminators(removeLeadingTerminators(it))))))))));
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
function removeLeadingTerminators(tokens){
  var i, tag, _len;
  for (i = 0, _len = tokens.length; i < _len; ++i) {
    tag = tokens[i][0];
    if (tag !== 'TERMINATOR') {
      break;
    }
  }
  if (i) {
    tokens.splice(0, i);
  }
  return tokens;
}
function removeMidExpressionTerminators(tokens){
  var i, that;
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
  return tokens;
}
function closeCalls(tokens){
  var stack, token, that, _i, _len;
  stack = [];
  for (_i = 0, _len = tokens.length; _i < _len; ++_i) {
    token = tokens[_i];
    switch (that = token[0]) {
    case '(':
    case 'CALL(':
      stack.push(that);
      break;
    case ')':
    case ')CALL':
      stack.pop() === 'CALL(' && (token[0] = ')CALL');
    }
  }
  return tokens;
}
function addImplicitBraces(tokens){
  var go, ok, stack, i, token, tag, start, paren, idx, _ref;
  go = function(token, i){
    return tokens.splice(i, 0, ['}', '}', token[2]]);
  };
  ok = function(token, i){
    var tag, one, _ref;
    if (token[1] === ';' || 'DEDENT' === (tag = token[0])) {
      return true;
    }
    if (tag !== ',' && tag !== 'TERMINATOR') {
      return false;
    }
    one = (_ref = tokens[i + 1]) != null ? _ref[0] : void 8;
    if (tag === ',') {
      return one !== 'IDENTIFIER' && one !== 'STRNUM' && one !== 'TERMINATOR' && one !== '(';
    } else {
      return one !== 'COMMENT' && ':' !== ((_ref = tokens[one === '('
        ? 1 + indexOfPair(tokens, i + 1)
        : i + 2]) != null ? _ref[0] : void 8);
    }
  };
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
    if (!(paren && ((_ref = tokens[start[1] - 1]) != null ? _ref[0] : void 8) === ':' || ((_ref = tokens[i - 2]) != null ? _ref[0] : void 8) === ':' || ((_ref = stack[stack.length - 1]) != null ? _ref[0] : void 8) !== '{')) {
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
  return tokens;
}
function addImplicitParentheses(tokens){
  var i, token, tag, prev, seenCase, seenSwitch, seenClass, seenSingle, soak;
  i = 0;
  while (token = tokens[++i]) {
    tag = token[0];
    if (!(prev = tokens[i - 1]).spaced) {
      switch (tag) {
      case '?':
        token.call = true;
        break;
      case '[':
      case '{':
        if (able(tokens, i)) {
          tokens.splice(i++, 0, [tag === '[' ? 'DOT' : 'CLONE', '', prev[2]]);
        }
      }
      continue;
    }
    if (!(prev.call || able(tokens, i, true))) {
      continue;
    }
    if (token.fromDo) {
      token[0] = 'CALL(';
      token.pair[0] = ')CALL';
      continue;
    }
    if (!((tag === '(' || tag === '[' || tag === '{' || tag === '...' || tag === 'IDENTIFIER' || tag === 'THISPROP' || tag === 'THIS' || tag === 'STRNUM' || tag === 'LITERAL' || tag === 'PARAM(' || tag === 'FUNC_ARROW' || tag === 'FUNCTION' || tag === 'RANGE' || tag === 'SUPER' || tag === 'UNARY' || tag === 'CREMENT' || tag === 'IF' || tag === 'TRY' || tag === 'CLASS' || tag === 'SWITCH') || tag === '+-' && !(token.spaced || token.eol) || (seenSingle = seenClass = seenSwitch = seenCase = false))) {
      continue;
    }
    if (soak = prev[0] === '?') {
      tokens.splice(--i, 1);
    }
    tokens.splice(i++, 0, ['CALL(', soak ? '?(' : '(', token[2]]);
    detectEnd(tokens, i, ok, go);
  }
  function ok(token, i){
    var pre, _ref;
    if (!seenSingle && token.fromThen || token.alias && ((_ref = token[1]) === '&&' || _ref === '||')) {
      return true;
    }
    pre = tokens[i - 1];
    switch (token[0]) {
    case 'CLASS':
      seenClass = true;
      break;
    case 'SWITCH':
      seenSwitch = true;
      /* fallthrough */
    case 'IF':
    case 'CATCH':
      seenSingle = true;
      break;
    case 'CASE':
      if (seenSwitch) {
        seenCase = true;
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
      if (seenClass) {
        return seenClass = false;
      }
      if (seenCase) {
        return seenCase = false;
      }
      if (token.generated) {
        return false;
      }
      return (_ref = pre[0]) !== '{' && _ref !== '[' && _ref !== ',' && _ref !== 'FUNC_ARROW' && _ref !== 'TRY' && _ref !== 'CATCH' && _ref !== 'FINALLY' && _ref !== 'DEFAULT';
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
    if (token[0] === 'DEDENT') {
      ++i;
    }
    return tokens.splice(i, 0, [')CALL', ')', token[2]]);
  }
  return tokens;
}
function addImplicitIndentation(tokens){
  var ok, go, i, token, tag, next, pair, indent, dedent, idx, _ref;
  ok = function(token, i){
    switch (token[0]) {
    case 'DEDENT':
    case 'CASE':
    case 'DEFAULT':
    case 'CATCH':
    case 'FINALLY':
      return true;
    case 'TERMINATOR':
      return token[1] !== ';';
    case 'ELSE':
      return tag === 'IF' || tag === 'THEN';
    }
  };
  go = function(token, i){
    return tokens.splice(tokens[i - 1][0] === ',' ? i - 1 : i, 0, dedent);
  };
  i = -1;
  while (token = tokens[++i]) {
    tag = token[0];
    if ('INDENT' === (next = (_ref = tokens[i + 1]) != null ? _ref[0] : void 8)) {
      switch (false) {
      case tag !== 'THEN':
        tokens[i + 1].fromThen = true;
        break;
      case token[1] !== 'do':
        (pair = tokens[indexOfPair(tokens, i + 1)])[0] = ')';
        _ref = tokens[i + 1];
        _ref.fromDo = true;
        _ref.pair = pair;
        _ref[0] = '(';
        break;
      default:
        continue;
      }
      tokens.splice(i, 1);
      continue;
    }
    if (next === 'THEN') {
      continue;
    }
    if (!((tag === 'THEN' || tag === 'FUNC_ARROW' || tag === 'DEFAULT' || tag === 'TRY' || tag === 'CATCH' || tag === 'FINALLY') || tag === 'ELSE' && next !== 'IF')) {
      continue;
    }
    indent = ['INDENT', 2, token[2]];
    dedent = ['DEDENT', 2, token[2]];
    indent.generated = dedent.generated = true;
    if (tag === 'THEN') {
      if (((_ref = tokens[i - 1]) != null ? _ref[0] : void 8) === 'TERMINATOR') {
        tokens.splice(--i, 1);
      }
      tokens[i] = (indent.fromThen = true, indent);
    } else {
      tokens.splice(++i, 0, indent);
    }
    switch (false) {
    case ',' !== (next = tokens[i + 1][0]):
      --i;
      /* fallthrough */
    case ',' !== ((_ref = tokens[i + 2]) != null ? _ref[0] : void 8):
      go(0, i += 2);
      ++i;
      break;
    case !((next === '(' || next === '[' || next === '{') && ',' === ((_ref = tokens[idx = 1 + indexOfPair(tokens, i + 1)]) != null ? _ref[0] : void 8)):
      go(0, idx);
      ++i;
      break;
    default:
      detectEnd(tokens, i + 1, ok, go);
    }
  }
  return tokens;
}
function tagPostfixConditionals(tokens){
  var ok, go, i, token, _len;
  ok = function(_arg){
    var tag;
    tag = _arg[0];
    return tag === 'TERMINATOR' || tag === 'INDENT';
  };
  go = function(_arg){
    var tag;
    tag = _arg[0];
    if (tag !== 'INDENT') {
      return token[0] = 'POST_IF';
    }
  };
  for (i = 0, _len = tokens.length; i < _len; ++i) {
    token = tokens[i];
    if (token[0] === 'IF') {
      detectEnd(tokens, i + 1, ok, go);
    }
  }
  return tokens;
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
        carp('too many ' + token[1], token[2]);
      }
    }
  }
  for (open in levels) {
    level = levels[open];
    if (level > 0) {
      carp('unclosed ' + open, olines[open]);
    }
  }
  return tokens;
}
function rewriteClosingParens(tokens){
  var debt, key, stack, i, token, tag, inv, stoken, start, end, tok, pos, _ref;
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
    tok = [end, start === 'INDENT' ? stoken[1] : end];
    pos = ((_ref = tokens[i + 2]) != null ? _ref[0] : void 8) === start ? (stack.push(stoken), i + 3) : i;
    tokens.splice(pos, 0, tok);
  }
  return tokens;
}
function expandNumbers(tokens){
  var i, last, token, num, sig, ts, lno, to, n, _step;
  i = -1;
  last = tokens[0];
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
        if (1024 < ts.push(['STRNUM', n, lno])) {
          carp('range limit exceeded', lno);
        }
      }
      ts.length || carp('empty range', lno);
      tokens.splice.apply(tokens, [i, 1].concat(__slice.call(ts)));
      i += ts.length - 1;
    }
    last = token;
  }
  return tokens;
}
function able(tokens, i, call){
  var tag, _ref;
  i == null && (i = tokens.length);
  tag = tokens[i - 1][0];
  return (tag === 'IDENTIFIER' || tag === 'THISPROP' || tag === 'THIS' || tag === 'SUPER' || tag === ']' || tag === ')' || tag === ')CALL') || (call
    ? tag === 'STRNUM' && ((_ref = tokens[i - 2]) != null ? _ref[0] : void 8) === 'DOT'
    : tag === 'STRNUM' || tag === 'LITERAL' || tag === '}');
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
  throw SyntaxError(msg + ' on line ' + -~lno);
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