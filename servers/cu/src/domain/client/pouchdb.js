import { fromPromise, of } from 'hyper-async'
import { always, applySpec, map, pipe, prop } from 'ramda'
import { z } from 'zod'

import PouchDb from 'pouchdb'
import PouchDbFind from 'pouchdb-find'
import PouchDbHttp from 'pouchdb-adapter-http'
import PouchDbLevel from 'pouchdb-adapter-leveldb'

import { blockSchema } from '../model.js'

export const [CRON_EVALS_ASC_IDX, EVALS_ASC_IDX, BLOCKS_ASC_IDX] = [
  'cron-evals-ascending',
  'evals-ascending',
  'blocks-ascending'
]

/**
 * An implementation of the db client using pouchDB
 *
 * @type {PouchDB.Database}
 */
let internalPouchDb
export async function createPouchDbClient ({ logger, maxListeners, mode, url }) {
  if (internalPouchDb) return internalPouchDb

  let adapter
  if (mode === 'embedded') {
    logger('Using embedded PouchDB')
    PouchDb.plugin(PouchDbLevel)
    adapter = 'leveldb'
  } else if (mode === 'remote') {
    logger('Using remote CouchDB')
    PouchDb.plugin(PouchDbHttp)
    adapter = 'http'
  } else {
    throw new Error(`Unsupported db mode: '${mode}'`)
  }

  PouchDb.plugin(PouchDbFind)
  PouchDb.setMaxListeners(maxListeners)
  internalPouchDb = new PouchDb(url, { adapter })

  /**
   * Transparently create any indexes we need.
   *
   * Will noop if the index already exists
   */
  return Promise.all([
    /**
     * We can this index to traverse ONLY cron evaluations
     * ascending or descending
     */
    internalPouchDb.createIndex({
      index: {
        fields: [{ _id: 'asc' }],
        partial_filter_selector: {
          cron: {
            $exists: true
          }
        }
      },
      ddoc: CRON_EVALS_ASC_IDX,
      name: CRON_EVALS_ASC_IDX
    }),
    /**
     * We can use this index traverse evaluations ascending
     * or descending
     */
    internalPouchDb.createIndex({
      index: {
        fields: [{ _id: 'asc' }],
        partial_filter_selector: {
          type: 'evaluation'
        }
      },
      ddoc: EVALS_ASC_IDX,
      name: EVALS_ASC_IDX
    }),
    internalPouchDb.createIndex({
      index: {
        fields: [{ height: 'asc' }],
        partial_filter_selector: {
          type: 'block'
        }
      },
      ddoc: BLOCKS_ASC_IDX,
      name: BLOCKS_ASC_IDX
    })
  ]).then(() => internalPouchDb)
}

const blockDocSchema = z.object({
  _id: z.string().min(1),
  height: blockSchema.shape.height,
  timestamp: blockSchema.shape.timestamp,
  type: z.literal('block')
})

function createBlockId ({ height, timestamp }) {
  return `block-${height}-${timestamp}`
}

const toBlock = applySpec({
  height: prop('height'),
  timestamp: prop('timestamp')
})

/**
 * PouchDB does Comparison of string using ICU which implements the Unicode Collation Algorithm,
 * giving a dictionary sorting of keys.
 *
 * This can give surprising results if you were expecting ASCII ordering.
 * See https://docs.couchdb.org/en/stable/ddocs/views/collation.html#collation-specification
 *
 * So we use a high value unicode character to terminate a range query prefix.
 * This will cause only string with a given prefix to match a range query
 */
export const COLLATION_SEQUENCE_MAX_CHAR = '\ufff0'
/**
 * This technically isn't the smallest char, but it's small enough for our needs
 */
export const COLLATION_SEQUENCE_MIN_CHAR = '0'

export function saveBlocksWith ({ pouchDb = internalPouchDb }) {
  return (blocks) => {
    return of(blocks)
      .map(
        map(pipe(
          applySpec({
            _id: (block) => createBlockId(block),
            height: prop('height'),
            timestamp: prop('timestamp'),
            type: always('block')
          }),
          /**
           * Ensure the expected shape before writing to the db
           */
          blockDocSchema.parse
        ))
      )
      .chain(fromPromise(docs => pouchDb.bulkDocs(docs)))
      .toPromise()
  }
}

export function findBlocksWith ({ pouchDb = internalPouchDb }) {
  function createQuery ({ minHeight, maxTimestamp }) {
    return {
      selector: {
        height: { $gte: minHeight },
        timestamp: { $lte: maxTimestamp }
      },
      sort: [{ height: 'asc' }],
      limit: Number.MAX_SAFE_INTEGER,
      use_index: BLOCKS_ASC_IDX
    }
  }

  return ({ minHeight, maxTimestamp }) => {
    return of({ minHeight, maxTimestamp })
      .map(createQuery)
      .chain(fromPromise((query) => {
        return pouchDb.find(query).then((res) => {
          if (res.warning) console.warn(res.warning)
          return res.docs
        })
      }))
      .map(map(toBlock))
      .toPromise()
  }
}
