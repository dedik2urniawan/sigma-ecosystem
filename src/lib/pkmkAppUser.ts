import { pkmkSupabase } from "@/lib/pkmkSupabase";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase-server";

export type PkmkAppUser = {
    id: string;
    email: string;
    role: "superadmin" | "admin_puskesmas";
    puskesmas_id: string | null;
    puskesmasName: string | null;
};

export async function getPkmkAppUser(searchParams?: URLSearchParams): Promise<PkmkAppUser> {
    try {
        const hdrs = await headers();
        let roleParam = searchParams?.get("role") || hdrs.get("x-user-role");
        let pkmIdParam = searchParams?.get("puskesmas_id") || hdrs.get("x-user-puskesmas-id");

        // Fallback: lookup from server-side Supabase cookie session if not passed
        if (!roleParam) {
            try {
                const supabaseServer = await createSupabaseServer();
                const { data: { user: authUser } } = await supabaseServer.auth.getUser();
                if (authUser) {
                    const { data: appUser } = await supabaseServer
                        .from("app_users")
                        .select("role, puskesmas_id")
                        .eq("id", authUser.id)
                        .single();

                    if (appUser) {
                        roleParam = appUser.role?.toLowerCase()?.trim();
                        pkmIdParam = appUser.puskesmas_id;
                    } else if (authUser.email === "admin@dinkes.go.id") {
                        roleParam = "superadmin";
                    }
                }
            } catch {
                // Ignore cookie reading error in non-cookie environments
            }
        }

        // 1. If Admin Puskesmas (strictly locked to their assigned Puskesmas)
        if (roleParam === "admin_puskesmas" && pkmIdParam) {
            let pkmName: string | null = null;
            // First check PKMK database
            const { data: pkmkData } = await pkmkSupabase
                .from("ref_puskesmas")
                .select("nama")
                .eq("id", pkmIdParam)
                .single();

            if (pkmkData?.nama) {
                pkmName = pkmkData.nama;
            } else {
                // Fallback check main database
                const { data: mainData } = await supabase
                    .from("ref_puskesmas")
                    .select("nama")
                    .eq("id", pkmIdParam)
                    .single();
                pkmName = mainData?.nama ?? null;
            }

            return {
                id: pkmIdParam,
                email: "admin@puskesmas.go.id",
                role: "admin_puskesmas",
                puskesmas_id: pkmIdParam,
                puskesmasName: pkmName,
            };
        }

        // 2. If Superadmin with optional Puskesmas filter
        const queryPkm = searchParams?.get("puskesmas_id");
        if (queryPkm && queryPkm !== "ALL" && queryPkm !== "all") {
            let pkmName: string | null = null;
            const { data: pkmkData } = await pkmkSupabase
                .from("ref_puskesmas")
                .select("nama")
                .eq("id", queryPkm)
                .single();

            if (pkmkData?.nama) {
                pkmName = pkmkData.nama;
            } else {
                const { data: mainData } = await supabase
                    .from("ref_puskesmas")
                    .select("nama")
                    .eq("id", queryPkm)
                    .single();
                pkmName = mainData?.nama ?? null;
            }

            return {
                id: "superadmin",
                email: "admin@dinkes.go.id",
                role: "superadmin",
                puskesmas_id: queryPkm,
                puskesmasName: pkmName,
            };
        }

        // Default: Superadmin full Kabupaten
        return {
            id: "superadmin",
            email: "admin@dinkes.go.id",
            role: "superadmin",
            puskesmas_id: null,
            puskesmasName: null,
        };
    } catch {
        return {
            id: "superadmin",
            email: "admin@dinkes.go.id",
            role: "superadmin",
            puskesmas_id: null,
            puskesmasName: null,
        };
    }
}
