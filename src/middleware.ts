import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Protected routes yang butuh autentikasi
const PROTECTED_ROUTES = [
    "/dashboard",
    "/chatbot/app",
    "/api-gateway/portal",
    "/mbg/supervisi",
    "/mbg/pelaporan",
    "/sso/modules",
];

// Old login pages yang harus redirect ke SSO
const LEGACY_LOGIN_PAGES = ["/login"];

// SSO Login page — redirect ke sini jika belum login
const SSO_LOGIN_PATH = "/sso/login";

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll(); },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const pathname = request.nextUrl.pathname;

    // 1. Redirect legacy /login ke /sso/login (dengan forward semua query params)
    if (LEGACY_LOGIN_PAGES.includes(pathname)) {
        const url = request.nextUrl.clone();
        const redirectTo = url.searchParams.get("redirect_to");
        const timeout = url.searchParams.get("timeout");
        url.pathname = SSO_LOGIN_PATH;
        if (!redirectTo) url.searchParams.set("redirect_to", "/sso/modules");
        if (timeout) url.searchParams.set("timeout", timeout);
        return NextResponse.redirect(url);
    }

    // 2. Guard semua protected routes
    const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
    if (isProtected && !user) {
        const url = request.nextUrl.clone();
        url.pathname = SSO_LOGIN_PATH;
        url.searchParams.set("redirect_to", pathname);
        return NextResponse.redirect(url);
    }

    // 3. Jika user sudah login dan mengakses SSO login page → redirect ke default /sso/modules
    if (user && pathname === SSO_LOGIN_PATH) {
        const url = request.nextUrl.clone();
        const redirectTo = url.searchParams.get("redirect_to");
        if (redirectTo && !redirectTo.startsWith("/sso/login")) {
            url.pathname = redirectTo;
            url.search = "";
            return NextResponse.redirect(url);
        }
        url.pathname = "/sso/modules";
        url.search = "";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/chatbot/app/:path*",
        "/api-gateway/portal/:path*",
        "/mbg/supervisi/:path*",
        "/mbg/pelaporan/:path*",
        "/sso/modules/:path*",
        "/login",
        "/sso/login",
    ],
};
