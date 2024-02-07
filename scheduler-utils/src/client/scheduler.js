export function checkForRedirectWith ({ fetch }) {
  return async (url, process) => {
    const response = await fetch(`${url}?process-id=${process}`, { method: 'GET', redirect: 'manual' })
    // In an HTTP redirect the Location header is the new url
    if ([301, 302, 307, 308].includes(response.status)) {
      return response.headers.get('Location')
    }
    return url
  }
}
