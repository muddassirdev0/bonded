"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { Search, MoreHorizontal, Camera, UserPlus, X, Check, UserMinus, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatPreview {
    conversation_id: string;
    other_user: {
        id: string;
        username: string;
        display_name: string;
        avatar_url: string;
    };
    last_message?: {
        content: string;
        created_at: string;
        sender_id: string;
        type: string;
    };
}

const listItem = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
        opacity: 1, x: 0,
        transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const }
    })
};

export default function ChatsPage() {
    const { user } = useAuth();
    const [chats, setChats] = useState<ChatPreview[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [addUsername, setAddUsername] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    // Friend Requests State
    const [requests, setRequests] = useState<any[]>([]);
    const [showRequests, setShowRequests] = useState(false);

    useEffect(() => {
        if (!user) return;

        const fetchChats = async () => {
            const { data: memberships } = await supabase
                .from('conversation_members')
                .select('conversation_id')
                .eq('user_id', user.uid);

            if (!memberships?.length) {
                setLoading(false);
                return;
            }

            const convIds = memberships.map(m => m.conversation_id);
            const chatPreviews: ChatPreview[] = [];

            for (const convId of convIds) {
                const { data: otherMember } = await supabase
                    .from('conversation_members')
                    .select('profiles(*)')
                    .eq('conversation_id', convId)
                    .neq('user_id', user.uid)
                    .single();

                const { data: lastMsg } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', convId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (otherMember?.profiles) {
                    chatPreviews.push({
                        conversation_id: convId,
                        other_user: otherMember.profiles as any,
                        last_message: lastMsg || undefined
                    });
                }
            }

            chatPreviews.sort((a, b) => {
                const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
                const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
                return timeB - timeA;
            });

            setChats(chatPreviews);

            // 2. Fetch Pending Requests
            const { data: pendingReqs } = await supabase
                .from('friend_requests')
                .select('*, profiles!sender_id(*)')
                .eq('receiver_id', user.uid)
                .eq('status', 'pending');

            setRequests(pendingReqs || []);
            setLoading(false);
        };

        fetchChats();
    }, [user]);

    const handleAddFriend = async () => {
        if (!addUsername.trim() || !user) return;
        setAddLoading(true);

        try {
            // 1. Find user
            const { data: foundUser } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', addUsername.trim().toLowerCase())
                .neq('id', user.uid)
                .single();

            if (!foundUser) {
                alert('User not found');
                setAddLoading(false);
                return;
            }

            // 2. Check existance
            const { data: existingReq } = await supabase
                .from('friend_requests')
                .select('*')
                .or(`sender_id.eq.${user.uid},receiver_id.eq.${user.uid}`)
                .or(`sender_id.eq.${foundUser.id},receiver_id.eq.${foundUser.id}`)
                .single();

            if (existingReq) {
                // Open chat if accepted, or alert
                if (existingReq.status === 'accepted') {
                    // Check for convo... simplified logic: just insert request if not exists
                }
            }

            // 3. Create Request
            const { error } = await supabase
                .from('friend_requests')
                .insert({ sender_id: user.uid, receiver_id: foundUser.id });

            if (!error) {
                // Also create conversation so it shows in list immediately (as per user request)
                const { data: newConvo } = await supabase
                    .from('conversations')
                    .insert({ type: 'dm' })
                    .select()
                    .single();

                if (newConvo) {
                    await supabase.from('conversation_members').insert([
                        { conversation_id: newConvo.id, user_id: user.uid },
                        { conversation_id: newConvo.id, user_id: foundUser.id }
                    ]);
                    window.location.reload(); // Refresh to show new chat
                }
            } else {
                alert('Request already sent or error');
            }

        } catch (e) {
            console.error(e);
        } finally {
            setAddLoading(false);
            setShowAddFriend(false);
            setAddUsername('');
        }
    };

    const handleAcceptRequest = async (reqId: string, senderId: string) => {
        if (!user) return;

        // 1. Update status
        await supabase
            .from('friend_requests')
            .update({ status: 'accepted' })
            .eq('id', reqId);

        // 2. Create conversation
        const { data: newConvo } = await supabase
            .from('conversations')
            .insert({ type: 'dm' })
            .select()
            .single();

        if (newConvo) {
            await supabase.from('conversation_members').insert([
                { conversation_id: newConvo.id, user_id: user.uid },
                { conversation_id: newConvo.id, user_id: senderId }
            ]);
            window.location.reload();
        }
    };

    const handleRejectRequest = async (reqId: string) => {
        await supabase
            .from('friend_requests')
            .update({ status: 'rejected' })
            .eq('id', reqId);

        setRequests(prev => prev.filter(r => r.id !== reqId));
    };

    const filteredChats = chats.filter(c =>
        c.other_user.display_name.toLowerCase().includes(search.toLowerCase()) ||
        c.other_user.username.toLowerCase().includes(search.toLowerCase())
    );

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Yesterday';
        return `${days}d`;
    };

    const getStatusInfo = (chat: ChatPreview) => {
        if (!chat.last_message) return { text: 'New Chat', color: 'var(--text-muted)', icon: null };
        const isMine = chat.last_message.sender_id === user?.uid;
        if (isMine) {
            return { text: `Sent · ${formatTime(chat.last_message.created_at)}`, color: 'var(--accent-blue)', icon: '↑' };
        }
        return { text: `Received · ${formatTime(chat.last_message.created_at)}`, color: 'var(--accent-purple)', icon: '↓' };
    };

    return (
        <div style={{ paddingBottom: 80 }}>
            {/* Header */}
            <motion.div
                className="app-header"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <div className="avatar-wrapper">
                    <img src={user?.photoURL || `https://api.dicebear.com/7.x/micah/svg?seed=bonded`} className="avatar avatar-sm" style={{ borderRadius: '50%' }} />
                </div>
                <h1 className="app-header-title" style={{ marginLeft: 12, flex: 1 }}>Chat</h1>

                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                        <motion.button
                            className="btn-icon"
                            onClick={() => setShowRequests(true)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            style={{ background: 'rgba(255, 255, 255, 0.05)', color: requests.length > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}
                        >
                            <UserCheck size={20} />
                        </motion.button>
                        {requests.length > 0 && (
                            <div style={{
                                position: 'absolute', top: -2, right: -2,
                                width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-red)',
                                border: '2px solid var(--bg-primary)'
                            }} />
                        )}
                    </div>

                    <motion.button
                        className="btn-icon"
                        onClick={() => setShowAddFriend(true)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--accent-purple)' }}
                    >
                        <UserPlus size={20} />
                    </motion.button>
                    <button className="btn-icon" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </motion.div>

            {/* Stories Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                    display: 'flex',
                    overflowX: 'auto',
                    padding: '16px 20px',
                    gap: 16,
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    marginBottom: 10
                }}
                className="no-scrollbar"
            >
                {/* My Story */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <div style={{ position: 'relative' }}>
                        <img
                            src={user?.photoURL || `https://api.dicebear.com/7.x/micah/svg?seed=me`}
                            style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--bg-primary)', padding: 2 }}
                        />
                        <div style={{
                            position: 'absolute', bottom: 0, right: 0,
                            background: 'var(--accent-purple)', borderRadius: '50%',
                            width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid var(--bg-primary)'
                        }}>
                            <span style={{ color: 'white', fontSize: 16, lineHeight: 1, marginTop: -2 }}>+</span>
                        </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>My Story</span>
                </div>

                {[1, 2, 3].map((_, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, opacity: 0.5 }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.05)',
                            border: '2px solid var(--bg-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--bg-secondary)' }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>User {i + 1}</span>
                    </div>
                ))}
            </motion.div>

            {/* Friend Requests Row */}
            {requests.length > 0 && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    style={{ padding: '0 20px 16px' }}
                >
                    <button
                        onClick={() => setShowRequests(true)}
                        style={{
                            width: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)',
                            padding: '12px 16px', borderRadius: 12,
                            color: 'white', fontSize: 14, fontWeight: 600
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-red)' }} />
                            <span>Friend Requests</span>
                        </div>
                        <span style={{ background: 'var(--accent-purple)', padding: '2px 8px', borderRadius: 10, fontSize: 12 }}>
                            {requests.length}
                        </span>
                    </button>
                </motion.div>
            )}

            {/* Search */}
            <div style={{ padding: '0 20px 16px' }}>
                <div className="search-bar" style={{ margin: 0 }}>
                    <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input
                        placeholder="Search chats..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Chat List */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <motion.div className="spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
                </div>
            ) : filteredChats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 24px', opacity: 0.6 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No active chats</p>
                </div>
            ) : (
                <div>
                    <AnimatePresence>
                        {filteredChats.map((chat, i) => {
                            const status = getStatusInfo(chat);
                            return (
                                <Link key={chat.conversation_id} href={`/chats/${chat.conversation_id}`}>
                                    <motion.div
                                        className="chat-item"
                                        variants={listItem}
                                        initial="hidden"
                                        animate="visible"
                                        custom={i}
                                        whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.03)' }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="avatar-wrapper">
                                            <img
                                                src={chat.other_user.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${chat.other_user.username}`}
                                                className="avatar avatar-lg avatar-ring avatar-ring-purple"
                                            />
                                            <div className="avatar-online" />
                                        </div>

                                        <div className="chat-item-info">
                                            <div className="chat-item-name">
                                                {chat.other_user.display_name}
                                            </div>
                                            <div className="chat-item-status">
                                                {status.icon && <span style={{ marginRight: 4 }}>{status.icon}</span>}
                                                <span style={{ color: status.color, fontWeight: 500 }}>
                                                    {status.text}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="chat-item-action">
                                            <motion.button
                                                className="btn-icon"
                                                style={{ width: 36, height: 36, background: 'rgba(255, 255, 255, 0.04)' }}
                                                whileHover={{ scale: 1.15 }}
                                            >
                                                <Camera size={16} style={{ color: 'var(--text-muted)' }} />
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                </Link>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Add Friend Modal */}
            <AnimatePresence>
                {showAddFriend && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 100,
                            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="glass-card"
                            style={{ width: '100%', maxWidth: 320, padding: 24, position: 'relative' }}
                        >
                            <button
                                onClick={() => setShowAddFriend(false)}
                                style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'var(--text-muted)' }}
                            >
                                <X size={20} />
                            </button>

                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Add Friend</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                                Enter username to send a request and start chatting.
                            </p>

                            <div className="search-bar" style={{ marginBottom: 16 }}>
                                <span style={{ color: 'var(--text-muted)', paddingLeft: 4 }}>@</span>
                                <input
                                    placeholder="username"
                                    value={addUsername}
                                    onChange={(e) => setAddUsername(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <motion.button
                                onClick={handleAddFriend}
                                disabled={addLoading || !addUsername.trim()}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: 12,
                                    background: 'var(--accent-purple)', color: 'white', fontWeight: 600,
                                    border: 'none', cursor: 'pointer',
                                    opacity: addLoading ? 0.7 : 1
                                }}
                            >
                                {addLoading ? 'Sending...' : 'Send Request'}
                            </motion.button>
                        </motion.div>
                    </motion.div>
                    // ... (keeping existing AnimatePresence for Add Friend)
                )}
            </AnimatePresence>

            {/* Requests Modal */}
            <AnimatePresence>
                {showRequests && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 100,
                            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="glass-card"
                            style={{ width: '100%', maxWidth: 360, padding: 24, position: 'relative', maxHeight: '80vh', overflowY: 'auto' }}
                        >
                            <button
                                onClick={() => setShowRequests(false)}
                                style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'var(--text-muted)' }}
                            >
                                <X size={20} />
                            </button>

                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Friend Requests</h3>

                            {requests.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: 14, padding: '20px 0' }}>
                                    No pending requests
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {requests.map(req => (
                                        <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 16 }}>
                                            <img
                                                src={req.profiles.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${req.profiles.username}`}
                                                className="avatar avatar-md"
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600 }}>{req.profiles.display_name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{req.profiles.username}</div>

                                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                    <button
                                                        onClick={() => handleAcceptRequest(req.id, req.sender_id)}
                                                        style={{
                                                            background: 'var(--accent-purple)', color: 'white',
                                                            border: 'none', borderRadius: 8, padding: '6px 16px',
                                                            fontSize: 12, fontWeight: 600, cursor: 'pointer', flex: 1
                                                        }}
                                                    >
                                                        Confirm
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectRequest(req.id)}
                                                        style={{
                                                            background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)',
                                                            border: 'none', borderRadius: 8, padding: '6px 16px',
                                                            fontSize: 12, fontWeight: 600, cursor: 'pointer', flex: 1
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
