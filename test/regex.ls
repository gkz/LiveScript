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

# [coffee#3059](https://github.com/jashkenas/coffee-script/pull/3059)
# Keep escaped whitespaces.
ok  //^
  a \ b　\　c \
  d
$//test 'a b\u3000c\nd'

eq '(?:)' ////source

eq // _ #{if 1 then \g else \m}//? + '', '/_/g'

eq /\//source, //\///source

# Should work nested.
eq \01234 // 0 #{
  // 1 #{ //2//source } 3 //source
} 4 //source

let this = \THIS
  ok //^ \\##@#this $//test //\#THISTHIS//source


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

# [gkz/LiveScript#946](https://github.com/gkz/LiveScript/issues/946)
# It's almost, but not quite true, that $ is equivalent to a more efficient
# .source. What $ actually does is return the string that LiveScript would be
# passing to the RegExp constructor, were the $ flag absent. There are some cases
# where a LiveScript regular expression literal can correspond to a source string
# that is not as fully escaped as a standards-compliant implementation of .source
# would produce, yet is close enough to feed to RegExp anyway. In such cases,
# the $-flagged expression will be different than the result of .source. (The
# third test case below is such an example.) Note also that the implementation
# of .source may vary based on the JS engine this test is running on; earlier
# versions of Node.js would return .source strings with less escaping than modern
# engines. For these reasons, it's important to always compare a .source with
# another .source in these tests, instead of comparing the $-flagged expression
# to .source as previous versions of these tests did.

source-eq = (s, r) -> eq new RegExp(s).source, r.source

source-eq      /\\\//$      /\\\//
source-eq    //\\\///$    //\\\///
source-eq //#{\\}\///$ //#{\\}\///
