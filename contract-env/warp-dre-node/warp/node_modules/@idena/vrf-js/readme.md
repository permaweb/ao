# vrf-js

[![NPM](https://nodei.co/npm/@idena/vrf-js.png?stars&downloads)](https://nodei.co/npm/@idena/vrf-js/)  
A reference implementation of [Google Key Transparency VRF](https://github.com/google/keytransparency/tree/master/core/crypto/vrf)

## Installation

You can use this command to install:

    npm install @idena/vrf-js

## Usage

You could use like this:

If you use node.js, you should require the module first:

```JavaScript
const { Evaluate, ProofHoHash } = require('vrf-js');
```

or ES6 import

```JavaScript
import { Evaluate, ProofHoHash } from 'vrf-js'
```

## Example

```JavaScript
// evaluate VRF proof from private key
const privateKey = [123, 254, 12, ... 11] // 32 bytes
const data = [1, 2, 3, 4, 5] // data
const [hash, proof] = Evaluate(privateKey, data)


// check VRF proof with public key
const publicKey = [23, 45, 76, ..., 22] // 65 bytes

// throws exception if proof is invalid
const hash = ProofTohash(publicKey, data, proof)
```

## License

The project is released under the [MIT license](http://www.opensource.org/licenses/MIT).
