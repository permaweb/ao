/**
 * @jest-environment jsdom
 */

const Buffer = require("../src/npm-browser").Buffer;

describe("(Browser) buffer", function () {

	it("should correctly use buffer methods", function () {
		const arr = new Uint16Array(2);

		arr[0] = 5000;
		arr[1] = 4000;

		const buf = Buffer.from(arr.buffer);

		expect(Buffer.isBuffer(buf)).toBe(true);
	});
});
