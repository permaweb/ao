use arweave_rs::{Arweave, ArweaveBuilder};
use reqwest::Url;
use std::path::PathBuf;
use std::env;
use dotenv::dotenv;

pub struct InternalArweave;

pub fn create_wallet_client() {
    let arweave_builder = ArweaveBuilder::new();
    arweave_builder.base_url(Url::parse("arweave.net").unwrap());
    arweave_builder.keypair_path(keypair_path)
    let arweave = arweave_builder.build().unwrap();
    arweave.upload_file_from_path(file_path, additional_tags, fee)
}