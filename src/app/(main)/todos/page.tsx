"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Check, Circle, Trash2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface Todo {
    id: string;
    text: string;
    completed: boolean;
    created_at: string;
}

export default function TodoPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [todos, setTodos] = useState<Todo[]>([]);
    const [newTodo, setNewTodo] = useState('');
    const [showInput, setShowInput] = useState(false);
    const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');

    useEffect(() => {
        if (!user) return;
        const fetchTodos = async () => {
            const { data } = await supabase.from('todos').select('*').eq('user_id', user.uid).order('created_at', { ascending: false });
            if (data) setTodos(data);
        };
        fetchTodos();
    }, [user]);

    const addTodo = async () => {
        if (!user || !newTodo.trim()) return;
        const { data } = await supabase.from('todos').insert({ user_id: user.uid, text: newTodo.trim() }).select().single();
        if (data) { setTodos(prev => [data, ...prev]); setNewTodo(''); setShowInput(false); }
    };

    const toggleTodo = async (id: string, completed: boolean) => {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !completed } : t));
        await supabase.from('todos').update({ completed: !completed, updated_at: new Date().toISOString() }).eq('id', id);
    };

    const deleteTodo = async (id: string) => {
        setTodos(prev => prev.filter(t => t.id !== id));
        await supabase.from('todos').delete().eq('id', id);
    };

    const clearCompleted = async () => {
        const completedIds = todos.filter(t => t.completed).map(t => t.id);
        if (!completedIds.length) return;
        setTodos(prev => prev.filter(t => !t.completed));
        for (const id of completedIds) {
            await supabase.from('todos').delete().eq('id', id);
        }
    };

    const filtered = todos.filter(t => {
        if (filter === 'active') return !t.completed;
        if (filter === 'done') return t.completed;
        return true;
    });

    const activeCount = todos.filter(t => !t.completed).length;
    const doneCount = todos.filter(t => t.completed).length;

    return (
        <div style={{ height: '100vh', overflowY: 'auto', paddingBottom: 100 }}>
            {/* Header */}
            <motion.div className="app-header" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginRight: 8 }}>
                    <ArrowLeft size={22} />
                </motion.button>
                <h1 className="app-header-title" style={{ flex: 1 }}>My Todos</h1>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowInput(!showInput)}
                    style={{ background: 'rgba(139,92,246,0.12)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent-purple)' }}>
                    <Plus size={18} />
                </motion.button>
            </motion.div>

            <div style={{ padding: '8px 16px' }}>
                {/* Stats */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <div className="glass-card" style={{ flex: 1, padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-purple)' }}>{activeCount}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Active</div>
                    </div>
                    <div className="glass-card" style={{ flex: 1, padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-green)' }}>{doneCount}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Done</div>
                    </div>
                    <div className="glass-card" style={{ flex: 1, padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>{todos.length}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Total</div>
                    </div>
                </motion.div>

                {/* Add Input */}
                <AnimatePresence>
                    {showInput && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden', marginBottom: 12 }}>
                            <div className="glass-card" style={{ padding: '12px', display: 'flex', gap: 8 }}>
                                <input value={newTodo} onChange={e => setNewTodo(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addTodo()}
                                    placeholder="What needs to be done?"
                                    autoFocus
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: 'white', fontSize: 14, outline: 'none' }}
                                />
                                <motion.button whileTap={{ scale: 0.9 }} onClick={addTodo}
                                    style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', border: 'none', borderRadius: 10, padding: '10px 18px', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                                    Add
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Filter Tabs */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                    style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {(['all', 'active', 'done'] as const).map(f => (
                        <motion.button key={f} whileTap={{ scale: 0.95 }} onClick={() => setFilter(f)}
                            style={{
                                flex: 1, padding: '8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                background: filter === f ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                                color: filter === f ? 'var(--accent-purple)' : 'var(--text-muted)',
                                fontWeight: 600, fontSize: 12, textTransform: 'capitalize'
                            }}>
                            {f}
                        </motion.button>
                    ))}
                </motion.div>

                {/* Todo List */}
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                            <Sparkles size={28} style={{ color: 'var(--text-muted)', marginBottom: 10, opacity: 0.4 }} />
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
                                {filter === 'all' ? 'No todos yet — tap + to add one!' : filter === 'active' ? 'All tasks completed! 🎉' : 'No completed tasks yet'}
                            </p>
                        </div>
                    ) : (
                        filtered.map((todo, i) => (
                            <motion.div key={todo.id}
                                initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '12px 16px',
                                    borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none'
                                }}>
                                <motion.button whileTap={{ scale: 0.7 }} onClick={() => toggleTodo(todo.id, todo.completed)}
                                    style={{
                                        background: todo.completed ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : 'none',
                                        border: todo.completed ? 'none' : '2px solid rgba(255,255,255,0.15)',
                                        borderRadius: '50%', width: 24, height: 24, flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', color: 'white'
                                    }}>
                                    {todo.completed && <Check size={14} strokeWidth={3} />}
                                </motion.button>
                                <span style={{
                                    flex: 1, fontSize: 14, fontWeight: 500, lineHeight: 1.4,
                                    color: todo.completed ? 'var(--text-muted)' : 'white',
                                    textDecoration: todo.completed ? 'line-through' : 'none'
                                }}>{todo.text}</span>
                                <motion.button whileTap={{ scale: 0.7 }} onClick={() => deleteTodo(todo.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, opacity: 0.5 }}>
                                    <Trash2 size={15} />
                                </motion.button>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Clear Completed */}
                {doneCount > 0 && (
                    <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                        whileTap={{ scale: 0.97 }} onClick={clearCompleted}
                        style={{
                            width: '100%', marginTop: 12, padding: '12px', borderRadius: 12,
                            background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.1)',
                            color: 'var(--accent-red)', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                        }}>
                        🗑️ Clear {doneCount} completed task{doneCount > 1 ? 's' : ''}
                    </motion.button>
                )}
            </div>
        </div>
    );
}
