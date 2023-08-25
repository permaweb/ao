const Arweave = require('arweave');

module.exports.connectArweave = function (host, port, protocol) {
  return Arweave.init({
    host: host,
    port: port,
    protocol: protocol,
  });
};
