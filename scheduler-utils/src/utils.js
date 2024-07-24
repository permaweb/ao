export function trimSlash (str = '') {
  str = str.trim()
  return str.endsWith('/') ? trimSlash(str.slice(0, -1)) : str
}
