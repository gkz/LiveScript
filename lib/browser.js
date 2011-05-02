var type, sink, script, that, _i, _ref, _len;
Coco.stab = function(code, callback, error){
  try {
    Coco.run(code);
  } catch (e) {
    error = e;
  }
  return callback(error);
};
Coco.load = function(url, callback){
  var xhr;
  callback || (callback = function(){});
  xhr = new (self.ActiveXObject || XMLHttpRequest)('Microsoft.XMLHTTP');
  xhr.open('GET', url, true);
  if ('overrideMimeType' in xhr) {
    xhr.overrideMimeType('text/plain');
  }
  xhr.onreadystatechange = function(){
    var _ref;
    if (xhr.readyState === 4) {
      if ((_ref = xhr.status) === 200 || _ref === 0) {
        Coco.stab(xhr.responseText, callback);
      } else {
        callback(Error(url + ": " + xhr.status + " " + xhr.statusText));
      }
    }
  };
  xhr.send(null);
  return xhr;
};
type = /^(?:text\/|application\/)?coco$/i;
sink = function(error){
  return error && setTimeout(function(){
    throw error;
  });
};
for (_i = 0, _len = (_ref = document.getElementsByTagName('script')).length; _i < _len; ++_i) {
  script = _ref[_i];
  if (type.test(script.type)) {
    if (that = script.src) {
      Coco.load(that, sink);
    } else {
      Coco.stab(script.innerHTML, sink);
    }
  }
}