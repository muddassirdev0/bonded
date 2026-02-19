"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Search, MoreHorizontal, UserPlus, X, UserCheck, MessageCircle, Plus, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Friend {
    id: string;
    friend_id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    bio?: string;
    conversation_id?: string;
    last_message?: { content: string; created_at: string; sender_id: string; };
    unread_count: number;
    status?: string;
}

interface Story {
    id: string;
    user_id: string;
    media_url: string;
    media_type: 'image' | 'video';
    caption?: string;
    created_at: string;
    expires_at: string;
    profile?: { display_name: string; username: string; avatar_url: string; };
}

export default function ChatsPage() {
    const { user, profile } = useAuth();
    const router = useRouter();

    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [addUsername, setAddUsername] = useState('');
    const [addLoading, setAddLoading] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);
    const [showRequests, setShowRequests] = useState(false);

    // Stories
    const [stories, setStories] = useState<Story[]>([]);
    const [myStories, setMyStories] = useState<Story[]>([]);
    const [showStoryCreator, setShowStoryCreator] = useState(false);
    const [storyFile, setStoryFile] = useState<File | null>(null);
    const [storyPreview, setStoryPreview] = useState<string | null>(null);
    const [storyCaption, setStoryCaption] = useState('');
    const [storyUploading, setStoryUploading] = useState(false);
    const [viewingStory, setViewingStory] = useState<Story | null>(null);
    const storyTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Profile view
    const [viewingProfile, setViewingProfile] = useState<Friend | null>(null);

    useEffect(() => {
        if (!user) return;
        fetchData();
        fetchStories();

        // Realtime for friend requests
        const channel = supabase
            .channel('friend_requests_channel')
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'friend_requests',
                filter: `receiver_id=eq.${user.uid}`
            }, async (payload) => {
                if (payload.eventType === 'INSERT') {
                    const { data: senderProfile } = await supabase
                        .from('profiles').select('*').eq('id', payload.new.sender_id).single();
                    if (senderProfile) {
                        setRequests(prev => [{ ...payload.new, profiles: senderProfile }, ...prev]);
                    }
                } else if (payload.eventType === 'UPDATE' && payload.new.status !== 'pending') {
                    setRequests(prev => prev.filter(req => req.id !== payload.new.id));
                } else if (payload.eventType === 'DELETE') {
                    setRequests(prev => prev.filter(req => req.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const fetchData = async () => {
        if (!user) return;
        try {
            const { data: sentReqs } = await supabase
                .from('friend_requests').select('*')
                .eq('sender_id', user.uid).eq('status', 'accepted');
            const { data: receivedReqs } = await supabase
                .from('friend_requests').select('*')
                .eq('receiver_id', user.uid).eq('status', 'accepted');

            const allAccepted = [...(sentReqs || []), ...(receivedReqs || [])];
            const friendIds = allAccepted.map(req =>
                req.sender_id === user.uid ? req.receiver_id : req.sender_id
            );

            if (friendIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles').select('*').in('id', friendIds);

                const { data: myMemberships } = await supabase
                    .from('conversation_members').select('conversation_id').eq('user_id', user.uid);
                const myConvIds = myMemberships?.map(m => m.conversation_id) || [];

                const friendsData: Friend[] = [];

                for (const friendId of friendIds) {
                    const p = profiles?.find(p => p.id === friendId);
                    if (!p) continue;

                    let conversationId: string | undefined;
                    let lastMessage: Friend['last_message'] | undefined;
                    let unreadCount = 0;
                    let status = 'New Chat';

                    if (myConvIds.length > 0) {
                        const { data: sharedMembership } = await supabase
                            .from('conversation_members').select('conversation_id')
                            .eq('user_id', friendId).in('conversation_id', myConvIds)
                            .limit(1).maybeSingle();

                        if (sharedMembership) {
                            conversationId = sharedMembership.conversation_id;

                            const { data: lastMsg } = await supabase
                                .from('messages').select('content, created_at, sender_id')
                                .eq('conversation_id', conversationId)
                                .order('created_at', { ascending: false })
                                .limit(1).maybeSingle();

                            if (lastMsg) {
                                lastMessage = lastMsg;
                                status = lastMsg.sender_id === user.uid ? 'Sent' : 'Received';
                            }

                            // Get my last_read_at for this conversation
                            const { data: myMembership } = await supabase
                                .from('conversation_members').select('last_read_at')
                                .eq('conversation_id', conversationId)
                                .eq('user_id', user.uid).maybeSingle();

                            const lastRead = myMembership?.last_read_at || '1970-01-01T00:00:00Z';

                            // Count unread: messages from friend AFTER my last_read_at
                            const { count } = await supabase
                                .from('messages').select('*', { count: 'exact', head: true })
                                .eq('conversation_id', conversationId)
                                .eq('sender_id', friendId)
                                .gt('created_at', lastRead);

                            unreadCount = count || 0;
                        }
                    }

                    friendsData.push({
                        id: friendId, friend_id: friendId,
                        username: p.username || '', display_name: p.display_name || p.username || 'Unknown',
                        avatar_url: p.avatar_url || '', bio: p.bio || '',
                        conversation_id: conversationId, last_message: lastMessage,
                        unread_count: unreadCount, status
                    });
                }

                friendsData.sort((a, b) => {
                    const tA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
                    const tB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
                    return tB - tA;
                });

                setFriends(friendsData);
            } else {
                setFriends([]);
            }

            // Pending requests
            const { data: rawReqs } = await supabase
                .from('friend_requests').select('*')
                .eq('receiver_id', user.uid).eq('status', 'pending');
            if (rawReqs && rawReqs.length > 0) {
                const senderIds = rawReqs.map(r => r.sender_id);
                const { data: reqProfiles } = await supabase.from('profiles').select('*').in('id', senderIds);
                setRequests(rawReqs.map(req => ({
                    ...req, profiles: reqProfiles?.find(p => p.id === req.sender_id) || null
                })));
            } else {
                setRequests([]);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStories = async () => {
        if (!user) return;
        // Fetch all non-expired stories
        const { data } = await supabase
            .from('stories').select('*')
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (data && data.length > 0) {
            const userIds = [...new Set(data.map(s => s.user_id))];
            const { data: profiles } = await supabase.from('profiles').select('id, display_name, username, avatar_url').in('id', userIds);

            const enriched = data.map(s => ({
                ...s,
                profile: profiles?.find(p => p.id === s.user_id)
            }));

            setMyStories(enriched.filter(s => s.user_id === user.uid));
            setStories(enriched.filter(s => s.user_id !== user.uid));
        }
    };

    // Story upload
    const handleStoryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setStoryFile(file);
        setStoryPreview(URL.createObjectURL(file));
        setShowStoryCreator(true);
    };

    const handlePostStory = async () => {
        if (!storyFile || !user) return;
        setStoryUploading(true);

        try {
            const ext = storyFile.name.split('.').pop() || 'jpg';
            const fileName = `${user.uid}/${Date.now()}.${ext}`;
            const { error: uploadErr } = await supabase.storage.from('stories').upload(fileName, storyFile);
            if (uploadErr) throw uploadErr;

            const { data: { publicUrl } } = supabase.storage.from('stories').getPublicUrl(fileName);

            const mediaType = storyFile.type.startsWith('video') ? 'video' : 'image';
            const { error: insertErr } = await supabase.from('stories').insert({
                user_id: user.uid,
                media_url: publicUrl,
                media_type: mediaType,
                caption: storyCaption.trim() || null
            });
            if (insertErr) throw insertErr;

            setShowStoryCreator(false);
            setStoryFile(null);
            setStoryPreview(null);
            setStoryCaption('');
            fetchStories();
        } catch (e: any) {
            alert('Error posting story: ' + e.message);
        } finally {
            setStoryUploading(false);
        }
    };

    // View story with auto-close
    const openStory = (story: Story) => {
        setViewingStory(story);
        if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
        storyTimerRef.current = setTimeout(() => {
            setViewingStory(null);
        }, story.media_type === 'video' ? 30000 : 5000);
    };

    const closeStory = () => {
        if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
        setViewingStory(null);
    };

    const handleAddFriend = async () => {
        if (!addUsername.trim() || !user) return;
        setAddLoading(true);
        try {
            const { data: foundUser } = await supabase
                .from('profiles').select('*')
                .eq('username', addUsername.trim().toLowerCase())
                .neq('id', user.uid).single();
            if (!foundUser) { alert('User not found'); setAddLoading(false); return; }

            const { data: existing } = await supabase
                .from('friend_requests').select('*')
                .or(`and(sender_id.eq.${user.uid},receiver_id.eq.${foundUser.id}),and(sender_id.eq.${foundUser.id},receiver_id.eq.${user.uid})`)
                .maybeSingle();

            if (existing) {
                if (existing.status === 'accepted') { alert('Already friends!'); setAddLoading(false); return; }
                if (existing.status === 'pending') {
                    alert(existing.sender_id === user.uid ? 'Request already sent' : 'They already sent you a request');
                    setAddLoading(false); return;
                }
                if (existing.status === 'rejected') {
                    await supabase.from('friend_requests').delete().eq('id', existing.id);
                }
            }
            const { error } = await supabase.from('friend_requests').insert({ sender_id: user.uid, receiver_id: foundUser.id });
            if (!error) alert('Friend request sent!');
            else alert('Failed: ' + error.message);
        } catch (e) { console.error(e); }
        finally { setAddLoading(false); setShowAddFriend(false); setAddUsername(''); }
    };

    const handleAcceptRequest = async (reqId: string, senderId: string) => {
        if (!user) return;
        await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', reqId);
        const { data: newConvo } = await supabase.from('conversations').insert({}).select().single();
        if (newConvo) {
            await supabase.from('conversation_members').insert([
                { conversation_id: newConvo.id, user_id: user.uid },
                { conversation_id: newConvo.id, user_id: senderId }
            ]);
        }
        window.location.reload();
    };

    const handleRejectRequest = async (reqId: string) => {
        await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', reqId);
        setRequests(prev => prev.filter(r => r.id !== reqId));
    };

    const handleOpenChat = async (friend: Friend) => {
        if (friend.conversation_id) {
            router.push(`/chats/${friend.conversation_id}`);
        } else {
            const { data: newConvo } = await supabase.from('conversations').insert({}).select().single();
            if (newConvo) {
                await supabase.from('conversation_members').insert([
                    { conversation_id: newConvo.id, user_id: user!.uid },
                    { conversation_id: newConvo.id, user_id: friend.friend_id }
                ]);
                router.push(`/chats/${newConvo.id}`);
            }
        }
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        return `${Math.floor(hours / 24)}d`;
    };

    const getStatusColor = (s: string) => {
        if (s === 'Received') return '#8B5CF6';
        if (s === 'Sent') return '#3B82F6';
        return 'var(--text-muted)';
    };
    const getStatusIcon = (s: string) => {
        if (s === 'Received') return '↙';
        if (s === 'Sent') return '↗';
        return '💬';
    };

    const filteredFriends = friends.filter(f =>
        f.display_name.toLowerCase().includes(search.toLowerCase()) ||
        f.username.toLowerCase().includes(search.toLowerCase())
    );

    // Group stories by user
    const storyUsers = [...new Set(stories.map(s => s.user_id))];

    return (
        <div style={{ paddingBottom: 80 }}>

            {/* Header */}
            <motion.div className="app-header"
                initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}>
                <div className="avatar-wrapper">
                    <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=bonded`}
                        style={{ width: 32, height: 32, borderRadius: '50%' }} />
                </div>
                <h1 className="app-header-title" style={{ marginLeft: 10, flex: 1 }}>Chat</h1>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <motion.button className="btn-icon" onClick={() => setShowRequests(true)}
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            style={{ background: 'rgba(255,255,255,0.05)', color: requests.length > 0 ? '#EF4444' : 'var(--text-muted)', width: 34, height: 34 }}>
                            <UserCheck size={16} />
                        </motion.button>
                        {requests.length > 0 && <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: '#EF4444', border: '2px solid var(--bg-primary)' }} />}
                    </div>
                    <motion.button className="btn-icon" onClick={() => setShowAddFriend(true)}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--accent-purple)', width: 34, height: 34 }}>
                        <UserPlus size={16} />
                    </motion.button>
                </div>
            </motion.div>

            {/* Stories Row */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                style={{ display: 'flex', overflowX: 'auto', padding: '12px 16px', gap: 14, borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: 4 }}
                className="no-scrollbar">

                {/* My Story */}
                <div onClick={() => myStories.length > 0 ? openStory(myStories[0]) : undefined}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0, cursor: 'pointer' }}>
                    <div style={{ position: 'relative' }}>
                        <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=me`}
                            style={{
                                width: 56, height: 56, borderRadius: '50%',
                                border: myStories.length > 0 ? '3px solid #8B5CF6' : '2px solid var(--bg-tertiary)',
                                padding: 1
                            }} />
                        <label htmlFor="story-upload" style={{
                            position: 'absolute', bottom: -2, right: -2,
                            background: 'var(--accent-purple)', borderRadius: '50%',
                            width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid var(--bg-primary)', fontSize: 12, color: 'white', fontWeight: 700, cursor: 'pointer'
                        }}>+</label>
                        <input type="file" id="story-upload" accept="image/*,video/*" style={{ display: 'none' }}
                            onChange={handleStoryFileSelect} />
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>My Story</span>
                </div>

                {/* Friends with stories */}
                {storyUsers.map(uid => {
                    const userStories = stories.filter(s => s.user_id === uid);
                    const first = userStories[0];
                    if (!first?.profile) return null;
                    return (
                        <div key={uid} onClick={() => openStory(first)}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0, cursor: 'pointer' }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%',
                                background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)',
                                padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <img src={first.profile.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${first.profile.username}`}
                                    style={{ width: 50, height: 50, borderRadius: '50%', border: '2px solid var(--bg-primary)' }} />
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)', maxWidth: 56, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {first.profile.display_name.split(' ')[0]}
                            </span>
                        </div>
                    );
                })}

                {/* Friends without stories (show as faded) */}
                {friends.filter(f => !storyUsers.includes(f.friend_id)).slice(0, 4).map(f => (
                    <div key={`no-story-${f.friend_id}`}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0, opacity: 0.5 }}>
                        <img src={f.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${f.username}`}
                            style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--bg-tertiary)', padding: 1 }} />
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 56, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.display_name.split(' ')[0]}
                        </span>
                    </div>
                ))}
            </motion.div>

            {/* Friend Requests Banner */}
            {requests.length > 0 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    style={{ padding: '0 16px 8px' }}>
                    <button onClick={() => setShowRequests(true)} style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)',
                        padding: '10px 14px', borderRadius: 12, color: 'white', fontSize: 13, fontWeight: 600
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
                            <span>Friend Requests</span>
                        </div>
                        <span style={{ background: 'var(--accent-purple)', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>{requests.length}</span>
                    </button>
                </motion.div>
            )}

            {/* Search */}
            <div style={{ padding: '0 16px 8px' }}>
                <div className="search-bar" style={{ margin: 0 }}>
                    <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input placeholder="Search friends..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
            </div>

            {/* Friends List */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <motion.div className="spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
                </div>
            ) : filteredFriends.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                    <MessageCircle size={36} style={{ color: 'var(--text-muted)', marginBottom: 10, opacity: 0.5 }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        {friends.length === 0 ? 'No friends yet' : 'No results'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {friends.length === 0 ? 'Tap + to add friends' : 'Try a different search'}
                    </p>
                </div>
            ) : (
                filteredFriends.map((friend, i) => (
                    <motion.div key={friend.friend_id}
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.3 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleOpenChat(friend)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '11px 16px', cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.03)'
                        }}>

                        {/* Avatar - tap to view profile */}
                        <div style={{ position: 'relative', flexShrink: 0 }}
                            onClick={(e) => { e.stopPropagation(); setViewingProfile(friend); }}>
                            <img src={friend.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${friend.username}`}
                                style={{ width: 46, height: 46, borderRadius: '50%', border: '2px solid rgba(139,92,246,0.3)' }} />
                            <div style={{
                                position: 'absolute', bottom: 0, right: 0,
                                width: 12, height: 12, borderRadius: '50%',
                                background: '#22C55E', border: '2px solid var(--bg-primary)'
                            }} />
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'white', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {friend.display_name}
                            </div>
                            <div style={{ fontSize: 12, color: getStatusColor(friend.status || 'New Chat'), fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>{getStatusIcon(friend.status || 'New Chat')}</span>
                                <span>{friend.status || 'New Chat'}</span>
                                {friend.last_message && (
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {formatTime(friend.last_message.created_at)}</span>
                                )}
                            </div>
                        </div>

                        {/* Unread badge */}
                        {friend.unread_count > 0 && (
                            <div style={{
                                minWidth: 22, height: 22, borderRadius: 11,
                                background: 'var(--accent-purple)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 700, color: 'white',
                                padding: '0 6px'
                            }}>
                                {friend.unread_count > 99 ? '99+' : friend.unread_count}
                            </div>
                        )}
                    </motion.div>
                ))
            )}

            {/* ===== MODALS ===== */}

            {/* Add Friend Modal */}
            <AnimatePresence>
                {showAddFriend && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="glass-card" style={{ width: '100%', maxWidth: 320, padding: 24, position: 'relative' }}>
                            <button onClick={() => setShowAddFriend(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Add Friend</h3>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>Enter username to send a friend request.</p>
                            <div className="search-bar" style={{ marginBottom: 14 }}>
                                <span style={{ color: 'var(--text-muted)', paddingLeft: 4 }}>@</span>
                                <input placeholder="username" value={addUsername} onChange={(e) => setAddUsername(e.target.value)} autoFocus />
                            </div>
                            <motion.button onClick={handleAddFriend} disabled={addLoading || !addUsername.trim()}
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                style={{ width: '100%', padding: '11px', borderRadius: 12, background: 'var(--accent-purple)', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', opacity: addLoading ? 0.7 : 1, fontSize: 14 }}>
                                {addLoading ? 'Sending...' : 'Send Request'}
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Requests Modal */}
            <AnimatePresence>
                {showRequests && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="glass-card" style={{ width: '100%', maxWidth: 360, padding: 24, position: 'relative', maxHeight: '80vh', overflowY: 'auto' }}>
                            <button onClick={() => setShowRequests(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 18 }}>Friend Requests</h3>
                            {requests.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: 13, padding: '20px 0' }}>No pending requests</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {requests.map(req => (
                                        <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: 14 }}>
                                            <img src={req.profiles?.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${req.profiles?.username || 'u'}`} style={{ width: 40, height: 40, borderRadius: '50%' }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: 14 }}>{req.profiles?.display_name || 'Unknown'}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{req.profiles?.username || '?'}</div>
                                                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                                    <button onClick={() => handleAcceptRequest(req.id, req.sender_id)} style={{ background: 'var(--accent-purple)', color: 'white', border: 'none', borderRadius: 8, padding: '5px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', flex: 1 }}>Confirm</button>
                                                    <button onClick={() => handleRejectRequest(req.id)} style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', border: 'none', borderRadius: 8, padding: '5px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', flex: 1 }}>Delete</button>
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

            {/* Profile View Modal */}
            <AnimatePresence>
                {viewingProfile && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setViewingProfile(null)}
                        style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-card" style={{ width: '100%', maxWidth: 300, padding: 0, overflow: 'hidden', textAlign: 'center' }}>
                            {/* Banner */}
                            <div style={{
                                height: 80, background: 'linear-gradient(135deg, #8B5CF6, #7C3AED, #6D28D9)',
                                position: 'relative'
                            }}>
                                <div style={{ position: 'absolute', bottom: -32, left: '50%', transform: 'translateX(-50%)' }}>
                                    <img src={viewingProfile.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${viewingProfile.username}`}
                                        style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid var(--bg-primary)' }} />
                                </div>
                            </div>
                            <div style={{ padding: '40px 20px 24px' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 800 }}>{viewingProfile.display_name}</h3>
                                <p style={{ fontSize: 13, color: 'var(--accent-purple)', fontWeight: 600, marginTop: 2 }}>@{viewingProfile.username}</p>
                                {viewingProfile.bio && (
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10, lineHeight: 1.4 }}>{viewingProfile.bio}</p>
                                )}
                                <motion.button
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={() => { setViewingProfile(null); handleOpenChat(viewingProfile); }}
                                    style={{
                                        marginTop: 16, width: '100%', padding: '10px', borderRadius: 10,
                                        background: 'var(--accent-purple)', color: 'white', fontWeight: 600,
                                        border: 'none', cursor: 'pointer', fontSize: 13
                                    }}>
                                    Send Message
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Story Creator Modal */}
            <AnimatePresence>
                {showStoryCreator && storyPreview && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', alignItems: 'center' }}>
                            <button onClick={() => { setShowStoryCreator(false); setStoryFile(null); setStoryPreview(null); }}
                                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                            <span style={{ fontWeight: 700, fontSize: 16 }}>New Story</span>
                            <div style={{ width: 24 }} />
                        </div>

                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                            {storyFile?.type.startsWith('video') ? (
                                <video src={storyPreview} controls style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 16 }} />
                            ) : (
                                <img src={storyPreview} style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 16, objectFit: 'contain' }} />
                            )}
                        </div>

                        <div style={{ padding: '16px 20px 32px' }}>
                            <input type="text" placeholder="Add a caption..." value={storyCaption}
                                onChange={(e) => setStoryCaption(e.target.value)}
                                style={{
                                    width: '100%', padding: '12px 16px', borderRadius: 12,
                                    background: 'rgba(255,255,255,0.08)', border: 'none',
                                    color: 'white', fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box'
                                }} />
                            <motion.button onClick={handlePostStory} disabled={storyUploading}
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                style={{
                                    width: '100%', padding: '13px', borderRadius: 12,
                                    background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                                    color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer',
                                    fontSize: 14, opacity: storyUploading ? 0.7 : 1
                                }}>
                                {storyUploading ? 'Posting...' : 'Share to Story'}
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Story Viewer */}
            <AnimatePresence>
                {viewingStory && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={closeStory}
                        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.98)', display: 'flex', flexDirection: 'column' }}>
                        {/* Progress bar */}
                        <div style={{ padding: '8px 16px 0' }}>
                            <div style={{ height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                                <motion.div
                                    initial={{ width: '0%' }}
                                    animate={{ width: '100%' }}
                                    transition={{ duration: viewingStory.media_type === 'video' ? 30 : 5, ease: 'linear' }}
                                    style={{ height: '100%', background: 'white', borderRadius: 2 }}
                                />
                            </div>
                        </div>

                        {/* Header */}
                        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img src={viewingStory.profile?.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${viewingStory.user_id}`}
                                style={{ width: 34, height: 34, borderRadius: '50%' }} />
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: 'white' }}>{viewingStory.profile?.display_name || 'You'}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatTime(viewingStory.created_at)}</div>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                            {viewingStory.media_type === 'video' ? (
                                <video src={viewingStory.media_url} autoPlay style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 12 }} />
                            ) : (
                                <img src={viewingStory.media_url} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 12, objectFit: 'contain' }} />
                            )}
                        </div>

                        {viewingStory.caption && (
                            <div style={{ textAlign: 'center', padding: '0 24px 32px', color: 'white', fontSize: 15 }}>
                                {viewingStory.caption}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
