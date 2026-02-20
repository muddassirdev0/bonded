"use client";

import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CallLog {
    id: string;
    caller_id: string;
    receiver_id: string;
    status: 'missed' | 'completed' | 'rejected';
    duration: number;
    started_at: string;
    ended_at: string | null;
    conversation_id?: string;
    other_profile?: {
        display_name: string;
        username: string;
        avatar_url: string;
    };
}

export default function CallsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [calls, setCalls] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchCalls = async () => {
            const { data } = await supabase
                .from('call_logs')
                .select('*')
                .or(`caller_id.eq.${user.uid},receiver_id.eq.${user.uid}`)
                .order('started_at', { ascending: false })
                .limit(50);

            if (data && data.length > 0) {
                const otherIds = data.map(c => c.caller_id === user.uid ? c.receiver_id : c.caller_id);
                const uniqueIds = [...new Set(otherIds)];

                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, display_name, username, avatar_url')
                    .in('id', uniqueIds);

                // Find conversation IDs for each user pair
                const enriched = await Promise.all(data.map(async (call) => {
                    const otherId = call.caller_id === user.uid ? call.receiver_id : call.caller_id;
                    const profile = profiles?.find(p => p.id === otherId);

                    // Find conversation between these two users
                    const { data: convMembers } = await supabase
                        .from('conversation_members')
                        .select('conversation_id')
                        .eq('user_id', user.uid);

                    let conversationId: string | undefined;
                    if (convMembers) {
                        for (const cm of convMembers) {
                            const { data: otherMember } = await supabase
                                .from('conversation_members')
                                .select('conversation_id')
                                .eq('conversation_id', cm.conversation_id)
                                .eq('user_id', otherId)
                                .maybeSingle();
                            if (otherMember) {
                                conversationId = cm.conversation_id;
                                break;
                            }
                        }
                    }

                    return { ...call, other_profile: profile || undefined, conversation_id: conversationId };
                }));

                setCalls(enriched);
            }
            setLoading(false);
        };

        fetchCalls();
    }, [user]);

    const handleCallBack = (call: CallLog) => {
        if (call.conversation_id) {
            router.push(`/chats/${call.conversation_id}`);
        }
    };

    const getStatusIcon = (call: CallLog) => {
        if (call.status === 'missed') return <PhoneMissed size={14} style={{ color: 'var(--accent-red)' }} />;
        if (call.caller_id === user?.uid) return <PhoneOutgoing size={14} style={{ color: 'var(--accent-green)' }} />;
        return <PhoneIncoming size={14} style={{ color: 'var(--text-secondary)' }} />;
    };

    const getStatusText = (call: CallLog) => {
        if (call.status === 'missed') return 'Missed';
        if (call.status === 'rejected') return 'Declined';
        if (call.caller_id === user?.uid) return 'Outgoing';
        return 'Incoming';
    };

    const getStatusColor = (call: CallLog) => {
        if (call.status === 'missed') return 'var(--accent-red)';
        if (call.status === 'rejected') return 'var(--accent-yellow)';
        return 'var(--text-secondary)';
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const formatDuration = (seconds: number) => {
        if (!seconds) return '';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return ` · ${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{ height: '100vh', overflowY: 'auto', paddingBottom: 100 }}>
            {/* Header */}
            <motion.div
                className="app-header"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <h1 className="app-header-title" style={{ flex: 1 }}>Calls</h1>
            </motion.div>

            {/* Call List */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <motion.div className="spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
                </div>
            ) : calls.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <Phone size={36} style={{ color: 'var(--text-muted)', marginBottom: 10, opacity: 0.5 }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        No recent calls
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Call a friend from their chat
                    </p>
                </div>
            ) : (
                calls.map((call, i) => (
                    <motion.div
                        key={call.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 16px',
                            borderBottom: '1px solid rgba(255,255,255,0.03)'
                        }}
                    >
                        <img
                            src={call.other_profile?.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${call.other_profile?.username || 'user'}`}
                            style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }}
                        />

                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontWeight: 600, fontSize: 14,
                                color: call.status === 'missed' ? 'var(--accent-red)' : 'white'
                            }}>
                                {call.other_profile?.display_name || 'Unknown'}
                            </div>
                            <div style={{ fontSize: 12, color: getStatusColor(call), display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                                {getStatusIcon(call)}
                                <span>{getStatusText(call)}{formatDuration(call.duration)} · {formatTime(call.started_at)}</span>
                            </div>
                        </div>

                        <motion.button
                            className="btn-icon"
                            style={{
                                background: 'rgba(139, 92, 246, 0.08)',
                                color: 'var(--accent-purple)',
                                width: 36, height: 36
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleCallBack(call)}
                        >
                            <Phone size={16} />
                        </motion.button>
                    </motion.div>
                ))
            )}
        </div>
    );
}
