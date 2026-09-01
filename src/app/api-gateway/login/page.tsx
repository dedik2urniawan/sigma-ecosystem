"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ApiGatewayLoginRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/sso/login?redirect_to=/api-gateway/portal");
    }, [router]);
    return (
        <div className="flex items-center justify-center min-h-screen bg-[#0a0f1e]">
            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
    );
}
