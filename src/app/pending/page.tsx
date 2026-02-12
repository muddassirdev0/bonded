"use client";

import PendingScreen from '@/components/PendingScreen';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PendingPage() {
    const { profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && profile?.status === 'approved') {
            router.push('/chats');
        }
    }, [profile, loading, router]);

    if (loading) return null; // Or a loader

    return <PendingScreen />;
}
