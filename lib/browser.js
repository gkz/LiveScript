var type, sink, i$, ref$, len$, script, that;
LiveScript.stab = function(code, callback, filename, error){
  var e;
  try {
    LiveScript.run(code, {
      filename: filename
    });
  } catch (e$) {
    e = e$;
    error = e;
  }
  return callback(error);
};
LiveScript.load = function(url, callback){
  var xhr;
  callback || (callback = function(){});
  xhr = new XMLHttpRequest;
  xhr.open('GET', url, true);
  if (in$('overrideMimeType', xhr)) {
    xhr.overrideMimeType('text/plain');
  }
  xhr.onreadystatechange = function(){
    var ref$;
    if (xhr.readyState === 4) {
      if ((ref$ = xhr.status) == 200 || ref$ == 0) {
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
for (i$ = 0, len$ = (ref$ = document.getElementsByTagName('script')).length; i$ < len$; ++i$) {
  script = ref$[i$];
  if (type.test(script.type)) {
    if (that = script.src) {
      LiveScript.load(that, sink);
    } else {
      LiveScript.stab(script.innerHTML, sink, script.id);
    }
  }
}
function in$(x, arr){
  var i = 0, l = arr.length >>> 0;
  while (i < l) if (x === arr[i++]) return true;
  return false;
}