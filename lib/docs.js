(function(){
  var navi, docs, sdcv, htms, load, build, block;
  navi = document.getElementById('navi');
  docs = document.getElementById('docs');
  sdcv = new Showdown.converter;
  htms = {
    __proto__: null
  };
  (this.onhashchange = function(){
    var page, name, xhr;
    if (!(page = /^\D+(?=(\d*)$)/.exec(location.hash.slice(1)))) {
      navi.className = docs.innerHTML = '';
      return;
    }
    navi.className = 'menu';
    docs.innerHTML = '...';
    name = page[0];
    if (name in htms) {
      return load(page, htms[name]);
    }
    xhr = new XMLHttpRequest;
    xhr.open('GET', name + '.co', true);
    if (typeof xhr.overrideMimeType == 'function') {
      xhr.overrideMimeType('text/plain');
    }
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4) {
        return load(page, htms[name] = ("<h1>" + name + "</h1>") + build(xhr.responseText));
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
  build = function(source){
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
          htm += block(comment, code, i++);
          comment = code = '';
        }
        comment += that[1] + '\n';
      } else {
        code += line + '\n';
      }
      br = false;
    }
    if (comment) {
      htm += block(comment, code, i);
    }
    return htm;
  };
  block = function(comment, code, i){
    code && (code = "<pre class=\"code prettyprint lang-coffee\"\n >" + code.replace(/&/g, '&amp;').replace(/</g, '&lt;') + "</pre>");
    return "<div id=" + i + " class=block><div class=comment\n ><a class=anchor href=#" + name + i + ">#" + i + "</a\n >" + sdcv.makeHtml(comment) + "</div\n >" + code + "</div>";
  };
}).call(this);
