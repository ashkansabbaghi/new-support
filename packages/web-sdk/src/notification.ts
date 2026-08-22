import type { PayloadByType } from '@nipoto/support-protocol'

type NotificationPayload = PayloadByType['NOTIFICATION_REQUESTED']

const TITLE_BY_KIND: Record<NotificationPayload['kind'], string> = {
  'new-message': 'Nipoto Support',
  'conversation-state': 'Nipoto Support',
  queue: 'Nipoto Support',
}

/**
 * Host-side OS notification. iframe Notification is unreliable on mobile.
 * Payload is data-minimized: no message body, email, or mobile.
 */
export function showHostNotification(payload: NotificationPayload): void {
  if (typeof Notification !== 'function') {
    return
  }
  const title = TITLE_BY_KIND[payload.kind] ?? 'Nipoto Support'
  const show = () => {
    try {
      new Notification(title, {
        tag: payload.conversationId ? `nipoto-support-${payload.kind}-${payload.conversationId}` : `nipoto-support-${payload.kind}`,
        silent: false,
      })
    } catch {
      // Permission or platform denied.
    }
  }

  if (Notification.permission === 'granted') {
    show()
    return
  }
  if (Notification.permission === 'denied') {
    return
  }
  void Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      show()
    }
  })
}
