# Regular expression literals.
ok /x/.test 'x'
ok 'x'.match /x/
eq /\\/.source, '\\\\'


# Should not be mixed-up with the division operator.
g = h = i = 2

eq g / h / i, 2 / 2 / 2

eq g/h/i, 2/2/2

eq [g][0]/h/i, (2)/2/2


eq /^I'm\s+Heregex?\/\/\//gim + '', ///
  ^ I'm \s+ Heregex? / // # or not
///gim + ''
eq '\\\\#{}\\\\\\\"', ///
 #{
   "#{ '\\' }" # normal comment
 }
 # regex comment
 \#{}
 \\ \"
///.source
eq ///  /// + '', '/(?:)/'


#584: Unescaped slashes in character classes.
ok /:\/[/]goog/.test 'http://google.com'


#764: Should be indexable.
eq /0/['source'], ///#{0}///['source']
