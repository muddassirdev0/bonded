"use client";

import { auth } from '@/lib/firebase';
import { LogOut, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function PendingScreen() {
    const router = useRouter();

    const handleLogout = async () => {
        await auth.signOut();
        router.push('/login');
    };

    return (
        <div className="page-container" style={{ overflow: 'auto' }}>
            <motion.div
                className="blob blob-purple"
                style={{ width: 250, height: 250, top: '15%', left: '-10%' }}
                animate={{ x: [0, 20, -20, 0], y: [0, -20, 20, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="blob blob-pink"
                style={{ width: 200, height: 200, bottom: '25%', right: '-5%' }}
                animate={{ x: [0, -15, 15, 0], y: [0, 15, -15, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />

            <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ textAlign: 'center', maxWidth: 340 }}
                >
                    {/* Pulsing icon */}
                    <motion.div
                        style={{
                            width: 80, height: 80, borderRadius: 24,
                            background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 24px'
                        }}
                        animate={{
                            scale: [1, 1.05, 1],
                            boxShadow: ['0 0 0 0 rgba(251, 191, 36, 0)', '0 0 0 10px rgba(251, 191, 36, 0.1)', '0 0 0 0 rgba(251, 191, 36, 0)']
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <span style={{ fontSize: 36 }}>⏳</span>
                    </motion.div>

                    <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 12 }}>
                        Access Pending
                    </h2>

                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
                        Your account is under review by the admins. You'll get access once approved.
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        Bonded is an invite-only community
                    </p>

                    <motion.button
                        onClick={handleLogout}
                        className="btn-ghost"
                        style={{ marginTop: 32 }}
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <LogOut size={16} />
                        Sign Out
                    </motion.button>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        style={{ marginTop: 24, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    >
                        <Zap size={10} /> Bonded v1.0
                    </motion.p>
                </motion.div>
            </div>
        </div>
    );
}
