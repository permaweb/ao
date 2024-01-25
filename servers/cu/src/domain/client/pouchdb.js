import { deflate, inflate } from 'node:zlib'
import { promisify } from 'node:util'

import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, head, isEmpty, isNotNil, lensPath, map, omit, pipe, prop, set } from 'ramda'
import { z } from 'zod'

import PouchDb from 'pouchdb'
import PouchDbFind from 'pouchdb-find'
import PouchDbHttp from 'pouchdb-adapter-http'
import PouchDbLevel from 'pouchdb-adapter-leveldb'

import { blockSchema, evaluationSchema, moduleSchema, processSchema } from '../model.js'

const deflateP = promisify(deflate)
const inflateP = promisify(inflate)

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
          type: evaluationDocSchema.shape.type.value
        }
      },
      ddoc: EVALS_ASC_IDX,
      name: EVALS_ASC_IDX
    }),
    internalPouchDb.createIndex({
      index: {
        fields: [{ height: 'asc' }],
        partial_filter_selector: {
          type: blockDocSchema.shape.type.value
        }
      },
      ddoc: BLOCKS_ASC_IDX,
      name: BLOCKS_ASC_IDX
    })
  ]).then(() => internalPouchDb)
}

const processDocSchema = z.object({
  _id: z.string().min(1),
  processId: processSchema.shape.id,
  signature: processSchema.shape.signature,
  data: processSchema.shape.data,
  anchor: processSchema.shape.anchor,
  owner: processSchema.shape.owner,
  tags: processSchema.shape.tags,
  block: processSchema.shape.block,
  type: z.literal('process')
})

const moduleDocSchema = z.object({
  _id: z.string().min(1),
  moduleId: moduleSchema.shape.id,
  tags: moduleSchema.shape.tags,
  wasm: moduleSchema.shape.wasm,
  type: z.literal('module')
})

const evaluationDocSchema = z.object({
  _id: z.string().min(1),
  processId: evaluationSchema.shape.processId,
  messageId: evaluationSchema.shape.messageId,
  timestamp: evaluationSchema.shape.timestamp,
  ordinate: evaluationSchema.shape.ordinate,
  blockHeight: evaluationSchema.shape.blockHeight,
  parent: z.string().min(1),
  evaluatedAt: evaluationSchema.shape.evaluatedAt,
  output: evaluationSchema.shape.output,
  type: z.literal('evaluation')
})

const blockDocSchema = z.object({
  _id: z.string().min(1),
  height: blockSchema.shape.height,
  timestamp: blockSchema.shape.timestamp,
  type: z.literal('block')
})

const messageHashDocSchema = z.object({
  _id: z.string().min(1),
  /**
   * The _id of the corresponding cached evaluation
   */
  parent: z.string().min(1),
  type: z.literal('messageHash')
})

function createEvaluationId ({ processId, timestamp, ordinate, cron }) {
  /**
   * transactions can sometimes start with an underscore,
   * which is not allowed in PouchDB, so prepend to create
   * an _id
   */
  return `eval-${[processId, timestamp, ordinate, cron].filter(isNotNil).join(',')}`
}

function createProcessId ({ processId }) {
  /**
   * transactions can sometimes start with an underscore,
   * which is not allowed in PouchDB, so prepend to create
   * an _id
   */
  return `proc-${processId}`
}

function createBlockId ({ height, timestamp }) {
  return `block-${height}-${timestamp}`
}

function createModuleId ({ moduleId }) {
  /**
   * transactions can sometimes start with an underscore,
   * which is not allowed in PouchDB, so prepend to create
   * an _id
   */
  return `module-${moduleId}`
}

function createMessageHashId ({ messageHash }) {
  /**
   * transactions can sometimes start with an underscore,
   * which is not allowed in PouchDB, so prepend to create
   * an _id
   */
  return `messageHash-${messageHash}`
}

const toEvaluation = applySpec({
  processId: prop('processId'),
  messageId: prop('messageId'),
  timestamp: prop('timestamp'),
  ordinate: prop('ordinate'),
  blockHeight: prop('blockHeight'),
  cron: prop('cron'),
  evaluatedAt: prop('evaluatedAt'),
  output: prop('output')
})

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
export const COLLATION_SEQUENCE_MIN_CHAR = '^'

export function findProcessWith ({ pouchDb }) {
  return ({ processId }) => of(processId)
    .chain(fromPromise(id => pouchDb.get(createProcessId({ processId: id }))))
    .bichain(
      (err) => {
        if (err.status === 404) return Rejected({ status: 404 })
        return Rejected(err)
      },
      (found) => of(found)
        .map(processDocSchema.parse)
        .map(applySpec({
          id: prop('processId'),
          signature: prop('signature'),
          data: prop('data'),
          anchor: prop('anchor'),
          owner: prop('owner'),
          tags: prop('tags'),
          block: prop('block')
        }))
    )
    .toPromise()
}

