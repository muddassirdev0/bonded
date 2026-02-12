"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/hooks/useAuth';
import { useMessages } from '@/lib/hooks/useMessages';
import { ArrowLeft, Send, Phone, Video, Smile, Image as ImageIcon, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatPage() {
    const { id } = useParams() as { id: string };
    const { user } = useAuth();
    const { messages, loading, sendMessage } = useMessages(id);
    const [newMessage, setNewMessage] = useState('');
    const [otherUser, setOtherUser] = useState<any>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (!user || !id) return;

        const fetchChatDetails = async () => {
            const { data } = await supabase
                .from('conversation_members')
                .select('profiles(*)')
                .eq('conversation_id', id)
                .neq('user_id', user.uid)
                .single();

            if (data?.profiles) setOtherUser(data.profiles);
        };

        fetchChatDetails();
    }, [id, user]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        await sendMessage(newMessage);
        setNewMessage('');
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateSeparator = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'TODAY';
        if (days === 1) return 'YESTERDAY';
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase();
    };

    if (loading || !otherUser) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="spinner"
                />
            </div>
        );
    }

    // Group messages for date separators
    let lastDate = '';

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', position: 'relative' }}>

            {/* Background blobs */}
            <motion.div
                className="blob blob-purple"
                style={{ width: 200, height: 200, top: '20%', right: '-10%', opacity: 0.08 }}
                animate={{ x: [0, 20, -10, 0], y: [0, -20, 10, 0] }}
                transition={{ duration: 10, repeat: Infinity }}
            />
            <motion.div
                className="blob blob-cyan"
                style={{ width: 150, height: 150, bottom: '30%', left: '-5%', opacity: 0.06 }}
                animate={{ x: [0, -15, 15, 0], y: [0, 15, -15, 0] }}
                transition={{ duration: 12, repeat: Infinity, delay: 2 }}
            />

            {/* Header */}
            <motion.div
                className="app-header"
                style={{ position: 'relative', zIndex: 10 }}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                <button onClick={() => router.back()} className="btn-icon" style={{ background: 'transparent' }}>
                    <ArrowLeft size={22} />
                </button>

                <motion.div
                    className="avatar-wrapper"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <img
                        src={otherUser.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${otherUser.username}`}
                        className="avatar avatar-sm avatar-ring avatar-ring-purple"
                    />
                    <div className="avatar-online" style={{ width: 10, height: 10, borderWidth: 2 }} />
                </motion.div>

                <div style={{ flex: 1 }}>
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}
                    >
                        {otherUser.display_name}
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        style={{ fontSize: 11, color: 'var(--accent-green)', fontWeight: 600, letterSpacing: 0.3 }}
                    >
                        Active now
                    </motion.div>
                </div>

                <div style={{ display: 'flex', gap: 4 }}>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="btn-icon" style={{ color: 'var(--accent-purple)' }}>
                        <Phone size={18} />
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="btn-icon" style={{ color: 'var(--accent-purple)' }}>
                        <Video size={18} />
                    </motion.button>
                </div>
            </motion.div>

            {/* Messages */}
            <div className="page-scroll" style={{ flex: 1, padding: '8px 0', overflowX: 'hidden' }}>
                <AnimatePresence initial={false}>
                    {messages.map((msg, i) => {
                        const isOwn = msg.sender_id === user?.uid;
                        const msgDate = formatDateSeparator(msg.created_at);
                        let showDate = false;
                        if (msgDate !== lastDate) {
                            showDate = true;
                            lastDate = msgDate;
                        }

                        return (
                            <div key={msg.id}>
                                {showDate && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{ textAlign: 'center', padding: '16px 0 8px' }}
                                    >
                                        <span style={{
                                            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                                            letterSpacing: 1, padding: '4px 12px', borderRadius: 8,
                                            background: 'rgba(255, 255, 255, 0.03)'
                                        }}>
                                            {msgDate}
                                        </span>
                                    </motion.div>
                                )}

                                <motion.div
                                    className={`message-row ${isOwn ? 'message-row-sent' : 'message-row-received'}`}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                >
                                    {!isOwn && (
                                        <motion.img
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 20 }}
                                            src={otherUser.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${otherUser.username}`}
                                            className="avatar avatar-xs"
                                            style={{ marginRight: 8, alignSelf: 'flex-end', marginBottom: 18 }}
                                        />
                                    )}
                                    <div>
                                        <div className={`message-bubble ${isOwn ? 'message-sent' : 'message-received'}`}>
                                            {msg.content}
                                        </div>
                                        <div className={`message-time ${isOwn ? 'message-time-sent' : 'message-time-received'}`}>
                                            {formatTime(msg.created_at)}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        );
                    })}
                </AnimatePresence>
                <div ref={bottomRef} style={{ height: 8 }} />
            </div>

            {/* Input */}
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 30 }}
                style={{
                    padding: '10px 12px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
                    background: 'rgba(10, 10, 15, 0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    position: 'relative', zIndex: 10
                }}
            >
                <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <motion.button
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        type="button" className="btn-icon" style={{ width: 36, height: 36, background: 'rgba(255, 255, 255, 0.04)' }}
                    >
                        <ImageIcon size={18} style={{ color: 'var(--text-muted)' }} />
                    </motion.button>

                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: 24, padding: '0 4px 0 16px'
                    }}>
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Chat..."
                            style={{
                                flex: 1, background: 'none', border: 'none', outline: 'none',
                                color: 'white', fontSize: 14, padding: '11px 0'
                            }}
                        />
                        <motion.button
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            type="button" style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer' }}
                        >
                            <Smile size={20} style={{ color: 'var(--text-muted)' }} />
                        </motion.button>
                    </div>

                    <AnimatePresence>
                        {newMessage.trim() ? (
                            <motion.button
                                key="send"
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 45 }}
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                type="submit" style={{
                                    width: 40, height: 40, borderRadius: '50%', border: 'none',
                                    background: 'var(--bonded-gradient)', backgroundSize: '200% 200%',
                                    animation: 'gradientShift 4s ease infinite',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                                }}
                            >
                                <Send size={16} fill="white" color="white" />
                            </motion.button>
                        ) : (
                            <motion.button
                                key="mic"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                type="button" className="btn-icon" style={{ width: 40, height: 40, background: 'rgba(255, 255, 255, 0.04)' }}
                            >
                                <Mic size={18} style={{ color: 'var(--text-muted)' }} />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </form>
            </motion.div>
        </div>
    );
}
