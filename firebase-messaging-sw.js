// firebase-messaging-sw.js
// Service Worker for Firebase Cloud Messaging

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebase configuration - Replace with your config
const firebaseConfig = {
  apiKey: "AIzaSyBMJuAmIAqDUXhZcGBHq8CszhJL92VaZ64",
  authDomain: "information-project1.firebaseapp.com",
  databaseURL: "https://information-project1-default-rtdb.firebaseio.com",
  projectId: "information-project1",
  storageBucket: "information-project1.firebasestorage.app",
  messagingSenderId: "1098270976013",
  appId: "1:1098270976013:web:2e1ca7602b316b6ed30d44",
  measurementId: "G-YFL07VDXCX"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message: ', payload);
    
    const notificationTitle = payload.notification.title || 'Appointment Notification';
    const notificationOptions = {
        body: payload.notification.body || 'You have a new notification',
        icon: payload.notification.icon || '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: payload.notification.tag || 'appointment',
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: 'Open App'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ],
        data: payload.data || {}
    };
    
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked: ', event);
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        // Open the app
        event.waitUntil(
            clients.matchAll({ includeUncontrolled: true, type: 'window' })
                .then((clientList) => {
                    // If app is already open, focus it
                    for (const client of clientList) {
                        if (client.url.includes(self.location.origin) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    // Otherwise open new window
                    if (clients.openWindow) {
                        return clients.openWindow('/');
                    }
                })
        );
    }
    
    // Send message to main app
    event.waitUntil(
        clients.matchAll().then((clientList) => {
            clientList.forEach(client => {
                client.postMessage({
                    type: 'NOTIFICATION_CLICK',
                    action: event.action,
                    data: event.notification.data
                });
            });
        })
    );
});

// Handle push events (for custom push notifications)
self.addEventListener('push', (event) => {
    console.log('Push event received: ', event);
    
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body || 'You have a new notification',
            icon: data.icon || '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: data.tag || 'appointment',
            requireInteraction: true,
            vibrate: [200, 100, 200],
            data: data.data || {}
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title || 'Appointment App', options)
        );
    }
});

// Sync event for offline functionality
self.addEventListener('sync', (event) => {
    if (event.tag === 'appointment-sync') {
        event.waitUntil(
            // Sync appointments when back online
            syncAppointments()
        );
    }
});

async function syncAppointments() {
    try {
        // Implement sync logic here if needed
        console.log('Syncing appointments...');
    } catch (error) {
        console.error('Sync failed:', error);
    }
}
