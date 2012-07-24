var type, sink, i$, ref$, len$, script, that;
Coco.stab = function(code, callback, filename, error){
  var e;
  try {
    Coco.run(code, {
      filename: filename
    });
  } catch (e$) {
    e = e$;
    error = e;
  }
  return callback(error);
};
Coco.load = function(url, callback){
  var xhr;
  callback || (callback = function(){});
  xhr = new XMLHttpRequest;
  xhr.open('GET', url, true);
  if ('overrideMimeType' in xhr) {
    xhr.overrideMimeType('text/plain');
  }
  xhr.onreadystatechange = function(){
    var ref$;
    if (xhr.readyState === 4) {
      if ((ref$ = xhr.status) === 200 || ref$ === 0) {
        Coco.stab(xhr.responseText, callback, url);
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
  error && setTimeout(function(){
    throw error;
  });
};
for (i$ = 0, len$ = (ref$ = document.getElementsByTagName('script')).length; i$ < len$; ++i$) {
  script = ref$[i$];
  if (type.test(script.type)) {
    if (that = script.src) {
      Coco.load(that, sink);
    } else {
      Coco.stab(script.innerHTML, sink, script.id);
    }
  }
}