"use strict";

const undici = require("undici");
const realFetch = undici.fetch;

const crypto = require('node:crypto');
const util = require("util");
const TextEncoder = util.TextEncoder;
const TextDecoder = util.TextDecoder;

if (!global.fetch) {
	global.fetch = function (url, options) {
		if (/^\/\//.test(url)) {
			url = "https:" + url;
		}
		return realFetch.call(this, url, options);
	};
	global.Response = undici.Response;
	global.Headers = undici.Headers;
	global.Request = undici.Request;
}
if (!global.TextDecoder) {
	global.TextDecoder = TextDecoder;
}
if (!global.TextEncoder) {
	global.TextEncoder = TextEncoder;
}

module.exports = {
	Buffer: Buffer,
	Crypto: crypto.webcrypto
}
