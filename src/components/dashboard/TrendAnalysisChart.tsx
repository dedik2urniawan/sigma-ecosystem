"use client";

import React, { useMemo, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LabelList,
} from "recharts";

interface TrendAnalysisProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[];
    year: number | null;
}

const BULAN_LABELS: Record<number, string> = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "Mei", 6: "Jun",
    7: "Jul", 8: "Agt", 9: "Sep", 10: "Okt", 11: "Nov", 12: "Des",
};

export default function TrendAnalysisChart({ data, year }: TrendAnalysisProps) {
    const [hiddenMetrics, setHiddenMetrics] = useState<string[]>([]);

    const toggleMetric = (key: string) => {
        setHiddenMetrics((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const chartData = useMemo(() => {
        // Group by year-month key "YYYY-M"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const groups: Record<string, any[]> = {};
        const years = new Set<number>();

        data.forEach((row) => {
            const y = row.tahun;
            const m = row.bulan;
            years.add(y);
            const key = `${y}-${m}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(row);
        });

        const distinctYears = years.size;

        // Calculate weighted averages for each period
        const result = Object.entries(groups).map(([key, rows]) => {
            const [yStr, mStr] = key.split("-");
            const y = Number(yStr);
            const m = Number(mStr);
            const totalUk = rows.reduce((acc, r) => acc + (r.jumlah_timbang_ukur || 0), 0);

            if (totalUk === 0) return null;

            const stunting = rows.reduce((acc, r) => acc + (r.stunting || 0), 0);
            const wasting = rows.reduce((acc, r) => acc + (r.wasting || 0), 0);
            const underweight = rows.reduce((acc, r) => acc + (r.underweight || 0), 0);
            const obesitas = rows.reduce((acc, r) => acc + (r.obesitas || 0), 0);

            return {
                year: y,
                month: m,
                // If multiple years, show "Jan 25", else "Jan"
                label: distinctYears > 1 ? `${BULAN_LABELS[m]} ${y.toString().slice(-2)}` : BULAN_LABELS[m],
                stunting: (stunting / totalUk) * 100,
                wasting: (wasting / totalUk) * 100,
                underweight: (underweight / totalUk) * 100,
                obesitas: (obesitas / totalUk) * 100,
            };
        }).filter((r): r is NonNullable<typeof r> => r !== null);

        // Sort by year then month
        return result.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
        });
    }, [data]);

    if (chartData.length < 2) {
        return null; // Not enough data for trend
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                    <span className="material-icons-round text-lg text-blue-500">show_chart</span>
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-900">Analisis Tren {year || "Semua Tahun"}</h3>
                    <p className="text-xs text-slate-400">Perkembangan prevalensi masalah gizi bulan ke bulan</p>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            tickFormatter={(val) => `${val}%`}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                            itemStyle={{ fontSize: 12, fontWeight: 600 }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={(val: any) => [`${Number(val).toFixed(2)}%`, ""]}
                        />
                        <Legend
                            content={({ payload }) => (
                                <div className="flex flex-wrap justify-center gap-4 pt-4 select-none">
                                    {payload?.map((entry) => {
                                        const key = entry.dataKey as string;
                                        const isHidden = hiddenMetrics.includes(key);
                                        return (
                                            <div
                                                key={key}
                                                onClick={() => toggleMetric(key)}
                                                className={`cursor-pointer flex items-center gap-2 text-xs font-bold transition-all ${isHidden ? "opacity-40 grayscale" : ""}`}
                                                style={{ color: entry.color }}
                                            >
                                                <div
                                                    className="w-2.5 h-2.5 rounded-full"
                                                    style={{
                                                        backgroundColor: entry.color || ("#000" as string),
                                                        border: isHidden ? `1px solid ${entry.color}` : "none",
                                                        background: isHidden ? "transparent" : entry.color,
                                                    }}
                                                />
                                                <span className={isHidden ? "line-through decoration-slate-400 decoration-2" : ""}>
                                                    {entry.value}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        />


                        <Line hide={hiddenMetrics.includes("stunting")} type="monotone" dataKey="stunting" name="Stunting" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }}>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            <LabelList dataKey="stunting" position="top" offset={10} formatter={(v: any) => `${Number(v).toFixed(1)}%`} style={{ fontSize: 10, fill: "#ef4444", fontWeight: "bold" }} />
                        </Line>
                        <Line hide={hiddenMetrics.includes("wasting")} type="monotone" dataKey="wasting" name="Wasting" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }}>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            <LabelList dataKey="wasting" position="bottom" offset={10} formatter={(v: any) => `${Number(v).toFixed(1)}%`} style={{ fontSize: 10, fill: "#f59e0b", fontWeight: "bold" }} />
                        </Line>
                        <Line hide={hiddenMetrics.includes("underweight")} type="monotone" dataKey="underweight" name="Underweight" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }}>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            <LabelList dataKey="underweight" position="top" offset={10} formatter={(v: any) => `${Number(v).toFixed(1)}%`} style={{ fontSize: 10, fill: "#3b82f6", fontWeight: "bold" }} />
                        </Line>
                        <Line hide={hiddenMetrics.includes("obesitas")} type="monotone" dataKey="obesitas" name="Obesitas" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }}>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            <LabelList dataKey="obesitas" position="bottom" offset={10} formatter={(v: any) => `${Number(v).toFixed(1)}%`} style={{ fontSize: 10, fill: "#8b5cf6", fontWeight: "bold" }} />
                        </Line>
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
