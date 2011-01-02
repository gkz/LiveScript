var navi, docs, sdcv, htms, load, build, block;
navi = document.getElementById('navi');
docs = document.getElementById('docs');
sdcv = new Showdown.converter;
htms = {
  __proto__: null
};
(this.onhashchange = function(){
  var page, name, that, xhr;
  if (!(page = /^\D+(?=(\d*)$)/.exec(location.hash.slice(1)))) {
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
  xhr.open('GET', name + '.co', true);
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
load = function(_arg, html){
  var name, sect;
  name = _arg[0], sect = _arg[1];
  document.title = name + ' - Coco Docs';
  docs.innerHTML = html;
  if (sect) {
    document.getElementById(sect).scrollIntoView();
  }
  return prettyPrint();
};
build = function(name, source){
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
  return ("<h1>" + name + "</h1>") + htm;
};
block = function(name, comment, code, i){
  code && (code = "<pre class=\"code prettyprint lang-co\"\n >" + code.replace(/&/g, '&amp;').replace(/</g, '&lt;') + "</pre>");
  return "<div id=" + i + " class=block><div class=comment\n ><a class=anchor href=#" + name + i + ">#" + i + "</a\n >" + sdcv.makeHtml(comment) + "</div\n >" + code + "</div>";
};
PR.registerLangHandler(PR.createSimpleLexer([['str', /^\\\S[^\s,;)}\]]*/, 0, '\\'], ['str', /^'(?:''[\s\S]*?''|[^\\']*(?:\\.[^\\']*)*)'/, 0, '\''], ['str', /^"(?:""[\s\S]*?""|[^\\"]*(?:\\.[^\\"]*)*)"/, 0, '"'], ['lit', /^`[^\\`]*(?:\\.[^\\`]*)*`/, 0, '`'], ['lit', /^<\[[\s\S]*?]>/, 0, '<'], ['lit', /^(?:\/{3}[\s\S]+?\/{3}|\/(?!\s)[^[\/\n\\]*(?:(?:\\[\s\S]|\[[^\]\n\\]*(?:\\[\s\S][^\]\n\\]*)*])[^[\/\n\\]*)*\/)[imgy]{0,4}(?!\w)/, 0, '/'], ['com', /^\#(?:\##[^#][\s\S]*?###|.*)/, 0, '#'], ['typ', /^(?:0x[\da-f]+|[1-9]\d?r[\da-z]+|(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?[a-z]*)/i, 0, '0123456789.']], [['kwd', /^(?:t(?:ry|h(?:row|en)|ypeof)|f(?:or(?:own)?|inally|unction)|n(?:ew|ot)|c(?:ontinue|a(?:se|tch)|lass)|i(?:f|n(?:stanceof)?|mport(?:all)?|s(?:nt)?)|e(?:lse|xtends)|d(?:e(?:fault|lete|bugger)|o)|un(?:less|til)|o[fr]|return|break|while|switch|and)\b/], ['typ', /^(?:true|false|null|void|this|super)\b/]]), ['co']);