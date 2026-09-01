"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatbotLoginRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/sso/login?redirect_to=/chatbot/app");
    }, [router]);
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
    );
}
