# LiveScript
is a fork of [Coco](http://satyr.github.com/coco/), which is in turn derived from [CoffeeScript](http://coffeescript.org/). Like those two it compiles down to JavaScript. It will encompass various changes which may not be acceptable to the maintainers of Coco. I have thus changed the name from Coco to LiveScript (one of JavaScript's original names) as to avoid confusion between this and Coco on my system.

## Principles
- Do whatever I want.
- Make it easier to port code from CoffeeScript. 
- Haskell is awesome.
- Compiling to easy to understand JavaScript is less of a priority if it gets in the way of cool features.

## Comparison 
<table>
  <tr>
    <th></th><th>CoffeeScript</th><th>Coco</th><th>LiveScript</th>
  </tr>
  <tr>
    <td>Command Line</td><td>coffee</td><td>coco</td><td>livescript</td>
  </tr>
  <tr>
    <td>Build</td><td>cake</td><td>coke</td><td>slake</td>
  </tr>
  <tr>
    <td>File Extension</td><td>.coffee</td><td>.co</td><td>.ls</td>
  </tr>
  <tr>
    <td>Strict Equality</td><td>==</td><td>===</td><td>==</td>
  </tr>
  <tr>
    <td>Pipe Operator</td><td>N/A</td><td>=></td><td>|</td>
  </tr>
  <tr>
    <td>Bitwise</td><td>&</td><td>&</td><td>&^&</td>
  </tr>
  <tr>
    <td>Bitwise</td><td>>>></td><td>>>></td><td>&^>>></td>
  </tr>
  <tr>
    <td>In</td><td>in</td><td>of</td><td>in</td>
  </tr>
  <tr>
    <td>Of</td><td>of</td><td>in</td><td>of</td>
  </tr>
</table>

## Changes

### 0.2.0 - Operators renamed/modified
- Switched so that `==` compiles into `===` and the converse, and also for the negatives. Rationale: I want to use the JavaScript `===` more often than `==` and less typing is better, also this makes things more similar to CoffeeScript which compiles `==` to `===` so there is less code for me to change. The compilation of `is` to `===` stays the same.
- Switched `in` and `of` so that they are like in CoffeeScript. In goes over values, of over keys. Rationale: I don't have to change my CoffeeScript code, I'm used to it, and using `in` for checking if a value is in an array just seems right, using `of` just feels weird.
- All bitwise operators except `~` are now prefixed with &^, thus `&` is now `&^&`. Bitwise assign equals (eg. `&=`) have been removed. Rationale: I have never used the bitwise operators, I have rarely seen them used by others, they are not efficient since they must convert from floating points to integers and back, and they take up valuable symbols that could be used for other purposes. They are still available, just in a more awkward form. `~` is still there because I haven't gotten around to changing it yet - as it is unary changing it is a different proposition from the others. Note: the unary ^ clone operator is unchanged.
- `=>`, the pipe operator, is now `|`, the pipe. Rationale: the pipe character is often used for piping. This is one of the fruits of the bitwise operator changes.

### 0.1.0 - Coco renamed
- Renamed everything from Coco and Coke to LiveScript and Slake, and file extension from .co to .ls. Rationale: I want to use both Coco and this on my system. In order for there to be minimal confusion for me, I have renamed this project. Rationale for names chosen: LiveScript was the name of JavaScript before it was named JavaScript - thus it seemed like an appropriate name, also few if any other project are named LiveScript. Slake because lake was taken and lsake sounds bad. 
