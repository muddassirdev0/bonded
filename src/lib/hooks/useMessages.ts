import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    type: 'text' | 'image' | 'voice';
    media_url?: string;
    is_one_time?: boolean;
    viewed_at?: string;
}

export function useMessages(conversationId: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!conversationId) return;

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (data) setMessages(data);
            setLoading(false);
        };

        fetchMessages();

        const channel = supabase
            .channel(`conversation:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    const newMessage = payload.new as Message;
                    setMessages((current) => {
                        if (current.find(m => m.id === newMessage.id)) return current;
                        return [...current, newMessage];
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    setMessages((current) => current.filter(m => m.id !== payload.old.id));
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    setMessages((current) =>
                        current.map(m => m.id === payload.new.id ? { ...m, ...payload.new } as Message : m)
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId]);

    const sendMessage = async (content: string, type: 'text' | 'image' | 'voice' = 'text', mediaUrl?: string, isOneTime: boolean = false) => {
        if (!user) return;

        const insertData: any = {
            conversation_id: conversationId,
            sender_id: user.uid,
            content,
            type
        };

        if (mediaUrl) insertData.media_url = mediaUrl;
        if (isOneTime) insertData.is_one_time = true;

        const { error } = await supabase
            .from('messages')
            .insert(insertData);

        if (error) console.error('Error sending message:', error);
    };

    const markOneTimeViewed = async (messageId: string) => {
        if (!user) return;

        // Just mark as viewed — do NOT delete
        await supabase
            .from('messages')
            .update({ viewed_at: new Date().toISOString() })
            .eq('id', messageId);
    };

    const deleteMessage = async (messageId: string) => {
        if (!user) return;

        const msg = messages.find(m => m.id === messageId);
        if (!msg) return;

        // Only allow delete within 3 hours and only own messages
        const msgTime = new Date(msg.created_at).getTime();
        const now = Date.now();
        const threeHours = 3 * 60 * 60 * 1000;

        if (msg.sender_id !== user.uid) return;
        if (now - msgTime > threeHours) return;

        // Optimistic: remove from UI instantly
        setMessages(prev => prev.filter(m => m.id !== messageId));

        // Delete media from storage if exists
        if (msg.media_url) {
            const path = msg.media_url.split('/chat-media/')[1];
            if (path) {
                await supabase.storage.from('chat-media').remove([path]);
            }
        }

        await supabase.from('messages').delete().eq('id', messageId);
    };

    const canDeleteMessage = (msg: Message) => {
        if (!user || msg.sender_id !== user.uid) return false;
        const msgTime = new Date(msg.created_at).getTime();
        const now = Date.now();
        const threeHours = 3 * 60 * 60 * 1000;
        return (now - msgTime) <= threeHours;
    };

    const uploadMedia = async (file: File, folder: string = 'images'): Promise<string | null> => {
        // Better extension detection for mobile gallery images
        const mimeMap: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'video/mp4': 'mp4' };
        const nameExt = file.name?.includes('.') ? file.name.split('.').pop() : null;
        const ext = nameExt || mimeMap[file.type] || 'bin';
        const fileName = `${folder}/${conversationId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

        const { error } = await supabase.storage
            .from('chat-media')
            .upload(fileName, file);

        if (error) {
            console.error('Upload error:', error);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('chat-media')
            .getPublicUrl(fileName);

        return publicUrl;
    };

    return { messages, loading, sendMessage, markOneTimeViewed, deleteMessage, canDeleteMessage, uploadMedia };
}
