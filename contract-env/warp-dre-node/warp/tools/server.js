/* eslint-disable */
const express = require('express');
const cors = require('cors');
const { MemBlockHeightWarpCache } = require('../lib/cjs/cache/impl/MemBlockHeightCache');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb", extended: true }));


const caches = {
  STATE: new MemBlockHeightWarpCache(1),
  INTERACTIONS: new MemBlockHeightWarpCache(1)
};

// getLast
app.get('/last/:type/:key', async function (req, res, next) {
  console.log('last:', {
    url: req.url,
    params: req.params
  });
  const { type, key } = req.params;

  const result = await caches[type].getLast(key);

  res.send(result);
});

// getLessOrEqual
app.get('/less-or-equal/:type/:key/:blockHeight', async function (req, res, next) {
  console.log('less-or-equal:', {
    url: req.url,
    params: req.params
  });

  const { type, key } = req.params;
  const blockHeight = parseInt(req.params.blockHeight);

  const result = await caches[type].getLessOrEqual(key, blockHeight);
  console.log(result);

  res.send(result);
});

// contains
app.get('/contains/:type/:key', async function (req, res, next) {
  console.log('contains:', {
    url: req.url,
    params: req.params
  });

  const { type, key } = req.params;

  res.send(await caches[type].contains(key));
});

// get
app.get('/:type/:key/:blockHeight', async function (req, res, next) {
  console.log('get:', {
    url: req.url,
    params: req.params
  });

  const { type, key } = req.params;
  const blockHeight = parseInt(req.params.blockHeight);

  const result = await caches[type].get({ key: key, sortKey: blockHeight});
  console.log('get', result);

  res.send(result);
});

// put
app.put('/:type/:key/:blockHeight', async function (req, res, next) {
  console.log('put:', {
    url: req.url,
    params: req.params,
    body: req.body
  });

  const { type, key } = req.params;
  const blockHeight = parseInt(req.params.blockHeight);

  await caches[type].put({ cacheKey: key, blockHeight }, req.body);

  res.send(null);
});

app.listen(port, async () => {
  console.log(`Cache listening at http://localhost:${port}`);

  // note: with current cache configuration (new MemBlockHeightWarpCache(1))
  // there should be at most one block height cached for given cache key.
  await caches['STATE'].put({ cacheKey: 'txId', blockHeight: 555 }, { foo: "bar555" });
  await caches['STATE'].put({ cacheKey: 'txId', blockHeight: 556 }, { foo: "bar556" });
  await caches['STATE'].put({ cacheKey: 'txId', blockHeight: 557 }, { foo: "bar557" });

  await caches['INTERACTIONS'].put({ cacheKey: 'txId', blockHeight: 557 }, [{ foo: "bar557" }]);
  await caches['INTERACTIONS'].put({ cacheKey: 'txId', blockHeight: 600 }, [{ bar: "foo600" }]);

  console.log('Caches filled');
});
