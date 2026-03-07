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

async function fetchSigmaContext(): Promise<string> {
    try {
        const pkmkAdmin = createClient(
            process.env.NEXT_PUBLIC_PKMK_SUPABASE_URL!,
            process.env.PKMK_SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Fetch Pilar 1: Pelayanan Kesehatan (bultim) - 1 Month Latest
        const { data: bultimData, error: errBultim } = await supabaseAdmin
            .from('data_bultim')
            .select('*')
            .order('tahun', { ascending: false })
            .order('bulan', { ascending: false })
            .limit(39); // Approx 1 month for 39 puskesmas

        if (errBultim || !bultimData || bultimData.length === 0) {
            return `[KONTEKS DATA SIGMA]\nData tidak dapat dimuat.\n[Akhir Konteks]`;
        }

        const latestTahun = bultimData[0].tahun;
        const latestBulan = bultimData[0].bulan;
        const currentPeriodRows = bultimData.filter(d => d.tahun === latestTahun && d.bulan === latestBulan);

        // 2. Pilar 2: Indikator Balita Gizi (Parallel)
        const giziPromise = supabaseAdmin
            .from('data_balita_gizi')
            .select('*')
            .eq('tahun', latestTahun)
            .eq('bulan', latestBulan);

        // 3. Pilar 3: PKMK Data (Parallel)
        const redflagPromise = pkmkAdmin.from('balita').select('id', { count: 'exact', head: true }).eq('redflag_any', true);
        const kohortPromise = pkmkAdmin.from('kohort').select('id', { count: 'exact', head: true }).eq('status', 'AKTIF');

        const [giziRes, redflagRes, kohortRes] = await Promise.all([giziPromise, redflagPromise, kohortPromise]);

        const giziData = giziRes.data || [];
        const countRedflag = redflagRes.count || 0;
        const countKohort = kohortRes.count || 0;

        // === AGGREGATE PILAR 1 ===
        const aggBultim = currentPeriodRows.reduce((acc, d) => ({
            sasaran: acc.sasaran + (d.data_sasaran || 0),
            timbang: acc.timbang + (d.jumlah_timbang || 0),
            ukur: acc.ukur + (d.jumlah_ukur || 0),
            timbangUkur: acc.timbangUkur + (d.jumlah_timbang_ukur || 0),
            stunting: acc.stunting + (d.stunting || 0),
            underweight: acc.underweight + (d.underweight || 0),
            wasting: acc.wasting + (d.wasting || 0),
            giziBuruk: acc.giziBuruk + (d.gizi_buruk || 0),
        }), { sasaran: 0, timbang: 0, ukur: 0, timbangUkur: 0, stunting: 0, underweight: 0, wasting: 0, giziBuruk: 0 });

        const dataEntryPct = aggBultim.sasaran > 0 ? ((aggBultim.timbang / aggBultim.sasaran) * 100).toFixed(2) : '0';
        const prevStunting = aggBultim.ukur > 0 ? ((aggBultim.stunting / aggBultim.ukur) * 100).toFixed(2) : '0';
        const prevUnderweight = aggBultim.timbang > 0 ? ((aggBultim.underweight / aggBultim.timbang) * 100).toFixed(2) : '0';
        const prevWasting = aggBultim.timbangUkur > 0 ? ((aggBultim.wasting / aggBultim.timbangUkur) * 100).toFixed(2) : '0';

        // === AGGREGATE PILAR 2 ===
        const aggGizi = giziData.reduce((acc, d) => ({
            sasaranBalita: acc.sasaranBalita + (Number(d.jumlah_sasaran_balita) || 0),
            ditimbang: acc.ditimbang + (Number(d.jumlah_balita_ditimbang) || 0),
            diukurPBTB: acc.diukurPBTB + (Number(d.jumlah_balita_diukur_pbtb) || 0),
            timbangUkur: acc.timbangUkur + (Number(d.jumlah_balita_ditimbang_dan_diukur) || 0),
            stunting: acc.stunting + (Number(d.jumlah_balita_stunting) || 0),
            wasting: acc.wasting + (Number(d.jumlah_balita_wasting) || 0),
            underweight: acc.underweight + (Number(d.jumlah_balita_underweight) || 0),
            overweight: acc.overweight + (Number(d.jumlah_balita_overweight) || 0),
            asiEksklusif: acc.asiEksklusif + (Number(d.jumlah_bayi_asi_eksklusif_sampai_6_bulan) || 0),
            bayi6Bulan: acc.bayi6Bulan + (Number(d.jumlah_bayi_usia_6_bulan) || 0),
            mpasiBaik: acc.mpasiBaik + (Number(d.jumlah_anak_usia_6_23_bulan_yang_mendapat_mpasi_baik) || 0),
            anak6_23: acc.anak6_23 + (Number(d.jumlah_anak_usia_6_23_bulan) || 0),
            bbNaik: acc.bbNaik + (Number(d.jumlah_balita_naik_berat_badannya_n) || 0),
            bbTidakNaik: acc.bbTidakNaik + (Number(d.jumlah_balita_tidak_naik_berat_badannya_t) || 0),
            tatalaksanaBuruk: acc.tatalaksanaBuruk + (Number(d.jumlah_kasus_gizi_buruk_balita_6_59_bulan_mendapat_perawatan_sa) || 0),
        }), {
            sasaranBalita: 0, ditimbang: 0, diukurPBTB: 0, timbangUkur: 0,
            stunting: 0, wasting: 0, underweight: 0, overweight: 0,
            asiEksklusif: 0, bayi6Bulan: 0, mpasiBaik: 0, anak6_23: 0, bbNaik: 0, bbTidakNaik: 0, tatalaksanaBuruk: 0
        });

        // Prevalences Pilar Gizi
        const prevGiziStunting = aggGizi.diukurPBTB > 0 ? ((aggGizi.stunting / aggGizi.diukurPBTB) * 100).toFixed(2) : '0';
        const prevGiziWasting = aggGizi.timbangUkur > 0 ? ((aggGizi.wasting / aggGizi.timbangUkur) * 100).toFixed(2) : '0';
        const prevGiziUnderweight = aggGizi.ditimbang > 0 ? ((aggGizi.underweight / aggGizi.ditimbang) * 100).toFixed(2) : '0';
        const prevGiziOverweight = aggGizi.ditimbang > 0 ? ((aggGizi.overweight / aggGizi.ditimbang) * 100).toFixed(2) : '0';

        const asiPct = aggGizi.bayi6Bulan > 0 ? ((aggGizi.asiEksklusif / aggGizi.bayi6Bulan) * 100).toFixed(1) : '0';
        const mpasiPct = aggGizi.anak6_23 > 0 ? ((aggGizi.mpasiBaik / aggGizi.anak6_23) * 100).toFixed(1) : '0';

        const BULAN_NAME: Record<number, string> = {
            1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April', 5: 'Mei', 6: 'Juni',
            7: 'Juli', 8: 'Agustus', 9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
        };

        // === COMPILE MARKDOWN CONTEXT ===
        let ctx = `[KONTEKS DATA SIGMA — Data Real Kabupaten Malang Periode ${BULAN_NAME[latestBulan]} ${latestTahun}]\n\n`;

        ctx += `### PILAR 1: Pelayanan Kesehatan (Makro)\n`;
        ctx += `- Total Sasaran Balita: ${aggBultim.sasaran.toLocaleString('id-ID')} anak\n`;
        ctx += `- **Capaian Data Entry (Ditimbang): ${dataEntryPct}%** (${aggBultim.timbang.toLocaleString('id-ID')} anak)\n`;
        ctx += `- **Prevalensi Stunting: ${prevStunting}%** (${aggBultim.stunting.toLocaleString('id-ID')} anak dari ${aggBultim.ukur.toLocaleString('id-ID')} diukur)\n`;
        ctx += `- **Prevalensi Underweight: ${prevUnderweight}%** (${aggBultim.underweight.toLocaleString('id-ID')} anak dari ${aggBultim.timbang.toLocaleString('id-ID')} ditimbang)\n`;
        ctx += `- **Prevalensi Wasting: ${prevWasting}%** (${aggBultim.wasting.toLocaleString('id-ID')} anak dari ${aggBultim.timbangUkur.toLocaleString('id-ID')} ditimbang & diukur)\n\n`;

        ctx += `### PILAR 2: Indikator Balita Gizi (Fundamental/Akar Masalah)\n`;
        ctx += `- **Total Sasaran Balita (Gizi)**: ${aggGizi.sasaranBalita.toLocaleString('id-ID')} anak\n`;
        ctx += `- **Indikator Stunting: ${prevGiziStunting}%** (${aggGizi.stunting.toLocaleString('id-ID')} stunting dari ${aggGizi.diukurPBTB.toLocaleString('id-ID')} balita diukur PBTB)\n`;
        ctx += `- **Indikator Wasting: ${prevGiziWasting}%** (${aggGizi.wasting.toLocaleString('id-ID')} wasting dari ${aggGizi.timbangUkur.toLocaleString('id-ID')} balita ditimbang dan diukur)\n`;
        ctx += `- **Indikator Underweight: ${prevGiziUnderweight}%** (${aggGizi.underweight.toLocaleString('id-ID')} underweight dari ${aggGizi.ditimbang.toLocaleString('id-ID')} balita ditimbang)\n`;
        ctx += `- **Indikator Overweight: ${prevGiziOverweight}%** (${aggGizi.overweight.toLocaleString('id-ID')} overweight dari ${aggGizi.ditimbang.toLocaleString('id-ID')} balita ditimbang)\n`;
        ctx += `- **Capaian ASI Eksklusif (bayi 6bln): ${asiPct}%** (${aggGizi.asiEksklusif.toLocaleString('id-ID')} bayi)\n`;
        ctx += `- **Capaian MPASI Baik (anak 6-23bln): ${mpasiPct}%** (${aggGizi.mpasiBaik.toLocaleString('id-ID')} anak)\n`;
        ctx += `- Tren Berat Badan: Naik (N)=${aggGizi.bbNaik.toLocaleString('id-ID')}, Tidak Naik (T)=${aggGizi.bbTidakNaik.toLocaleString('id-ID')}\n`;
        ctx += `- Tatalaksana: ${aggGizi.tatalaksanaBuruk.toLocaleString('id-ID')} balita gizi buruk mendapat perawatan.\n\n`;

        ctx += `### PILAR 3: Intervensi PKMK (Analytical Add-on)\n`;
        ctx += `*(Gunakan data ini untuk analisis penanganan kasus spesifik/kuratif)*\n`;
        ctx += `- Jumlah Balita Terindikasi **Redflag**: ${countRedflag.toLocaleString('id-ID')} anak\n`;
        ctx += `- Jumlah Balita dalam **Kohort Aktif (Monitoring PKMK)**: ${countKohort.toLocaleString('id-ID')} anak\n\n`;

        // === Puskesmas Rankings ===
        ctx += `### Analisis Top 5 Puskesmas (Stunting & Entry)\n`;
        const sortedPuskesmas = [...currentPeriodRows].map(d => {
            const stuntingPct = d.jumlah_ukur > 0 ? (d.stunting / d.jumlah_ukur) * 100 : 0;
            const entryPct = d.data_sasaran > 0 ? (d.jumlah_timbang / d.data_sasaran) * 100 : 0;
            return { nama: d.puskesmas, sasaran: d.data_sasaran, stuntingPct, entryPct, stunting: d.stunting };
        });

        // Stunting Tertinggi
        const topStunting = [...sortedPuskesmas].sort((a, b) => b.stuntingPct - a.stuntingPct).slice(0, 5);
        ctx += `**Puskesmas dgn Prevalensi Stunting TERTINGGI:**\n`;
        topStunting.forEach((p, i) => ctx += `${i + 1}. ${p.nama}: ${p.stuntingPct.toFixed(1)}% (${p.stunting} anak)\n`);

        // Entry Terendah & Tertinggi
        const sortedEntry = [...sortedPuskesmas].sort((a, b) => b.entryPct - a.entryPct);
        const topEntry = sortedEntry.slice(0, 5);
        const bottomEntry = sortedEntry.slice(-5).reverse();

        ctx += `\n**Puskesmas dgn Capaian Data Entry TERTINGGI:**\n`;
        topEntry.forEach((p, i) => ctx += `${i + 1}. ${p.nama}: ${p.entryPct.toFixed(1)}%\n`);

        ctx += `\n**Puskesmas dgn Capaian Data Entry TERENDAH:**\n`;
        bottomEntry.forEach((p, i) => ctx += `${i + 1}. ${p.nama}: ${p.entryPct.toFixed(1)}%\n`);

        ctx += `\n[Akhir Konteks Data SIGMA]\n`;
        return ctx;

    } catch (err: any) {
        console.error("RAG Error:", err.message);
        return `[KONTEKS DATA SIGMA]\nSistem gagal mengumpulkan data RAG terpadu: ${err.message}\n[Akhir Konteks]`;
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
