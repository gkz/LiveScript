var args, fso, i, it, co, js, _to;
args = WSH.arguments;
fso = WSH.createObject('Scripting.FileSystemObject');
for (i = 0, _to = args.length; i < _to; ++i) {
  it = args.item(i);
  co = fso.openTextFile(it, 1).readAll();
  js = Coco.compile(co);
  fso.openTextFile(it.replace(/(?:\.co)?$/, '.js'), 2, true).write(js);
}
i || WSH.echo('Usage: coco [files]');