import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
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
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, profile, loading };
}
