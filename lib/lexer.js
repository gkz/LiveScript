(function(){
  var CALLABLE, COFFEE_ALIASES, COFFEE_KEYWORDS, COMMENTS, HERECOMMENT, HEREDOC, HEREDOC_INDENT, HEREGEX, HEREGEX_OMIT, IDENTIFIER, INDEXABLE, JSTOKEN, JS_FORBIDDEN, JS_KEYWORDS, LEADING_SPACES, LINE_CONTINUER, Lexer, MULTIDENT, MULTILINER, NUMBER, REGEX, RESERVED, Rewriter, SIMPLESTR, SYMBOL, TRAILING_SPACES, WHITESPACE, WORDS, op, __indexOf = Array.prototype.indexOf || function(item){
    for (var i = 0, l = this.length; i < l; ++i) if (this[i] === item) return i;
    return -1;
  };
  Rewriter = require('./rewriter');
  exports.Lexer = Lexer = (function(){
    var _ref;
    function Lexer(){}
    Lexer.name = "Lexer";
    _ref = Lexer.prototype, _ref.tokenize = function(_arg, o){
      var code, comments, i, step;
      this.code = _arg;
      o == null && (o = {});
      this.line = o.line || 0;
      this.indent = 0;
      this.indebt = 0;
      this.outdebt = 0;
      this.indents = [];
      this.tokens = [['DUMMY', '', 0]];
      this.seenFor = this.seenFrom = false;
      code = this.code.replace(/\r/g, '').replace(TRAILING_SPACES, '');
      i = 0;
      while (this.chunk = code.slice(i)) {
        if (comments = COMMENTS.exec(this.chunk)) {
          if (!(this.chunk = code.slice(i += this.countLines(comments[0]).length))) {
            break;
          }
        }
        switch (code.charAt(i)) {
        case '\n':
          step = this.lineToken();
          break;
        case ' ':
        case '\t':
          step = this.whitespaceToken();
          break;
        case "'":
        case '"':
          step = this.heredocToken() || this.stringToken();
          break;
        case '/':
          step = this.heregexToken() || this.regexToken();
          break;
        case '<':
          step = this.wordsToken();
          break;
        case '#':
          step = this.commentToken();
          break;
        case '`':
          step = this.jsToken();
          break;
        default:
          step = this.whitespaceToken() || this.identifierToken() || this.numberToken();
        }
        i += step || this.literalToken();
      }
      this.outdentToken(this.indent);
      this.tokens.shift();
      if (o.rewrite !== false) {
        Rewriter.rewrite(this.tokens);
      }
      return this.tokens;
    }, _ref.identifierToken = function(){
      var at, colon, forcedIdentifier, id, input, match, prev, tag, _ref;
      if (!(match = IDENTIFIER.exec(this.chunk))) {
        return 0;
      }
      input = match[0], id = match[1], colon = match[2];
      if (id === 'all') {
        switch (this.tag()) {
        case 'FOR':
          this.token('ALL', id);
          return id.length;
        case 'IMPORT':
          this.value(0, '');
          return id.length;
        }
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
      tag = (at = id.charAt(0) === '@') ? (id = id.slice(1), 'THISPROP') : 'IDENTIFIER';
      forcedIdentifier = at || colon || (!(prev = (_ref = this.tokens)[_ref.length - 1]).spaced && prev[1].colon2 ? this.token("ACCESS", ".") : prev[0] === 'ACCESS');
      if (__indexOf.call(JS_FORBIDDEN, id) >= 0) {
        if (forcedIdentifier) {
          id = new String(id);
          id.reserved = true;
        } else if (__indexOf.call(RESERVED, id) >= 0) {
          throw SyntaxError("reserved word \"" + id + "\" on line " + (this.line + 1));
        }
      }
      if (!id.reserved && __indexOf.call(JS_KEYWORDS, id) >= 0 || !forcedIdentifier && __indexOf.call(COFFEE_KEYWORDS, id) >= 0) {
        switch (tag = id.toUpperCase()) {
        case 'FOR':
          this.seenFor = true;
          break;
        case 'UNLESS':
          tag = 'IF';
          break;
        case 'UNTIL':
          tag = 'WHILE';
          break;
        case "NEW":
        case "DO":
        case "TYPEOF":
        case "DELETE":
          tag = 'UNARY';
          break;
        case "IN":
        case "OF":
        case "INSTANCEOF":
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
        switch (id) {
        case "!":
          tag = 'UNARY';
          break;
        case "&&":
        case "||":
          tag = 'LOGIC';
          break;
        case "===":
        case "!==":
          tag = 'COMPARE';
          break;
        case "true":
        case "false":
        case "null":
        case "void":
          tag = 'LITERAL';
        }
      }
      this.token(tag, id);
      if (colon) {
        this.token(":", ":");
      }
      return input.length;
    }, _ref.numberToken = function(){
      var number;
      if (!(number = NUMBER.exec(this.chunk))) {
        return 0;
      }
      this.token('STRNUM', number = number[0]);
      return number.length;
    }, _ref.stringToken = function(){
      var string;
      switch (this.chunk.charAt(0)) {
      case "'":
        if (!(string = SIMPLESTR.exec(this.chunk))) {
          return 0;
        }
        this.token('STRNUM', (string = string[0]).replace(MULTILINER, '\\\n'));
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
      return this.countLines(string).length;
    }, _ref.heredocToken = function(){
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
      return this.countLines(heredoc).length;
    }, _ref.commentToken = function(){
      var match;
      if (!(match = HERECOMMENT.exec(this.chunk))) {
        return 0;
      }
      this.token('HERECOMMENT', this.sanitizeHeredoc(match[1], {
        comment: true,
        indent: Array(this.indent + 1).join(' ')
      }));
      this.token("TERMINATOR", "\n");
      return this.countLines(match[0]).length;
    }, _ref.jsToken = function(){
      var js;
      if (!(js = JSTOKEN.exec(this.chunk))) {
        return 0;
      }
      this.token('LITERAL', (js = js[0]).slice(1, -1));
      return this.countLines(js).length;
    }, _ref.regexToken = function(){
      var prev, regex, _ref;
      prev = (_ref = this.tokens)[_ref.length - 1];
      if (((_ref = prev[0]) === "STRNUM" || _ref === "LITERAL" || _ref === "CREMENT") || !prev.spaced && (_ref = prev[0], __indexOf.call(CALLABLE, _ref) >= 0) || !(regex = REGEX.exec(this.chunk))) {
        return 0;
      }
      this.token('LITERAL', (regex = regex[0]) === '//' ? '/(?:)/' : regex);
      return this.countLines(regex).length;
    }, _ref.heregexToken = function(){
      var body, flags, heregex, match, tag, tokens, value, _i, _len, _ref, _ref2;
      if (!(match = HEREGEX.exec(this.chunk))) {
        return 0;
      }
      heregex = match[0], body = match[1], flags = match[2];
      if (0 > body.indexOf('#{')) {
        body = body.replace(HEREGEX_OMIT, '').replace(/\//g, '\\/');
        this.token('LITERAL', "/" + (body || '(?:)') + "/" + flags);
        return this.countLines(heregex).length;
      }
      this.tokens.push(['IDENTIFIER', 'RegExp', this.line], ['CALL_START', '(', this.line]);
      tokens = [];
      for (_i = 0, _len = (_ref = this.interpolateString(body, {
        regex: true
      })).length; _i < _len; ++_i) {
        _ref2 = _ref[_i], tag = _ref2[0], value = _ref2[1];
        if (tag === 'TOKENS') {
          tokens.push.apply(tokens, value);
        } else {
          if (!(value = value.replace(HEREGEX_OMIT, ''))) {
            continue;
          }
          value = value.replace(/\\/g, '\\\\');
          tokens.push(['STRNUM', this.makeString(value, '"', true)]);
        }
        tokens.push(["PLUS_MINUS", "+"]);
      }
      tokens.pop();
      if (((_ref = tokens[0]) != null ? _ref[0] : void 0) !== 'STRNUM') {
        this.tokens.push(["STRNUM", "\"\""], ["PLUS_MINUS", "+"]);
      }
      (_ref = this.tokens).push.apply(_ref, tokens);
      if (flags) {
        this.tokens.push([",", ","], ['STRNUM', '"' + flags + '"']);
      }
      this.countLines(heregex);
      this.token(")", ")");
      return heregex.length;
    }, _ref.wordsToken = function(){
      var call, prev, word, words, _i, _len, _ref;
      if (!(words = WORDS.exec(this.chunk))) {
        return 0;
      }
      if (call = !(prev = (_ref = this.tokens)[_ref.length - 1]).spaced && (_ref = prev[0], __indexOf.call(CALLABLE, _ref) >= 0)) {
        this.token("CALL_START", "(");
      } else {
        this.token("[", "[");
      }
      for (_i = 0, _len = (_ref = (words = words[0]).slice(2, -2).match(/\S+/g) || ['']).length; _i < _len; ++_i) {
        word = _ref[_i];
        this.tokens.push(['STRNUM', this.makeString(word, '"')], [",", ","]);
      }
      this.countLines(words);
      this.tokens.push(call ? [')', ')', this.line] : [']', ']', this.line]);
      return words.length;
    }, _ref.lineToken = function(){
      var diff, indent, noNewlines, size, _ref;
      if (!(indent = MULTIDENT.exec(this.chunk))) {
        return 0;
      }
      this.countLines(indent = indent[0]);
      (_ref = this.tokens)[_ref.length - 1].eol = true;
      size = indent.length - 1 - indent.lastIndexOf('\n');
      noNewlines = this.unfinished();
      if (size - this.indebt === this.indent) {
        if (!noNewlines) {
          this.newlineToken();
        }
        return indent.length;
      }
      if (size > this.indent) {
        if (noNewlines) {
          this.indebt = size - this.indent;
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
    }, _ref.outdentToken = function(moveOut, noNewlines){
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
      if (!noNewlines) {
        this.newlineToken();
      }
      return this;
    }, _ref.whitespaceToken = function(){
      var match, _ref;
      if (!(match = WHITESPACE.exec(this.chunk))) {
        return 0;
      }
      (_ref = this.tokens)[_ref.length - 1].spaced = true;
      return match[0].length;
    }, _ref.newlineToken = function(){
      if (this.tag() !== 'TERMINATOR') {
        this.token("TERMINATOR", "\n");
      }
      return this;
    }, _ref.literalToken = function(){
      var id, prev, pval, tag, value, _ref;
      value = SYMBOL.exec(this.chunk)[0];
      switch (tag = value) {
      case "=":
      case ":=":
        prev = (_ref = this.tokens)[_ref.length - 1];
        pval = prev[1];
        if (!pval.reserved && __indexOf.call(JS_FORBIDDEN, pval) >= 0) {
          throw SyntaxError("reserved word \"" + pval + "\" on line " + (this.line + 1) + " cannot be assigned");
        }
        if (value === '=' && (pval === "||" || pval === "&&")) {
          prev[0] = 'COMPOUND_ASSIGN';
          prev[1] += '=';
          return value.length;
        }
        break;
      case "->":
      case "=>":
        this.tagParameters();
        tag = 'FUNC_ARROW';
        break;
      case '*':
        tag = this.tag() === 'INDEX_START' ? 'LITERAL' : 'MATH';
        break;
      case "!":
      case "~":
        tag = 'UNARY';
        break;
      case ".":
      case "?.":
      case ".=":
        tag = 'ACCESS';
        break;
      case "+":
      case "-":
        tag = 'PLUS_MINUS';
        break;
      case "===":
      case "!==":
      case "<=":
      case "<":
      case ">":
      case ">=":
      case "==":
      case "!=":
        tag = 'COMPARE';
        break;
      case "&&":
      case "||":
      case "&":
      case "|":
      case "^":
        tag = 'LOGIC';
        break;
      case "/":
      case "%":
        tag = 'MATH';
        break;
      case "++":
      case "--":
        tag = 'CREMENT';
        break;
      case "-=":
      case "+=":
      case "||=":
      case "&&=":
      case "?=":
      case "/=":
      case "*=":
      case "%=":
      case "<<=":
      case ">>=":
      case ">>>=":
      case "&=":
      case "^=":
      case "|=":
        tag = 'COMPOUND_ASSIGN';
        break;
      case "<<":
      case ">>":
      case ">>>":
        tag = 'SHIFT';
        break;
      case "?[":
      case "[=":
        tag = 'INDEX_START';
        break;
      case '@':
        tag = 'THIS';
        break;
      case ';':
        tag = 'TERMINATOR';
        break;
      case '?':
        if ((_ref = this.tokens)[_ref.length - 1].spaced) {
          tag = 'LOGIC';
        }
        break;
      case '\\\n':
        return value.length;
      default:
        if (value.charAt(0) === '@') {
          this.tokens.push(['IDENTIFIER', 'arguments', this.line], ["INDEX_START", "["], ['STRNUM', value.slice(1)], ["INDEX_END", "]"]);
          return value.length;
        }
        if (value === '::') {
          id = new String('prototype');
          id.colon2 = true;
          this.tokens.push(["ACCESS", "."], ['IDENTIFIER', id, this.line]);
          return value.length;
        }
        if (!(prev = (_ref = this.tokens)[_ref.length - 1]).spaced) {
          if (value === '(' && (_ref = prev[0], __indexOf.call(CALLABLE, _ref) >= 0)) {
            if (prev[0] === '?') {
              prev[0] = 'FUNC_EXIST';
            }
            tag = 'CALL_START';
          } else if (value === '[' && (_ref = prev[0], __indexOf.call(INDEXABLE, _ref) >= 0)) {
            tag = 'INDEX_START';
          }
        }
      }
      this.token(tag, value);
      return value.length;
    }, _ref.sanitizeHeredoc = function(doc, options){
      var attempt, comment, indent, _ref;
      indent = options.indent, comment = options.comment;
      if (comment) {
        if (0 > doc.indexOf('\n')) {
          return doc;
        }
      } else {
        while (attempt = HEREDOC_INDENT.exec(doc)) {
          attempt = attempt[1];
          if (!(indent != null) || (0 < (_ref = attempt.length) && _ref < indent.length)) {
            indent = attempt;
          }
        }
      }
      if (indent) {
        doc = doc.replace(RegExp("\\n" + indent, "g"), '\n');
      }
      if (!comment) {
        doc = doc.replace(/^\n/, '');
      }
      return doc;
    }, _ref.tagParameters = function(){
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
        case "(":
        case "CALL_START":
          if (level--) {
            break;
          }
          tok[0] = 'PARAM_START';
          return this;
        }
      }
      return this;
    }, _ref.balancedString = function(str, delimited, options){
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
          if (levels.length && levels[levels.length - 1] === pair && close === str.substr(i, close.length)) {
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
        throw SyntaxError("unterminated " + levels.pop()[0] + " starting on line " + (this.line + 1));
      }
      return i && str.slice(0, i);
    }, _ref.interpolateString = function(str, _arg){
      var chr, expr, heredoc, i, inner, interpolated, nested, pi, regex, tag, tokens, value, _len, _ref;
      _ref = _arg != null ? _arg : {}, heredoc = _ref.heredoc, regex = _ref.regex;
      tokens = [];
      pi = 0;
      i = -1;
      while (chr = str.charAt(++i)) {
        if (chr === '\\') {
          ++i;
          continue;
        }
        if (!(chr === '#' && str.charAt(i + 1) === '{' && (expr = this.balancedString(str.slice(i + 1), [["{", "}"]])))) {
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
        return this.token("STRNUM", "\"\"");
      }
      if (tokens[0][0] !== 'TO_BE_STRING') {
        tokens.unshift(['', '']);
      }
      if (interpolated = tokens.length > 1) {
        this.token("(", "(");
      }
      for (i = 0, _len = tokens.length; i < _len; ++i) {
        _ref = tokens[i], tag = _ref[0], value = _ref[1];
        if (i) {
          this.token("PLUS_MINUS", "+");
        }
        if (tag === 'TOKENS') {
          (_ref = this.tokens).push.apply(_ref, value);
        } else {
          this.token('STRNUM', this.makeString(value, '"', heredoc));
        }
      }
      if (interpolated) {
        this.token(")", ")");
      }
      return tokens;
    }, _ref.token = function(tag, value){
      return this.tokens.push([tag, value, this.line]);
    }, _ref.tag = function(index, tag){
      var t, _ref;
      return (t = (_ref = this.tokens)[_ref.length - 1 - (index | 0)]) && (tag != null ? t[0] = tag : t[0]);
    }, _ref.value = function(index, val){
      var t, _ref;
      return (t = (_ref = this.tokens)[_ref.length - 1 - (index | 0)]) && (val != null ? t[1] = val : t[1]);
    }, _ref.unfinished = function(){
      var _ref;
      return LINE_CONTINUER.test(this.chunk) || ((_ref = this.tag()) === "ACCESS" || _ref === "INDEX_START" || _ref === "PLUS_MINUS" || _ref === "MATH" || _ref === "COMPARE" || _ref === "LOGIC" || _ref === "RELATION" || _ref === "IMPORT" || _ref === "SHIFT");
    }, _ref.escapeLines = function(str, heredoc){
      return str.replace(MULTILINER, heredoc ? '\\n' : '');
    }, _ref.makeString = function(body, quote, heredoc){
      if (!body) {
        return quote + quote;
      }
      body = body.replace(/\\([\s\S])/g, function(match, escaped){
        if (escaped === '\n' || escaped === quote) {
          return escaped;
        } else {
          return match;
        }
      });
      body = body.replace(RegExp("" + quote, "g"), '\\$&');
      return quote + this.escapeLines(body, heredoc) + quote;
    }, _ref.countLines = function(str){
      var pos;
      pos = 0;
      while (pos = 1 + str.indexOf('\n', pos)) {
        ++this.line;
      }
      return str;
    };
    return Lexer;
  }());
  JS_KEYWORDS = ["true", "false", "null", "this", "void", "super", "if", "else", "for", "while", "switch", "case", "default", "try", "catch", "finally", "class", "extends", "return", "throw", "break", "continue", "debugger", "new", "do", "delete", "typeof", "in", "instanceof", "import", "function"];
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
  RESERVED = ["var", "with", "const", "let", "enum", "export", "native"];
  JS_FORBIDDEN = JS_KEYWORDS.concat(RESERVED);
  IDENTIFIER = /^(@?[$A-Za-z_][$\w]*)([^\n\S]*:(?![:=]))?/;
  NUMBER = /^0x[\da-f]+|^(?:\d+(\.\d+)?|\.\d+)(?:e[+-]?\d+)?/i;
  HEREDOC = /^("""|''')([\s\S]*?)(?:\n[^\n\S]*)?\1/;
  SYMBOL = /^(?:[-=]>|[!=]==|[-+*\/%&|^?:.[<>=!]=|>>>=?|([-+:])\1|([&|<>])\2=?|\?[.[]|\.{3}|@\d+|\\\n|\S)/;
  WHITESPACE = /^[^\n\S]+/;
  COMMENTS = /^(?:\s*#(?!##[^#]).*)+/;
  HERECOMMENT = /^###([^#][\s\S]*?)(?:###|$)/;
  MULTIDENT = /^(?:\n[^\n\S]*)+/;
  SIMPLESTR = /^'[^\\']*(?:\\.[^\\']*)*'/;
  JSTOKEN = /^`[^\\`]*(?:\\.[^\\`]*)*`/;
  WORDS = /^<\[[\s\S]*?]>/;
  REGEX = /^\/(?!\s)[^[\/\n\\]*(?:(?:\\[\s\S]|\[[^\]\n\\]*(?:\\[\s\S][^\]\n\\]*)*])[^[\/\n\\]*)*\/[imgy]{0,4}(?!\w)/;
  HEREGEX = /^\/{3}([\s\S]+?)\/{3}([imgy]{0,4})(?!\w)/;
  HEREGEX_OMIT = /\s+(?:#.*)?/g;
  MULTILINER = /\n/g;
  HEREDOC_INDENT = /\n+([^\n\S]*)/g;
  LINE_CONTINUER = /^\s*(?:,|\??\.(?!\.)|::)/;
  LEADING_SPACES = /^\s+/;
  TRAILING_SPACES = /\s+$/;
  CALLABLE = ["IDENTIFIER", "THISPROP", ")", "]", "}", "?", "SUPER", "THIS"];
  INDEXABLE = CALLABLE.concat("STRNUM", "LITERAL");
}).call(this);
