/*
glue code for interacting with outside world
and producing side effects
*/

mod schema;

// uploader to a service like irys
pub mod uploader;

// database layer
pub mod store;

// arweave gateway
pub mod gateway;

// wallet implementation
pub mod wallet;

/*
used to sign transactions, required here because
the arweave sdk reads a wallet from the file system
*/
pub mod signer;
