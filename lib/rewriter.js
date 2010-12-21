var BALANCED_PAIRS, INVERSES, EXPR_START, EXPR_END, left, rite, EXPR_CLOSE, _i, _len, _ref, __indexOf = [].indexOf || function(x){
  for (var i = this.length; i-- && this[i] !== x;); return i;
};
exports.rewrite = function(it){
  return rewriteClosingParens(ensureBalance(addImplicitParentheses(addImplicitBraces(tagPostfixConditionals(addImplicitIndentation(closeOpenings(removeMidExpressionTerminators(removeLeadingTerminators(it)))))))));
};
function detectEnd(tokens, i, ok, go){
  var levels, token, _ref;
  levels = 0;
  while (token = tokens[i]) {
    if (!levels) {
      if (ok(token, i)) {
        return go(token, i);
      }
    } else if (0 > levels) {
      return go(token, i - 1);
    }
    if (_ref = token[0], __indexOf.call(EXPR_START, _ref) >= 0) {
      ++levels;
    } else if (_ref = token[0], __indexOf.call(EXPR_END, _ref) >= 0) {
      --levels;
    }
    ++i;
  }
  return i - 1;
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
  var i, that, _ref;
  i = 0;
  while (that = tokens[++i]) {
    if (tokens[i - 1][0] === 'TERMINATOR' && (_ref = that[0], __indexOf.call(EXPR_CLOSE, _ref) >= 0)) {
      tokens.splice(i - 1, 1);
    }
  }
  return tokens;
}
function closeOpenings(tokens){
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
  var i, token, tag, prev, seenClass, seenSingle, soak, _ref;
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
        if (able(prev[0])) {
          tokens.splice(i++, 0, [tag === '[' ? 'DOT' : 'CLONE', '', prev[2]]);
        }
      }
      continue;
    }
    if (!(prev.call || able(prev[0], true))) {
      continue;
    }
    if (!(token.argument || (tag === '(' || tag === '[' || tag === '{' || tag === '...' || tag === 'IDENTIFIER' || tag === 'THISPROP' || tag === 'STRNUM' || tag === 'LITERAL' || tag === 'THIS' || tag === 'UNARY' || tag === 'CREMENT' || tag === 'IF' || tag === 'TRY' || tag === 'CLASS' || tag === 'FUNCTION' || tag === 'SUPER') || tag === '+-' && !(token.spaced || token.eol) || (tag === 'PARAM(' || tag === 'FUNC_ARROW') && ((_ref = tokens[i - 2]) != null ? _ref[0] : void 8) !== 'FUNCTION')) {
      continue;
    }
    seenSingle = seenClass = false;
    if (soak = prev[0] === '?') {
      tokens.splice(--i, 1);
    }
    tokens.splice(i++, 0, ['CALL(', soak ? '?(' : '(', token[2]]);
    detectEnd(tokens, i, ok, go);
  }
  function able(tag, call){
    var _ref;
    return (tag === 'IDENTIFIER' || tag === 'THISPROP' || tag === 'SUPER' || tag === 'THIS' || tag === ')' || tag === ')CALL' || tag === ']') || (call
      ? tag === 'STRNUM' && ((_ref = tokens[i - 2]) != null ? _ref[0] : void 8) === 'DOT'
      : tag === '}' || tag === 'STRNUM' || tag === 'LITERAL');
  }
  function ok(token, i){
    var tag, pre, eol, _ref;
    if (token.argument) {
      return false;
    }
    if (!seenSingle && token.fromThen) {
      return true;
    }
    tag = token[0];
    _ref = tokens[i - 1], pre = _ref[0], eol = _ref.eol;
    switch (tag) {
    case 'CLASS':
      seenClass = true;
      break;
    case 'IF':
    case 'CATCH':
      seenSingle = true;
    }
    if (tag === 'DOT' && (eol || pre === 'DEDENT')) {
      return true;
    }
    if (token.generated || pre === ',') {
      return false;
    }
    if (tag === 'INDENT') {
      if (seenClass) {
        return seenClass = false;
      }
      return (pre !== '{' && pre !== '[' && pre !== ',' && pre !== 'FUNC_ARROW' && pre !== 'TRY' && pre !== 'FINALLY') && ((_ref = tokens[i - 2]) != null ? _ref[0] : void 8) !== 'CATCH';
    }
    return tag === 'POST_IF' || tag === 'FOR' || tag === 'WHILE' || tag === 'BY' || tag === 'TO' || tag === 'CASE' || tag === 'DEFAULT' || tag === 'TERMINATOR';
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
  var ok, go, i, token, tag, next, indent, dedent, idx, _ref;
  ok = function(token, i){
    switch (token[0]) {
    case 'CATCH':
    case 'FINALLY':
    case 'DEDENT':
    case 'CASE':
    case 'DEFAULT':
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
        /* fallthrough */
      case token[1] !== 'do':
        tokens[i + 1].argument = true;
        break;
      default:
        continue;
      }
      tokens.splice(i, 1);
      continue;
    }
    if (!((tag === 'THEN' || tag === 'FUNC_ARROW' || tag === 'DEFAULT' || tag === 'TRY' || tag === 'FINALLY') || tag === 'ELSE' && next !== 'IF')) {
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
        throw SyntaxError("too many " + token[1] + " on line " + (token[2] + 1));
      }
    }
  }
  for (open in levels) {
    level = levels[open];
    if (level > 0) {
      throw SyntaxError("unclosed " + open + " on line " + (olines[open] + 1));
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
BALANCED_PAIRS = [['(', ')'], ['[', ']'], ['{', '}'], ['CALL(', ')CALL'], ['PARAM(', ')PARAM'], ['INDENT', 'DEDENT']];
INVERSES = {};
EXPR_START = [];
EXPR_END = [];
for (_i = 0, _len = BALANCED_PAIRS.length; _i < _len; ++_i) {
  _ref = BALANCED_PAIRS[_i], left = _ref[0], rite = _ref[1];
  EXPR_START.push(INVERSES[rite] = left);
  EXPR_END.push(INVERSES[left] = rite);
}
EXPR_CLOSE = EXPR_END.concat(['ELSE', 'BY', 'TO', 'CATCH', 'FINALLY', 'CASE', 'DEFAULT']);