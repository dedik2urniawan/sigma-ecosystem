"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/dashboard/layout";
import { getAuthHeaders } from "@/lib/clientSession";

export default function UserInfoBadge({ fallbackText }: { fallbackText?: string }) {
    const { user, loading: authLoading } = useAuth();
    const [pkmName, setPkmName] = useState<string | null>(null);

    const role = user?.role?.toLowerCase()?.trim() || "superadmin";
    const isSuperadmin =
        role === "superadmin" ||
        role === "stakeholder" ||
        role === "admin" ||
        user?.email === "admin@dinkes.go.id";

    const isPkmAdmin = !isSuperadmin && role === "admin_puskesmas";

    useEffect(() => {
        const fetchPkmName = async () => {
            try {
                const headers = await getAuthHeaders();
                const qParams = new URLSearchParams();
                qParams.set("role", "admin_puskesmas");
                if (user?.puskesmas_id) qParams.set("puskesmas_id", user.puskesmas_id);

                const res = await fetch(`/api/pkmk/dashboard/stats?${qParams.toString()}`, {
                    headers,
                    credentials: "include"
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.puskesmasName) setPkmName(data.puskesmasName);
                }
            } catch (err) {
                console.error("Error fetching pkmName in UserInfoBadge:", err);
            }
        };

        if (isPkmAdmin && user?.puskesmas_id) {
            fetchPkmName();
        }
    }, [isPkmAdmin, user?.puskesmas_id]);

    if (authLoading) {
        return <span style={{ opacity: 0.6 }}>{fallbackText || "Loading..."}</span>;
    }

    // 1. Superadmin / Stakeholder (Dinas Kesehatan)
    if (isSuperadmin) {
        return (
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                    style={{
                        background: "linear-gradient(135deg, #14b8a6, #0d9488)",
                        color: "white",
                        padding: "2px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                    }}
                >
                    Superadmin
                </span>
                <span>Akses penuh ke semua data kabupaten</span>
            </span>
        );
    }

    // 2. Admin Puskesmas
    if (isPkmAdmin) {
        const displayPkm = pkmName || (user?.puskesmas_id && !user.puskesmas_id.includes("-") ? user.puskesmas_id : "...");
        return (
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                    style={{
                        background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                        color: "white",
                        padding: "2px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                    }}
                >
                    Admin
                </span>
                <span>Puskesmas {displayPkm}</span>
            </span>
        );
    }

    return <span>{fallbackText || "Ringkasan data pemantauan dan intervensi gizi."}</span>;
}
