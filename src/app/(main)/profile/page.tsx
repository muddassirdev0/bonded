"use client";

import { useAuth } from '@/lib/hooks/useAuth';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, ShieldCheck, Camera, ChevronRight, Lock, HelpCircle, Zap, Edit3, X, Trash2, Plus, CheckSquare } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const fadeUp: any = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" }
    })
};

export default function ProfilePage() {
    const { user, profile } = useAuth();
    const router = useRouter();

    const [friendsCount, setFriendsCount] = useState(0);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState('');
    const [editUsername, setEditUsername] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    // Fetch friends count
    useEffect(() => {
        if (!user) return;

        const fetchFriendsCount = async () => {
            const { data: sent } = await supabase
                .from('friend_requests')
                .select('id', { count: 'exact' })
                .eq('sender_id', user.uid)
                .eq('status', 'accepted');

            const { data: received } = await supabase
                .from('friend_requests')
                .select('id', { count: 'exact' })
                .eq('receiver_id', user.uid)
                .eq('status', 'accepted');

            setFriendsCount((sent?.length || 0) + (received?.length || 0));
        };

        fetchFriendsCount();
    }, [user]);

    const handleLogout = async () => {
        await auth.signOut();
        router.push('/login');
    };

    const openEditModal = () => {
        if (!profile) return;
        setEditName(profile.display_name || '');
        setEditUsername(profile.username || '');
        setEditBio((profile as any).bio || '');
        setShowEditModal(true);
    };

    const handleSaveProfile = async () => {
        if (!profile || !editName.trim() || !editUsername.trim()) return;
        setEditLoading(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    display_name: editName.trim(),
                    username: editUsername.trim().toLowerCase(),
                    bio: editBio.trim()
                })
                .eq('id', profile.id);

            if (error) {
                if (error.message.includes('unique') || error.code === '23505') {
                    alert('Username already taken!');
                } else {
                    alert('Error: ' + error.message);
                }
            } else {
                setShowEditModal(false);
                window.location.reload();
            }
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setEditLoading(false);
        }
    };

    const handleRemoveAvatar = async () => {
        if (!profile) return;
        if (!confirm('Remove your profile picture?')) return;

        try {
            const defaultAvatar = `https://api.dicebear.com/7.x/micah/svg?seed=${profile.username}`;
            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: defaultAvatar })
                .eq('id', profile.id);

            if (error) throw error;
            window.location.reload();
        } catch (e: any) {
            alert('Error removing avatar: ' + e.message);
        }
    };

    if (!profile) return null;

    const menuItems = [
        ...(profile.role === 'admin' ? [{ icon: ShieldCheck, label: 'Admin Dashboard', color: 'var(--accent-purple)', href: '/admin' }] : []),
        { icon: Edit3, label: 'Edit Profile', color: 'var(--accent-cyan)', action: openEditModal },
        { icon: CheckSquare, label: 'My Todos', color: 'var(--accent-yellow)', href: '/todos' },
        { icon: Lock, label: 'Privacy', color: 'var(--accent-green)', href: '/privacy' },
        { icon: HelpCircle, label: 'Help & Support', color: 'var(--text-secondary)', href: '/help' },
    ];

    return (
        <div style={{ paddingBottom: 100, height: '100vh', overflowY: 'auto' }}>
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
                                            const { error: uploadError } = await supabase.storage
                                                .from('avatars')
                                                .upload(fileName, file);

                                            if (uploadError) throw uploadError;

                                            const { data: { publicUrl } } = supabase.storage
                                                .from('avatars')
                                                .getPublicUrl(fileName);

                                            const { error: updateError } = await supabase
                                                .from('profiles')
                                                .update({ avatar_url: publicUrl })
                                                .eq('id', profile.id);

                                            if (updateError) throw updateError;
                                            window.location.reload();
                                        } catch (error) {
                                            console.error('Error uploading avatar:', error);
                                            alert('Failed to upload avatar');
                                        }
                                    }}
                                />

                                {/* Change avatar button */}
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

                                {/* Remove avatar button */}
                                <motion.button
                                    onClick={handleRemoveAvatar}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    style={{
                                        position: 'absolute', bottom: 2, left: 2,
                                        width: 28, height: 28, borderRadius: '50%',
                                        background: 'rgba(239, 68, 68, 0.9)', border: '2px solid var(--bg-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', color: 'white'
                                    }}
                                >
                                    <Trash2 size={11} />
                                </motion.button>
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

                        {/* Bio */}
                        {(profile as any).bio && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.4 }}
                            >
                                {(profile as any).bio}
                            </motion.p>
                        )}

                        {/* Stats - Only Friends count */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
                            <motion.div
                                variants={fadeUp}
                                initial="hidden"
                                animate="visible"
                                custom={4}
                                whileHover={{ y: -2, backgroundColor: 'rgba(255,255,255,0.05)' }}
                                style={{
                                    padding: '14px 40px', borderRadius: 14,
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.04)',
                                    minWidth: 120
                                }}
                            >
                                <div style={{ fontSize: 22, fontWeight: 800 }}>{friendsCount}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600, letterSpacing: 0.3 }}>Friends</div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Add Story Button */}
            <div style={{ margin: '0 16px 12px' }}>
                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    whileHover={{ scale: 1.01, backgroundColor: 'rgba(139, 92, 246, 0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                        width: '100%', padding: '14px', borderRadius: 14,
                        background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.15)',
                        color: 'var(--accent-purple)', fontWeight: 700, fontSize: 14,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                    onClick={() => alert('Stories coming soon!')}
                >
                    <Plus size={18} />
                    Add Your Story
                </motion.button>
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
                                onClick={item.action || undefined}
                            >
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: item.color, flexShrink: 0
                                }}>
                                    <Icon size={18} />
                                </div>
                                <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{item.label}</div>
                                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                            </motion.div>
                        );
                        return item.href ? <Link key={i} href={item.href}>{content}</Link> : <div key={i} style={{ cursor: item.action ? 'pointer' : 'default' }}>{content}</div>;
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

            {/* Edit Profile Modal */}
            <AnimatePresence>
                {showEditModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 100,
                            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="glass-card"
                            style={{ width: '100%', maxWidth: 340, padding: 24, position: 'relative' }}
                        >
                            <button onClick={() => setShowEditModal(false)}
                                style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>

                            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Edit Profile</h3>

                            {/* Display Name */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Display Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: 10,
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                        color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* Username */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Username</label>
                                <div style={{
                                    display: 'flex', alignItems: 'center',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 10, padding: '0 14px'
                                }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>@</span>
                                    <input
                                        type="text"
                                        value={editUsername}
                                        onChange={(e) => setEditUsername(e.target.value.toLowerCase())}
                                        style={{
                                            flex: 1, padding: '10px 8px',
                                            background: 'none', border: 'none',
                                            color: 'white', fontSize: 14, outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Bio */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Bio</label>
                                <textarea
                                    value={editBio}
                                    onChange={(e) => setEditBio(e.target.value)}
                                    maxLength={150}
                                    rows={3}
                                    placeholder="Tell something about yourself..."
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: 10,
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                        color: 'white', fontSize: 14, outline: 'none', resize: 'none',
                                        fontFamily: 'inherit', boxSizing: 'border-box'
                                    }}
                                />
                                <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    {editBio.length}/150
                                </div>
                            </div>

                            <motion.button
                                onClick={handleSaveProfile}
                                disabled={editLoading || !editName.trim() || !editUsername.trim()}
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: 12,
                                    background: 'var(--accent-purple)', color: 'white', fontWeight: 600,
                                    border: 'none', cursor: 'pointer', fontSize: 14,
                                    opacity: editLoading ? 0.7 : 1
                                }}
                            >
                                {editLoading ? 'Saving...' : 'Save Changes'}
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
