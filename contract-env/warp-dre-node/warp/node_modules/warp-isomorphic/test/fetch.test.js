/**
 * @jest-environment node
 */

require("../src/npm-node.js");
const express = require('express')

describe("(node) Fetch", () => {
	let app;

	beforeAll(() => {
		app = express()

		app.get('/', function (req, res) {
			res.json({ "good": "good" })
		})

		app = app.listen(3021)
	});

	afterAll(() => {
		app.close()
	});

	it("should be defined", () => {
		expect(fetch).toBeDefined()
	});

	it("should work on good requests", async () => {
		await expect(fetch('http://localhost:3021').then(data => data.json())).resolves.toEqual({ good: "good" })
	});
});


