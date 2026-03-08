import { createClient } from '@supabase/supabase-js';
import { GoogleAuth } from 'google-auth-library';

export const maxDuration = 60;

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SYSTEM_PROMPT = `Anda adalah "SIGMA Advisor", asisten AI resmi dari Dinas Kesehatan Kabupaten Malang untuk ekosistem SIGMA (Sistem Informasi Gizi Integrasi AI).

Tugas utama Anda:
- Menjawab pertanyaan seputar data stunting, gizi balita, kesehatan ibu-anak (KIA), dan intervensi PKMK di Kabupaten Malang.
- Melakukan analisis berdasarkan DATA AKTUAL dari [KONTEKS DATA SIGMA] yang memiliki 3 pilar: Pelayanan Kesehatan, Indikator Balita Gizi, dan Intervensi PKMK.
- Menemukan korelasi antara masalah gizi (Stunting/TBU, Underweight, Wasting) dengan determinan fundamental (seperti capaian ASI Eksklusif, MPASI, Kehadiran Posyandu/Data Entry).
- Memberikan insight strategis dan rekomendasi kebijakan operasional yang tajam.

Panduan menjawab:
- JANGAN PERNAH mengarang data (halusinasi). Gunakan angka dari [KONTEKS DATA SIGMA].
- Jika data terkait tidak ada di konteks, katakan bahwa data tersebut tidak tersedia di sistem saat ini.
- Analisis Tren Waktu: Anda diberikan data Historis (Bulan ke Bulan) tingkat Kabupaten dan detail kompresi per-Puskesmas. Jawab dengan cerdas jika user meminta perbandingan progres antar bulan (contoh: penurunan/kenaikan stunting dari Januari ke Februari 2026).
- Gunakan bahasa Indonesia profesional, proaktif, dan analitis.
- Format jawaban dengan baik menggunakan Markdown. Gunakan **tebal** HANYA pada kata kunci penting di DALAM kalimat. JANGAN MENGGUNAKAN cetak tebal yang berdiri sendiri untuk judul (seperti **Gambaran Umum:**). Gunakan format judul standar markdown (contoh: ### Gambaran Umum) jika ingin membuat struktur bagian.
- Gunakan rumus prevalensi berikut saat menjelaskan (angka riil lihat konteks):

Pilar Pelayanan Kesehatan:
* % Data Entry = Ditimbang / Sasaran
* % Stunting = Stunting / Diukur
* % Underweight = Underweight / Ditimbang
* % Wasting = Wasting / (Ditimbang & Diukur)

Pilar Indikator Balita Gizi:
* % Stunting = Balita Stunting / Balita Diukur PBTB
* % Wasting = Balita Wasting / Balita Ditimbang & Diukur
* % Underweight = Balita Underweight / Balita Ditimbang 
* % Overweight = Balita Overweight / Balita Ditimbang`;

