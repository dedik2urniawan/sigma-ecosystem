"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function ApiGatewayLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showTimeoutBanner, setShowTimeoutBanner] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get("timeout") === "true") {
            setShowTimeoutBanner(true);
            // Auto-dismiss after 10 seconds
            const t = setTimeout(() => setShowTimeoutBanner(false), 10000);
            return () => clearTimeout(t);
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
            if (authErr) throw authErr;

            // Check if this user is an API Gateway user
            const { data: gwUser, error: gwErr } = await supabase
                .from("api_gateway_users")
                .select("role")
                .single();

            if (gwErr || !gwUser) {
                await supabase.auth.signOut();
                throw new Error("Akun ini tidak memiliki akses ke API Gateway Portal.");
            }

            router.push("/api-gateway/portal");
        } catch (err: any) {
            setError(err.message || "Login gagal.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center px-4 relative overflow-hidden">
            {/* Background grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
            {/* Glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />

            {/* Timeout Banner */}
            {showTimeoutBanner && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5
                    bg-gradient-to-r from-amber-900/80 to-amber-800/60 border border-amber-500/40 rounded-2xl
                    shadow-xl shadow-amber-900/40 backdrop-blur-md max-w-sm w-full mx-4 animate-fade-in">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-amber-300 text-sm font-bold">Sesi Berakhir</p>
                        <p className="text-amber-400/70 text-xs">Anda telah logout otomatis karena tidak ada aktivitas.</p>
                    </div>
                    <button onClick={() => setShowTimeoutBanner(false)}
                        className="text-amber-500/60 hover:text-amber-300 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="relative z-10 w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-xs font-black">Σ</span>
                        </div>
                        <span className="text-white font-black text-lg tracking-tight">SIGMA</span>
                        <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest mt-0.5">API Gateway</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Portal Login</h1>
                    <p className="text-slate-400 text-sm">Masuk ke API Gateway Portal SIGMA Ecosystem</p>
                </div>

                {/* Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="admin@dinkes.go.id"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••••"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                            />
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                                <span className="text-red-400 text-xs mt-0.5">⚠</span>
                                <p className="text-red-400 text-xs">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                        >
                            {loading ? "Memverifikasi..." : "Masuk ke Portal →"}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-white/10 flex justify-center">
                        <a href="https://wa.me/6281216354887" target="_blank" rel="noopener noreferrer"
                            className="group flex flex-row items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 transition-all w-full justify-center">
                            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#25D366] group-hover:scale-110 transition-transform">
                                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.533 1.09 3.555l-.46 1.879 1.954-.482c.981.603 2.115.922 3.284.922h.001c3.18 0 5.767-2.587 5.768-5.766s-2.587-5.768-5.769-5.768v.001A5.76 5.76 0 0 0 12.031 6.173z M12.031 2.052A10.038 10.038 0 0 1 22.062 12.083A10.038 10.038 0 0 1 12.031 22.114a10.032 10.032 0 0 1-5.118-1.396L2.348 21.903l1.196-4.577a10.026 10.026 0 0 1-1.512-5.242A10.037 10.037 0 0 1 12.031 2.053v-.001z M17.062 14.654c-.276-.138-1.631-.806-1.884-.897-.253-.092-.437-.138-.621.138-.184.276-.713.897-.874 1.081-.161.184-.322.207-.598.069-.276-.138-1.164-.429-2.217-1.368-.819-.731-1.371-1.636-1.533-1.912-.161-.276-.017-.425.121-.563.125-.125.276-.322.414-.483.138-.161.184-.276.276-.46.092-.184.046-.345-.023-.483-.069-.138-.621-1.496-.851-2.048-.222-.533-.448-.46-.621-.468l-.529-.008c-.184 0-.483.069-.736.345-.253.276-.966.944-.966 2.3 0 1.357.989 2.668 1.127 2.852.138.184 1.944 2.967 4.715 4.162.66.285 1.176.455 1.579.582.66.21 1.26.18 1.737.109.533-.079 1.631-.667 1.861-1.311.23-.644.23-1.196.161-1.311-.069-.115-.253-.184-.529-.322z" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <p className="text-white font-bold text-[13px] mb-0.5">Butuh Akses API?</p>
                                <p className="text-slate-400 text-[11px] m-0">Hubungi via WhatsApp — <span className="text-[#25D366] font-bold">+6281216354887</span></p>
                            </div>
                        </a>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <a href="/api-gateway" className="text-slate-500 text-xs hover:text-slate-300 transition-colors">
                        ← Kembali ke API Gateway
                    </a>
                </div>
            </div>
        </div>
    );
}
