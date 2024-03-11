export class InvalidSchedulerLocationError extends Error {
  name = 'InvalidSchedulerLocation'

  constructor (...args) {
    super(...args)
    this.name = InvalidSchedulerLocationError.name
  }
}

export class SchedulerTagNotFoundError extends Error {
  name = 'SchedulerTagNotFound'

  constructor (...args) {
    super(...args)
    this.name = SchedulerTagNotFoundError.name
  }
}

export class TransactionNotFoundError extends Error {
  name = 'TransactionNotFound'

  constructor (...args) {
    super(...args)
    this.name = TransactionNotFoundError.name
  }
}
