# LiveScript
is a fork of [Coco](http://satyr.github.com/coco/), which is in turn derived from [CoffeeScript](http://coffeescript.org/). Like those two it compiles down to JavaScript. It will encompass various changes which may not be acceptable to the maintainers of Coco. LiveScript is not currently ready for production use, as it is still developing and changing often.

## Overview
### Example
LiveScript:

    take = (n, [x, ...xs]:list) -> 
      | n <= 0       => []
      | !list.length => []
      | otherwise    => x & take (n - 1), xs
                                 
    take 2, [1 2 3 4 5] # [1, 2]
                                 
Compiled JavaScript:   

    var take, __slice = [].slice;
    take = function(n, list){
      var x, xs;
      x = list[0], xs = __slice.call(list, 1);
      switch (false) {
      case !(n <= 0):
        return [];
      case !!list.length:
        return [];
      default:
        return [(x)].concat(take(n - 1, xs));
      }
    };
    
    take(2, [1, 2, 3, 4, 5]); // [1, 2]

### Goals
- Increase code beauty.
- Make it easier than Coco to port code from CoffeeScript. 
- Provide succinct ways to accomplish frequent tasks. 

### Inspiration
- Haskell

### Name
LiveScript was one of the original names for JavaScript, so it seemed fitting. 

## Changes
### Comparison Table
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
    <td>Pipe Operator</td><td>N/A</td><td>=></td><td>|></td>
  </tr>
  <tr>
    <td>Bitwise &</td><td>&</td><td>&</td><td>&&&</td>
  </tr>
  <tr>
    <td>Bitwise |</td><td>|</td><td>|</td><td>|||</td>
  </tr>
  <tr>
    <td>Bitwise ^</td><td>^</td><td>^</td><td>^^^</td>
  </tr>
  <tr>
    <td>Bitwise &lt;&lt;</td><td>&lt;&lt;</td><td>&lt;&lt;</td><td>&lt;&lt;&lt;&lt;</td>
  </tr>
  <tr>
    <td>Bitwise >></td><td>>></td><td>>></td><td>>>>></td>
  </tr>
  <tr>
    <td>Bitwise >>></td><td>>>></td><td>>>></td><td>>>>>></td>
  </tr>
  <tr>
    <td>In</td><td>in</td><td>of</td><td>in</td>
  </tr>
  <tr>
    <td>Of</td><td>of</td><td>in</td><td>of</td>
  </tr>
  <tr>
    <td>Property Copy</td><td>N/A</td><td>&lt;&lt;&lt;</td><td>&lt;&lt;</td>
  </tr>
  <tr>
    <td>Property Copy</td><td>N/A</td><td>&lt;&lt;&lt;&lt;</td><td>&lt;&lt;&lt;</td>
  </tr>
  <tr>
    <td>Case</td><td>when</td><td>case</td><td>case OR |</td>
  </tr>
  <tr>
    <td>Then</td><td>then</td><td>then</td><td>then OR =></td>
  </tr>
  <tr>
    <td>List Concat</td><td>xs.concat ys</td><td>xs.concat ys</td><td>xs +++ ys</td>
  </tr>
  <tr>
    <td>Cons</td><td>[x].concat ys</td><td>[x].concat ys</td><td>x & ys</td>
  </tr>
</table>

### Changes: Detail and Rationale
- Renamed everything from Coco and Coke to LiveScript and Slake, and file extension from .co to .ls. Rationale: I want to use both Coco and this on my system. In order for there to be minimal confusion for me, I have renamed this project. Rationale for names chosen: LiveScript was the name of JavaScript before it was named JavaScript - thus it seemed like an appropriate name, also few if any other project are named LiveScript. Slake because lake was taken and lsake sounds bad. 
- Switched so that `==` compiles into `===` and the converse, and also for the negatives. Rationale: I want to use the JavaScript `===` more often than `==` and less typing is better, also this makes things more similar to CoffeeScript which compiles `==` to `===` so there is less code for me to change. The compilation of `is` to `===` stays the same.
- Switched `in` and `of` so that they are like in CoffeeScript. In goes over values, of over keys. Rationale: I don't have to change my CoffeeScript code, I'm used to it, and using `in` for checking if a value is in an array just seems right, using `of` just feels weird.
- All bitwise operators except `~` have changed to triple themselves and shifts have also expanded, eg. `&` is now `&&&` (see comparison table for full changes). Bitwise assign equals (eg. `&=`) have been removed. Rationale: I have never used the bitwise operators, I have rarely seen them used by others, they are not efficient since they must convert from floating points to integers and back, and they take up valuable symbols that could be used for other purposes. They are still available, just in a longer form. `~` is still there because I haven't gotten around to changing it yet - as it is unary changing it is a different proposition from the others. The way the bitwise operators have changed is modelled after how they are done in F#, a functional language which happens to have them unlike most functional languages. Note: the unary ^ clone operator is unchanged.
- `=>`, the pipe operator, is now `|>`. Rationale: `|>` is used to signify piping elsewhere (F#), free up => (for then alias), `|` is used as an alias for case.
- `<<<` is now `<<`, and `<<<<` is now `<<<`. Rationale: `<<` became available after the bitwise operator changes, and less typing is required with these changes.
- `|` is an alias for `case` (used in switch) Rationale: less typing, looks good. Modelled after Haskell's guards.
- `=>` is an alias for `then`. Rationale: will not be encouraged for use in if statements as it looks slightly odd - really for use in switch statements, when combined with `|`, to create a succinct and easy to understand structure. Based off of Haskell's use of -> in case expressions.  
- Added `otherwise` as a contextual keyword, when used after `case` or `|`, making that the default statement. Rationale: same as in Haskell. It allows `| otherwise => 4 + 9`, which fits in with the rest of the structure.
- Added implicit `switch` after `->` and `~>` when they are followed by case tokens (either `case` or `|`). Rationale: reduces typing and increases beauty in a common situation for using a switch, with no increase in ambiguity. 
- Added list concat operator, `+++`. Eg. `xs +++ ys` is `xs.concat(ys)`. Rationale: less typing, more beautiful, inspired by the ++ function in Haskell (had to use 3 pluses in order to avoid ambiguity with increment operator.)
- Added cons operator, `&`. It sticks the first item to the start of the second item (a list, or not, making a list). Eg. `x & ys` is `[x].concat(ys)`. Rationale: less typing, beauty, inspired by Haskell's `:` function.