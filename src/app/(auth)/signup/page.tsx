"use client";

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Eye, EyeOff, Zap, Lock, User, AtSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 25 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const }
    })
};

export default function SignupPage() {
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const cleanUsername = username.toLowerCase().trim().replace(/\s/g, '');

        if (cleanUsername.length < 3) {
            setError('Username must be at least 3 characters');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        try {
            const { data: existing } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', cleanUsername)
                .single();

            if (existing) {
                setError('Username already taken');
                setLoading(false);
                return;
            }

            const email = `${cleanUsername}@bonded.app`;
            const cred = await createUserWithEmailAndPassword(auth, email, password);

            await supabase.from('profiles').insert({
                id: cred.user.uid,
                username: cleanUsername,
                display_name: displayName || cleanUsername,
                avatar_url: `https://api.dicebear.com/7.x/micah/svg?seed=${cleanUsername}`,
                status: 'pending',
                role: 'user'
            });

            await auth.signOut();
            router.push('/login');
        } catch (err: any) {
            if (err.code === 'auth/email-already-in-use') {
                setError('Username already exists');
            } else if (err.code === 'auth/weak-password') {
                setError('Password too weak (min 6 characters)');
            } else {
                setError('Signup failed. Try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container" style={{ overflow: 'auto' }}>
            <motion.div
                className="blob blob-cyan"
                style={{ width: 250, height: 250, top: '5%', left: '-10%' }}
                animate={{ x: [0, 25, -15, 0], y: [0, -20, 25, 0] }}
                transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="blob blob-purple"
                style={{ width: 200, height: 200, bottom: '15%', right: '-5%' }}
                animate={{ x: [0, -20, 15, 0], y: [0, 15, -20, 0] }}
                transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 3 }}
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
                        Join the Circle
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>Create your Bonded identity</p>
                </motion.div>

                <motion.form
                    onSubmit={handleSignup}
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

                    <div style={{ position: 'relative' }}>
                        <AtSign size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Pick a username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                            required
                            className="glass-input"
                            style={{ paddingLeft: 40 }}
                            autoComplete="username"
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Display name (optional)"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="glass-input"
                            style={{ paddingLeft: 40 }}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Create password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="glass-input"
                            style={{ paddingLeft: 40, paddingRight: 44 }}
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    <motion.button
                        type="submit"
                        disabled={loading}
                        className="btn-gradient"
                        style={{ marginTop: 4 }}
                        whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)' }}
                        whileTap={{ scale: 0.97 }}
                    >
                        {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : <><UserPlus size={18} /> Create Account</>}
                    </motion.button>

                    <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={3} style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                        Already bonded?{' '}
                        <Link href="/login" style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
                            Sign in
                        </Link>
                    </motion.p>
                </motion.form>
            </div>
        </div>
    );
}
