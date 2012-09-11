source = {}
pass = false
source :> (e) -> pass := e
source <: true
ok pass

pass = false
source = {}
set = (e) -> pass := e
source :> set
source <: true
ok pass

pass = 0
source = {}
set = (e) -> pass := e
source :> set
source <: 1
source -:> set
source <: 2
equal pass, 1

source = {}
source <: true
ok true

source = {}
source -:> (e) -> pass := e
ok true

pass = false
source = {}
source.event :> (e) -> pass := e
source.event <: true
ok pass

pass = false
source = {}
source.event ?> (e) -> pass := e
source.event <: true
ok pass

pass = true
source = {}
source.event :> -> pass = false
source.event ?> -> throw {}
source.event <: {} 
ok pass

pass = false
source = {}
source.event :> (e) -> pass := e
source.event ?> -> true
source.event <: false
ok pass

source = {}
if source.event <: {}
	ok true
source.event ?> -> throw {}
if ! source.event <: {}
	ok true

source = {}
source.event ?> -> throw {pass: true}
source.event <: {}
ok source.event.last.exception.pass

source = {}
source.event1 :> -> source.event1.pass := true
source.event2 :> -> source.event2.pass := true
source.event1 <: {}
source.event2 <: {}
ok source.event1.pass
ok source.event2.pass

pass = 0
source = {}
set = (e) -> pass := e
source ?> set
source <: 1
source -?> set
source <: 2
equal pass, 1

pass = false
source = {}
event = "event"
source[event] :> (e) -> pass := e
source[event] <: true
ok pass

source = new -> 
	@pass = 0
	@
add = -> @pass++
source.event :> add
source.event ?> add
source.event <: {}
equal source.pass, 2
