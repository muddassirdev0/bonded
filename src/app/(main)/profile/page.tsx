"use client";

import { useAuth } from '@/lib/hooks/useAuth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck, Camera, ChevronRight, Bell, Moon, Lock, HelpCircle, Zap } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const }
    })
};

export default function ProfilePage() {
    const { user, profile } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await auth.signOut();
        router.push('/login');
    };

    if (!profile) return null;

    const menuItems = [
        ...(profile.role === 'admin' ? [{ icon: ShieldCheck, label: 'Admin Dashboard', color: 'var(--accent-purple)', href: '/admin' }] : []),
        { icon: Bell, label: 'Notifications', color: 'var(--accent-yellow)' },
        { icon: Lock, label: 'Privacy', color: 'var(--accent-green)' },
        { icon: HelpCircle, label: 'Help & Support', color: 'var(--text-secondary)' },
    ];

    return (
        <div style={{ paddingBottom: 100 }}>
            {/* Header */}
            <motion.div
                className="app-header"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <h1 className="app-header-title" style={{ flex: 1 }}>Profile</h1>
            </motion.div>

            {/* Profile Card */}
            <div style={{ margin: '12px 16px' }}>
                <motion.div
                    className="glass-card"
                    style={{ overflow: 'hidden' }}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                >
                    {/* Banner */}
                    <div className="profile-banner">
                        <div className="profile-avatar-container">
                            <motion.div
                                style={{ position: 'relative' }}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
                            >
                                <img
                                    src={profile.avatar_url}
                                    className="avatar avatar-2xl"
                                    style={{ border: '4px solid var(--bg-primary)' }}
                                />
                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    id="avatar-upload"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file || !profile) return;

                                        try {
                                            const fileExt = file.name.split('.').pop();
                                            const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
                                            const { error: uploadError } = await import('@/lib/supabase').then(m => m.supabase.storage
                                                .from('avatars')
                                                .upload(fileName, file));

                                            if (uploadError) throw uploadError;

                                            const { data: { publicUrl } } = await import('@/lib/supabase').then(m => m.supabase.storage
                                                .from('avatars')
                                                .getPublicUrl(fileName));

                                            // Update profile
                                            const { error: updateError } = await import('@/lib/supabase').then(m => m.supabase
                                                .from('profiles')
                                                .update({ avatar_url: publicUrl })
                                                .eq('id', profile.id));

                                            if (updateError) throw updateError;

                                            window.location.reload();
                                        } catch (error) {
                                            console.error('Error uploading avatar:', error);
                                            alert('Failed to upload avatar');
                                        }
                                    }}
                                />
                                <motion.label
                                    htmlFor="avatar-upload"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    style={{
                                        position: 'absolute', bottom: 2, right: 2,
                                        width: 28, height: 28, borderRadius: '50%',
                                        background: 'var(--accent-purple)', border: '2px solid var(--bg-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', color: 'white'
                                    }}
                                >
                                    <Camera size={12} />
                                </motion.label>
                            </motion.div>
                        </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: '52px 20px 20px', textAlign: 'center' }}>
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            style={{ fontSize: 20, fontWeight: 800 }}
                        >
                            {profile.display_name}
                        </motion.h2>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.35 }}
                        >
                            <p style={{ fontSize: 14, color: 'var(--accent-purple)', fontWeight: 600, marginTop: 2 }}>@{profile.username}</p>
                        </motion.div>

                        {/* Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 20 }}>
                            {[
                                { value: '0', label: 'Snaps' },
                                { value: '0', label: 'Friends' },
                                { value: '🔥', label: 'Streak' },
                            ].map((s, i) => (
                                <motion.div
                                    key={i}
                                    variants={fadeUp}
                                    initial="hidden"
                                    animate="visible"
                                    custom={i + 4}
                                    whileHover={{ y: -2, backgroundColor: 'rgba(255,255,255,0.05)' }}
                                    style={{
                                        padding: '14px 8px', borderRadius: 14,
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.04)'
                                    }}
                                >
                                    <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600, letterSpacing: 0.3 }}>{s.label}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Menu */}
            <div style={{ margin: '0 16px' }}>
                <motion.div
                    className="glass-card"
                    style={{ overflow: 'hidden' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    {menuItems.map((item: any, i) => {
                        const Icon = item.icon;
                        const content = (
                            <motion.div
                                key={i}
                                className="chat-item"
                                style={{ borderBottom: i < menuItems.length - 1 ? '1px solid rgba(255, 255, 255, 0.03)' : 'none' }}
                                whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)', x: 4 }}
                                whileTap={{ scale: 0.99 }}
                            >
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: item.color, flexShrink: 0
                                }}>
                                    <Icon size={18} />
                                </div>
                                <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{item.label}</div>
                                {item.badge ? (
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '3px 8px', borderRadius: 6 }}>{item.badge}</span>
                                ) : (
                                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                                )}
                            </motion.div>
                        );
                        return item.href ? <Link key={i} href={item.href}>{content}</Link> : <div key={i}>{content}</div>;
                    })}
                </motion.div>
            </div>

            {/* Logout */}
            <motion.div
                style={{ margin: '12px 16px 24px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
            >
                <motion.button
                    onClick={handleLogout}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                        width: '100%', padding: '14px', borderRadius: 14,
                        background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.1)',
                        color: 'var(--accent-red)', fontWeight: 700, fontSize: 14,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                >
                    <LogOut size={18} />
                    Sign Out
                </motion.button>
            </motion.div>

            <motion.div
                style={{ textAlign: 'center', paddingBottom: 24 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
            >
                <p style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Zap size={10} /> Bonded v1.0.0 Alpha
                </p>
            </motion.div>
        </div>
    );
}
