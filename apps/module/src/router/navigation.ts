import type { Router } from 'vue-router'

import { validateSemanticRoute, type SemanticRoute } from '@/domain'

import { router } from './index'
import { canConsumeBack, pathForSemantic, semanticFromVueRoute } from './semantic'

let skipRouteChanged = false
let stopAfterEach: (() => void) | null = null

export function currentSemanticRoute(): SemanticRoute | null {
  return semanticFromVueRoute(router.currentRoute.value)
}

export function currentConversationId(): string | undefined {
  return currentSemanticRoute()?.params?.conversationId
}

export async function applySemanticNavigate(
  route: SemanticRoute,
  target: Router = router,
): Promise<boolean> {
  const validated = validateSemanticRoute(route)
  if (!validated.ok) {
    return false
  }
  const path = pathForSemantic(validated.route)
  if (validated.route.replace) {
    await target.replace(path)
  } else {
    await target.push(path)
  }
  return true
}

export function consumeModuleBack(target: Router = router): boolean {
  if (!canConsumeBack(target.options.history.state)) {
    return false
  }
  void target.back()
  return true
}

export function bindRouterBridge(options: {
  emitRouteChanged: (route: SemanticRoute) => void
}): () => void {
  stopAfterEach?.()
  stopAfterEach = router.afterEach((to) => {
    if (skipRouteChanged) {
      return
    }
    const semantic = semanticFromVueRoute(to)
    if (semantic) {
      options.emitRouteChanged(semantic)
    }
  })
  return () => {
    stopAfterEach?.()
    stopAfterEach = null
  }
}

export async function navigateFromHost(
  route: SemanticRoute,
  options: { silent?: boolean } = {},
): Promise<boolean> {
  skipRouteChanged = options.silent !== false
  try {
    return await applySemanticNavigate(route)
  } finally {
    skipRouteChanged = false
  }
}
