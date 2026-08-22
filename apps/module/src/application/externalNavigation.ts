export type ExternalNavTarget = 'help' | 'login' | 'account' | 'upgrade'

type Sink = (target: ExternalNavTarget) => void

let sink: Sink | null = null

export function setExternalNavigationSink(next: Sink | null): void {
  sink = next
}

/** Host allowlists the destination. Never assign location.href inside the module. */
export function requestExternalNavigation(target: ExternalNavTarget): void {
  sink?.(target)
}
