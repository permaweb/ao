# protocol-tag-utils

A _tiny_, zero-dependency, set of utilities for interacting with `Data-Protocol`
tags. Browser, Node, Bun, and Deno compatible.

<!-- toc -->

- [Why](#why)
- [Solution](#solution)
- [Usage](#usage)
  - [`findAll`](#findall)
  - [`findAllByName`](#findallbyname)
  - [`findByName`](#findbyname)
  - [`create`](#create)
  - [`update`](#update)
  - [`concat`](#concat)
  - [`removeAll`](#removeall)
  - [`removeAllByName`](#removeallbyname)
  - [`parse`](#parse)
  - [`parseAll`](#parseall)
  - [`proto`](#proto)
- [Unassociated Tags](#unassociated-tags)
  - [`concatUnassoc`](#concatunassoc)
  - [`parseUnassoc`](#parseunassoc)
  - [`parseAllUassoc`](#parsealluassoc)

<!-- tocstop -->

## Why

**It is fundamental to note that, in ANS-104, tags are ordered.**

ANS-115 specifies how to utilize `Data-Protocol`s to compose application level
specification using ANS-104 tags.

However, ambiguity arises when a piece of data implements many `Data-Protocol`
which specify the same tag name:

```js
const tags = [
  { name: "Data-Protocol", value: "ao" },
  // ...
  { name: "Data-Protocol", value: "zone" },
  // Which tags goes with which Data-Protocol?
  { name: "Type", value: "Process" },
  { name: "Type", value: "Profile" },
  { name: "Variant", value: "ao.TN.1" },
  { name: "Variant", value: "0.0.2" },
];
```

This ambuguity can lead to unexpected behavior in workarounds in subsequent
implementations.

## Solution

By enforcing one additional simple convention, this ambiguity is massively
curtailed:

> Tags are **"associated"** with the most recent `Data-Protocol` tag. **A
> corollary is that **"unassociated"** tags, not belonging to a `Data-Protocol`,
> appear at the beginning, **before the first `Data-Protocol` tag.**

```js
const tags = [
  { name: "Unassociated", value: "Tag" },
  { name: "Another", value: "Unassociated" },
  // these are associated with 'ao' Data-Protocol
  { name: "Data-Protocol", value: "ao" },
  { name: "Type", value: "Process" },
  { name: "Variant", value: "ao.TN.1" },
  // these are asscociated with 'zone' Data-Protocol
  { name: "Data-Protocol", value: "zone" },
  { name: "Type", value: "Profile" },
  { name: "Variant", value: "0.0.2" },
];
```

This module provides utilties for interacting with tags, using the above
convention.

## Usage

```js
import {
  concat,
  concatUnassoc,
  create,
  findAll,
  findAllByName,
  findByName,
  parse,
  parseAll,
  parseAllUnassoc,
  parseUnassoc,
  proto,
  removeAll,
  removeAllByName,
  update,
} from "@permaweb/protocol-tag-utils";

const tags = [
  { name: "Data-Protocol", value: "ao" },
  { name: "Type", value: "Process" },
  { name: "Variant", value: "ao.TN.1" },
  { name: "Data-Protocol", value: "zone" },
  { name: "Type", value: "Profile" },
  { name: "Variant", value: "0.0.2" },
];

// use a top-level export, passing protocol first
const aoType = findByName("ao", "Type", tags);

// OR use the proto helper to get an API per Data-Protocol
const ao = proto("ao");
const zone = proto("zone");

// No longer need to pass protocol every time
const aoType = ao.value("Type", tags);
const zoneTypes = zone.values("Type", tags);
```

> Passing `protocol` first, over and over, might get verbose. Alternatively, you
> can use the [`proto`](#proto) helper.

### `findAll`

Extract the tags associated with the provided `Data-Protocol`.

If the `Data-Protocol` tag is NOT found, then an empty array is returned

```js
import { findAll } from "@permaweb/protocol-tag-utils";

const tags = [/*...*/];

// [{ name, value }, ...]
const aoTags = findAll("ao", tags);
```

### `findAllByName`

Extract the tags, with the name, associated with the provided `Data-Protocol`.

```js
import { findAllByName } from '@permaweb/protocol-tag-utils'

const tags = [/*...*/]

// [{ name, value }, ...]
const zoneTypes = findAllByName('zone', 'Type' tags)
```

### `findByName`

Extract the FIRST tag, with the name, associated with the provided
`Data-Protocol`.

```js
import { findByName } from '@permaweb/protocol-tag-utils'

const tags = [/*...*/]

// { name, value }
const aoType = findAllByName('ao', 'Type' tags)
```

### `create`

Associate an array of tags associated with the `Data-Protocol`. The
`Data-Protocol` tag will be prepended to the front of the array.

```js
import { create } from "@permaweb/protocol-tag-utils";

const pTags = [{ name: "Foo", value: "Bar" }];

/**
[
  { name: 'Data-Protocol', value: 'ao' },
  { name: 'Foo', value: 'Bar' }
]
 */
const aoTags = create("ao", pTags);
```

### `update`

Replace the tags, associated with the `Data-Protocol`, with the provided tags.

If there are no associated tags for the `Data-Protocol`, then the new section is
concatenated to the end of all tags.

NO deduplication is performed on the associated tags.

```js
import { update } from "@permaweb/protocol-tag-utils";

const tags = [
  { name: "Data-Protocol", value: "ao" },
  { name: "Type", value: "Process" },
  { name: "Variant", value: "ao.TN.1" },
  { name: "Data-Protocol", value: "zone" },
  { name: "Type", value: "Profile" },
  { name: "Variant", value: "0.0.2" },
];

const pTags = [{ name: "Foo", value: "Bar" }, { name: "Cool", value: "Beans" }];

// ao subsection is replaced
update("ao", pTags, tags);

/**
 *[
    { name: "Data-Protocol", value: "ao" },
    { name: "Foo", value: "Bar" },
    { name: "Cool", value: "Beans" },
    { name: "Data-Protocol", value: "zone" },
    { name: "Type", value: "Profile" },
    { name: "Variant", value: "0.0.2" }
  ]
 */
```

### `concat`

Same [`update`](#update), except do not replace the associated tags, and instead
concatenate to them.

```js
import { concat } from "@permaweb/protocol-tag-utils";

const tags = [
  { name: "Data-Protocol", value: "ao" },
  { name: "Type", value: "Process" },
  { name: "Variant", value: "ao.TN.1" },
  { name: "Data-Protocol", value: "zone" },
  { name: "Type", value: "Profile" },
  { name: "Variant", value: "0.0.2" },
  // end zone tags
];

const pTags = [{ name: "Foo", value: "Bar" }, { name: "Cool", value: "Beans" }];

// ao subsection is appended to
concat("ao", pTags, tags);

/**
 *[
    { name: "Data-Protocol", value: "ao" },
    { name: "Type", value: "Process" },
    { name: "Variant", value: "ao.TN.1" },
    { name: "Foo", value: "Bar" },
    { name: "Cool", value: "Beans" },
    { name: "Data-Protocol", value: "zone" },
    { name: "Type", value: "Profile" },
    { name: "Variant", value: "0.0.2" }
  ]
 */
```

### `removeAll`

Remove the `Data-Protocol` section and all associated tags

```js
import { removeAll } from "@permaweb/protocol-tag-utils";

const tags = [
  { name: "Unassociated", value: "Tag" },
  { name: "Another", value: "Unassociated" },
  { name: "Data-Protocol", value: "ao" },
  // these are associated with ao Data-Protocol
  { name: "Type", value: "Process" },
  { name: "Variant", value: "ao.TN.1" },
  // end ao tags
  { name: "Data-Protocol", value: "zone" },
  // these are asscociated with zone Data-Protocol
  { name: "Type", value: "Profile" },
  { name: "Variant", value: "0.0.2" },
  // end zone tags
];

// ao subsection is removed
removeAll("ao", tags);

/**
 *[
    { name: 'Unassociated', value: 'Tag' },
    { name: 'Another', value: 'Unassociated' },
    { name: "Data-Protocol", value: "zone" },
    { name: "Type", value: "Profile" },
    { name: "Variant", value: "0.0.2" }
  ]
 */
```

### `removeAllByName`

Remove all tags, with the name, associated with the `Data-Protocol`.

```js
import { removeAllByName } from "@permaweb/protocol-tag-utils";

const tags = [
  { name: "Unassociated", value: "Tag" },
  { name: "Another", value: "Unassociated" },
  { name: "Data-Protocol", value: "ao" },
  { name: "Type", value: "Process" },
  { name: "Variant", value: "ao.TN.1" },
  { name: "Data-Protocol", value: "zone" },
  { name: "Type", value: "Profile" },
  { name: "Type", value: "Other" },
  { name: "Variant", value: "0.0.2" },
];

// all zone 'Type' tags are removed
removeAllByName("zone", "Type", tags);

/**
 *[
    { name: 'Unassociated', value: 'Tag' },
    { name: 'Another', value: 'Unassociated' },
    { name: "Data-Protocol", value: "ao" },
    { name: "Type", value: "Process" },
    { name: "Variant", value: "ao.TN.1" },
    { name: "Data-Protocol", value: "zone" },
    { name: "Variant", value: "0.0.2" }
  ]
 */
```

### `parse`

Parse tags, associated with the `Data-Protocol`, into an object with key-value
pairs of name -> value.

If multiple tags are found, then the FIRST tag value is used, and subsequent
values are discarded. If you'd like to preserve all values, then use
[`parseAll`](#parseall)

```js
import { parse } from "@permaweb/protocol-tag-utils";

const tags = [/*...*/];

// { Type: 'Process', Module: '...' }
const aoParsed = parse("ao", tags);
```

### `parseAll`

Parse tags, associated with the `Data-Protocol`, into an object with key-value
pairs of name -> an array of values.

At each key, the values in each array will be in order of appearance

```js
import { parseAll } from "@permaweb/protocol-tag-utils";

const tags = [/*...*/];

// { Type: ['Process', ...], Module: ['...'] }
const aoParsed = parseAll("ao", tags);
```

### `proto`

Instead of constantly passing `protocol` as the first argument every time, you
can use this helper.

Build a `@permaweb/protocol-tag-utils` API for a single `Data-Protocol`

```js
import { proto } from "@permaweb/protocol-tag-utils";

const ao = proto("ao");
const zone = proto("zone");

const tags = [
  { name: "Data-Protocol", value: "ao" },
  { name: "Type", value: "Process" },
  { name: "Variant", value: "ao.TN.1" },
  { name: "Data-Protocol", value: "zone" },
  { name: "Type", value: "Profile" },
  { name: "Variant", value: "0.0.2" },
];

// 'Process'
const aoType = ao.value("Type", tags);
// ['Profile']
const zoneTypes = zone.values("Type", tags);
```

## Unassociated Tags

The module also has utilities for interacting with tags not associated with any
`Data-Protocol` ie. tags before any `Data-Protocol` tag. These tags are referred
to as "unassociated" tags.

> If you'd like to simply add an uassociated tag to the beginning, simply use
> [`unshift`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/unshift).

### `concatUnassoc`

Add unassociated tags to the end of unassociated section.

```js
import { concatUnassoc } from "@permaweb/protocol-tag-utils"

const tags = [
  { name: 'Random', value: 'Tag' }
  { name: "Data-Protocol", value: "ao" },
  { name: "Type", value: "Process" },
  { name: "Variant", value: "ao.TN.1" },
  { name: "Data-Protocol", value: "zone" },
  { name: "Type", value: "Profile" },
  { name: "Variant", value: "0.0.2" },
]

/**
[
  { name: 'Random', value: 'Tag' }
  { name: 'Another', value: 'One' },
  ...
]
 */
concatUnassoc([{ name: 'Another', value: 'One' }], tags)
```

### `parseUnassoc`

Same as [`parse`](#parse), but for unassociated tags

```js
import { parseUnassoc } from "@permaweb/protocol-tag-utils";

const tags = [/*...*/];

// { Random: 'Tag', Another: 'One' }
parseUnassoc(tags);
```

### `parseAllUassoc`

Same as [`parseAll`](#parseAll), but for unassociated tags

```js
import { parseAllUnassoc } from "@permaweb/protocol-tag-utils";

const tags = [/*...*/];

// { Random: ['Tag'], Another: ['One'] }
parseAllUnassoc(tags);
```
