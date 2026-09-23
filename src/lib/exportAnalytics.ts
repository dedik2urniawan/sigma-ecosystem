import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ComplianceData {
    totalBalita: number;
    kohortInput: number;
    compliancePercentage: number;
    groupedData: any[];
    level: string;
}

interface NutritionData {
    avgBBU: number;
    avgTBU: number;
    avgBBTB: number;
    avgDeltaBB: number;
    redFlagPercentage: number;
    locations: any[];
}

interface KepatuhanData {
    data: any[];
    chartData: any[];
}

interface DosageData {
    dosageDistribution: any[];
}

interface RedflagData {
    data: any[];
}

interface MonitoringComplianceData {
    totalBalita: number;
    overall: {
        antropometri: { monitored: number; percentage: number };
        konsumsi: { monitored: number; percentage: number };
        pemberian: { monitored: number; percentage: number };
    };
    byLocation: any[];
    level: string;
}

export function exportAnalyticsToPDF(
    complianceData: ComplianceData | null,
    nutritionData: NutritionData | null,
    year: number,
    month: number,
    kepatuhanData?: KepatuhanData | null,
    dosageData?: DosageData | null,
    redflagData?: RedflagData | null,
    monitoringComplianceData?: MonitoringComplianceData | null
) {
    const doc = new jsPDF();
    const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    // === HEADER ===
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 184, 166);
    doc.text("LAPORAN ANALYTICS PKMK", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Dinas Kesehatan Kabupaten Malang", 105, 28, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Periode: ${monthNames[month - 1]} ${year}`, 105, 36, { align: "center" });
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}`, 105, 42, { align: "center" });

    // Line separator
    doc.setDrawColor(20, 184, 166);
    doc.setLineWidth(1);
    doc.line(20, 48, 190, 48);

    let yPos = 55;

    // === EXECUTIVE SUMMARY BOX ===
    doc.setFillColor(240, 253, 250);
    doc.roundedRect(20, yPos, 170, 40, 3, 3, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text("Ringkasan Eksekutif", 25, yPos + 8);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);

    const compliance = complianceData?.compliancePercentage ?? 0;
    const redflag = nutritionData?.redFlagPercentage ?? 0;
    const antro = monitoringComplianceData?.overall?.antropometri?.percentage ?? 0;

    doc.text(`- Tingkat Compliance Kohort: ${compliance.toFixed(1)}% (${compliance >= 75 ? 'Baik' : compliance >= 50 ? 'Perlu Peningkatan' : 'Kritis'})`, 25, yPos + 16);
    doc.text(`- Monitoring Antropometri: ${antro.toFixed(1)}% balita termonitor`, 25, yPos + 22);
    doc.text(`- Kasus Red Flag: ${redflag.toFixed(1)}% (${redflag <= 10 ? 'Terkendali' : redflag <= 20 ? 'Perlu Perhatian' : 'Kritis'})`, 25, yPos + 28);
    doc.text(`- Total Balita: ${complianceData?.totalBalita ?? 0} | Kohort Terinput: ${complianceData?.kohortInput ?? 0}`, 25, yPos + 34);

    yPos += 48;

    // === SECTION 1: COMPLIANCE KOHORT ===
    if (complianceData) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(20, 184, 166);
        doc.text("[1] ANALISIS COMPLIANCE KOHORT", 20, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Perbandingan jumlah balita stunting dengan kohort yang sudah terinput.", 20, yPos);
        yPos += 6;

        const summaryData = [
            ["Total Balita Stunting + Red Flag", complianceData.totalBalita.toString()],
            ["Kohort Terinput", complianceData.kohortInput.toString()],
            ["Tingkat Compliance", `${complianceData.compliancePercentage.toFixed(1)}%`],
            ["Status", complianceData.compliancePercentage >= 75 ? "BAIK" : complianceData.compliancePercentage >= 50 ? "SEDANG" : "RENDAH"],
        ];

        autoTable(doc, {
            startY: yPos,
            head: [["Metrik", "Nilai"]],
            body: summaryData,
            theme: "grid",
            headStyles: { fillColor: [20, 184, 166], fontStyle: "bold", textColor: 255 },
            styles: { fontSize: 10, cellPadding: 4 },
            columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 60, halign: "center" } },
            margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;

        // === COMPLIANCE BY PUSKESMAS - ALL (NO LIMIT) ===
        if (complianceData.groupedData && complianceData.groupedData.length > 0) {
            doc.addPage();
            yPos = 20;

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(20, 184, 166);
            doc.text(`[1.1] COMPLIANCE PER ${complianceData.level === "puskesmas" ? "PUSKESMAS" : "DESA"} (LENGKAP)`, 20, yPos);
            yPos += 10;

            // ALL puskesmas - no slice limit
            const locationData = complianceData.groupedData.map((loc) => [
                loc.name,
                loc.total.toString(),
                loc.kohort.toString(),
                `${loc.percentage.toFixed(1)}%`,
                loc.percentage >= 75 ? "Baik" : loc.percentage >= 50 ? "Sedang" : "Rendah",
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [["Lokasi", "Total", "Kohort", "Compliance", "Status"]],
                body: locationData,
                theme: "striped",
                headStyles: { fillColor: [20, 184, 166], fontStyle: "bold", textColor: 255 },
                styles: { fontSize: 8, cellPadding: 2 },
                margin: { left: 20, right: 20 },
                didParseCell: (data) => {
                    if (data.column.index === 4 && data.section === "body") {
                        const status = data.cell.text[0];
                        if (status === "Baik") {
                            data.cell.styles.textColor = [16, 185, 129];
                            data.cell.styles.fontStyle = "bold";
                        } else if (status === "Sedang") {
                            data.cell.styles.textColor = [245, 158, 11];
                            data.cell.styles.fontStyle = "bold";
                        } else if (status === "Rendah") {
                            data.cell.styles.textColor = [239, 68, 68];
                            data.cell.styles.fontStyle = "bold";
                        }
                    }
                },
            });
        }
    }

    // === SECTION 2: MONITORING COMPLIANCE (ANTROPOMETRI, KONSUMSI, PEMBERIAN) ===
    if (monitoringComplianceData) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(59, 130, 246);
        doc.text("[2] ANALISIS MONITORING (ANTROPOMETRI, KONSUMSI, PEMBERIAN)", 20, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Tingkat kepatuhan monitoring untuk setiap jenis pemantauan.", 20, yPos);
        yPos += 6;

        // Overall Summary
        const overallData = [
            ["Monitoring Antropometri",
                monitoringComplianceData.overall.antropometri.monitored.toString(),
                `${monitoringComplianceData.overall.antropometri.percentage.toFixed(1)}%`],
            ["Monitoring Konsumsi PKMK",
                monitoringComplianceData.overall.konsumsi.monitored.toString(),
                `${monitoringComplianceData.overall.konsumsi.percentage.toFixed(1)}%`],
            ["Monitoring Pemberian PKMK",
                monitoringComplianceData.overall.pemberian.monitored.toString(),
                `${monitoringComplianceData.overall.pemberian.percentage.toFixed(1)}%`],
        ];

        autoTable(doc, {
            startY: yPos,
            head: [["Jenis Monitoring", "Balita Termonitor", "Persentase"]],
            body: overallData,
            theme: "grid",
            headStyles: { fillColor: [59, 130, 246], fontStyle: "bold", textColor: 255 },
            styles: { fontSize: 10, cellPadding: 4 },
            margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 12;

        // Per Location Table - ALL puskesmas
        if (monitoringComplianceData.byLocation && monitoringComplianceData.byLocation.length > 0) {
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(59, 130, 246);
            doc.text(`Detail Monitoring per ${monitoringComplianceData.level === "puskesmas" ? "Puskesmas" : "Desa"}:`, 20, yPos);
            yPos += 6;

            // ALL locations - no limit
            const locationRows = monitoringComplianceData.byLocation.map((loc: any) => [
                loc.name || '-',
                loc.totalBalita?.toString() || '0',
                `${loc.antropometri?.percentage?.toFixed(1) || 0}%`,
                `${loc.konsumsi?.percentage?.toFixed(1) || 0}%`,
                `${loc.pemberian?.percentage?.toFixed(1) || 0}%`,
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [["Lokasi", "Total Balita", "Antropometri", "Konsumsi", "Pemberian"]],
                body: locationRows,
                theme: "striped",
                headStyles: { fillColor: [59, 130, 246], fontStyle: "bold", textColor: 255 },
                styles: { fontSize: 8, cellPadding: 2 },
                margin: { left: 20, right: 20 },
                columnStyles: {
                    0: { cellWidth: 50 },
                    1: { cellWidth: 25, halign: "center" },
                    2: { cellWidth: 30, halign: "center" },
                    3: { cellWidth: 30, halign: "center" },
                    4: { cellWidth: 30, halign: "center" },
                },
            });
        }
    }

    // === SECTION 3: STATUS GIZI ===
    if (nutritionData) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(236, 72, 153);
        doc.text("[3] ANALISIS STATUS GIZI", 20, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Rata-rata Z-Score dan indikator gizi balita.", 20, yPos);
        yPos += 6;

        const nutritionSummary = [
            ["Rata-rata Z-Score BB/U", nutritionData.avgBBU.toFixed(2)],
            ["Rata-rata Z-Score TB/U", nutritionData.avgTBU.toFixed(2)],
            ["Rata-rata Z-Score BB/TB", nutritionData.avgBBTB.toFixed(2)],
            ["Rata-rata Delta BB (kenaikan)", `${nutritionData.avgDeltaBB.toFixed(3)} kg`],
            ["Kasus Red Flag", `${nutritionData.redFlagPercentage.toFixed(1)}%`],
        ];

        autoTable(doc, {
            startY: yPos,
            head: [["Indikator Gizi", "Nilai"]],
            body: nutritionSummary,
            theme: "grid",
            headStyles: { fillColor: [236, 72, 153], fontStyle: "bold", textColor: 255 },
            styles: { fontSize: 10, cellPadding: 4 },
            margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;

        // Z-Score Interpretation
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(20, yPos, 170, 28, 3, 3, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text("Interpretasi Z-Score:", 25, yPos + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("> -1 SD: Normal  |  -2 s/d -1 SD: Kurang  |  -3 s/d -2 SD: Buruk  |  < -3 SD: Sangat Buruk", 25, yPos + 14);

        // Alert box
        const alertColor = nutritionData.redFlagPercentage > 20
            ? { bg: [254, 226, 226], text: [185, 28, 28], msg: "PERHATIAN: Tingkat red flag tinggi - perlu intervensi segera!" }
            : nutritionData.redFlagPercentage > 10
                ? { bg: [254, 243, 199], text: [146, 64, 14], msg: "Tingkat red flag sedang - monitoring intensif diperlukan" }
                : { bg: [220, 252, 231], text: [21, 128, 61], msg: "Tingkat red flag terkendali - lanjutkan program" };

        doc.setFillColor(alertColor.bg[0], alertColor.bg[1], alertColor.bg[2]);
        doc.roundedRect(25, yPos + 18, 160, 8, 2, 2, "F");
        doc.setTextColor(alertColor.text[0], alertColor.text[1], alertColor.text[2]);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(alertColor.msg, 30, yPos + 24);
        doc.setTextColor(0, 0, 0);
    }

    // === SECTION 4: KEPATUHAN MINGGUAN ===
    if (kepatuhanData && kepatuhanData.data && kepatuhanData.data.length > 0) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(245, 158, 11);
        doc.text("[4] KEPATUHAN MONITORING MINGGUAN", 20, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Tingkat kepatuhan pengukuran mingguan per puskesmas.", 20, yPos);
        yPos += 6;

        // ALL data - no slice limit
        const kepatuhanRows = kepatuhanData.data.map((item: any) => [
            item.nama || item.puskesmas_name || '-',
            item.total_kohort?.toString() || '0',
            item.minggu_terpenuhi?.toString() || '0',
            item.total_minggu?.toString() || '0',
            `${(item.persentase || 0).toFixed(1)}%`,
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [["Puskesmas", "Kohort", "Terpenuhi", "Target", "Kepatuhan"]],
            body: kepatuhanRows,
            theme: "striped",
            headStyles: { fillColor: [245, 158, 11], fontStyle: "bold", textColor: 255 },
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 20, right: 20 },
        });
    }

    // === SECTION 5: DISTRIBUSI DOSIS ===
    if (dosageData && dosageData.dosageDistribution && dosageData.dosageDistribution.length > 0) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(139, 92, 246);
        doc.text("[5] DISTRIBUSI DOSIS PKMK", 20, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Distribusi pemberian dosis PKMK berdasarkan kategori.", 20, yPos);
        yPos += 6;

        const dosageRows = dosageData.dosageDistribution.map((item: any) => [
            item.kategori || item.name || '-',
            item.jumlah?.toString() || '0',
            `${(item.persentase || 0).toFixed(1)}%`,
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [["Kategori Dosis", "Jumlah", "Persentase"]],
            body: dosageRows,
            theme: "striped",
            headStyles: { fillColor: [139, 92, 246], fontStyle: "bold", textColor: 255 },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: 20, right: 20 },
        });
    }

    // === SECTION 6: RED FLAG CASES ===
    if (redflagData && redflagData.data && redflagData.data.length > 0) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(239, 68, 68);
        doc.text("[6] KASUS RED FLAG", 20, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Daftar balita dengan indikator red flag.", 20, yPos);
        yPos += 6;

        const redflagRows = redflagData.data.map((item: any) => [
            item.nama || '-',
            item.indikator || item.flag_type || '-',
            item.puskesmas || '-',
            item.tanggal || '-',
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [["Nama Balita", "Indikator", "Puskesmas", "Tanggal"]],
            body: redflagRows,
            theme: "striped",
            headStyles: { fillColor: [239, 68, 68], fontStyle: "bold", textColor: 255 },
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 20, right: 20 },
            didParseCell: (data) => {
                if (data.column.index === 1 && data.section === "body") {
                    data.cell.styles.textColor = [239, 68, 68];
                    data.cell.styles.fontStyle = "bold";
                }
            },
        });
    }

    // === RECOMMENDATIONS PAGE ===
    doc.addPage();
    yPos = 20;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 184, 166);
    doc.text("[REKOMENDASI]", 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);

    const recommendations: string[] = [];

    if (complianceData) {
        if (complianceData.compliancePercentage < 50) {
            recommendations.push("1. URGENT: Tingkatkan input data kohort - compliance masih dibawah 50%");
        } else if (complianceData.compliancePercentage < 75) {
            recommendations.push("1. Tingkatkan koordinasi untuk mencapai target compliance 75%");
        } else {
            recommendations.push("1. Pertahankan tingkat compliance yang baik (>75%)");
        }
    }

    if (monitoringComplianceData) {
        const avgMonitoring = (
            monitoringComplianceData.overall.antropometri.percentage +
            monitoringComplianceData.overall.konsumsi.percentage +
            monitoringComplianceData.overall.pemberian.percentage
        ) / 3;

        if (avgMonitoring < 50) {
            recommendations.push("2. PRIORITAS: Tingkatkan monitoring rutin (antropometri, konsumsi, pemberian)");
        } else if (avgMonitoring < 75) {
            recommendations.push("2. Perbaiki kepatuhan monitoring mingguan untuk mencapai 75%");
        } else {
            recommendations.push("2. Kepatuhan monitoring baik - pertahankan ritme");
        }
    }

    if (nutritionData) {
        if (nutritionData.redFlagPercentage > 20) {
            recommendations.push("3. KRITIS: Intervensi segera pada kasus red flag");
        } else if (nutritionData.redFlagPercentage > 10) {
            recommendations.push("3. Tingkatkan monitoring pada balita dengan red flag");
        } else {
            recommendations.push("3. Red flag terkendali - lanjutkan pemantauan rutin");
        }
    }

    recommendations.push("");
    recommendations.push("Catatan: Laporan ini di-generate otomatis dari Sistem PKMK.");

    recommendations.forEach((rec, index) => {
        doc.text(rec, 20, yPos + (index * 7));
    });

    // === FOOTER ON ALL PAGES ===
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(20, 285, 190, 285);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text(`Halaman ${i} dari ${pageCount}`, 105, 290, { align: "center" });
        doc.text(`PKMK Monitoring System - Dinas Kesehatan Kab. Malang`, 105, 294, { align: "center" });
    }

    // Save PDF
    const fileName = `Laporan_Analytics_PKMK_${monthNames[month - 1]}_${year}.pdf`;
    doc.save(fileName);
}
