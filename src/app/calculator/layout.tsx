import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "SIGMA Calculator - Kalkulator Status Gizi WHO ZScore",
    description:
        "Perhitungan status gizi personal dan massal menggunakan metode WHO ZScore LMS. Analisis BBU, TBU, BBTB, Probable Stunting, dan Red Flag detection.",
};

export default function CalculatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
