// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBTeOPspaQd5oocS-v00qJYZ4Tr3e9qsJE",
    authDomain: "bonded-app-genz.firebaseapp.com",
    projectId: "bonded-app-genz",
    storageBucket: "bonded-app-genz.firebasestorage.app",
    messagingSenderId: "91589281724",
    appId: "1:91589281724:web:aa00c785d2818409b44db9"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
    console.log('Background message received:', payload);

    const title = payload.notification?.title || 'Incoming Call';
    const body = payload.notification?.body || 'Someone is calling you';

    const options = {
        body: body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [300, 100, 300, 100, 300],
        requireInteraction: true,
        tag: 'incoming-call',
        data: payload.data
    };

    self.registration.showNotification(title, options);
});

// Handle notification click
self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const chatId = event.notification.data?.chatId;
    const url = chatId ? `/chats/${chatId}` : '/chats';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            for (const client of clientList) {
                if (client.url.includes('/chats') && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(url);
        })
    );
});
