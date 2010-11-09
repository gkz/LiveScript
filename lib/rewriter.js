(function(){
  var BALANCED_PAIRS, EXPRESSION_CLOSE, EXPRESSION_END, EXPRESSION_START, IMPLICIT_BLOCK, IMPLICIT_CALL, IMPLICIT_END, IMPLICIT_FUNC, INVERSES, LINEBREAKS, left, rite, _i, _len, _ref, __indexOf = Array.prototype.indexOf || function(item){
    for (var i = 0, l = this.length; i < l; ++i)
      if (this[i] === item) return i;
    return -1;
  }, __slice = Array.prototype.slice;
  exports.Rewriter = (function(){
    function Rewriter(){
      return this;
    }
    return Rewriter;
  }());
  exports.Rewriter.prototype.rewrite = function(_arg){
    this.tokens = _arg;
    this.removeLeadingNewlines();
    this.removeMidExpressionNewlines();
    this.closeOpenings();
    this.addImplicitIndentation();
    this.tagPostfixConditionals();
    this.addImplicitBraces();
    this.addImplicitParentheses();
    this.ensureBalance();
    this.rewriteClosingParens();
    return this.tokens;
  };
  exports.Rewriter.prototype.scanTokens = function(block){
    var i, token, tokens;
    tokens = this.tokens;
    i = 0;
    while (token = tokens[i]) {
      i += block.call(this, token, i, tokens);
    }
    return this;
  };
  exports.Rewriter.prototype.detectEnd = function(i, condition, action){
    var levels, token, tokens, _ref;
    tokens = this.tokens;
    levels = 0;
    while (token = tokens[i]) {
      if (levels === 0 && condition.call(this, token, i)) {
        return action.call(this, token, i);
      }
      if (levels < 0) {
        return action.call(this, token, i - 1);
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
  exports.Rewriter.prototype.removeLeadingNewlines = function(){
    var i, tag, _len;
    for (i = 0, _len = this.tokens.length; i < _len; ++i) {
      tag = this.tokens[i][0];
      if (tag !== 'TERMINATOR') {
        break;
      }
    }
    if (i) {
      return this.tokens.splice(0, i);
    }
  };
  exports.Rewriter.prototype.removeMidExpressionNewlines = function(){
    var i, token, tokens, _ref;
    tokens = this.tokens;
    i = 0;
    while (token = tokens[++i]) {
      if (tokens[i - 1][0] === 'TERMINATOR' && (_ref = token[0], __indexOf.call(EXPRESSION_CLOSE, _ref) >= 0)) {
        tokens.splice(i - 1, 1);
      }
    }
    return this;
  };
  exports.Rewriter.prototype.closeOpenings = function(){
    var stack, token, _i, _len, _ref;
    stack = [];
    for (_i = 0, _len = (_ref = this.tokens).length; _i < _len; ++_i) {
      token = _ref[_i];
      switch (token[0]) {
      case 'CALL_START':
      case 'INDEX_START':
      case '(':
      case '[':
        stack.push(token[0]);
        break;
      case 'CALL_END':
      case 'INDEX_END':
      case ')':
      case ']':
        switch (stack.pop()) {
        case 'CALL_START':
          token[0] = 'CALL_END';
          break;
        case 'INDEX_START':
          token[0] = 'INDEX_END';
        }
      }
    }
    return this;
  };
  exports.Rewriter.prototype.addImplicitBraces = function(){
    var action, condition, stack, start;
    stack = [];
    start = null;
    condition = function(token, i){
      var one, tag, _ref;
      one = this.tag(i + 1);
      if ('HERECOMMENT' === one || 'HERECOMMENT' === this.tag(i - 1)) {
        return false;
      }
      tag = token[0];
      return tag === ',' && (one !== "IDENTIFIER" && one !== "STRNUM" && one !== "THISPROP" && one !== "TERMINATOR" && one !== "OUTDENT" && one !== "(") || (tag === "TERMINATOR" || tag === "OUTDENT") && ((_ref = this.tag(i + 2)) !== ":" && _ref !== "...");
    };
    action = function(token, i){
      return this.tokens.splice(i, 0, ['}', '}', token[2]]);
    };
    return this.scanTokens(function(token, i, tokens){
      var idx, paren, tag, tok, _ref;
      if (_ref = (tag = token[0]), __indexOf.call(EXPRESSION_START, _ref) >= 0) {
        stack.push([(tag === 'INDENT' && this.tag(i - 1) === '{' ? '{' : tag), i]);
        return 1;
      }
      if (__indexOf.call(EXPRESSION_END, tag) >= 0) {
        start = stack.pop();
        return 1;
      }
      if (!(tag === ':' && (this.tag(i - 2) === ':' || (paren = this.tag(i - 1) === ')') && this.tag(start[1] - 1) === ':' || ((_ref = stack[stack.length - 1]) != null ? _ref[0] : void 0) !== '{'))) {
        return 1;
      }
      stack.push(['{']);
      idx = paren ? start[1] : i - 1;
      if (this.tag(idx - 2) === 'HERECOMMENT') {
        idx -= 2;
      }
      tok = ['{', '{', token[2]];
      tok.generated = true;
      tokens.splice(idx, 0, tok);
      this.detectEnd(i + 2, condition, action);
      return 2;
    });
  };
  exports.Rewriter.prototype.addImplicitParentheses = function(){
    var action, classLine;
    classLine = false;
    action = function(token, i){
      var idx;
      idx = token[0] === 'OUTDENT' ? i + 1 : i;
      return this.tokens.splice(idx, 0, ['CALL_END', ')', token[2]]);
    };
    return this.scanTokens(function(token, i, tokens){
      var callObject, next, prev, seenSingle, tag, _ref;
      prev = tokens[i - 1], next = tokens[i + 1];
      tag = token[0];
      if (tag === 'CLASS') {
        classLine = true;
      }
      callObject = !classLine && tag === 'INDENT' && next && next.generated && next[0] === '{' && prev && (_ref = prev[0], __indexOf.call(IMPLICIT_FUNC, _ref) >= 0);
      seenSingle = false;
      if (__indexOf.call(LINEBREAKS, tag) >= 0) {
        classLine = false;
      }
      if (tag === '?' && prev && !prev.spaced) {
        token.call = true;
      }
      if (!(callObject || (prev != null ? prev.spaced : void 0) && (prev.call || (_ref = prev[0], __indexOf.call(IMPLICIT_FUNC, _ref) >= 0)) && (__indexOf.call(IMPLICIT_CALL, tag) >= 0 || tag === 'PLUS_MINUS' && !(token.spaced || token.eol)))) {
        return 1;
      }
      tokens.splice(i, 0, ['CALL_START', '(', token[2]]);
      this.detectEnd(i + (callObject ? 2 : 1), function(token, i){
        var post, tag, _ref;
        if (!seenSingle && token.fromThen) {
          return true;
        }
        tag = token[0];
        if (tag === "IF" || tag === "ELSE" || tag === "FUNCTION") {
          seenSingle = true;
        }
        if (tag === 'ACCESS' && this.tag(i - 1) === 'OUTDENT') {
          return true;
        }
        return !token.generated && this.tag(i - 1) !== ',' && __indexOf.call(IMPLICIT_END, tag) >= 0 && (tag !== 'INDENT' || (this.tag(i - 2) !== 'CLASS' && (_ref = this.tag(i - 1), __indexOf.call(IMPLICIT_BLOCK, _ref) < 0) && !((post = this.tokens[i + 1]) && post.generated && post[0] === '{')));
      }, action);
      if (prev[0] === '?') {
        prev[0] = 'FUNC_EXIST';
      }
      return 2;
    });
  };
  exports.Rewriter.prototype.addImplicitIndentation = function(){
    var i, indent, next, outdent, tag, token, tokens, _ref, _ref2;
    tokens = this.tokens;
    i = -1;
    while (token = tokens[++i]) {
      tag = token[0];
      if (tag === 'ELSE' && ((_ref = tokens[i - 1]) != null ? _ref[0] : void 0) !== 'OUTDENT') {
        tokens.splice.apply(tokens, [i, 0].concat(__slice.call(this.indentation(token))));
        i += 1;
        continue;
      }
      if (tag === 'CATCH' && ((_ref = (_ref2 = tokens[i + 2]) != null ? _ref2[0] : void 0) === "OUTDENT" || _ref === "TERMINATOR" || _ref === "FINALLY")) {
        tokens.splice.apply(tokens, [i + 2, 0].concat(__slice.call(this.indentation(token))));
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
      if (!((tag === "FUNCTION" || tag === "THEN" || tag === "DEFAULT" || tag === "TRY" || tag === "FINALLY") || tag === 'ELSE' && next !== 'IF')) {
        continue;
      }
      _ref = this.indentation(token), indent = _ref[0], outdent = _ref[1];
      if (tag === 'THEN') {
        indent.fromThen = true;
      }
      indent.generated = outdent.generated = true;
      tokens.splice(i + 1, 0, indent);
      this.detectEnd(i + 2, function(token, i){
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
  exports.Rewriter.prototype.tagPostfixConditionals = function(){
    var action, condition, i, token, _len, _ref;
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
    for (i = 0, _len = (_ref = this.tokens).length; i < _len; ++i) {
      token = _ref[i];
      if (token[0] === 'IF') {
        this.detectEnd(i + 1, condition, action);
      }
    }
    return this;
  };
  exports.Rewriter.prototype.ensureBalance = function(){
    var close, level, levels, olines, open, tag, token, _i, _j, _len, _len2, _ref, _ref2;
    levels = {};
    olines = {};
    for (_i = 0, _len = (_ref = this.tokens).length; _i < _len; ++_i) {
      token = _ref[_i];
      tag = token[0];
      for (_j = 0, _len2 = BALANCED_PAIRS.length; _j < _len2; ++_j) {
        _ref2 = BALANCED_PAIRS[_j], open = _ref2[0], close = _ref2[1];
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
    return this;
  };
  exports.Rewriter.prototype.rewriteClosingParens = function(){
    var debt, key, stack;
    stack = [];
    debt = {};
    for (key in INVERSES) {
      debt[key] = 0;
    }
    return this.scanTokens(function(token, i, tokens){
      var inv, match, mtag, oppos, tag, val, _ref;
      if (_ref = (tag = token[0]), __indexOf.call(EXPRESSION_START, _ref) >= 0) {
        stack.push(token);
        return 1;
      }
      if (__indexOf.call(EXPRESSION_END, tag) < 0) {
        return 1;
      }
      if (debt[inv = INVERSES[tag]] > 0) {
        debt[inv] -= 1;
        tokens.splice(i, 1);
        return 0;
      }
      match = stack.pop();
      mtag = match[0];
      oppos = INVERSES[mtag];
      if (tag === oppos) {
        return 1;
      }
      debt[mtag] += 1;
      val = [oppos, mtag === 'INDENT' ? match[1] : oppos];
      if (this.tag(i + 2) === mtag) {
        tokens.splice(i + 3, 0, val);
        stack.push(match);
      } else {
        tokens.splice(i, 0, val);
      }
      return 1;
    });
  };
  exports.Rewriter.prototype.indentation = function(token){
    return [['INDENT', 2, token[2]], ['OUTDENT', 2, token[2]]];
  };
  exports.Rewriter.prototype.tag = function(i){
    var _ref;
    return (_ref = this.tokens[i]) != null ? _ref[0] : void 0;
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
  IMPLICIT_CALL = ["IDENTIFIER", "THISPROP", "STRNUM", "LITERAL", "THIS", "UNARY", "CREMENT", "PARAM_START", "FUNCTION", "IF", "TRY", "SWITCH", "CLASS", "[", "(", "{"];
  IMPLICIT_BLOCK = ["FUNCTION", "{", "[", ","];
  IMPLICIT_END = ["POST_IF", "FOR", "WHILE", "WHEN", "BY", "TO", "CASE", "DEFAULT", "LOOP", "TERMINATOR", "INDENT"];
  LINEBREAKS = ["TERMINATOR", "INDENT", "OUTDENT"];
}).call(this);
