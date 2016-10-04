require! {
    stream: {PassThrough}
    '../lib/repl'
}

function tab-complete input
    stdout-chunks.length = 0
    stdin.write input + '\t'
    ansi-lines = stdout-chunks.join '' .split '\r\n'
    stdin.write '\x03' unless input is ''
    plain-lines = ansi-to-plain ansi-lines
    if plain-lines.length > 1
        # If multiple lines came out of tab-completion, the first will be an
        # echo of the input, which we don't need to verify.
        plain-lines.=slice 1
    plain-lines.join '\n'


stdin = new PassThrough
stdout = new PassThrough <<< {+isTTY, columns: 80}
stdout-chunks = []
stdout.on \data -> stdout-chunks.push it

repl {} stdin, stdout

# Initial setup of some vars so we aren't depending on (an exact set of)
# builtins.
stdin.write '''
alpha-bravo = 1
alpha-charlie = 2
one-two-three-four = 1234
XXXXX_XXXX = {}
delta-echo = a-foxtrot: true, a-golf: false, apple: \\red

'''.replace /\n/g, '\r\n'


all-globals = tab-complete ''

object-builtins = tab-complete 'XXXXX_XXXX.'
object-builtins.=substr 0 object-builtins.last-index-of '\n'
object-builtins.=trim-right!
get-object-builtins = (prefix) ->
    object-builtins.replace /XXXXX_XXXX\./g, prefix

eq tab-complete('al'), '''
alpha-bravo    alpha-charlie

ls> alpha-'''

eq tab-complete('alpha-c'), 'ls> alpha-charlie'

eq tab-complete('1-'), all-globals + ' 1-'

eq tab-complete('one-'), 'ls> one-two-three-four'

eq tab-complete('oneTw'), 'ls> oneTwoThreeFour'

eq tab-complete('delta-echo. '), """
#{get-object-builtins 'delta-echo. '}

delta-echo. a-foxtrot               delta-echo. a-golf
delta-echo. apple

ls> delta-echo."""

eq tab-complete('delta-echo .a'), '''
delta-echo .a-foxtrot  delta-echo .a-golf     delta-echo .apple

ls> delta-echo .a'''

eq tab-complete('delta-echo.a-'), '''
delta-echo.a-foxtrot  delta-echo.a-golf

ls> delta-echo.a-'''

eq tab-complete('set-timeout f, delta-echo.'), """
#{get-object-builtins 'delta-echo.'}

delta-echo.a-foxtrot               delta-echo.a-golf
delta-echo.apple

ls> set-timeout f, delta-echo."""

eq tab-complete('set-timeout f, delta-echo.aF'), 'ls> set-timeout f, delta-echo.aFoxtrot'

eq tab-complete('delta-echo.=to-s'), 'ls> delta-echo.=to-string'

eq tab-complete('delta-echo~to-s'), 'ls> delta-echo~to-string'

stdin.end!


# A fairly dumb implementation of a tiny subset of ANSI codes, just enough to
# interpret tab-complete output.
function ansi-to-plain input-lines
    ansi = /\x1b\[(\d+)([GJ])/g
    for input-line in input-lines
        line = ''
        idx = 0
        while m = ansi.exec input-line
            line += input-line.substring idx, m.index
            idx = m.index + m.0.length
            switch m.2
            case \G => line.=substring 0, parseInt(m.1) - 1
        line += input-line.substring idx
        line.=trim-right!
        ansi.last-index = 0
        line
