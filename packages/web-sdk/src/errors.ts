export class SupportSdkError extends Error {
  readonly code: string
  readonly retryable: boolean

  constructor(message: string, code: string, retryable = false) {
    super(message)
    this.name = 'SupportSdkError'
    this.code = code
    this.retryable = retryable
  }
}
