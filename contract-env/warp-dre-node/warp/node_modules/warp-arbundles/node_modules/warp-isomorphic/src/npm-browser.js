// in case of web worker
if (typeof window !== 'undefined') {
	window.global = window;
	global.fetch = window.fetch;

	module.exports = {
		Buffer: require("buffer").Buffer,
		Crypto: window.crypto
	};
} else {
	module.exports = {
		Buffer: require("buffer").Buffer,
		Crypto: crypto
	};
}
