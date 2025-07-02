// firebase-messaging-sw.js
// Service Worker for Firebase Cloud Messaging

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase Configuration - Replace with your config
const firebaseConfig = {
  apiKey: "AIzaSyBMJuAmIAqDUXhZcGBHq8CszhJL92VaZ64",
  authDomain: "information-project1.firebaseapp.com",
  databaseURL: "https://information-project1-default-rtdb.firebaseio.com",
  projectId: "information-project1",
  storageBucket: "information-project1.firebasestorage.app",
  messagingSenderId: "1098270976013",
  appId: "1:1098270976013:web:2e1ca7602b316b6ed30d44",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging object
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Background message received:', payload);
    
    const notificationTitle = payload.notification.title || 'Appointment Notification';
    const notificationOptions = {
        body: payload.notification.body || 'You have an appointment update',
        icon: payload.notification.icon || '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'appointment-notification',
        requireInteraction: true,
        actions: [
            {
                action: 'view',
                title: 'View Details'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ],
        data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    
    event.notification.close();
    
    if (event.action === 'view') {
        // Open the app when notification is clicked
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Handle push events
self.addEventListener('push', (event) => {
    console.log('Push event received:', event);
    
    if (event.data) {
        const data = event.data.json();
        const title = data.notification.title || 'Appointment Notification';
        const options = {
            body: data.notification.body || 'You have an appointment update',
            icon: data.notification.icon || '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: 'appointment-notification',
            requireInteraction: true,
            data: data.data
        };
        
        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    }
});
