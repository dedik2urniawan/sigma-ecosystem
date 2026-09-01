/**
 * SIGMA Ecosystem v2.0 — SSO Utility Functions
 * Central helper untuk semua logika SSO: routing, akses modul, redirect validation.
 */

// ─── Module Definitions ───────────────────────────────────────────────────────

export type SigmaModule =
    | "rcs"
    | "calculator"
    | "mbg"
    | "chatbot"
    | "api_gateway"
    | "pkmk";

export interface SigmaModuleConfig {
    id: SigmaModule;
    label: string;
    description: string;
    icon: string;
    color: string;
    landingPath: string;
    appPath: string;
    isPublic: boolean;
    isExternal: boolean;
    externalUrl?: string;
}

export const SIGMA_MODULES: SigmaModuleConfig[] = [
    {
        id: "rcs",
        label: "SIGMA RCS",
        description: "Responsive Comprehensive Surveillance Dashboard",
        icon: "monitor_heart",
        color: "from-emerald-500 to-emerald-700",
        landingPath: "/rcs",
        appPath: "/dashboard",
        isPublic: false,
        isExternal: false,
    },
    {
        id: "calculator",
        label: "SIGMA Calculator",
        description: "Nutritional value calculator & dietary planning",
        icon: "calculate",
        color: "from-blue-500 to-blue-700",
        landingPath: "/calculator",
        appPath: "/calculator",
        isPublic: true,
        isExternal: false,
    },
    {
        id: "mbg",
        label: "SIGMA MBG",
        description: "Monitoring & Evaluasi Program Makan Bergizi Gratis",
        icon: "restaurant",
        color: "from-amber-500 to-orange-600",
        landingPath: "/mbg",
        appPath: "/mbg",
        isPublic: false,
        isExternal: false,
    },
    {
        id: "chatbot",
        label: "Chatbot AI",
        description: "AI-powered nutrition assistant",
        icon: "smart_toy",
        color: "from-purple-500 to-indigo-600",
        landingPath: "/chatbot",
        appPath: "/chatbot/app",
        isPublic: false,
        isExternal: false,
    },
    {
        id: "api_gateway",
        label: "API Gateway",
        description: "Portal data sharing standar & aman",
        icon: "hub",
        color: "from-indigo-500 to-purple-600",
        landingPath: "/api-gateway",
        appPath: "/api-gateway/portal",
        isPublic: false,
        isExternal: false,
    },
    {
        id: "pkmk",
        label: "SIGMA PKMK",
        description: "Dashboard Analisis Intervensi PKMK",
        icon: "medical_services",
        color: "from-violet-500 to-purple-700",
        landingPath: "https://pkmk-malangkab.app/landing-page.html",
        appPath: "https://pkmk-malangkab.app",
        isPublic: true,
        isExternal: true,
        externalUrl: "https://pkmk-malangkab.app",
    },
];

// ─── Role Definitions ─────────────────────────────────────────────────────────

export type SigmaRole =
    | "superadmin"
    | "admin_puskesmas"
    | "admin_dinkes"
    | "stakeholder"
    | "mitra_api"
    | "chatbot_user"
    | "user";

export function getDefaultLandingByRole(role?: SigmaRole, modulesAccess?: string[]): string {
    // Sesuai flow baru SSO v2.1: Setelah login, selalu arahkan ke Hub 5 Layanan Modul
    return "/sso/modules";
}

export function canAccessModule(
    role: SigmaRole,
    modulesAccess: string[],
    moduleId: SigmaModule
): boolean {
    if (role === "superadmin") return true;
    if (role === "admin_puskesmas") return true;
    if (role === "admin_dinkes") return true;
    if (moduleId === "calculator" || moduleId === "pkmk") return true;
    if (moduleId === "chatbot") return true;
    return modulesAccess.includes(moduleId);
}

const ALLOWED_REDIRECT_PREFIXES = [
    "/dashboard",
    "/rcs",
    "/chatbot",
    "/api-gateway",
    "/mbg",
    "/calculator",
    "/sso",
];

export function isAllowedRedirect(url: string): boolean {
    if (!url) return false;
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//")) return false;
    return ALLOWED_REDIRECT_PREFIXES.some(prefix => url.startsWith(prefix));
}

export function formatRoleDisplay(role: string): string {
    const roleMap: Record<string, string> = {
        superadmin: "Super Admin",
        admin_puskesmas: "Admin Puskesmas",
        admin_dinkes: "Admin Dinkes",
        stakeholder: "Stakeholder",
        mitra_api: "Mitra API",
        chatbot_user: "Chatbot User",
        user: "User",
    };
    return roleMap[role?.toLowerCase()] || role || "User";
}

export function getAccessibleModules(
    role: SigmaRole,
    modulesAccess: string[]
): SigmaModuleConfig[] {
    return SIGMA_MODULES.filter(module =>
        canAccessModule(role, modulesAccess, module.id)
    );
}
