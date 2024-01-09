export const loadProcessMetaWith = ({ fetch }) => {
  return async ({ suUrl, processId }) => {
    return fetch(`${suUrl}/processes/${processId}`, { method: 'GET' })
      .then(res => res.json())
  }
}
