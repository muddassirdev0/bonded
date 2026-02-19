"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/hooks/useAuth';
import { useMessages, Message } from '@/lib/hooks/useMessages';
import { useCall } from '@/lib/hooks/useCall';
import { ArrowLeft, Send, Phone, Video, Image as ImageIcon, Mic, MicOff, X, Eye, Square, PhoneOff, VideoOff, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Link detection regex
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function renderMessageContent(content: string) {
    if (!content) return null;
    const parts = content.split(URL_REGEX);
    return parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: '#60A5FA', textDecoration: 'underline', wordBreak: 'break-all' }}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
}

export default function ChatPage() {
    const { id } = useParams() as { id: string };
    const { user } = useAuth();
    const { messages, loading, sendMessage, markOneTimeViewed, uploadMedia } = useMessages(id);
    const [newMessage, setNewMessage] = useState('');
    const [otherUser, setOtherUser] = useState<any>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Image state
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isOneTime, setIsOneTime] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Voice state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

    // One-time image viewer
    const [viewingImage, setViewingImage] = useState<Message | null>(null);

    // Profile view
    const [showOtherProfile, setShowOtherProfile] = useState(false);

    // Calling state
    const [otherUserId, setOtherUserId] = useState<string>('');
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!user || !id) return;

        const fetchChatDetails = async () => {
            const { data: memberData } = await supabase
                .from('conversation_members')
                .select('user_id')
                .eq('conversation_id', id)
                .neq('user_id', user.uid)
                .maybeSingle();

            if (!memberData) return;
            setOtherUserId(memberData.user_id);

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', memberData.user_id)
                .single();

            if (profile) setOtherUser(profile);
        };

        fetchChatDetails();
    }, [id, user]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedImage) return;

        if (selectedImage) {
            await handleSendImage();
        } else {
            await sendMessage(newMessage.trim());
            setNewMessage('');
        }
    };

    // IMAGE HANDLING
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSendImage = async () => {
        if (!selectedImage) return;
        setUploading(true);

        const url = await uploadMedia(selectedImage, 'images');
        if (url) {
            await sendMessage(
                newMessage.trim() || '📷 Image',
                'image',
                url,
                isOneTime
            );
        }

        setSelectedImage(null);
        setImagePreview(null);
        setIsOneTime(false);
        setNewMessage('');
        setUploading(false);
    };

    const cancelImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        setIsOneTime(false);
    };

    // VOICE HANDLING
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });

                setUploading(true);
                const url = await uploadMedia(audioFile, 'voice');
                if (url) {
                    const duration = recordingTime;
                    await sendMessage(`🎤 Voice (${duration}s)`, 'voice', url);
                }
                setUploading(false);
                setRecordingTime(0);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            alert('Microphone access denied');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            mediaRecorderRef.current = null;
            setIsRecording(false);
            setRecordingTime(0);
            audioChunksRef.current = [];
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
    };

    // ONE-TIME IMAGE VIEWING
    const handleViewOneTime = (msg: Message) => {
        if (msg.is_one_time && !msg.viewed_at && msg.sender_id !== user?.uid) {
            setViewingImage(msg);
            markOneTimeViewed(msg.id);
        }
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="spinner" />
            </div>
        );
    }

    let lastDate = '';

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', position: 'relative' }}>

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

                <div style={{ position: 'relative', cursor: 'pointer' }}
                    onClick={() => setShowOtherProfile(true)}>
                    <img
                        src={otherUser.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${otherUser.username}`}
                        style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--accent-purple)' }}
                    />
                    <div style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 10, height: 10, borderRadius: '50%', background: '#22C55E',
                        border: '2px solid var(--bg-primary)'
                    }} />
                </div>

                <div style={{ flex: 1, marginLeft: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                        {otherUser.display_name || otherUser.username}
                    </div>
                    <div style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>
                        Active now
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 4 }}>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        className="btn-icon" style={{ color: 'var(--accent-purple)' }}
                        onClick={() => (window as any).__startVoiceCall?.()}>
                        <Phone size={18} />
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        className="btn-icon" style={{ color: 'var(--accent-purple)' }}
                        onClick={() => (window as any).__startVideoCall?.()}>
                        <Video size={18} />
                    </motion.button>
                </div>
            </motion.div>

            {/* Messages - Snapchat Style */}
            <div className="page-scroll" style={{ flex: 1, padding: '8px 0', overflowX: 'hidden' }}>
                <AnimatePresence initial={false}>
                    {messages.map((msg) => {
                        const isOwn = msg.sender_id === user?.uid;
                        const msgDate = formatDateSeparator(msg.created_at);
                        let showDate = false;
                        if (msgDate !== lastDate) {
                            showDate = true;
                            lastDate = msgDate;
                        }

                        const senderName = isOwn ? 'Me' : (otherUser.display_name || otherUser.username);
                        const lineColor = isOwn ? '#3B82F6' : '#8B5CF6';
                        const nameColor = isOwn ? '#3B82F6' : '#8B5CF6';

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
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25 }}
                                    style={{ padding: '6px 20px' }}
                                >
                                    {/* Sender Name */}
                                    <div style={{ fontSize: 12, fontWeight: 700, color: nameColor, marginBottom: 3 }}>
                                        {senderName}
                                    </div>

                                    {/* Vertical Line + Content */}
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                                        <div style={{
                                            width: 3, borderRadius: 2, background: lineColor,
                                            flexShrink: 0, minHeight: 16
                                        }} />

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {/* IMAGE message */}
                                            {msg.type === 'image' && msg.media_url && (
                                                <div style={{ marginBottom: 4 }}>
                                                    {msg.is_one_time && !msg.viewed_at && msg.sender_id !== user?.uid ? (
                                                        // One-time: show blurred with tap to view
                                                        <motion.div
                                                            whileTap={{ scale: 0.97 }}
                                                            onClick={() => handleViewOneTime(msg)}
                                                            style={{
                                                                width: 180, height: 180, borderRadius: 12,
                                                                background: 'rgba(139, 92, 246, 0.15)',
                                                                display: 'flex', flexDirection: 'column',
                                                                alignItems: 'center', justifyContent: 'center',
                                                                gap: 8, cursor: 'pointer',
                                                                border: '1px dashed rgba(139, 92, 246, 0.3)'
                                                            }}
                                                        >
                                                            <Eye size={24} style={{ color: 'var(--accent-purple)' }} />
                                                            <span style={{ fontSize: 12, color: 'var(--accent-purple)', fontWeight: 600 }}>
                                                                Tap to view
                                                            </span>
                                                        </motion.div>
                                                    ) : msg.is_one_time && msg.viewed_at ? (
                                                        // One-time: already viewed
                                                        <div style={{
                                                            padding: '8px 12px', borderRadius: 8,
                                                            background: 'rgba(255,255,255,0.03)',
                                                            display: 'flex', alignItems: 'center', gap: 6
                                                        }}>
                                                            <Square size={14} style={{ color: 'var(--text-muted)' }} />
                                                            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                                Opened
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        // Normal image
                                                        <img
                                                            src={msg.media_url}
                                                            style={{
                                                                maxWidth: 220, maxHeight: 220,
                                                                borderRadius: 12, objectFit: 'cover',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => window.open(msg.media_url, '_blank')}
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {/* VOICE message */}
                                            {msg.type === 'voice' && msg.media_url && (
                                                <div style={{
                                                    background: 'rgba(255,255,255,0.04)',
                                                    borderRadius: 10, padding: '8px 12px',
                                                    marginBottom: 4
                                                }}>
                                                    <audio
                                                        controls
                                                        src={msg.media_url}
                                                        style={{ width: '100%', height: 32 }}
                                                    />
                                                </div>
                                            )}

                                            {/* TEXT content (with link detection) */}
                                            {msg.type === 'text' && (
                                                <div style={{
                                                    fontSize: 14, lineHeight: 1.45, color: 'white',
                                                    wordBreak: 'break-word', whiteSpace: 'pre-wrap'
                                                }}>
                                                    {renderMessageContent(msg.content)}
                                                </div>
                                            )}

                                            {/* For image/voice with caption */}
                                            {msg.type !== 'text' && msg.content && !msg.content.startsWith('📷') && !msg.content.startsWith('🎤') && (
                                                <div style={{
                                                    fontSize: 14, lineHeight: 1.45, color: 'white',
                                                    wordBreak: 'break-word', whiteSpace: 'pre-wrap'
                                                }}>
                                                    {renderMessageContent(msg.content)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Time */}
                                    <div style={{
                                        fontSize: 10, color: 'var(--text-muted)',
                                        marginTop: 3, marginLeft: 13, opacity: 0.6
                                    }}>
                                        {formatTime(msg.created_at)}
                                    </div>
                                </motion.div>
                            </div>
                        );
                    })}
                </AnimatePresence>
                <div ref={bottomRef} style={{ height: 8 }} />
            </div>

            {/* Image Preview */}
            <AnimatePresence>
                {imagePreview && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{
                            padding: '10px 16px',
                            background: 'rgba(10,10,15,0.95)',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', gap: 12
                        }}
                    >
                        <div style={{ position: 'relative' }}>
                            <img src={imagePreview} style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />
                            <button onClick={cancelImage} style={{
                                position: 'absolute', top: -6, right: -6,
                                width: 20, height: 20, borderRadius: '50%',
                                background: '#EF4444', border: 'none', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}>
                                <X size={12} />
                            </button>
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                {selectedImage?.name}
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsOneTime(!isOneTime)}
                                style={{
                                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                    border: 'none', cursor: 'pointer',
                                    background: isOneTime ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                    color: isOneTime ? 'var(--accent-purple)' : 'var(--text-muted)'
                                }}
                            >
                                {isOneTime ? '👻 View Once ON' : '👻 View Once'}
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Area */}
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 30 }}
                style={{
                    padding: '10px 12px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
                    background: 'rgba(10, 10, 15, 0.9)', backdropFilter: 'blur(20px)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    position: 'relative', zIndex: 10
                }}
            >
                {isRecording ? (
                    /* Recording UI */
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={cancelRecording}
                            style={{
                                width: 40, height: 40, borderRadius: '50%', border: 'none',
                                background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                        >
                            <X size={18} />
                        </motion.button>

                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }}
                            />
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>
                                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Recording...</span>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={stopRecording}
                            style={{
                                width: 44, height: 44, borderRadius: '50%', border: 'none',
                                background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                            }}
                        >
                            <Send size={16} fill="white" color="white" />
                        </motion.button>
                    </div>
                ) : (
                    /* Normal Input */
                    <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Image picker */}
                        <input type="file" accept="image/*" id="chat-image-input" style={{ display: 'none' }}
                            onChange={handleImageSelect} />
                        {/* Camera capture */}
                        <input type="file" accept="image/*" capture="environment" id="chat-camera-input" style={{ display: 'none' }}
                            onChange={handleImageSelect} />

                        <motion.label
                            htmlFor="chat-camera-input"
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.04)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                        >
                            <Camera size={18} style={{ color: 'var(--text-muted)' }} />
                        </motion.label>

                        <motion.label
                            htmlFor="chat-image-input"
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.04)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                        >
                            <ImageIcon size={18} style={{ color: 'var(--text-muted)' }} />
                        </motion.label>

                        {/* Text input */}
                        <div style={{
                            flex: 1, display: 'flex', alignItems: 'center',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: 24, padding: '0 16px'
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
                        </div>

                        {/* Send or Mic */}
                        {newMessage.trim() || selectedImage ? (
                            <motion.button
                                key="send"
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                type="submit"
                                disabled={uploading}
                                style={{
                                    width: 42, height: 42, borderRadius: '50%', border: 'none',
                                    background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', flexShrink: 0,
                                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                                    opacity: uploading ? 0.6 : 1
                                }}
                            >
                                <Send size={16} fill="white" color="white" />
                            </motion.button>
                        ) : (
                            <motion.button
                                key="mic"
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                type="button"
                                onClick={startRecording}
                                style={{
                                    width: 42, height: 42, borderRadius: '50%', border: 'none',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', flexShrink: 0
                                }}
                            >
                                <Mic size={18} style={{ color: 'var(--text-muted)' }} />
                            </motion.button>
                        )}
                    </form>
                )}
            </motion.div>

            {/* Full-screen One-Time Image Viewer */}
            <AnimatePresence>
                {viewingImage && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setViewingImage(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 200,
                            background: 'rgba(0,0,0,0.95)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <motion.img
                            initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
                            src={viewingImage.media_url}
                            style={{ maxWidth: '90%', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain' }}
                        />
                        <div style={{
                            position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
                            fontSize: 13, color: 'var(--text-muted)', fontWeight: 600
                        }}>
                            Tap anywhere to close · This image will disappear
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Other User Profile Modal */}
            <AnimatePresence>
                {showOtherProfile && otherUser && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setShowOtherProfile(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-card" style={{ width: '100%', maxWidth: 300, padding: 0, overflow: 'hidden', textAlign: 'center' }}>
                            <div style={{ height: 80, background: 'linear-gradient(135deg, #8B5CF6, #7C3AED, #6D28D9)', position: 'relative' }}>
                                <div style={{ position: 'absolute', bottom: -32, left: '50%', transform: 'translateX(-50%)' }}>
                                    <img src={otherUser.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${otherUser.username}`}
                                        style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid var(--bg-primary)' }} />
                                </div>
                            </div>
                            <div style={{ padding: '40px 20px 24px' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 800 }}>{otherUser.display_name || otherUser.username}</h3>
                                <p style={{ fontSize: 13, color: 'var(--accent-purple)', fontWeight: 600, marginTop: 2 }}>@{otherUser.username}</p>
                                {otherUser.bio && (
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10, lineHeight: 1.4 }}>{otherUser.bio}</p>
                                )}
                                <button onClick={() => setShowOtherProfile(false)}
                                    style={{ marginTop: 16, padding: '10px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Call UI Overlay */}
            {otherUserId && user?.uid && (
                <CallOverlay
                    userId={user.uid}
                    remoteUserId={otherUserId}
                    otherUser={otherUser}
                    localVideoRef={localVideoRef}
                    remoteVideoRef={remoteVideoRef}
                />
            )}
        </div>
    );
}

