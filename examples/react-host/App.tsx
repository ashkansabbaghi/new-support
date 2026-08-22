import { useEffect } from 'react'
import { createSupportClient } from '@nipoto/support-web-sdk'

/**
 * Thin React host. Calls the public Web SDK only — no Vue, Pinia, gateway, or app internals.
 * Token stays out of the URL and Web Storage. setSession is a generation bump; cookie is the credential.
 */
export function App() {
  useEffect(() => {
    const client = createSupportClient({
      origin: 'http://localhost:5173',
      widgetId: 'wid_public_example',
      locale: 'fa-IR',
    })
    void client.ready
    return () => {
      void client.dispose()
    }
  }, [])

  return <main>React host — Support UI stays in the iframe.</main>
}
