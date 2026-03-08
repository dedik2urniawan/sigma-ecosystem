import AIAnalyticsClient from "@/components/dashboard/ai/AIAnalyticsClient";

export const metadata = {
    title: "AI Analytics | SIGMA",
    description: "Modul kecerdasan buatan untuk intelijen gizi dan kesehatan balita Kabupaten Malang.",
};

export default function AIAnalyticsPage() {
    return (
        <div className="w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">AI Analytics</h1>
                <p className="text-slate-500 mt-2">
                    SIGMA Advisor Ai untuk penguatan kebijakan berbasis data dan deteksi anomali.
                </p>
            </div>

            <AIAnalyticsClient />
        </div>
    );
}
