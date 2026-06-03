"use server";

import { supabase } from "@/lib/supabase";
import { GoogleAuth } from "google-auth-library";

interface Filters {
    periode: string;
    kecamatan: string;
    puskesmas: string;
    kelurahan?: string;
}

export async function getEppgbmAiSummary(filters: Filters) {
    try {
        const buildQuery = () => {
            let q = supabase.from("data_eppgbm").select('*', { count: 'exact', head: true });
            if (filters.periode && filters.periode !== "Semua") {
                q = q.eq("periode", filters.periode);
            }
            if (filters.puskesmas && filters.puskesmas !== "Semua") {
                q = q.eq("puskesmas", filters.puskesmas);
            }
            if (filters.kelurahan && filters.kelurahan !== "Semua") {
                q = q.eq("kelurahan", filters.kelurahan);
            }
            return q;
        };

        // 1. Fetch Aggregated Data concurrently
        const [
            totalRes, stuntingRes, wastingRes, underweightRes,
            mismatchRes, orRes
        ] = await Promise.all([
            buildQuery(),
            buildQuery().lt("zs_tbu", -2),
            buildQuery().lt("zs_bbtb", -2),
            buildQuery().lt("zs_bbu", -2),
            supabase.rpc("get_eppgbm_mismatch_posisi", { 
                p_periode: filters.periode !== "Semua" ? filters.periode : null,
                p_puskesmas: filters.puskesmas !== "Semua" ? filters.puskesmas : null,
                p_kelurahan: filters.kelurahan && filters.kelurahan !== "Semua" ? filters.kelurahan : null
            }),
            supabase.rpc("get_eppgbm_odds_ratio_stunting", {
                p_periode: filters.periode !== "Semua" ? filters.periode : null,
                p_puskesmas: filters.puskesmas !== "Semua" ? filters.puskesmas : null,
                p_kelurahan: filters.kelurahan && filters.kelurahan !== "Semua" ? filters.kelurahan : null
            })
        ]);

        const total = totalRes.count || 0;
        const stunting = stuntingRes.count || 0;
        const wasting = wastingRes.count || 0;
        const underweight = underweightRes.count || 0;

        if (total === 0) {
            return {
                summary: "Tidak ada data yang tersedia untuk dianalisis pada filter yang dipilih.",
                stats: { total: 0, stunting: 0, wasting: 0, underweight: 0 }
            };
        }

        // Calculate prevalence
        const prevStunting = ((stunting / total) * 100).toFixed(1);
        const prevWasting = ((wasting / total) * 100).toFixed(1);
        const prevUnderweight = ((underweight / total) * 100).toFixed(1);

        // Prepare context for AI
        const locationContext = filters.kelurahan !== "Semua" ? `Kelurahan ${filters.kelurahan}` 
            : filters.puskesmas !== "Semua" ? `Puskesmas ${filters.puskesmas}` 
            : `Seluruh Wilayah`;

        const periodeContext = filters.periode !== "Semua" ? filters.periode : "Semua Periode";

        // Prepare Odds Ratio Context
        let orContext = "Data Odds Ratio tidak tersedia.";
        if (orRes.data && orRes.data.length > 0) {
            orContext = orRes.data.map((item: any) => 
                `- Balita dengan riwayat ${item.exposure} memiliki risiko stunting ${item.odds_ratio} kali lebih tinggi dibanding yang normal.`
            ).join('\n');
        }

        // Prepare Mismatch Context
        let mismatchContext = "Data Mismatch tidak tersedia.";
        let totalMismatch = 0;
        let totalUkur = 0;
        if (mismatchRes.data && mismatchRes.data.length > 0) {
            const highMismatchAge = mismatchRes.data.reduce((prev: any, current: any) => 
                (Number(prev.mismatch) > Number(current.mismatch)) ? prev : current
            );
            
            totalMismatch = mismatchRes.data.reduce((sum: number, item: any) => sum + Number(item.mismatch), 0);
            totalUkur = mismatchRes.data.reduce((sum: number, item: any) => sum + Number(item.total), 0);
            const mismatchPct = ((totalMismatch / totalUkur) * 100).toFixed(1);

            mismatchContext = `Terdapat ${totalMismatch.toLocaleString("id-ID")} kasus mismatch posisi ukur (${mismatchPct}% dari ${totalUkur.toLocaleString("id-ID")} sampel pengukuran), dengan kesalahan terbanyak pada kelompok usia ${highMismatchAge.age_group}.`;
        }

        const promptText = `
Anda adalah seorang Ahli Gizi dan Epidemiolog (Sistem Pakar) yang bertugas memberikan ringkasan eksekutif analitis (Executive Summary) berdasarkan data Antropometri (EPPGBM) terbaru.
Target pembaca Anda adalah Kepala Dinas Kesehatan atau Kepala Puskesmas, sehingga bahasa yang digunakan harus profesional, membumi, dan sangat analitis (hindari kesan robotik/datar).

Berikut adalah data komprehensif gizi balita untuk ${locationContext} pada periode ${periodeContext}:

**1. Data Prevalensi Dasar:**
- Total Balita Terukur: ${total.toLocaleString("id-ID")} anak
- Balita Stunting (TB/U < -2): ${stunting.toLocaleString("id-ID")} anak (Prevalensi: ${prevStunting}%)
- Balita Wasting (BB/TB < -2): ${wasting.toLocaleString("id-ID")} anak (Prevalensi: ${prevWasting}%)
- Balita Underweight (BB/U < -2): ${underweight.toLocaleString("id-ID")} anak (Prevalensi: ${prevUnderweight}%)

**2. Analisis Akar Masalah (Odds Ratio Risiko Stunting):**
${orContext}

**3. Evaluasi Integritas Data (Mismatch Posisi Ukur):**
${mismatchContext}

Tugas Anda:
Buatlah narasi Executive Summary (dibagi menjadi 3 paragraf) yang kohesif dan analitis:
- Paragraf 1 (Status Gizi & Anomali): Menyimpulkan prevalensi gizi dan menyoroti metrik yang paling kritis secara naratif (misal "Walaupun prevalensi stunting terkendali di X%, ada anomali tingginbernya Wasting...").
- Paragraf 2 (Akar Masalah & Kualitas Data): Membahas temuan mengejutkan dari korelasi historis (Odds Ratio) serta mengkritik secara halus jika persentase Mismatch posisi ukur sangat tinggi (mengindikasikan perlunya kalibrasi SDM / kader posyandu).
- Paragraf 3 (Rekomendasi Kebijakan): Rekomendasi aksi taktis (Intervensi spesifik/sensitif) yang tepat sasaran berdasarkan data OD Ratio dan Mismatch di atas (misal, fokus PMT, pencegahan BBLR/PBLR pada bumil KEK, atau Refreshing Kader Posyandu).

Aturan Formatting:
Gunakan bahasa Indonesia yang profesional. Gunakan formatting Markdown (bold untuk penekanan metrik penting). Jangan gunakan heading (seperti ### atau **Ringkasan:**). Langsung berikan 3 paragraf yang mengalir elegan.
        `;

        // Call Vertex AI using the environment variable approach
        const projectId = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'; 
        const aiModel = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-3.1-flash-lite';
        
        if (!projectId) {
            console.error("Missing Vertex AI Credentials (GOOGLE_CLOUD_PROJECT)");
            return {
                summary: "Gagal menghubungkan AI: Konfigurasi Project ID belum diatur.",
                stats: { total, stunting, wasting, underweight }
            };
        }

        let auth;
        if (process.env.GOOGLE_CREDENTIALS_BASE64) {
            const credsStr = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
            const credentials = JSON.parse(credsStr);
            auth = new GoogleAuth({
                credentials,
                scopes: 'https://www.googleapis.com/auth/cloud-platform'
            });
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            auth = new GoogleAuth({
                scopes: 'https://www.googleapis.com/auth/cloud-platform'
            });
        } else {
            return { summary: "Gagal menghubungkan AI: Konfigurasi Kredensial GCP tidak ditemukan.", stats: { total, stunting, wasting, underweight } };
        }

        const accessToken = await auth.getAccessToken();
        const vertexEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${aiModel}:generateContent`;

        const response = await fetch(vertexEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: "Anda adalah SIGMA Advisor, Ahli Gizi dan Epidemiolog." }] },
                contents: [{ role: "user", parts: [{ text: promptText }] }],
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
            return {
                summary: "Layanan Vertex AI sedang tidak dapat memproses ringkasan.",
                stats: { total, stunting, wasting, underweight }
            };
        }

        const aiText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, AI gagal men-generate teks ringkasan.";
        
        return {
            summary: aiText,
            stats: { total, stunting, wasting, underweight }
        };

    } catch (error: any) {
        console.error("=== EPPGBM AI SUMMARY ERROR ===", error.message);
        return {
            summary: "Terjadi kendala teknis saat menghubungi AI. Silakan coba beberapa saat lagi.",
            stats: { total: 0, stunting: 0, wasting: 0, underweight: 0 }
        };
    }
}
