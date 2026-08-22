import { applySemanticNavigate } from '@/router/navigation'
import type { SemanticRoute } from '@/domain'

export function useWidgetNavigation() {
  async function go(route: SemanticRoute): Promise<boolean> {
    return applySemanticNavigate(route)
  }

  return { go }
}
