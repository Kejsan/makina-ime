import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { sendEmail } from "./utils/email";

admin.initializeApp();

const escapeHtml = (value: string) => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Scheduled function that runs every day at 9:00 AM.
 * Checks for reminders due within their 'leadTime' and sends notifications.
 */
export const checkReminders = onSchedule("every day 09:00", async () => {
    const db = admin.firestore();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayKey = today.toISOString().slice(0, 10);

    try {
        const snapshot = await db.collection("reminders")
            .where("completed", "==", false)
            .get();

        const notificationsToSend: { userId: string, email?: string, reminderId: string, notificationId: string, title: string, body: string, type: string }[] = [];

        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (!data.dueDate || !data.userId) continue;

            const dueDate = data.dueDate.toDate();
            const leadTimeDays = data.leadTimeDays || 7; // Default 7 days
            
            // Calculate date to notify
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= leadTimeDays && diffDays >= 0) {
                const notificationId = `${doc.id}_${todayKey}`;
                const notificationRef = db.collection("users").doc(data.userId).collection("notifications").doc(notificationId);
                const existingNotification = await notificationRef.get();

                if (existingNotification.exists) {
                    continue;
                }

                // Fetch user data for email
                const userSnap = await db.collection("users").doc(data.userId).get();
                const userData = userSnap.data();
                const reminderTitle = String(data.title || "vehicle reminder").slice(0, 180);

                notificationsToSend.push({
                    userId: data.userId,
                    email: userData?.email,
                    reminderId: doc.id,
                    notificationId,
                    title: `Upcoming: ${reminderTitle}`,
                    body: `Your ${reminderTitle} is due in ${diffDays} days.`,
                    type: data.type
                });
            }
        }

        const batch = db.batch();
        for (const notif of notificationsToSend) {
            const ref = db.collection("users").doc(notif.userId).collection("notifications").doc(notif.notificationId);
            batch.set(ref, {
                title: notif.title,
                body: notif.body,
                type: notif.type,
                reminderId: notif.reminderId,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        if (notificationsToSend.length > 0) {
            await batch.commit();
        }

        for (const notif of notificationsToSend) {
            if (notif.email) {
                try {
                    await sendEmail({
                        to: notif.email,
                        subject: notif.title,
                        htmlContent: `
                            <div style="font-family: sans-serif; padding: 20px;">
                                <h2>Reminder Alert</h2>
                                <p>${escapeHtml(notif.body)}</p>
                                <a href="https://makinaime.dpdns.org" style="background: #0B1120; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
                            </div>
                        `
                    });
                } catch {
                    console.error("Failed to send reminder email", {
                        userId: notif.userId,
                        reminderId: notif.reminderId,
                        notificationId: notif.notificationId,
                    });
                }
            }
        }
    } catch {
        console.error("Error checking reminders");
    }
});

/**
 * Trigger: When a new reminder is created, validate it.
 */
export const onReminderCreate = onDocumentCreated("reminders/{reminderId}", (event) => {
      const newValue = event.data?.data();
      if (!newValue) return null;
      console.log("New reminder created", { reminderId: event.params.reminderId, userId: newValue.userId });
      return null;
    });
