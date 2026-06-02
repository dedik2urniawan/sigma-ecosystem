"use server";

import { headers } from "next/headers";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

export async function trackVisitor() {
    try {
        const headersList = await headers();
        
        // Extract IP
        const forwardedFor = headersList.get("x-forwarded-for");
        const realIp = headersList.get("x-real-ip");
        const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "127.0.0.1";

        // Get Geolocation from Vercel headers
        const city = headersList.get("x-vercel-ip-city") || "Unknown City";
        const region = headersList.get("x-vercel-ip-country-region") || "Unknown Region";
        const country = headersList.get("x-vercel-ip-country") || "ID";

        // Hash IP to protect privacy (SHA-256)
        const ipHash = crypto.createHash("sha256").update(ip).digest("hex");

        // Upsert into Supabase (if IP hash exists, update the visited_at time, or ignore)
        const { error } = await supabase.from("calculator_visitors").upsert(
            {
                ip_hash: ipHash,
                city,
                region,
                country,
                visited_at: new Date().toISOString(),
            },
            { onConflict: "ip_hash" }
        );

        if (error) {
            console.error("Error tracking visitor:", error);
        }
        return { success: true };
    } catch (err) {
        console.error("Tracking Exception:", err);
        return { success: false };
    }
}

export async function getVisitorStats() {
    try {
        // Fetch total unique visitors
        const { count, error } = await supabase
            .from("calculator_visitors")
            .select("*", { count: "exact", head: true });

        if (error) throw error;

        // Fetch recent visitors to extract top regions
        const { data: recentVisitors } = await supabase
            .from("calculator_visitors")
            .select("region, city")
            .order("visited_at", { ascending: false })
            .limit(100);

        const regionsSet = new Set<string>();
        if (recentVisitors) {
            recentVisitors.forEach((v) => {
                const region = v.region?.trim();
                const city = v.city?.trim();
                
                if (region && region.length > 3 && region !== "Unknown Region" && region !== "dev1") {
                    regionsSet.add(region);
                } else if (city && city.length > 3 && city !== "Unknown City") {
                    regionsSet.add(city);
                }
            });
        }

        let topRegions = Array.from(regionsSet).slice(0, 3);
        
        // Add a base count of 879 to reflect historical visits before the tracker was implemented
        const BASE_VISITOR_COUNT = 879;
        const realCount = count || 0;
        const displayCount = realCount + BASE_VISITOR_COUNT;
        
        // If we don't have enough valid regions, provide a solid default fallback
        if (topRegions.length === 0) {
            topRegions = ["Jawa Timur", "DKI Jakarta"];
        }

        return {
            totalVisitors: displayCount,
            topRegions: topRegions
        };
    } catch (err) {
        console.error("Stats Exception:", err);
        return { totalVisitors: 0, topRegions: [] };
    }
}
