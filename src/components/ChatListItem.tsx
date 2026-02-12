import Link from 'next/link';
import { User } from 'lucide-react';

interface ChatListItemProps {
    conversationId: string;
    otherUser: {
        id: string;
        display_name: string;
        avatar_url?: string;
        username: string;
    };
    lastMessage?: {
        content: string;
        created_at: string;
        isOwn: boolean;
        type: string;
    };
}

export default function ChatListItem({ conversationId, otherUser, lastMessage }: ChatListItemProps) {
    const timeString = lastMessage
        ? new Date(lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

    return (
        <Link href={`/chats/${conversationId}`} className="block">
            <div className="glass-panel p-4 flex items-center space-x-4 mb-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border-transparent hover:border-white/10">
                {/* Avatar */}
                <div className="relative">
                    {otherUser.avatar_url ? (
                        <img
                            src={otherUser.avatar_url}
                            alt={otherUser.display_name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/30"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center text-white">
                            <User size={20} />
                        </div>
                    )}
                    {/* Online Indicator (Placeholder) */}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0f]"></div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                        <h3 className="text-white font-semibold truncate text-lg">{otherUser.display_name}</h3>
                        <span className="text-xs text-gray-500">{timeString}</span>
                    </div>
                    <p className={`text-sm truncate ${lastMessage?.isOwn ? 'text-gray-500' : 'text-gray-300 font-medium'}`}>
                        {lastMessage?.isOwn && <span className="text-purple-400 mr-1">You:</span>}
                        {lastMessage?.type === 'image' ? 'Sent a snap 📸' : lastMessage?.content || 'Start chatting 🔥'}
                    </p>
                </div>
            </div>
        </Link>
    );
}
