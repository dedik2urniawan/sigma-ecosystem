"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface GwUser {
    id: string;
    role: string;
    name: string;
    organization: string;
}

interface ApiKey {
    id: string;
    key_prefix: string;
    name: string;
    is_active: boolean;
    daily_limit: number;
    requests_today: number;
    last_reset_date: string;
    created_at: string;
    user_id: string;
}

interface ReqLog {
    id: string;
    key_prefix: string;
    endpoint: string;
    status_code: number;
    response_time_ms: number;
    ip_address: string;
    created_at: string;
}

const ENDPOINTS = [
    { id: "pelayanan-kesehatan", label: "Indikator Pelayanan Kesehatan", path: "/api/rcs/v1/pelayanan-kesehatan", status: "OPEN", color: "emerald" },
    { id: "balita-gizi", label: "Indikator Balita Gizi", path: "/api/rcs/v1/balita-gizi", status: "ON_PROCESS", color: "amber" },
    { id: "balita-kia", label: "Indikator Balita KIA", path: "/api/rcs/v1/balita-kia", status: "ON_DEV", color: "slate" },
    { id: "ibu-hamil", label: "Indikator Ibu Hamil", path: "/api/rcs/v1/ibu-hamil", status: "ON_DEV", color: "slate" },
    { id: "remaja-putri", label: "Indikator Remaja Putri", path: "/api/rcs/v1/remaja-putri", status: "ON_DEV", color: "slate" },
];

const STATUS_BADGE: Record<string, string> = {
    OPEN: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    ON_PROCESS: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    ON_DEV: "bg-slate-500/20 text-slate-400 border-slate-500/40",
};
const STATUS_LABEL: Record<string, string> = {
    OPEN: "OPEN",
    ON_PROCESS: "ON PROCESS",
    ON_DEV: "ON DEVELOPMENT",
};

