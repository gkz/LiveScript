(function(){
  var build, docs, htmls, load, navi, navigate;
  navi = document.getElementById('navi');
  docs = document.getElementById('docs');
  htmls = {};
  build = function(page, source){
    var blocks, br, code, comm, html, i, line, m, name, re, _i, _len, _ref;
    name = page[0];
    blocks = [];
    comm = code = '';
    re = /^[^\n\S]*#(?!##[^#]|{) *(.*)/;
    br = true;
    for (_i = 0, _len = (_ref = source.split('\n')).length; _i < _len; ++_i) {
      line = _ref[_i];
      if (!line) {
        br = true;
        if (code) {
          code += '\n';
        }
        continue;
      }
      if (m = re.exec(line)) {
        if (code || comm && br) {
          blocks.push([comm, code]);
          comm = code = '';
        }
        comm += m[1] + '\n';
      } else {
        code += line + '\n';
      }
      br = false;
    }
    if (comm) {
      blocks.push([comm, code]);
    }
    html = "<h2>" + name + "</h2>";
    for (i = 0, _len = blocks.length; i < _len; ++i) {
      _ref = blocks[i], comm = _ref[0], code = _ref[1];
      html += "<div id=" + i + " class=section>\n<div class=comment>\n  <a class=anchor href=#" + name + i + ">#" + i + "</a>\n  " + new Showdown.converter().makeHtml(comm) + "\n</div>\n<pre class=\"code prettyprint lang-coffee\">" + code.replace(/&/g, '&amp;').replace(/</g, '&lt;') + "</pre>\n</div>";
    }
    return load(page, htmls[name] = html);
  };
  load = function(_arg, html){
    var name, sect;
    name = _arg[0], sect = _arg[1];
    document.title = name + ' - Coco Docs';
    docs.innerHTML = html;
    docs.style.display = 'block';
    if (sect) {
      document.getElementById(sect).scrollIntoView();
    }
    return prettyPrint();
  };
  (this.onhashchange = navigate = function(){
    var name, page, xhr;
    docs.style.display = 'none';
    if (!(page = /^\D+(?=(\d*)$)/.exec(location.hash.slice(1)))) {
      navi.className = '';
      return;
    }
    navi.className = 'menu';
    name = page[0];
    if (name in htmls) {
      load(page, htmls[name]);
      return;
    }
    xhr = new XMLHttpRequest;
    xhr.open('GET', name + '.coffee', true);
    if (typeof xhr.overrideMimeType == "function") {
      xhr.overrideMimeType('text/plain');
    }
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4) {
        return build(page, xhr.responseText);
      }
    };
    return xhr.send(null);
  })();
}).call(this);
