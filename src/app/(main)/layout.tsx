"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEffect } from 'react';
import { MessageCircle, Users, Phone, User, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
    { icon: MessageCircle, label: 'Chat', href: '/chats' },
    { icon: Phone, label: 'Calls', href: '/calls' },
    { icon: User, label: 'Profile', href: '/profile' },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (profile && profile.status !== 'approved') {
                router.push('/pending');
            }
        }
    }, [user, loading, profile, router]);

    if (loading) {
        return (
            <div className="page-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    >
                        <Zap size={32} style={{ color: 'var(--accent-purple)' }} />
                    </motion.div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</span>
                </motion.div>
            </div>
        );
    }

    if (!user || (profile && profile.status !== 'approved')) return null;

    // Detect if we're in a sub-page (like /chats/[id]) — hide bottom nav
    const isSubPage = pathname.split('/').length > 2 && pathname.startsWith('/chats/');

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            paddingBottom: isSubPage ? 'env(safe-area-inset-bottom, 0px)' : 72,
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
            maxWidth: '100vw',
            overflowX: 'hidden'
        }}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                {children}
            </motion.div>

            {/* Bottom Navigation */}
            {!isSubPage && (
                <motion.nav
                    className="bottom-nav"
                    initial={{ y: 80 }}
                    animate={{ y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link key={item.href} href={item.href}>
                                <motion.div
                                    className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                                    whileTap={{ scale: 0.85 }}
                                >
                                    <motion.div
                                        animate={isActive ? { y: -2 } : { y: 0 }}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                    >
                                        <item.icon size={22} fill={isActive ? 'var(--accent-purple)' : 'none'} />
                                    </motion.div>
                                    <span>{item.label}</span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-indicator"
                                            style={{
                                                position: 'absolute', bottom: 2, width: 4, height: 4,
                                                borderRadius: '50%', background: 'var(--accent-purple)'
                                            }}
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                </motion.div>
                            </Link>
                        );
                    })}
                </motion.nav>
            )}
        </div>
    );
}