export function saveProcessWith ({ pouchDb }) {
  return (process) => {
    return of(process)
      .map(applySpec({
        _id: process => createProcessId({ processId: process.id }),
        processId: prop('id'),
        signature: prop('signature'),
        data: prop('data'),
        anchor: prop('anchor'),
        owner: prop('owner'),
        tags: prop('tags'),
        block: prop('block'),
        type: always('process')
      }))
      /**
       * Ensure the expected shape before writing to the db
       */
      .map(processDocSchema.parse)
      .chain((doc) =>
        of(doc)
          .chain(fromPromise((doc) => pouchDb.put(doc)))
          .bichain(
            (err) => {
              /**
               * Already exists, so just return the doc
               */
              if (err.status === 409) return Resolved(doc)
              return Rejected(err)
            },
            Resolved
          )
          .map(always(doc._id))
      )
      .toPromise()
  }
}

export function findEvaluationWith ({ pouchDb = internalPouchDb }) {
  const memoryLens = lensPath(['output', 'Memory'])

  return ({ processId, to, ordinate, cron }) => {
    return of({ processId, to, ordinate, cron })
      .chain(fromPromise(() => pouchDb.get(createEvaluationId({ processId, timestamp: to, ordinate, cron }))))
      .bichain(
        (err) => {
          if (err.status === 404) return Rejected({ status: 404 })
          return Rejected(err)
        },
        (found) => of(found)
          /**
           * Also retrieve the state buffer, persisted as an attachment
           * and set it on the output.Memory field to match the expected output shape
           */
          .chain(fromPromise(async (doc) => {
            const buffer = await pouchDb.getAttachment(doc._id, 'memory.txt')
            /**
             * Make sure to decompress the state buffer
             */
            return set(memoryLens, await inflateP(buffer), doc)
          }))
          /**
           * Ensure the input matches the expected
           * shape
           */
          .map(evaluationDocSchema.parse)
          .map(toEvaluation)
      )
      .toPromise()
  }
}

export function findLatestEvaluationWith ({ pouchDb = internalPouchDb }) {
  function createQuery ({ processId, to, ordinate, cron }) {
    const query = {
      selector: {
        _id: {
          /**
           * find any evaluations for the process
           */
          $gte: createEvaluationId({ processId, timestamp: '' }),
          /**
           * up to the latest evaluation.
           *
           * By using the max collation sequence char, this will give us all evaluations
           * for the process, all the way up to the latest
           */
          $lte: createEvaluationId({ processId, timestamp: COLLATION_SEQUENCE_MAX_CHAR })
        }
      },
      /**
       * _ids for sequential evals are monotonically increasing
       * and lexicographically sortable
       *
       * so by sorting descending, the first document will also be the latest
       * in the evaluation stream
       */
      sort: [{ _id: 'desc' }],
      /**
       * Only get the latest document within the range,
       * aka the latest evaluation
       */
      limit: 1,
      use_index: EVALS_ASC_IDX
    }

    /**
     * Criteria was provided, so overwrite upper range with actual upper range
     */
    if (to || ordinate || cron) {
      query.selector._id.$lte =
        `${createEvaluationId({ processId, timestamp: to, ordinate, cron })}${COLLATION_SEQUENCE_MAX_CHAR}`
    }

    return query
  }

  const foundEvaluationDocSchema = z.object({
    _id: z.string().min(1),
    processId: evaluationSchema.shape.processId,
    messageId: evaluationSchema.shape.messageId,
    timestamp: evaluationSchema.shape.timestamp,
    ordinate: evaluationSchema.shape.ordinate,
    blockHeight: evaluationSchema.shape.blockHeight,
    parent: z.string().min(1),
    evaluatedAt: evaluationSchema.shape.evaluatedAt,
    output: evaluationSchema.shape.output,
    type: z.literal('evaluation')
  })

  const memoryLens = lensPath(['output', 'Memory'])

  return ({ processId, to, ordinate, cron }) => {
    return of({ processId, to, ordinate, cron })
      .map(createQuery)
      .chain(fromPromise((query) => {
        return pouchDb.find(query)
          .then((res) => {
            if (res.warning) console.warn(res.warning)
            return res.docs
          })
      }))
      .map(head)
      .chain((doc) => doc ? Resolved(doc) : Rejected(undefined))
      /**
       * Also retrieve the state buffer, persisted as an attachment
       * and set it on the output.Memory field to match the expected output shape
       */
      .chain(fromPromise(async (doc) => {
        const buffer = await pouchDb.getAttachment(doc._id, 'memory.txt')
        /**
         * Make sure to decompress the state buffer
         */
        return set(memoryLens, await inflateP(buffer), doc)
      }))
      /**
       * Ensure the input matches the expected
       * shape
       */
      .map(foundEvaluationDocSchema.parse)
      .map(toEvaluation)
      .toPromise()
  }
}

