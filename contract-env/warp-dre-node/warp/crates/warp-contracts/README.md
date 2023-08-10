# Warp contracts

`warp-contracts` crate is an inherent part of [Warp SDK](https://github.com/warp-contracts/warp). This library allows for smooth integration with Warp implementation of SmartWeave protocol.

| Feature                |   Yes/No    |
| ---------------------- | ----------- |
| Sandboxing             | ✅          |
| Foreign contract read  | ✅          |
| Foreign contract view  | ✅          |
| Foreign contract write | ✅          |
| Arweave.utils          | Soon        |
| Evolve                 | ✅          |
| Logging from contract  | ✅          |
| Transaction data (1)   | ✅          |
| Block data (2)         | ✅          |
| Contract data (3)      | ✅          |
| Gas metering           | ✅          |

Legend:
- `Soon` - the technology is already there, we just need to find some time to add the missing features :-)
- `(1)` - access current transaction data (id, owner, etc.)
- `(2)` - access current block data (indep_hash, height, timestamp)
- `(3)` - access current contract data (id, owner)
