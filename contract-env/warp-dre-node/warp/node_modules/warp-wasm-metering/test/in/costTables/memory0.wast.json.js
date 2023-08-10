module.exports = {
  'start': 1,
  'type': {
    'params': {
      'DEFAULT': 1
    },
    'return_type': {
      'DEFAULT': 1
    }
  },
  'import': 1,
  'code': {
    'locals': {
      'DEFAULT': 1
    },
    'code': {
      'DEFAULT': 1
    }
  },
  'memory': (entry) => {
    return entry.maximum * 10
  }
}