export function saveEvaluationWith ({ pouchDb, logger: _logger }) {
  const logger = _logger.child('pouchDb:saveEvaluation')

  const saveEvaluationInputSchema = z.object({
    _id: z.string().min(1),
    deepHash: z.string().nullish(),
    processId: evaluationSchema.shape.processId,
    messageId: evaluationSchema.shape.messageId,
    timestamp: evaluationSchema.shape.timestamp,
    ordinate: evaluationSchema.shape.ordinate,
    blockHeight: evaluationSchema.shape.blockHeight,
    cron: evaluationSchema.shape.cron,
    parent: z.string().min(1),
    evaluatedAt: evaluationSchema.shape.evaluatedAt,
    /**
     * Omit buffer from the document schema (see _attachments below)
     */
    output: evaluationSchema.shape.output.omit({ Memory: true }),
    type: z.literal('evaluation'),
    /**
     * Since Bibo, the state of a process is a buffer, so we will store it as
     * a document attachment in PouchDb, then reassemable the evaluation shape
     * when it is used as a start point for eval (see findEvaluation)
     *
     * See https://pouchdb.com/api.html#save_attachment
     */
    _attachments: z.object({
      'memory.txt': z.object({
        content_type: z.literal('text/plain'),
        data: z.any()
      })
    })
  })

  return (evaluation) => {
    return of(evaluation)
      .chain(fromPromise(async (evaluation) =>
        applySpec({
        /**
         * The processId concatenated with the timestamp, and possible the cron (if defined)
         * is used as the _id for an evaluation
         *
         * This makes it easier to query using a range query against the
         * primary index
         */
          _id: (evaluation) =>
            createEvaluationId({
              processId: evaluation.processId,
              timestamp: evaluation.timestamp,
              ordinate: evaluation.ordinate,
              /**
               * By appending the cron identifier to the evaluation doc _id,
               *
               * this guarantees the document will have a unique, but sortable, _id
               */
              cron: evaluation.cron
            }),
          processId: prop('processId'),
          messageId: prop('messageId'),
          timestamp: prop('timestamp'),
          ordinate: prop('ordinate'),
          blockHeight: prop('blockHeight'),
          cron: prop('cron'),
          parent: (evaluation) => createProcessId({ processId: evaluation.processId }),
          output: pipe(
            prop('output'),
            /**
             * Make sure to omit the buffer from the output field
             * on the document. We will instead persist the state buffer
             * as an attachment (see below)
             */
            omit(['Memory'])
          ),
          evaluatedAt: prop('evaluatedAt'),
          type: always('evaluation'),
          /**
           * Store the state produced from the evaluation
           * as an attachment. This allows for efficient storage
           * and retrieval of the Buffer
           *
           * See https://pouchdb.com/api.html#save_attachment
           */
          _attachments: always({
            'memory.txt': {
              content_type: 'text/plain',
              /**
               * zlib compress the buffer before persisting
               *
               * In testing, this results in orders of magnitude
               * smaller buffer and smaller persistence times
               */
              data: await deflateP(evaluation.output.Memory)
            }
          })
        })(evaluation)
      ))
      /**
       * Ensure the expected shape before writing to the db
       */
      .map(saveEvaluationInputSchema.parse)
      .map((evaluationDoc) => {
        if (!evaluation.deepHash) return [evaluationDoc]

        logger('Creating messageHash doc for deepHash "%s"', evaluation.deepHash)
        /**
         * Create an messageHash doc that we can later query
         * to prevent duplicate evals from duplicate cranks
         */
        return [
          evaluationDoc,
          messageHashDocSchema.parse({
            _id: createMessageHashId({ messageHash: evaluation.deepHash }),
            parent: evaluationDoc._id,
            type: 'messageHash'
          })
        ]
      })
      .chain(docs =>
        of(docs)
          .chain(fromPromise(docs => pouchDb.bulkDocs(docs)))
          .bimap(
            logger.tap('Encountered an error when caching evaluation docs'),
            logger.tap('Successfully cached evaluation docs')
          )

      )
      .toPromise()
  }
}

