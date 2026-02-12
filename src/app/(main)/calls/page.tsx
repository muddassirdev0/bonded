"use client";

import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

const listItem = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
        opacity: 1, x: 0,
        transition: { delay: i * 0.05, duration: 0.3 }
    })
};

export default function CallsPage() {
    const calls: any[] = [];

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'missed': return <PhoneMissed size={14} style={{ color: 'var(--accent-red)' }} />;
            case 'incoming': return <PhoneIncoming size={14} style={{ color: 'var(--text-secondary)' }} />;
            case 'outgoing': return <PhoneOutgoing size={14} style={{ color: 'var(--accent-green)' }} />;
            default: return null;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'missed': return 'var(--accent-red)';
            case 'incoming': return 'var(--text-secondary)';
            case 'outgoing': return 'var(--accent-green)';
            default: return 'var(--text-muted)';
        }
    };

    return (
        <div>
            {/* Header */}
            <motion.div
                className="app-header"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <h1 className="app-header-title" style={{ flex: 1 }}>Calls</h1>
                <motion.button
                    className="btn-icon"
                    style={{ background: 'rgba(236, 72, 153, 0.15)', color: 'var(--accent-pink)' }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <UserPlus size={18} />
                </motion.button>
            </motion.div>

            {/* Call List */}
            <div style={{ paddingBottom: 80 }}>
                {calls.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>
                        <p>No recent calls</p>
                    </div>
                ) : (
                    calls.map((call, i) => (
                        <motion.div
                            key={call.id}
                            className="chat-item"
                            variants={listItem}
                            initial="hidden"
                            animate="visible"
                            custom={i}
                            whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.03)' }}
                        >
                            <div className="avatar-wrapper">
                                <img src={call.avatar} className="avatar avatar-lg avatar-ring avatar-ring-pink" />
                            </div>

                            <div className="chat-item-info">
                                <div className="chat-item-name" style={{ color: call.status === 'missed' ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                                    {call.name}
                                </div>
                                <div className="chat-item-status">
                                    {getStatusIcon(call.status)}
                                    <span style={{ color: getStatusColor(call.status), fontWeight: 500 }}>
                                        {call.status.charAt(0).toUpperCase() + call.status.slice(1)} · {call.time}
                                    </span>
                                </div>
                            </div>

                            <motion.button
                                className="btn-icon"
                                style={{
                                    background: call.type === 'video' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(6, 182, 212, 0.12)',
                                    color: call.type === 'video' ? 'var(--accent-purple)' : 'var(--accent-cyan)'
                                }}
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                {call.type === 'video' ? <Video size={18} /> : <Phone size={18} />}
                            </motion.button>
                        </motion.div>
                    )))}
            </div>

            {/* FAB */}
            <motion.button
                className="fab"
                style={{ background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-purple))' }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 20 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                <Phone size={22} color="white" />
            </motion.button>
        </div>
    );
}
