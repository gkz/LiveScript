{count, del, last} = CoffeeScript.helpers

array = [0, 1, 2, 3, 4]

eq 3, count '123 234 345', '3'

object = {1}
eq 1, del object, 1
ok 1 not of object

eq 4, last array
eq 2, last array, 2
