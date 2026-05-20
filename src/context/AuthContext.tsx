import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { db } from '../lib/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

const upsertUserProfile = async (user: User, includeCreatedAt = false) => {
    try {
        await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            updatedAt: serverTimestamp(),
            ...(includeCreatedAt ? { createdAt: serverTimestamp() } : {})
        }, { merge: true });
    } catch {
        console.warn('User profile sync failed.');
    }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const signIn = async (email: string, password: string) => {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await upsertUserProfile(credential.user);
    };

    const signUp = async (email: string, password: string) => {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await upsertUserProfile(credential.user, true);
    };

    const resetPassword = async (email: string) => {
        await sendPasswordResetEmail(auth, email);
    };

    const signOut = () => firebaseSignOut(auth);

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, resetPassword, signOut }}>
            {loading ? (
                <div className="flex items-center justify-center min-h-screen bg-background">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
