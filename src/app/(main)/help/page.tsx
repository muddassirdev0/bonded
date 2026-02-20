"use client";

import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, Users, HelpCircle, Bug, Lightbulb, Shield, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HelpPage() {
    const router = useRouter();

    const faqs = [
        { q: 'How do I add a friend?', a: 'Go to Chats → tap the + button at top right → enter their exact username → send request. They need to accept it before you can chat.' },
        { q: 'How do voice/video calls work?', a: 'Open a chat with your friend → tap the phone 📞 or video 📹 icon at the top right. Both users need to allow microphone/camera access.' },
        { q: 'What are one-time images?', a: 'Toggle "One-time" when sending an image. The recipient can only view it once — after that, the image is locked forever!' },
        { q: 'How do I send GIFs?', a: 'In any chat, tap the yellow "GIF" button next to the text input. Search for GIFs and tap to send!' },
        { q: 'Can I delete messages?', a: 'Yes! Long-press any message you sent (within 3 hours) to delete it. It will be removed for everyone instantly.' },
        { q: 'How do I change my profile picture?', a: 'Go to Profile → tap on your avatar → choose a new photo from your gallery.' },
        { q: 'What is the Bonded AI?', a: 'Bonded AI is our friendly bot that welcomes new users, answers questions about the platform, and helps with announcements. It uses AI to chat naturally!' },
        { q: 'How do I use Todos?', a: 'Go to Profile → scroll down to "My Todos" → tap + to add a task. Tap the circle to mark as done, or the trash icon to delete.' },
    ];

    return (
        <div style={{ height: '100vh', overflowY: 'auto', paddingBottom: 100 }}>
            <motion.div className="app-header" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginRight: 8 }}>
                    <ArrowLeft size={22} />
                </motion.button>
                <h1 className="app-header-title" style={{ flex: 1 }}>Help & Support</h1>
            </motion.div>

            <div style={{ padding: '12px 16px' }}>
                {/* Contact Support Card */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <div className="glass-card" style={{ padding: '20px', marginBottom: 16, textAlign: 'center' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Need Help?</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                            If you're facing any issues or have suggestions, add our admin as a friend and send a message. We're always here to help!
                        </p>
                        <div style={{
                            background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)',
                            borderRadius: 14, padding: '14px 20px', display: 'inline-flex', alignItems: 'center', gap: 10
                        }}>
                            <Users size={18} style={{ color: 'var(--accent-purple)' }} />
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Add as friend:</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-purple)' }}>@muddassir</div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* FAQs */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HelpCircle size={18} style={{ color: 'var(--accent-purple)' }} />
                        Frequently Asked Questions
                    </h3>
                </motion.div>

                {faqs.map((faq, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.05 }}>
                        <div className="glass-card" style={{ padding: '14px 16px', marginBottom: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ color: 'var(--accent-purple)', fontWeight: 800, flexShrink: 0 }}>Q.</span>
                                {faq.q}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: 20 }}>
                                {faq.a}
                            </div>
                        </div>
                    </motion.div>
                ))}

                {/* Report & Feedback */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                    <div className="glass-card" style={{ padding: '16px', marginTop: 8 }}>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--accent-red)'
                            }}><Bug size={18} /></div>
                            <div>
                                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Report a Bug</h4>
                                <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>Found something broken? Message @muddassir with details and screenshots.</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                background: 'rgba(251, 191, 36, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--accent-yellow)'
                            }}><Lightbulb size={18} /></div>
                            <div>
                                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Feature Request</h4>
                                <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>Have an idea? We'd love to hear it! Send your suggestions to @muddassir.</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--accent-purple)'
                            }}><Shield size={18} /></div>
                            <div>
                                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Safety Concern</h4>
                                <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>Report any harassment or inappropriate content to @muddassir immediately.</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
                    <div style={{ textAlign: 'center', padding: '24px 0 0', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Heart size={12} style={{ color: 'var(--accent-red)' }} />
                        Made with love by Muddassir
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
