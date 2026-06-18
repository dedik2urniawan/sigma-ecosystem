import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SupervisiPDFInput {
    id: string;
    puskesmas: string;
    desa: string;
    sppg_id: string;
    nama_sppg?: string;
    nama_yayasan: string;
    nama_ahli_gizi: string;
    nama_petugas_dinkes?: string;
    nama_kepala_sppg?: string;
    score_percentage: number;
    created_at: string;
    [key: string]: any;
}

const QUESTION_LABELS: Record<string, string> = {
    q1: "Ahli Gizi yang memenuhi kualifikasi",
    q2: "Penyusunan master menu berkala oleh Ahli Gizi",
    q3: "Master menu spesifik berdasarkan sasaran",
    q4: "Koordinasi bahan pangan dan siklus menu",
    q5: "Penggunaan bahan pangan wajib terfortifikasi",
    q6: "Mengutamakan bahan makanan lokal",
    q7: "Identifikasi riwayat alergi sasaran",
    q8: "Struktur menu sesuai Gizi Seimbang",
    q9: "Pengolahan maks 4-6 jam sebelum makan pagi",
    q10: "Pengolahan maks 4-6 jam sebelum makan siang",
    q11: "Masakan diupayakan kering/minim kuah",
    q12: "Sertifikat Halal SPPG",
    q13: "Pengolahan maks 4-6 jam sebelum jam makan",
    q14: "Quality Control fisik sebelum pengiriman",
    q15: "Higiene penjamah makanan (food handler)",
    q16: "Pengambilan dan penyimpanan sampel makanan",
    q17: "Kemasan menggunakan foodtray stainless steel 304/316",
    q18: "Kendaraan pengantaran menggunakan mobil box higienis",
    q19: "Waktu tempuh maksimal 20 menit (radius 6 km)",
    q20: "Kolaborasi distribusi non-sekolah (Bidan/Kader)",
    q21: "Pemantauan perkembangan gizi (BB/TB) per 6 bulan",
};

