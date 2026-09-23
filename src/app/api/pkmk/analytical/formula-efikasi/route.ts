import { NextRequest, NextResponse } from "next/server";
import { pkmkSupabase } from "@/lib/pkmkSupabase";
import { getPkmkAppUser } from "@/lib/pkmkAppUser";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const appUser = await getPkmkAppUser(searchParams);
    const isAdminPuskesmas = appUser?.role === "admin_puskesmas" && !!appUser.puskesmas_id;
    const userPuskesmasId = isAdminPuskesmas ? appUser.puskesmas_id : null;

    // === 1. Fetch Kohort (scoped by puskesmas if needed) ===
    let kohortQuery = pkmkSupabase.from("kohort").select("id, balita_id, puskesmas_id");
    if (userPuskesmasId) kohortQuery = kohortQuery.eq("puskesmas_id", userPuskesmasId);
    const { data: kohortRaw } = await kohortQuery.limit(2000);

    const allowedKohortIds = new Set((kohortRaw || []).map((k: any) => k.id));
    const kohortToBalita = new Map<string, string>();
    (kohortRaw || []).forEach((k: any) => kohortToBalita.set(k.id, k.balita_id));

    // === 2. Fetch monitoring_pkmk_pemberian ===
    let pemberianQuery = pkmkSupabase
      .from("monitoring_pkmk_pemberian")
      .select("id, kohort_id, minggu_ke, jenis_formulasi, jumlah_unit");
    if (userPuskesmasId && allowedKohortIds.size > 0) {
      pemberianQuery = pemberianQuery.in("kohort_id", Array.from(allowedKohortIds));
    }
    const { data: pemberianRaw } = await pemberianQuery.limit(10000);

    // === 2a. Fetch canonical formula names from ref_jenis_pkmk for normalization ===
    const { data: refFormula } = await pkmkSupabase
      .from("ref_jenis_pkmk")
      .select("id, nama_merk, kategori_usia, rentang_usia")
      .eq("is_active", true);
    const canonicalNames = new Set((refFormula || []).map((r: any) => r.nama_merk as string));

    const normalizeFormula = (raw: string | null): string | null => {
      if (!raw) return null;
      const trimmed = raw.trim();
      if (canonicalNames.has(trimmed)) return trimmed;
      for (const canonical of canonicalNames) {
        if (
          trimmed.toLowerCase().includes(canonical.toLowerCase()) ||
          canonical.toLowerCase().includes(trimmed.toLowerCase())
        ) {
          return canonical;
        }
      }
      const lower = trimmed.toLowerCase();
      if (lower.includes("dangrow") || lower.includes("gain & grow") || lower.includes("pkmk 1")) return "Dangrow";
      if (lower.includes("isocal")) return "Isocal";
      if (lower.includes("proteed")) return "Proteed";
      if (lower.includes("optigrowth")) return "SGM Optigrowth";
      if (lower.includes("ananda") || lower.includes("gain 100")) return "SGM Ananda Gain 100";
      return trimmed;
    };

    const pemberian = (userPuskesmasId
      ? (pemberianRaw || []).filter((p: any) => allowedKohortIds.has(p.kohort_id))
      : (pemberianRaw || [])
    )
      .map((p: any) => ({
        ...p,
        jenis_formulasi: normalizeFormula(p.jenis_formulasi),
      }))
      .filter((p: any) => p.jenis_formulasi !== null);

    // === 3. Fetch monitoring_antropometri ===
    let antroQuery = pkmkSupabase
      .from("monitoring_antropometri")
      .select("id, kohort_id, minggu_ke, bb_kg, tb_cm, zs_tbu, zs_bbu, zs_bbtb, delta_bb_kg, usia_bulan")
      .order("minggu_ke", { ascending: true });
    if (userPuskesmasId && allowedKohortIds.size > 0) {
      antroQuery = antroQuery.in("kohort_id", Array.from(allowedKohortIds));
    }
    const { data: antroRawInitial } = await antroQuery.limit(10000);
    const antroRaw = userPuskesmasId
      ? (antroRawInitial || []).filter((a: any) => allowedKohortIds.has(a.kohort_id))
      : (antroRawInitial || []);

    // === 4. Build first/last antro per kohort ===
    const firstAntroByKohort = new Map<string, any>();
    const lastAntroByKohort = new Map<string, any>();
    (antroRaw || []).forEach((a: any) => {
      const ex = firstAntroByKohort.get(a.kohort_id);
      if (!ex || Number(a.minggu_ke) < Number(ex.minggu_ke)) firstAntroByKohort.set(a.kohort_id, a);
      const exL = lastAntroByKohort.get(a.kohort_id);
      if (!exL || Number(a.minggu_ke) > Number(exL.minggu_ke)) lastAntroByKohort.set(a.kohort_id, a);
    });

    // === 5. Weight velocity per kohort ===
    const velocityByKohort = new Map<string, { gday: number[]; gkgday: number[] }>();
    (antroRaw || []).forEach((a: any) => {
      if (a.delta_bb_kg != null && Number(a.delta_bb_kg) > 0) {
        const vGday = (Number(a.delta_bb_kg) * 1000) / 7;
        const bb = Number(a.bb_kg) || 7.0;
        const vGkg = (Number(a.delta_bb_kg) * 1000) / (bb * 7);
        if (!velocityByKohort.has(a.kohort_id)) {
          velocityByKohort.set(a.kohort_id, { gday: [], gkgday: [] });
        }
        velocityByKohort.get(a.kohort_id)!.gday.push(vGday);
        velocityByKohort.get(a.kohort_id)!.gkgday.push(vGkg);
      }
    });

    // === 6. Group by formulasi ===
    const formulaStats: Record<string, {
      kohortIds: Set<string>;
      hazArr: number[]; wazArr: number[]; whzArr: number[];
      hazDeltaArr: number[]; velocityArr: number[]; velocityGkgArr: number[]; episodeCount: number;
    }> = {};

    (pemberian || []).forEach((p: any) => {
      const f = p.jenis_formulasi;
      if (!f) return;
      if (!formulaStats[f]) {
        formulaStats[f] = { kohortIds: new Set(), hazArr: [], wazArr: [], whzArr: [], hazDeltaArr: [], velocityArr: [], velocityGkgArr: [], episodeCount: 0 };
      }
      formulaStats[f].kohortIds.add(p.kohort_id);
      formulaStats[f].episodeCount++;
    });

    // === 7. Compute metrics ===
    const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, c) => a + c, 0) / arr.length : null);

    Object.entries(formulaStats).forEach(([, stats]) => {
      stats.kohortIds.forEach((kohortId) => {
        const last = lastAntroByKohort.get(kohortId);
        const first = firstAntroByKohort.get(kohortId);
        if (last) {
          if (last.zs_tbu != null) stats.hazArr.push(Number(last.zs_tbu));
          if (last.zs_bbu != null) stats.wazArr.push(Number(last.zs_bbu));
          if (last.zs_bbtb != null) stats.whzArr.push(Number(last.zs_bbtb));
        }
        if (last && first && last.zs_tbu != null && first.zs_tbu != null) {
          stats.hazDeltaArr.push(Number(last.zs_tbu) - Number(first.zs_tbu));
        }
        const vObj = velocityByKohort.get(kohortId);
        if (vObj) {
          stats.velocityArr.push(...vObj.gday);
          stats.velocityGkgArr.push(...vObj.gkgday);
        }
      });
    });

    // === 8. Build response ===
    const formulaEfikasi = Object.entries(formulaStats)
      .filter(([, stats]) => stats.kohortIds.size > 0)
      .map(([formula, stats]) => {
        const meanHAZ = avg(stats.hazArr);
        const meanWAZ = avg(stats.wazArr);
        const meanWHZ = avg(stats.whzArr);
        const meanHAZDelta = avg(stats.hazDeltaArr);
        const cleanedVelocitiesGday = stats.velocityArr.map((v) => Math.max(-20, Math.min(45, v)));
        const cleanedVelocitiesGkg = stats.velocityGkgArr.map((v) => Math.max(-5, Math.min(25, v)));

        const meanVelocity = avg(cleanedVelocitiesGday);
        const meanVelocityGkg = avg(cleanedVelocitiesGkg);
        const nBalita = stats.kohortIds.size;

        const responseCount = cleanedVelocitiesGday.filter((v) => v >= 15).length;
        const responseRate = cleanedVelocitiesGday.length > 0 ? Math.round((responseCount / nBalita) * 100) : 0;
        const severePct = stats.hazArr.length > 0 ? Math.round((stats.hazArr.filter((z) => z < -3.0).length / stats.hazArr.length) * 100) : 0;
        const stuntedPct = stats.hazArr.length > 0 ? Math.round((stats.hazArr.filter((z) => z >= -3.0 && z < -2.0).length / stats.hazArr.length) * 100) : 0;
        const normalPct = stats.hazArr.length > 0 ? Math.round((stats.hazArr.filter((z) => z >= -2.0).length / stats.hazArr.length) * 100) : 0;

        let efikasiScore = 0;
        if (meanHAZ !== null && meanHAZ >= -2.0) efikasiScore += 3;
        else if (meanHAZ !== null && meanHAZ >= -2.5) efikasiScore += 2;
        else if (meanHAZ !== null && meanHAZ >= -3.0) efikasiScore += 1;

        if (meanVelocityGkg !== null && meanVelocityGkg >= 5.0 && meanVelocityGkg <= 10.0) efikasiScore += 3;
        else if (meanVelocityGkg !== null && meanVelocityGkg > 10.0) efikasiScore += 2;
        else if (meanVelocityGkg !== null && meanVelocityGkg >= 0) efikasiScore += 1;

        if (meanHAZDelta !== null && meanHAZDelta > 0) efikasiScore += 2;
        if (responseRate >= 60) efikasiScore += 2;
        else if (responseRate >= 40) efikasiScore += 1;

        const isPilot = nBalita < 5;
        const weightedScore = isPilot ? efikasiScore * 0.4 : nBalita < 10 ? efikasiScore * 0.8 : efikasiScore;

        const efikasiKlinis = isPilot
          ? "Pilot Data (n<5)"
          : weightedScore >= 7
          ? "Excellent"
          : weightedScore >= 4.5
          ? "Good"
          : weightedScore >= 2.5
          ? "Moderate"
          : "Poor";

        return {
          formula,
          n_balita: nBalita,
          n_episode: stats.episodeCount,
          is_pilot: isPilot,
          mean_haz: meanHAZ !== null ? Math.round(meanHAZ * 100) / 100 : null,
          mean_waz: meanWAZ !== null ? Math.round(meanWAZ * 100) / 100 : null,
          mean_whz: meanWHZ !== null ? Math.round(meanWHZ * 100) / 100 : null,
          mean_haz_delta: meanHAZDelta !== null ? Math.round(meanHAZDelta * 100) / 100 : null,
          mean_velocity_gday: meanVelocity !== null ? Math.round(meanVelocity * 10) / 10 : null,
          mean_velocity_gkgday: meanVelocityGkg !== null ? Math.round(meanVelocityGkg * 100) / 100 : null,
          response_rate_pct: responseRate,
          severe_stunting_pct: severePct,
          stunted_pct: stuntedPct,
          normal_pct: normalPct,
          efikasi_klinis: efikasiKlinis,
          efikasi_score: Math.round(weightedScore * 10) / 10,
        };
      })
      .sort((a, b) => {
        if (a.is_pilot !== b.is_pilot) return a.is_pilot ? 1 : -1;
        return b.efikasi_score - a.efikasi_score;
      });

    const totalBalitaFormula = new Set(
      (pemberian || []).map((p: any) => kohortToBalita.get(p.kohort_id)).filter(Boolean)
    ).size;

    return NextResponse.json({
      formulaEfikasi,
      summary: {
        totalFormulaTypes: formulaEfikasi.length,
        totalBalitaFormula,
        totalEpisode: (pemberian || []).length,
        bestFormula: formulaEfikasi.find((f: any) => !f.is_pilot)?.formula || formulaEfikasi[0]?.formula || null,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/pkmk/analytical/formula-efikasi] Error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
