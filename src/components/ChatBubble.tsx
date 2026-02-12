interface ChatBubbleProps {
    message: {
        content: string;
        created_at: string;
        sender_id: string;
    };
    isOwn: boolean;
}

export default function ChatBubble({ message, isOwn }: ChatBubbleProps) {
    const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className={`flex w-full mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl relative shadow-md backdrop-blur-sm ${isOwn
                        ? 'bg-gradient-to-tr from-purple-600 to-pink-600 text-white rounded-br-none'
                        : 'bg-white/10 text-gray-100 rounded-bl-none border border-white/5'
                    }`}
            >
                <p className="text-sm md:text-base leading-relaxed break-words">{message.content}</p>
                <span className={`text-[10px] absolute bottom-1 ${isOwn ? 'right-2 text-pink-200' : 'left-2 text-gray-400'}`}>
                    {time}
                </span>
            </div>
        </div>
    );
}
