var Coco;
(Coco = require('./coco')).require = require;
Coco.eval = function(code, options){
  return (0, eval)(Coco.compile(code, options));
};
Coco.run = function(code, options){
  options == null && (options = {});
  return Function(Coco.compile(code, (options.bare = true, options)))();
};
if (typeof window == 'undefined' || window === null) {
  return;
}
Coco.load = function(url, options){
  var xhr;
  xhr = new (self.ActiveXObject || XMLHttpRequest)('Microsoft.XMLHTTP');
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
if (self.addEventListener) {
  addEventListener('DOMContentLoaded', runScripts, false);
} else {
  attachEvent('onload', runScripts);
}
function runScripts(){
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
}