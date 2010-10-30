{compact, count, flatten, del, last} = CoffeeScript.helpers

array = [0, 1, 2, 3, 4]

eq compact([false, 0, '', 1 % 0, null, void]).length, 0

eq 3, count '123 234 345', '3'

ay = true
ay and= typeof n is 'number' for n in flatten [0, [[1], 2], 3, [4]]
ok ay

object = {1}
eq 1, del object, 1
ok 1 not of object

eq 4, last array
eq 2, last array, 2
