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

const DINKES_PKM_ID = "a3526e02-6f80-46ff-8b8e-1ee892400c0a";

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

        const normalizedRole = roleParam?.toLowerCase()?.trim();
        const isSuperadmin =
            normalizedRole === "superadmin" ||
            normalizedRole === "stakeholder" ||
            normalizedRole === "admin" ||
            !normalizedRole;

        // 1. If Admin Puskesmas (strictly locked to their assigned Puskesmas, ignore DINKES)
        if (!isSuperadmin && normalizedRole === "admin_puskesmas" && pkmIdParam && pkmIdParam !== DINKES_PKM_ID) {
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

            // Ensure not DINKES
            if (!pkmName?.toLowerCase().includes("dinkes")) {
                return {
                    id: pkmIdParam,
                    email: "admin@puskesmas.go.id",
                    role: "admin_puskesmas",
                    puskesmas_id: pkmIdParam,
                    puskesmasName: pkmName,
                };
            }
        }

        // 2. If Superadmin with explicit Puskesmas filter
        const queryPkm = searchParams?.get("puskesmas_id");
        if (queryPkm && queryPkm !== "ALL" && queryPkm !== "all" && queryPkm !== DINKES_PKM_ID) {
            let pkmName: string | null = null;
            const { data: pkmkData } = await pkmkSupabase
                .from("ref_puskesmas")
                .select("nama")
                .eq("id", queryPkm)
                .single();

            if (pkmkData?.nama && !pkmkData.nama.toLowerCase().includes("dinkes")) {
                pkmName = pkmkData.nama;
                return {
                    id: "superadmin",
                    email: "admin@dinkes.go.id",
                    role: "superadmin",
                    puskesmas_id: queryPkm,
                    puskesmasName: pkmName,
                };
            } else {
                const { data: mainData } = await supabase
                    .from("ref_puskesmas")
                    .select("nama")
                    .eq("id", queryPkm)
                    .single();
                if (mainData?.nama && !mainData.nama.toLowerCase().includes("dinkes")) {
                    pkmName = mainData.nama;
                    return {
                        id: "superadmin",
                        email: "admin@dinkes.go.id",
                        role: "superadmin",
                        puskesmas_id: queryPkm,
                        puskesmasName: pkmName,
                    };
                }
            }
        }

        // Default: Superadmin full Kabupaten (no puskesmas filter)
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
