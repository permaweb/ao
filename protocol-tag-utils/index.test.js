import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import {
  concat,
  concatUnassoc,
  create,
  findAll,
  findAllByName,
  findByName,
  parse,
  parseAll,
  parseUnassoc,
  parseAllUnassoc,
  removeAll,
  removeAllByName,
  update
} from './index.js'

describe('suite', () => {
  const [AO, ZONE] = ['ao', 'zone']
  const AO_DP = { name: 'Data-Protocol', value: 'ao' }
  const AO_TAGS = [
    AO_DP,
    { name: 'Variant', value: 'ao.TN.1' },
    { name: 'Type', value: 'Process' }
  ]
  const ZONE_DP = { name: 'Data-Protocol', value: 'zone' }
  const ZONE_TAGS = [
    ZONE_DP,
    { name: 'Type', value: 'Profile' },
    { name: 'Type', value: 'What' },
    { name: 'Variant', value: '0.0.2' }
  ]

  const RAND = { name: 'Random', value: 'Tag' }
  const TAGS = [
    RAND,
    AO_TAGS,
    ZONE_TAGS
  ].flat(1)

  describe('findAll', () => {
    test('should find all protocol tags', () => {
      assert.deepStrictEqual(findAll(AO, TAGS), AO_TAGS)
      assert.deepStrictEqual(findAll(ZONE, TAGS), ZONE_TAGS)
    })

    test('should find no tags', () => {
      assert.deepStrictEqual(findAll(AO, []), [])
      assert.deepStrictEqual(findAll('foo', TAGS), [])
    })
  })

  describe('findAllByName', () => {
    test('should find all protocol tags by name', () => {
      assert.deepStrictEqual(
        findAllByName(AO, 'Type', TAGS),
        [{ name: 'Type', value: 'Process' }]
      )

      assert.deepStrictEqual(
        findAllByName(ZONE, 'Type', TAGS),
        [
          { name: 'Type', value: 'Profile' },
          { name: 'Type', value: 'What' }
        ]
      )
    })

    test('should find no tags', () => {
      assert.deepStrictEqual(findAllByName(AO, 'Foo', TAGS), [])
      assert.deepStrictEqual(findAllByName(ZONE, 'Foo', TAGS), [])
    })
  })

  describe('findByName', () => {
    test('should find the first protocol tag by name', () => {
      assert.deepStrictEqual(
        findByName(AO, 'Type', TAGS),
        { name: 'Type', value: 'Process' }
      )

      assert.deepStrictEqual(
        findByName(ZONE, 'Type', TAGS),
        { name: 'Type', value: 'Profile' }
      )
    })

    test('should find no tag', () => {
      assert.deepStrictEqual(findByName(AO, 'Foo', TAGS), undefined)
      assert.deepStrictEqual(findByName(ZONE, 'Foo', TAGS), undefined)
    })
  })

  describe('create', () => {
    test('should create protocol tags', () => {
      assert.deepStrictEqual(create(AO, AO_TAGS.slice(1)), AO_TAGS)
      // dedupe Data-Protocol tag
      assert.deepStrictEqual(create(AO, AO_TAGS), AO_TAGS)
    })

    test('should create no tags', () => {
      assert.deepStrictEqual(create(AO, []), [])
      assert.deepStrictEqual(create(AO, AO_TAGS.slice(0, 1)), [])
    })
  })

  describe('concat', () => {
    const NEW_TAGS = [
      { name: 'Type', value: 'Foo' },
      { name: 'Foo', value: 'Bar' }
    ]

    test('should concatenate to the protocol tags', () => {
      assert.deepStrictEqual(
        concat(AO, NEW_TAGS, TAGS),
        [RAND, AO_TAGS, NEW_TAGS, ZONE_TAGS].flat(1)
      )

      assert.deepStrictEqual(
        concat(ZONE, NEW_TAGS, TAGS),
        [RAND, AO_TAGS, ZONE_TAGS, NEW_TAGS].flat(1)
      )
    })

    test('should concatenate new protocol section to the end', () => {
      assert.deepStrictEqual(
        concat(AO, NEW_TAGS, ZONE_TAGS),
        [ZONE_TAGS, AO_DP, NEW_TAGS].flat(1)
      )
    })
  })

  describe('update', () => {
    const NEW_TAGS = [
      { name: 'Type', value: 'Foo' },
      { name: 'Foo', value: 'Bar' }
    ]

    test('should replace the protocol tags, preserving order', () => {
      assert.deepStrictEqual(
        update(AO, NEW_TAGS, TAGS),
        [RAND, AO_DP, NEW_TAGS, ZONE_TAGS].flat(1)
      )

      assert.deepStrictEqual(
        update(ZONE, NEW_TAGS, TAGS),
        [RAND, AO_TAGS, ZONE_DP, NEW_TAGS].flat(1)
      )
    })

    test('should concatenate new protocol section to the end', () => {
      assert.deepStrictEqual(
        update(AO, NEW_TAGS, ZONE_TAGS),
        [ZONE_TAGS, AO_DP, NEW_TAGS].flat(1)
      )
    })

    test('should do nothing', () => {
      assert.deepStrictEqual(update(AO, [], ZONE_TAGS), ZONE_TAGS)
      assert.deepStrictEqual(update(AO, [], [RAND]), [RAND])
      assert.deepStrictEqual(update(AO, [], []), [])
    })
  })

  describe('removeAll', () => {
    test('should remove all protocol tags', () => {
      assert.deepStrictEqual(removeAll(AO, TAGS), [RAND, ZONE_TAGS].flat(1))
      assert.deepStrictEqual(removeAll(ZONE, TAGS), [RAND, AO_TAGS].flat(1))
    })

    test('should do nothing', () => {
      assert.deepStrictEqual(
        removeAll(AO, [RAND, ZONE_TAGS].flat(1)),
        [RAND, ZONE_TAGS].flat(1)
      )

      assert.deepStrictEqual(removeAll(AO, []), [])
    })
  })

  describe('removeAllByName', () => {
    test('should remove all protocol tags, by name', () => {
      assert.deepStrictEqual(
        removeAllByName(AO, 'Type', TAGS),
        [RAND, AO_DP, { name: 'Variant', value: 'ao.TN.1' }, ZONE_TAGS].flat(1)
      )

      assert.deepStrictEqual(
        removeAllByName(ZONE, 'Type', TAGS),
        [RAND, AO_TAGS, ZONE_DP, { name: 'Variant', value: '0.0.2' }].flat(1)
      )
    })

    test('should remove protocol, if all tags are removed', () => {
      assert.deepStrictEqual(
        removeAllByName(
          AO,
          'Variant',
          removeAllByName(AO, 'Type', TAGS)
        ),
        [RAND, ZONE_TAGS].flat(1)
      )
    })

    test('should do nothing', () => {
      assert.deepStrictEqual(removeAllByName(AO, 'Foo', TAGS), TAGS)
      assert.deepStrictEqual(removeAllByName(AO, 'Random', TAGS), TAGS)
    })
  })

  describe('parse', () => {
    test('should parse into an object, use first value in protocol', () => {
      assert.deepStrictEqual(
        parse(AO, TAGS),
        { 'Data-Protocol': 'ao', Type: 'Process', Variant: 'ao.TN.1' }
      )

      assert.deepStrictEqual(
        parse(ZONE, TAGS),
        { 'Data-Protocol': 'zone', Type: 'Profile', Variant: '0.0.2' }
      )
    })

    test('should parse to an empty object', () => {
      assert.deepStrictEqual(parse(AO, [RAND, ZONE_TAGS].flat(1)), {})
      assert.deepStrictEqual(parse(AO, []), {})
    })
  })

  describe('parseAll', () => {
    test('should parse into an object, using all values', () => {
      assert.deepStrictEqual(
        parseAll(AO, TAGS),
        { 'Data-Protocol': ['ao'], Type: ['Process'], Variant: ['ao.TN.1'] }
      )

      assert.deepStrictEqual(
        parseAll(ZONE, TAGS),
        { 'Data-Protocol': ['zone'], Type: ['Profile', 'What'], Variant: ['0.0.2'] }
      )
    })

    test('should parse to an empty object', () => {
      assert.deepStrictEqual(parseAll(AO, [RAND, ZONE_TAGS].flat(1)), {})
      assert.deepStrictEqual(parseAll(AO, []), {})
    })
  })

  describe('concatUnassoc', () => {
    test('should concatenate unassociated tags', () => {
      assert.deepStrictEqual(
        concatUnassoc([RAND, { name: 'Random', value: 'First' }], TAGS),
        [RAND, RAND, { name: 'Random', value: 'First' }, AO_TAGS, ZONE_TAGS].flat(1)
      )
    })

    test('should do nothing', () => {
      assert.deepStrictEqual(concatUnassoc([], TAGS), TAGS)
    })
  })

  describe('parseUnassoc', () => {
    test('should parse tags not associated with a protocol, using first value', () => {
      assert.deepStrictEqual(
        parseUnassoc([{ name: 'Random', value: 'First' }, TAGS].flat(1)),
        { Random: 'First' }
      )
    })
  })

  describe('parseAllUnassoc', () => {
    test('should parse tags not associated with a protocol', () => {
      assert.deepStrictEqual(parseAllUnassoc(TAGS), { Random: ['Tag'] })

      assert.deepStrictEqual(
        parseAllUnassoc([{ name: 'Random', value: 'First' }, TAGS].flat(1)),
        { Random: ['First', 'Tag'] }
      )
    })
  })
})
