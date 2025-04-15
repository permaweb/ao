import { Rejected, fromPromise, of } from 'hyper-async'

import { toDataItemSigner } from './signer.js'
import { verify } from '../lib/data-item.js'

function signDataItemChain(args, logger) {
  return of(args)
    .chain(fromPromise(({ processId, data, tags, anchor, signer }) =>
      toDataItemSigner(signer)({ data, tags, target: processId, anchor })
    ))
    .map(logger.tap('Successfully built and signed data item'));
}

function sendDataItemChain(signedDataItem, { fetch, MU_URL, logger, verifyBeforeSend = false }) {
  let chain = of(signedDataItem);
  if (verifyBeforeSend) {
    chain = chain.chain(fromPromise(async (item) => {
      const verified = await verify(item.raw);
      if (!verified) throw new Error('Signed data item verification failed.');
      return item;
    }));
  }
  return chain
    .chain(fromPromise(async (item) =>
      fetch(MU_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          Accept: 'application/json'
        },
        redirect: 'follow',
        body: item.raw
      })
    ))
    .bichain(
      (err) => {
        if (err.name === 'RedirectRequested') {
          return Rejected(err);
        } else {
          return Rejected(new Error(`Error while communicating with MU: ${JSON.stringify(err)}`));
        }
      },
      fromPromise(async (res) => {
        if (res.ok) return res.json();
        throw new Error(`${res.status}: ${await res.text()}`);
      })
    )
    .bimap(
      logger.tap('Error encountered when writing message via MU'),
      logger.tap('Successfully wrote message via MU')
    )
    .map((res) => ({ res, messageId: signedDataItem.id }));
}

/**
 * @typedef Env3
 * @property {fetch} fetch
 * @property {string} MU_URL
 *
 * @typedef WriteMessageTx
 * @property { any } signedData - DataItem returned from arbundles createData
 *
 * @typedef WriteMessage2Args
 * @property {WriteMessageTx} transaction
 *
 * @callback WriteMessage2
 * @param {WriteMessage2Args} args
 * @returns {Promise<Record<string, any>}
 *
 * @param {Env3} env
 * @returns {WriteMessage2}
 */
export function deployMessageWith({ fetch, MU_URL, logger: _logger }) {
  const logger = _logger.child('deployMessage');
  return (args) => {
    return signDataItemChain(args, logger)
      .chain((signedDataItem) => sendDataItemChain(signedDataItem, { fetch, MU_URL, logger }))
      .toPromise();
  };
}

export function signMessageWith({ logger: _logger }) {
  const logger = _logger.child('signMessage');
  return (args) => {
    return signDataItemChain(args, logger).toPromise();
  };
}

export function sendSignedMessageWith({ fetch, MU_URL, logger: _logger }) {
  const logger = _logger.child('sendSignedMessage');
  return (signedDataItem) => {
    return sendDataItemChain(signedDataItem, { fetch, MU_URL, logger, verifyBeforeSend: true }).toPromise();
  };
}

/**
 * @typedef Env3
 * @property {fetch} fetch
 * @property {string} MU_URL
 *
 * @typedef RegisterProcess
 * @property { any } signedData - DataItem returned from arbundles createData
 *
 * @callback RegisterProcess
 * @returns {Promise<Record<string, any>}
 *
 * @param {Env3} env
 * @returns {RegisterProcess}
 */
export function deployProcessWith({ fetch, MU_URL, logger: _logger }) {
  const logger = _logger.child('deployProcess')

  return (args) => {
    return (
      of(args)
        /**
         * Sign with the provided signer
         */
        .chain(
          fromPromise(({ data, tags, signer }) =>
            toDataItemSigner(signer)({ data, tags })
          )
        )
        .map(logger.tap('Successfully built and signed data item'))
        .chain((signedDataItem) =>
          of(signedDataItem)
            .chain(
              fromPromise(async (signedDataItem) =>
                fetch(MU_URL, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/octet-stream',
                    Accept: 'application/json'
                  },
                  redirect: 'follow',
                  body: signedDataItem.raw
                })
              )
            )
            .bichain(
              (err) =>
                Rejected(
                  new Error(
                    `Error while communicating with MU: ${JSON.stringify(err)}`
                  )
                ),
              fromPromise(async (res) => {
                if (res.ok) return res.json()
                throw new Error(`${res.status}: ${await res.text()}`)
              })
            )
            .bimap(
              logger.tap('Error encountered when deploying process via MU'),
              logger.tap('Successfully deployed process via MU')
            )
            .map((res) => ({ res, processId: signedDataItem.id }))
        )
        .toPromise()
    )
  }
}

/**
 * @typedef Env4
 * @property {fetch} fetch
 * @property {string} MU_URL
 * @property {Logger} logger
 *
 * @callback MonitorResult
 * @returns {Promise<Record<string, any>}
 * @param {Env4} env
 * @returns {MonitorResult}
 */
