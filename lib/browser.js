(function(){
  var Coco, runScripts;
  Coco = require('./coco');
  Coco.require = require;
  Coco.eval = function(){
    return eval(Coco.compile(arguments[0], arguments[1]));
  };
  Coco.run = function(code, options){
    options == null && (options = {});
    options.bare = true;
    return Function(Coco.compile(code, options))();
  };
  if (typeof window == 'undefined' || window === null) {
    return 0;
  }
  Coco.load = function(url, options){
    var xhr;
    xhr = new (window.ActiveXObject || XMLHttpRequest)('Microsoft.XMLHTTP');
    xhr.open('GET', url, true);
    if ('overrideMimeType' in xhr) {
      xhr.overrideMimeType('text/plain');
    }
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4) {
        return Coco.run(xhr.responseText, options);
      }
    };
    return xhr.send(null);
  };
  runScripts = function(){
    var script, _i, _ref, _len;
    for (_i = 0, _len = (_ref = document.getElementsByTagName('script')).length; _i < _len; ++_i) {
      script = _ref[_i];
      if (script.type !== 'text/coco') {
        continue;
      }
      if (script.src) {
        Coco.load(script.src);
      } else {
        Coco.run(script.innerHTML);
      }
    }
    return null;
  };
  if (window.addEventListener) {
    addEventListener('DOMContentLoaded', runScripts, false);
  } else {
    attachEvent('onload', runScripts);
  }
}).call(this);
