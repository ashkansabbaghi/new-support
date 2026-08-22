import { createSupportUseCases, type SupportUseCases, type UseCaseDeps } from './usecases'

let usecases: SupportUseCases | null = null

export function bindSupportUseCases(deps: UseCaseDeps): SupportUseCases {
  usecases = createSupportUseCases(deps)
  return usecases
}

export function setSupportUseCases(next: SupportUseCases): SupportUseCases {
  usecases = next
  return usecases
}

export function getSupportUseCases(): SupportUseCases {
  if (!usecases) {
    throw new Error('[support] use cases are not bound')
  }
  return usecases
}

export function peekSupportUseCases(): SupportUseCases | null {
  return usecases
}
