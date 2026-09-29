"use client";

import { supabase } from "@/lib/supabase";

let cachedHeaders: { headers: Record<string, string>; expiresAt: number; userId: string } | null = null;

export async function getAuthHeaders(): Promise<Record<string, string>> {
    const now = Date.now();
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const authUser = session?.user;
        if (!authUser) return {};

        if (cachedHeaders && cachedHeaders.expiresAt > now && cachedHeaders.userId === authUser.id) {
            return cachedHeaders.headers;
        }

        const { data: appUser } = await supabase
            .from("app_users")
            .select("role, puskesmas_id")
            .eq("id", authUser.id)
            .single();

        const headers: Record<string, string> = {};
        const role = appUser?.role?.toLowerCase()?.trim() || (authUser.email === "admin@dinkes.go.id" ? "superadmin" : "user");
        headers["x-user-role"] = role;
        // Only attach puskesmas-id if user is an actual admin_puskesmas and not DINKES
        if (role === "admin_puskesmas" && appUser?.puskesmas_id && appUser.puskesmas_id !== "a3526e02-6f80-46ff-8b8e-1ee892400c0a") {
            headers["x-user-puskesmas-id"] = appUser.puskesmas_id;
        }

        cachedHeaders = {
            headers,
            expiresAt: now + 60000,
            userId: authUser.id,
        };
        return headers;
    } catch {
        return {};
    }
}

export function clearClientTokens() {
    cachedHeaders = null;
}

export function persistClientTokens() {}
