require! {
  path
}

strip-string = (val) ->
  if val.trim! == //^['"](.*)['"]$// then that.1 else val

name-from-path = (module-path) ->
  (path.basename strip-string module-path)
    .split '.' .0
    .replace /-[a-z]/ig, -> it.char-at 1 .to-upper-case!

module.exports = {
  name-from-path,
  strip-string
}
