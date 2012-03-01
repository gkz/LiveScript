var args, fso, i, it, co, js, __to;
args = WSH.arguments;
fso = WSH.createObject('Scripting.FileSystemObject');
for (i = 0, __to = args.length; i < __to; ++i) {
  it = args.item(i);
  co = fso.openTextFile(it, 1).readAll();
  js = Coco.compile(co);
  fso.openTextFile(it.replace(/(?:\.co)?$/, '.js'), 2, true).write(js);
}
i || WSH.echo('Usage: coco [files]');