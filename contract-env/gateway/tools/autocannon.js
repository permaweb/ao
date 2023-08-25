'use strict';

const autocannon = require('autocannon');
const fs = require('fs');

const zlib = require('zlib');

const url = 'http://localhost:5666';

const request = {
  format: 2,
  id: 'Daj-MNSnH55TDfxqC7v4eq0lKzVIwh98srUaWqyuZtY',
  last_tx: '6vktnsGsckWMuU5_Pod3CIwsqKM24Ry4Y5IdbeOuyY-KVZdNxrnry2n465Dh-cfF',
  owner:
    'xyTvKiCST8bAT6sxrgkLh8UCX2N1eKvawODuxwq4qOHIdDAZFU_3N2m59rkZ0E7m77GsJuf1I8u0oEJEbxAdT7uD2JTwoYEHauXSxyJYvF0RCcZOhl5P1PJwImd44SJYa_9My7L84D5KXB9SKs8_VThe7ZyOb5HSGLNvMIK6A8IJ4Hr_tg9GYm65CRmtcu18S9mhun8vgw2wi7Gw6oR6mc4vU1I-hrU66Fi7YlXwFieP6YSy01JqoLPhU84EunPQzXPouVSbXjgRU5kFVxtdRy4GK2fzEBFYsQwCQgFrySCrFKHV8AInu9jerfof_DxNKiXkBzlB8nc22CrYnvvio_BWyh-gN0hQHZT0gwMR-A7sbXNCQJfReaIZzX_jP6XoB82PnpzmL_j1mJ2lnv2Rn001flBAx9AYxtGXd9s07pA-FggTbEG3Y2UnlWW6l3EJ93E0IfxL0PqGEUlp217mxUHvmTw9fkGDWa8rT9RPmsTyji-kMFSefclw80cBm_iOsIEutGP4S3LDbP-ZVJWDeJOBQQpSgwbisl8qbjl2sMQLQihoG2TQyNbmLwfyq-XSULkXjUi1_6BH36wnDBLWBKF-bS2bLKcGtn3Vjet72lNHxJJilcj8vpauwJG0078S_lO5uGt6oicdGR6eh_NSn6_8za_tXg0G_fohz4Yb1z8',
  tags: [
    { name: 'QXBwLU5hbWU', value: 'U21hcnRXZWF2ZUFjdGlvbg' },
    {
      name: 'QXBwLVZlcnNpb24',
      value: 'MC4zLjA',
    },
    { name: 'U0RL', value: 'UmVkU3RvbmU' },
    {
      name: 'Q29udHJhY3Q',
      value: 'T3JPOG40NTNONmJ4OTIxd3RzRXMtME9DSW1CTENJdE5VNW9TYkZLbEZ1VQ',
    },
    {
      name: 'SW5wdXQ',
      value: 'eyJmdW5jdGlvbiI6InRyYW5zZmVyIiwiZGF0YSI6eyJ0YXJnZXQiOiJmYWtlLWZyb20tYnVuZGxlIiwicXR5IjoxODU5OTMzM319',
    },
  ],
  target: '',
  quantity: '0',
  data: 'NDgwOQ',
  data_size: '4',
  data_root: '17-dvvBvsR1rNGqT2aQPco_tciXSHuFEBaouedNnmbs',
  reward: '49037419',
  signature:
    'ca-gB6O6fnjH5MVE_TCY2laLTZg3PvVQ16pPRVvE4Kz3ZSQUbBF8ZsWYjmEld4Tyy3v0Zhfsl0FuupbvE-0Nz6ULpYDLamT6umHUS-bz7AWbLOlUKN8AzSzwlecVs3noEuNPnUeLthmt0Kmh6EfiMDddln-2JPNi7kAOdZecOPFOmiliIukdUuMdtZLI8dRQZ1T9G3UqGKHPJGKG9QH1KSDmNxXrldSKTTcKw38FvOSq_evCrYOp3-3T3O6R_tUxpChlsiImivLeqvhSEegMg98fH1HdOv3RHybil29hAcbJRELagVi13GeOE1c72fDZQO-daIFdJ-oAPuxF8t60arhGzb0qS3XAEM4ATXLQbdebWzpB45vcuSF6Cu0bNf2GIASDCzjM2NCM1h8BeQ3TuV7xkT6umRcp1fyYay0cNdCCpveGzMUhck3BfASug6PxNJhSFvar479po6MdCHsMHZJ7XT5yOOrijX6hXlfJoVgrQZbpgNKE0h4KbQN8ggpFjb-pV6LNtLSd6pKjvP2YPSCmy8OmgXNmGhLyyoKZ7GNlF-CqiibJ9HEFWIynQkwyCh5HqGFdYVx7hWzGYX64i3kGjxVlkbLylmnzzQfLuuNf6lwTKJt0oarda7PSp6jYR5FFI6eKKmqHIiwD762EzUCTTP7Gu85tmHOPrlXHf9Y',
};

/*fs.writeFileSync('non-compressed.dat', JSON.stringify(request));



const zip = zlib.createGzip();

const read = fs.createReadStream('request.json');
var write = fs.createWriteStream('request.json.gz2');
//Transform stream which is zipping the input file
read.pipe(zip).pipe(write);
console.log("Zipped Successfully");

const input = new Buffer(JSON.stringify(request), 'utf8');*/

