"use client";

import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Eye, Lock, Users, MessageSquare, Bell, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
    const router = useRouter();

    const sections = [
        {
            icon: Shield,
            title: 'Your Data is Safe',
            content: 'Bonded uses end-to-end encryption for all your messages. Your conversations are private and secure. We never sell your data to third parties.'
        },
        {
            icon: Eye,
            title: 'Who Can See Your Profile',
            content: 'Only your approved friends can see your full profile, including your bio and avatar. Other users can only see your username when searching to add you.'
        },
        {
            icon: Lock,
            title: 'One-Time Images',
            content: 'One-time images can only be viewed once by the recipient. After viewing, the image is locked and cannot be opened again, ensuring maximum privacy for sensitive content.'
        },
        {
            icon: Users,
            title: 'Friend Requests',
            content: 'You have full control over who can message you. Only accepted friends can start conversations with you. You can reject or block any friend request.'
        },
        {
            icon: MessageSquare,
            title: 'Message Deletion',
            content: 'You can delete any message you sent within 3 hours. Deleted messages are permanently removed from our servers and cannot be recovered.'
        },
        {
            icon: Bell,
            title: 'Notifications',
            content: 'Push notifications are optional. You can enable or disable them at any time through your browser settings. We only send notifications for calls and new messages.'
        },
        {
            icon: Trash2,
            title: 'Account Deletion',
            content: 'You can request account deletion at any time. Contact the admin (username: muddassir) and all your data, messages, and media will be permanently removed within 48 hours.'
        },
    ];

    return (
        <div style={{ height: '100vh', overflowY: 'auto', paddingBottom: 100 }}>
            <motion.div className="app-header" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginRight: 8 }}>
                    <ArrowLeft size={22} />
                </motion.button>
                <h1 className="app-header-title" style={{ flex: 1 }}>Privacy Policy</h1>
            </motion.div>

            <div style={{ padding: '12px 16px' }}>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <div className="glass-card" style={{ padding: '20px', marginBottom: 16 }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
                        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Your Privacy Matters</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            At Bonded, we believe privacy is a fundamental right. We've designed every feature with your privacy in mind.
                            Here's everything you need to know about how we protect your data.
                        </p>
                    </div>
                </motion.div>

                {sections.map((section, i) => {
                    const Icon = section.icon;
                    return (
                        <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
                            <div className="glass-card" style={{ padding: '16px', marginBottom: 8, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                    background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--accent-purple)'
                                }}>
                                    <Icon size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{section.title}</h3>
                                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{section.content}</p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                    <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 11, color: 'var(--text-muted)' }}>
                        Last updated: February 2026 · Bonded v1.0.0
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
