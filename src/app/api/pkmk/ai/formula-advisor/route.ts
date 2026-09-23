import { NextRequest, NextResponse } from "next/server";
import { generateGeminiContentWithFallback } from "@/lib/gemini";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Kamu adalah SIGMA AI Clinical Efficacy Analyst — sistem kecerdasan buatan analitik klinis efikasi formulasi PKMK (Pangan Olahan untuk Keperluan Medis Khusus) untuk Dinas Kesehatan Kabupaten Malang.

Kamu ahli dalam:
1. Analisis efikasi formulasi nutrisi medis khusus (ONS/PKMK) berbasis outcome klinis balita stunting.
2. Interpretasi statistik Z-Score WHO (HAZ/WAZ/WHZ) dan Weight Gain Velocity (WGV) berdasarkan standar Nelson Pediatrics.
3. Evaluasi komparatif antar merek formulasi PKMK (Dangrow, Isocal, Proteed, SGM Optigrowth, SGM Ananda Gain 100).
4. Rekomendasi pemilihan formulasi berdasarkan evidence-based nutritional science.

STANDAR KLINIS REFERENSI:
- HAZ (Height-for-Age Z-Score): ≥ -2.0 SD = Normal; -2.0 s/d -3.0 SD = Stunted; < -3.0 SD = Severely Stunted
- WAZ (Weight-for-Age Z-Score): ≥ -2.0 SD = Normal; < -2.0 SD = Underweight
- WHZ (Weight-for-Height Z-Score): ≥ -2.0 SD = Normal; < -2.0 SD = Wasted
- Weight Gain Velocity (WGV): ≥ 15 g/hari = Adekuat (Nelson Catch-Up Standard); 10–14 g/hari = Cukup; < 10 g/hari = Tidak Adekuat
- HAZ Delta positif (catch-up) selama intervensi = indikator efikasi linear growth yang kuat
- Response Rate ≥ 60% = efikasi populasi sangat baik; 40–59% = baik; < 40% = perlu evaluasi

FORMAT OUTPUT: Kamu HARUS merespons dalam format JSON murni yang valid dengan struktur berikut:
{
  "overallConclusion": "Kesimpulan komparatif keseluruhan 2-3 kalimat tentang lanskap efikasi formulasi PKMK yang tersedia...",
  "formulaInsights": [
    {
      "formula": "Nama Formula",
      "efikasiKlinis": "Excellent / Good / Moderate / Poor",
      "clinicalNarrative": "Analisis klinis 2-3 kalimat spesifik tentang performa formula ini berdasarkan data...",
      "keyStrength": "Keunggulan utama berdasarkan data...",
      "areaOfConcern": "Area yang perlu diperhatikan atau null jika tidak ada...",
      "recommendation": "Rekomendasi penggunaan klinis spesifik..."
    }
  ],
  "bestFormula": {
    "name": "Nama formula terbaik berdasarkan composite score",
    "rationale": "Alasan berbasis data klinis mengapa formula ini unggul..."
  },
  "attentionFormula": {
    "name": "Nama formula yang paling perlu evaluasi atau null",
    "rationale": "Alasan klinis mengapa perlu evaluasi atau intervensi..."
  },
  "populationLevelInsight": "Wawasan tingkat populasi tentang pola pemberian PKMK di Kabupaten Malang...",
  "policyRecommendation": "Rekomendasi kebijakan teknis untuk Dinas Kesehatan terkait optimasi pemilihan dan distribusi formulasi PKMK..."
}

PENTING:
- Analisis harus berbasis DATA yang diberikan, bukan asumsi
- Gunakan Bahasa Indonesia yang profesional dan ilmiah untuk tenaga kesehatan
- Sebutkan nilai angka spesifik dari data dalam narasi
- Jika data terbatas (n_balita kecil), nyatakan sebagai catatan keterbatasan sampel`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { formulaEfikasi, summary } = body;

    if (!formulaEfikasi || formulaEfikasi.length === 0) {
      return NextResponse.json({ error: "Data efikasi formulasi tidak tersedia" }, { status: 400 });
    }

    const formulaDetailText = (formulaEfikasi as any[])
      .map(
        (f: any, i: number) => `
  ${i + 1}. ${f.formula} (Peringkat Efikasi Score: ${f.efikasi_score}/10)
     - Jumlah Balita: ${f.n_balita} balita | ${f.n_episode} episode pemberian
     - HAZ (TB/U): ${f.mean_haz !== null ? f.mean_haz + " SD" : "Data tidak tersedia"}
     - WAZ (BB/U): ${f.mean_waz !== null ? f.mean_waz + " SD" : "Data tidak tersedia"}
     - WHZ (BB/TB): ${f.mean_whz !== null ? f.mean_whz + " SD" : "Data tidak tersedia"}
     - HAZ Delta (Catch-Up): ${f.mean_haz_delta !== null ? (f.mean_haz_delta > 0 ? "+" : "") + f.mean_haz_delta + " SD" : "Data tidak tersedia"}
     - Weight Gain Velocity: ${f.mean_velocity_gday !== null ? f.mean_velocity_gday + " g/hari" : "Data tidak tersedia"}
     - Response Rate (≥15 g/hr): ${f.response_rate_pct}%
     - Distribusi Stunting: Sangat Pendek ${f.severe_stunting_pct}% | Pendek ${f.stunted_pct}% | Normal+ ${f.normal_pct}%
     - Efikasi Klinis (Sistem): ${f.efikasi_klinis}`
      )
      .join("\n");

    const userPrompt = `Lakukan analisis klinis efikasi komparatif formulasi PKMK/ONS berdasarkan data monitoring kohort balita stunting Kabupaten Malang berikut:

=== RINGKASAN POPULASI PENERIMA PKMK ===
- Total Jenis Formulasi Aktif: ${summary?.totalFormulaTypes || formulaEfikasi.length}
- Total Balita Menerima PKMK: ${summary?.totalBalitaFormula || 0} kohort
- Total Episode Pemberian: ${(summary?.totalEpisode || 0).toLocaleString()} pemberian tercatat
- Formula Efikasi Tertinggi (Sistem): ${summary?.bestFormula || "-"}

=== DATA EFIKASI PER FORMULASI (Diurutkan: Efikasi Tertinggi → Terendah) ===
${formulaDetailText}

=== KONTEKS KLINIS ===
- Intervensi: Pemberian PKMK selama program kohort balita stunting (12 minggu)
- Target Populasi: Balita 0-59 bulan dengan diagnosis stunting/severely stunted
- Standar: WHO Z-Score, Nelson WGV ≥15 g/hari, Kemenkes RI Pedoman PKMK
- Wilayah: Kabupaten Malang, Jawa Timur

Berikan analisis klinis efikasi komparatif yang komprehensif, objektif, dan berbasis data dalam format JSON yang diminta.`;

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
        { error: aiResult.error || "Gagal memproses SIGMA AI Formula Analytics" },
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
    console.error("[POST /api/pkmk/ai/formula-advisor] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error saat memproses SIGMA AI Formula Analytics" },
      { status: 500 }
    );
  }
}
