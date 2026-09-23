import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { pkmkSupabase } from "@/lib/pkmkSupabase";
import { getPkmkAppUser } from "@/lib/pkmkAppUser";

const KECAMATAN_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "gondanglegi": { lat: -8.1764, lng: 112.6394 },
  "pagelaran": { lat: -8.1956, lng: 112.6103 },
  "kepanjen": { lat: -8.1306, lng: 112.5714 },
  "ngajum": { lat: -8.0833, lng: 112.5333 },
  "pakisaji": { lat: -8.0667, lng: 112.5833 },
  "sumberpucung": { lat: -8.1583, lng: 112.4833 },
  "kromengan": { lat: -8.1333, lng: 112.5167 },
  "kalipare": { lat: -8.2000, lng: 112.4500 },
  "donomulyo": { lat: -8.3000, lng: 112.4333 },
  "turen": { lat: -8.1678, lng: 112.6989 },
  "wajak": { lat: -8.1333, lng: 112.7000 },
  "bululawang": { lat: -8.0833, lng: 112.6333 },
  "tajinan": { lat: -8.0500, lng: 112.6833 },
  "tumpang": { lat: -7.9983, lng: 112.7667 },
  "poncokusumo": { lat: -8.0500, lng: 112.8000 },
  "jabung": { lat: -7.9167, lng: 112.7500 },
  "pakis": { lat: -7.9547, lng: 112.7142 },
  "lawang": { lat: -7.8389, lng: 112.6953 },
  "singosari": { lat: -7.8925, lng: 112.6653 },
  "karangploso": { lat: -7.8833, lng: 112.6000 },
  "dau": { lat: -7.9333, lng: 112.5833 },
  "wagir": { lat: -8.0167, lng: 112.5833 },
  "pujon": { lat: -7.8333, lng: 112.4667 },
  "ngantang": { lat: -7.8489, lng: 112.3556 },
  "kasembon": { lat: -7.8000, lng: 112.3333 },
  "bantur": { lat: -8.3167, lng: 112.5833 },
  "gedangan": { lat: -8.3333, lng: 112.6667 },
  "sumbermanjing": { lat: -8.3667, lng: 112.7167 },
  "dampit": { lat: -8.2122, lng: 112.7517 },
  "tirtoyudo": { lat: -8.2667, lng: 112.8167 },
  "ampelgading": { lat: -8.2333, lng: 112.8500 },
};

const DESA_TO_KECAMATAN: Record<string, string> = {
  "gondanglegi wetan": "gondanglegi",
  "gondanglegi kulon": "gondanglegi",
  "putat kidul": "gondanglegi",
  "ganjaran": "gondanglegi",
  "sananrejo": "turen",
  "sumberpucung": "sumberpucung",
  "sumberputih": "sumberpucung",
  "karangkates": "sumberpucung",
  "kepanjen": "kepanjen",
  "dilem": "kepanjen",
  "cepokomulyo": "kepanjen",
  "mangliawan": "pakis",
  "tajinan": "tajinan",
  "bululawang": "bululawang",
  "krebet": "bululawang",
  "pajaran": "pakisaji",
  "sutojayan": "pakisaji",
  "wringinanom": "singosari",
  "candirejo": "singosari",
  "pagentan": "singosari",
  "singosari": "singosari",
  "lawang": "lawang",
  "bedali": "lawang",
  "tumpang": "tumpang",
  "jabung": "jabung",
};

function addJitter(coord: { lat: number; lng: number }, id: string): { lat: number; lng: number } {
  const s1 = ((id.charCodeAt(0) || 65) * 137 + (id.charCodeAt(2) || 66) * 31) % 100;
  const s2 = ((id.charCodeAt(1) || 67) * 97 + (id.charCodeAt(3) || 68) * 53) % 100;
  return {
    lat: coord.lat + (s1 / 100 - 0.5) * 0.014,
    lng: coord.lng + (s2 / 100 - 0.5) * 0.018,
  };
}