export function deployMonitorWith({ fetch, MU_URL, logger: _logger }) {
  const logger = _logger.child('deployMonitor')

  return (args) =>
    of(args)
      /**
       * Sign with the provided signer
       */
      .chain(
        fromPromise(({ processId, data, tags, anchor, signer }) =>
          toDataItemSigner(signer)({ data, tags, target: processId, anchor })
        )
      )
      .map(logger.tap('Successfully built and signed data item'))
      .chain((signedDataItem) =>
        of(signedDataItem)
          .chain(
            fromPromise(async (signedDataItem) =>
              fetch(MU_URL + '/monitor/' + args.processId, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/octet-stream',
                  Accept: 'application/json'
                },
                redirect: 'follow',
                body: signedDataItem.raw
              })
            )
          )
          .bichain(
            (err) =>
              Rejected(
                new Error(
                  `Error while communicating with MU: ${JSON.stringify(err)}`
                )
              ),
            fromPromise(async (res) => {
              /**
               * Response from MU is not used, so just return some json
               */
              if (res.ok) return { ok: true }
              throw new Error(`${res.status}: ${await res.text()}`)
            })
          )
          .bimap(
            logger.tap('Error encountered when subscribing to process via MU'),
            logger.tap('Successfully subscribed to process via MU')
          )
          .map((res) => ({ res, messageId: signedDataItem.id }))
      )
      .toPromise()
}

/**
 * @typedef Env5
 * @property {fetch} fetch
 * @property {string} MU_URL
 * @property {Logger} logger
 *
 * @callback MonitorResult
 * @returns {Promise<Record<string, any>}
 * @param {Env5} env
 * @returns {MonitorResult}
 */
export function deployUnmonitorWith({ fetch, MU_URL, logger: _logger }) {
  const logger = _logger.child('deployUnmonitor')

  return (args) =>
    of(args)
      /**
       * Sign with the provided signer
       */
      .chain(
        fromPromise(({ processId, data, tags, anchor, signer }) =>
          toDataItemSigner(signer)({ data, tags, target: processId, anchor })
        )
      )
      .map(logger.tap('Successfully built and signed data item'))
      .chain((signedDataItem) =>
        of(signedDataItem)
          .chain(
            fromPromise(async (signedDataItem) =>
              fetch(MU_URL + '/monitor/' + args.processId, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/octet-stream',
                  Accept: 'application/json'
                },
                redirect: 'follow',
                body: signedDataItem.raw
              })
            )
          )
          .bichain(
            (err) =>
              Rejected(
                new Error(
                  `Error while communicating with MU: ${JSON.stringify(err)}`
                )
              ),
            fromPromise(async (res) => {
              /**
               * Response from MU is not used, so just return some json
               */
              if (res.ok) return { ok: true }
              throw new Error(`${res.status}: ${await res.text()}`)
            })
          )
          .bimap(
            logger.tap(
              'Error encountered when unsubscribing to process via MU'
            ),
            logger.tap('Successfully unsubscribed to process via MU')
          )
          .map((res) => ({ res, messageId: signedDataItem.id }))
      )
      .toPromise()
}

/**
 * @typedef Env6
 * @property {fetch} fetch
 * @property {string} MU_URL
 *
 *
 * @typedef WriteAssignArgs
 * @property {string} process
 * @property {string} message
 * @property {string[]} [exclude]
 * @property {boolean} [baseLayer]
 *
 * @callback WriteAssign
 * @param {WriteAssignArgs} args
 * @returns {Promise<Record<string, any>}
 *
 * @param {Env6} env
 * @returns {WriteAssign}
 */
export function deployAssignWith({ fetch, MU_URL, logger: _logger }) {
  const logger = _logger.child('deployAssign')

  return (args) => {
    return of(args)
      .chain(
        fromPromise(async ({ process, message, baseLayer, exclude }) =>
          fetch(
            `${MU_URL}?process-id=${process}&assign=${message}${baseLayer ? '&base-layer' : ''
            }${exclude ? '&exclude=' + exclude.join(',') : ''}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                Accept: 'application/json'
              }
            }
          )
        )
      )
      .bichain(
        (err) =>
          Rejected(
            new Error(
              `Error while communicating with MU: ${JSON.stringify(err)}`
            )
          ),
        fromPromise(async (res) => {
          if (res.ok) return res.json()
          throw new Error(`${res.status}: ${await res.text()}`)
        })
      )
      .bimap(
        logger.tap('Error encountered when writing assignment via MU'),
        logger.tap('Successfully wrote assignment via MU')
      )
      .map((res) => ({ res, assignmentId: res.id }))
      .toPromise()
  }
}