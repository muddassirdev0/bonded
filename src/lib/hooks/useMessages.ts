import { useState, useEffect } from 'react';
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

        // Subscribe to new messages
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

        // Mark as viewed
        await supabase
            .from('messages')
            .update({ viewed_at: new Date().toISOString() })
            .eq('id', messageId);

        // Delete after 3 seconds
        setTimeout(async () => {
            // Get message to find media_url before deleting
            const msg = messages.find(m => m.id === messageId);
            if (msg?.media_url) {
                // Delete media from storage
                const path = msg.media_url.split('/chat-media/')[1];
                if (path) {
                    await supabase.storage.from('chat-media').remove([path]);
                }
            }

            await supabase
                .from('messages')
                .delete()
                .eq('id', messageId);
        }, 3000);
    };

    const uploadMedia = async (file: File, folder: string = 'images'): Promise<string | null> => {
        const ext = file.name.split('.').pop() || 'bin';
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

    return { messages, loading, sendMessage, markOneTimeViewed, uploadMedia };
}
