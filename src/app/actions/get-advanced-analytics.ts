"use server";

import { GoogleAuth } from "google-auth-library";
import { fetchSigmaContext } from "@/app/api/chatbot/chat/route";

export interface AIAnalyticsData {
    macroStatus: string;
    anomalyDetection: string[];
    predictiveAnalysis: {
        narrative: string;
        trendData: {
            bulan: string;
            prediksiStunting: number;
        }[];
    };
    tacticalRecommendations: string[];
    regionScoring: {
        puskesmas: string;
        riskScore: number;
        reason: string;
        status: "Red Zone" | "Yellow Zone" | "Green Zone";
    }[];
}

export async function getAdvancedAnalytics(puskesmasId?: string): Promise<{ success: boolean; data?: AIAnalyticsData; error?: string }> {
    console.log(`Generating Advanced AI Analytics via Vertex AI ${puskesmasId ? `for ${puskesmasId}` : 'for Kabupaten'}...`);

    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

    if (!projectId) {
        return { success: false, error: "Konfigurasi server (GCP Project ID) tidak lengkap." };
    }

    try {
        const sigmaContext = await fetchSigmaContext(puskesmasId);

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
        else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
        }
        else {
            return { success: false, error: "Konfigurasi Kredensial GCP tidak ditemukan." };
        }

        const accessToken = await auth.getAccessToken();

        let focusPrompt = "Kabupaten Malang (Data Kumulatif)";
        if (puskesmasId && puskesmasId !== "all") {
            focusPrompt = `Puskesmas ${puskesmasId} (Data Spesifik Wilayah)`;
        }

        const fullSystemPrompt = `
Anda adalah SIGMA Advisor, sistem Kecerdasan Buatan (Data Scientist & Analis Kebijakan Kesehatan) untuk ${focusPrompt}.
Berdasarkan data berikut yang difilter khusus untuk menganalisa ${focusPrompt}, hasilkan laporan Advanced Analytics terstruktur HANYA dalam format JSON.

${sigmaContext}

Format JSON yang disyaratkan:
{
  "macroStatus": "Ringkasan 2 paragraf mengenai tren stunting, gizi, dan capaian pelayanan kesehatan (Fokus: ${focusPrompt}).",
  "anomalyDetection": [
    "Jelaskan anomali / lonjakan stunting spesifik di wilayah ini",
    "Jelaskan anomali capaian input / penimbangan di wilayah ini"
  ],
  "predictiveAnalysis": {
    "narrative": "Prediksi tren 3 bulan ke depan secara narasi analitis berdasarkan data historis di atas.",
    "trendData": [
      { "bulan": "Nama Bulan (misal: April 2026)", "prediksiStunting": 12.5 }
    ]
  },
  "tacticalRecommendations": [
    "Langkah operasional spesifik tingkat wilayah/puskesmas 1",
    "Langkah operasional operasional 2"
  ],
  "regionScoring": [
    {
      "puskesmas": "Nama Wilayah / Desa (Jika Analitik Spesifik Puskesmas) atau Nama Puskesmas (Jika Analitik Kabupaten)",
      "riskScore": 85, // Angka 0 hingga 100. Semakin tinggi = semakin buruk / perlu intervensi (resiko tinggi).
      "reason": "Penjelasan singkat 1 kalimat mengapa skornya begini",
      "status": "Red Zone" // Pilih salah satu: "Red Zone", "Yellow Zone", "Green Zone"
    }
  ]
}

Aturan Ketat:
1. JANGAN PERNAH menambahkan teks backticks markdown seperti \`\`\`json di awal atau akhir. Kembalikan raw JSON saja.
2. SANGAT PENTING: Dilarang keras menggunakan literal Enter / Newline / Line Break di dalam nilai string JSON! Semua baris baru (newline) di dalam teks wajib ditulis menggunakan teks escape "\\n".
3. Dilarang menggunakan literal tab (gunakan "\\t" jika perlu).
4. Evaluasi riskScore berdasarkan gabungan: Stunting Prevalence, Wasting, Underweight, kehadiran posyandu (Data Entry), ASI eksklusif, dan MPASI.
`;

        const vertexEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.0-flash:generateContent`;

        const response = await fetch(vertexEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: "Anda adalah sistem pakar analisis data dalam bentuk JSON." }] },
                contents: [{ role: "user", parts: [{ text: fullSystemPrompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.8,
                    maxOutputTokens: 2048,
                    responseMimeType: "application/json"
                }
            }),
        });

        const responseData = await response.json();

        if (!response.ok || responseData.error) {
            const errMsg = responseData.error?.message || 'Unknown error';
            console.error("Vertex AI Analytics Error:", errMsg);
            return { success: false, error: "Layanan Vertex AI gagal: " + errMsg };
        }

        let aiText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        // Membersihkan markdown block jika model masih tidak patuh formating raw JSON
        if (aiText.includes('```')) {
            aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
        }

        // Menghapus literal tab characters (ASCII 9) yang tidak didukung JSON.parse
        aiText = aiText.replace(/\t/g, ' ');

        const parsedData = JSON.parse(aiText) as AIAnalyticsData;

        return { success: true, data: parsedData };

    } catch (error: any) {
        console.error("=== ADVANCED ANALYTICS ERROR ===", error.message);
        return {
            success: false,
            error: "Gagal menghubungkan atau mem-parsing dari AI Vertex: " + error.message,
        };
    }
}
