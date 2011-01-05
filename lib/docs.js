(function(){
  var title, docs, navi, sdcv, htms, tinge, hashbraces, regexes, __importAll = function(obj, src){ for (var key in src) obj[key] = src[key]; return obj };
  title = document.title;
  docs = document.getElementById('docs') || lmn('div', {
    id: 'docs'
  });
  navi = document.getElementById('navi') || (function(){
    var h, co, _i, _ref, _len;
    h = '<div class=pointee>&#x2935;</div>';
    if (title) {
      h += "<h1>" + title + "</h1>";
    }
    for (_i = 0, _len = (_ref = sources).length; _i < _len; ++_i) {
      co = _ref[_i];
      h += "<li><a href=#" + co + ">" + co + "</a>";
    }
    return lmn('ul', {
      id: 'navi',
      innerHTML: h
    });
  }());
  sdcv = new Showdown.converter;
  htms = {
    __proto__: null
  };
  (this.onhashchange = function(){
    var page, name, that, xhr;
    if (!(page = /^\D+(?=(\d*)$)/.exec(location.hash.slice(1)))) {
      document.title = title;
      navi.className = docs.innerHTML = '';
      return;
    }
    navi.className = 'menu';
    docs.innerHTML = '...';
    name = page[0];
    if (that = htms[name]) {
      return load(page, that);
    }
    xhr = new XMLHttpRequest;
    xhr.open('GET', name !== 'Cokefile' ? name + '.co' : name, true);
    if (typeof xhr.overrideMimeType == 'function') {
      xhr.overrideMimeType('text/plain');
    }
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4) {
        return load(page, htms[name] = build(name, xhr.responseText));
      }
    };
    return xhr.send(null);
  })();
  function lmn(name, attrs){
    return document.body.appendChild(__importAll(document.createElement(name), attrs));
  }
  function load(_arg, html){
    var name, sect;
    name = _arg[0], sect = _arg[1];
    document.title = name + (title && ' - ' + title);
    docs.innerHTML = html;
    if (sect) {
      document.getElementById(sect).scrollIntoView();
    }
    return prettyPrint();
  }
  function build(name, source){
    var i, code, comment, htm, re, line, br, that, _i, _ref, _len;
    htm = comment = code = i = '';
    re = /^[^\n\S]*#(?!##(?!#)|{) ?(.*)/;
    for (_i = 0, _len = (_ref = source.split('\n')).length; _i < _len; ++_i) {
      line = _ref[_i];
      if (!line) {
        br = true;
        code && (code += '\n');
        continue;
      }
      if (that = re.exec(line)) {
        if (code || comment && br) {
          htm += block(name, comment, code, i++);
          comment = code = '';
        }
        comment += that[1] + '\n';
      } else {
        code += line + '\n';
      }
      br = false;
    }
    if (comment || code) {
      htm += block(name, comment, code, i);
    }
    return ("<h1>" + name + "</h1>") + htm + '<br clear=both>';
  }
  function block(name, comment, code, i){
    code && (code = "<pre class=\"code prettyprint lang-co\"\n >" + code.replace(/&/g, '&amp;').replace(/</g, '&lt;') + "</pre>");
    return "<div id=" + i + " class=block><div class=comment\n ><a class=anchor href=#" + name + i + ">#" + i + "</a\n >" + sdcv.makeHtml(comment) + "</div\n >" + code + "</div>";
  }
  tinge = function(ext, shortcuts, fallthroughs){
    var rule, _i, _len;
    for (_i = 0, _len = shortcuts.length; _i < _len; ++_i) {
      rule = shortcuts[_i];
      if (rule.length < 4) {
        rule.splice(2, 0, 0);
      }
    }
    return PR.registerLangHandler(PR.createSimpleLexer(shortcuts, fallthroughs), [ext]);
  };
  tinge('co', [['str', /^\\\S[^\s,;)}\]]*/, '\\'], ['str', /^'(?:''[^]*?''|[^\\']*(?:\\.[^\\']*)*)'/, '\''], ['lang-qq', /^("""[^]*?""")/, '"'], ['lang-qq', /^("[^\\"]*(?:\\.[^\\"]*)*")/, '"'], ['lang-qr', /^(\/{3}[^]+?\/{3}[imgy]{0,4})(?!\w)/, '/'], ['lang-at', /^(@+[$\w\x7f-\uffff]*)/, '@'], ['com', /^\#(?:\##[^#][^]*?###|.*)/, '#'], ['typ', /^(?:0x[\da-f]+|[1-9]\d?r[\da-z]+|(?:\d+(?:\.\d+)?)(?:e[+-]?\d+)?[a-z]*)/i, '0123456789'], ['lang-js', /^`([^\\`]*(?:\\.[^\\`]*)*)`/, '`']], [['pln', /^(?:(?:\@|(?:\.|::)\s*)[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*|[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*[^\n\S]*:(?!:)|\.{3})/], ['kwd', /^(?:t(?:ry|h(?:row|en)|ypeof)|f(?:or(?:own)?|inally|unction)|n(?:ew|ot)|c(?:ontinue|a(?:se|tch)|lass)|i(?:[fs]|n(?:stanceof)?|mport(?:all)?)|e(?:lse|xtends)|d(?:e(?:fault|lete|bugger)|o)|un(?:less|til)|o[fr]|return|break|while|switch|and)\b/], ['typ', /^(?:true|false|null|void)\b/], ['ctx', /^(?:th(?:is|at)|it|super|arguments|eval)\b/], ['glb', /^(?:Array|Boolean|Date|Error|Function|JSON|Math|Number|Object|RegExp|S(?:tring|yntaxError)|TypeError)\b(?![^\n\S]*:(?!:))/], ['var', /^[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*/], ['str', /^<(?!<)\[[^]*?]>/], ['lang-r', /^[^\/](\/(?![\s\/])[^[\/\n\\]*(?:(?:\\[^]|\[[^\]\n\\]*(?:\\[^][^\]\n\\]*)*])[^[\/\n\\]*)*\/[imgy]{0,4})(?!\w)/]]);
  hashbraces = ['lang-co', /^#{([^]*?)}/, '#'];
  regexes = ['lit', /^[^]+?/];
  tinge('qq', [hashbraces], [['str', /^[^]+?/]]);
  tinge('qr', [hashbraces], [['com', /^\s#(?!{).*/], regexes]);
  tinge('r', [], [regexes]);
  tinge('at', [['ctx', /^@+/, '@']], [['typ', /^\d+/]]);
}).call(this);
