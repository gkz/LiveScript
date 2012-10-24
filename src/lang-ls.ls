# LiveScript language plugin for
# [google-code-prettify](http://code.google.com/p/google-code-prettify/).
tint = (ext, shortcuts, fallthroughs) ->
  for rule in shortcuts when rule.length < 4 then rule.splice 2 0 0
  PR.registerLangHandler PR.createSimpleLexer(shortcuts, fallthroughs), [ext]

ident = /(?![\d\s])[$\w\xAA-\uFFDC](?:(?!\s)[$\w\xAA-\uFFDC]|-[A-Za-z])*/$
kwend = /(?!(?!\s)[$\w\xAA-\uFFDC]|-[A-Za-z])/$

### Main
tint \ls [
  [\str        // ^ '(?: ''[\S\s]*?'' | [^\\']*(?:\\[\S\s][^\\']*)* )'  // \']
  [\lang-ls-qq //(^ "(?: ""[\S\s]*?"" | [^\\"]*(?:\\[\S\s][^\\"]*)* )" )// \"]
  [\lang-ls-qr //(^ / / [\S\s]*? / / [gimy$?]{0,4} )// \/]
  [\lang-ls-at //(^ @@? #ident? )// \@]
  [\com /^#.*/ \#]
  [\typ // ^ (?
  : 0x[\da-f][\da-f_]*
  | (?:[2-9]|[12]\d|3[0-6]) r [\da-z][\da-z_]*
  | \d[\d_]*(?:\.\d[\d_]*)? (?:e[+-]?\d[\d_]*)? [\w$]*
  ) //i \0123456789]
  [\lang-js /^`([^\\`]*(?:\\[\S\s][^\\`]*)*)`/ \`]
] [
  [\str // ^ \\ \S [^\s,;)}\]]* //]
  [\com // ^ /\* [\S\s]* \*/ //]
  [\pln // ^ (?
  : \.{3}
  | (?: \.\s*(?:(?:[-+*/%&|^:]|>>>?|<<)?=|[~!@])?\s* | [)}\]?] | :: )
    (?: #ident[?~!@]? )+
  | #ident [^\n\S]* :(?![:=])
  ) //]
  # ref. [retrie](https://github.com/satyr/retrie)
  [\kwd // ^ (?![$_-]) (?
  : t(?:ry|h(?:row|en)|ypeof!?)
  | f(?:or(?:[^\n\S]+(?:own|ever))?|inally|unction)
  | n(?:ew|ot|o)
  | c(?:on(?:tinue|st)|a(?:se|tch)|lass)
  | i(?:[fs]|n(?:stanceof)?|mp(?:ort(?:[^\n\S]+all)?|lements))
  | e(?:lse|x(?:tends|port))
  | d(?:e(?:fault|lete|bugger)|o)
  | un(?:less|til)
  | w(?:hile|ith|hen)
  | s(?:witch|uper)
  | o[frn] | off | return | break | and | let | var | loop | yes
  ) #kwend //]
  [\typ // ^ (?: true | false | null | void ) #kwend //]
  [\ctx // ^ (?
  : t(?:h(?:is|at)|o|il)
  | f(?:rom|allthrough)
  | e(?:val)?
  | it | arguments | by | constructor | prototype | superclass
  ) #kwend //]
  [\glb // ^ (?
  : Array | Boolean | Date | Error | Function | JSON | Math | Number
  | Object | RegExp | S(?:tring|yntaxError) | TypeError
  | is(?:NaN|Finite) | parse(?:Int|Float) | (?:en|de)codeURI(?:Component)?
  ) #kwend //]
  [\var // ^ #ident //]
  [\str /^<\[[\S\s]*?]>/]
  [\lang-ls-r // ^ [^/] (
    / (?![\s/])
    [^ [ / \n \\ ]*
    (?:
      (?: \\.
        | \[ [^\]\n\\]*(?:\\.[^\]\n\\]*)* \]
      ) [^ [ / \n \\ ]*
    )* / [gimy$]{0,4}
  ) (?!\d) //]
]

### Subrules
interps = [\lang-ls // ^# ({[\S\s]*?} | #ident) // \#]
regexes = [\lit /^[\S\s]+?/]

tint \ls-qq [interps] [[\str /^[\S\s]+?/]]
tint \ls-qr [interps] [[\com /^\s#(?!{).*/] regexes]
tint \ls-r  [] [regexes]

tint \ls-at [[\ctx /^@+/ \@]] []
