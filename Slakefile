{spawn, exec} = require \child_process

# ANSI Terminal Colors.
bold  = '\33[0;1m'
red   = '\33[0;31m'
green = '\33[0;32m'
reset = '\33[0m'

tint = (text, color ? green) -> color + text + reset

# Run our node/livescript interpreter.
run = (args) ->
  proc = spawn \node [\bin/livescript] +++ args
  proc.stderr.on \data say
  proc       .on \exit -> process.exit it if it

shell = (command) ->
  err, sout, serr <- exec command
  process.stdout.write sout if sout
  process.stderr.write serr if serr
  console.log err if err

slobber = (path, code) ->
  spit path, code
  say '* ' + path

minify = ->
  {parser, uglify} = require \uglify-js
  ast = parser.parse it
  ast = uglify.ast_mangle  ast
  ast = uglify.ast_squeeze ast
  uglify.gen_code ast


task \install 'install LiveScript via npm' -> shell 'npm install -g .'

task \build 'build lib/ from src/' ->
  ext = /\.ls$/
  sources = for file in dir \src
    \src/ + file if ext.test file
  run [\-bco \lib] +++ sources

task \build:full 'build twice and run tests' ->
  shell 'bin/slake build && bin/slake build && bin/slake test'

task \build:parser 'build lib/parser.js from lib/grammar.js' ->
  spit \lib/parser.js,
    require(\./lib/grammar)generate!
      .replace /^[^]+?var (?=parser = {)/ \exports.
      .replace /\ncase \d+:\nbreak;/g ''
      .replace /return parser;[^]+/ ''
      .replace /(:[^]+?break;)(?=\ncase \d+\1)/g \:
      .replace /(:return .+)\nbreak;/g \$1

task \build:browser 'build extras/' ->
  LiveScript = require \./lib/livescript
  co = ''
  for name in <[ lexer ast livescript ]>
    code = slurp("src/#name.ls")replace /\n/g '\n '
    co += "let exports = require'./#name' = {}\n#code\n"
  fs.writeFile \extras/livescript.raw.js js = """
    this.LiveScript = function(){
    function require(path){ return require[path] }
    var exports = require['./parser'] = {}; #{ slurp \lib/parser.js }
    #{ LiveScript.compile co, {+bare} }
    return require['./livescript']
    }()
    this.window && function(){\n#{ slurp \lib/browser.js }\n}()
    this.LiveScript
  """
  slobber \extras/livescript.js """
    // LiveScript #{LiveScript.VERSION}
    // Copyright (c) 2012 Jeremy Ashkenas, Satoshi Murakami, George Zahariev
    // Released under the MIT License
    // raw.github.com/gkz/LiveScript/master/LICENSE
    #{ minify js };

  """
  invoke \test:browser


coreSources = -> ["src/#src.ls" for src in <[ livescript grammar lexer ast ]>]

task \bench 'quick benchmark in compilation time' ->
  LiveScript   = require \./lib/livescript
  co     = coreSources!map(-> slurp it)join \\n
  fmt    = -> "#bold#{ "   #it"slice -4 }#reset ms"
  total  = nc = 0
  now    = Date.now!
  time   = -> total += ms = -(now - now := Date.now!); fmt ms
  tokens = LiveScript.lex co
  msg    = "Lex     #{time!} (#{tokens.length} tokens)\n"
  LiveScript.tokens.rewrite tokens
  msg   += "Rewrite #{time!} (#{tokens.length} tokens)\n"
  tree   = LiveScript.ast tokens
  msg   += "Parse   #{time!} (%s nodes)\n"
  js     = tree.compileRoot {+bare}
  msg   += "Compile #{time!} (#{js.length} chars)\n" +
           "TOTAL   #{ fmt total }"
  tree.traverseChildren (-> ++nc; void), true
  console.log msg, nc

task \loc 'count the lines in main compiler code' ->
  count = 0; line = /^[^\n\S]*[^#\s]/mg
  while line.test [code for code in coreSources!map -> slurp it] then ++count
  console.log count


task \test 'run test/' -> runTests require \./lib/livescript

task \test:browser 'run test/ against extras/livescript.js' ->
  runTests (new new Function slurp \extras/livescript.js)LiveScript

task \test:json 'test JSON {de,}serialization' ->
  {ast} = require \./lib/livescript
  json = ast slurp \src/ast.ls .stringify!
  code = ast.parse json .compileRoot {+bare}
  exec 'diff -u lib/ast.js -' (e, out) -> say e || out.trim! || tint \ok
  .stdin.end code

function runTests global.LiveScript
  startTime = Date.now!
  passedTests = failedTests = 0
  for name, func of require \assert then let
    global[name] = -> func ...; ++passedTests
  global <<<
    eq: strictEqual
    throws: !(msg, fun) ->
      try do fun catch return eq e?message, msg
      ok false "should throw: #msg"
    compileThrows: !(msg, lno, code) ->
      throws "#msg on line #lno" !-> LiveScript.compile code
  process.on \exit ->
    time = ((Date.now! - startTime) / 1e3)toFixed 2
    message = "passed #passedTests tests in #time seconds"
    say if failedTests
    then tint "failed #failedTests and #message" red
    else tint message
  dir(\test)forEach (file) ->
    return unless /\.ls$/i.test file
    code = slurp filename = path.join \test file
    try LiveScript.run code, {filename} catch
      ++failedTests
      return say e unless stk = e?stack
      msg = e.message or ''+ /^[^]+?(?=\n    at )/exec stk
      if m = /^(AssertionError:) "(.+)" (===) "(.+)"$/exec msg
        for i in [2 4] then m[i] = tint m[i]replace(/\\n/g \\n), bold
        msg  = m.slice(1)join \\n
      [, row, col]? = //#filename:(\d+):(\d+)\)?$//m.exec stk
      if row and col
        say tint "#msg\n#{red}at #filename:#{row--}:#{col--}" red
        code = LiveScript.compile code, {+bare}
      else if /\bon line (\d+)\b/exec msg
        say tint msg, red
        row = that.1 - 1
        col = 0
      else return say stk
      {(row): line} = lines = code.split \\n
      lines[row] = line.slice(0 col) + tint line.slice(col), bold
      say lines.slice(row-8 >? 0, row+9)join \\n
