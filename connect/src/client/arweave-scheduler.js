/**
 * Native Arweave L1 transport for processes scheduled by
 * `arweave-scheduler@1.0'.
 *
 * On this scheduler the base layer *is* the ordering: a message is a signed,
 * data-free Arweave transaction whose `target' is the process. The scheduler
 * indexes each confirmed block and routes those transactions to the processes
 * they address, so a transaction only receives a slot after confirmation.
 *
 * This is a different transaction format to the ANS-104 data items used by
 * `legacy' and `mainnet' mode, which is why it is a separate MODE rather than
 * an option beside one: a tag cannot select a transaction format, and an
 * incomplete upgrade must fail loudly instead of silently sending the wrong
 * shape.
 */

/**
 * Join a node base URL with a path.
 *
 * `joinUrl' from lib/utils appends to `pathname', which percent-encodes `?'.
 * Every read here carries a query string, so it needs a plain join.
 */
const nodeUrl = (base, path) =>
  `${String(base).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`

/**
 * Render a tag value, refusing anything that is not already a primitive.
 *
 * `String(value)' on an object yields "[object Object]", which is not a valid
 * structured-field item. Such a tag is accepted by Arweave but crashes a
 * HyperBEAM node's block synchronizer when it indexes the transaction -- and
 * that synchronizer is global, so one bad tag stops scheduling for every
 * process on that node. A permanent transaction cannot be withdrawn, so this
 * is checked before signing rather than reported afterwards.
 */
const tagValue = (name, value) => {
  const type = typeof value
  if (type === 'string') return value
  if (type === 'number' || type === 'bigint' || type === 'boolean') return String(value)
  throw new Error(
    `Tag "${name}" must be a string, number, bigint or boolean; received ${
      value === null ? 'null' : type
    }. Serialize it yourself rather than letting it stringify to "[object Object]".`
  )
}

/** The scheduler device a process must declare for this mode to apply. */
export const ARWEAVE_SCHEDULER_DEVICE = 'arweave-scheduler@1.0'

/**
 * Messages must be data-free: the scheduler only routes transactions whose
 * `data_size' is 0, and only to their native recipient plus `Assign-To'.
 */
const MESSAGE_DATA = ''
/** The AO amount travels in the tags; the native quantity is not a transfer. */
const MESSAGE_QUANTITY = '0'

const DEFAULT_ASSIGNMENT_TIMEOUT_MS = 20 * 60 * 1000
const DEFAULT_ASSIGNMENT_INTERVAL_MS = 10 * 1000
/** `get_schedule' caps a single assignment query at 1000 slots. */
const MAX_SCHEDULE_PAGE = 1000

export class PendingAssignmentError extends Error {
  constructor ({ process, id, waitedMs }) {
    super(
      `Transaction ${id} was accepted but has not been assigned a slot on ` +
      `process ${process} yet. It may still be confirming on Arweave. ` +
      'Reconcile this transaction before creating another.'
    )
    this.name = 'PendingAssignmentError'
    this.code = 'AO_ASSIGNMENT_PENDING'
    this.process = process
    this.id = id
    this.waitedMs = waitedMs
    this.retryable = true
  }
}

export class SchedulerMismatchError extends Error {
  constructor ({ process, schedulerDevice }) {
    super(
      `Process ${process} is scheduled by ${schedulerDevice ?? 'an unknown device'}, ` +
      `not ${ARWEAVE_SCHEDULER_DEVICE}. Use the MODE that matches its scheduler.`
    )
    this.name = 'SchedulerMismatchError'
    this.code = 'AO_SCHEDULER_MISMATCH'
    this.process = process
    this.schedulerDevice = schedulerDevice
    this.retryable = false
  }
}

/**
 * Resolve the arweave-js instance lazily.
 *
 * Callers may inject an instance (browsers usually already have one, and
 * bundling a second copy is expensive). Otherwise it is imported on first use
 * so the dependency never enters a bundle that only reads state.
 */
export const resolveArweave = async ({ arweave, GATEWAY_URL }) => {
  if (arweave) return typeof arweave === 'function' ? arweave() : arweave
  const { default: Arweave } = await import('arweave')
  const url = new globalThis.URL(GATEWAY_URL ?? 'https://arweave.net')
  return Arweave.init({
    host: url.hostname,
    port: url.port ? Number(url.port) : url.protocol === 'http:' ? 80 : 443,
    protocol: url.protocol.replace(':', ''),
    timeout: 120_000,
    logging: false
  })
}

