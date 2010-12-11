(function(){
  var detectEnd, removeLeadingTerminators, removeMidExpressionTerminators, closeOpenings, addImplicitBraces, addImplicitParentheses, addImplicitIndentation, tagPostfixConditionals, ensureBalance, rewriteClosingParens, indexOfPair, BALANCED_PAIRS, INVERSES, EXPRESSION_START, EXPRESSION_END, left, rite, EXPRESSION_CLOSE, _i, _len, _ref, __indexOf = Array.prototype.indexOf || function(x){
    for (var i = this.length; i-- && this[i] !== x;); return i;
  };
  exports.rewrite = function(it){
    return rewriteClosingParens(ensureBalance(addImplicitParentheses(addImplicitBraces(tagPostfixConditionals(addImplicitIndentation(closeOpenings(removeMidExpressionTerminators(removeLeadingTerminators(it)))))))));
  };
  detectEnd = function(tokens, i, ok, go){
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
      if (_ref = token[0], __indexOf.call(EXPRESSION_START, _ref) >= 0) {
        ++levels;
      } else if (_ref = token[0], __indexOf.call(EXPRESSION_END, _ref) >= 0) {
        --levels;
      }
      ++i;
    }
    return i - 1;
  };
  removeLeadingTerminators = function(tokens){
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
  };
  removeMidExpressionTerminators = function(tokens){
    var i, token, _ref;
    i = 0;
    while (token = tokens[++i]) {
      if (tokens[i - 1][0] === 'TERMINATOR' && (_ref = token[0], __indexOf.call(EXPRESSION_CLOSE, _ref) >= 0)) {
        tokens.splice(i - 1, 1);
      }
    }
    return tokens;
  };
  closeOpenings = function(tokens){
    var stack, token, _i, _len;
    stack = [];
    for (_i = 0, _len = tokens.length; _i < _len; ++_i) {
      token = tokens[_i];
      switch (token[0]) {
      case '(':
      case 'CALL_START':
      case '[':
      case 'INDEX_START':
        stack.push(token[0]);
        break;
      case ')':
      case 'CALL_END':
        if (stack.pop() === 'CALL_START') {
          token[0] = 'CALL_END';
        }
        break;
      case ']':
      case 'INDEX_END':
        if (stack.pop() === 'INDEX_START') {
          token[0] = 'INDEX_END';
        }
      }
    }
    return tokens;
  };
  addImplicitBraces = function(tokens){
    var go, ok, stack, i, token, tag, start, paren, idx, _ref;
    go = function(token, i){
      return tokens.splice(i, 0, ['}', '}', token[2]]);
    };
    ok = function(token, i){
      var tag, one, _ref;
      if (token[1] === ';' || 'OUTDENT' === (tag = token[0])) {
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
        case __indexOf.call(EXPRESSION_START, tag) < 0:
          if (tag === 'INDENT' && ((_ref = tokens[i - 1]) != null ? _ref[0] : void 8) === '{') {
            tag = '{';
          }
          stack.push([tag, i]);
          break;
        case __indexOf.call(EXPRESSION_END, tag) < 0:
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
  };
  addImplicitParentheses = function(tokens){
    var i, token, tag, prev, seenClass, seenSingle, soak, _ref;
    i = 0;
    while (token = tokens[++i]) {
      tag = token[0];
      if (!(prev = tokens[i - 1]).spaced) {
        if (tag === '?') {
          token.call = true;
        } else if (tag === '{' && callable(prev[0])) {
          tokens.splice(i++, 0, ['CLONE', '', prev[2]]);
        }
        continue;
      }
      if (!(prev.call || callable(prev[0]))) {
        continue;
      }
      if (!(token.argument || (tag === '(' || tag === '[' || tag === '{' || tag === '...' || tag === 'IDENTIFIER' || tag === 'THISPROP' || tag === 'STRNUM' || tag === 'LITERAL' || tag === 'THIS' || tag === 'UNARY' || tag === 'CREMENT' || tag === 'IF' || tag === 'TRY' || tag === 'CLASS' || tag === 'FUNCTION' || tag === 'SUPER') || tag === 'PLUS_MINUS' && !(token.spaced || token.eol) || (tag === 'PARAM_START' || tag === 'FUNC_ARROW') && ((_ref = tokens[i - 2]) != null ? _ref[0] : void 8) !== 'FUNCTION')) {
        continue;
      }
      seenSingle = seenClass = false;
      if (soak = prev[0] === '?') {
        tokens.splice(--i, 1);
      }
      tokens.splice(i++, 0, ['CALL_START', (soak ? '?(' : '('), token[2]]);
      detectEnd(tokens, i, ok, go);
    }
    function callable(it){
      var _ref;
      return (it === 'IDENTIFIER' || it === 'THISPROP' || it === 'SUPER' || it === 'THIS' || it === ')' || it === 'CALL_END' || it === ']' || it === 'INDEX_END') || it === 'STRNUM' && ((_ref = tokens[i - 2]) != null ? _ref[0] : void 8) === 'ACCESS';
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
      if (tag === 'ACCESS' && (eol || pre === 'OUTDENT')) {
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
      if (token[0] === 'OUTDENT') {
        ++i;
      }
      return tokens.splice(i, 0, ['CALL_END', ')', token[2]]);
    }
    return tokens;
  };
  addImplicitIndentation = function(tokens){
    var ok, go, i, token, tag, next, indent, outdent, _ref;
    ok = function(token, i){
      switch (token[0]) {
      case 'CATCH':
      case 'FINALLY':
      case 'OUTDENT':
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
      return tokens.splice((tokens[i - 1][0] === ',' ? i - 1 : i), 0, outdent);
    };
    i = -1;
    while (token = tokens[++i]) {
      tag = token[0];
      if ('INDENT' === (next = (_ref = tokens[i + 1]) != null ? _ref[0] : void 8)) {
        if (tag === 'THEN') {
          tokens.splice(i, 1);
          _ref = tokens[i];
          _ref.fromThen = true;
          _ref.argument = true;
        }
        continue;
      }
      if (!((tag === 'THEN' || tag === 'FUNC_ARROW' || tag === 'DEFAULT' || tag === 'TRY' || tag === 'FINALLY') || tag === 'ELSE' && next !== 'IF')) {
        continue;
      }
      indent = ['INDENT', 2, token[2]];
      outdent = ['OUTDENT', 2, token[2]];
      indent.generated = outdent.generated = true;
      if (tag === 'THEN') {
        if (((_ref = tokens[i - 1]) != null ? _ref[0] : void 8) === 'TERMINATOR') {
          tokens.splice(--i, 1);
        }
        tokens[i] = (indent.fromThen = true, indent);
      } else {
        tokens.splice(++i, 0, indent);
      }
      detectEnd(tokens, i + 1, ok, go);
    }
    return tokens;
  };
  tagPostfixConditionals = function(tokens){
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
  };
  ensureBalance = function(tokens){
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
  };
  rewriteClosingParens = function(tokens){
    var stack, debt, key, i, token, tag, inv, stoken, start, end, tok, pos, _ref;
    stack = [];
    debt = {};
    for (key in INVERSES) {
      debt[key] = 0;
    }
    i = -1;
    while (token = tokens[++i]) {
      tag = token[0];
      if (__indexOf.call(EXPRESSION_END, tag) < 0) {
        if (__indexOf.call(EXPRESSION_START, tag) >= 0) {
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
  };
  indexOfPair = function(tokens, i){
    var level, start, end, token;
    level = 1;
    end = INVERSES[start = tokens[i][0]];
    while (token = tokens[++i]) {
      switch (token[0]) {
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
  };
  BALANCED_PAIRS = [['(', ')'], ['[', ']'], ['{', '}'], ['INDENT', 'OUTDENT'], ['CALL_START', 'CALL_END'], ['PARAM_START', 'PARAM_END'], ['INDEX_START', 'INDEX_END']];
  INVERSES = {};
  EXPRESSION_START = [];
  EXPRESSION_END = [];
  for (_i = 0, _len = BALANCED_PAIRS.length; _i < _len; ++_i) {
    _ref = BALANCED_PAIRS[_i], left = _ref[0], rite = _ref[1];
    EXPRESSION_START.push(INVERSES[rite] = left);
    EXPRESSION_END.push(INVERSES[left] = rite);
  }
  EXPRESSION_CLOSE = EXPRESSION_END.concat('ELSE', 'BY', 'TO', 'CATCH', 'FINALLY', 'CASE', 'DEFAULT');
}).call(this);
