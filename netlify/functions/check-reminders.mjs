import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export const config = {
  schedule: '0 9 * * *',
};

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  },
  body: JSON.stringify(body),
});

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) return;

  initializeApp({
    credential: cert({
      projectId: requiredEnv('FIREBASE_PROJECT_ID'),
      clientEmail: requiredEnv('FIREBASE_CLIENT_EMAIL'),
      privateKey: requiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
  });
};

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const sendReminderEmail = async ({ to, subject, htmlContent }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || !to) return false;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Makina Ime', email: process.env.BREVO_SENDER_EMAIL || 'infomakinaime@gmail.com' },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });

  return response.ok;
};

const getUserEmail = async (uid, userData) => {
  if (typeof userData?.email === 'string' && userData.email.includes('@')) return userData.email;

  try {
    const authUser = await getAuth().getUser(uid);
    return authUser.email || null;
  } catch {
    return null;
  }
};

const invalidMessagingCodes = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
  'messaging/invalid-argument',
]);

const sendPushNotifications = async ({
  userRef,
  userData,
  title,
  body,
  type,
  reminderId,
  notificationId,
}) => {
  const tokenMap = userData.pushTokens && typeof userData.pushTokens === 'object' ? userData.pushTokens : {};
  const tokens = Object.entries(tokenMap)
    .map(([id, value]) => ({ id, token: value?.token, enabled: value?.enabled === true, provider: value?.provider }))
    .filter((entry) => entry.enabled && entry.provider === 'fcm' && typeof entry.token === 'string' && entry.token.length > 0);

  if (tokens.length === 0) {
    return { sent: 0, failed: 0, stale: 0 };
  }

  const response = await getMessaging().sendEach(tokens.map((entry) => ({
    token: entry.token,
    notification: {
      title,
      body,
    },
    data: {
      title,
      body,
      type: String(type || 'other'),
      reminderId,
      notificationId,
      url: '/personal',
    },
    webpush: {
      headers: {
        TTL: '3600',
        Urgency: 'normal',
      },
      fcmOptions: {
        link: 'https://makinaime.dpdns.org/personal',
      },
      notification: {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: notificationId,
        renotify: false,
      },
    },
  })));

  let stale = 0;
  await Promise.all(response.responses.map(async (item, index) => {
    if (item.success) return;
    const code = item.error?.code;
    if (!invalidMessagingCodes.has(code)) return;
    stale += 1;
    await userRef.set({
      pushTokens: {
        [tokens[index].id]: {
          enabled: false,
          disabledAt: FieldValue.serverTimestamp(),
          disabledReason: code,
        },
      },
    }, { merge: true });
  }));

  return {
    sent: response.successCount,
    failed: response.failureCount,
    stale,
  };
};

export const handler = async () => {
  try {
    initializeFirebaseAdmin();
    const db = getFirestore();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayKey = today.toISOString().slice(0, 10);
    const snapshot = await db.collection('reminders')
      .where('completed', '==', false)
      .get();

    let notificationsCreated = 0;
    let emailsSent = 0;
    let emailFailures = 0;
    let pushesSent = 0;
    let pushFailures = 0;
    let stalePushTokens = 0;

    for (const reminderDoc of snapshot.docs) {
      const reminder = reminderDoc.data();
      if (!reminder.userId || !reminder.dueDate?.toDate) continue;

      const dueDate = reminder.dueDate.toDate();
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const leadTimeDays = Number.isFinite(Number(reminder.leadTimeDays)) ? Number(reminder.leadTimeDays) : 14;
      if (diffDays > leadTimeDays) continue;

      const overdue = diffDays < 0;
      const notificationId = overdue ? `${reminderDoc.id}_overdue` : `${reminderDoc.id}_${todayKey}`;
      const userRef = db.collection('users').doc(reminder.userId);
      const notificationRef = userRef.collection('notifications').doc(notificationId);
      const [existingNotification, userSnap] = await Promise.all([
        notificationRef.get(),
        userRef.get(),
      ]);

      if (existingNotification.exists) continue;

      const userData = userSnap.data() || {};
      const reminderTitle = String(reminder.title || 'Vehicle reminder').slice(0, 160);
      const title = overdue ? `Overdue: ${reminderTitle}` : `Upcoming: ${reminderTitle}`;
      const body = overdue
        ? `Your ${reminderTitle} was due ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago.`
        : `Your ${reminderTitle} is due in ${diffDays} days.`;

      await notificationRef.set({
        userId: reminder.userId,
        title,
        body,
        type: reminder.type || 'other',
        reminderId: reminderDoc.id,
        read: false,
        deliveryStatus: {
          email: userData.emailReminderEnabled !== false ? 'pending' : 'disabled',
          push: userData.browserNotificationsEnabled === true ? 'pending' : 'disabled',
        },
        browserNotificationEnabledAtDelivery: userData.browserNotificationsEnabled === true,
        createdAt: FieldValue.serverTimestamp(),
      });
      notificationsCreated += 1;

      if (userData.emailReminderEnabled !== false) {
        const email = await getUserEmail(reminder.userId, userData);
        if (email) {
          const sent = await sendReminderEmail({
            to: email,
            subject: title,
            htmlContent: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #0f172a;">
                <h2>Makina Ime reminder</h2>
                <p>${escapeHtml(body)}</p>
                <a href="https://makinaime.dpdns.org/app" style="display:inline-block;background:#f59e0b;color:#111827;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700;">Open dashboard</a>
              </div>
            `,
          });
          if (sent) emailsSent += 1;
          else emailFailures += 1;
        }
      }

      if (userData.browserNotificationsEnabled === true) {
        try {
          const pushResult = await sendPushNotifications({
            userRef,
            userData,
            title,
            body,
            type: reminder.type || 'other',
            reminderId: reminderDoc.id,
            notificationId,
          });
          pushesSent += pushResult.sent;
          pushFailures += pushResult.failed;
          stalePushTokens += pushResult.stale;
        } catch {
          pushFailures += 1;
          console.error('Reminder push delivery failed', {
            userId: reminder.userId,
            reminderId: reminderDoc.id,
            notificationId,
          });
        }
      }
    }

    return json(200, {
      ok: true,
      checked: snapshot.size,
      notificationsCreated,
      emailsSent,
      emailFailures,
      pushesSent,
      pushFailures,
      stalePushTokens,
    });
  } catch {
    console.error('Reminder scheduled job failed');
    return json(500, { error: 'Reminder job failed' });
  }
};
