module.exports = {
  '**/*.js': [
    'standard --fix'
  ],
  '**/package.json': [
    'sort-package-json'
  ],
  '**/*.md': [
    'markdown-toc-gen insert'
  ]
}
