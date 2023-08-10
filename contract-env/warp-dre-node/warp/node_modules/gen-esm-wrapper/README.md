# gen-esm-wrapper

Generate ESM wrapper files for CommonJS modules

This CLI tool makes it easier for module authors to support both ES modules
and CommonJS modules for Node.js.
It looks at the exports of an existing CommonJS module, and creates
an ES module wrapper file that makes the exports available as named exports.

For example, if you are in the root of your npm package, you can use

```bash
gen-esm-wrapper . path/to/wrapper/output.mjs
```

to create a wrapper file, and add

```js
  ...
  "exports": {
    ".": {
      "require": "./<same file as 'main'>",
      "import": "./path/to/wrapper/output.mjs"
    },
    "./": "./"
  }
  ...
```

to your `package.json` in order to make your module available as a dual
ESM/CJS package.
The command can also be added as a build step before publishing.

The above example `"exports":` key can be simplified to

```js
  ...
  "exports": {
    "require": "./<same file as 'main'>",
    "import": "./path/to/wrapper/output.mjs"
  }
  ...
```

if there are no other JavaScript files that can be required from the package
besides the main entry point (e.g. a file named `foo.js` that can be loaded
through `require('package/foo')`), or if you are okay with breaking
`require()` calls to those modules. This is the recommended approach for new
modules that are being published for the first time.

## Example project

There is a minimal example in the `example-project` directory in this
repository. This is its package.json:

```js
{
  "name": "example-project",
  "version": "1.0.0",
  "description": "Example project for gen-esm-wrapper",
  "main": "index.js",
  "exports": {
    ".": {
      "require": "./index.js",
      "import": "./dist/output.mjs"
    },
    "./": "./"
  },
  "scripts": {
    "test": "npm run build && node ./dist/output.mjs",
    "build": "gen-esm-wrapper . ./dist/output.mjs",
    "prepack": "npm run build"
  },
  "devDependencies": {
    "gen-esm-wrapper": "^1.0.4"
  }
}
```
