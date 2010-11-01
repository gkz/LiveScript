(function(){
  var BALANCED_PAIRS, EXPRESSION_CLOSE, EXPRESSION_END, EXPRESSION_START, IMPLICIT_BLOCK, IMPLICIT_CALL, IMPLICIT_END, IMPLICIT_FUNC, IMPLICIT_UNSPACED_CALL, INVERSES, LINEBREAKS, SINGLE_CLOSERS, SINGLE_LINERS, left, rite, _i, _len, _ref;
  var __indexOf = Array.prototype.indexOf || function(item){
    for (var i = 0, l = this.length; i < l; ++i)
      if (this[i] === item) return i;
    return -1;
  }, __slice = Array.prototype.slice;
  exports.Rewriter = (function(){
    function Rewriter(){
      return this;
    }
    return Rewriter;
  })();
  exports.Rewriter.prototype.rewrite = function(_arg){
    this.tokens = _arg;
    this.adjustComments();
    this.removeLeadingNewlines();
    this.removeMidExpressionNewlines();
    this.closeOpenCalls();
    this.closeOpenIndexes();
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
    var levels, token, tokens, _ref, _ref2;
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
      } else if (_ref2 = token[0], __indexOf.call(EXPRESSION_END, _ref2) >= 0) {
        --levels;
      }
      ++i;
    }
    return i - 1;
  };
  exports.Rewriter.prototype.adjustComments = function(){
    return this.scanTokens(function(token, i, tokens){
      var after, before, post, prev, _ref;
      if (token[0] !== 'HERECOMMENT') {
        return 1;
      }
      before = tokens[i - 2], prev = tokens[i - 1], post = tokens[i + 1], after = tokens[i + 2];
      if ((after != null ? after[0] : void 0) === 'INDENT') {
        tokens.splice(i + 2, 1);
        if ((before != null ? before[0] : void 0) === 'OUTDENT' && (post != null ? post[0] : void 0) === 'TERMINATOR') {
          tokens.splice(i - 2, 1);
        } else {
          tokens.splice(i, 0, after);
        }
      } else if (prev && ((_ref = prev[0]) !== "TERMINATOR" && _ref !== "INDENT" && _ref !== "OUTDENT")) {
        if ((post != null ? post[0] : void 0) === 'TERMINATOR' && (after != null ? after[0] : void 0) === 'OUTDENT') {
          tokens.splice.apply(tokens, [i + 2, 0].concat(__slice.call(tokens.splice(i, 2))));
          if (tokens[i + 2][0] !== 'TERMINATOR') {
            tokens.splice(i + 2, 0, ['TERMINATOR', '\n', prev[2]]);
          }
        } else {
          tokens.splice(i, 0, ['TERMINATOR', '\n', prev[2]]);
        }
        return 2;
      }
      return 1;
    });
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
    return this.scanTokens(function(token, i, tokens){
      var _ref;
      if (!(token[0] === 'TERMINATOR' && (_ref = this.tag(i + 1), __indexOf.call(EXPRESSION_CLOSE, _ref) >= 0))) {
        return 1;
      }
      tokens.splice(i, 1);
      return 0;
    });
  };
  exports.Rewriter.prototype.closeOpenCalls = function(){
    var action, condition;
    condition = function(token, i){
      var _ref;
      return ((_ref = token[0]) === ")" || _ref === "CALL_END") || token[0] === 'OUTDENT' && this.tag(i - 1) === ')';
    };
    action = function(token, i){
      return this.tokens[token[0] === 'OUTDENT' ? i - 1 : i][0] = 'CALL_END';
    };
    return this.scanTokens(function(token, i){
      if (token[0] === 'CALL_START') {
        this.detectEnd(i + 1, condition, action);
      }
      return 1;
    });
  };
  exports.Rewriter.prototype.closeOpenIndexes = function(){
    var action, condition;
    condition = function(token, i){
      var _ref;
      return (_ref = token[0]) === "]" || _ref === "INDEX_END";
    };
    action = function(token, i){
      return token[0] = 'INDEX_END';
    };
    return this.scanTokens(function(token, i){
      if (token[0] === 'INDEX_START') {
        this.detectEnd(i + 1, condition, action);
      }
      return 1;
    });
  };
  exports.Rewriter.prototype.addImplicitBraces = function(){
    var action, condition, stack, start;
    stack = [];
    start = null;
    condition = function(token, i){
      var one, tag, two, _ref, _ref2, _ref3;
      if ('HERECOMMENT' === this.tag(i + 1) || 'HERECOMMENT' === this.tag(i - 1)) {
        return false;
      }
      _ref = this.tokens, one = _ref[i + 1], two = _ref[i + 2];
      tag = token[0];
      return (tag === "TERMINATOR" || tag === "OUTDENT") && !((one != null ? one[0] : void 0) === '(' || ((_ref2 = two != null ? two[0] : void 0) === ":" || _ref2 === "...")) || tag === ',' && one && ((_ref3 = one[0]) !== "IDENTIFIER" && _ref3 !== "NUMBER" && _ref3 !== "STRING" && _ref3 !== "THISPROP" && _ref3 !== "TERMINATOR" && _ref3 !== "OUTDENT" && _ref3 !== "(");
    };
    action = function(token, i){
      return this.tokens.splice(i, 0, ['}', '}', token[2]]);
    };
    return this.scanTokens(function(token, i, tokens){
      var idx, paren, tag, tok, _ref, _ref2;
      if (_ref = (tag = token[0]), __indexOf.call(EXPRESSION_START, _ref) >= 0) {
        stack.push([(tag === 'INDENT' && this.tag(i - 1) === '{' ? '{' : tag), i]);
        return 1;
      }
      if (__indexOf.call(EXPRESSION_END, tag) >= 0) {
        start = stack.pop();
        return 1;
      }
      if (!(tag === ':' && (this.tag(i - 2) === ':' || (paren = this.tag(i - 1) === ')') && this.tag(start[1] - 1) === ':' || ((_ref2 = stack[stack.length - 1]) != null ? _ref2[0] : void 0) !== '{'))) {
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
      var callObject, next, prev, seenSingle, tag, _ref, _ref2;
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
      if (!(callObject || (prev != null ? prev.spaced : void 0) && (prev.call || (_ref2 = prev[0], __indexOf.call(IMPLICIT_FUNC, _ref2) >= 0)) && (__indexOf.call(IMPLICIT_CALL, tag) >= 0 || !(token.spaced || token.newLine) && __indexOf.call(IMPLICIT_UNSPACED_CALL, tag) >= 0))) {
        return 1;
      }
      tokens.splice(i, 0, ['CALL_START', '(', token[2]]);
      this.detectEnd(i + (callObject ? 2 : 1), function(token, i){
        var post, _ref3;
        if (!seenSingle && token.fromThen) {
          return true;
        }
        tag = token[0];
        if (tag === "IF" || tag === "ELSE" || tag === "->" || tag === "=>") {
          seenSingle = true;
        }
        if (tag === 'ACCESS' && this.tag(i - 1) === 'OUTDENT') {
          return true;
        }
        return !token.generated && this.tag(i - 1) !== ',' && __indexOf.call(IMPLICIT_END, tag) >= 0 && (tag !== 'INDENT' || (this.tag(i - 2) !== 'CLASS' && (_ref3 = this.tag(i - 1), __indexOf.call(IMPLICIT_BLOCK, _ref3) < 0) && !((post = this.tokens[i + 1]) && post.generated && post[0] === '{')));
      }, action);
      if (prev[0] === '?') {
        prev[0] = 'FUNC_EXIST';
      }
      return 2;
    });
  };
  exports.Rewriter.prototype.addImplicitIndentation = function(){
    return this.scanTokens(function(token, i, tokens){
      var action, condition, indent, outdent, starter, tag, _ref, _ref2;
      tag = token[0];
      if (tag === 'TERMINATOR' && this.tag(i + 1) === 'THEN') {
        tokens.splice(i, 1);
        return 0;
      }
      if (tag === 'ELSE' && this.tag(i - 1) !== 'OUTDENT') {
        tokens.splice.apply(tokens, [i, 0].concat(__slice.call(this.indentation(token))));
        return 2;
      }
      if (tag === 'CATCH' && ((_ref = this.tag(i + 2)) === "OUTDENT" || _ref === "TERMINATOR" || _ref === "FINALLY")) {
        tokens.splice.apply(tokens, [i + 2, 0].concat(__slice.call(this.indentation(token))));
        return 4;
      }
      if (__indexOf.call(SINGLE_LINERS, tag) >= 0 && this.tag(i + 1) !== 'INDENT' && !(tag === 'ELSE' && this.tag(i + 1) === 'IF')) {
        starter = tag;
        _ref2 = this.indentation(token), indent = _ref2[0], outdent = _ref2[1];
        if (starter === 'THEN') {
          indent.fromThen = true;
        }
        indent.generated = outdent.generated = true;
        tokens.splice(i + 1, 0, indent);
        condition = function(token, i){
          var _ref3;
          return token[1] !== ';' && (_ref3 = token[0], __indexOf.call(SINGLE_CLOSERS, _ref3) >= 0) && !(token[0] === 'ELSE' && (starter !== "IF" && starter !== "THEN"));
        };
        action = function(token, i){
          return this.tokens.splice((this.tag(i - 1) === ',' ? i - 1 : i), 0, outdent);
        };
        this.detectEnd(i + 2, condition, action);
        if (tag === 'THEN') {
          tokens.splice(i, 1);
        }
        return 1;
      }
      return 1;
    });
  };
  exports.Rewriter.prototype.tagPostfixConditionals = function(){
    var condition;
    condition = function(token, i){
      var _ref;
      return (_ref = token[0]) === "TERMINATOR" || _ref === "INDENT";
    };
    return this.scanTokens(function(token, i){
      var original;
      if (token[0] !== 'IF') {
        return 1;
      }
      original = token;
      this.detectEnd(i + 1, condition, function(token){
        if (token[0] !== 'INDENT') {
          return original[0] = 'POST_' + original[0];
        }
      });
      return 1;
    });
  };
  exports.Rewriter.prototype.ensureBalance = function(){
    var level, levels, olines, open, _result;
    levels = {};
    olines = {};
    this.scanTokens(function(token){
      var close, open, tag, _i, _len, _ref;
      tag = token[0];
      for (_i = 0, _len = BALANCED_PAIRS.length; _i < _len; ++_i) {
        _ref = BALANCED_PAIRS[_i], open = _ref[0], close = _ref[1];
        levels[open] |= 0;
        if (tag === open) {
          if (levels[open] === 0) {
            olines[open] = token[2];
          }
          levels[open] += 1;
        } else if (tag === close) {
          levels[open] -= 1;
        }
        if (levels[open] < 0) {
          throw SyntaxError("too many " + token[1] + " on line " + (token[2] + 1));
        }
      }
      return 1;
    });
    _result = [];
    for (open in levels) {
      level = levels[open];
      if (level > 0) {
        _result.push(function(){
          throw SyntaxError("unclosed " + open + " on line " + (olines[open] + 1));
        }());
      }
    }
    return _result;
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
  EXPRESSION_CLOSE = ["ELSE", "WHEN", "BY", "CATCH", "FINALLY", "CASE", "DEFAULT"].concat(EXPRESSION_END);
  IMPLICIT_FUNC = ["IDENTIFIER", "THISPROP", "SUPER", "THIS", ")", "CALL_END", "]", "INDEX_END"];
  IMPLICIT_CALL = ["IDENTIFIER", "THISPROP", "NUMBER", "STRING", "LITERAL", "THIS", "UNARY", "PARAM_START", "IF", "TRY", "SWITCH", "CLASS", "->", "=>", "[", "(", "{", "--", "++"];
  IMPLICIT_UNSPACED_CALL = ["+", "-"];
  IMPLICIT_BLOCK = ["->", "=>", "{", "[", ","];
  IMPLICIT_END = ["POST_IF", "FOR", "WHILE", "WHEN", "BY", "CASE", "DEFAULT", "LOOP", "TERMINATOR", "INDENT"];
  SINGLE_LINERS = ["->", "=>", "ELSE", "THEN", "DEFAULT", "TRY", "FINALLY"];
  SINGLE_CLOSERS = ["TERMINATOR", "CATCH", "FINALLY", "ELSE", "OUTDENT", "CASE", "DEFAULT"];
  LINEBREAKS = ["TERMINATOR", "INDENT", "OUTDENT"];
}).call(this);
