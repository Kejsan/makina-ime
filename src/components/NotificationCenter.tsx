import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Clock, Loader2, X } from 'lucide-react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, limit, writeBatch, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { AppNotification } from '../lib/types';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { registerPushDevice, requestBrowserNotificationAccess } from '../lib/notifications';

interface NotificationCenterProps {
    onClose: () => void;
}

export const NotificationCenter = ({ onClose }: NotificationCenterProps) => {
    const { user } = useAuth();
    const panelRef = useRef<HTMLDivElement>(null);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [notificationPermission, setNotificationPermission] = useState(
        'Notification' in window ? Notification.permission : 'denied'
    );

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as AppNotification[];
            setNotifications(data);
            setLoading(false);
        });

        return unsubscribe;
    }, [user]);

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (target instanceof Node && panelRef.current && !panelRef.current.contains(target)) {
                onClose();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const markAsRead = async (id: string) => {
        if (!user) return;
        try {
            await updateDoc(doc(db, 'users', user.uid, 'notifications', id), {
                read: true
            });
        } catch {
            console.error('Notification update failed');
        }
    };

    const markAllAsRead = async () => {
        if (!user || notifications.length === 0) return;
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;

        const batch = writeBatch(db);
        unread.forEach(n => {
            batch.update(doc(db, 'users', user.uid, 'notifications', n.id), { read: true });
        });
        await batch.commit();
    };

    const deleteNotification = async (id: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'notifications', id));
        } catch {
            console.error('Notification deletion failed');
        }
    };

    const enableBrowserNotifications = async () => {
        if (!user || !('Notification' in window)) return;
        const permission = await requestBrowserNotificationAccess();
        setNotificationPermission(permission);
        if (permission === 'granted') {
            await registerPushDevice(user.uid).catch(() => null);
            await setDoc(doc(db, 'users', user.uid), {
                browserNotificationsEnabled: true,
                updatedAt: serverTimestamp(),
            }, { merge: true });
        }
    };

    return (
        <div ref={panelRef} className="fixed inset-x-3 top-[calc(4rem+env(safe-area-inset-top))] z-50 max-h-[calc(100dvh-5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 sm:max-w-[calc(100dvw-2rem)]">
            <div className="p-4 border-b border-border flex justify-between items-center bg-accent/5">
                <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Notifications</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={markAllAsRead}
                        className="text-xs text-primary hover:underline"
                    >
                        Mark all read
                    </button>
                    <button onClick={onClose} className="p-1 hover:bg-accent rounded-full transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {notificationPermission === 'default' && (
                    <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <p className="text-sm font-medium text-foreground">Browser alerts are off</p>
                        <p className="text-xs text-muted-foreground mt-1">Enable them for PWA reminders on this device.</p>
                        <Button size="sm" className="mt-3 w-full" onClick={enableBrowserNotifications}>
                            Enable Browser Alerts
                        </Button>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div 
                            key={notif.id}
                            className={cn(
                                "group relative rounded-lg border p-3 transition-colors duration-200",
                                notif.read ? "bg-card/50 border-transparent" : "bg-primary/5 border-primary/20"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                    notif.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                                )}>
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1 pr-6">
                                    <p className={cn("break-words text-sm font-medium leading-tight mb-1", notif.read ? "text-muted-foreground" : "text-foreground")}>
                                        {notif.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {notif.body}
                                    </p>
                                    {notif.createdAt && (
                                        <p className="text-[10px] text-muted-foreground mt-2">
                                            {new Date(notif.createdAt.seconds * 1000).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notif.read && (
                                    <button 
                                        onClick={() => markAsRead(notif.id)}
                                        className="p-1.5 bg-background border border-border hover:bg-accent rounded-md text-primary"
                                        title="Mark as read"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button 
                                    onClick={() => deleteNotification(notif.id)}
                                    className="p-1.5 bg-background border border-border hover:bg-destructive/10 hover:text-destructive rounded-md text-muted-foreground"
                                    title="Delete"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <div className="p-3 border-t border-border bg-accent/5 text-center">
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onClose}>
                    Close
                </Button>
            </div>
        </div>
    );
};
