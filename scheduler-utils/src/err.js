export class InvalidSchedulerLocationError extends Error {
  static name = 'InvalidSchedulerLocation'

  constructor (...args) {
    super(...args)
    this.name = InvalidSchedulerLocationError.name
  }
}

export class SchedulerTagNotFoundError extends Error {
  static name = 'SchedulerTagNotFound'

  constructor (...args) {
    super(...args)
    this.name = SchedulerTagNotFoundError.name
  }
}

export class TransactionNotFoundError extends Error {
  static name = 'TransactionNotFound'

  constructor (...args) {
    super(...args)
    this.name = TransactionNotFoundError.name
  }
}
