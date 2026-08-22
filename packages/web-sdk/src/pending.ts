import { SupportSdkError } from './errors.js'
import type { CancellablePromise, CommandOptions } from './types.js'

export function createCancellablePromise<T>(
  executor: (resolve: (value: T) => void, reject: (error: unknown) => void) => void,
  options: CommandOptions & { timeoutMs: number },
): CancellablePromise<T> {
  let cancel: (reason?: string) => void = () => undefined

  const promise = new Promise<T>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      finish(reject, new SupportSdkError('command timed out', 'TIMEOUT', true))
    }, options.timeoutMs)

    const onAbort = () => {
      finish(reject, new SupportSdkError('command cancelled', 'CANCELLED'))
    }

    const cleanup = () => {
      clearTimeout(timer)
      options.signal?.removeEventListener('abort', onAbort)
    }

    const finish = (fn: (value: never) => void, value: unknown) => {
      if (settled) {
        return
      }
      settled = true
      cleanup()
      fn(value as never)
    }

    cancel = (reason?: string) => {
      finish(reject, new SupportSdkError(reason ?? 'command cancelled', 'CANCELLED'))
    }

    if (options.signal?.aborted) {
      onAbort()
      return
    }
    options.signal?.addEventListener('abort', onAbort)

    try {
      executor(
        (value) => finish(resolve, value),
        (error) => finish(reject, error),
      )
    } catch (error) {
      finish(reject, error)
    }
  }) as CancellablePromise<T>

  promise.cancel = (reason?: string) => {
    cancel(reason)
  }
  return promise
}
