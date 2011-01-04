(function(){
  var title, docs, navi, sdcv, htms, __importAll = function(obj, src){ for (var key in src) obj[key] = src[key]; return obj };
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
    re = /^[^\n\S]*#(?!##[^#]|{) ?(.*)/;
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
    if (comment) {
      htm += block(name, comment, code, i);
    }
    return ("<h1>" + name + "</h1>") + htm + '<br clear=both>';
  }
  function block(name, comment, code, i){
    code && (code = "<pre class=\"code prettyprint lang-co\"\n >" + code.replace(/&/g, '&amp;').replace(/</g, '&lt;') + "</pre>");
    return "<div id=" + i + " class=block><div class=comment\n ><a class=anchor href=#" + name + i + ">#" + i + "</a\n >" + sdcv.makeHtml(comment) + "</div\n >" + code + "</div>";
  }
  PR.registerLangHandler(PR.createSimpleLexer([['str', /^\\\S[^\s,;)}\]]*/, 0, '\\'], ['str', /^'(?:''[\s\S]*?''|[^\\']*(?:\\.[^\\']*)*)'/, 0, '\''], ['str', /^"(?:""[\s\S]*?""|[^\\"]*(?:\\.[^\\"]*)*)"/, 0, '"'], ['lit', /^<\[[\s\S]*?]>/, 0, '<'], ['lit', /^(?:\/{3}[\s\S]+?\/{3}|\/(?!\s)[^[\/\n\\]*(?:(?:\\[\s\S]|\[[^\]\n\\]*(?:\\[\s\S][^\]\n\\]*)*])[^[\/\n\\]*)*\/)[imgy]{0,4}(?!\w)/, 0, '/'], ['com', /^\#(?:\##[^#][\s\S]*?###|.*)/, 0, '#'], ['pln', /^[\.@][$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*/, 0, '.@'], ['typ', /^(?:0x[\da-f]+|[1-9]\d?r[\da-z]+|(?:\d+(?:\.\d+)?)(?:e[+-]?\d+)?[a-z]*)/i, 0, '0123456789'], ['lang-js', /^`([^\\`]*(?:\\.[^\\`]*)*)`/, 0, '`']], [['kwd', /^(?:t(?:ry|h(?:row|en)|ypeof)|f(?:or(?:own)?|inally|unction)|n(?:ew|ot)|c(?:ontinue|a(?:se|tch)|lass)|i(?:f|n(?:stanceof)?|mport(?:all)?|s(?:nt)?)|e(?:lse|xtends)|d(?:e(?:fault|lete|bugger)|o)|un(?:less|til)|o[fr]|return|break|while|switch|and)\b(?![^\n\S]*:(?!:))/], ['typ', /^(?:true|false|null|void)\b(?![^\n\S]*:(?!:))/], ['pun', /^(?:(?:th(?:is|at)|it|super|arguments|eval)\b(?![^\n\S]*:(?!:))|@[@\d]?)/], ['tag', /^(?:Array|Boolean|Date|Error|Function|JSON|Math|Number|Object|RegExp|S(?:tring|yntaxError)|TypeError)\b(?![^\n\S]*:(?!:))/]]), ['co']);
}).call(this);
