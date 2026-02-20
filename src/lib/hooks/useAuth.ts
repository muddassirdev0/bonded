import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, messaging, getToken } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';

// Define profile type based on schema
interface UserProfile {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    status: 'pending' | 'approved' | 'rejected';
    role: 'user' | 'admin';
    accent_color: string;
}

// VAPID key for FCM (Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates)
const VAPID_KEY = 'BLEq3YBrJOMKsRD-9Bxv5FACq8vFNOGHgkRQxe0Fl4ULuxD8H4_pqOGJFPDMYEH3eOo-tJdKV9q_0X6Gt1XKiE8';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                // Fetch profile from Supabase
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', firebaseUser.uid)
                    .single();

                if (data) {
                    setProfile(data as UserProfile);
                } else if (error) {
                    console.error('Error fetching profile:', error);
                }

                // Register FCM token
                registerFCMToken(firebaseUser.uid);
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, profile, loading };
}

async function registerFCMToken(userId: string) {
    try {
        if (!messaging) return;
        if (typeof window === 'undefined') return;

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return;
        }

        // Register service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        // Get FCM token
        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (token) {
            // Save to Supabase
            await supabase
                .from('profiles')
                .update({ fcm_token: token })
                .eq('id', userId);
            console.log('FCM token registered');
        }
    } catch (err) {
        console.warn('FCM registration failed:', err);
    }
}
