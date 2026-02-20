import { BultimRow } from "@/app/dashboard/pelayanan-kesehatan/page";

// Types for CIAF Analysis
export interface CiafKpi {
    totalBalita: number;
    totalCiaf: number;
    ciafRate: number;      // % of totalBalita
    groupDCount: number;   // Multiple failures (Stunt+Waste+Under)
    groupDRate: number;
    stuntingOnly: number;
    wastingOnly: number;
    underweightOnly: number;
}

export interface CiafVennData {
    stunting: number;
    wasting: number;
    underweight: number;
    stuntingWasting: number; // Stunting + Wasting
    stuntingUnderweight: number; // Stunting + Underweight
    wastingUnderweight: number; // Wasting + Underweight
    allThree: number; // Group D
}

export interface CiafVillageSummary {
    id: string; // Combined key or village name
    namaDesa: string;
    namaPuskesmas: string;
    totalBalita: number;
    totalCiaf: number;
    ciafRate: number;

    // Counts
    groupD: number; // Critical
    groupC: number; // Wasting + Underweight
    groupE: number; // Stunting + Underweight
    groupF: number; // Stunting Only
    groupB: number; // Wasting Only
    groupY: number; // Underweight Only

    // Risk Score for Map
    riskScore: number;

    // Recommendation for Triage
    recommendation: string;
    recommendationColor: "red" | "orange" | "yellow" | "blue" | "green";
}

// CIAF Groups (Nandy et al., 2005)
// A: No Failure
// B: Wasting Only
// C: Wasting + Underweight
// D: Wasting + Stunting + Underweight
// E: Stunting + Underweight
// F: Stunting Only
// Y: Underweight Only (Group Y in some models)

export function calculateCiafMetrics(data: BultimRow[]): {
    kpi: CiafKpi;
    venn: CiafVennData;
    distribution: { name: string; value: number; fill: string; desc: string }[];
} {
    let totalBalita = 0;

    // Weighted accumulators for Venn intersections
    // Since we don't have individual data, we PROBABILISTICALLY ESTIMATE overlaps
    // based on typical epidemiological patterns in Indonesia:
    // - Stunting & Underweight overlap is HIGH (~60% of stunted are underweight)
    // - Wasting & Underweight overlap is HIGH
    // - Wasting & Stunting overlap is LOW (Concurrent wasting & stunting is rare but fatal)

    // let simStunting = 0;
    // let simWasting = 0;
    // let simUnderweight = 0;

    let groupB = 0; // Wasting Only
    let groupC = 0; // Wasting + Underweight
    let groupD = 0; // All Three (Critical)
    let groupE = 0; // Stunting + Underweight
    let groupF = 0; // Stunting Only
    let groupY = 0; // Underweight Only

    // Process each row (Desa/Puskesmas)
    data.forEach(row => {
        const N = row.data_sasaran || 0;
        const S = row.stunting || 0;
        const W = row.wasting || 0;
        const U = row.underweight || 0;

        totalBalita += N;
        // simStunting += S;
        // simWasting += W;
        // simUnderweight += U;

        // --- SIMULATION LOGIC ---
        // This distributes the raw S, W, U counts into mutual exclusive groups
        // NOTE: This is an estimation algorithm because we lack individual data.

        // 1. Estimate Group D (All Three): Approx 15% of MIN(S,W,U) - slightly more aggressive to catch risk
        const estGroupD = Math.max(0, Math.floor(Math.min(S, W, U) * 0.15));

        // 2. Estimate Group E (Stunting + Underweight)
        // Stunting usually drives Underweight. 
        const estGroupE = Math.max(0, Math.floor((S * 0.6) - estGroupD));

        // 3. Estimate Group C (Wasting + Underweight)
        // Wasting almost always causes Underweight.
        const estGroupC = Math.max(0, Math.floor((W * 0.8) - estGroupD));

        // 4. Calculate Single Failures (Residuals)
        const estGroupF = Math.max(0, S - estGroupE - estGroupD); // Stunting Only
        const estGroupB = Math.max(0, W - estGroupC - estGroupD); // Wasting Only
        const estGroupY = Math.max(0, U - estGroupE - estGroupC - estGroupD); // Underweight Only

        // Accumulate
        groupD += estGroupD;
        groupE += estGroupE;
        groupC += estGroupC;
        groupF += estGroupF;
        groupB += estGroupB;
        groupY += estGroupY;
    });

    // Total CIAF = Sum of all failure groups
    const totalCiaf = groupB + groupC + groupD + groupE + groupF + groupY;

    return {
        kpi: {
            totalBalita,
            totalCiaf,
            ciafRate: totalBalita ? (totalCiaf / totalBalita) * 100 : 0,
            groupDCount: groupD,
            groupDRate: totalBalita ? (groupD / totalBalita) * 100 : 0,
            stuntingOnly: groupF,
            wastingOnly: groupB,
            underweightOnly: groupY
        },
        venn: {
            stunting: groupF + groupE + groupD, // Total S
            wasting: groupB + groupC + groupD,  // Total W
            underweight: groupY + groupE + groupC + groupD, // Total U
            stuntingWasting: groupD, // Simplified for this visualization, usually just D
            stuntingUnderweight: groupE + groupD,
            wastingUnderweight: groupC + groupD,
            allThree: groupD
        },
        distribution: [
            { name: "Group A (Normal)", value: totalBalita - totalCiaf, fill: "#10b981", desc: "Tidak ada kegagalan" },
            { name: "Group F (Stunting Only)", value: groupF, fill: "#3b82f6", desc: "Pendek tapi gemuk/normal" },
            { name: "Group E (Stunt+Under)", value: groupE, fill: "#8b5cf6", desc: "Pendek & Kurang Berat" },
            { name: "Group Y (Underweight Only)", value: groupY, fill: "#f59e0b", desc: "Kurang Berat saja" },
            { name: "Group B (Wasting Only)", value: groupB, fill: "#f97316", desc: "Kurus mendadak" },
            { name: "Group C (Waste+Under)", value: groupC, fill: "#ef4444", desc: "Sangat kurus" },
            { name: "Group D (CRITICAL)", value: groupD, fill: "#7f1d1d", desc: "Gagal Tumbuh Total (Risiko Tinggi)" },
        ]
    };
}

