fs            = require 'fs'
CoffeeScript  = require './lib/coffee-script'
{spawn, exec} = require 'child_process'

# ANSI Terminal Colors.
red   = '\033[0;31m'
green = '\033[0;32m'
reset = '\033[0m'

# Run a CoffeeScript through our node/coffee interpreter.
run = (args) ->
  proc = spawn 'bin/coffee', args
  proc.stderr.on 'data', -> console.log "#{it}"
  proc       .on 'exit', -> process.exit 1 if it isnt 0

# Log a message with a color.
log = (message, color, explanation) ->
  console.log color + message + reset + ' ' + (explanation or '')

option '-p', '--prefix [DIR]', 'set the installation prefix for `cake install`'

task 'install', 'install Coco into /usr/local (or --prefix)', (options) ->
  base = options.prefix or '/usr/local'
  lib  = "#{base}/lib/coco"
  bin  = "#{base}/bin"
  node = "~/.node_libraries/coco"
  console.log "Installing Coco to #{lib}"
  console.log "Linking to #{node}"
  console.log "Linking 'coco' to #{bin}/coco"
  exec [
    "mkdir -p #{lib} #{bin}"
    "cp -rf bin lib LICENSE README.md package.json src #{lib}"
    "ln -sf #{lib}/bin/coffee #{bin}/coco"
    "ln -sf #{lib}/bin/cake #{bin}/coke"
    "mkdir -p ~/.node_libraries"
    "ln -sf #{lib}/lib #{node}"
  ].join(' && '), (err, stdout, stderr) ->
    if err then console.log stderr.trim() else log 'done', green


task 'build', 'build the CoffeeScript language from source', ->
  files = for file in fs.readdirSync('src') when /\.coffee$/.test file
    'src/' + file
  run ['-c', '-o', 'lib', files...]


task 'build:full', 'rebuild the source twice, and run the tests', ->
  exec 'bin/cake build && bin/cake build && bin/cake test', (err, stdout, stderr) ->
    console.log stdout.trim() if stdout
    console.log stderr.trim() if stderr
    throw err                 if err


task 'build:parser', 'rebuild the Jison parser (run build first)', ->
  require 'jison'
  {parser} = require './lib/grammar'
  fs.writeFile 'lib/parser.js', parser.generate()


task 'build:ultraviolet', 'build and install the Ultraviolet syntax highlighter', ->
  exec 'plist2syntax ../coffee-script-tmbundle/Syntaxes/CoffeeScript.tmLanguage', (err) ->
    throw err if err
    exec 'sudo mv coffeescript.yaml /usr/local/lib/ruby/gems/1.8/gems/ultraviolet-0.10.2/syntax/coffeescript.syntax'


task 'build:browser', 'rebuild the merged script for inclusion in the browser', ->
  code = ''
  code += """
    require['./#{name}'] = new function(){
      var exports = this;
      #{ fs.readFileSync "lib/#{name}.js" }
    };
  """ for name in <[ helpers rewriter lexer parser scope nodes
                     coffee-script browser ]>
  jsp = require 'uglifyjs/parse-js'
  pro = require 'uglifyjs/process'
  ast = jsp.parse """
    this.CoffeeScript = function(){
      function require(path){ return require[path] }
      #{code}
      return require['./coffee-script']
    }()
  """
  #ast = pro.ast_mangle ast
  fs.writeFileSync 'extras/coffee-script.js', """
    // Coco Compiler v#{CoffeeScript.VERSION}
    // http://github.com/satyr/coffee-script/tree/coco
    // Copyright 2010, Jeremy Ashkenas + satyr
    // Released under the MIT License

    #{ pro.gen_code pro.ast_squeeze ast }
  """
  invoke 'test:browser'

task 'doc:site', 'watch and continually rebuild the documentation for the website', ->
  exec 'rake doc', (err) ->
    throw err if err


task 'doc:source', 'rebuild the internal documentation', ->
  exec 'docco src/*.coffee && cp -rf docs documentation && rm -r docs', (err) ->
    throw err if err


task 'doc:underscore', 'rebuild the Underscore.coffee documentation page', ->
  exec 'docco examples/underscore.coffee && cp -rf docs documentation && rm -r docs', (err) ->
    throw err if err

task 'bench', 'quick benchmark of compilation time (of everything in src)', ->
  exec 'time bin/coffee -p src/ > /dev/null', (err, stdout, stderr) ->
    console.log stderr.trim()

task 'loc', 'count the lines of source code in the CoffeeScript compiler', ->
  sources = ['src/coffee-script.coffee', 'src/grammar.coffee', 'src/helpers.coffee', 'src/lexer.coffee', 'src/nodes.coffee', 'src/rewriter.coffee', 'src/scope.coffee']
  exec "cat #{ sources.join ' ' } | grep -v '^\\( *#\\|\\s*$\\)' | wc -l | tr -s ' '", (err, stdout) ->
    console.log stdout.trim()


runTests = (CoffeeScript) ->
  path = require 'path'
  startTime = Date.now()
  passedTests = failedTests = 0
  for all name, func of require 'assert' then do ->
    global[name] = ->
      func arguments...
      ++passedTests
  global.eq = global.strictEqual
  global.CoffeeScript = CoffeeScript
  process.on 'exit', ->
    time = ((Date.now() - startTime) / 1000).toFixed(2)
    message = "passed #{passedTests} tests in #{time} seconds#{reset}"
    if failedTests
    then log "failed #{failedTests} and #{message}", red
    else log message, green
  fs.readdir 'test', (err, files) ->
    files.forEach (file) ->
      return unless /\.coffee$/i.test file
      fs.readFile (fileName = path.join 'test', file), (err, code) ->
        try CoffeeScript.run code.toString(), {fileName}
        catch err
          ++failedTests
          log "failed #{fileName}", red, '\n' + err.stack

task 'test', 'run the CoffeeScript language test suite', ->
  runTests CoffeeScript

task 'test:browser', 'run the test suite against the merged browser script', ->
  runTests new -> eval fs.readFileSync 'extras/coffee-script.js', 'utf-8'
