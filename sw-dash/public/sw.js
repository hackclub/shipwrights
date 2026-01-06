self.addEventListener('push', (e) => {
  if (!e.data) return

  try {
    const data = e.data.json()

    e.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/logo_192_192.png',
        badge: '/logo_192_192.png',
        data: { url: data.url },
        tag: data.tag || `notif-${Date.now()}`,
        requireInteraction: false,
      })
    )
  } catch {}
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()

  if (e.notification.data?.url) {
    e.waitUntil(clients.openWindow(e.notification.data.url))
  }
})
