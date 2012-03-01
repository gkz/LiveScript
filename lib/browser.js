var type, sink, script, that, __i, __ref, __len;
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
    var __ref;
    if (xhr.readyState === 4) {
      if ((__ref = xhr.status) === 200 || __ref === 0) {
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
for (__i = 0, __len = (__ref = document.getElementsByTagName('script')).length; __i < __len; ++__i) {
  script = __ref[__i];
  if (type.test(script.type)) {
    if (that = script.src) {
      Coco.load(that, sink);
    } else {
      Coco.stab(script.innerHTML, sink);
    }
  }
}