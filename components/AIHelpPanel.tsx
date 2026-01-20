'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles, User, Bot, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { sendChatMessage, ChatMessage } from '@/app/actions/chat-assistant';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

interface AIHelpPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AIHelpPanel({ isOpen, onClose }: AIHelpPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { t } = useLanguage();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages; // Send full history context
            const response = await sendChatMessage(history, userMsg.text);

            if (response.success && response.text) {
                const botMsg: ChatMessage = { role: 'model', text: response.text };
                setMessages(prev => [...prev, botMsg]);
            } else {
                // Error handling
                setMessages(prev => [...prev, { role: 'model', text: t('ai_help.error_message') }]);
            }
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <div className={cn(
                "fixed top-0 right-0 h-full w-[400px] bg-background border-l border-border shadow-2xl z-[70] transition-transform duration-300 ease-in-out flex flex-col",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                {/* Header */}
                <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-secondary/30">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-purple-500/10 rounded-lg">
                            <Sparkles className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">{t('ai_help.title')}</h3>
                            <p className="text-[10px] text-muted-foreground">{t('ai_help.subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                    {messages.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground space-y-4">
                            <div className="inline-block p-4 bg-secondary rounded-full mb-2">
                                <Sparkles className="w-8 h-8 text-purple-400" />
                            </div>
                            <h4 className="font-medium text-sm">{t('ai_help.welcome')}</h4>
                            <p className="text-xs max-w-[250px] mx-auto opacity-70">
                                {t('ai_help.welcome_desc')}
                            </p>
                            <div className="grid grid-cols-1 gap-2 text-xs mt-6">
                                <button onClick={() => setInput(t('ai_help.suggestion_project'))} className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors text-left">
                                    🚀 {t('ai_help.suggestion_project')}
                                </button>
                                <button onClick={() => setInput(t('ai_help.suggestion_roles'))} className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors text-left">
                                    👥 {t('ai_help.suggestion_roles')}
                                </button>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className={cn("flex gap-3 text-sm", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                                msg.role === 'user' ? "bg-primary text-primary-foreground border-primary" : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                            )}>
                                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                            <div className={cn(
                                "px-3 py-2 rounded-2xl max-w-[85%] leading-relaxed shadow-sm",
                                msg.role === 'user'
                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                    : "bg-secondary/50 border border-border rounded-tl-sm text-foreground"
                            )}>
                                {msg.role === 'model' ? (
                                    <ReactMarkdown
                                        className="prose prose-invert prose-xs max-w-none"
                                        components={{
                                            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                                            ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                                            ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                                            li: ({ children }) => <li className="mb-0.5">{children}</li>,
                                            code: ({ children }) => <code className="bg-black/20 px-1 rounded font-mono text-[10px]">{children}</code>
                                        }}
                                    >
                                        {msg.text}
                                    </ReactMarkdown>
                                ) : (
                                    <p>{msg.text}</p>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="bg-secondary/50 border border-border px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{t('ai_help.thinking')}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-border bg-background">
                    <div className="relative">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={t('ai_help.placeholder')}
                            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 resize-none h-[50px] min-h-[50px] max-h-[150px] scrollbar-hide"
                            rows={1}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="text-[10px] text-center text-muted-foreground mt-2 opacity-50">
                        {t('ai_help.disclaimer')}
                    </div>
                </div>
            </div>
        </>
    );
}
