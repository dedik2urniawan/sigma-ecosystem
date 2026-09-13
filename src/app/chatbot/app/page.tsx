"use client";

import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
}

const PROMPT_SUGGESTIONS = [
    {
        category: "Tren Stunting",
        icon: "trending_up",
        color: "text-emerald-600 bg-emerald-50 border-emerald-200",
        prompt: "Bagaimana tren prevalensi balita stunting di Kabupaten Malang dari bulan ke bulan?",
    },
    {
        category: "Analisis Puskesmas",
        icon: "apartment",
        color: "text-indigo-600 bg-indigo-50 border-indigo-200",
        prompt: "Tampilkan tabel komparasi puskesmas dengan prevalensi stunting tertinggi vs terendah.",
    },
    {
        category: "Kohort & Redflag",
        icon: "emergency",
        color: "text-rose-600 bg-rose-50 border-rose-200",
        prompt: "Berapa jumlah balita dalam kohort aktif PKMK dan berapa yang memiliki redflag medis?",
    },
    {
        category: "Evaluasi ASI & MPASI",
        icon: "water_drop",
        color: "text-amber-600 bg-amber-50 border-amber-200",
        prompt: "Bagaimana capaian persentase ASI eksklusif dan MPASI baik di wilayah prioritas?",
    },
];

function ChatbotAppContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const threadIdParam = searchParams.get("thread_id");

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [threadId, setThreadId] = useState<string | null>(threadIdParam);
    const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Initial fetch if threadId exists
    const fetchMessages = useCallback(async (tId: string) => {
        setIsLoading(true);

        // 1. Try Cloud Supabase
        try {
            const { data, error } = await supabase
                .from("chat_messages")
                .select("id, role, content, created_at")
                .eq("thread_id", tId)
                .order("created_at", { ascending: true });

            if (!error && data && data.length > 0) {
                setMessages(data as Message[]);
                // Sync to local cache
                localStorage.setItem(`sigma_chat_messages_${tId}`, JSON.stringify(data));
                setIsLoading(false);
                return;
            }
        } catch (e) {
            console.warn("Cloud messages fetch fallback", e);
        }

        // 2. Fallback to LocalStorage
        try {
            const stored = localStorage.getItem(`sigma_chat_messages_${tId}`);
            if (stored) {
                setMessages(JSON.parse(stored));
            } else {
                setMessages([]);
            }
        } catch (e) {
            console.error("Failed to load messages from local storage", e);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (threadIdParam) {
            setThreadId(threadIdParam);
            fetchMessages(threadIdParam);
        } else {
            setMessages([]);
            setThreadId(null);
        }
    }, [threadIdParam, fetchMessages]);

    // Smooth scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
        }
    }, [input]);

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedMsgId(id);
        setTimeout(() => setCopiedMsgId(null), 2000);
    };

    const handleSend = async (e?: React.FormEvent, customText?: string) => {
        e?.preventDefault();
        const textToSend = (customText || input).trim();
        if (!textToSend || isLoading) return;

        setInput("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        let currentThreadId = threadId;

        // 1. Create a new thread if one doesn't exist
        if (!currentThreadId) {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                router.push("/chatbot/login");
                return;
            }

            const newThreadId = crypto.randomUUID();
            const threadTitle = textToSend.length > 40 ? textToSend.slice(0, 40) + "..." : textToSend;
            const newThread = {
                id: newThreadId,
                user_id: userData.user.id,
                title: threadTitle,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            // Cloud save thread
            try {
                await supabase.from("chat_threads").insert([newThread]);
            } catch (e) {
                console.warn("Cloud thread insert fallback", e);
            }

            // Local cache save
            try {
                const stored = localStorage.getItem(`sigma_chat_threads_${userData.user.id}`);
                const threads = stored ? JSON.parse(stored) : [];
                threads.unshift(newThread);
                localStorage.setItem(`sigma_chat_threads_${userData.user.id}`, JSON.stringify(threads));
            } catch (e) {
                console.error("Failed to save thread locally", e);
            }

            currentThreadId = newThreadId;
            setThreadId(currentThreadId);

            window.history.replaceState(null, "", `/chatbot/app?thread_id=${currentThreadId}`);
            window.dispatchEvent(new CustomEvent("sigma_chat_thread_created"));
        }

        // 2. Append User Message
        const tempUserMsg: Message = { id: crypto.randomUUID(), role: "user", content: textToSend };
        const updatedMsgs = [...messages, tempUserMsg];
        setMessages(updatedMsgs);

        // Cloud save user message
        try {
            await supabase.from("chat_messages").insert([{
                id: tempUserMsg.id,
                thread_id: currentThreadId,
                role: tempUserMsg.role,
                content: tempUserMsg.content,
                created_at: new Date().toISOString(),
            }]);
        } catch (e) {
            console.warn("Cloud user msg insert fallback", e);
        }

        // Local cache save
        localStorage.setItem(`sigma_chat_messages_${currentThreadId}`, JSON.stringify(updatedMsgs));

        setIsLoading(true);

        try {
            // 3. Call AI Endpoint
            const response = await fetch("/api/chatbot/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: updatedMsgs,
                    threadId: currentThreadId,
                }),
            });

            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error("Gagal membaca respons dari server.");
            }

            if (!response.ok) {
                const errorAiText = data.content || data.error || "⚠️ Batas kuota AI tercapai atau koneksi sibuk. Silakan coba kembali sesaat lagi.";
                const tempMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: errorAiText };
                setMessages(prev => [...prev, tempMsg]);
                setIsLoading(false);
                return;
            }

            const aiText = data.content || "Maaf, sistem tidak dapat menghasilkan analisis untuk permintaan ini.";

            // 4. Append AI Message
            const tempAiMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: aiText };
            const finalMsgs = [...updatedMsgs, tempAiMsg];
            setMessages(finalMsgs);

            // Cloud save AI message
            try {
                await supabase.from("chat_messages").insert([{
                    id: tempAiMsg.id,
                    thread_id: currentThreadId,
                    role: tempAiMsg.role,
                    content: tempAiMsg.content,
                    created_at: new Date().toISOString(),
                }]);
            } catch (e) {
                console.warn("Cloud AI msg insert fallback", e);
            }

            // Local cache save
            localStorage.setItem(`sigma_chat_messages_${currentThreadId}`, JSON.stringify(finalMsgs));

        } catch (error: any) {
            console.error("Chat send error", error);
            const errMsg: Message = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: "⚠️ Terjadi gangguan jaringan saat menghubungi layanan AI. Silakan coba kembali.",
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        /* Full-width scroll viewport: scrollbar sits cleanly at the edge of the window, not in the middle */
        <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden w-full h-full flex flex-col justify-between custom-scrollbar"
        >
            {/* Centered Content Container */}
            <div className="w-full max-w-3xl sm:max-w-4xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-4 flex-1 flex flex-col">
                {/* ── Empty Welcome State (Gemini/Claude Frontier Style) ── */}
                {messages.length === 0 && !isLoading && (
                    <div className="my-auto py-6 sm:py-10 flex flex-col items-center text-center animate-in fade-in duration-300">
                        {/* Glowing Bot Avatar */}
                        <div className="relative mb-5 sm:mb-6">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-purple-500/25 ring-4 ring-purple-100/60">
                                <span className="material-icons-round text-2xl sm:text-3xl">psychology</span>
                            </div>
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[9px] sm:text-[10px] text-white font-bold" title="Online">
                                ✓
                            </span>
                        </div>

                        {/* Title with Gradient Typography */}
                        <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
                            Halo, Tim Kesehatan{" "}
                            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 bg-clip-text text-transparent">
                                Kabupaten Malang
                            </span>
                        </h2>
                        <p className="text-slate-500 text-xs sm:text-sm max-w-lg mb-6 sm:mb-8 leading-relaxed px-2">
                            Saya adalah <strong>SIGMA Advisor</strong>, asisten analitik gizi dan surveilans berbasis AI. Tanyakan tren balita stunting, kohort antropometri, atau indikator PKMK.
                        </p>

                        {/* Prompt Starter Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full max-w-2xl">
                            {PROMPT_SUGGESTIONS.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSend(undefined, item.prompt)}
                                    className="p-3 sm:p-4 text-left rounded-2xl bg-white border border-slate-200/90 hover:border-purple-300/80 hover:shadow-md hover:shadow-purple-500/5 hover:-translate-y-0.5 transition-all group flex flex-col justify-between"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono border flex items-center gap-1 ${item.color}`}>
                                            <span className="material-icons-round text-xs">{item.icon}</span>
                                            {item.category}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-700 font-medium group-hover:text-purple-700 transition-colors leading-relaxed">
                                        "{item.prompt}"
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Message Conversation Stream ── */}
                {messages.length > 0 && (
                    <div className="space-y-4 sm:space-y-6 pb-6">
                        {messages.map((msg, index) => {
                            const isUser = msg.role === "user";
                            return (
                                <div
                                    key={msg.id || index}
                                    className={`flex gap-2 sm:gap-3.5 ${isUser ? "justify-end" : "justify-start"} group`}
                                >
                                    {/* Assistant Avatar */}
                                    {!isUser && (
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0 mt-1 ring-2 ring-purple-100">
                                            <span className="material-icons-round text-sm sm:text-base">smart_toy</span>
                                        </div>
                                    )}

                                    {/* Message Body Container */}
                                    <div className={`flex flex-col gap-1 sm:gap-1.5 max-w-[90%] sm:max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
                                        {/* Meta Header */}
                                        <div className="flex items-center gap-2 px-1">
                                            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                                                {isUser ? "Anda" : "SIGMA Advisor"}
                                            </span>
                                        </div>

                                        {/* Bubble Content */}
                                        <div
                                            className={
                                                isUser
                                                    ? "px-3.5 py-2.5 sm:px-5 sm:py-3.5 rounded-2xl rounded-tr-xs text-xs sm:text-sm leading-relaxed whitespace-pre-wrap bg-slate-900 text-white shadow-md shadow-slate-900/10 font-medium"
                                                    : "px-4 py-3 sm:px-6 sm:py-5 rounded-2xl rounded-tl-xs text-xs sm:text-sm leading-relaxed bg-white border border-slate-200/90 text-slate-800 shadow-sm prose prose-sm prose-slate max-w-full prose-headings:font-black prose-headings:text-slate-900 prose-a:text-purple-600 prose-strong:text-slate-900 prose-ul:pl-4 prose-li:my-0.5 prose-table:border-collapse prose-th:bg-purple-50/70 prose-th:text-purple-950 prose-th:p-2 sm:prose-th:p-2.5 prose-th:border prose-th:border-purple-100 prose-th:text-[11px] sm:prose-th:text-xs prose-td:p-2 sm:prose-td:p-2.5 prose-td:border prose-td:border-slate-100 prose-td:text-[11px] sm:prose-td:text-xs prose-td:align-middle prose-tr:odd:bg-white prose-tr:even:bg-slate-50/50 prose-tr:hover:bg-purple-50/30"
                                            }
                                        >
                                            {isUser ? (
                                                msg.content
                                            ) : (
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            )}
                                        </div>

                                        {/* Action Bar (Copy Button) */}
                                        <div className="flex items-center gap-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleCopy(msg.id, msg.content)}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                                title="Salin Teks"
                                            >
                                                <span className="material-icons-round text-xs">
                                                    {copiedMsgId === msg.id ? "check" : "content_copy"}
                                                </span>
                                                <span>{copiedMsgId === msg.id ? "Tersalin!" : "Salin"}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* User Avatar */}
                                    {isUser && (
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0 mt-1">
                                            <span className="material-icons-round text-sm sm:text-base">person</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Loading Indicator Bubble */}
                        {isLoading && (
                            <div className="flex gap-2 sm:gap-3.5 justify-start">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0 ring-2 ring-purple-100">
                                    <span className="material-icons-round text-sm sm:text-base">smart_toy</span>
                                </div>
                                <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm flex items-center gap-2.5 sm:gap-3">
                                    <div className="flex gap-1.5 shrink-0">
                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-600 animate-bounce" />
                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: "0.2s" }} />
                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: "0.4s" }} />
                                    </div>
                                    <span className="text-[11px] sm:text-xs text-slate-500 font-medium italic">
                                        Menganalisis data surveilans gizi SIGMA...
                                    </span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* ── Floating Frontier Prompt Bar ── */}
            <div className="sticky bottom-0 w-full p-2.5 sm:p-6 bg-gradient-to-t from-white via-white/95 to-transparent backdrop-blur-xs z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <div className="max-w-3xl sm:max-w-4xl mx-auto">
                    <form
                        onSubmit={handleSend}
                        className="relative flex items-end gap-1.5 sm:gap-2 bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xl shadow-purple-900/5 rounded-2xl sm:rounded-3xl p-1.5 sm:p-3 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500/80 transition-all"
                    >
                        {/* Attachment Button */}
                        <button
                            type="button"
                            className="p-2 sm:p-2.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl sm:rounded-2xl transition-colors shrink-0"
                            title="Lampirkan Dokumen (Segera Datang)"
                        >
                            <span className="material-icons-round text-lg sm:text-xl">attach_file</span>
                        </button>

                        {/* Elastic Textarea */}
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Tanyakan sesuatu pada SIGMA Advisor..."
                            className="w-full max-h-36 sm:max-h-44 bg-transparent text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 resize-none py-2 sm:py-2.5 focus:outline-none custom-scrollbar leading-relaxed"
                            style={{ minHeight: "36px" }}
                            rows={1}
                            disabled={isLoading}
                        />

                        {/* Send Button */}
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 hover:from-purple-500 hover:to-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-purple-600/20 hover:shadow-lg hover:shadow-purple-600/30 shrink-0 group cursor-pointer"
                            aria-label="Kirim Pesan"
                        >
                            <span className="material-icons-round text-lg sm:text-xl group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                                arrow_upward
                            </span>
                        </button>
                    </form>

                    {/* Disclaimer Footer */}
                    <p className="text-center text-[9px] sm:text-[10px] text-slate-400 mt-2 font-medium">
                        SIGMA Advisor dapat membuat kesalahan. Harap verifikasi info teknis layanan kesehatan gizi.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function ChatbotAppPage() {
    return (
        <Suspense fallback={
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-600 rounded-full animate-spin" />
                    <span className="text-xs text-slate-400 font-medium">Memuat antarmuka...</span>
                </div>
            </div>
        }>
            <ChatbotAppContent />
        </Suspense>
    );
}

