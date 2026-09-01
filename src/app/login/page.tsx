"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function RedirectContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    useEffect(() => {
        const redirectTo = searchParams.get("redirect_to") || "/dashboard";
        const timeout = searchParams.get("timeout");
        const params = new URLSearchParams();
        params.set("redirect_to", redirectTo);
        if (timeout) params.set("timeout", timeout);
        router.replace(`/sso/login?${params.toString()}`);
    }, [router, searchParams]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
    );
}

export default function LegacyLoginRedirect() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-950"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>}>
            <RedirectContent />
        </Suspense>
    );
}
