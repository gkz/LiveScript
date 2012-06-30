ok /x/.test 'x'
ok 'x'.match /x/
eq /\\/ + '', '/\\\\/'
eq /^/.source, '^'


# Should not be mixed-up with the division operator.
g = h = i = 2

eq g / h / i, 2 / 2 / 2

eq g/h/i, 2/2/2

eq [g][0]/h/i, (2)/2/2

eq 2, g /= h / i

eq \=, /=/. source
eq ' ' (/ /)source


compileThrows 'unterminated regex' 1 '/1'


# Should be cached aptly.
eq 0 (/_/ <<< {0}).0


# Should accuse duplicate flag.
compileThrows 'duplicate regex flag `g`' 1 '/^/gg'


# Should be ASI safe.
/ /
[0][0]


# ACI interaction
eq \/1/ '0'.replace //#{0}// ''+/1/ \g


# ADI interaction
eq true, /a/itest \A


### Heregex
eq /^I'm\s+Heregex?\/\//gim + '', //
  ^ I'm \s+ Heregex? / / # or not
//gim + ''

eq '\\\\#{}\\\\\\\"', //
 #{
   "#{ '\\' }" # normal comment
 }
 # regex comment
 \#{}
 \\ \"
//.source

eq '(?:)' ////source

eq // _ #{if 1 then \g else \m}//? + '', '/_/g'

eq /\//source, //\///source

# Should work nested.
eq \01234 // 0 #{
  // 1 #{ //2//source } 3 //source
} 4 //source

with \THIS
  ok //^ \\##this $//test //\#THIS//source


# [coffee#584](https://github.com/jashkenas/coffee-script/issues/584)
# Unescaped slashes in character classes.
ok /:\/[/]goog/.test 'http://google.com'


# [coffee#764](https://github.com/jashkenas/coffee-script/issues/764)
# Should be indexable.
eq /0/['source'], //#{0}//['source']


### $ flag
eq \string typeof /^$/$
eq \string typeof //^$//$
eq \string typeof //^#{''}$//$

eq      /\\\//$      /\\\//source
eq    //\\\///$    //\\\///source
eq //#{\\}\///$ //#{\\}\///source