const fileContents = fs.createReadStream('QTKygzUucAXgcGEPejwTKdeAMcormE3n_4cD9hqz5x4');
const writeStream = fs.createWriteStream('unzipped.json');
const unzip = zlib.createGunzip();

fileContents.pipe(unzip).pipe(writeStream);

/*
autocannon({
  url,
  connections: 5, //default
  pipelining: 1, // default
  duration: 5, // default
  workers: 1,
  requests: [
    {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      method: 'POST', // POST for creating a product
      path: '/gateway/sequencer/register',
      body: JSON.stringify({
        "format": 2,
        "id": "[<id>]",
        "last_tx": "6vktnsGsckWMuU5_Pod3CIwsqKM24Ry4Y5IdbeOuyY-KVZdNxrnry2n465Dh-cfF",
        "owner": "xyTvKiCST8bAT6sxrgkLh8UCX2N1eKvawODuxwq4qOHIdDAZFU_3N2m59rkZ0E7m77GsJuf1I8u0oEJEbxAdT7uD2JTwoYEHauXSxyJYvF0RCcZOhl5P1PJwImd44SJYa_9My7L84D5KXB9SKs8_VThe7ZyOb5HSGLNvMIK6A8IJ4Hr_tg9GYm65CRmtcu18S9mhun8vgw2wi7Gw6oR6mc4vU1I-hrU66Fi7YlXwFieP6YSy01JqoLPhU84EunPQzXPouVSbXjgRU5kFVxtdRy4GK2fzEBFYsQwCQgFrySCrFKHV8AInu9jerfof_DxNKiXkBzlB8nc22CrYnvvio_BWyh-gN0hQHZT0gwMR-A7sbXNCQJfReaIZzX_jP6XoB82PnpzmL_j1mJ2lnv2Rn001flBAx9AYxtGXd9s07pA-FggTbEG3Y2UnlWW6l3EJ93E0IfxL0PqGEUlp217mxUHvmTw9fkGDWa8rT9RPmsTyji-kMFSefclw80cBm_iOsIEutGP4S3LDbP-ZVJWDeJOBQQpSgwbisl8qbjl2sMQLQihoG2TQyNbmLwfyq-XSULkXjUi1_6BH36wnDBLWBKF-bS2bLKcGtn3Vjet72lNHxJJilcj8vpauwJG0078S_lO5uGt6oicdGR6eh_NSn6_8za_tXg0G_fohz4Yb1z8",
        "tags": [{"name": "QXBwLU5hbWU", "value": "U21hcnRXZWF2ZUFjdGlvbg"}, {
          "name": "QXBwLVZlcnNpb24",
          "value": "MC4zLjA"
        }, {"name": "U0RL", "value": "UmVkU3RvbmU"}, {
          "name": "Q29udHJhY3Q",
          "value": "T3JPOG40NTNONmJ4OTIxd3RzRXMtME9DSW1CTENJdE5VNW9TYkZLbEZ1VQ"
        }, {
          "name": "SW5wdXQ",
          "value": "eyJmdW5jdGlvbiI6InRyYW5zZmVyIiwiZGF0YSI6eyJ0YXJnZXQiOiJmYWtlLWZyb20tYnVuZGxlIiwicXR5IjoxODU5OTMzM319"
        }],
        "target": "",
        "quantity": "0",
        "data": "NDgwOQ",
        "data_size": "4",
        "data_root": "17-dvvBvsR1rNGqT2aQPco_tciXSHuFEBaouedNnmbs",
        "reward": "49037419",
        "signature": "ca-gB6O6fnjH5MVE_TCY2laLTZg3PvVQ16pPRVvE4Kz3ZSQUbBF8ZsWYjmEld4Tyy3v0Zhfsl0FuupbvE-0Nz6ULpYDLamT6umHUS-bz7AWbLOlUKN8AzSzwlecVs3noEuNPnUeLthmt0Kmh6EfiMDddln-2JPNi7kAOdZecOPFOmiliIukdUuMdtZLI8dRQZ1T9G3UqGKHPJGKG9QH1KSDmNxXrldSKTTcKw38FvOSq_evCrYOp3-3T3O6R_tUxpChlsiImivLeqvhSEegMg98fH1HdOv3RHybil29hAcbJRELagVi13GeOE1c72fDZQO-daIFdJ-oAPuxF8t60arhGzb0qS3XAEM4ATXLQbdebWzpB45vcuSF6Cu0bNf2GIASDCzjM2NCM1h8BeQ3TuV7xkT6umRcp1fyYay0cNdCCpveGzMUhck3BfASug6PxNJhSFvar479po6MdCHsMHZJ7XT5yOOrijX6hXlfJoVgrQZbpgNKE0h4KbQN8ggpFjb-pV6LNtLSd6pKjvP2YPSCmy8OmgXNmGhLyyoKZ7GNlF-CqiibJ9HEFWIynQkwyCh5HqGFdYVx7hWzGYX64i3kGjxVlkbLylmnzzQfLuuNf6lwTKJt0oarda7PSp6jYR5FFI6eKKmqHIiwD762EzUCTTP7Gu85tmHOPrlXHf9Y"
      }),
    }
  ],
  idReplacement: true
}, console.log);
*/
