"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export interface AnalysisContext {
    filterTahun: number | null;
    filterBulan: number | null;
    filterPuskesmas: string;
    totals: {
        data_sasaran: number;
        jumlah_timbang_ukur: number;
        stunting: number;
        wasting: number;
        underweight: number;
        obesitas: number;
        pctDataEntry: number;
        pctStunting: number;
        pctWasting: number;
        pctUnderweight: number;
        pctObesitas: number;
    };
    topIssues: {
        puskesmas: string;
        issue: string; // e.g., "Stunting Tinggi (25%)"
        value: number;
    }[];
}

export async function generateHealthAnalysis(context: AnalysisContext) {
    console.log("Generating analysis with context:", {
        tahun: context.filterTahun,
        bulan: context.filterBulan,
        puskesmas: context.filterPuskesmas
    });

    if (!process.env.GOOGLE_API_KEY) {
        console.error("GOOGLE_API_KEY is missing in process.env");
        return {
            success: false,
            error: "API Key not configured. Please add GOOGLE_API_KEY to .env.local",
        };
    }
    console.log("API Key is present (starts with):", process.env.GOOGLE_API_KEY.substring(0, 5) + "...");

    try {
        // Use gemini-flash-latest (confirmed available in user's model list)
        // gemini-1.5-flash check failed (404), gemini-2.0-flash check failed (429)
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
      You are SIGMA Advisor, an expert Health Policy Analyst for Kabupaten Malang.
      Analyze the following health service data and provide strategic recommendations.
      
      **Context:**
      - Period: ${context.filterBulan ? `Month ${context.filterBulan}` : "Full Year"} ${context.filterTahun || "All Years"}
      - Location: ${context.filterPuskesmas === "all" ? "All Puskesmas" : context.filterPuskesmas}
      
      **Key Data:**
      - Total Sasaran: ${context.totals.data_sasaran}
      - Measured (D/S): ${context.totals.jumlah_timbang_ukur} (${context.totals.pctDataEntry.toFixed(1)}% coverage)
      - Stunting Prevalence: ${context.totals.pctStunting.toFixed(2)}% (${context.totals.stunting} cases)
      - Wasting Prevalence: ${context.totals.pctWasting.toFixed(2)}% (${context.totals.wasting} cases)
      - Underweight Prevalence: ${context.totals.pctUnderweight.toFixed(2)}% (${context.totals.underweight} cases)
      - Obesity Prevalence: ${context.totals.pctObesitas.toFixed(2)}% (${context.totals.obesitas} cases)

      **Top Issues/Anomalies Detected:**
      ${context.topIssues.map(i => `- ${i.puskesmas}: ${i.issue}`).join("\n")}

      **Instructions:**
      1.  **Executive Summary**: A brief 2-sentence overview of the current status.
      2.  **Key Findings**: Highlight 3 critical insights (e.g., if Stunting is above 10%, flag it; if Data Entry < 80%, flag it).
      3.  **Specific Recommendations**: Provide 3-4 actionable steps for the Dinas Kesehatan or Puskesmas specific to these numbers. Focus on "Intervensi Spesifik" and "Intervensi Sensitif".
      4.  **Tone**: Professional, governmental, decisive, yet encouraging. Use Markdown formatting (bold, lists).

      Output in Bahasa Indonesia.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return { success: true, data: text };
    } catch (error: any) {
        console.error("Gemini API Error Full Object:", JSON.stringify(error, null, 2));
        console.error("Gemini API Error Message:", error.message);

        let errorMessage = "Gagal menghubungkan ke AI Service. Coba lagi nanti.";

        if (error.message?.includes("API key not valid")) {
            errorMessage = "API Key tidak valid. Cek .env.local";
        } else if (error.message?.includes("User location is not supported")) {
            errorMessage = "Lokasi tidak didukung (Gunakan VPN server US/Singapore jika perlu).";
        } else if (error.message?.includes("429") || error.message?.includes("Quota") || error.message?.includes("quota")) {
            errorMessage = "Limit Kuota Tercapai (429). Tunggu 1 menit.";
        }

        return {
            success: false,
            error: errorMessage,
            debugInfo: error.message // Sending debug info to client temporarily
        };
    }
}