export async function fetchSigmaContext(puskesmasFilter?: string): Promise<string> {
    try {
        const pkmkAdmin = createClient(
            process.env.NEXT_PUBLIC_PKMK_SUPABASE_URL!,
            process.env.PKMK_SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Fetch historical data bultim and gizi (>= 2025)
        let bultimQuery = supabaseAdmin
            .from('data_bultim')
            .select('*')
            .gte('tahun', 2025);

        let giziQuery = supabaseAdmin
            .from('data_balita_gizi')
            .select('*')
            .gte('tahun', 2025);

        if (puskesmasFilter && puskesmasFilter !== "all") {
            bultimQuery = bultimQuery.ilike('puskesmas', puskesmasFilter);
            giziQuery = giziQuery.ilike('puskesmas', puskesmasFilter);
        }

        const bultimPromise = bultimQuery;
        const giziPromise = giziQuery;

        // 2. Pilar 3: PKMK Data (Snapshot Realtime)
        const redflagPromise = pkmkAdmin.from('balita').select('id', { count: 'exact', head: true }).eq('redflag_any', true);
        const kohortPromise = pkmkAdmin.from('kohort').select('id', { count: 'exact', head: true }).eq('status', 'AKTIF');

        const [bultimRes, giziRes, redflagRes, kohortRes] = await Promise.all([bultimPromise, giziPromise, redflagPromise, kohortPromise]);

        const bultimData = bultimRes.data || [];
        const giziData = giziRes.data || [];

        if (bultimData.length === 0 && giziData.length === 0) {
            return `[KONTEKS DATA SIGMA]\nData tidak dapat dimuat atau kosong.\n[Akhir Konteks]`;
        }

        const countRedflag = redflagRes.count || 0;
        const countKohort = kohortRes.count || 0;

        const BULAN_NAME: Record<number, string> = {
            1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'Mei', 6: 'Jun',
            7: 'Jul', 8: 'Ags', 9: 'Sep', 10: 'Okt', 11: 'Nov', 12: 'Des'
        };

        // Get unique periods (tahun-bulan combination) sorted chronologically
        const periods = Array.from(new Set([...bultimData, ...giziData].map(d => `${d.tahun}-${d.bulan}`)))
            .map(p => {
                const [t, b] = p.split('-');
                return { tahun: Number(t), bulan: Number(b) };
            })
            .sort((a, b) => a.tahun === b.tahun ? a.bulan - b.bulan : a.tahun - b.tahun);

        let ctx = `[KONTEKS DATA SIGMA - HISTORIS (2025-2026)]\n\n`;

        // === 1. TREN MAKRO ===
        ctx += `### Tren Agregat (Bulan ke Bulan)\n`;
        for (const period of periods) {
            const bultimPeriod = bultimData.filter(d => d.tahun === period.tahun && d.bulan === period.bulan);
            const giziPeriod = giziData.filter(d => d.tahun === period.tahun && d.bulan === period.bulan);

            // Bultim Aggregate
            const aggB = bultimPeriod.reduce((acc, d) => ({
                sasaran: acc.sasaran + (d.data_sasaran || 0), timbang: acc.timbang + (d.jumlah_timbang || 0),
                ukur: acc.ukur + (d.jumlah_ukur || 0), timbangUkur: acc.timbangUkur + (d.jumlah_timbang_ukur || 0),
                stunting: acc.stunting + (d.stunting || 0), underweight: acc.underweight + (d.underweight || 0), wasting: acc.wasting + (d.wasting || 0)
            }), { sasaran: 0, timbang: 0, ukur: 0, timbangUkur: 0, stunting: 0, underweight: 0, wasting: 0 });

            const entPct = aggB.sasaran > 0 ? ((aggB.timbang / aggB.sasaran) * 100).toFixed(1) : '0';
            const stPct = aggB.ukur > 0 ? ((aggB.stunting / aggB.ukur) * 100).toFixed(1) : '0';
            const unPct = aggB.timbang > 0 ? ((aggB.underweight / aggB.timbang) * 100).toFixed(1) : '0';
            const wasPct = aggB.timbangUkur > 0 ? ((aggB.wasting / aggB.timbangUkur) * 100).toFixed(1) : '0';

            // Gizi Aggregate
            const aggG = giziPeriod.reduce((acc, d) => ({
                asi: acc.asi + (Number(d.jumlah_bayi_asi_eksklusif_sampai_6_bulan) || 0),
                b6: acc.b6 + (Number(d.jumlah_bayi_usia_6_bulan) || 0),
                mpasi: acc.mpasi + (Number(d.jumlah_anak_usia_6_23_bulan_yang_mendapat_mpasi_baik) || 0),
                a623: acc.a623 + (Number(d.jumlah_anak_usia_6_23_bulan) || 0),
                st: acc.st + (Number(d.jumlah_balita_stunting) || 0),
                ukPBTB: acc.ukPBTB + (Number(d.jumlah_balita_diukur_pbtb) || 0)
            }), { asi: 0, b6: 0, mpasi: 0, a623: 0, st: 0, ukPBTB: 0 });

            const asiPct = aggG.b6 > 0 ? ((aggG.asi / aggG.b6) * 100).toFixed(1) : '0';
            const mpaPct = aggG.a623 > 0 ? ((aggG.mpasi / aggG.a623) * 100).toFixed(1) : '0';
            const stgPct = aggG.ukPBTB > 0 ? ((aggG.st / aggG.ukPBTB) * 100).toFixed(1) : '0';

            ctx += `- [${BULAN_NAME[period.bulan]} ${period.tahun}] Bultim(Entry:${entPct}% Stunt:${stPct}% Und:${unPct}% Wasting:${wasPct}%) | Gizi(Stunt:${stgPct}% ASI:${asiPct}% MPASI:${mpaPct}%)\n`;
        }

        ctx += `\n### Detail Per-Puskesmas (Kompresi Teks Khusus)\n`;
        ctx += `*(Format: [Bln Thn] PUSKESMAS | Entry:X% | Pelyan(S:X% U:X% W:X%) | Gizi(S:X% ASI:X% MP:X%))*\n`;

        // Group by puskesmas, then period
        const puskesmasSet = Array.from(new Set([...bultimData, ...giziData].map(d => d.puskesmas))).filter(Boolean).sort();

        for (const pusk of puskesmasSet) {
            for (const period of periods) {
                const b = bultimData.find(d => d.puskesmas === pusk && d.tahun === period.tahun && d.bulan === period.bulan);
                const g = giziData.find(d => d.puskesmas === pusk && d.tahun === period.tahun && d.bulan === period.bulan);

                if (!b && !g) continue;

                // Bultim Calc
                const entP = (b && b.data_sasaran > 0) ? ((b.jumlah_timbang / b.data_sasaran) * 100).toFixed(1) : '0';
                const stP = (b && b.jumlah_ukur > 0) ? ((b.stunting / b.jumlah_ukur) * 100).toFixed(1) : '0';
                const unP = (b && b.jumlah_timbang > 0) ? ((b.underweight / b.jumlah_timbang) * 100).toFixed(1) : '0';
                const wasP = (b && b.jumlah_timbang_ukur > 0) ? ((b.wasting / b.jumlah_timbang_ukur) * 100).toFixed(1) : '0';

                // Gizi Calc
                const pASI = (g && Number(g.jumlah_bayi_usia_6_bulan) > 0) ? ((Number(g.jumlah_bayi_asi_eksklusif_sampai_6_bulan) / Number(g.jumlah_bayi_usia_6_bulan)) * 100).toFixed(1) : '0';
                const pMPASI = (g && Number(g.jumlah_anak_usia_6_23_bulan) > 0) ? ((Number(g.jumlah_anak_usia_6_23_bulan_yang_mendapat_mpasi_baik) / Number(g.jumlah_anak_usia_6_23_bulan)) * 100).toFixed(1) : '0';
                const pStG = (g && Number(g.jumlah_balita_diukur_pbtb) > 0) ? ((Number(g.jumlah_balita_stunting) / Number(g.jumlah_balita_diukur_pbtb)) * 100).toFixed(1) : '0';

                ctx += `[${BULAN_NAME[period.bulan]} ${period.tahun}] ${pusk.padEnd(16, ' ')} | Entry:${entP.padStart(4, ' ')}% | Pelyan(S:${stP}% U:${unP}% W:${wasP}%) | Gizi(S:${pStG}% ASI:${pASI}% MP:${pMPASI}%)\n`;
            }
        }

        ctx += `\n[KONTEKS DATA PKMK - REALTIME SNAPSHOT]\n`;
        // Only include PKMK totals if we are analyzing ALL regions (PKMK doesn't have identical puskesmas_id mapping in this minimal context)
        if (!puskesmasFilter || puskesmasFilter === "all") {
            ctx += `* Balita dalam pantauan aktif PKMK saat ini: ${countKohort} balita\n`;
            ctx += `* Balita terindikasi memiliki Redflag medis: ${countRedflag} balita\n`;
        } else {
            ctx += `* (Data detail PKMK tingkat individu tidak disertakan di laporan agregrat puskesmas otomatis)\n`;
        }
        ctx += `\n[Akhir Konteks]\n`;

        return ctx;
    } catch (error) {
        console.error("Error formatting SIGMA Context", error);
        return `[KONTEKS DATA SIGMA]\nGagal memuat konteks.\n[Akhir Konteks]\n`;
    }
}

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // Fetch real SIGMA data for RAG
        const sigmaContext = await fetchSigmaContext();
        const fullSystemPrompt = `${SYSTEM_PROMPT}\n\n${sigmaContext}`;

        // Initialize Google Auth for Vertex AI
        const projectId = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

        if (!projectId) {
            console.error("Missing Vertex AI Credentials (GOOGLE_CLOUD_PROJECT)");
            return Response.json({ content: "Konfigurasi server (GCP Project ID) tidak lengkap." }, { status: 500 });
        }

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
                return Response.json({ content: "Konfigurasi Base64 Kredensial tidak valid." }, { status: 500 });
            }
        }
        // Fallback to local file path mapping if no Base64
        else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            auth = new GoogleAuth({
                scopes: 'https://www.googleapis.com/auth/cloud-platform'
            });
        }
        else {
            console.error("Missing Vertex AI Credentials (GOOGLE_CREDENTIALS_BASE64 or GOOGLE_APPLICATION_CREDENTIALS)");
            return Response.json({ content: "Konfigurasi Kredensial GCP tidak ditemukan." }, { status: 500 });
        }

        const accessToken = await auth.getAccessToken();

        // Build Vertex AI Gemini API request (gemini-2.0-flash)
        const geminiMessages = messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const vertexEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.0-flash:generateContent`;

        const response = await fetch(vertexEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: fullSystemPrompt }] },
                contents: geminiMessages,
                generationConfig: {
                    temperature: 0.3,       // Lower = more factual/consistent
                    topP: 0.8,
                    maxOutputTokens: 2048,
                }
            }),
        });

        const responseData = await response.json();

        if (!response.ok || responseData.error) {
            const errMsg = responseData.error?.message || 'Unknown error';
            console.error("Vertex AI Error:", errMsg);

            // Should rarely happen on Vertex compared to Free Tier
            if (response.status === 429 || errMsg.includes('RESOURCE_EXHAUSTED')) {
                return Response.json({
                    content: "⏳ **SIGMA Advisor sedang sibuk.** Batas Vertex AI tercapai.",
                }, { status: 200 });
            }

            return Response.json({ content: "Layanan Vertex AI tidak tersedia: " + errMsg }, { status: 500 });
        }

        const aiText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, tidak ada respons dari AI.";
        return Response.json({ content: aiText });

    } catch (error: any) {
        console.error("=== CHATBOT API ERROR ===", error.message);
        return Response.json(
            { content: "Terjadi kesalahan koneksi ke Vertex AI." },
            { status: 500 }
        );
    }
}
