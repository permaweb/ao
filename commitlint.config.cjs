const fs = require('node:fs');
const path = require('node:path');

function findDirectories(srcDir, {ignore = [] } = {}) {
  return fs.readdirSync(srcDir).filter((file) => {
    if (ignore.includes(file)) return false
    if (file.startsWith('.')) return false // ignore hidden directories
    return fs.statSync(path.join(srcDir, file)).isDirectory()
  })
}

/**
 * A function that given a list of allowed scopes
 * will enforce CommitLint rules:
 * 
 * - A scope is always provided in the commit message
 * - The scope is one or multiple of the allowed scopes
 *
 * See https://www.conventionalcommits.org/en/v1.0.0/#commit-message-with-scope for scopes
 * when using conventional commits
 *
 * @param {string[]} scopes - an array of allowed scopes
 */
const RequireScopes = (scopes) => ({
  'scope-empty': [2, 'never'],
  'scope-enum': [2, 'always', scopes]
})

module.exports = {
  extends: [
    '@commitlint/config-conventional'
  ],
  rules: {
    ...RequireScopes([
      'repo', // denotes repo-wide changes ie. monorepo tooling, monorepo docs etc.
      ...findDirectories(path.join(__dirname, 'servers')), // server projects ie. mu,cu,su,ur
      ...findDirectories(__dirname, { ignore: ['servers', 'node_modules', 'logos', 'design'] }) // all other top level projects in monorepo
    ])
  }
}
