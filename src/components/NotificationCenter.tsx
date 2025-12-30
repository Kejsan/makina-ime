import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Clock, Loader2, X } from 'lucide-react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, limit, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { AppNotification } from '../lib/types';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

interface NotificationCenterProps {
    onClose: () => void;
}

export const NotificationCenter = ({ onClose }: NotificationCenterProps) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);

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

    const markAsRead = async (id: string) => {
        if (!user) return;
        try {
            await updateDoc(doc(db, 'users', user.uid, 'notifications', id), {
                read: true
            });
        } catch (err) {
            console.error(err);
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
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
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
                                "p-3 rounded-lg border transition-all duration-200 relative group",
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
                                <div className="flex-1 pr-6">
                                    <p className={cn("text-sm font-medium leading-tight mb-1", notif.read ? "text-muted-foreground" : "text-foreground")}>
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
