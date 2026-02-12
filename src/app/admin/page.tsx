"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/hooks/useAuth';
import { Check, X, ArrowLeft, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const listItem = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.05, duration: 0.3 }
    })
};

export default function AdminPage() {
    const { profile } = useAuth();
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPending = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('status', 'pending');
        if (data) setPendingUsers(data);
        setLoading(false);
    };

    useEffect(() => {
        if (profile?.role === 'admin') fetchPending();
    }, [profile]);

    const handleAction = async (userId: string, status: 'approved' | 'rejected') => {
        // Optimistic UI update
        setPendingUsers(prev => prev.filter(u => u.id !== userId));

        await supabase.from('profiles').update({ status }).eq('id', userId);
        fetchPending(); // Re-fetch to be sure
    };

    if (profile?.role !== 'admin') {
        return (
            <div className="page-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--accent-red)' }}>Access Denied</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Header */}
            <motion.div
                className="app-header"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <Link href="/profile">
                    <button className="btn-icon" style={{ background: 'transparent' }}>
                        <ArrowLeft size={22} />
                    </button>
                </Link>
                <Shield size={20} style={{ color: 'var(--accent-purple)' }} />
                <h1 className="app-header-title">Admin</h1>
            </motion.div>

            <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Users size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
                        Pending Approvals ({pendingUsers.length})
                    </span>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="spinner"
                        />
                    </div>
                ) : pendingUsers.length === 0 ? (
                    <motion.div
                        className="glass-card"
                        style={{ padding: '40px 24px', textAlign: 'center' }}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                    >
                        <motion.div
                            style={{
                                width: 56, height: 56, borderRadius: 18, margin: '0 auto 12px',
                                background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Check size={24} style={{ color: 'var(--accent-green)' }} />
                        </motion.div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>All clear! No pending requests</p>
                    </motion.div>
                ) : (
                    <motion.div
                        className="glass-card"
                        style={{ overflow: 'hidden' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <AnimatePresence>
                            {pendingUsers.map((u, i) => (
                                <motion.div
                                    key={u.id}
                                    className="chat-item"
                                    variants={listItem}
                                    initial="hidden"
                                    animate="visible"
                                    exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                                    custom={i}
                                    style={{ borderBottom: i < pendingUsers.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                                >
                                    <div className="avatar-wrapper">
                                        <img src={u.avatar_url} className="avatar avatar-lg avatar-ring avatar-ring-purple" />
                                    </div>

                                    <div className="chat-item-info">
                                        <div className="chat-item-name">{u.display_name}</div>
                                        <div className="chat-item-status">
                                            <span style={{ color: 'var(--text-muted)' }}>@{u.username}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => handleAction(u.id, 'rejected')}
                                            className="btn-icon"
                                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' }}
                                        >
                                            <X size={16} />
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => handleAction(u.id, 'approved')}
                                            className="btn-icon"
                                            style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)' }}
                                        >
                                            <Check size={16} />
                                        </motion.button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
