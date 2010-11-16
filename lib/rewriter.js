(function(){
  var BALANCED_PAIRS, EXPRESSION_CLOSE, EXPRESSION_END, EXPRESSION_START, IMPLICIT_FUNC, INVERSES, addImplicitBraces, addImplicitIndentation, addImplicitParentheses, closeOpenings, detectEnd, ensureBalance, indentation, left, removeLeadingNewlines, removeMidExpressionNewlines, rewriteClosingParens, rite, tagPostfixConditionals, _i, _len, _ref, __indexOf = Array.prototype.indexOf || function(item){
    for (var i = 0, l = this.length; i < l; ++i) if (this[i] === item) return i;
    return -1;
  }, __slice = Array.prototype.slice;
  exports.rewrite = function(tokens){
    removeLeadingNewlines(tokens);
    removeMidExpressionNewlines(tokens);
    closeOpenings(tokens);
    addImplicitIndentation(tokens);
    tagPostfixConditionals(tokens);
    addImplicitBraces(tokens);
    addImplicitParentheses(tokens);
    ensureBalance(tokens);
    rewriteClosingParens(tokens);
    return tokens;
  };
  detectEnd = function(tokens, i, condition, action){
    var levels, token, _ref;
    levels = 0;
    while (token = tokens[i]) {
      if (levels === 0 && condition(token, i)) {
        return action(token, i);
      }
      if (levels < 0) {
        return action(token, i - 1);
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
  removeLeadingNewlines = function(tokens){
    var i, tag, _len;
    for (i = 0, _len = tokens.length; i < _len; ++i) {
      tag = tokens[i][0];
      if (tag === 'TERMINATOR') continue;
      break;
    }
    if (i) {
      return tokens.splice(0, i);
    }
  };
  removeMidExpressionNewlines = function(tokens){
    var i, token, _ref;
    i = 0;
    while (token = tokens[++i]) {
      if (!(tokens[i - 1][0] === 'TERMINATOR' && (_ref = token[0], __indexOf.call(EXPRESSION_CLOSE, _ref) >= 0))) continue;
      tokens.splice(i - 1, 1);
    }
    return this;
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
    return this;
  };
  addImplicitBraces = function(tokens){
    var action, condition, i, idx, paren, stack, start, tag, tok, token, _ref;
    condition = function(token, i){
      var one, tag, _ref, _ref2;
      if ('HERECOMMENT' === (one = (_ref = tokens[i + 1]) != null ? _ref[0] : void 0)) {
        return false;
      }
      tag = token[0];
      return tag === ',' && (one !== "IDENTIFIER" && one !== "STRNUM" && one !== "THISPROP" && one !== "TERMINATOR" && one !== "OUTDENT" && one !== "(") || (tag === "TERMINATOR" || tag === "OUTDENT") && ((_ref = (_ref2 = tokens[i + 2]) != null ? _ref2[0] : void 0) !== ":" && _ref !== "...");
    };
    action = function(token, i){
      return tokens.splice(i, 0, ['}', '}', token[2]]);
    };
    stack = [];
    i = -1;
    while (token = tokens[++i]) {
      tag = token[0];
      if (__indexOf.call(EXPRESSION_START, tag) >= 0) {
        if (tag === 'INDENT' && ((_ref = tokens[i - 1]) != null ? _ref[0] : void 0) === '{') {
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
      paren = ((_ref = tokens[i - 1]) != null ? _ref[0] : void 0) === ')';
      if (!(paren && ((_ref = tokens[start[1] - 1]) != null ? _ref[0] : void 0) === ':' || ((_ref = tokens[i - 2]) != null ? _ref[0] : void 0) === ':' || ((_ref = stack[stack.length - 1]) != null ? _ref[0] : void 0) !== '{')) {
        continue;
      }
      stack.push(['{']);
      idx = paren ? start[1] : i - 1;
      if (((_ref = tokens[idx - 2]) != null ? _ref[0] : void 0) === 'HERECOMMENT') {
        idx -= 2;
      }
      tok = ['{', '{', token[2]];
      tok.generated = true;
      tokens.splice(idx, 0, tok);
      detectEnd(tokens, i + 2, condition, action);
      ++i;
    }
    return this;
  };
  addImplicitParentheses = function(tokens){
    var action, callObject, classLine, condition, i, next, prev, seenSingle, tag, token, _ref;
    classLine = seenSingle = false;
    condition = function(token, i){
      var post, pre, tag, _ref;
      if (!seenSingle && token.fromThen) {
        return true;
      }
      tag = token[0];
      pre = tokens[i - 1][0];
      if (tag === "IF" || tag === "ELSE" || tag === "FUNC_ARROW") {
        seenSingle = true;
      }
      if (tag === 'ACCESS' && pre === 'OUTDENT') {
        return true;
      }
      if (token.generated || pre === ',') {
        return false;
      }
      return (tag === "POST_IF" || tag === "FOR" || tag === "WHILE" || tag === "WHEN" || tag === "BY" || tag === "TO" || tag === "CASE" || tag === "DEFAULT" || tag === "TERMINATOR") || tag === 'INDENT' && (pre !== "FUNC_ARROW" && pre !== "{" && pre !== "[" && pre !== ",") && ((_ref = tokens[i - 2]) != null ? _ref[0] : void 0) !== 'CLASS' && !((post = tokens[i + 1]) && post.generated && post[0] === '{');
    };
    action = function(token, i){
      if (token[0] === 'OUTDENT') {
        ++i;
      }
      return tokens.splice(i, 0, ['CALL_END', ')', token[2]]);
    };
    i = -1;
    while (token = tokens[++i]) {
      tag = token[0];
      prev = tokens[i - 1];
      if (tag === 'CLASS') {
        classLine = true;
      }
      callObject = !classLine && tag === 'INDENT' && prev && (_ref = prev[0], __indexOf.call(IMPLICIT_FUNC, _ref) >= 0) && (next = tokens[i + 1]) && next.generated && next[0] === '{';
      if (tag === "TERMINATOR" || tag === "INDENT" || tag === "OUTDENT") {
        classLine = false;
      }
      if (tag === '?' && prev && !prev.spaced) {
        token.call = true;
      }
      if (!(callObject || (prev != null ? prev.spaced : void 0) && (prev.call || (_ref = prev[0], __indexOf.call(IMPLICIT_FUNC, _ref) >= 0)) && ((tag === "(" || tag === "[" || tag === "{" || tag === "IDENTIFIER" || tag === "THISPROP" || tag === "STRNUM" || tag === "LITERAL" || tag === "THIS" || tag === "UNARY" || tag === "CREMENT" || tag === "FUNCTION" || tag === "IF" || tag === "TRY" || tag === "SWITCH" || tag === "CLASS" || tag === "SUPER" || tag === "...") || (tag === "PARAM_START" || tag === "FUNC_ARROW") && ((_ref = tokens[i - 2]) != null ? _ref[0] : void 0) !== 'FUNCTION' || tag === 'PLUS_MINUS' && !(token.spaced || token.eol)))) {
        continue;
      }
      tokens.splice(i++, 0, ['CALL_START', '(', token[2]]);
      if (callObject) {
        ++i;
      }
      seenSingle = false;
      detectEnd(tokens, i, condition, action);
      if (prev[0] === '?') {
        prev[0] = 'FUNC_EXIST';
      }
    }
    return this;
  };
  addImplicitIndentation = function(tokens){
    var i, indent, next, outdent, tag, token, _ref, _ref2;
    i = -1;
    while (token = tokens[++i]) {
      tag = token[0];
      if (tag === 'ELSE' && ((_ref = tokens[i - 1]) != null ? _ref[0] : void 0) !== 'OUTDENT') {
        tokens.splice.apply(tokens, [i, 0].concat(__slice.call(indentation(token))));
        i += 1;
        continue;
      }
      if (tag === 'CATCH' && ((_ref = (_ref2 = tokens[i + 2]) != null ? _ref2[0] : void 0) === "OUTDENT" || _ref === "TERMINATOR" || _ref === "FINALLY")) {
        tokens.splice.apply(tokens, [i + 2, 0].concat(__slice.call(indentation(token))));
        i += 3;
        continue;
      }
      if (tag === 'TERMINATOR' && ((_ref = tokens[i + 1]) != null ? _ref[0] : void 0) === 'THEN') {
        tokens.splice(i, 1);
        tag = (token = tokens[i])[0];
      }
      if ((next = (_ref = tokens[i + 1]) != null ? _ref[0] : void 0) === 'INDENT') {
        continue;
      }
      if (!((tag === "FUNC_ARROW" || tag === "THEN" || tag === "DEFAULT" || tag === "TRY" || tag === "FINALLY") || tag === 'ELSE' && next !== 'IF')) {
        continue;
      }
      _ref = indentation(token), indent = _ref[0], outdent = _ref[1];
      if (tag === 'THEN') {
        indent.fromThen = true;
      }
      indent.generated = outdent.generated = true;
      tokens.splice(i + 1, 0, indent);
      detectEnd(tokens, i + 2, function(token, i){
        var t;
        t = token[0];
        return (t === "CATCH" || t === "FINALLY" || t === "OUTDENT" || t === "CASE" || t === "DEFAULT") || t === 'TERMINATOR' && token[1] !== ';' || t === 'ELSE' && (tag === "IF" || tag === "THEN");
      }, function(token, i){
        return tokens.splice((tokens[i - 1][0] === ',' ? i - 1 : i), 0, outdent);
      });
      if (tag === 'THEN') {
        tokens.splice(i, 1);
      } else {
        ++i;
      }
    }
    return this;
  };
  tagPostfixConditionals = function(tokens){
    var action, condition, i, token, _len;
    condition = function(_arg){
      var tag;
      tag = _arg[0];
      return tag === "TERMINATOR" || tag === "INDENT";
    };
    action = function(_arg){
      var tag;
      tag = _arg[0];
      if (tag !== 'INDENT') {
        return token[0] = 'POST_IF';
      }
    };
    for (i = 0, _len = tokens.length; i < _len; ++i) {
      token = tokens[i];
      if (token[0] !== 'IF') continue;
      detectEnd(tokens, i + 1, condition, action);
    }
    return this;
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
      if (level <= 0) continue;
      throw SyntaxError("unclosed " + open + " on line " + (olines[open] + 1));
    }
    return this;
  };
  rewriteClosingParens = function(tokens){
    var debt, end, i, inv, key, stack, start, stoken, tag, tok, token, _ref;
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
      if (((_ref = tokens[i + 2]) != null ? _ref[0] : void 0) === start) {
        stack.push(stoken);
        tokens.splice(i + 3, 0, tok);
      } else {
        tokens.splice(i, 0, tok);
      }
    }
    return this;
  };
  indentation = function(token){
    return [['INDENT', 2, token[2]], ['OUTDENT', 2, token[2]]];
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
  EXPRESSION_CLOSE = EXPRESSION_END.concat("ELSE", "WHEN", "BY", "TO", "CATCH", "FINALLY", "CASE", "DEFAULT");
  IMPLICIT_FUNC = ["IDENTIFIER", "THISPROP", "SUPER", "THIS", ")", "CALL_END", "]", "INDEX_END"];
}).call(this);
