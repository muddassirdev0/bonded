"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Phone, Users, User } from 'lucide-react';

export default function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { href: '/chats', icon: MessageSquare, label: 'Chats' },
        { href: '/calls', icon: Phone, label: 'Calls' },
        { href: '/contacts', icon: Users, label: 'Contacts' },
        { href: '/profile', icon: User, label: 'Profile' },
    ];

    return (
        <div className="fixed bottom-0 left-0 w-full p-4 z-50">
            <nav className="glass-panel mx-auto max-w-md rounded-2xl flex justify-around items-center h-16 px-2 shadow-2xl backdrop-blur-xl border-t border-white/10 bg-black/40">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${isActive ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            {isActive && (
                                <span className="absolute -top-1 w-8 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-b-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                            )}

                            <Icon
                                size={24}
                                strokeWidth={isActive ? 2.5 : 2}
                                className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : ''}`}
                            />

                            {/* Optional Label (hidden for cleaner look, or small text) */}
                            {/* <span className="text-[10px] mt-1 font-medium">{item.label}</span> */}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
