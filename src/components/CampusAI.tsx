'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, MessageSquare, X, Send, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { chatWithAI, ChatMessage } from '@/lib/ai';

export default function CampusAI() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: "Hi! I'm CampusBuddy 🤖. Need help with voting or attendance?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        // Get context based on page
        let pageContext = `User is on page: ${pathname}`;
        if (pathname === '/vote') pageContext += " (Voting Page: explain election process, candidate info)";
        if (pathname === '/attendance') pageContext += " (Attendance Page: explain geo-location, checking in)";

        try {
            const aiResponseText = await chatWithAI([...messages, userMsg], pageContext);
            const aiMsg: ChatMessage = { role: 'assistant', content: aiResponseText };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Oops! My brain is offline. Try again later." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-24 md:bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="w-[350px] sm:w-[380px] shadow-2xl"
                    >
                        <Card className="border-primary/20 backdrop-blur-xl bg-background/95">
                            <CardHeader className="p-4 border-b border-border/50 bg-primary/5 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-sm font-display uppercase tracking-wider flex items-center gap-2 text-primary">
                                    <Sparkles className="w-4 h-4 text-primary animate-pulse" /> CampusBuddy AI
                                </CardTitle>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-primary/20" onClick={() => setIsOpen(false)}>
                                    <X className="w-3 h-3" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-4 h-[400px] overflow-y-auto space-y-4 custom-scrollbar">
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {msg.role === 'assistant' && (
                                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                                                <Bot className="w-3.5 h-3.5 text-primary" />
                                            </div>
                                        )}
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                : 'bg-secondary text-foreground rounded-tl-none border border-border/50'
                                                }`}
                                        >
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                        {msg.role === 'user' && (
                                            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex gap-2">
                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                            <Bot className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        <div className="bg-secondary rounded-2xl rounded-tl-none px-3 py-2 border border-border/50 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </CardContent>
                            <CardFooter className="p-3 bg-secondary/30 border-t border-border/50">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSend();
                                    }}
                                    className="flex w-full gap-2"
                                >
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Ask a question..."
                                        className="flex-1 bg-background border border-border rounded-full px-4 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
                                    />
                                    <Button type="submit" size="icon" disabled={!input.trim() || loading} className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90">
                                        <Send className="w-3.5 h-3.5" />
                                    </Button>
                                </form>
                            </CardFooter>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors relative"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                    </span>
                )}
            </motion.button>
        </div>
    );
}
