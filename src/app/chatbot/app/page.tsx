"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
}

export default function ChatbotAppPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const threadIdParam = searchParams.get("thread_id");

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [threadId, setThreadId] = useState<string | null>(threadIdParam);

    // Initial fetch if threadId exists
    useEffect(() => {
        if (threadIdParam) {
            setThreadId(threadIdParam);
            fetchMessages(threadIdParam);
        } else {
            setMessages([]);
            setThreadId(null);
        }
    }, [threadIdParam]);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async (tId: string) => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from("chatbot_messages")
            .select("*")
            .eq("thread_id", tId)
            .order("created_at", { ascending: true });

        if (!error && data) {
            setMessages(data);
        }
        setIsLoading(false);
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userText = input.trim();
        setInput(""); // clear input

        let currentThreadId = threadId;

        // 1. Create a new thread if it doesn't exist
        if (!currentThreadId) {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return;

            const { data: newThread, error: threadError } = await supabase
                .from("chatbot_threads")
                .insert([{ user_id: userData.user.id, title: userText.slice(0, 40) + "..." }])
                .select()
                .single();

            if (threadError) {
                console.error("Error creating thread:", threadError);
                return;
            }

            currentThreadId = newThread.id;
            setThreadId(currentThreadId);

            // Just push to router to update URL, no need to refetch immediately because we are appending locally
            router.replace(`/chatbot/app?thread_id=\${currentThreadId}`);
        }

        // 2. Append User Message
        const tempUserMsg: Message = { id: crypto.randomUUID(), role: "user", content: userText };
        setMessages((prev) => [...prev, tempUserMsg]);

        // Save User Message to DB
        await supabase.from("chatbot_messages").insert([
            { thread_id: currentThreadId, role: "user", content: userText }
        ]);

        setIsLoading(true);

        try {
            // 3. Call our AI Endpoint
            const response = await fetch("/api/chatbot/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [...messages, tempUserMsg], threadId: currentThreadId })
            });

            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error("Failed to parse AI response JSON");
            }

            if (!response.ok) {
                // Return gracefully without throwing so the console stays clean
                // The backend provides a fallback 'content' describing the error (e.g., quota)
                const errorAiText = data.content || "⚠️ Maaf, batas kuota AI telah tercapai atau server sibuk. Silakan coba lagi 1 menit kemudian.";
                const tempMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: errorAiText };
                setMessages((prev) => [...prev, tempMsg]);
                setIsLoading(false);
                return;
            }

            const aiText = data.content || "Maaf, saya tidak mengerti pertanyaan tersebut.";

            // 4. Append AI Message
            const tempAiMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: aiText };
            setMessages((prev) => [...prev, tempAiMsg]);

            // Save AI Message to DB
            await supabase.from("chatbot_messages").insert([
                { thread_id: currentThreadId, role: "assistant", content: aiText }
            ]);

        } catch (error) {
            console.error(error);
            const errMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "⚠️ Maaf, terjadi kesalahan pada jaringan atau batas kuota." };
            setMessages((prev) => [...prev, errMsg]);
        } finally {
            setIsLoading(false);
            // Re-fetch occasionally or relying on local state is fine to avoid latency
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize textarea
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `\${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    return (
        <div className="flex-1 flex flex-col relative w-full max-w-4xl mx-auto h-[calc(100vh-4rem)] z-10">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar scroll-smooth space-y-6">

                {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in-up">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-50 border border-purple-200 flex items-center justify-center mb-6 shadow-sm relative group">
                            <div className="absolute inset-0 rounded-2xl border-2 border-purple-300 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all"></div>
                            <span className="material-icons-round text-5xl text-purple-500 relative z-10">psychology</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Pusat Bantuan SIGMA</h2>
                        <p className="text-slate-500 text-sm max-w-sm mb-8 leading-relaxed">
                            Saya adalah SIGMA Advisor. Tanyakan mengenai data anak stunting, kohort antropometri, atau indikator PKMK.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
                            {[
                                "Berapa jumlah balita di kohort?",
                                "Tampilkan data balita dengan flag gizi buruk.",
                                "Apa tujuan pemberian PKMK?",
                                "Bagaimana prosedur intervensi stunting?"
                            ].map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInput(suggestion)}
                                    className="p-3 text-xs text-left bg-white border border-slate-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 transition-colors shadow-sm font-medium"
                                >
                                    "{suggestion}"
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <div
                        key={msg.id || index}
                        className={`flex gap-4 max-w-[85%] \${msg.role === 'user' ? 'ml-auto' : ''}`}
                    >
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                <span className="material-icons-round text-white text-[16px]">smart_toy</span>
                            </div>
                        )}

                        <div className={`flex flex-col gap-1 \${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-2 mb-0.5 px-1">
                                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                                    {msg.role === 'user' ? 'Anda' : 'SIGMA Advisor'}
                                </span>
                            </div>
                            <div
                                className={
                                    msg.role === 'user'
                                        ? 'px-5 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap bg-[#1e293b] text-[#ffffff] rounded-tr-sm shadow-md'
                                        : 'px-6 py-4 rounded-2xl text-sm leading-relaxed bg-white border border-[#cbd5e1] text-[#000000] rounded-tl-sm shadow-sm prose prose-sm prose-slate max-w-full prose-headings:font-bold prose-headings:text-slate-800 prose-a:text-purple-600 prose-strong:text-slate-900 prose-ul:pl-4 prose-li:my-0.5'
                                }
                            >
                                {msg.role === 'user' ? (
                                    msg.content
                                ) : (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>

                        {
                            msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden border border-slate-300">
                                    <span className="material-icons-round text-slate-500 text-lg">person</span>
                                </div>
                            )
                        }
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-4 max-w-[85%]">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <span className="material-icons-round text-white text-[16px]">smart_toy</span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-2">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"></div>
                                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                            <span className="text-xs text-slate-400 font-medium italic ml-2">Menganalisis data...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 sm:p-6 bg-white/80 backdrop-blur-md border-t border-slate-100">
                <form onSubmit={handleSend} className="relative max-w-3xl mx-auto flex items-end gap-2 bg-white border border-slate-200 shadow-lg shadow-slate-100 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-400 transition-all">

                    <button type="button" className="p-3 text-slate-400 hover:text-purple-600 transition-colors flex-shrink-0" title="Upload Berkas">
                        <span className="material-icons-round text-xl">attach_file</span>
                    </button>

                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Tanyakan sesuatu pada SIGMA Advisor..."
                        className="w-full max-h-48 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 resize-none py-3 focus:outline-none custom-scrollbar leading-relaxed"
                        style={{ minHeight: "44px" }}
                        rows={1}
                        disabled={isLoading}
                    />

                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="p-3 ml-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-sm flex-shrink-0 group"
                    >
                        <span className="material-icons-round text-xl group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform">send</span>
                    </button>
                </form>
                <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
                    SIGMA Advisor dapat membuat kesalahan. Harap verifikasi info teknis layanan kesehatan gizi.
                </p>
            </div>
        </div >
    );
}