// Call overlay component
function CallOverlay({ userId, remoteUserId, otherUser, localVideoRef, remoteVideoRef }: {
    userId: string;
    remoteUserId: string;
    otherUser: any;
    localVideoRef: React.RefObject<HTMLVideoElement | null>;
    remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
}) {
    const { callState, startCall, answerCall, endCall, toggleMute, toggleCamera, rejectCall, clearError } = useCall(userId, remoteUserId);

    useEffect(() => {
        if (callState.localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = callState.localStream;
        }
    }, [callState.localStream]);

    useEffect(() => {
        if (callState.remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = callState.remoteStream;
        }
    }, [callState.remoteStream]);

    // Expose startCall to parent header buttons
    useEffect(() => {
        (window as any).__startVoiceCall = () => startCall(false);
        (window as any).__startVideoCall = () => startCall(true);
        return () => {
            delete (window as any).__startVoiceCall;
            delete (window as any).__startVideoCall;
        };
    }, [startCall]);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Error toast
    if (callState.error) {
        return (
            <motion.div
                initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
                style={{
                    position: 'fixed', top: 60, left: 16, right: 16, zIndex: 300,
                    background: 'rgba(239, 68, 68, 0.95)', borderRadius: 12,
                    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10,
                    backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'white' }}>{callState.error}</span>
                <button onClick={clearError} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>OK</button>
            </motion.div>
        );
    }

    if (callState.status === 'idle' || callState.status === 'ended') return null;

    return (
        <AnimatePresence>
            {/* Incoming call */}
            {callState.status === 'ringing' && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 300,
                        background: 'linear-gradient(180deg, rgba(10,10,20,0.98) 0%, rgba(20,10,40,0.98) 100%)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <motion.img
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        src={otherUser?.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${otherUser?.username}`}
                        style={{ width: 90, height: 90, borderRadius: '50%', border: '3px solid var(--accent-purple)', marginBottom: 16 }}
                    />
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{otherUser?.display_name}</h2>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 40 }}>
                        Incoming {callState.isVideo ? 'video' : 'voice'} call...
                    </p>

                    <div style={{ display: 'flex', gap: 40 }}>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => rejectCall()}
                            style={{
                                width: 60, height: 60, borderRadius: '50%', border: 'none',
                                background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                        >
                            <PhoneOff size={24} color="white" />
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                const offer = (window as any).__incomingOffer;
                                const isVideo = (window as any).__incomingIsVideo;
                                if (offer) answerCall(offer, isVideo);
                            }}
                            style={{
                                width: 60, height: 60, borderRadius: '50%', border: 'none',
                                background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                        >
                            <Phone size={24} color="white" />
                        </motion.button>
                    </div>
                </motion.div>
            )}

            {/* Active call */}
            {(callState.status === 'calling' || callState.status === 'connected') && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 300,
                        background: 'linear-gradient(180deg, rgba(10,10,20,0.98) 0%, rgba(20,10,40,0.98) 100%)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center'
                    }}
                >
                    {/* Video streams */}
                    {callState.isVideo && callState.remoteStream && (
                        <video ref={remoteVideoRef} autoPlay playsInline
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    {callState.isVideo && callState.localStream && (
                        <video ref={localVideoRef} autoPlay playsInline muted
                            style={{
                                position: 'absolute', top: 60, right: 16,
                                width: 100, height: 140, borderRadius: 12, objectFit: 'cover',
                                border: '2px solid rgba(255,255,255,0.2)', zIndex: 10
                            }} />
                    )}

                    {/* Call info (voice or connecting) */}
                    {(!callState.isVideo || !callState.remoteStream) && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <img
                                src={otherUser?.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${otherUser?.username}`}
                                style={{ width: 90, height: 90, borderRadius: '50%', border: '3px solid var(--accent-purple)', marginBottom: 16 }}
                            />
                            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{otherUser?.display_name}</h2>
                            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                                {callState.status === 'calling' ? 'Calling...' : formatDuration(callState.duration)}
                            </p>
                        </div>
                    )}

                    {/* Controls */}
                    <div style={{
                        position: 'absolute', bottom: 50,
                        display: 'flex', gap: 20, alignItems: 'center',
                        background: 'rgba(0,0,0,0.4)', padding: '16px 24px', borderRadius: 30,
                        backdropFilter: 'blur(10px)'
                    }}>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={toggleMute}
                            style={{
                                width: 50, height: 50, borderRadius: '50%', border: 'none',
                                background: callState.isMuted ? '#EF4444' : 'rgba(255,255,255,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                        >
                            {callState.isMuted ? <MicOff size={20} color="white" /> : <Mic size={20} color="white" />}
                        </motion.button>

                        {callState.isVideo && (
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={toggleCamera}
                                style={{
                                    width: 50, height: 50, borderRadius: '50%', border: 'none',
                                    background: callState.isCameraOff ? '#EF4444' : 'rgba(255,255,255,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                }}
                            >
                                {callState.isCameraOff ? <VideoOff size={20} color="white" /> : <Camera size={20} color="white" />}
                            </motion.button>
                        )}

                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={endCall}
                            style={{
                                width: 56, height: 56, borderRadius: '50%', border: 'none',
                                background: '#EF4444',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                        >
                            <PhoneOff size={22} color="white" />
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
