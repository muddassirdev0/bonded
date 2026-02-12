import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    type: 'text' | 'image';
}

export function useMessages(conversationId: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!conversationId) return;

        // 1. Fetch initial messages
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (data) setMessages(data);
            setLoading(false);
        };

        fetchMessages();

        // 2. Subscribe to new messages
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
                    // Optimistically add message if not already present (duplicate check)
                    setMessages((current) => {
                        if (current.find(m => m.id === newMessage.id)) return current;
                        return [...current, newMessage];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId]);

    const sendMessage = async (content: string, type: 'text' | 'image' = 'text') => {
        if (!user) return;

        const { error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: user.uid,
                content,
                type
            });

        if (error) console.error('Error sending message:', error);
    };

    return { messages, loading, sendMessage };
}
