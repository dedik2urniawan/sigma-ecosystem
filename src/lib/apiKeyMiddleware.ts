/**
 * SIGMA API Gateway — API Key Middleware
 * Validates X-API-Key header, enforces rate limiting, logs requests.
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Use service role for middleware (bypasses RLS for logging)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
);

export interface ApiGatewayContext {
    keyId: string;
    keyPrefix: string;
    userId: string;
    role: string;
    dailyLimit: number;
    requestsToday: number;
}

function hashKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex");
}

export async function validateApiKey(
    req: NextRequest,
    endpoint: string
): Promise<{ ok: boolean; context?: ApiGatewayContext; error?: NextResponse }> {
    const start = Date.now();
    const rawKey = req.headers.get("x-api-key") || req.nextUrl.searchParams.get("api_key");

    if (!rawKey) {
        return {
            ok: false,
            error: NextResponse.json(
                { error: "Missing API Key. Include 'X-API-Key' header or '?api_key=' query param.", code: "NO_API_KEY" },
                { status: 401 }
            ),
        };
    }

    const keyHash = hashKey(rawKey);

    // Fetch key record
    const { data: keyRecord, error } = await supabaseAdmin
        .from("api_keys")
        .select("id, user_id, key_prefix, is_active, daily_limit, requests_today, last_reset_date")
        .eq("key_hash", keyHash)
        .single();

    if (error || !keyRecord) {
        await logRequest(null, null, endpoint, 401, Date.now() - start, req);
        return {
            ok: false,
            error: NextResponse.json(
                { error: "Invalid API Key.", code: "INVALID_API_KEY" },
                { status: 401 }
            ),
        };
    }

    if (!keyRecord.is_active) {
        await logRequest(keyRecord.id, keyRecord.key_prefix, endpoint, 403, Date.now() - start, req);
        return {
            ok: false,
            error: NextResponse.json(
                { error: "API Key has been revoked.", code: "KEY_REVOKED" },
                { status: 403 }
            ),
        };
    }

    // Reset daily counter if new day
    const today = new Date().toISOString().slice(0, 10);
    let requestsToday = keyRecord.requests_today;
    if (keyRecord.last_reset_date !== today) {
        requestsToday = 0;
        await supabaseAdmin.from("api_keys").update({ requests_today: 0, last_reset_date: today }).eq("id", keyRecord.id);
    }

    // Rate limit check
    if (requestsToday >= keyRecord.daily_limit) {
        await logRequest(keyRecord.id, keyRecord.key_prefix, endpoint, 429, Date.now() - start, req);
        return {
            ok: false,
            error: NextResponse.json(
                {
                    error: `Daily rate limit of ${keyRecord.daily_limit} requests exceeded.`,
                    code: "RATE_LIMIT_EXCEEDED",
                    reset_at: `${today}T17:00:00Z`,
                },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Limit": String(keyRecord.daily_limit),
                        "X-RateLimit-Remaining": "0",
                    },
                }
            ),
        };
    }

    // Increment counter
    await supabaseAdmin
        .from("api_keys")
        .update({ requests_today: requestsToday + 1 })
        .eq("id", keyRecord.id);

    // Fetch role
    const { data: gwUser } = await supabaseAdmin
        .from("api_gateway_users")
        .select("role")
        .eq("id", keyRecord.user_id)
        .single();

    const context: ApiGatewayContext = {
        keyId: keyRecord.id,
        keyPrefix: keyRecord.key_prefix,
        userId: keyRecord.user_id,
        role: gwUser?.role || "mitra",
        dailyLimit: keyRecord.daily_limit,
        requestsToday: requestsToday + 1,
    };

    // Log success (fire-and-forget)
    logRequest(keyRecord.id, keyRecord.key_prefix, endpoint, 200, Date.now() - start, req).catch(() => { });

    return { ok: true, context };
}

async function logRequest(
    keyId: string | null,
    keyPrefix: string | null,
    endpoint: string,
    statusCode: number,
    responseMs: number,
    req: NextRequest
) {
    try {
        await supabaseAdmin.from("api_request_logs").insert({
            api_key_id: keyId,
            key_prefix: keyPrefix,
            endpoint,
            method: "GET",
            status_code: statusCode,
            response_time_ms: responseMs,
            ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
        });
    } catch { /* non-critical */ }
}

/** Standard SIGMA API response envelope */
export function apiResponse<T>(data: T, meta: Record<string, unknown>, context: ApiGatewayContext) {
    return NextResponse.json(
        {
            success: true,
            data,
            meta: {
                source: "SIGMA RCS — Dinas Kesehatan Kabupaten Malang",
                version: "v1",
                ...meta,
            },
        },
        {
            headers: {
                "X-RateLimit-Limit": String(context.dailyLimit),
                "X-RateLimit-Remaining": String(context.dailyLimit - context.requestsToday),
                "X-Powered-By": "SIGMA API Gateway",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "X-API-Key, Content-Type",
            },
        }
    );
}
