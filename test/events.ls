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
source.event :> -> pass = false
source.event ?> -> throw {}
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
