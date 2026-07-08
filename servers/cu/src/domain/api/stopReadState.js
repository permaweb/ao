import { of } from 'hyper-async'

import { stopPendingReadStatesForProcess } from './readState.js'

export function stopReadStateWith ({ logger }) {
  return ({ processId }) =>
    of({ processId })
      .map(stopPendingReadStatesForProcess)
      .map((res) => {
        logger(
          'Stopped %d pending readState operations for process "%s": %j',
          res.count,
          processId,
          res.stopped
        )
        return res
      })
}