/**
 * Pull an atomic amount out of a response body as a digit string.
 *
 * Token balances at denomination 12 routinely exceed Number.MAX_SAFE_INTEGER,
 * and JSON numbers are IEEE doubles: `JSON.parse' would silently round them.
 * The digits are therefore read from the raw text and never become a Number.
 */
export const atomicFromText = (text, keys) => {
  const trimmed = String(text).trim()
  if (/^\d+$/.test(trimmed)) return trimmed
  for (const key of keys) {
    const escaped = String(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = trimmed.match(new RegExp(`"${escaped}"\\s*:\\s*"?(\\d+)"?`))
    if (match) return match[1]
  }
  return null
}

const asJson = async (response) => {
  const text = await response.text()
  try { return JSON.parse(text) } catch { return text }
}

/**
 * Resolve the many shapes a caller may pass as a signer into one contract:
 * `(tx, { arweave }) => Promise<Transaction | void>`.
 *
 * A JWK is signed locally through arweave-js. A browser wallet exposing
 * `sign(tx)` is delegated to. A function is assumed to be a custody adapter and
 * is handed the whole transaction, so it can review every signed field rather
 * than a bare digest.
 */
export const toTransactionSigner = (signer) => {
  if (!signer) return undefined
  if (typeof signer === 'function') return signer
  if (typeof signer.sign === 'function') {
    return async (tx) => signer.sign(tx)
  }
  if (typeof signer === 'object' && signer.n && signer.d) {
    return async (tx, { arweave }) => { await arweave.transactions.sign(tx, signer) }
  }
  throw new Error(
    'Unsupported signer. Provide a JWK, an object with sign(tx), or a ' +
    'function (tx, { arweave }) that signs the transaction.'
  )
}

/**
 * Read a process's authenticated configuration from the node and confirm it is
 * scheduled by `arweave-scheduler@1.0' before anything is signed. An exchange
 * that upgrades its SDK but not its process id should fail here, not after
 * broadcasting a transaction the process will never see.
 */
export function verifyProcessWith ({ fetch, URL: baseUrl }) {
  const cache = new Map()
  return async (process) => {
    if (cache.has(process)) return cache.get(process)
    const response = await fetch(
      nodeUrl(baseUrl, `/${process}/now`),
      { headers: { accept: 'application/json' } }
    )
    if (!response.ok) {
      throw new Error(`Could not read process ${process} from ${baseUrl} (${response.status}).`)
    }
    const state = await asJson(response)
    const schedulerDevice = state?.['scheduler-device']
    if (schedulerDevice !== ARWEAVE_SCHEDULER_DEVICE) {
      throw new SchedulerMismatchError({ process, schedulerDevice })
    }
    const definition = {
      process,
      schedulerDevice,
      executionDevice: state?.['execution-device'],
      denomination: state?.denomination,
      ticker: state?.ticker
    }
    cache.set(process, definition)
    return definition
  }
}

/** Current contiguous head slot for a process, or -1 when it has none yet. */
export function currentSlotWith ({ fetch, URL: baseUrl }) {
  return async (process) => {
    const response = await fetch(
      // The scheduler is addressed at the node with a `target', not as a
      // device on the process message: the latter resolves the process as the
      // base and fails to load its commitments from the volatile cache.
      nodeUrl(baseUrl, `/~${ARWEAVE_SCHEDULER_DEVICE}/slot&target=${process}`),
      { headers: { accept: 'application/json' } }
    )
    if (!response.ok) return -1
    const body = await asJson(response)
    const current = Number(body?.current)
    return Number.isInteger(current) ? current : -1
  }
}

const assignmentEntries = (bundle) => {
  if (Array.isArray(bundle)) return bundle
  if (bundle && typeof bundle === 'object') {
    if (Array.isArray(bundle.assignments)) return bundle.assignments
    if (Array.isArray(bundle.edges)) return bundle.edges.map((edge) => edge?.node ?? edge)
    return Object.entries(bundle)
      .filter(([key]) => /^\d+$/.test(key))
      .map(([, value]) => value)
  }
  return []
}

/** The transaction id an assignment carries, wherever the codec surfaced it. */
const assignmentMessageId = (entry) =>
  entry?.body?.id ?? entry?.message?.id ?? entry?.id ?? entry?.['body+link']

const assignmentSlot = (entry) => {
  const slot = entry?.slot ?? entry?.assignment?.slot ?? entry?.body?.slot
  const parsed = Number(slot)
  return Number.isInteger(parsed) ? parsed : undefined
}

export function readScheduleWith ({ fetch, URL: baseUrl }) {
  return async ({ process, from, to }) => {
    const path = `/${process}~process@1.0/schedule?from=${from}&to=${to}`
    const response = await fetch(
      nodeUrl(baseUrl, path),
      { headers: { accept: 'application/json' } }
    )
    if (!response.ok) return []
    return assignmentEntries(await asJson(response))
  }
}

/**
 * Poll until the scheduler has given `message' a slot on `process'.
 *
 * `from' bounds the scan: `message()' records the head slot before it
 * broadcasts, so a resumed wait never rescans the whole schedule and never
 * matches an older transaction.
 */
export function waitForAssignmentWith (deps) {
  const currentSlot = currentSlotWith(deps)
  const readSchedule = readScheduleWith(deps)
  return async ({
    process,
    message,
    from = 0,
    timeout = DEFAULT_ASSIGNMENT_TIMEOUT_MS,
    interval = DEFAULT_ASSIGNMENT_INTERVAL_MS
  }) => {
    if (!process) throw new Error('process is required')
    if (!message) throw new Error('message is required')
    const startedAt = Date.now()
    let cursor = Math.max(0, from)
    while (true) {
      const head = await currentSlot(process)
      while (cursor <= head) {
        const to = Math.min(head, cursor + MAX_SCHEDULE_PAGE - 1)
        const entries = await readSchedule({ process, from: cursor, to })
        for (const entry of entries) {
          if (assignmentMessageId(entry) === message) {
            const slot = assignmentSlot(entry)
            if (slot !== undefined) return String(slot)
          }
        }
        cursor = to + 1
      }
      if (Date.now() - startedAt >= timeout) {
        throw new PendingAssignmentError({ process, id: message, waitedMs: Date.now() - startedAt })
      }
      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  }
}

/**
 * Build, sign and submit a message as a native Arweave transaction.
 *
 * Submission goes through the node's `~process@1.0/schedule' endpoint, which
 * verifies the signed transaction actually targets the requested process before
 * relaying it to Arweave and answers 202 on acceptance. 202 means accepted for
 * scheduling, not executed: the transfer only takes effect once the process
 * computes the slot.
 */
export function messageWith (deps) {
  const { fetch, URL: baseUrl, signer: defaultSigner } = deps
  const verifyProcess = verifyProcessWith(deps)
  const currentSlot = currentSlotWith(deps)
  const waitForAssignment = waitForAssignmentWith(deps)

  return async ({
    process,
    signer = defaultSigner,
    tags = [],
    anchor,
    returnMessageId = false,
    returnAssignmentSlot = false,
    assignmentTimeout,
    assignmentInterval,
    submit = 'gateway',
    assignTo = false
  }) => {
    if (!process) throw new Error('process is required')
    const sign = toTransactionSigner(signer)
    if (!sign) throw new Error('signer is required')

    // Check the process before signing, not after broadcasting.
    await verifyProcess(process)

    // Bound the later assignment scan to slots created after this point.
    const slotBefore = await currentSlot(process)

    const arweave = await resolveArweave(deps)
    // The scheduler routes a data-free transaction to its native recipient AND
    // to every process named in `Assign-To'. Naming the process as the native
    // target is the plain form, but Arweave prices a transaction by its target,
    // and a target address that has never held AR carries a large one-off
    // account-activation surcharge. `assignTo' routes the same message with no
    // native target, at the ordinary zero-data price.
    const tx = assignTo
      ? await arweave.createTransaction({ data: new Uint8Array() })
      : await arweave.createTransaction({
        target: process,
        quantity: MESSAGE_QUANTITY,
        data: MESSAGE_DATA
      })
    if (assignTo) tx.addTag('Assign-To', process)
    for (const { name, value } of tags) tx.addTag(name, tagValue(name, value))
    if (anchor) tx.last_tx = anchor

    const signed = (await sign(tx, { arweave, process })) || tx
    if (!signed.signature) throw new Error('signer did not sign the transaction')

    if (submit === 'node') {
      // The node's `schedule' endpoint validates targeting and relays to
      // Arweave, but it expects a HyperBEAM-encoded message rather than
      // arweave-js transaction JSON, so it stays opt-in.
      const response = await fetch(
        nodeUrl(baseUrl, `/${process}~process@1.0/schedule`),
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(typeof signed.toJSON === 'function' ? signed.toJSON() : signed)
        }
      )
      if (!response.ok) {
        const body = await asJson(response)
        const error = new Error(
          `Message submission failed (${response.status}): ${
            typeof body === 'string' ? body.slice(0, 200) : body?.reason ?? body?.error ?? 'unknown'
          }`
        )
        error.status = response.status
        error.code = body?.code
        error.process = process
        error.id = signed.id
        throw error
      }
    } else {
      // Submit to Arweave itself. The scheduler indexes each confirmed block
      // and routes data-free transactions to the processes they address, so
      // acceptance here is acceptance for scheduling, not execution: the
      // transfer only takes effect once the process computes its slot.
      const posted = await arweave.transactions.post(signed)
      if (![200, 202, 208].includes(posted.status)) {
        const error = new Error(
          `Message submission failed (${posted.status}): ${posted.statusText ?? 'unknown'}`
        )
        error.status = posted.status
        error.process = process
        error.id = signed.id
        throw error
      }
    }

    // The native TXID is the message id in this mode. Unlike ANS-104 modes
    // there is no slot to return yet -- the scheduler only assigns one after
    // the transaction confirms -- so the id is the only immediate answer.
    const id = signed.id

    if (!returnAssignmentSlot) return id

    const slot = await waitForAssignment({
      process,
      message: id,
      from: slotBefore + 1,
      timeout: assignmentTimeout,
      interval: assignmentInterval
    })
    return returnMessageId ? { id, slot } : slot
  }
}

/**
 * Read a token balance through the `token@1.0' `balance' key.
 *
 * The key resolves the process's mint-device normalization before reading, so
 * it reports the settled balance. Raw `balances/...' trie leaves can omit
 * accrued rewards and are inspection-only.
 */
export function balanceWith ({ fetch, URL: baseUrl }) {
  return async ({ process, address, recipient }) => {
    const owner = address ?? recipient
    if (!process) throw new Error('process is required')
    if (!owner) throw new Error('address is required')
    // The `~process@1.0' prefix is required: without it the node answers the
    // process's base message instead of resolving the key.
    const path =
      `/${process}~process@1.0/now/as/balance?as=execution&balance=${encodeURIComponent(owner)}`
    const response = await fetch(
      nodeUrl(baseUrl, path),
      { headers: { accept: 'application/json' } }
    )
    if (!response.ok) {
      throw new Error(`Balance read failed for ${owner} on ${process} (${response.status}).`)
    }
    // A resolved device key answers `{ 'ao-result': 'body', body: <scalar> }`.
    // The deployed token@1.0 build canonicalizes balance trie keys to
    // lowercase, so a raw trie read is matched case-insensitively too.
    const atomic = atomicFromText(await response.text(), [
      'body',
      'balance',
      owner,
      String(owner).toLowerCase()
    ])
    if (atomic !== null) return atomic
    // An unavailable balance must stay unavailable rather than become zero.
    throw new Error(`Balance response for ${owner} on ${process} contained no balance.`)
  }
}

/** Read the computed result for a slot, waiting for assignment if given a TXID. */
export function resultWith (deps) {
  const { fetch, URL: baseUrl } = deps
  const waitForAssignment = waitForAssignmentWith(deps)
  return async ({ process, slot, message, from }) => {
    if (!process) throw new Error('process is required')
    let target = slot
    if (target === undefined) {
      if (!message) throw new Error('slot or message is required')
      target = await waitForAssignment({ process, message, from })
    }
    const response = await fetch(
      nodeUrl(baseUrl, `/${process}~process@1.0/compute/results=${target}`),
      { headers: { accept: 'application/json' } }
    )
    if (!response.ok) throw new Error(`Result read failed for slot ${target} (${response.status}).`)
    return asJson(response)
  }
}

/** Raw read against the node, for paths this mode does not wrap. */
export function requestWith ({ fetch, URL: baseUrl }) {
  return async ({ path, method = 'GET', headers = {}, body }) => {
    const response = await fetch(nodeUrl(baseUrl, path), {
      method,
      headers: { accept: 'application/json', ...headers },
      ...(body === undefined ? {} : { body })
    })
    return asJson(response)
  }
}