export function findEvaluationsWith ({ pouchDb = internalPouchDb }) {
  function createQuery ({ processId, from, to, onlyCron, sort, limit }) {
    const query = {
      selector: {
        _id: {
          $gt: createEvaluationId({ processId, timestamp: '' }),
          $lte: createEvaluationId({ processId, timestamp: COLLATION_SEQUENCE_MAX_CHAR })
        },
        ...(onlyCron ? { cron: { $exists: true } } : {})
      },
      limit,
      sort: [{ _id: sort }],
      use_index: onlyCron ? CRON_EVALS_ASC_IDX : EVALS_ASC_IDX
    }

    /**
     * trim range using criteria, if provided.
     *
     * from is exclusive, while to is inclusive
     */
    if (!isEmpty(from)) query.selector._id.$gt = `${createEvaluationId({ processId, timestamp: from.timestamp, ordinate: from.ordinate, cron: from.cron })}`
    if (!isEmpty(to)) query.selector._id.$lte = `${createEvaluationId({ processId, timestamp: to.timestamp, ordinate: to.ordinate, cron: to.cron })}`

    return query
  }

  return ({ processId, from, to, onlyCron, sort, limit }) => {
    return of({ processId, from, to, onlyCron, sort: sort.toLowerCase(), limit })
      .map(createQuery)
      .chain(fromPromise((query) => {
        return pouchDb.find(query).then((res) => {
          if (res.warning) console.warn(res.warning)
          return res.docs
        })
      }))
      .map(map(toEvaluation))
      .toPromise()
  }
}

export function saveModuleWith ({ pouchDb = internalPouchDb, logger }) {
  const saveModuleInputSchema = z.object({
    _id: z.string().min(1),
    moduleId: moduleDocSchema.shape.moduleId,
    tags: moduleDocSchema.shape.tags,
    type: z.literal('module'),
    /**
     * We attach the module wasm as an attachment
     * to the module document
     *
     * See https://pouchdb.com/api.html#save_attachment
     */
    _attachments: z.object({
      'wasm.txt': z.object({
        content_type: z.literal('text/plain'),
        data: z.any()
      })
    })
  })

  return (module) => {
    return of(module)
      .chain(fromPromise(async (module) =>
        applySpec({
          _id: (module) => createModuleId({ moduleId: module.id }),
          moduleId: prop('id'),
          tags: prop('tags'),
          type: always('module'),
          /**
           * Store the module wasm
           * as an attachment. This allows for efficient storage
           * and retrieval of the Buffer
           *
           * See https://pouchdb.com/api.html#save_attachment
           */
          _attachments: always({
            'wasm.txt': {
              content_type: 'text/plain',
              /**
               * zlib compress the buffer before persisting
               *
               * In testing, this results in orders of magnitude
               * smaller buffer and smaller persistence times
               */
              data: await deflateP(module.wasm)
            }
          })
        })(module)
      ))
      /**
       * Ensure the expected shape before writing to the db
       */
      .map(saveModuleInputSchema.parse)
      .map((moduleDoc) => {
        logger('Creating module doc for module "%s"', module.id)
        return moduleDoc
      })
      .chain((doc) =>
        of(doc)
          .chain(fromPromise((doc) => pouchDb.put(doc)))
          .bichain(
            (err) => {
              /**
               * Already exists, so just return the doc
               */
              if (err.status === 409) return Resolved(doc)
              return Rejected(err)
            },
            Resolved
          )
          .map(always(doc._id))
      )
      .toPromise()
  }
}

export function findModuleWith ({ pouchDb = internalPouchDb }) {
  const wasmLens = lensPath(['wasm'])

  return ({ moduleId }) => {
    return of({ moduleId })
      .chain(fromPromise(() => pouchDb.get(createModuleId({ moduleId }))))
      .bichain(
        (err) => {
          if (err.status === 404) return Rejected({ status: 404 })
          return Rejected(err)
        },
        (found) => of(found)
          /**
           * Also retrieve the module wasm buffer, persisted as an attachment
           * and set it on the output.Memory field to match the expected output shape
           */
          .chain(fromPromise(async (doc) => {
            const buffer = await pouchDb.getAttachment(doc._id, 'wasm.txt')
            /**
             * Make sure to decompress the wasm buffer
             */
            return set(wasmLens, await inflateP(buffer), doc)
          }))
          /**
           * Ensure the input matches the expected
           * shape
           */
          .map(moduleDocSchema.parse)
          .map(applySpec({
            id: prop('moduleId'),
            tags: prop('tags'),
            wasm: prop('wasm')
          }))
      )
      .toPromise()
  }
}

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

export function findMessageHashWith ({ pouchDb }) {
  return ({ messageHash }) => of(messageHash)
    .chain(fromPromise((hash) => pouchDb.get(createMessageHashId({ messageHash: hash }))))
    .bichain(
      (err) => {
        if (err.status === 404) return Rejected({ status: 404 })
        return Rejected(err)
      },
      (found) => of(found)
        .map(messageHashDocSchema.parse)
    )
    .toPromise()
}
