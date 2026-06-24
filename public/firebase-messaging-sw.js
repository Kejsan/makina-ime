/* global firebase */
importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyC5Kt2Fp35GIJLq-bKuEMV7m4HnHwGQXiA',
  authDomain: 'makina-ime-2025.firebaseapp.com',
  projectId: 'makina-ime-2025',
  messagingSenderId: '453241224558',
  appId: '1:453241224558:web:a661848e9dc954d9dc957f',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'Makina Ime reminder';
  const body = payload.notification?.body || payload.data?.body || '';
  const url = payload.data?.url || '/personal';

  self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url },
    tag: payload.data?.notificationId || payload.data?.reminderId || title,
    renotify: false,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/personal', self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) {
      await existing.focus();
      return existing.navigate(targetUrl);
    }
    return clients.openWindow(targetUrl);
  })());
});
