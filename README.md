# Puzzlink user interface

This is a fork of [github.com/sabo2/pzprv3](https://github.com/sabo2/pzprv3),
which powers the great [pzv.jp](http://pzv.jp).

Read the upstream [README](https://github.com/sabo2/pzprv3/README.md) and
documentation for more information; documentation within this fork is
likely to be out of date for the start.

There are two reasons for the fork:

1. to implement bug fixes, minor improvements, new puzzle types towards
   pzprv3 and [pzprjs](https://github.com/sabo2/pzprjs). The intent
   is to collect these in the github forks
   [robx/pzprv3](https://github.com/robx/pzprv3) and
   [robx/pzprjs](https://github.com/robx/pzprjs).
2. to implement some larger architectural changes specific to
   [puzz.link](https://puzz.link), such as preview images for social
   sharing, recording of solving times, etc.

If you'd like to build on top of this, [sabo2/pzprv3] or [robx/pzprv3]
are probably the better starting point.


## About PUZ-PRE v3

PUZ-PRE v3 is the Web Application that is used to create or edit "pencil puzzles"
which we solve by the rules and questions boards.
At present, this project has a lot of puzzle genres which are mainly published by [nikoli][].

This script is developed against HTML5 features and JavaScript.

[nikoli]: http://nikoli.co.jp/

