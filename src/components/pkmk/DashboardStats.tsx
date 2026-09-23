"use client";

import { useState, useEffect } from "react";
import { Users, ClipboardList, Activity, TrendingUp } from "lucide-react";
import { getAuthHeaders } from "@/lib/clientSession";
import { useAuth } from "@/app/dashboard/layout";

type StatsData = {
    balitaCount: number;
    kohortCount: number;
    monitoringCount: number;
    role: string | null;
    puskesmasName: string | null;
    puskesmas_id: string | null;
};

export default function DashboardStats() {
    const { user } = useAuth();
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const headers = await getAuthHeaders();
                const qParams = new URLSearchParams();
                if (user?.role) qParams.set("role", user.role);
                if (user?.puskesmas_id) qParams.set("puskesmas_id", user.puskesmas_id);

                const response = await fetch(`/api/pkmk/dashboard/stats?${qParams.toString()}`, {
                    headers,
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user?.role, user?.puskesmas_id]);

    if (loading) {
        return (
            <div className="stats-grid">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="stat-card" style={{ minHeight: 160 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%'
                        }}>
                            <div style={{
                                width: 24,
                                height: 24,
                                border: '3px solid #e5e7eb',
                                borderTopColor: '#10b981',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                        </div>
                    </div>
                ))}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const effectiveRole = user?.role === 'admin_puskesmas' ? 'admin_puskesmas' : (stats?.role || 'superadmin');
    const isAdmin = effectiveRole === 'admin_puskesmas';
    const balitaCount = stats?.balitaCount ?? 0;
    const kohortCount = stats?.kohortCount ?? 0;
    const monitoringCount = stats?.monitoringCount ?? 0;
    const pkmDisplayName = stats?.puskesmasName || (user?.puskesmas_id && !user.puskesmas_id.includes("-") ? user.puskesmas_id : "");

    return (
        <div className="stats-grid">
            {/* Total Balita Card */}
            <div className="stat-card blue-accent">
                <div className="stat-card-decoration" />
                <div className="stat-header">
                    <div className="stat-icon blue">
                        <Users size={22} />
                    </div>
                    <span className="stat-badge blue">
                        <TrendingUp size={10} />
                        {isAdmin ? 'Wilayah PKM' : '+12%'}
                    </span>
                </div>
                <div className="stat-label">TOTAL BALITA</div>
                <div className="stat-value">{balitaCount}</div>
                <div className="stat-hint">
                    {isAdmin ? `Terdaftar di Puskesmas ${pkmDisplayName}` : 'Terdaftar dalam program PKMK'}
                </div>
            </div>

            {/* Kohort Aktif Card */}
            <div className="stat-card teal-accent">
                <div className="stat-card-decoration" />
                <div className="stat-header">
                    <div className="stat-icon teal">
                        <ClipboardList size={22} />
                    </div>
                    <span className="stat-badge teal">Aktif</span>
                </div>
                <div className="stat-label">KOHORT AKTIF</div>
                <div className="stat-value">{kohortCount}</div>
                <div className="stat-hint">
                    {isAdmin ? `Kohort aktif Puskesmas ${pkmDisplayName}` : 'Kohort program saat ini'}
                </div>
            </div>

            {/* Monitoring Card */}
            <div className="stat-card orange-accent">
                <div className="stat-card-decoration" />
                <div className="stat-header">
                    <div className="stat-icon orange">
                        <Activity size={22} />
                    </div>
                    <span className={`stat-badge ${monitoringCount > 0 ? 'green' : 'orange'}`}>
                        {monitoringCount > 0 ? '✓ Active' : '⚠ Low Activity'}
                    </span>
                </div>
                <div className="stat-label">MONITORING (7 HARI)</div>
                <div className="stat-value">{monitoringCount}</div>
                <div className="stat-hint">Pengukuran 7 hari terakhir</div>
            </div>

            {/* Role Card */}
            <div className="stat-card purple-accent">
                <div className="stat-card-decoration" />
                <div className="stat-header">
                    <div className="stat-icon purple">
                        <Users size={22} />
                    </div>
                    <span className="stat-badge green">✓ Verified</span>
                </div>
                <div className="stat-label">ROLE ANDA</div>
                <div className="stat-value" style={{ fontSize: 20 }}>
                    {isAdmin ? 'Admin Puskesmas' : 'Superadmin'}
                </div>
                <div className="stat-hint">
                    {isAdmin
                        ? `Akses Puskesmas ${pkmDisplayName || 'Anda'}`
                        : 'Akses penuh kabupaten'
                    }
                </div>
            </div>
        </div>
    );
}
