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
        if (appUser?.puskesmas_id) {
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
