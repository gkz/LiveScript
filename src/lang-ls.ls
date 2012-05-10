# LiveScript language plugin for
# [google-code-prettify](http://code.google.com/p/google-code-prettify/).
tint = (ext, shortcuts, fallthroughs) ->
  rule.splice 2 0 0 if rule.length < 4 for rule in shortcuts
  PR.registerLangHandler PR.createSimpleLexer(shortcuts, fallthroughs), [ext]

ident = /(?:[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*)/$
kwend = /(?![$\w\x7f-\uffff])/$

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
  | \d[\d_]*(?:\.\d[\d_]*)? (?:e[+-]?\d[\d_]*)? [a-z_]*
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
  [\kwd // ^ (?
  : t(?:ry|h(?:row|en)|ypeof!?)
  | f(?:or(?:[^\n\S]+(?:own|ever))?|inally|unction)
  | n(?:ew|ot)
  | c(?:ontinue|a(?:se|tch)|lass)
  | i(?:[fs]|snt|n(?:stanceof)?|mport(?:[^\n\S]+all)?)
  | e(?:lse|x(?:tends|port))
  | d(?:e(?:fault|lete|bugger)|o)
  | un(?:less|til)
  | w(?:hile|ith|hen)
  | o[fr] | return | break | switch | and | let
  ) #kwend //]
  [\typ // ^ (?: true | false | null | void ) #kwend //]
  [\ctx // ^ (?
  : t(?:h(?:is|at)|o|il)
  | f(?:rom|allthrough)
  | it | arguments | eval | by | super | prototype
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
