# LiveScript
is a language which compiles to JavaScript. It has a straightforward mapping to JavaScript and allows you to write expressive code devoid of repetitive boilerplate. While LiveScript adds many features to assist in functional style programming, it also has many improvements for object oriented and imperative programming.

Check out **[livescript.net](http://livescript.net)** for more information, examples, usage, and a language reference.

### Build Status
[![Build Status](https://travis-ci.org/gkz/LiveScript.svg?branch=master)](https://travis-ci.org/gkz/LiveScript)

### Install
Have Node.js installed. `sudo npm install -g livescript`

After, run `lsc -h` for more information.

### Compilation, Livefile, Live and npm usage

To compile, you can use the `npm run`. The command will look like this:

`npm run [options]`

Here the options:

- `browser`: compile the lib into 2 files, `livescript.js` and `livescript.min.js`. You need to run `lib` before to be sure the lib is correctly build before.
- `clean`: remove the following directories: browser, lib and coverage.
- `coverage`: run istanbul to get the package coverage.
- `lib`: compile the lib itself, creating the lib directory and filling it up with all the js files composing the livescript lib.
- `package`: (re)generating the `package.json` from the `package.json.ls`.
- `test`: launch the test script. You need to compile the lib before if you want to test your last modifications.

### Source
[git://github.com/gkz/LiveScript.git](git://github.com/gkz/LiveScript.git)

### Community

If you'd like to chat, drop by [#livescript](irc://irc.freenode.net/livescript) on Freenode IRC.
If you don't have IRC client you can use Freenode [webchat](https://webchat.freenode.net/?channels=#livescript).
