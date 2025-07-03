// server.js
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Firebase Admin SDK setup
// You need to generate a service account key from Firebase Console
// and set it as an environment variable or use the JSON directly
const serviceAccount = {
    "type": "service_account",
    "project_id": "information-project1",
    "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
    "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    "client_id": process.env.FIREBASE_CLIENT_ID,
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL
};

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://information-project1-default-rtdb.firebaseio.com"
});

// In-memory storage for scheduled notifications (use a database in production)
let scheduledNotifications = [];

// Utility function to send push notification
async function sendPushNotification(token, title, body) {
    const message = {
        notification: {
            title: title,
            body: body
        },
        token: token,
        webpush: {
            notification: {
                title: title,
                body: body,
                icon: '/icon-192x192.png',
                badge: '/badge-72x72.png',
                tag: 'appointment-notification',
                requireInteraction: true
            }
        }
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Push notification sent successfully:', response);
        return response;
    } catch (error) {
        console.error('Error sending push notification:', error);
        throw error;
    }
}

// API endpoint to schedule notifications
app.post('/schedule-notifications', async (req, res) => {
    try {
        const { appointmentId, name, date, time, service, fcmToken } = req.body;
        
        if (!fcmToken) {
            return res.status(400).json({ error: 'FCM token is required' });
        }

        const appointmentDateTime = new Date(`${date}T${time}`);
        const confirmationTime = new Date(Date.now() + 60 * 1000); // 1 minute from now
        const reminderTime = new Date(appointmentDateTime.getTime() - 30 * 60 * 1000); // 30 minutes before

        // Schedule confirmation notification (1 minute after booking)
        const confirmationNotification = {
            id: `${appointmentId}_confirmation`,
            token: fcmToken,
            title: 'Appointment Confirmed! 🎉',
            body: `Your appointment has been confirmed for ${appointmentDateTime.toLocaleDateString()} at ${appointmentDateTime.toLocaleTimeString()}`,
            scheduledTime: confirmationTime,
            type: 'confirmation'
        };

        // Schedule reminder notification (30 minutes before appointment)
        const reminderNotification = {
            id: `${appointmentId}_reminder`,
            token: fcmToken,
            title: 'Appointment Reminder 🔔',
            body: `Don't forget! Your ${service} appointment is in 30 minutes`,
            scheduledTime: reminderTime,
            type: 'reminder'
        };

        // Store notifications
        scheduledNotifications.push(confirmationNotification);
        
        // Only add reminder if it's in the future
        if (reminderTime > new Date()) {
            scheduledNotifications.push(reminderNotification);
        }

        res.json({ 
            success: true, 
            message: 'Notifications scheduled successfully',
            confirmationTime: confirmationTime.toISOString(),
            reminderTime: reminderTime.toISOString()
        });

    } catch (error) {
        console.error('Error scheduling notifications:', error);
        res.status(500).json({ error: 'Failed to schedule notifications' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get scheduled notifications (for debugging)
app.get('/notifications', (req, res) => {
    res.json(scheduledNotifications);
});

// Cron job to check and send scheduled notifications every minute
cron.schedule('* * * * *', async () => {
    const now = new Date();
    const notificationsToSend = scheduledNotifications.filter(
        notification => notification.scheduledTime <= now
    );

    for (const notification of notificationsToSend) {
        try {
            await sendPushNotification(
                notification.token,
                notification.title,
                notification.body
            );
            
            console.log(`Sent ${notification.type} notification:`, notification.id);
            
            // Remove sent notification
            scheduledNotifications = scheduledNotifications.filter(
                n => n.id !== notification.id
            );
            
        } catch (error) {
            console.error(`Failed to send notification ${notification.id}:`, error);
            
            // Remove failed notification after 3 attempts
            if (notification.attempts && notification.attempts >= 3) {
                scheduledNotifications = scheduledNotifications.filter(
                    n => n.id !== notification.id
                );
            } else {
                notification.attempts = (notification.attempts || 0) + 1;
                // Retry in 1 minute
                notification.scheduledTime = new Date(now.getTime() + 60 * 1000);
            }
        }
    }
});

// Clean up old notifications (run every hour)
cron.schedule('0 * * * *', () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    scheduledNotifications = scheduledNotifications.filter(
        notification => notification.scheduledTime > oneDayAgo
    );
    
    console.log('Cleaned up old notifications');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Notification scheduler is active');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
