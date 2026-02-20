"use client";

import Link from 'next/link';
import { Zap, Shield, MessageCircle, Users, Lock, Sparkles, Smartphone, Download } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
  })
};

const scaleIn: any = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  })
};

const features = [
  { icon: Lock, label: 'End-to-End\nPrivacy', color: 'var(--accent-purple)' },
  { icon: Shield, label: 'Invite\nOnly', color: 'var(--accent-cyan)' },
  { icon: MessageCircle, label: 'Ephemeral\nMessages', color: 'var(--accent-pink)' },
  { icon: Users, label: 'Your\nCircle', color: 'var(--accent-green)' },
];

export default function LandingPage() {
  return (
    <div className="page-container" style={{ overflow: 'auto' }}>
      {/* Animated background */}
      <motion.div
        className="blob blob-purple"
        style={{ width: 300, height: 300, top: '5%', right: '-15%' }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.15, 0.95, 1]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="blob blob-pink"
        style={{ width: 250, height: 250, bottom: '20%', left: '-10%' }}
        animate={{
          x: [0, -20, 30, 0],
          y: [0, 30, -20, 0],
          scale: [1, 0.9, 1.1, 1]
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear", delay: 2 }}
      />
      <motion.div
        className="blob blob-cyan"
        style={{ width: 180, height: 180, top: '45%', right: '10%' }}
        animate={{
          x: [0, 20, -30, 0],
          y: [0, -30, 15, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear", delay: 4 }}
      />

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px 40px' }}>

        {/* Logo */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          style={{ marginBottom: 20 }}
        >
          <motion.div
            style={{
              width: 72, height: 72, borderRadius: 22,
              background: 'var(--bonded-gradient)', backgroundSize: '200% 200%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 12px 40px rgba(139, 92, 246, 0.35), inset 0 1px 1px rgba(255,255,255,0.2)'
            }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              boxShadow: [
                '0 12px 40px rgba(139, 92, 246, 0.35)',
                '0 12px 40px rgba(236, 72, 153, 0.35)',
                '0 12px 40px rgba(139, 92, 246, 0.35)',
              ]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <Zap size={34} color="white" fill="white" />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={fadeUp} initial="hidden" animate="visible" custom={1}
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 52, fontWeight: 900, letterSpacing: -2, marginBottom: 12 }}
        >
          <span className="text-gradient">Bonded</span>
        </motion.h1>

        <motion.p
          variants={fadeUp} initial="hidden" animate="visible" custom={2}
          style={{ color: 'var(--text-secondary)', fontSize: 16, textAlign: 'center', maxWidth: 300, lineHeight: 1.7, marginBottom: 8 }}
        >
          Your circle. Your rules.
        </motion.p>
        <motion.p
          variants={fadeUp} initial="hidden" animate="visible" custom={2.5}
          style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 48 }}
        >
          Privacy-first messaging for real ones
        </motion.p>

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 340, marginBottom: 32 }}>
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              custom={i + 3}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="glass-card"
              style={{ padding: '20px 16px', textAlign: 'center', cursor: 'default' }}
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, delay: i * 0.5 }}
                style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: `${f.color}15`, border: `1px solid ${f.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 10px'
                }}
              >
                <f.icon size={20} style={{ color: f.color }} />
              </motion.div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                {f.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Android Download */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={7}
          style={{ width: '100%', maxWidth: 340, marginBottom: 24 }}
        >
          <a href="/bonded.apk" download="Bonded.apk"
            style={{ textDecoration: 'none' }}>
            <motion.div
              whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(34, 197, 94, 0.3)' }}
              whileTap={{ scale: 0.98 }}
              className="glass-card"
              style={{
                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
                border: '1px solid rgba(34, 197, 94, 0.2)', cursor: 'pointer',
                background: 'rgba(34, 197, 94, 0.06)'
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)', flexShrink: 0
              }}>
                <Smartphone size={22} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>DOWNLOAD FOR</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>Android</div>
                <div style={{ fontSize: 10, color: 'var(--accent-green)', fontWeight: 600 }}>v1.0.0 • Free</div>
              </div>
              <Download size={20} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
            </motion.div>
          </a>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={8}
          style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 340 }}
        >
          <Link href="/signup">
            <motion.button
              className="btn-gradient"
              style={{ width: '100%' }}
              whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)' }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles size={18} /> Get Started
            </motion.button>
          </Link>
          <Link href="/login">
            <motion.button
              className="btn-ghost"
              style={{ width: '100%' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              I'm Already Bonded
            </motion.button>
          </Link>
        </motion.div>

        {/* Footer */}
        <motion.p
          variants={fadeUp} initial="hidden" animate="visible" custom={9}
          style={{ marginTop: 40, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Zap size={10} /> Decentralized & Private
        </motion.p>
      </div>
    </div>
  );
}

