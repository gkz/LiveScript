var type, sink, script, that, __i, __ref, __len;
LiveScript.stab = function(code, callback, filename, error){
  try {
    LiveScript.run(code, {
      filename: filename
    });
  } catch (e) {
    error = e;
  }
  return callback(error);
};
LiveScript.load = function(url, callback){
  var xhr;
  callback || (callback = function(){});
  xhr = new (self.ActiveXObject || XMLHttpRequest)('Microsoft.XMLHTTP');
  xhr.open('GET', url, true);
  if (__in('overrideMimeType', xhr)) {
    xhr.overrideMimeType('text/plain');
  }
  xhr.onreadystatechange = function(){
    var __ref;
    if (xhr.readyState === 4) {
      if ((__ref = xhr.status) == 200 || __ref == 0) {
        LiveScript.stab(xhr.responseText, callback, url);
      } else {
        callback(Error(url + ": " + xhr.status + " " + xhr.statusText));
      }
    }
  };
  xhr.send(null);
  return xhr;
};
type = /^(?:text\/|application\/)?ls$/i;
sink = function(error){
  error && setTimeout(function(){
    throw error;
  });
};
for (__i = 0, __len = (__ref = document.getElementsByTagName('script')).length; __i < __len; ++__i) {
  script = __ref[__i];
  if (type.test(script.type)) {
    if (that = script.src) {
      LiveScript.load(that, sink);
    } else {
      LiveScript.stab(script.innerHTML, sink, script.id);
    }
  }
}
function __in(x, arr){
  var i = 0, l = arr.length >>> 0;
  while (i < l) if (x === arr[i++]) return true;
  return false;
}