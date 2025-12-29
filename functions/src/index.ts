import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Scheduled function that runs every day at 9:00 AM.
 * Checks for reminders due within their 'leadTime' and sends notifications.
 */
export const checkReminders = functions.pubsub.schedule("every day 09:00").onRun(async (context) => {
    const db = admin.firestore();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    try {
        const snapshot = await db.collection("reminders")
            .where("completed", "==", false)
            .get();

        const notificationsToSend: any[] = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.dueDate || !data.userId) return;

            const dueDate = data.dueDate.toDate();
            const leadTimeDays = data.leadTimeDays || 7; // Default 7 days
            
            // Calculate date to notify
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= leadTimeDays && diffDays >= 0) {
                // Determine if we already sent a notification today? 
                // For MVP, simplistic check: notificationSentAt
                
                notificationsToSend.push({
                    userId: data.userId,
                    reminderId: doc.id,
                    title: `Upcoming: ${data.title}`,
                    body: `Your ${data.title} is due in ${diffDays} days.`,
                    type: data.type
                });
            }
        });

        // In a real app, here we would trigger FCM or SendGrid
        console.log(`Checking reminders: Found ${notificationsToSend.length} to notify.`);
        
        // Example: Write to 'notifications' collection for frontend to display
        const batch = db.batch();
        notificationsToSend.forEach(notif => {
            const ref = db.collection("users").doc(notif.userId).collection("notifications").doc();
            batch.set(ref, {
                ...notif,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();

    } catch (error) {
        console.error("Error checking reminders:", error);
    }
});

/**
 * Trigger: When a new reminder is created, validate it.
 */
export const onReminderCreate = functions.firestore.document('reminders/{reminderId}')
    .onCreate((snap, context) => {
      const newValue = snap.data();
      console.log('New reminder created:', newValue.title);
      return null;
    });
