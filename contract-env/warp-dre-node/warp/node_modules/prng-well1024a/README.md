# well1024a.js

[![NPM](https://nodei.co/npm/prng-well1024a.png)](https://nodei.co/npm/prng-well1024a/)

This is a Javascript implementation of the
[WELL-1024a](http://en.wikipedia.org/wiki/Well_equidistributed_long-period_linear)
pseudorandom number generation algorithm.

Javascript's built-in `Math.random()` function is
[implementation-dependent](http://www.ecma-international.org/publications/standards/Ecma-262.htm)
and therefore of limited usefulness if your program depends on random
numbers, as you risk running into crappy implementations.  Even the V8
engine (used by Node.js) only provides 32-bit entropy, and is based on
the platform-dependent C++ `rand()` function.

This module is very bare-bones.  I have also written a randomness library called
[randy](http://github.com/deestan/randy.git) that provides useful functions like
`RandInt(min, max)`, `shuffle(array)` etc., based on this module.

## Quick Example

```javascript
var rng = well1024a();
var number = rng.getUInt32();
var coin = ['heads', 'tails'][number % 2];
// coin == 'heads'
```

<a name="Download" />
## Download

For [Node.js](http://nodejs.org/), use [npm](http://npmjs.org/):

    npm install prng-well1024a

<a name="browser" />
### In the Browser

Download and include as a `<script>`.  The module will be available as
the global object `randy`.

__Development:__ [well1024a.js](https://github.com/deestan/well1024a/raw/master/browser/well1024a.js) - 2Kb Uncompressed

__Production:__ [well1024a.min.js](https://github.com/deestan/well1024a/raw/master/browser/well1024a.min.js) - < 1Kb Minified

__Example__

```html
<script src="well1024a.min.js"></script>

I am <span id="age"></span> years old!

<script>
    var n = document.getElementById("age");
    var myAge = well1024a.getUInt32();
    n.innerText = myAge.toString();
</script>
```

## Documentation

### Constructor

* [well1024a](#well1024a)

### Instance Functions

* [getUInt32](#getUInt32)
* [getState](#getstate)
* [setState](#setState)

-----------------------------------

<a name="well1024a" />
## well1024a(entropy)
## well1024a()

Returns a new well1024a instance, which is an object with 3 functions:

* [getUInt32](#getUInt32)
* [getState](#getstate)
* [setState](#setState)

The instance will use `Math.random()` to fill out the initial seed state.

__Arguments__

* entropy - default=[].  Array of numbers to add to the initial seed.  These should be based on environmental values that are likely to be different on each run such as system time, process ID, browser window height, values from `/dev/urandom` etc.

__Example__

```javascript
var w = well1024a([
    Date.now(),
    os.freemem(),
    process.pid
]);
```

-----------------------------------

<a name="getUInt32" />
## getUInt32()

Returns a random positive integer less than 2^32.

__Example__

```javascript
var w = well1024a();

console.log('For Christmas this year, I want ' + w.getUInt32().toString() + ' ponies!');
```

-----------------------------------

<a name="getState" />
## getState()

Returns an object representing the current state of the random number generator.

The object can safely be converted to and restored from JSON.

This object can be used as a parameter to `setState`.

-----------------------------------

<a name="setState" />
## setState(state)

Sets the random number generator to a specific state, allowing for replay of random values.

__Arguments__

* state - Must be object retrieved from an earlier call to `getState()`.

__Example__

This will flip a pair of coins, reset the generator state, and flip the
coins again with the exact same output.

```javascript
var w = well1024a();
var coins = ['heads', 'tails'];

console.log("Flippin' the coins:");
var state = w.getState();
var d1 = coins[w.getUInt32() % 2];
var d2 = coins[w.getUInt32() % 2];
console.log(d1 + " and " + d2);

console.log("Instant replay:");
w.setState(state);
d1 = coins[w.getUInt32() % 2];
d2 = coins[w.getUInt32() % 2];
console.log(d1 + " and " + d2);
```

---------------------------------------

## Notes

No functions rely on `this`, so it's safe to e.g. assign
`randy.good.randInt` to a variable or pass it around as a
parameter.
