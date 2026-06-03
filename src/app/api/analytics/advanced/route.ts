import { fetchSigmaContext } from "@/app/api/chatbot/chat/route";
import { streamObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Set timeout max duration for Vercel
export const maxDuration = 60;

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const AnalyticsSchema = z.object({
    macroStatus: z.string(),
    anomalyDetection: z.array(z.string()),
    regressionStats: z.object({
        rSquared: z.number(),
        confidenceText: z.string(),
        methodology: z.string()
    }),
    predictiveAnalysis: z.object({
        narrative: z.string(),
        trendData: z.array(z.object({
            bulan: z.string(),
            prediksiStunting: z.number()
        }))
    }),
    tacticalRecommendations: z.array(z.string()),
    regionScoring: z.array(z.object({
        puskesmas: z.string(),
        riskScore: z.number(),
        reason: z.string(),
        status: z.enum(["Red Zone", "Yellow Zone", "Green Zone"])
    }))
});

export async function POST(req: Request) {
    try {
        const { puskesmasId } = await req.json();

        // 1. Ambil konteks dasar dari SIGMA
        const sigmaContext = await fetchSigmaContext(puskesmasId);

        // 2. Deterministic Region Scoring Calculation & Regression
        let scoringContext = "Kalkulasi Matematis Region Scoring:\n";
        
        let bultimQuery = supabaseAdmin.from('data_bultim').select('*').gte('tahun', 2025);
        if (puskesmasId && puskesmasId !== "all") {
            bultimQuery = bultimQuery.ilike('puskesmas', puskesmasId);
        }
        const { data: bultimData } = await bultimQuery;
        
        // --- OLS Regression Calculation ---
        let r2 = 0;
        let slope = 0;
        let intercept = 0;
        let calculatedTrendData: { bulan: string, prediksiStunting: number }[] = [];
        
        if (bultimData && bultimData.length > 0) {
            // Group by puskesmas to calculate scores
            const puskMap = new Map();
            // Also group by month for regression (using string concatenation for simplicity)
            const monthMap = new Map();

            bultimData.forEach(d => {
                if (!puskMap.has(d.puskesmas)) {
                    puskMap.set(d.puskesmas, { sasaran: 0, timbang: 0, ukur: 0, stunting: 0, wasting: 0, timbangUkur: 0 });
                }
                const v = puskMap.get(d.puskesmas);
                v.sasaran += d.data_sasaran || 0;
                v.timbang += d.jumlah_timbang || 0;
                v.ukur += d.jumlah_ukur || 0;
                v.stunting += d.stunting || 0;
                v.wasting += d.wasting || 0;
                v.timbangUkur += d.jumlah_timbang_ukur || 0;

                // Time series
                const mKey = `${d.tahun}-${String(d.bulan).padStart(2, '0')}`;
                if (!monthMap.has(mKey)) {
                    monthMap.set(mKey, { ukur: 0, stunting: 0 });
                }
                const mv = monthMap.get(mKey);
                mv.ukur += d.jumlah_ukur || 0;
                mv.stunting += d.stunting || 0;
            });
            
            puskMap.forEach((val, puskName) => {
                const pctDataEntry = val.sasaran > 0 ? (val.timbang / val.sasaran) * 100 : 0;
                const pctStunting = val.ukur > 0 ? (val.stunting / val.ukur) * 100 : 0;
                const pctWasting = val.timbangUkur > 0 ? (val.wasting / val.timbangUkur) * 100 : 0;
                
                let stuntScore = Math.min(100, (pctStunting / 25) * 100) * 0.4;
                let wastingScore = Math.min(100, (pctWasting / 20) * 100) * 0.3;
                let entryPenalty = (100 - pctDataEntry) * 0.3;
                
                let totalScore = Math.round(stuntScore + wastingScore + entryPenalty);
                let status = totalScore >= 60 ? "Red Zone" : totalScore >= 40 ? "Yellow Zone" : "Green Zone";
                
                scoringContext += `- Puskesmas ${puskName}: Skoring Pasti = ${totalScore} (${status}). (Entry: ${pctDataEntry.toFixed(1)}%, Stunt: ${pctStunting.toFixed(1)}%, Wasting: ${pctWasting.toFixed(1)}%)\n`;
            });

            // Perform OLS Regression
            const sortedMonths = Array.from(monthMap.keys()).sort();
            const tsData = sortedMonths.map((mKey, i) => {
                const v = monthMap.get(mKey);
                return { x: i + 1, y: v.ukur > 0 ? (v.stunting / v.ukur) * 100 : 0, label: mKey };
            });

            const n = tsData.length;
            if (n >= 2) {
                let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
                tsData.forEach(p => {
                    sumX += p.x; sumY += p.y;
                    sumXY += p.x * p.y; sumXX += p.x * p.x;
                });
                slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
                intercept = (sumY - slope * sumX) / n;
                
                const yMean = sumY / n;
                let ssTot = 0, ssRes = 0;
                tsData.forEach(p => {
                    const yPred = slope * p.x + intercept;
                    ssTot += Math.pow(p.y - yMean, 2);
                    ssRes += Math.pow(p.y - yPred, 2);
                });
                r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

                // Build trendData explicitly
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
                tsData.forEach(p => {
                    const [yyyy, mm] = p.label.split('-');
                    calculatedTrendData.push({ bulan: `${monthNames[parseInt(mm)-1]} ${yyyy}`, prediksiStunting: parseFloat(p.y.toFixed(2)) });
                });
                // Predict next 3 months
                let lastX = tsData[tsData.length - 1].x;
                let lastYear = parseInt(tsData[tsData.length - 1].label.split('-')[0]);
                let lastMonth = parseInt(tsData[tsData.length - 1].label.split('-')[1]);
                for (let i = 1; i <= 3; i++) {
                    lastMonth++;
                    if (lastMonth > 12) { lastMonth = 1; lastYear++; }
                    const yPred = Math.max(0, slope * (lastX + i) + intercept); // Prevent negative stunting
                    calculatedTrendData.push({ bulan: `${monthNames[lastMonth-1]} ${lastYear} (Pred)`, prediksiStunting: parseFloat(yPred.toFixed(2)) });
                }
            }
        }
        
        let focusPrompt = "Kabupaten Malang (Data Kumulatif)";
        if (puskesmasId && puskesmasId !== "all") {
            focusPrompt = `Puskesmas ${puskesmasId} (Data Spesifik Wilayah)`;
        }

        const r2Display = r2.toFixed(2);
        const confidenceText = r2 >= 0.7 ? "High Confidence" : r2 >= 0.4 ? "Medium Confidence" : "Low Confidence";

        const fullSystemPrompt = `
Anda adalah SIGMA Advisor, sistem Kecerdasan Buatan (Data Scientist & Analis Kebijakan Kesehatan) untuk ${focusPrompt}.
Berdasarkan data berikut yang difilter khusus untuk menganalisa ${focusPrompt}, hasilkan laporan Advanced Analytics terstruktur HANYA dalam format JSON.

PENTING UNTUK MACRO STATUS:
Bandingkan indikator balita gizi secara detail dan kompleks (analisis korelasi Stunting vs Wasting vs Gizi Kurang/Buruk berdasarkan data agregat). Tuliskan 1 hingga 2 paragraf narasi Executive Summary yang sangat mendalam secara metodologis.

PENTING UNTUK REGRESSION STATS:
Salin teks ini SECARA MUTLAK ke field regressionStats: { "rSquared": ${r2Display}, "confidenceText": "${confidenceText}", "methodology": "OLS Time-Series Linear Regression" }

PENTING UNTUK PREDICTIVE TREND (trendData):
Model statistik backend telah merumuskan OLS Regression. Salin ARRAY JSON BERIKUT SECARA VERBATIM ke dalam field predictiveAnalysis.trendData:
${JSON.stringify(calculatedTrendData)}
Untuk narrative-nya, bacalah tren array di atas dan berikan kesimpulan prediksi 3 bulan ke depan.

PENTING UNTUK REGION SCORING:
Gunakan SECARA MUTLAK angka skor dan status (Red/Yellow/Green) dari kalkulasi matematis berikut. Tugas Anda HANYA memberikan 'reason' (narasi singkat) mengapa wilayah tersebut mendapat skor itu. PASTIKAN nama puskesmas persis seperti nama di data tanpa imbuhan.
${scoringContext}

---
${sigmaContext}
`;

        const google = createGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
        });

        const result = streamObject({
            model: google('gemini-3.1-flash-lite'),
            system: fullSystemPrompt,
            prompt: "Buat analisis advanced JSON sekarang berdasarkan data di atas.",
            schema: AnalyticsSchema,
            temperature: 0.1,
        });

        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error("=== ADVANCED ANALYTICS STREAM ERROR ===", error.message);
        return Response.json({ error: "Layanan stream gagal: " + error.message }, { status: 500 });
    }
}
