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
  xhr.send(null);
  return xhr;
};
Coco.invoke = function(){
  var type, script, _i, _ref, _len;
  type = /^(?:text\/|application\/)?coco$/i;
  for (_i = 0, _len = (_ref = document.getElementsByTagName('script')).length; _i < _len; ++_i) {
    script = _ref[_i];
    if (!type.test(script.type)) {
      continue;
    }
    if (script.src) {
      Coco.load(script.src);
    } else {
      Coco.run(script.innerHTML);
    }
  }
};
if (typeof document != 'undefined' && document !== null) {
  (typeof addEventListener == 'function' ? addEventListener('DOMContentLoaded', Coco.invoke, false) : void 8) || attachEvent('onload', Coco.invoke);
}