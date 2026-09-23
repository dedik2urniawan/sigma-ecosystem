import { NextRequest, NextResponse } from "next/server";
import { generateGeminiContentWithFallback } from "@/lib/gemini";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Kamu adalah SIGMA Geo AI Executive Advisor — sistem kecerdasan buatan analitik spasial dan kebijakan kesehatan masyarakat untuk Dinas Kesehatan Kabupaten Malang.
Kamu ahli dalam:
1. Epidemiologi Spasial & Analisis Hotspot Getis-Ord Gi* (konsentrasi spasial stunting dan severely stunted).
2. Inferensi Kausal Multidimensi Stunting berbasis Framework UNICEF & Kemenkes RI (26 determinan: WASH/Sanitasi, Infeksi berulang ISPA/Diare, Pola Asuh MP-ASI, Kesehatan Maternal/BBLR).
3. Resiliensi Rantai Pasok Logistik PKMK (Pangan Olahan untuk Keperluan Medis Khusus) di 39 Puskesmas (Buffer Stock, Lead Time, Risk of Zero-Stockout).
4. Rekomendasi Kebijakan Preskriptif (Prescriptive Policy Intervention) yang terukur dan aplikatif bagi Kepala Dinas Kesehatan, Camat, dan Kepala Puskesmas.

ATURAN ANALISIS & RAG:
- Selalu hubungkan ketiga pilar (Spasial Hotspot -> Determinan Lapangan -> Logistik PKMK).
- Tunjukkan korelasi antara klaster beban kasus tertinggi dengan akar masalah dominan di wilayah tersebut.
- Identifikasi Puskesmas yang berada dalam status KRITIS atau MENIPIS stoknya terhadap lonjakan demand kasus stunting aktif di wilayah kerjanya.
- Berikan rekomendasi kebijakan konkret dengan timeframe yang jelas (Jangka Pendek 1-2 minggu, Jangka Menengah 1-3 bulan, Jangka Panjang).

FORMAT OUTPUT:
Kamu HARUS merespons dalam format JSON murni yang valid dengan struktur berikut:
{
  "executiveSummary": "Ringkasan eksekutif 2-3 paragraf padat tentang situasi beban stunting wilayah...",
  "spatialHotspotInsights": {
    "summary": "Analisis kerapatan hotspot Getis-Ord Gi*...",
    "priorityClusters": [
      {
        "name": "Nama Klaster",
        "riskLevel": "CRITICAL_HOTSPOT / HIGH_HOTSPOT",
        "stuntingCount": 288,
        "severeRatio": "26%",
        "dominantFactor": "Sanitasi & Air Minum (WASH)",
        "clinicalImpact": "Dampak klinis yang diamati..."
      }
    ]
  },
  "causalDeterminantsInsights": {
    "summary": "Analisis inferensi 26 faktor determinan lapangan...",
    "primaryRootCause": "Faktor dominan utama...",
    "secondaryRootCause": "Faktor dominan kedua...",
    "actionableCorrection": "Langkah korektif spesifik di tingkat posyandu/keluarga..."
  },
  "supplyChainLogisticsInsights": {
    "summary": "Analisis supply-demand formula PKMK...",
    "vulnerablePuskesmasCount": 0,
    "stockoutRiskLevel": "RENDAH / SEDANG / TINGGI",
    "redistributionPlan": "Rencana redistribusi stok antar Puskesmas..."
  },
  "prescriptiveActionPlan": [
    {
      "timeframe": "Jangka Pendek (1-2 Minggu)",
      "action": "Tindakan mendesak spesifik...",
      "targetArea": "Wilayah / Puskesmas fokus...",
      "stakeholder": "Dinas Kesehatan / Puskesmas / Kader"
    },
    {
      "timeframe": "Jangka Menengah (1-3 Bulan)",
      "action": "Tindakan intervensi lanjutan...",
      "targetArea": "Wilayah fokus...",
      "stakeholder": "Lintas Sektor / Dinkes / Posyandu"
    },
    {
      "timeframe": "Jangka Panjang (3-6 Bulan)",
      "action": "Program berkelanjutan & monitoring evaluasi...",
      "targetArea": "Kabupaten Malang",
      "stakeholder": "Bupati / Dinkes / Disperkim"
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { summary, hotspotClusters, determinanStats, puskesmasLogistik } = body;

    const userPrompt = `Lakukan analisis resume komprehensif berbasis data riil SIGMA Geo AI Kabupaten Malang berikut:

=== DATA RINGKASAN POPULASI SPASIAL ===
- Total Balita Terdata: ${summary?.totalBalita || 728}
- Total Kasus Stunting: ${summary?.totalStunted || 628} (${summary?.totalBalita ? Math.round((summary.totalStunted / summary.totalBalita) * 100) : 86}%)
- Kasus Sangat Pendek (Severely Stunted): ${summary?.totalSeverelyStunted || 174} (${summary?.totalStunted ? Math.round((summary.totalSeverelyStunted / summary.totalStunted) * 100) : 28}%)
- Normal: ${summary?.totalNormal || 100}
- Akurasi Geotagging: 100% (Spasial Presisi)

=== KLASTER HOTSPOT SPASIAL (GETIS-ORD GI*) ===
${JSON.stringify(hotspotClusters || [], null, 2)}

=== SURVEY DETERMINAN LAPANGAN (26 FAKTOR) ===
- Total Survey Terkumpul: ${determinanStats?.totalSurveys || 38}
- Masalah Pola ASI & MP-ASI: ${determinanStats?.asiMpasiIssues || 29} kasus (${determinanStats?.mpasiPct || 76}%)
- Masalah Infeksi Berulang (ISPA / Diare): ${determinanStats?.infeksiIssues || 13} kasus (${determinanStats?.infeksiPct || 34}%)
- Masalah Sanitasi & Air Bersih (WASH): ${determinanStats?.washIssues || 2} kasus (${determinanStats?.washPct || 5}%)
- Riwayat BBLR & Kesehatan Maternal: ${determinanStats?.bblrIssues || 19} kasus

=== STATUS LOGISTIK & RANTAI PASOK PKMK (39 PUSKESMAS) ===
- Puskesmas Rentan / Stok Menipis: ${(puskesmasLogistik || []).filter((p: any) => p.stockStatus !== "AMAN").length} PKM
- Detail 5 Puskesmas Teratas:
${JSON.stringify((puskesmasLogistik || []).slice(0, 5), null, 2)}

Susun resume analitik preskriptif dalam format JSON yang rigid dan komprehensif sesuai instruksi sistem prompt.`;

    const aiResult = await generateGeminiContentWithFallback(
      [{ role: "user", parts: [{ text: userPrompt }] }],
      {
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }
    );

    if (!aiResult.success || !aiResult.text) {
      return NextResponse.json(
        { error: aiResult.error || "Gagal memproses AI Geo Analytics" },
        { status: 503 }
      );
    }

    const rawJsonText = aiResult.text;
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawJsonText);
    } catch {
      const cleanedText = rawJsonText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleanedText);
    }

    return NextResponse.json({
      success: true,
      modelUsed: aiResult.modelUsed,
      generatedAt: new Date().toISOString(),
      analysis: parsedResult,
    });
  } catch (err: any) {
    console.error("[POST /api/pkmk/ai/geo-advisor] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error saat memproses AI Geo Analytics" },
      { status: 500 }
    );
  }
}