export default function ApiGatewayPortal() {
    const router = useRouter();
    const [gwUser, setGwUser] = useState<GwUser | null>(null);
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [logs, setLogs] = useState<ReqLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"overview" | "keys" | "logs" | "docs">("overview");
    const [copiedKey, setCopiedKey] = useState(false);

    const DEMO_FULL_KEY = process.env.NEXT_PUBLIC_DEMO_API_KEY || "sigma_live_...[HIDDEN]...";

    const loadData = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/api-gateway/login"); return; }

        const { data: gw } = await supabase.from("api_gateway_users").select("*").eq("id", user.id).single();
        if (!gw) { router.push("/api-gateway/login"); return; }
        setGwUser(gw);

        const { data: k } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
        setKeys(k || []);

        const { data: l } = await supabase.from("api_request_logs").select("*").order("created_at", { ascending: false }).limit(50);
        setLogs(l || []);

        setLoading(false);
    }, [router]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/api-gateway/login");
    };

    const copyKey = async () => {
        await navigator.clipboard.writeText(DEMO_FULL_KEY);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    };

    const toggleKey = async (keyId: string, current: boolean) => {
        await supabase.from("api_keys").update({ is_active: !current }).eq("id", keyId);
        loadData();
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
            <div className="text-center">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Memuat portal...</p>
            </div>
        </div>
    );

    const totalReqToday = keys.reduce((s, k) => s + k.requests_today, 0);
    const activeKeys = keys.filter(k => k.is_active).length;
    const openEndpoints = ENDPOINTS.filter(e => e.status === "OPEN").length;

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-white font-sans">
            {/* BG grid */}
            <div className="fixed inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* Topbar */}
            <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0f1e]/90 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <a href="/api-gateway" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white text-xs font-black">Σ</span>
                            </div>
                            <div>
                                <span className="text-white font-black text-sm">SIGMA</span>
                                <span className="text-indigo-400 text-xs font-bold ml-1">API GATEWAY</span>
                            </div>
                        </a>
                        <span className="text-slate-700">|</span>
                        <span className="text-slate-400 text-xs">Portal</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-white text-xs font-bold">{gwUser?.name}</p>
                            <p className="text-slate-500 text-[10px]">{gwUser?.organization}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${gwUser?.role === 'superadmin' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'}`}>
                            {gwUser?.role?.toUpperCase()}
                        </span>
                        <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 text-xs transition-colors px-2 py-1 rounded border border-white/5 hover:border-red-500/30">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: "Endpoint Aktif", val: openEndpoints, sub: `dari ${ENDPOINTS.length} total`, color: "emerald" },
                        { label: "API Keys", val: activeKeys, sub: `${keys.length} total keys`, color: "indigo" },
                        { label: "Request Hari Ini", val: totalReqToday, sub: "across all keys", color: "purple" },
                        { label: "Status", val: "LIVE", sub: "API Gateway Online", color: "green" },
                    ].map((s, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">{s.label}</p>
                            <p className={`text-3xl font-black ${s.color === 'emerald' ? 'text-emerald-400' : s.color === 'indigo' ? 'text-indigo-400' : s.color === 'purple' ? 'text-purple-400' : 'text-green-400'}`}>{s.val}</p>
                            <p className="text-slate-500 text-xs mt-1">{s.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 w-fit border border-white/10">
                    {[
                        { id: "overview" as const, label: "Overview" },
                        { id: "keys" as const, label: "API Keys" },
                        { id: "logs" as const, label: "Request Logs" },
                        { id: "docs" as const, label: "Dokumentasi" },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h2 className="text-white font-bold mb-5 flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                Endpoint Catalog — SIGMA RCS
                            </h2>
                            <div className="space-y-3">
                                {ENDPOINTS.map(ep => (
                                    <div key={ep.id} className="flex items-center justify-between p-4 bg-white/3 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <span className="text-indigo-400 font-mono text-xs bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">GET</span>
                                            <div>
                                                <p className="text-white text-sm font-semibold">{ep.label}</p>
                                                <p className="text-slate-500 text-xs font-mono mt-0.5">{ep.path}</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${STATUS_BADGE[ep.status]}`}>
                                            {STATUS_LABEL[ep.status]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Start */}
                        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
                            <h3 className="text-white font-bold mb-4">🚀 Quick Start</h3>
                            <div className="bg-black/40 rounded-xl p-4 font-mono text-xs text-emerald-300 space-y-1">
                                <p className="text-slate-500"># Contoh request — Indikator Pelayanan Kesehatan</p>
                                <p className="text-slate-300">curl -X GET \</p>
                                <p className="text-slate-300 pl-4">'{typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/rcs/v1/pelayanan-kesehatan?tahun=2024&limit=10' \</p>
                                <p className="text-slate-300 pl-4">-H <span className="text-yellow-300">'{`X-API-Key: ${DEMO_FULL_KEY}`}'</span></p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Keys Tab */}
                {activeTab === "keys" && (
                    <div className="space-y-4">
                        {keys.map(key => (
                            <div key={key.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-white font-bold">{key.name}</h3>
                                        <p className="text-slate-400 text-xs mt-1 font-mono">
                                            {key.is_active && gwUser?.role !== 'superadmin'
                                                ? DEMO_FULL_KEY
                                                : `${key.key_prefix}••••••••••••••••••••••••`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${key.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-red-500/20 text-red-400 border-red-500/40'}`}>
                                            {key.is_active ? "ACTIVE" : "REVOKED"}
                                        </span>
                                        {gwUser?.role === 'superadmin' && (
                                            <button onClick={() => toggleKey(key.id, key.is_active)}
                                                className={`text-xs px-3 py-1 rounded-lg border transition-all ${key.is_active ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}>
                                                {key.is_active ? "Revoke" : "Activate"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-white/3 rounded-xl p-3">
                                        <p className="text-slate-500 text-[10px] uppercase tracking-wider">Request Hari Ini</p>
                                        <p className="text-white text-lg font-bold mt-1">{key.requests_today}</p>
                                        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min((key.requests_today / key.daily_limit) * 100, 100)}%` }} />
                                        </div>
                                    </div>
                                    <div className="bg-white/3 rounded-xl p-3">
                                        <p className="text-slate-500 text-[10px] uppercase tracking-wider">Daily Limit</p>
                                        <p className="text-white text-lg font-bold mt-1">{key.daily_limit.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-white/3 rounded-xl p-3">
                                        <p className="text-slate-500 text-[10px] uppercase tracking-wider">Dibuat</p>
                                        <p className="text-white text-sm font-bold mt-1">{new Date(key.created_at).toLocaleDateString("id-ID")}</p>
                                    </div>
                                </div>
                                {(gwUser?.role !== 'superadmin') && key.is_active && (
                                    <div className="mt-4 flex items-center gap-2">
                                        <div className="flex-1 bg-black/30 rounded-lg px-3 py-2 font-mono text-sm text-emerald-300 border border-white/5">
                                            {DEMO_FULL_KEY}
                                        </div>
                                        <button onClick={copyKey} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${copiedKey ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}>
                                            {copiedKey ? "✓ Copied" : "Copy"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Logs Tab */}
                {activeTab === "logs" && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-white font-bold">Request Logs (50 terbaru)</h2>
                            <button onClick={loadData} className="text-slate-400 hover:text-white text-xs px-3 py-1 rounded-lg border border-white/10 hover:border-white/20 transition-all">
                                ↻ Refresh
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        {["Waktu", "Endpoint", "Status", "Response (ms)", "IP", "Key"].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-slate-500 uppercase tracking-wider font-bold">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.length === 0 ? (
                                        <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Belum ada log request</td></tr>
                                    ) : logs.map(log => (
                                        <tr key={log.id} className="border-b border-white/3 hover:bg-white/3 transition-colors">
                                            <td className="px-4 py-3 text-slate-400 font-mono whitespace-nowrap">
                                                {new Date(log.created_at).toLocaleString("id-ID")}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 font-mono">{log.endpoint}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded font-bold ${log.status_code === 200 || log.status_code === 206 ? 'bg-emerald-500/20 text-emerald-400' : log.status_code === 401 ? 'bg-red-500/20 text-red-400' : log.status_code === 429 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                                    {log.status_code}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-400">{log.response_time_ms}ms</td>
                                            <td className="px-4 py-3 text-slate-500 font-mono">{log.ip_address}</td>
                                            <td className="px-4 py-3 text-indigo-400 font-mono">{log.key_prefix || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Docs Tab */}
                {activeTab === "docs" && (
                    <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h2 className="text-white font-bold text-lg mb-6">📚 Dokumentasi API</h2>

                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-indigo-400 font-bold uppercase tracking-wider text-xs mb-3">Autentikasi</h3>
                                    <div className="bg-black/30 rounded-xl p-4 font-mono text-xs space-y-1">
                                        <p className="text-slate-400"># Method 1: Header (Rekomendasi)</p>
                                        <p className="text-slate-300">X-API-Key: <span className="text-yellow-300">sigma_live_xxxxxxxx</span></p>
                                        <p className="text-slate-400 mt-3"># Method 2: Query Parameter</p>
                                        <p className="text-slate-300">GET /api/rcs/v1/pelayanan-kesehatan?<span className="text-yellow-300">api_key=sigma_live_xxx</span></p>
                                    </div>
                                </div>

                                {ENDPOINTS.filter(e => e.status !== "ON_DEV").map(ep => (
                                    <div key={ep.id}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="text-indigo-400 font-mono text-xs bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">GET</span>
                                            <span className="text-white font-bold">{ep.label}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[ep.status]}`}>{STATUS_LABEL[ep.status]}</span>
                                        </div>
                                        <div className="bg-black/30 rounded-xl p-4 font-mono text-xs space-y-2">
                                            <p className="text-emerald-300">{ep.path}</p>
                                            <p className="text-slate-400 mt-2">// Query params opsional:</p>
                                            <p className="text-slate-300">?tahun=2024          <span className="text-slate-500">// Filter tahun (integer)</span></p>
                                            <p className="text-slate-300">?bulan=1             <span className="text-slate-500">// Filter bulan 1-12</span></p>
                                            <p className="text-slate-300">?puskesmas=kepanjen  <span className="text-slate-500">// Filter nama puskesmas (partial match)</span></p>
                                            <p className="text-slate-300">?limit=100           <span className="text-slate-500">// Records per page (max 500)</span></p>
                                            <p className="text-slate-300">?page=1              <span className="text-slate-500">// Page number</span></p>
                                        </div>
                                    </div>
                                ))}

                                <div>
                                    <h3 className="text-indigo-400 font-bold uppercase tracking-wider text-xs mb-3">Response Format</h3>
                                    <div className="bg-black/30 rounded-xl p-4 font-mono text-xs">
                                        <p className="text-yellow-300">{"{"}</p>
                                        <p className="text-slate-300 pl-4">"success": <span className="text-emerald-400">true</span>,</p>
                                        <p className="text-slate-300 pl-4">"data": [<span className="text-slate-500">/* array of records */</span>],</p>
                                        <p className="text-slate-300 pl-4">"meta": {"{"}</p>
                                        <p className="text-slate-300 pl-8">"indicator": "Indikator Pelayanan Kesehatan",</p>
                                        <p className="text-slate-300 pl-8">"source": "SIGMA RCS — Dinas Kesehatan Kabupaten Malang",</p>
                                        <p className="text-slate-300 pl-8">"total_records": <span className="text-purple-400">1250</span>,</p>
                                        <p className="text-slate-300 pl-8">"page": <span className="text-purple-400">1</span>,</p>
                                        <p className="text-slate-300 pl-8">"limit": <span className="text-purple-400">100</span></p>
                                        <p className="text-slate-300 pl-4">{"}"}</p>
                                        <p className="text-yellow-300">{"}"}</p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-indigo-400 font-bold uppercase tracking-wider text-xs mb-3">HTTP Status Codes</h3>
                                    <div className="space-y-2">
                                        {[
                                            { code: "200 OK", desc: "Request berhasil — data tersedia lengkap", color: "emerald" },
                                            { code: "206 Partial Content", desc: "Data tersedia parsial (endpoint ON PROCESS)", color: "amber" },
                                            { code: "401 Unauthorized", desc: "API Key tidak valid atau tidak disertakan", color: "red" },
                                            { code: "403 Forbidden", desc: "API Key sudah dinonaktifkan", color: "orange" },
                                            { code: "429 Too Many Requests", desc: "Rate limit harian terlampaui (maks 1000/hari)", color: "yellow" },
                                            { code: "503 Service Unavailable", desc: "Endpoint masih dalam pengembangan (ON DEVELOPMENT)", color: "slate" },
                                        ].map(s => (
                                            <div key={s.code} className="flex items-center gap-3 p-3 rounded-xl bg-white/3">
                                                <span className={`font-mono text-xs font-bold ${s.color === 'emerald' ? 'text-emerald-400' : s.color === 'amber' ? 'text-amber-400' : s.color === 'red' ? 'text-red-400' : s.color === 'orange' ? 'text-orange-400' : s.color === 'yellow' ? 'text-yellow-400' : 'text-slate-400'} min-w-[160px]`}>{s.code}</span>
                                                <span className="text-slate-400 text-xs">{s.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
