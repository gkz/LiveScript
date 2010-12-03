(function(){
  var BALANCED_PAIRS, EXPRESSION_CLOSE, EXPRESSION_END, EXPRESSION_START, INVERSES, addImplicitBraces, addImplicitIndentation, addImplicitParentheses, closeOpenings, detectEnd, ensureBalance, indexOfPair, left, removeLeadingTerminators, removeMidExpressionTerminators, rewriteClosingParens, rite, tagPostfixConditionals, _i, _len, _ref, __indexOf = Array.prototype.indexOf || function(x){
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
      case "INDEX_START":
      case "CALL_START":
      case "[":
      case "(":
        stack.push(token[0]);
        break;
      case "INDEX_END":
      case "]":
        if (stack.pop() === 'INDEX_START') {
          token[0] = 'INDEX_END';
        }
        break;
      case "CALL_END":
      case ")":
        if (stack.pop() === 'CALL_START') {
          token[0] = 'CALL_END';
        }
      }
    }
    return tokens;
  };
  addImplicitBraces = function(tokens){
    var go, i, idx, ok, paren, stack, start, tag, token, _ref;
    go = function(token, i){
      return tokens.splice(i, 0, ['}', '}', token[2]]);
    };
    ok = function(token, i){
      var one, tag, _ref;
      if ('HERECOMMENT' === (one = (_ref = tokens[i + 1]) != null ? _ref[0] : void 8)) {
        return false;
      }
      tag = token[0];
      return tag === 'OUTDENT' || tag === ',' && (one !== "IDENTIFIER" && one !== "STRNUM" && one !== "THISPROP" && one !== "TERMINATOR" && one !== "OUTDENT" && one !== "(") || tag === 'TERMINATOR' && ':' !== ((_ref = tokens[one === '('
        ? 1 + indexOfPair(tokens, i + 1)
        : i + 2]) != null ? _ref[0] : void 8);
    };
    stack = [];
    i = -1;
    while (token = tokens[++i]) {
      tag = token[0];
      if (__indexOf.call(EXPRESSION_START, tag) >= 0) {
        if (tag === 'INDENT' && ((_ref = tokens[i - 1]) != null ? _ref[0] : void 8) === '{') {
          tag = '{';
        }
        stack.push([tag, i]);
        continue;
      }
      if (__indexOf.call(EXPRESSION_END, tag) >= 0) {
        start = stack.pop();
        continue;
      }
      if (tag !== ':') {
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
      while (((_ref = tokens[idx - 2]) != null ? _ref[0] : void 8) === 'HERECOMMENT') {
        idx -= 2;
      }
      tokens.splice(idx, 0, (_ref = ['{', '{', token[2]], _ref.generated = true, _ref));
      detectEnd(tokens, ++i + 1, ok, go);
    }
    return tokens;
  };
  addImplicitParentheses = function(tokens){
    var i, prev, seenClass, seenSingle, soak, tag, token, _ref;
    i = 0;
    while (token = tokens[++i]) {
      tag = token[0];
      if (!(prev = tokens[i - 1]).spaced) {
        if (tag === '?') {
          token.call = true;
        }
        continue;
      }
      if (!(prev.call || ((_ref = prev[0]) === "IDENTIFIER" || _ref === "THISPROP" || _ref === "SUPER" || _ref === "THIS" || _ref === ")" || _ref === "CALL_END" || _ref === "]" || _ref === "INDEX_END"))) {
        continue;
      }
      if (!(token.xthen || (tag === "(" || tag === "[" || tag === "{" || tag === "..." || tag === "IDENTIFIER" || tag === "THISPROP" || tag === "STRNUM" || tag === "LITERAL" || tag === "THIS" || tag === "UNARY" || tag === "CREMENT" || tag === "FUNCTION" || tag === "IF" || tag === "TRY" || tag === "SWITCH" || tag === "CLASS" || tag === "SUPER") || tag === 'PLUS_MINUS' && !(token.spaced || token.eol) || (tag === "PARAM_START" || tag === "FUNC_ARROW") && ((_ref = tokens[i - 2]) != null ? _ref[0] : void 8) !== 'FUNCTION')) {
        continue;
      }
      seenSingle = seenClass = false;
      if (soak = prev[0] === '?') {
        tokens.splice(--i, 1);
      }
      tokens.splice(i++, 0, ['CALL_START', (soak ? '?(' : '('), token[2]]);
      detectEnd(tokens, i, ok, go);
    }
    function ok(token, i){
      var eol, pre, tag, _ref;
      if (token.xthen) {
        return false;
      }
      if (!seenSingle && token.then) {
        return true;
      }
      tag = token[0];
      _ref = tokens[i - 1], pre = _ref[0], eol = _ref.eol;
      switch (tag) {
      case 'CLASS':
        seenClass = true;
        break;
      case "IF":
      case "ELSE":
      case "FUNC_ARROW":
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
        return pre !== "FUNC_ARROW" && pre !== "{" && pre !== "[" && pre !== ",";
      }
      return tag === "POST_IF" || tag === "FOR" || tag === "WHILE" || tag === "BY" || tag === "TO" || tag === "CASE" || tag === "DEFAULT" || tag === "TERMINATOR";
    } ok.name = "ok";
    function go(token, i){
      if (token[0] === 'OUTDENT') {
        ++i;
      }
      return tokens.splice(i, 0, ['CALL_END', ')', token[2]]);
    } go.name = "go";
    return tokens;
  };
  addImplicitIndentation = function(tokens){
    var go, i, indent, next, ok, outdent, tag, token, _ref;
    ok = function(token, i){
      switch (token[0]) {
      case "CATCH":
      case "FINALLY":
      case "OUTDENT":
      case "CASE":
      case "DEFAULT":
        return true;
      case 'TERMINATOR':
        return token[1] !== ';';
      case 'ELSE':
        return tag === "IF" || tag === "THEN";
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
          _ref.then = true;
          _ref.xthen = true;
        }
        continue;
      }
      if (!((tag === "THEN" || tag === "FUNC_ARROW" || tag === "DEFAULT" || tag === "TRY" || tag === "FINALLY") || tag === 'ELSE' && next !== 'IF')) {
        continue;
      }
      indent = ['INDENT', 2, token[2]];
      outdent = ['OUTDENT', 2, token[2]];
      indent.generated = outdent.generated = true;
      if (tag === 'THEN') {
        if (((_ref = tokens[i - 1]) != null ? _ref[0] : void 8) === 'TERMINATOR') {
          tokens.splice(--i, 1);
        }
        tokens[i] = (indent.then = true, indent);
      } else {
        tokens.splice(++i, 0, indent);
      }
      detectEnd(tokens, i + 1, ok, go);
    }
    return tokens;
  };
  tagPostfixConditionals = function(tokens){
    var go, i, ok, token, _len;
    ok = function(_arg){
      var tag;
      tag = _arg[0];
      return tag === "TERMINATOR" || tag === "INDENT";
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
    var close, level, levels, olines, open, tag, token, _i, _j, _len, _len2, _ref, _ref2;
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
    var debt, end, i, inv, key, pos, stack, start, stoken, tag, tok, token, _ref;
    stack = [];
    debt = {};
    for (key in INVERSES) {
      debt[key] = 0;
    }
    i = -1;
    while (token = tokens[++i]) {
      tag = token[0];
      if (__indexOf.call(EXPRESSION_START, tag) >= 0) {
        stack.push(token);
        continue;
      }
      if (__indexOf.call(EXPRESSION_END, tag) < 0) {
        continue;
      }
      if (debt[inv = INVERSES[tag]] > 0) {
        --debt[inv];
        tokens.splice(i--, 1);
        continue;
      }
      start = (stoken = stack.pop())[0];
      if (tag === (end = INVERSES[start])) {
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
    var bgn, end, lvl, token;
    bgn = tokens[i][0];
    end = INVERSES[bgn];
    lvl = 1;
    while (token = tokens[++i]) {
      switch (token[0]) {
      case bgn:
        ++lvl;
        break;
      case end:
        if (!--lvl) {
          return i;
        }
      }
    }
    return -1;
  };
  BALANCED_PAIRS = [["(", ")"], ["[", "]"], ["{", "}"], ["INDENT", "OUTDENT"], ["CALL_START", "CALL_END"], ["PARAM_START", "PARAM_END"], ["INDEX_START", "INDEX_END"]];
  INVERSES = {};
  EXPRESSION_START = [];
  EXPRESSION_END = [];
  for (_i = 0, _len = BALANCED_PAIRS.length; _i < _len; ++_i) {
    _ref = BALANCED_PAIRS[_i], left = _ref[0], rite = _ref[1];
    EXPRESSION_START.push(INVERSES[rite] = left);
    EXPRESSION_END.push(INVERSES[left] = rite);
  }
  EXPRESSION_CLOSE = EXPRESSION_END.concat("ELSE", "BY", "TO", "CATCH", "FINALLY", "CASE", "DEFAULT");
}).call(this);
