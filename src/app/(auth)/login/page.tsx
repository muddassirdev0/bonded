"use client";

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Eye, EyeOff, Zap, User, Lock } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

const fadeUp: any = {
    hidden: { opacity: 0, y: 25 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" }
    })
};

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const email = `${username.toLowerCase().trim()}@bonded.app`;
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/chats');
        } catch (err: any) {
            setError('Wrong username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container" style={{ overflow: 'auto' }}>
            <motion.div
                className="blob blob-purple"
                style={{ width: 250, height: 250, top: '10%', right: '-10%' }}
                animate={{ x: [0, 20, -10, 0], y: [0, -30, 15, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
                className="blob blob-pink"
                style={{ width: 200, height: 200, bottom: '20%', left: '-5%' }}
                animate={{ x: [0, -15, 20, 0], y: [0, 20, -15, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear", delay: 3 }}
            />

            <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>

                <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} style={{ textAlign: 'center', marginBottom: 40 }}>
                    <motion.div
                        style={{
                            width: 56, height: 56, borderRadius: 18,
                            background: 'var(--bonded-gradient)', backgroundSize: '200% 200%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px', boxShadow: '0 8px 30px rgba(139, 92, 246, 0.25)'
                        }}
                        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                        transition={{ duration: 4, repeat: Infinity }}
                    >
                        <Zap size={26} color="white" fill="white" />
                    </motion.div>
                    <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800 }}>
                        Welcome Back
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>Enter your credentials</p>
                </motion.div>

                <motion.form
                    onSubmit={handleLogin}
                    variants={fadeUp} initial="hidden" animate="visible" custom={1}
                    style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}
                >

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                className="alert-error"
                                initial={{ opacity: 0, y: -10, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -10, height: 0 }}
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.div style={{ position: 'relative' }} whileFocus={{ scale: 1.02 }}>
                        <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="glass-input"
                            style={{ paddingLeft: 40 }}
                            autoComplete="username"
                        />
                    </motion.div>

                    <motion.div style={{ position: 'relative' }}>
                        <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="glass-input"
                            style={{ paddingLeft: 40, paddingRight: 44 }}
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </motion.div>

                    <motion.button
                        type="submit"
                        disabled={loading}
                        className="btn-gradient"
                        style={{ marginTop: 4 }}
                        whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)' }}
                        whileTap={{ scale: 0.97 }}
                    >
                        {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : <><LogIn size={18} /> Sign In</>}
                    </motion.button>

                    <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={3} style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                        Not bonded yet?{' '}
                        <Link href="/signup" style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
                            Join now
                        </Link>
                    </motion.p>
                </motion.form>
            </div>
        </div>
    );
}