function resolveGeopoint(desa: string | null, kec: string | null, id: string): { lat: number; lng: number } {
  const desaLower = (desa || "").toLowerCase().trim();
  const kecLower = (kec || "").toLowerCase().trim();

  if (desaLower && DESA_TO_KECAMATAN[desaLower]) {
    const kecName = DESA_TO_KECAMATAN[desaLower];
    const coord = KECAMATAN_COORDINATES[kecName];
    if (coord) return addJitter(coord, id);
  }

  if (kecLower) {
    for (const [kecName, coord] of Object.entries(KECAMATAN_COORDINATES)) {
      if (kecLower.includes(kecName) || kecName.includes(kecLower)) {
        return addJitter(coord, id);
      }
    }
  }

  if (desaLower) {
    for (const [kecName, coord] of Object.entries(KECAMATAN_COORDINATES)) {
      if (desaLower.includes(kecName)) {
        return addJitter(coord, id);
      }
    }
  }

  const seed = (id || "z").charCodeAt(0) + (id || "z").charCodeAt(id.length - 1 || 0);
  return {
    lat: -8.1333 + (Math.sin(seed * 3.14) * 0.18),
    lng: 112.5667 + (Math.cos(seed * 2.71) * 0.20),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const appUser = await getPkmkAppUser(searchParams);
    const isAdminPuskesmas = appUser.role === 'admin_puskesmas' && !!appUser.puskesmas_id;
    const userPuskesmasId = isAdminPuskesmas ? appUser.puskesmas_id : null;

    let puskesmasName: string | null = null;
    if (userPuskesmasId) {
      const { data: pkmData } = await pkmkSupabase
        .from("ref_puskesmas")
        .select("nama")
        .eq("id", userPuskesmasId)
        .single();
      puskesmasName = pkmData?.nama || null;
    }

    let balitaQuery = pkmkSupabase
      .from("balita")
      .select("id, nik, nama_balita, desa_kel, kec, puskesmas_id, latitude, longitude, tgl_lahir, jk");

    if (userPuskesmasId) {
      balitaQuery = balitaQuery.eq("puskesmas_id", userPuskesmasId);
    }

    const { data: balitaRaw, error: balitaErr } = await balitaQuery.limit(2000);
    if (balitaErr) {
      return NextResponse.json({ error: balitaErr.message }, { status: 500 });
    }

    if (!balitaRaw || balitaRaw.length === 0) {
      return NextResponse.json({
        role: appUser.role,
        puskesmasId: userPuskesmasId,
        puskesmasName,
        summary: { totalBalita: 0, totalStunted: 0, totalSeverelyStunted: 0, totalNormal: 0, totalRealGps: 0, coveragePct: 0 },
        determinanStats: { totalSurveys: 0, washIssues: 0, infeksiIssues: 0, asiMpasiIssues: 0, mpasiPct: 0, infeksiPct: 0, washPct: 0 },
        hotspotClusters: [],
        puskesmasLogistik: [],
        balitaPoints: [],
      });
    }

    // Step 2: Kohort and latest Antro
    const { data: kohortRaw } = await pkmkSupabase.from("kohort").select("id, balita_id, status").limit(2000);
    const allKohortIds = (kohortRaw || []).map((k) => k.id);
    let antroMap = new Map<string, { zs_tbu: number | null; bb_kg: number | null; tb_cm: number | null }>();

    if (allKohortIds.length > 0) {
      const batchSize = 300;
      for (let i = 0; i < allKohortIds.length; i += batchSize) {
        const batch = allKohortIds.slice(i, i + batchSize);
        const { data: antroRaw } = await pkmkSupabase
          .from("monitoring_antropometri")
          .select("kohort_id, zs_tbu, bb_kg, tb_cm, tanggal")
          .in("kohort_id", batch)
          .order("tanggal", { ascending: false })
          .limit(batchSize * 10);

        (antroRaw || []).forEach((a) => {
          const kohort = (kohortRaw || []).find((k) => k.id === a.kohort_id);
          if (!kohort) return;
          const balitaId = kohort.balita_id;
          if (!antroMap.has(balitaId) && (a.zs_tbu != null || a.bb_kg != null)) {
            antroMap.set(balitaId, {
              zs_tbu: a.zs_tbu != null ? Number(a.zs_tbu) : null,
              bb_kg: a.bb_kg != null ? Number(a.bb_kg) : null,
              tb_cm: a.tb_cm != null ? Number(a.tb_cm) : null,
            });
          }
        });
      }
    }

    // Step 3: Determinan Surveys
    const allowedBalitaIds = new Set((balitaRaw || []).map((b) => b.id));
    const { data: determinanRaw } = await pkmkSupabase
      .from("survey_determinan")
      .select("id, balita_id, risk_score, risk_category, q2_1_lbw, q3_1_ebf, q3_5_mdd, q4_1_diarrhea, q4_2_ari, q5_1_safe_water, q5_3_improved_san, q5_7_low_ses")
      .limit(2000);

    const relevantDeterminan = (determinanRaw || []).filter((d) => allowedBalitaIds.has(d.balita_id));
    const determinanMap = new Map<string, any>();
    relevantDeterminan.forEach((d) => {
      if (d.balita_id) determinanMap.set(d.balita_id, d);
    });

    let washIssues = 0, infeksiIssues = 0, asiMpasiIssues = 0, bblrIssues = 0;
    relevantDeterminan.forEach((d) => {
      if (d.q5_1_safe_water === "Tidak" || d.q5_3_improved_san === "Tidak") washIssues++;
      if (d.q4_1_diarrhea === "Ya" || d.q4_2_ari === "Ya") infeksiIssues++;
      if (d.q3_1_ebf === "Tidak" || d.q3_5_mdd === "Tidak") asiMpasiIssues++;
      if (d.q2_1_lbw === "Ya") bblrIssues++;
    });

    // Step 4: Puskesmas & Logistics
    let pkmQuery = pkmkSupabase.from("ref_puskesmas").select("id, nama, kecamatan");
    let stokQuery = pkmkSupabase.from("logistik_stok_puskesmas").select("puskesmas_id, stok_tersedia, stok_minimum");

    if (userPuskesmasId) {
      pkmQuery = pkmQuery.eq("id", userPuskesmasId);
      stokQuery = stokQuery.eq("puskesmas_id", userPuskesmasId);
    }

    const { data: puskesmasRaw } = await pkmQuery;
    const { data: stokRaw } = await stokQuery;

    const stokMap = new Map<string, { totalStok: number; minStok: number }>();
    (stokRaw || []).forEach((s) => {
      const curr = stokMap.get(s.puskesmas_id) || { totalStok: 0, minStok: 0 };
      curr.totalStok += Number(s.stok_tersedia || 0);
      curr.minStok += Number(s.stok_minimum || 0);
      stokMap.set(s.puskesmas_id, curr);
    });

    // Step 5: Build balita points
    let countStunted = 0, countSevere = 0, countNormal = 0, countRealGps = 0;

    const clusterDef = [
      { key: "gondanglegi", name: "Klaster Gondanglegi – Pagelaran", lat: -8.1850, lng: 112.6250, keywords: ["gondanglegi", "pagelaran"] },
      { key: "kepanjen",    name: "Klaster Kepanjen – Ngajum – Pakisaji", lat: -8.1150, lng: 112.5550, keywords: ["kepanjen", "ngajum", "pakisaji"] },
      { key: "sumberpucung", name: "Klaster Sumberpucung – Kromengan", lat: -8.1550, lng: 112.4850, keywords: ["sumberpucung", "kromengan", "kalipare", "donomulyo"] },
      { key: "turen",       name: "Klaster Turen – Dampit – Wajak", lat: -8.1900, lng: 112.7200, keywords: ["turen", "dampit", "wajak", "ampelgading", "tirtoyudo"] },
      { key: "singosari",   name: "Klaster Singosari – Lawang – Karangploso", lat: -7.8650, lng: 112.6500, keywords: ["singosari", "lawang", "karangploso", "jabung", "pakis"] },
      { key: "bantur",      name: "Klaster Malang Selatan (Bantur – Gedangan)", lat: -8.3200, lng: 112.6200, keywords: ["bantur", "gedangan", "sumbermanjing", "donomulyo"] },
    ];

    const clusterBuckets: Record<string, any> = {};
    clusterDef.forEach((c) => {
      clusterBuckets[c.key] = { name: c.name, center: { lat: c.lat, lng: c.lng }, stuntingCount: 0, severeCount: 0, totalBalita: 0, washCount: 0, infeksiCount: 0, mpasiCount: 0, lbwCount: 0 };
    });

    const puskesmasCaseMap = new Map<string, { total: number; stunted: number }>();

    const balitaPoints = (balitaRaw || []).map((b: any) => {
      const antro = antroMap.get(b.id);
      const zsTbu = antro?.zs_tbu ?? null;
      const bbKg = antro?.bb_kg ?? null;
      const tbCm = antro?.tb_cm ?? null;

      let statusStunting = "Normal";
      let severity = "NORMAL";

      if (zsTbu !== null) {
        if (zsTbu < -3.0) {
          statusStunting = "Sangat Pendek (Severely Stunted)";
          severity = "SEVERELY_STUNTED";
          countSevere++;
          countStunted++;
        } else if (zsTbu < -2.0) {
          statusStunting = "Pendek (Stunted)";
          severity = "STUNTED";
          countStunted++;
        } else {
          countNormal++;
        }
      } else {
        statusStunting = "Pendek (Stunted)";
        severity = "STUNTED";
        countStunted++;
      }

      const hasGps = b.latitude != null && b.longitude != null && Number(b.latitude) !== 0;
      if (hasGps) countRealGps++;
      const coord = hasGps ? { lat: Number(b.latitude), lng: Number(b.longitude) } : resolveGeopoint(b.desa_kel, b.kec, b.id);

      const det = determinanMap.get(b.id);
      let dominantFactor = "WASH / Pola Pengasuhan";
      if (det) {
        if (det.q5_1_safe_water === "Tidak" || det.q5_3_improved_san === "Tidak") dominantFactor = "Sanitasi & Air Minum (WASH)";
        else if (det.q4_1_diarrhea === "Ya" || det.q4_2_ari === "Ya") dominantFactor = "Penyakit Infeksi Berulang";
        else if (det.q3_1_ebf === "Tidak" || det.q3_5_mdd === "Tidak") dominantFactor = "Pola ASI & Keragaman MP-ASI";
        else if (det.q2_1_lbw === "Ya") dominantFactor = "Riwayat BBLR & Kesehatan Ibu";
      }

      const locText = `${b.desa_kel || ""} ${b.kec || ""}`.toLowerCase();
      let clusterKey = "gondanglegi";
      for (const c of clusterDef) {
        if (c.keywords.some((kw) => locText.includes(kw))) {
          clusterKey = c.key;
          break;
        }
      }

      const bucket = clusterBuckets[clusterKey];
      bucket.totalBalita++;
      if (severity !== "NORMAL") {
        bucket.stuntingCount++;
        if (severity === "SEVERELY_STUNTED") bucket.severeCount++;
      }
      if (det) {
        if (det.q5_1_safe_water === "Tidak" || det.q5_3_improved_san === "Tidak") bucket.washCount++;
        if (det.q4_1_diarrhea === "Ya" || det.q4_2_ari === "Ya") bucket.infeksiCount++;
        if (det.q3_1_ebf === "Tidak" || det.q3_5_mdd === "Tidak") bucket.mpasiCount++;
        if (det.q2_1_lbw === "Ya") bucket.lbwCount++;
      } else {
        bucket.washCount++;
      }

      if (b.puskesmas_id) {
        const ps = puskesmasCaseMap.get(b.puskesmas_id) || { total: 0, stunted: 0 };
        ps.total++;
        if (severity !== "NORMAL") ps.stunted++;
        puskesmasCaseMap.set(b.puskesmas_id, ps);
      }

      return {
        id: b.id,
        nik: b.nik,
        nama_balita: b.nama_balita || "Balita",
        desa_kel: b.desa_kel || "Kabupaten Malang",
        kec: b.kec || "Kabupaten Malang",
        puskesmas_id: b.puskesmas_id,
        latitude: coord.lat,
        longitude: coord.lng,
        isRealGps: hasGps,
        zs_tbu: zsTbu,
        weight_kg: bbKg,
        height_cm: tbCm,
        status_stunting: statusStunting,
        severity,
        determinan: {
          risk_score: det?.risk_score ?? (severity === "SEVERELY_STUNTED" ? 16 : 9),
          risk_category: det?.risk_category ?? (severity === "SEVERELY_STUNTED" ? "Tinggi" : "Sedang"),
          dominant_factor: dominantFactor,
        },
      };
    });

    // Step 6: Hotspot clusters
    const hotspotClusters = Object.values(clusterBuckets)
      .filter((c: any) => c.totalBalita > 0)
      .map((c: any) => {
        const stuntN = c.stuntingCount;
        const severeN = c.severeCount;
        const severeRatioPct = stuntN > 0 ? Math.round((severeN / stuntN) * 100) : 0;
        let riskLevel = "MODERATE_HOTSPOT";
        if (stuntN >= 50 || severeRatioPct >= 30) riskLevel = "CRITICAL_HOTSPOT";
        else if (stuntN >= 25 || severeRatioPct >= 20) riskLevel = "HIGH_HOTSPOT";

        const maxCount = Math.max(c.washCount, c.infeksiCount, c.mpasiCount, c.lbwCount);
        let domCause = "Sanitasi & Air Minum (WASH)";
        if (maxCount === c.infeksiCount && c.infeksiCount > c.washCount) domCause = "Penyakit Infeksi (Diare & ISPA)";
        else if (maxCount === c.mpasiCount && c.mpasiCount > c.washCount) domCause = "Pola MP-ASI & ASI Eksklusif";
        else if (maxCount === c.lbwCount && c.lbwCount > c.washCount) domCause = "Riwayat BBLR & Gizi Ibu";

        return {
          name: c.name,
          center: c.center,
          radius_m: riskLevel === "CRITICAL_HOTSPOT" ? 3400 : riskLevel === "HIGH_HOTSPOT" ? 2800 : 2200,
          stuntingCount: stuntN,
          totalBalita: c.totalBalita,
          severeRatio: `${severeRatioPct}%`,
          dominantCause: domCause,
          riskLevel,
        };
      })
      .sort((a: any, b: any) => b.stuntingCount - a.stuntingCount);

    // Step 7: Puskesmas Logistics
    const puskesmasLogistik = (puskesmasRaw || []).map((p: any) => {
      const coord = resolveGeopoint(p.nama, null, p.id);
      const stok = stokMap.get(p.id) || { totalStok: 60, minStok: 50 };
      const cases = puskesmasCaseMap.get(p.id) || { total: 0, stunted: 0 };
      const monthlyDemand = Math.max(15, cases.stunted * 3);
      let stockStatus = "AMAN";
      if (stok.totalStok <= 0) stockStatus = "HABIS";
      else if (stok.totalStok < monthlyDemand) stockStatus = "MENIPIS";
      const vulScore = monthlyDemand > 0 ? Math.max(0, Math.min(100, Math.round((1 - stok.totalStok / monthlyDemand) * 100))) : 0;
      return {
        id: p.id, nama: p.nama, kode: p.kode_pkm,
        latitude: coord.lat, longitude: coord.lng,
        totalStok: stok.totalStok, minStok: stok.minStok,
        stuntingCases: cases.stunted, totalBalita: cases.total,
        monthlyDemand, stockStatus, vulnerabilityScore: vulScore,
      };
    });

    return NextResponse.json({
      role: appUser.role,
      puskesmasId: userPuskesmasId,
      puskesmasName,
      summary: {
        totalBalita: balitaRaw.length,
        totalStunted: countStunted,
        totalSeverelyStunted: countSevere,
        totalNormal: countNormal,
        totalRealGps: countRealGps,
        coveragePct: balitaRaw.length > 0 ? Math.round((countRealGps / balitaRaw.length) * 100) : 0,
      },
      determinanStats: {
        totalSurveys: relevantDeterminan.length,
        washIssues,
        infeksiIssues,
        asiMpasiIssues,
        bblrIssues,
        washPct: relevantDeterminan.length ? Math.round((washIssues / relevantDeterminan.length) * 100) : 0,
        infeksiPct: relevantDeterminan.length ? Math.round((infeksiIssues / relevantDeterminan.length) * 100) : 0,
        mpasiPct: relevantDeterminan.length ? Math.round((asiMpasiIssues / relevantDeterminan.length) * 100) : 0,
      },
      hotspotClusters,
      puskesmasLogistik,
      balitaPoints,
    });
  } catch (err: any) {
    console.error("[GET /api/pkmk/dashboard/geo-ai] Fatal Error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
