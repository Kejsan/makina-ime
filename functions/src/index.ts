import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { sendEmail } from "./utils/email";

admin.initializeApp();

/**
 * Scheduled function that runs every day at 9:00 AM.
 * Checks for reminders due within their 'leadTime' and sends notifications.
 */
export const checkReminders = onSchedule("every day 09:00", async () => {
    const db = admin.firestore();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    try {
        const snapshot = await db.collection("reminders")
            .where("completed", "==", false)
            .get();

        const notificationsToSend: { userId: string, email?: string, reminderId: string, title: string, body: string, type: string }[] = [];

        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (!data.dueDate || !data.userId) continue;

            const dueDate = data.dueDate.toDate();
            const leadTimeDays = data.leadTimeDays || 7; // Default 7 days
            
            // Calculate date to notify
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= leadTimeDays && diffDays >= 0) {
                // Fetch user data for email
                const userSnap = await db.collection("users").doc(data.userId).get();
                const userData = userSnap.data();

                notificationsToSend.push({
                    userId: data.userId,
                    email: userData?.email,
                    reminderId: doc.id,
                    title: `Upcoming: ${data.title}`,
                    body: `Your ${data.title} is due in ${diffDays} days.`,
                    type: data.type
                });
            }
        }

        // Send Email and Write to Notifications collection
        const batch = db.batch();
        for (const notif of notificationsToSend) {
            // Write to Firestore for in-app UI
            const ref = db.collection("users").doc(notif.userId).collection("notifications").doc();
            batch.set(ref, {
                title: notif.title,
                body: notif.body,
                type: notif.type,
                reminderId: notif.reminderId,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Send Email if we have one
            if (notif.email) {
                try {
                    await sendEmail({
                        to: notif.email,
                        subject: notif.title,
                        htmlContent: `
                            <div style="font-family: sans-serif; padding: 20px;">
                                <h2>Reminder Alert</h2>
                                <p>${notif.body}</p>
                                <a href="https://makinaime.dpdns.org" style="background: #0B1120; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
                            </div>
                        `
                    });
                } catch (err) {
                    console.error("Failed to send email to " + notif.email, err);
                }
            }
        }
        
        await batch.commit();

    } catch (error) {
        console.error("Error checking reminders:", error);
    }
});

/**
 * Trigger: When a new reminder is created, validate it.
 */
export const onReminderCreate = onDocumentCreated("reminders/{reminderId}", (event) => {
      const newValue = event.data?.data();
      if (!newValue) return null;
      console.log('New reminder created:', newValue.title);
      return null;
    });
