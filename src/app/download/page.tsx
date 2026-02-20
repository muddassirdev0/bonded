"use client";

import { motion } from 'framer-motion';
import { Smartphone, Download, Zap, Shield, ChevronLeft, MessageCircle } from 'lucide-react';
import Link from 'next/link';

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.1, duration: 0.5 }
    })
};

export default function DownloadPage() {
    return (
        <div className="page-container" style={{ overflow: 'auto' }}>
            {/* Animated background blobs */}
            <div className="blob blob-purple" style={{ top: '-10%', right: '-10%', width: 300, height: 300 }} />
            <div className="blob blob-cyan" style={{ bottom: '10%', left: '-10%', width: 250, height: 250 }} />

            <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px' }}>

                {/* Header Navigation */}
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ width: '100%', maxWidth: 400, display: 'flex', alignItems: 'center', marginBottom: 60 }}
                >
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                        <ChevronLeft size={20} /> Back
                    </Link>
                </motion.div>

                {/* Content */}
                <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 20,
                        background: 'var(--bonded-gradient)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px',
                        boxShadow: '0 10px 30px rgba(139, 92, 246, 0.3)'
                    }}>
                        <Zap size={30} color="white" fill="white" />
                    </div>
                    <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 12 }}>Get <span className="text-gradient">Bonded</span></h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 300, margin: '0 auto' }}>
                        Download the official Android app and keep your circle closer than ever.
                    </p>
                </motion.div>

                {/* Download Card */}
                <motion.div
                    variants={fadeUp} initial="hidden" animate="visible" custom={1}
                    style={{ width: '100%', maxWidth: 360, marginBottom: 40 }}
                >
                    <a href="/bonded.apk" download="Bonded.apk" style={{ textDecoration: 'none' }}>
                        <motion.div
                            whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                            whileTap={{ scale: 0.98 }}
                            className="glass-card"
                            style={{
                                padding: '32px 24px', textAlign: 'center',
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(255,255,255,0.02)'
                            }}
                        >
                            <div style={{
                                width: 80, height: 80, borderRadius: 24,
                                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 24px',
                                boxShadow: '0 10px 30px rgba(34, 197, 94, 0.3)'
                            }}>
                                <Smartphone size={40} color="white" />
                            </div>

                            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'white' }}>Download for Android</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>Version 1.0.0 (Beta) • 5.8 MB</p>

                            <div style={{
                                background: 'var(--accent-green)',
                                color: 'white', fontWeight: 700,
                                padding: '16px', borderRadius: 16,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                            }}>
                                <Download size={20} /> Install APK
                            </div>
                        </motion.div>
                    </a>
                </motion.div>

                {/* Features Recap */}
                <div style={{ width: '100%', maxWidth: 360, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 40 }}>
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
                        <Shield size={20} style={{ color: 'var(--accent-purple)', marginBottom: 8 }} />
                        <div style={{ fontSize: 12, fontWeight: 600 }}>E2E Privacy</div>
                    </motion.div>
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
                        <Zap size={20} style={{ color: 'var(--accent-yellow)', marginBottom: 8 }} />
                        <div style={{ fontSize: 12, fontWeight: 600 }}>Fast Sync</div>
                    </motion.div>
                </div>

                {/* Other Option */}
                <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
                    <Link href="/signup" style={{ color: 'var(--text-muted)', fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MessageCircle size={18} /> Or try our web version
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}
