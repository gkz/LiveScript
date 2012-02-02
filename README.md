# LiveScript
is a fork of [Coco](http://satyr.github.com/coco/), which is in turn derived from [CoffeeScript](http://coffeescript.org/). Like those two it compiles down to JavaScript. It will encompass various changes which may not be acceptable to the maintainers of Coco. I have thus changed the name from Coco to LiveScript (one of JavaScript's original names) as to avoid confusion between this and Coco on my system.

## Principles
- Do whatever I want.
- Haskell is awesome.
- Compiling to easy to understand JavaScript is less of a priority if it gets in the way of cool features.

## Changes

### 0.2.0 - Initial changes
- Switched so that `==` compiles into `===` and the converse, and also for the negatives. Rationale: I want to use the JavaScript `===` more often than `==` and less typing is better, also this makes things more similar to CoffeeScript which compiles `==` to `===` so there is less code for me to change. The compilation of `is` to `===` stays the same.

### 0.1.0 - Coco renamed
- Renamed everything from Coco and Coke to LiveScript and Slake, and file extension from .co to .ls. Rationale: I want to use both Coco and this on my system. In order for there to be minimal confusion for me, I have renamed this project. Rationale for names chosen: LiveScript was the name of JavaScript before it was named JavaScript - thus it seemed like an appropriate name, also few if any other project are named LiveScript. Slake becuase lake was taken and lsake sounds bad. 
