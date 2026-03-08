"use server";

import { GoogleAuth } from "google-auth-library";

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
    console.log("Generating analysis with Vertex AI context:", {
        tahun: context.filterTahun,
        bulan: context.filterBulan,
        puskesmas: context.filterPuskesmas
    });

    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

    if (!projectId) {
        console.error("Missing Vertex AI Credentials (GOOGLE_CLOUD_PROJECT)");
        return {
            success: false,
            error: "Konfigurasi server (GCP Project ID) tidak lengkap.",
        };
    }

    try {
        let auth;
        // Check if we have Base64 credentials for Vercel deployment
        if (process.env.GOOGLE_CREDENTIALS_BASE64) {
            try {
                const credsStr = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
                const credentials = JSON.parse(credsStr);
                auth = new GoogleAuth({
                    credentials,
                    scopes: 'https://www.googleapis.com/auth/cloud-platform'
                });
            } catch (err) {
                console.error("Failed to parse GOOGLE_CREDENTIALS_BASE64", err);
                return { success: false, error: "Konfigurasi Base64 Kredensial tidak valid." };
            }
        }
        // Fallback to local file path mapping if no Base64
        else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            auth = new GoogleAuth({
                scopes: 'https://www.googleapis.com/auth/cloud-platform'
            });
        }
        else {
            console.error("Missing Vertex AI Credentials");
            return { success: false, error: "Konfigurasi Kredensial GCP tidak ditemukan." };
        }

        const accessToken = await auth.getAccessToken();

        const fullSystemPrompt = `
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

        const vertexEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.0-flash:generateContent`;

        const response = await fetch(vertexEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: "Anda adalah SIGMA Advisor, Asisten Analis Kebijakan Kesehatan." }] },
                contents: [{ role: "user", parts: [{ text: fullSystemPrompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.8,
                    maxOutputTokens: 1024,
                }
            }),
        });

        const responseData = await response.json();

        if (!response.ok || responseData.error) {
            const errMsg = responseData.error?.message || 'Unknown error';
            console.error("Vertex AI Error:", errMsg);

            if (response.status === 429 || errMsg.includes('RESOURCE_EXHAUSTED')) {
                return { success: false, error: "⏳ **SIGMA Advisor sedang sibuk.** Batas Vertex AI tercapai." };
            }

            return { success: false, error: "Layanan Vertex AI tidak tersedia: " + errMsg };
        }

        const aiText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, tidak ada respons dari AI.";
        return { success: true, data: aiText };

    } catch (error: any) {
        console.error("=== API ANALYSIS ERROR ===", error.message);
        return {
            success: false,
            error: "Terjadi kesalahan koneksi ke Vertex AI.",
            debugInfo: error.message
        };
    }
}