export function calculateCiafPerVillage(data: BultimRow[]): CiafVillageSummary[] {
    const villageMap = new Map<string, {
        namaDesa: string;
        namaPuskesmas: string;
        N: number;
        S: number;
        W: number;
        U: number;
    }>();

    // 1. Aggregate data by unique Village ID (Puskesmas + Desa)
    data.forEach(row => {
        const desa = row.kelurahan || "Unknown";
        const pkm = row.puskesmas || "Unknown";
        const key = `${pkm}-${desa}`;

        const existing = villageMap.get(key) || {
            namaDesa: desa,
            namaPuskesmas: pkm,
            N: 0, S: 0, W: 0, U: 0
        };

        existing.N += (row.data_sasaran || 0);
        existing.S += (row.stunting || 0);
        existing.W += (row.wasting || 0);
        existing.U += (row.underweight || 0);

        villageMap.set(key, existing);
    });

    // 2. Process aggregated data
    return Array.from(villageMap.entries()).map(([key, v]) => {
        const { N, S, W, U } = v;

        // --- Same Estimations as above ---
        const groupD = Math.max(0, Math.floor(Math.min(S, W, U) * 0.15));
        const groupE = Math.max(0, Math.floor((S * 0.6) - groupD));
        const groupC = Math.max(0, Math.floor((W * 0.8) - groupD));

        const groupF = Math.max(0, S - groupE - groupD);
        const groupB = Math.max(0, W - groupC - groupD);
        const groupY = Math.max(0, U - groupE - groupC - groupD);

        const totalCiaf = groupB + groupC + groupD + groupE + groupF + groupY;
        const ciafRate = N ? (totalCiaf / N) * 100 : 0;

        // Risk Score
        const weightedScore = (groupD * 3) + (groupC * 2) + (groupE * 1);
        const riskScore = N ? (weightedScore / N) * 100 : 0;

        // Recommendations
        let recommendation = "Edukasi & Sanitasi Lingkungan";
        let recColor: "red" | "orange" | "yellow" | "blue" | "green" = "green";

        const rateD = N ? (groupD / N) * 100 : 0;
        const rateC = N ? (groupC / N) * 100 : 0;
        const rateE = N ? (groupE / N) * 100 : 0;

        if (rateD > 5 || groupD > 20) {
            recommendation = "Intervensi Medis & PKMK Intensif (Rujuk RS)";
            recColor = "red";
        } else if (rateC > 10 || groupC > 30) {
            recommendation = "PMT Pemulihan & Konseling Gizi Intensif";
            recColor = "orange";
        } else if (rateE > 20) {
            recommendation = "PMT Penyuluhan & Perbaikan Sanitasi";
            recColor = "yellow";
        }

        return {
            id: key,
            namaDesa: v.namaDesa,
            namaPuskesmas: v.namaPuskesmas,
            totalBalita: N,
            totalCiaf,
            ciafRate,
            groupD,
            groupC,
            groupE,
            groupF,
            groupB,
            groupY,
            riskScore,
            recommendation,
            recommendationColor: recColor
        };
    }).sort((a, b) => b.riskScore - a.riskScore); // Default sort by Risk
}
