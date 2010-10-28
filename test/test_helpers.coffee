{starts, ends, compact, count, merge, flatten, del, last} = CoffeeScript.helpers

array  = [0, 1, 2, 3, 4]
string = array.join ''

# Test `starts`
ok starts string, '012'
ok starts string, '34', 3
ok not starts string, '42'
ok not starts string, '42', 6

# Test `ends`
ok ends string, '234'
ok ends string, '01', 3
ok not ends string, '42'
ok not ends string, '42', 6

# Test `flatten`
ay = true
(ay and= typeof n is 'number') for n in flatten [0, [[1], 2], 3, [4]]
ok ay

# Test `del`
object = {1}
eq 1, del object, 1
ok 1 not of object

# Test `last`
eq 4, last array
eq 2, last array, 2
