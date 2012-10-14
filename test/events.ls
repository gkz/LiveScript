/* "Events" */
source = {}
pass = false
source :> !(e) -> pass := e
source <: true
ok pass

/* "Named Functions" */
pass = false
source = {}
set = !(e) -> pass := e
source :> set
source <: true
ok pass

/* "Unbind" */
pass = 0
source = {}
set = !(e) -> pass := e
source :> set
source <: 1
source -:> set
source <: 2
equal pass, 1

/* "Trigger with no handlers" */
source = {}
source <: true
ok true

/* "Remove with no handlers" */
source = {}
source -:> !(e) -> pass := e
ok true

/* "Events as new properties" */
pass = false
source = {}
source.event :> !(e) -> pass := e
source.event <: true
ok pass

/* "Event Advisors" */
pass = false
source = {}
source.event ?> !(e) -> pass := e
source.event <: true
ok pass

/* "Advise failure" */
pass = true
source = {}
source.event :> !-> pass = false
source.event ?> !-> throw {}
source.event <: {}
ok pass

/* "Advise updates event" */
pass = false
source = {}
source.event :> !(e) -> pass := e
source.event ?> -> true
source.event <: false
ok pass

/* "Trigger returns pass/fail" */
source = {}
if source.event <: {}
	ok true
source.event ?> -> throw {}
if ! (source.event <: {})
	ok true

/* "Exceptions available after failure" */
source = {}
source.event ?> -> throw {pass: true}
source.event <: {}
ok source.event.last.exception.pass

/* "Trigger multiple events" */
source = {}
source.event1 :> -> source.event1.pass = true
source.event2 :> -> source.event2.pass = true
source.event1 <: {}
source.event2 <: {}
ok source.event1.pass
ok source.event2.pass

/* "Unadvise" */
pass = 0
source = {}
set = !(e) -> pass := e
source ?> set
source <: 1
source -?> set
source <: 2
equal pass, 1

/* "Bind and trigger on [] accessors" */
pass = false
source = {}
event = "event"
source[event] :> !(e) -> pass := e
source[event] <: true
ok pass

/* "Observers and Advisors trigger in correct context" */
source = new -> 
	@pass = 0
	@
add = -> @pass++
source.event :> add
source.event ?> add
source.event <: {}
equal source.pass, 2

source = new ->
	@pass = 0
	@
add = -> @pass++
source[event] :> add
source[event] ?> add
source[event] <: {}
equal source.pass, 2

/* "Observers and Advisors remove in correct context" */
source = new -> 
	@pass = 0
	@
add = -> @pass++
source.event :> add
source.event ?> add
source.event -:> add
source.event <: {}
equal source.pass, 1

source = new ->
	@pass = 0
	@

source[event] :> add = -> @pass++
source[event] -:> add
source[event] ?> add
source[event] <: {}
equal source.pass, 1

/* "Observers and Advisors trigger in correct deep context" */
source = {}
source.child = new ->
	@pass = 0
	@

add = -> @pass++
source.child.event :> add
source.child.event ?> add
source.child.event <: {}
equal source.child.pass, 2

/* Use `this` as event source */
pass = false
@ :> -> pass := true
@ <: {}
ok pass

source = {}
source.count = 0
reminc = !->
	source -:> reminc
	source.count += 1
inc = !->
	source.count += 1
source :> reminc
source :> inc
source :> reminc
source <: {}
equal source.count, 3