export async function generateMbgSupervisiPDF(item: SupervisiPDFInput): Promise<void> {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = 15;

    // ── Logo (left-aligned) ──────────────────────────────────────────────────
    const logoSize = 26; 
    const logoX = margin;
    const logoY = y;
    
    try {
        const resp = await fetch("/images/logo-kabmalang.png");
        if (resp.ok) {
            const blob = await resp.blob();
            const reader = new FileReader();
            await new Promise<void>(resolve => {
                reader.onload = () => {
                    doc.addImage(reader.result as string, "PNG", logoX, logoY, logoSize, logoSize);
                    resolve();
                };
                reader.readAsDataURL(blob);
            });
        }
    } catch { /* logo optional */ }

    // ── Kop Surat ────────────────────────────────────────────────────────────
    const textCenterX = (margin + logoSize + pageW - margin) / 2;
    const kopY = y;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("PEMERINTAH KABUPATEN MALANG", textCenterX, kopY + 4, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("DINAS KESEHATAN", textCenterX, kopY + 10, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Jalan Panji Nomor 120 Kepanjen, Kabupaten Malang, Jawa Timur", textCenterX, kopY + 16, { align: "center" });
    doc.text("Telepon (0341) 393730, Faksimile (0341) 393731", textCenterX, kopY + 20, { align: "center" });
    doc.text("Laman: http://dinkes.malangkab.go.id", textCenterX, kopY + 24, { align: "center" });
    doc.text("Pos-el: dinkes@malangkab.go.id, Kode Pos 65163", textCenterX, kopY + 28, { align: "center" });

    y = kopY + Math.max(logoSize, 32) + 3;

    // ── Garis Ganda ──────────────────────────────────────────────────────────
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.2);
    doc.line(margin, y, pageW - margin, y);
    doc.setLineWidth(0.4);
    doc.line(margin, y + 2, pageW - margin, y + 2);
    y += 10;

    // ── Judul ────────────────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("BERITA ACARA", pageW / 2, y, { align: "center" });
    y += 6;
    doc.text("HASIL SUPERVISI DAN EVALUASI", pageW / 2, y, { align: "center" });
    y += 6;
    doc.text("PROGRAM MAKAN BERGIZI GRATIS (MBG)", pageW / 2, y, { align: "center" });
    y += 10;

    // ── Identitas SPPG ───────────────────────────────────────────────────────
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const idData = [
        ["Kode SPPG", ":", item.sppg_id || "-"],
        ["Nama SPPG", ":", item.nama_sppg || "-"],
        ["Nama Yayasan", ":", item.nama_yayasan || "-"],
        ["Puskesmas / Desa", ":", `${item.puskesmas || "-"} / ${item.desa || "-"}`],
        ["Tanggal Supervisi", ":", new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })],
        ["Nilai Kepatuhan", ":", `${(item.score_percentage || 0).toFixed(1)}%`]
    ];

    idData.forEach(([label, colon, val]) => {
        doc.setFont("helvetica", "normal");
        doc.text(label, margin, y);
        doc.text(colon, margin + 35, y);
        doc.setFont("helvetica", "bold");
        doc.text(val, margin + 40, y);
        y += 6;
    });

    y += 5;

    // ── Tabel Observasi Kepatuhan ────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("A. HASIL OBSERVASI KEPATUHAN", margin, y);
    y += 4;

    const tableData = Object.keys(QUESTION_LABELS).map((qId, idx) => {
        const isYes = item[`${qId}_ans`];
        let status = "-";
        
        if (qId === "q2" && item.q2_siklus_menu) {
             status = item.q2_siklus_menu;
        } else if (isYes === true) {
             status = "Ya / Sesuai";
        } else if (isYes === false) {
             status = "Tidak / Belum Sesuai";
        }

        const note = item[`${qId}_note`] || "-";
        return [(idx + 1).toString(), QUESTION_LABELS[qId], status, note];
    });

    autoTable(doc, {
        startY: y,
        head: [["No", "Indikator Penilaian", "Hasil", "Catatan"]],
        body: tableData,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 80 },
            2: { cellWidth: 30 },
            3: { cellWidth: "auto" }
        },
        margin: { left: margin, right: margin }
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Helper to check page break
    const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageH - margin) {
            doc.addPage();
            y = margin;
        }
    };

    // ── Bagian 2: Pertanyaan Terbuka ─────────────────────────────────────────
    checkPageBreak(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("B. HASIL OBSERVASI PERTANYAAN TERBUKA", margin, y);
    y += 4;

    const openQuestionsData = [
        ["1. Preferensi Menu Lokal", item.open_preferensi || "-"],
        ["2. Hambatan Fortifikasi", item.open_fortifikasi || "-"],
        ["3. Topik Konsultasi Gizi", item.open_konsultasi || "-"],
        ["4. Rencana Edukasi Gizi", item.open_edukasi || "-"],
        ["5. Protokol Kedaruratan", item.open_kedaruratan || "-"]
    ];

    autoTable(doc, {
        startY: y,
        head: [["Topik", "Catatan Observasi"]],
        body: openQuestionsData,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: {
            0: { cellWidth: 50, fontStyle: "bold" },
            1: { cellWidth: "auto" }
        },
        margin: { left: margin, right: margin }
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // ── Bagian 3: Tabel Sasaran MBG ──────────────────────────────────────────
    if (item.sasaran_penerima && Object.keys(item.sasaran_penerima).length > 0) {
        checkPageBreak(20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("C. DETAIL JUMLAH PENERIMA SASARAN MBG", margin, y);
        y += 4;

        const sasaranData = Object.entries(item.sasaran_penerima)
            .filter(([_, val]) => typeof val === "number" && val > 0)
            .map(([sasaran, jumlah], idx) => [(idx + 1).toString(), sasaran, (jumlah as number).toString()]);

        if (sasaranData.length > 0) {
            autoTable(doc, {
                startY: y,
                head: [["No", "Kelompok Sasaran", "Jumlah Penerima"]],
                body: sasaranData,
                theme: "grid",
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: "bold" },
                columnStyles: {
                    0: { cellWidth: 10, halign: "center" },
                    1: { cellWidth: 80 },
                    2: { cellWidth: "auto", halign: "right" }
                },
                margin: { left: margin, right: margin }
            });
            y = (doc as any).lastAutoTable.finalY + 10;
        } else {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text("Tidak ada data sasaran penerima.", margin, y);
            y += 10;
        }
    }

    // ── Bagian 4: Evaluasi Kuantitatif ───────────────────────────────────────
    if ((item.audit_weighting && item.audit_weighting.length > 0) || (item.audit_gizi && item.audit_gizi.length > 0)) {
        checkPageBreak(20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("D. ANALISIS EVALUASI KUANTITATIF", margin, y);
        y += 6;

        // Tabel Audit Gramasi
        if (item.audit_weighting && item.audit_weighting.length > 0) {
            item.audit_weighting.forEach((sasaranAudit: any) => {
                checkPageBreak(30);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.text(`A. Audit Weighting Gramasi (Gram) - Sasaran: ${sasaranAudit.sasaran_name || sasaranAudit.id}`, margin, y);
                y += 4;

                const auditData: any[][] = [];
                const ad = sasaranAudit.auditData || {};
                if (ad["Makanan Pokok"]) auditData.push(["Makanan Pokok", ad["Makanan Pokok"].std, ad["Makanan Pokok"].s1, ad["Makanan Pokok"].s2, ad["Makanan Pokok"].s3]);
                if (ad["Lauk Hewani"]) auditData.push(["Lauk Hewani", ad["Lauk Hewani"].std, ad["Lauk Hewani"].s1, ad["Lauk Hewani"].s2, ad["Lauk Hewani"].s3]);
                if (ad["Lauk Nabati"]) auditData.push(["Lauk Nabati", ad["Lauk Nabati"].std, ad["Lauk Nabati"].s1, ad["Lauk Nabati"].s2, ad["Lauk Nabati"].s3]);
                if (ad["Sayuran"]) auditData.push(["Sayuran", ad["Sayuran"].std, ad["Sayuran"].s1, ad["Sayuran"].s2, ad["Sayuran"].s3]);
                if (ad["Buah"]) auditData.push(["Buah", ad["Buah"].std, ad["Buah"].s1, ad["Buah"].s2, ad["Buah"].s3]);
                if (ad["Susu"]) auditData.push(["Susu", ad["Susu"].std, ad["Susu"].s1, ad["Susu"].s2, ad["Susu"].s3]);

                autoTable(doc, {
                    startY: y,
                    head: [["Komponen Hidangan", "Standar (g)", "Sampel 1 (g)", "Sampel 2 (g)", "Sampel 3 (g)"]],
                    body: auditData,
                    theme: "grid",
                    styles: { fontSize: 8, cellPadding: 2, halign: "center" },
                    headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: "bold" },
                    columnStyles: { 0: { halign: "left", cellWidth: 50 } },
                    margin: { left: margin, right: margin }
                });
                y = (doc as any).lastAutoTable.finalY + 8;
            });
        }

        // Tabel Audit Gizi
        if (item.audit_gizi && item.audit_gizi.length > 0) {
            item.audit_gizi.forEach((giziAudit: any) => {
                checkPageBreak(30);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.text(`B. Audit Analisis Zat Gizi - Sasaran: ${giziAudit.sasaran_name || giziAudit.id}`, margin, y);
                y += 4;

                const giziData: any[][] = [];
                const gd = giziAudit.giziData || {};
                if (gd["Kalori (kkal)"]) giziData.push(["Kalori (kkal)", gd["Kalori (kkal)"].std, gd["Kalori (kkal)"].real]);
                if (gd["Protein (g)"]) giziData.push(["Protein (g)", gd["Protein (g)"].std, gd["Protein (g)"].real]);
                if (gd["Lemak (g)"]) giziData.push(["Lemak (g)", gd["Lemak (g)"].std, gd["Lemak (g)"].real]);
                if (gd["Karbohidrat (g)"]) giziData.push(["Karbohidrat (g)", gd["Karbohidrat (g)"].std, gd["Karbohidrat (g)"].real]);

                autoTable(doc, {
                    startY: y,
                    head: [["Komponen Gizi", "Standar AKG/Resep", "Hasil FCT/Sigma"]],
                    body: giziData,
                    theme: "grid",
                    styles: { fontSize: 8, cellPadding: 2, halign: "center" },
                    headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: "bold" },
                    columnStyles: { 0: { halign: "left", cellWidth: 50 } },
                    margin: { left: margin, right: margin }
                });
                y = (doc as any).lastAutoTable.finalY + 8;
            });
        }
    }

    // Tambahkan halaman baru jika sisa spasi tidak cukup untuk tanda tangan (min 40px)
    checkPageBreak(40);

    // ── Tanda Tangan ─────────────────────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    const dateStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    doc.text(`Malang, ${dateStr}`, pageW - margin, y, { align: "right" });
    y += 5;

    const sigY = y;
    
    // Tanda Tangan Kiri (Kepala SPPG)
    doc.text("Mengetahui,", margin, sigY);
    doc.text("Kepala / PJ SPPG", margin, sigY + 5);
    
    doc.setFont("helvetica", "bold");
    doc.text(item.nama_kepala_sppg || "(.............................................)", margin, sigY + 25);
    
    // Tanda Tangan Kanan (Petugas Dinkes)
    doc.setFont("helvetica", "normal");
    doc.text("Petugas Supervisi (Dinkes),", pageW - margin, sigY + 5, { align: "right" });
    
    doc.setFont("helvetica", "bold");
    doc.text(item.nama_petugas_dinkes || "(.............................................)", pageW - margin, sigY + 25, { align: "right" });

    // ── Unduh ────────────────────────────────────────────────────────────────
    doc.save(`BA_Supervisi_MBG_${item.sppg_id || "SPPG"}_${dateStr.replace(/ /g, "_")}.pdf`);
}
