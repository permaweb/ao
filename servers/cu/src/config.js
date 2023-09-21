const path = require('path');
const fs = require('fs');

const walletPath = process.env.PATH_TO_WALLET;
let walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'));

let config = {
    cuWallet: walletKey
};

module.exports = config;