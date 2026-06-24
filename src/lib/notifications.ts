import { deleteToken, getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import app, { db } from './firebase';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
const pushWorkerUrl = '/firebase-messaging-sw.js';
const pushWorkerScope = '/firebase-cloud-messaging-push-scope';

let messagingPromise: Promise<Messaging | null> | null = null;

const tokenDocId = async (token: string) => {
    const data = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
};

export const isPushConfigured = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

export const getNotificationPermission = () => {
    if (!('Notification' in window)) return 'denied' as NotificationPermission;
    return Notification.permission;
};

const getSupportedMessaging = async () => {
    if (!('serviceWorker' in navigator)) return null;
    if (!messagingPromise) {
        messagingPromise = isSupported()
            .then((supported) => (supported ? getMessaging(app) : null))
            .catch(() => null);
    }
    return messagingPromise;
};

const getPushRegistration = async () => {
    if (!('serviceWorker' in navigator)) return null;
    return navigator.serviceWorker.register(pushWorkerUrl, { scope: pushWorkerScope });
};

export const requestBrowserNotificationAccess = async () => {
    if (!('Notification' in window)) return 'denied' as NotificationPermission;
    return Notification.requestPermission();
};

export const registerPushDevice = async (userId: string) => {
    const messaging = await getSupportedMessaging();
    if (!messaging || getNotificationPermission() !== 'granted') return null;

    const serviceWorkerRegistration = await getPushRegistration();
    if (!serviceWorkerRegistration) return null;

    const token = await getToken(messaging, {
        ...(vapidKey ? { vapidKey } : {}),
        serviceWorkerRegistration,
    });

    if (!token) return null;

    const id = await tokenDocId(token);
    await setDoc(doc(db, 'users', userId), {
        pushTokens: {
            [id]: {
                token,
                enabled: true,
                provider: 'fcm',
                platform: navigator.platform || null,
                userAgent: navigator.userAgent.slice(0, 300),
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
            },
        },
    }, { merge: true });

    return token;
};

export const disableCurrentPushDevice = async (userId: string) => {
    const messaging = await getSupportedMessaging();
    if (!messaging || getNotificationPermission() !== 'granted') return;

    const serviceWorkerRegistration = await getPushRegistration();
    if (!serviceWorkerRegistration) return;

    const token = await getToken(messaging, {
        ...(vapidKey ? { vapidKey } : {}),
        serviceWorkerRegistration,
    });
    if (!token) return;

    const id = await tokenDocId(token);
    await setDoc(doc(db, 'users', userId), {
        pushTokens: {
            [id]: {
                enabled: false,
                updatedAt: serverTimestamp(),
            },
        },
    }, { merge: true });
    await deleteToken(messaging).catch(() => undefined);
};

export const subscribeForegroundPushMessages = async (
    listener: (payload: { title: string; body?: string }) => void
) => {
    const messaging = await getSupportedMessaging();
    if (!messaging) return () => undefined;

    return onMessage(messaging, (payload) => {
        listener({
            title: payload.notification?.title || payload.data?.title || 'Makina Ime reminder',
            body: payload.notification?.body || payload.data?.body,
        });
    });
};
