/**
 * Writes visualViewport metrics onto CSS variables.
 * Product layout reads these tokens — do not use window.innerHeight.
 */
export function bindVisualViewportCssVars(
  target: HTMLElement = document.documentElement,
): () => void {
  const viewport = window.visualViewport

  const apply = () => {
    const height = viewport?.height ?? window.innerHeight
    const width = viewport?.width ?? window.innerWidth
    const offsetTop = viewport?.offsetTop ?? 0
    const offsetLeft = viewport?.offsetLeft ?? 0

    target.style.setProperty('--support-vv-height', `${height}px`)
    target.style.setProperty('--support-vv-width', `${width}px`)
    target.style.setProperty('--support-vv-offset-top', `${offsetTop}px`)
    target.style.setProperty('--support-vv-offset-left', `${offsetLeft}px`)
  }

  apply()
  viewport?.addEventListener('resize', apply)
  viewport?.addEventListener('scroll', apply)
  window.addEventListener('resize', apply)

  return () => {
    viewport?.removeEventListener('resize', apply)
    viewport?.removeEventListener('scroll', apply)
    window.removeEventListener('resize', apply)
  }
}
