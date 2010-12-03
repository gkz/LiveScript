(function(){
  var CALLABLE, COCO_ALIASES, COCO_KEYWORDS, COMMENTS, HEREGEX, HEREGEX_OMIT, IDENTIFIER, INDEXABLE, JSTOKEN, JS_FORBIDDEN, JS_KEYWORDS, LINE_CONTINUER, Lexer, MULTIDENT, MULTILINER, NUMBER, REGEX, RESERVED, SIMPLESTR, SYMBOL, WHITESPACE, __indexOf = Array.prototype.indexOf || function(x){
    for (var i = this.length; i-- && this[i] !== x;); return i;
  };
  exports.Lexer = Lexer = (function(){
    var _ref;
    function Lexer(){} Lexer.name = "Lexer";
    _ref = Lexer.prototype;
    _ref.tokenize = function(code, o){
      var comments, i;
      o == null && (o = {});
      this.tokens = [this.last = ['DUMMY', '', 0]];
      this.line = o.line || 0;
      this.indent = this.indebt = this.outdebt = 0;
      this.indents = [];
      this.seenFor = this.seenFrom = this.seenRange = false;
      code = code.replace(/\r/g, '').replace(/\s+$/, '');
      i = 0;
      while (this.chunk = code.slice(i)) {
        if (comments = COMMENTS.exec(this.chunk)) {
          if (!(this.chunk = code.slice(i += this.countLines(comments[0]).length))) {
            break;
          }
          i += this.lineToken();
          continue;
        }
        switch (code.charAt(i)) {
        case '\n':
          i += this.lineToken();
          break;
        case ' ':
          i += this.whitespaceToken();
          break;
        case "'":
          i += this.heredocToken("'") || this.singleStringToken();
          break;
        case '"':
          i += this.heredocToken('"') || this.doubleStringToken();
          break;
        case '<':
          i += '[' === code.charAt(i + 1)
            ? this.wordsToken()
            : this.literalToken();
          break;
        case '/':
          i += '//' === code.substr(i + 1, 2)
            ? this.heregexToken()
            : this.regexToken() || this.literalToken();
          break;
        case '#':
          i += this.commentToken();
          break;
        case '`':
          i += this.jsToken();
          break;
        default:
          i += this.identifierToken() || this.numberToken() || this.literalToken() || this.whitespaceToken();
        }
      }
      this.outdent(this.indent);
      this.tokens.shift();
      if (o.rewrite !== false) {
        require('./rewriter').rewrite(this.tokens);
      }
      return this.tokens;
    };
    _ref.identifierToken = function(){
      var at, colon, forcedIdentifier, id, input, match, prev, tag, _ref, _ref2;
      if (!(match = IDENTIFIER.exec(this.chunk))) {
        return 0;
      }
      switch (id = match[1]) {
      case 'own':
        if (!(this.last[0] === 'FOR' && this.last[1])) {
          break;
        }
        this.last[1] = '';
        return id.length;
      case 'from':
        if (((_ref = (_ref2 = this.tokens)[_ref2.length - 2]) != null ? _ref[0] : void 8) !== 'FOR') {
          break;
        }
        this.seenFor = false;
        this.seenFrom = true;
        return this.token('FROM', id).length;
      case 'ever':
        if (this.last[0] !== 'FOR') {
          break;
        }
        this.seenFor = false;
        return this.token('EVER', id).length;
      case "to":
      case "til":
        if (!this.seenFrom) {
          break;
        }
        this.seenFrom = false;
        this.seenRange = true;
        return this.token('TO', id).length;
      case 'by':
        if (!this.seenRange) {
          break;
        }
        this.seenRange = false;
        return this.token('BY', id).length;
      case 'all':
        if (!(this.last[0] === 'IMPORT' && this.last[1])) {
          break;
        }
        this.last[1] = '';
        return id.length;
      }
      tag = (at = id.charAt(0) === '@') ? (id = id.slice(1), 'THISPROP') : 'IDENTIFIER';
      input = match[0], colon = match[2];
      forcedIdentifier = at || colon || (!(prev = this.last).spaced && prev[1].colon2
        ? this.token("ACCESS", ".")
        : prev[0] === 'ACCESS');
      if (forcedIdentifier) {
        if (__indexOf.call(JS_FORBIDDEN, id) >= 0) {
          (id = new String(id)).reserved = true;
        }
      } else if (__indexOf.call(COCO_KEYWORDS, id) >= 0) {
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
        case "TRUE":
        case "FALSE":
        case "NULL":
        case "VOID":
          tag = 'LITERAL';
          break;
        case "BREAK":
        case "CONTINUE":
        case "DEBUGGER":
          tag = 'STATEMENT';
          break;
        case "IN":
        case "OF":
        case "INSTANCEOF":
          if (tag !== 'INSTANCEOF' && this.seenFor) {
            if (tag === 'OF') {
              this.seenRange = true;
            }
            this.seenFor = false;
            tag = 'FOR' + tag;
            break;
          }
          if (this.last[1] === '!') {
            this.tokens.pop();
            id = '!' + id;
          }
          tag = 'RELATION';
        }
        if (this.seenRange && (tag === "FOR" || tag === "THEN")) {
          this.seenRange = false;
        }
      } else if (COCO_ALIASES.hasOwnProperty(id)) {
        switch (id = COCO_ALIASES[id]) {
        case '!':
          tag = 'UNARY';
          break;
        case "&&":
        case "||":
          tag = 'LOGIC';
          break;
        default:
          tag = 'COMPARE';
        }
      } else if (__indexOf.call(RESERVED, id) >= 0) {
        this.carp("reserved word \"" + id + "\"");
      }
      this.token(tag, id);
      if (colon) {
        this.token(":", ":");
      }
      return input.length;
    };
    _ref.numberToken = function(){
      var match, num, radix, rnum;
      if (!(match = NUMBER.exec(this.chunk))) {
        return 0;
      }
      num = match[0], radix = match[1], rnum = match[2];
      if (radix) {
        if (!(2 <= radix && radix <= 36)) {
          this.carp("invalid radix " + radix);
        }
        num = parseInt(rnum, radix);
        if (isNaN(num) || num === parseInt(rnum.slice(0, -1), radix)) {
          this.carp("invalid number " + rnum + " in base " + radix);
        }
      }
      this.token('STRNUM', num);
      return match[0].length;
    };
    _ref.singleStringToken = function(){
      var string;
      if (!(string = SIMPLESTR.exec(this.chunk))) {
        this.carp('unterminated string');
      }
      this.token('STRNUM', (string = string[0]).replace(MULTILINER, '\\\n'));
      return this.countLines(string).length;
    };
    _ref.doubleStringToken = function(){
      var string;
      string = this.balancedString(this.chunk, [["\"", "\""], ["#{", "}"]]);
      if (0 < string.indexOf('#{', 1)) {
        this.interpolateString(string.slice(1, -1));
      } else {
        this.token('STRNUM', string.replace(MULTILINER, ''));
      }
      return this.countLines(string).length;
    };
    _ref.heredocToken = function(q){
      var dent, doc, end, len, m, tabs, txt;
      if (!(this.chunk.slice(1, 3) === q + q && ~(end = this.chunk.indexOf(q + q + q, 3)))) {
        return 0;
      }
      txt = this.chunk.slice(3, end);
      doc = txt.replace(/\n[^\n\S]*$/, '');
      if (~doc.indexOf('\n')) {
        tabs = /\n[^\n\S]*(?!$)/mg;
        dent = 0 / 0;
        while (m = tabs.exec(doc)) {
          if (!(dent <= (len = m[0].length - 1))) {
            dent = len;
          }
        }
        doc = this.dedent(doc, dent).replace(/^\n/, '');
      }
      if (q === '"' && ~doc.indexOf('#{')) {
        this.interpolateString(doc, {
          newline: '\\n'
        });
      } else {
        this.token('STRNUM', this.makeString(doc, q, '\\n'));
      }
      return this.countLines(txt).length + 6;
    };
    _ref.commentToken = function(){
      var end, text;
      text = this.chunk.slice(3, ~(end = this.chunk.indexOf('###', 3)) ? end : 1 / 0);
      this.token('HERECOMMENT', this.dedent(text, this.indent));
      this.token("TERMINATOR", "\n");
      return this.countLines(text).length + 6;
    };
    _ref.jsToken = function(){
      var js;
      if (!(js = JSTOKEN.exec(this.chunk))) {
        this.carp('unterminated JS literal');
      }
      (js = new String(js[0].slice(1, -1))).js = true;
      return this.countLines(this.token('LITERAL', js)).length + 2;
    };
    _ref.regexToken = function(){
      var prev, regex, _ref;
      if (((_ref = (prev = this.last)[0]) === "STRNUM" || _ref === "LITERAL" || _ref === "CREMENT") || !prev.spaced && (_ref = prev[0], __indexOf.call(CALLABLE, _ref) >= 0) || !(regex = REGEX.exec(this.chunk))) {
        return 0;
      }
      this.token('LITERAL', (regex = regex[0]) === '//' ? '/(?:)/' : regex);
      return this.countLines(regex).length;
    };
    _ref.heregexToken = function(){
      var body, flags, heregex, match, tag, tokens, value, _i, _len, _ref, _ref2;
      if (!(match = HEREGEX.exec(this.chunk))) {
        this.carp('unterminated heregex');
      }
      heregex = match[0], body = match[1], flags = match[2];
      if (0 > body.indexOf('#{')) {
        body = body.replace(HEREGEX_OMIT, '').replace(/\//g, '\\/');
        this.token('LITERAL', "/" + (body || '(?:)') + "/" + flags);
        return this.countLines(heregex).length;
      }
      this.token("IDENTIFIER", "RegExp");
      this.token("CALL_START", "(");
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
          tokens.push(['STRNUM', this.makeString(value, '"', '\\n')]);
        }
        tokens.push(["PLUS_MINUS", "+"]);
      }
      tokens.pop();
      if (((_ref = tokens[0]) != null ? _ref[0] : void 8) !== 'STRNUM') {
        this.tokens.push(["STRNUM", "\"\""], ["PLUS_MINUS", "+"]);
      }
      (_ref = this.tokens).push.apply(_ref, tokens);
      if (flags) {
        this.tokens.push([",", ","], ['STRNUM', '"' + flags + '"']);
      }
      this.countLines(heregex);
      this.token(")", ")");
      return heregex.length;
    };
    _ref.wordsToken = function(){
      var call, end, word, words, _i, _len, _ref;
      if (!~(end = this.chunk.indexOf(']>', 2))) {
        this.carp('unterminated words');
      }
      if (call = !this.last.spaced && (_ref = this.last[0], __indexOf.call(CALLABLE, _ref) >= 0)) {
        this.token("CALL_START", "(");
      } else {
        this.token("[", "[");
      }
      for (_i = 0, _len = (_ref = (words = this.chunk.slice(2, end)).match(/\S+/g) || ['']).length; _i < _len; ++_i) {
        word = _ref[_i];
        this.tokens.push(['STRNUM', this.makeString(word, '"')], [",", ","]);
      }
      this.countLines(words);
      if (call) {
        this.token(")", ")");
      } else {
        this.token("]", "]");
      }
      return end + 2;
    };
    _ref.lineToken = function(){
      var indent, noNewline, size, _ref;
      if (!(indent = MULTIDENT.exec(this.chunk))) {
        return 0;
      }
      this.countLines(indent = indent[0]);
      this.last.eol = true;
      this.seenRange = false;
      size = indent.length - 1 - indent.lastIndexOf('\n');
      noNewline = LINE_CONTINUER.test(this.chunk) || ((_ref = this.last[0]) === "ACCESS" || _ref === "INDEX_START" || _ref === "ASSIGN" || _ref === "COMPOUND_ASSIGN" || _ref === "IMPORT" || _ref === "LOGIC" || _ref === "PLUS_MINUS" || _ref === "MATH" || _ref === "COMPARE" || _ref === "RELATION" || _ref === "SHIFT");
      if (size - this.indebt === this.indent) {
        if (!noNewline) {
          this.newline();
        }
        return indent.length;
      }
      if (size > this.indent) {
        if (noNewline) {
          this.indebt = size - this.indent;
          return indent.length;
        }
        this.indents.push(this.token('INDENT', size - this.indent + this.outdebt));
        this.outdebt = this.indebt = 0;
      } else {
        this.indebt = 0;
        this.outdent(this.indent - size, noNewline);
      }
      this.indent = size;
      return indent.length;
    };
    _ref.whitespaceToken = function(){
      var match;
      if (!(match = WHITESPACE.exec(this.chunk))) {
        return 0;
      }
      this.last.spaced = true;
      return match[0].length;
    };
    _ref.literalToken = function(){
      var id, prev, tag, value, _ref;
      value = SYMBOL.exec(this.chunk)[0];
      switch (tag = value) {
      case ')':
        if (this.last[0] === '(') {
          this.last[0] = 'CALL_START';
        }
        break;
      case "->":
      case "=>":
        this.tagParameters();
        tag = 'FUNC_ARROW';
        break;
      case '*':
        tag = (_ref = this.last[0]) === "INDEX_START" || _ref === "(" ? 'LITERAL' : 'MATH';
        break;
      case "=":
      case ":=":
      case "+=":
      case "-=":
      case "*=":
      case "/=":
      case "%=":
      case "&=":
      case "^=":
      case "|=":
      case "<<=":
      case ">>=":
      case ">>>=":
        tag = value === "=" || value === ":=" ? 'ASSIGN' : 'COMPOUND_ASSIGN';
        if (this.last[0] === 'LOGIC') {
          this.tokens.pop();
          (value = new String(value)).logic = this.last[1];
        }
        break;
      case "!":
      case "~":
        tag = 'UNARY';
        break;
      case ".":
      case "?.":
      case "&.":
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
      case "<<":
      case ">>":
      case ">>>":
        tag = 'SHIFT';
        break;
      case "?[":
      case "&[":
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
        if (this.last.spaced) {
          tag = 'LOGIC';
        }
        break;
      case '\\\n':
        return value.length;
      case '::':
        (id = new String('prototype')).colon2 = true;
        this.token("ACCESS", ".");
        this.token('IDENTIFIER', id);
        return value.length;
      default:
        if (value.charAt(0) === '@') {
          this.token("IDENTIFIER", "arguments");
          this.token("INDEX_START", "[");
          this.token('STRNUM', value.slice(1));
          this.token("INDEX_END", "]");
          return value.length;
        }
        if (!(prev = this.last).spaced) {
          if (value === '(' && (_ref = prev[0], __indexOf.call(CALLABLE, _ref) >= 0)) {
            if (prev[0] === '?') {
              prev[0] = 'CALL_START';
              prev[1] += '(';
              return value.length;
            }
            tag = 'CALL_START';
          } else if (value === '[' && (_ref = prev[0], __indexOf.call(INDEXABLE, _ref) >= 0)) {
            tag = 'INDEX_START';
          }
        }
      }
      return this.token(tag, value).length;
    };
    _ref.outdent = function(moveOut, noNewline){
      var idt, _ref;
      while (moveOut > 0) {
        if (!(idt = (_ref = this.indents)[_ref.length - 1])) {
          moveOut = 0;
        } else if (idt <= this.outdebt) {
          moveOut -= idt;
          this.outdebt -= idt;
        } else {
          moveOut -= this.token('OUTDENT', this.indents.pop() - this.outdebt);
          this.outdebt = 0;
        }
      }
      this.outdebt -= moveOut;
      if (!noNewline) {
        return this.newline();
      }
    };
    _ref.newline = function(){
      if (this.last[0] !== 'TERMINATOR') {
        return this.token("TERMINATOR", "\n");
      }
    };
    _ref.tagParameters = function(){
      var i, level, tok, tokens;
      if (this.last[0] !== ')') {
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
    };
    _ref.balancedString = function(str, delimited, options){
      var i, open, pair, stack, _i, _len, _to;
      options == null && (options = {});
      stack = [delimited[0]];
      for (i = 1, _to = str.length; i < _to; ++i) {
        switch (str.charAt(i)) {
        case '\\':
          ++i;
          continue;
        case stack[stack.length - 1][1]:
          stack.pop();
          if (!stack.length) {
            return str.slice(0, i + 1);
          }
          continue;
        }
        for (_i = 0, _len = delimited.length; _i < _len; ++_i) {
          pair = delimited[_i];
          if ((open = pair[0]) !== str.substr(i, open.length)) {
            continue;
          }
          stack.push(pair);
          i += open.length - 1;
          break;
        }
      }
      return this.carp("unterminated " + stack.pop()[0]);
    };
    _ref.interpolateString = function(str, options){
      var chr, code, i, interpolated, nested, pi, tag, tokens, value, _len, _ref;
      options == null && (options = {});
      tokens = [];
      pi = 0;
      i = -1;
      while (chr = str.charAt(++i)) {
        if (chr === '\\') {
          ++i;
          continue;
        }
        if (!(chr === '#' && str.charAt(i + 1) === '{')) {
          continue;
        }
        code = this.balancedString(str.slice(i + 1), [["{", "}"]]);
        if (pi < i) {
          tokens.push(['TO_BE_STRING', str.slice(pi, i)]);
        }
        pi = 1 + (i += code.length);
        if (code = code.slice(1, -1)) {
          nested = new Lexer().tokenize(code, {
            line: this.line,
            rewrite: false
          });
          nested.pop();
          if (((_ref = nested[0]) != null ? _ref[0] : void 8) === 'TERMINATOR') {
            nested.shift();
          }
          if (nested.length > 1) {
            nested.unshift(["(", "("]);
            nested.push([")", ")"]);
          }
          tokens.push(['TOKENS', nested]);
        }
      }
      if (pi < str.length) {
        tokens.push(['TO_BE_STRING', str.slice(pi)]);
      }
      if (options.regex) {
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
          this.token('STRNUM', this.makeString(value, '"', options.newline));
        }
      }
      if (interpolated) {
        this.token(")", ")");
      }
      return tokens;
    };
    _ref.token = function(tag, value){
      this.tokens.push(this.last = [tag, value, this.line]);
      return value;
    };
    _ref.makeString = function(body, quote, newline){
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
      return quote + body.replace(MULTILINER, newline || '') + quote;
    };
    _ref.countLines = function(str){
      var pos;
      pos = 0;
      while (pos = 1 + str.indexOf('\n', pos)) {
        ++this.line;
      }
      return str;
    };
    _ref.dedent = function(str, num){
      if (num) {
        return str.replace(RegExp("\\n[^\\n\\S]{" + num + "}", "g"), '\n');
      } else {
        return str;
      }
    };
    _ref.carp = function(it){
      throw SyntaxError("" + it + " on line " + (this.line + 1));
    };
    return Lexer;
  }());
  JS_KEYWORDS = ["true", "false", "null", "this", "void", "super", "if", "else", "for", "while", "switch", "case", "default", "try", "catch", "finally", "class", "extends", "return", "throw", "break", "continue", "debugger", "new", "do", "delete", "typeof", "in", "instanceof", "import", "function"];
  COCO_KEYWORDS = JS_KEYWORDS.concat("then", "unless", "until", "of");
  COCO_ALIASES = {
    not: '!',
    and: '&&',
    or: '||',
    is: '===',
    isnt: '!=='
  };
  RESERVED = ["var", "with", "const", "let", "enum", "export", "native"];
  JS_FORBIDDEN = JS_KEYWORDS.concat(RESERVED);
  IDENTIFIER = /^(@?[$A-Za-z_][$\w]*)([^\n\S]*:(?![:=]))?/;
  NUMBER = /^0x[\da-f]+|^([1-9]\d*)r([\da-z]+)|^(?:\d+(\.\d+)?|\.\d+)(?:e[+-]?\d+)?/i;
  SYMBOL = /^(?:[-+*\/%&|^:.[<>]=|([-+&|:])\1|[!=]==?|[-=]>|\.{3}|[?&][.[]|@\d+|\\\n|<<=?|>>>?=?|\S)/;
  WHITESPACE = /^[^\n\S]+/;
  COMMENTS = /^(?:\s*#(?!##[^#]).*)+/;
  MULTIDENT = /^(?:\n[^\n\S]*)+/;
  SIMPLESTR = /^'[^\\']*(?:\\.[^\\']*)*'/;
  JSTOKEN = /^`[^\\`]*(?:\\.[^\\`]*)*`/;
  REGEX = /^\/(?!\s)[^[\/\n\\]*(?:(?:\\[\s\S]|\[[^\]\n\\]*(?:\\[\s\S][^\]\n\\]*)*])[^[\/\n\\]*)*\/[imgy]{0,4}(?!\w)/;
  HEREGEX = /^\/{3}([\s\S]+?)\/{3}([imgy]{0,4})(?!\w)/;
  HEREGEX_OMIT = /\s+(?:#.*)?/g;
  MULTILINER = /\n/g;
  LINE_CONTINUER = /^\s*(?:,|[?&]?\.(?!\.)|::)/;
  CALLABLE = ["IDENTIFIER", "THISPROP", ")", "]", "}", "?", "SUPER", "THIS"];
  INDEXABLE = CALLABLE.concat("STRNUM", "LITERAL");
  CALLABLE.push('...');
}).call(this);
