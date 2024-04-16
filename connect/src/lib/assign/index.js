import { identity } from 'ramda'
import { of } from 'hyper-async'

// eslint-disable-next-line no-unused-vars
import { errFrom } from '../utils.js'
import { sendAssignWith } from './send-assign.js'

/**
 * @typedef Env1
 *
 * @typedef AssignArgs
 * @property {string} process
 * @property {string} message
 * @property {string[]} [exclude]
 * @property {boolean} [baseLayer]
 *
 * @callback Assign
 * @param {AssignArgs} args
 * @returns {Promise<string>} the id of the data item that represents this assignment
 *
 * @param {Env1} - the environment
 * @returns {Assign}
 */
export function assignWith (env) {
  const sendAssign = sendAssignWith(env)

  return ({ process, message, baseLayer, exclude }) => {
    return of({ process, message, baseLayer, exclude })
      .chain(sendAssign)
      .map((ctx) => ctx.assignmentId)
      .bimap(errFrom, identity)
      .toPromise()
  }
}
