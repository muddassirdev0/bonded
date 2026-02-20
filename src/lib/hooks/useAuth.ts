import { useState, useEffect, useRef } from 'react';
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

// VAPID key for FCM
const VAPID_KEY = 'BK-PuEPRPkcPvlt50D3NHGQp8mJhp3XIvCZSEtqeDJcYnSzXE-CYL3b1YavkmoKzjl50yn4WaChmzKzZuHli0LA';

// Update last_seen_at
async function updateLastSeen(userId: string) {
    await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId);
}

// Register FCM push token
async function registerFCMToken(userId: string) {
    try {
        if (!messaging) return;
        if (typeof window === 'undefined') return;

        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });

        if (token) {
            console.log('FCM token generated:', token);
            await supabase.from('profiles').update({ fcm_token: token }).eq('id', userId);
            console.log('FCM token registered in Supabase');
        } else {
            console.warn('No FCM token generated');
        }
    } catch (err) {
        console.warn('FCM registration failed:', err);
    }
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
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

                // Update last_seen_at now and every 60s heartbeat
                updateLastSeen(firebaseUser.uid);
                if (heartbeatRef.current) clearInterval(heartbeatRef.current);
                heartbeatRef.current = setInterval(() => updateLastSeen(firebaseUser.uid), 60000);
            } else {
                setProfile(null);
                if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            }

            setLoading(false);
        });

        return () => {
            unsubscribe();
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        };
    }, []);

    return { user, profile, loading };
}
