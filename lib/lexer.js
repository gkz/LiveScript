(function(){
  var ASSIGNED, CALLABLE, CODE, COFFEE_ALIASES, COFFEE_KEYWORDS, COMMENT, HEREDOC, HEREDOC_INDENT, HEREGEX, HEREGEX_OMIT, IDENTIFIER, INDEXABLE, JSTOKEN, JS_FORBIDDEN, JS_KEYWORDS, LEADING_SPACES, LINE_CONTINUER, Lexer, MULTILINER, MULTI_DENT, NO_NEWLINE, NUMBER, OPERATOR, REGEX, RESERVED, Rewriter, SIMPLESTR, TRAILING_SPACES, WHITESPACE, WORDS, count, last, op, _ref, __indexOf = Array.prototype.indexOf || function(item){
    for (var i = 0, l = this.length; i < l; ++i)
      if (this[i] === item) return i;
    return -1;
  };
  Rewriter = require('./rewriter').Rewriter;
  _ref = require('./helpers'), count = _ref.count, last = _ref.last;
  exports.Lexer = (function(){
    Lexer = (function(){
      function Lexer(){
        return this;
      }
      return Lexer;
    })();
    Lexer.prototype.tokenize = function(code, o){
      var i;
      o == null && (o = {});
      code = code.replace(/\r/g, '').replace(TRAILING_SPACES, '');
      this.code = code;
      this.line = o.line || 0;
      this.indent = 0;
      this.indebt = 0;
      this.outdebt = 0;
      this.indents = [];
      this.tokens = [];
      this.seenFor = this.seenFrom = false;
      i = 0;
      while (this.chunk = code.slice(i)) {
        i += this.identifierToken() || this.commentToken() || this.whitespaceToken() || this.lineToken() || this.heredocToken() || this.stringToken() || this.numberToken() || this.regexToken() || this.wordsToken() || this.jsToken() || this.literalToken();
      }
      this.closeIndentation();
      return o.rewrite === false ? this.tokens : new Rewriter().rewrite(this.tokens);
    };
    Lexer.prototype.identifierToken = function(){
      var at, colon, forcedIdentifier, id, input, match, prev, tag, _ref;
      if (!(match = IDENTIFIER.exec(this.chunk))) {
        return 0;
      }
      input = match[0], id = match[1], colon = match[2];
      if (id === 'all' && ((_ref = this.tag()) === "FOR" || _ref === "IMPORT")) {
        this.token('ALL', id);
        return id.length;
      }
      if (id === 'from' && this.tag(1) === 'FOR') {
        this.seenFor = false;
        this.seenFrom = true;
        this.token('FROM', id);
        return id.length;
      }
      if (this.seenFrom && (id === "to" || id === "til")) {
        this.seenFrom = false;
        this.token('TO', id);
        return id.length;
      }
      if (at = id.charAt(0) === '@') {
        id = id.slice(1);
        tag = 'THISPROP';
      } else {
        tag = 'IDENTIFIER';
      }
      forcedIdentifier = at || colon || ((prev = last(this.tokens)) ? prev[1].colon2 ? this.token('ACCESS', '.') : prev[0] === 'ACCESS' : void 0);
      if (__indexOf.call(JS_FORBIDDEN, id) >= 0) {
        if (forcedIdentifier) {
          id = new String(id);
          id.reserved = true;
        } else if (__indexOf.call(RESERVED, id) >= 0) {
          throw SyntaxError("Reserved word \"" + id + "\" on line " + (this.line + 1));
        }
      }
      if (!id.reserved && __indexOf.call(JS_KEYWORDS, id) >= 0 || !forcedIdentifier && __indexOf.call(COFFEE_KEYWORDS, id) >= 0) {
        tag = id.toUpperCase();
        if (tag === 'FOR') {
          this.seenFor = true;
        } else if (tag === 'UNLESS') {
          tag = 'IF';
        } else if (tag === 'UNTIL') {
          tag = 'WHILE';
        } else if (tag === "NEW" || tag === "DO" || tag === "TYPEOF" || tag === "DELETE") {
          tag = 'UNARY';
        } else if (tag === "IN" || tag === "OF" || tag === "INSTANCEOF") {
          if (tag !== 'INSTANCEOF' && this.seenFor) {
            tag = 'FOR' + tag;
            this.seenFor = false;
          } else {
            tag = 'RELATION';
            if (this.value() === '!') {
              this.tokens.pop();
              id = '!' + id;
            }
          }
        }
      }
      if (!forcedIdentifier) {
        if (COFFEE_ALIASES.hasOwnProperty(id)) {
          id = COFFEE_ALIASES[id];
        }
        tag = id === '!' ? 'UNARY' : id === "===" || id === "!==" ? 'COMPARE' : id === "&&" || id === "||" ? 'LOGIC' : id === "true" || id === "false" || id === "null" || id === "void" ? 'LITERAL' : tag;
      }
      this.token(tag, id);
      if (colon) {
        this.token(':', ':');
      }
      return input.length;
    };
    Lexer.prototype.numberToken = function(){
      var match;
      if (!(match = NUMBER.exec(this.chunk))) {
        return 0;
      }
      this.token('STRNUM', match[0]);
      return match[0].length;
    };
    Lexer.prototype.stringToken = function(){
      var match, string;
      switch (this.chunk.charAt(0)) {
      case "'":
        if (!(match = SIMPLESTR.exec(this.chunk))) {
          return 0;
        }
        this.token('STRNUM', (string = match[0]).replace(MULTILINER, '\\\n'));
        break;
      case '"':
        if (!(string = this.balancedString(this.chunk, [["\"", "\""], ["#{", "}"]]))) {
          return 0;
        }
        if (0 < string.indexOf('#{', 1)) {
          this.interpolateString(string.slice(1, -1));
        } else {
          this.token('STRNUM', this.escapeLines(string));
        }
        break;
      default:
        return 0;
      }
      this.line += count(string, '\n');
      return string.length;
    };
    Lexer.prototype.heredocToken = function(){
      var doc, heredoc, match, quote;
      if (!(match = HEREDOC.exec(this.chunk))) {
        return 0;
      }
      heredoc = match[0];
      quote = heredoc.charAt(0);
      doc = this.sanitizeHeredoc(match[2], {
        quote: quote,
        indent: null
      });
      if (quote === '"' && 0 <= doc.indexOf('#{')) {
        this.interpolateString(doc, {
          heredoc: true
        });
      } else {
        this.token('STRNUM', this.makeString(doc, quote, true));
      }
      this.line += count(heredoc, '\n');
      return heredoc.length;
    };
    Lexer.prototype.commentToken = function(){
      var comment, here, match;
      if (!(match = this.chunk.match(COMMENT))) {
        return 0;
      }
      comment = match[0], here = match[1];
      this.line += count(comment, '\n');
      if (here) {
        this.token('HERECOMMENT', this.sanitizeHeredoc(here, {
          herecomment: true,
          indent: Array(this.indent + 1).join(' ')
        }));
        this.token('TERMINATOR', '\n');
      }
      return comment.length;
    };
    Lexer.prototype.jsToken = function(){
      var match;
      if (!(this.chunk.charAt(0) === '`' && (match = JSTOKEN.exec(this.chunk)))) {
        return 0;
      }
      this.token('LITERAL', match[0].slice(1, -1));
      return match[0].length;
    };
    Lexer.prototype.regexToken = function(){
      var match, regex, _ref;
      if (this.chunk.charAt(0) !== '/') {
        return 0;
      }
      if (match = HEREGEX.exec(this.chunk)) {
        return this.heregexToken(match);
      }
      if (((_ref = this.tag()) === "STRNUM" || _ref === "LITERAL" || _ref === "++" || _ref === "--") || !(match = REGEX.exec(this.chunk))) {
        return 0;
      }
      regex = match[0];
      this.token('LITERAL', regex === '//' ? '/(?:)/' : regex);
      return regex.length;
    };
    Lexer.prototype.heregexToken = function(match){
      var body, flags, heregex, tag, tokens, value, _i, _len, _ref, _ref2, _this;
      heregex = match[0], body = match[1], flags = match[2];
      if (0 > body.indexOf('#{')) {
        body = body.replace(HEREGEX_OMIT, '').replace(/\//g, '\\/');
        this.token('LITERAL', "/" + (body || '(?:)') + "/" + flags);
        return heregex.length;
      }
      this.token('IDENTIFIER', 'RegExp');
      this.tokens.push(["CALL_START", "("]);
      tokens = [];
      for (_i = 0, _len = this.interpolateString(body, {
        regex: true
      }).length; _i < _len; ++_i) {
        _ref = this.interpolateString(body, {
        regex: true
      })[_i], tag = _ref[0], value = _ref[1];
        if (tag === 'TOKENS') {
          tokens.push.apply(tokens, value);
        } else {
          if (!(value = value.replace(HEREGEX_OMIT, ''))) {
            continue;
          }
          value = value.replace(/\\/g, '\\\\');
          tokens.push(['STRNUM', this.makeString(value, '"', true)]);
        }
        tokens.push(["+", "+"]);
      }
      tokens.pop();
      if (((_ref2 = tokens[0]) != null ? _ref2[0] : void 0) !== 'STRNUM') {
        this.tokens.push(["STRNUM", "\"\""], ["+", "+"]);
      }
      (_this = this.tokens).push.apply(_this, tokens);
      if (flags) {
        this.tokens.push([",", ","], ['STRNUM', '"' + flags + '"']);
      }
      this.token(')', ')');
      return heregex.length;
    };
    Lexer.prototype.wordsToken = function(){
      var match, word, words, _i, _len, _ref;
      if (!(match = WORDS.exec(this.chunk))) {
        return 0;
      }
      words = match[0];
      this.token('[', '[');
      _ref = words.slice(2, -2).match(/\S+/g) || [''];
      for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
        word = _ref[_i];
        this.tokens.push(['STRNUM', this.makeString(word, '"')], [",", ","]);
      }
      this.token(']', ']');
      this.line += count(words, '\n');
      return words.length;
    };
    Lexer.prototype.lineToken = function(){
      var diff, indent, match, noNewlines, prev, size;
      if (!(match = MULTI_DENT.exec(this.chunk))) {
        return 0;
      }
      indent = match[0];
      this.line += count(indent, '\n');
      prev = last(this.tokens, 1);
      size = indent.length - 1 - indent.lastIndexOf('\n');
      noNewlines = this.unfinished();
      if (size - this.indebt === this.indent) {
        if (noNewlines) {
          this.suppressNewlines();
        } else {
          this.newlineToken();
        }
        return indent.length;
      }
      if (size > this.indent) {
        if (noNewlines) {
          this.indebt = size - this.indent;
          this.suppressNewlines();
          return indent.length;
        }
        diff = size - this.indent + this.outdebt;
        this.token('INDENT', diff);
        this.indents.push(diff);
        this.outdebt = this.indebt = 0;
      } else {
        this.indebt = 0;
        this.outdentToken(this.indent - size, noNewlines);
      }
      this.indent = size;
      return indent.length;
    };
    Lexer.prototype.outdentToken = function(moveOut, noNewlines, close){
      var dent, idt, len;
      while (moveOut > 0) {
        if ((len = this.indents.length - 1) < 0) {
          moveOut = 0;
        } else if ((idt = this.indents[len]) === this.outdebt) {
          moveOut -= idt;
          this.outdebt = 0;
        } else if (idt < this.outdebt) {
          moveOut -= idt;
          this.outdebt -= idt;
        } else {
          moveOut -= dent = this.indents.pop() - this.outdebt;
          this.outdebt = 0;
          this.token('OUTDENT', dent);
        }
      }
      if (dent) {
        this.outdebt -= moveOut;
      }
      if (!(noNewlines || this.tag() === 'TERMINATOR')) {
        this.token('TERMINATOR', '\n');
      }
      return this;
    };
    Lexer.prototype.whitespaceToken = function(){
      var match, nline, prev;
      if (!((match = WHITESPACE.exec(this.chunk)) || (nline = this.chunk.charAt(0) === '\n'))) {
        return 0;
      }
      prev = last(this.tokens);
      if (prev) {
        prev[match ? 'spaced' : 'newLine'] = true;
      }
      return match ? match[0].length : 0;
    };
    Lexer.prototype.newlineToken = function(){
      if (this.tag() !== 'TERMINATOR') {
        this.token('TERMINATOR', '\n');
      }
      return this;
    };
    Lexer.prototype.suppressNewlines = function(){
      if (this.value() === '\\') {
        this.tokens.pop();
      }
      return this;
    };
    Lexer.prototype.literalToken = function(){
      var id, match, pid, prev, tag, value, _ref, _ref2;
      if (match = OPERATOR.exec(this.chunk)) {
        value = match[0];
        if (CODE.test(value)) {
          this.tagParameters();
        }
      } else {
        value = this.chunk.charAt(0);
      }
      tag = value;
      prev = last(this.tokens);
      if (prev && value === '=') {
        pid = prev[1];
        if (!pid.reserved && __indexOf.call(JS_FORBIDDEN, pid) >= 0) {
          throw SyntaxError("Reserved word \"" + pid + "\" on line " + (this.line + 1) + " cannot be assigned");
        }
        if (pid === "||" || pid === "&&") {
          prev[0] = 'COMPOUND_ASSIGN';
          prev[1] += '=';
          return value.length;
        }
      }
      if (value === "!" || value === "~") {
        tag = 'UNARY';
      } else if (value === "." || value === "?." || value === ".=") {
        tag = 'ACCESS';
      } else if (value === "*" || value === "/" || value === "%") {
        tag = 'MATH';
      } else if (value === "===" || value === "!==" || value === "<=" || value === "<" || value === ">" || value === ">=" || value === "==" || value === "!=") {
        tag = 'COMPARE';
      } else if ((value === "&&" || value === "||" || value === "&" || value === "|" || value === "^") || value === '?' && (prev != null ? prev.spaced : void 0)) {
        tag = 'LOGIC';
      } else if (value === "<<" || value === ">>" || value === ">>>") {
        tag = 'SHIFT';
      } else if (value === "-=" || value === "+=" || value === "||=" || value === "&&=" || value === "?=" || value === "/=" || value === "*=" || value === "%=" || value === "<<=" || value === ">>=" || value === ">>>=" || value === "&=" || value === "^=" || value === "|=") {
        tag = 'COMPOUND_ASSIGN';
      } else if (value === "?[" || value === "[=") {
        tag = 'INDEX_START';
      } else if (value === ';') {
        tag = 'TERMINATOR';
      } else if (value === '@') {
        tag = 'THIS';
      } else if (value.charAt(0) === '@') {
        this.tokens.push(['IDENTIFIER', 'arguments', this.line], ["INDEX_START", "["], ['STRNUM', value.slice(1)], ["INDEX_END", "]"]);
        return value.length;
      } else if (value === '::') {
        id = new String('prototype');
        id.colon2 = true;
        this.tokens.push(["ACCESS", "."], ['IDENTIFIER', id, this.line]);
        return value.length;
      } else if (prev && !prev.spaced) {
        if (value === '(' && (_ref = prev[0], __indexOf.call(CALLABLE, _ref) >= 0)) {
          if (prev[0] === '?') {
            prev[0] = 'FUNC_EXIST';
          }
          tag = 'CALL_START';
        } else if (value === '[' && (_ref2 = prev[0], __indexOf.call(INDEXABLE, _ref2) >= 0)) {
          tag = 'INDEX_START';
        }
      }
      this.token(tag, value);
      return value.length;
    };
    Lexer.prototype.sanitizeHeredoc = function(doc, options){
      var attempt, herecomment, indent, match, _ref;
      indent = options.indent, herecomment = options.herecomment;
      if (herecomment && 0 > doc.indexOf('\n')) {
        return doc;
      }
      if (!herecomment) {
        while (match = HEREDOC_INDENT.exec(doc)) {
          attempt = match[1];
          if (indent === null || (0 < (_ref = attempt.length) && _ref < indent.length)) {
            indent = attempt;
          }
        }
      }
      if (indent) {
        doc = doc.replace(RegExp("\\n" + indent, "g"), '\n');
      }
      if (!herecomment) {
        doc = doc.replace(/^\n/, '');
      }
      return doc;
    };
    Lexer.prototype.tagParameters = function(){
      var i, level, tok, tokens;
      if (this.tag() !== ')') {
        return this;
      }
      tokens = this.tokens;
      level = 0;
      i = tokens.length;
      tokens[--i][0] = 'PARAM_END';
      while (tok = tokens[--i]) {
        switch (tok[0]) {
        case ')':
          ++level;
          break;
        case '(':
        case 'CALL_START':
          if (level--) {
            break;
          }
          tok[0] = 'PARAM_START';
          return this;
        }
      }
      return this;
    };
    Lexer.prototype.closeIndentation = function(){
      return this.outdentToken(this.indent);
    };
    Lexer.prototype.balancedString = function(str, delimited, options){
      var close, i, levels, open, pair, slen, _i, _len;
      options == null && (options = {});
      levels = [];
      i = 0;
      slen = str.length;
      while (i < slen) {
        if (levels.length && str.charAt(i) === '\\') {
          i += 2;
          continue;
        }
        for (_i = 0, _len = delimited.length; _i < _len; ++_i) {
          pair = delimited[_i];
          open = pair[0], close = pair[1];
          if (levels.length && last(levels) === pair && close === str.substr(i, close.length)) {
            levels.pop();
            i += close.length - 1;
            if (!levels.length) {
              i += 1;
            }
            break;
          }
          if (open === str.substr(i, open.length)) {
            levels.push(pair);
            i += open.length - 1;
            break;
          }
        }
        if (!levels.length) {
          break;
        }
        i += 1;
      }
      if (levels.length) {
        throw SyntaxError("Unterminated " + levels.pop()[0] + " starting on line " + (this.line + 1));
      }
      return i && str.slice(0, i);
    };
    Lexer.prototype.interpolateString = function(str, options){
      var expr, heredoc, i, inner, interpolated, letter, nested, pi, regex, tag, tokens, value, _len, _ref, _this;
      options == null && (options = {});
      heredoc = options.heredoc, regex = options.regex;
      tokens = [];
      pi = 0;
      i = -1;
      while (letter = str.charAt(i += 1)) {
        if (letter === '\\') {
          i += 1;
          continue;
        }
        if (!(letter === '#' && str.charAt(i + 1) === '{' && (expr = this.balancedString(str.slice(i + 1), [["{", "}"]])))) {
          continue;
        }
        if (pi < i) {
          tokens.push(['TO_BE_STRING', str.slice(pi, i)]);
        }
        inner = expr.slice(1, -1).replace(LEADING_SPACES, '').replace(TRAILING_SPACES, '');
        if (inner.length) {
          nested = new Lexer().tokenize(inner, {
            line: this.line,
            rewrite: false
          });
          nested.pop();
          if (nested.length > 1) {
            nested.unshift(["(", "("]);
            nested.push([")", ")"]);
          }
          tokens.push(['TOKENS', nested]);
        }
        i += expr.length;
        pi = i + 1;
      }
      if (i > pi && pi < str.length) {
        tokens.push(['TO_BE_STRING', str.slice(pi)]);
      }
      if (regex) {
        return tokens;
      }
      if (!tokens.length) {
        return this.token('STRNUM', '""');
      }
      if (tokens[0][0] !== 'TO_BE_STRING') {
        tokens.unshift(['', '']);
      }
      if (interpolated = tokens.length > 1) {
        this.token('(', '(');
      }
      for (i = 0, _len = tokens.length; i < _len; ++i) {
        _ref = tokens[i], tag = _ref[0], value = _ref[1];
        if (i) {
          this.token('+', '+');
        }
        if (tag === 'TOKENS') {
          (_this = this.tokens).push.apply(_this, value);
        } else {
          this.token('STRNUM', this.makeString(value, '"', heredoc));
        }
      }
      if (interpolated) {
        this.token(')', ')');
      }
      return tokens;
    };
    Lexer.prototype.token = function(tag, value){
      return this.tokens.push([tag, value, this.line]);
    };
    Lexer.prototype.tag = function(index, tag){
      var tok;
      return (tok = last(this.tokens, index)) && (tag != null ? tok[0] = tag : tok[0]);
    };
    Lexer.prototype.value = function(index, val){
      var tok;
      return (tok = last(this.tokens, index)) && (val != null ? tok[1] = val : tok[1]);
    };
    Lexer.prototype.unfinished = function(){
      var prev, value;
      return LINE_CONTINUER.test(this.chunk) || (prev = last(this.tokens, 1)) && prev[0] !== 'ACCESS' && (value = this.value()) && !value.reserved && NO_NEWLINE.test(value) && !CODE.test(value) && !ASSIGNED.test(this.chunk);
    };
    Lexer.prototype.escapeLines = function(str, heredoc){
      return str.replace(MULTILINER, heredoc ? '\\n' : '');
    };
    Lexer.prototype.makeString = function(body, quote, heredoc){
      if (!body) {
        return quote + quote;
      }
      body = body.replace(/\\([\s\S])/g, function(match, escaped){
        return escaped === '\n' || escaped === quote ? escaped : match;
      });
      body = body.replace(RegExp("" + quote, "g"), '\\$&');
      return quote + this.escapeLines(body, heredoc) + quote;
    };
    return Lexer;
  }());
  JS_KEYWORDS = ["true", "false", "null", "this", "void", "super", "new", "do", "delete", "typeof", "in", "instanceof", "import", "return", "throw", "break", "continue", "debugger", "if", "else", "switch", "case", "default", "for", "while", "try", "catch", "finally", "class", "extends"];
  COFFEE_KEYWORDS = ["then", "unless", "until", "loop", "of", "by", "when"];
  for (op in COFFEE_ALIASES = {
    and: '&&',
    or: '||',
    is: '===',
    isnt: '!==',
    not: '!'
  }) {
    COFFEE_KEYWORDS.push(op);
  }
  RESERVED = ["function", "var", "with", "const", "let", "enum", "export", "native"];
  JS_FORBIDDEN = JS_KEYWORDS.concat(RESERVED);
  IDENTIFIER = /^(@?[$A-Za-z_][$\w]*)([^\n\S]*:(?!:))?/;
  NUMBER = /^0x[\da-f]+|^(?:\d+(\.\d+)?|\.\d+)(?:e[+-]?\d+)?/i;
  HEREDOC = /^("""|''')([\s\S]*?)(?:\n[ \t]*)?\1/;
  OPERATOR = /^(?:[-=]>|[!=]==|[-+*\/%&|^?.[<>=!]=|>>>=?|([-+:])\1|([&|<>])\2=?|\?[.[]|\.{3}|@\d+)/;
  WHITESPACE = /^[ \t]+/;
  COMMENT = /^###([^#][\s\S]*?)(?:###[ \t]*\n|(?:###)?$)|^(?:\s*#(?!##[^#]).*)+/;
  CODE = /^[-=]>/;
  MULTI_DENT = /^(?:\n[ \t]*)+/;
  SIMPLESTR = /^'[^\\']*(?:\\.[^\\']*)*'/;
  JSTOKEN = /^`[^\\`]*(?:\\.[^\\`]*)*`/;
  WORDS = /^<\[[\s\S]*?]>/;
  REGEX = /^\/(?!\s)[^[\/\n\\]*(?:(?:\\[\s\S]|\[[^\]\n\\]*(?:\\[\s\S][^\]\n\\]*)*])[^[\/\n\\]*)*\/[imgy]{0,4}(?![A-Za-z])/;
  HEREGEX = /^\/{3}([\s\S]+?)\/{3}([imgy]{0,4})(?![A-Za-z])/;
  HEREGEX_OMIT = /\s+(?:#.*)?/g;
  MULTILINER = /\n/g;
  HEREDOC_INDENT = /\n+([ \t]*)/g;
  ASSIGNED = /^\s*@?[$A-Za-z_][$\w]*[ \t]*?[:=][^:=>]/;
  LINE_CONTINUER = /^\s*(?:,|\??\.(?!\.)|::)/;
  LEADING_SPACES = /^\s+/;
  TRAILING_SPACES = /\s+$/;
  NO_NEWLINE = /^(?:[-+*&|\/%=<>!.\\][<>=&|]*|and|or|is(?:nt)?|n(?:ot|ew)|delete|typeof|instanceof)$/;
  CALLABLE = ["IDENTIFIER", "THISPROP", ")", "]", "}", "?", "SUPER", "THIS"];
  INDEXABLE = CALLABLE.concat(["STRNUM", "LITERAL"]);
}).call(this);
