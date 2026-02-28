/**
 * generateBaBimtekPDF.ts
 * Generates the official BA Bimtek KGM PDF matching the Dinkes Kab. Malang format.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BA_PROGRAMS, DASAR_HUKUM, PENUTUP_TEXT } from "./baBimtekConfig";

interface SessionMeta {
    puskesmas_id: string;
    puskesmas_name: string;
    tanggal_kegiatan: string;
    tempat_kegiatan: string;
    status: string;
}

type ProgramRow = {
    item_order: number;
    hasil_supervisi: string;
    rencana_tindak_lanjut: string;
};

interface PDFInput {
    meta: SessionMeta;
    programs: Record<string, ProgramRow[]>;
}

export async function generateBaBimtekPDF({ meta, programs }: PDFInput): Promise<void> {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = 15;

    // ── Header / Kop Surat ──────────────────────────────────────────────────
    try {
        const resp = await fetch("/images/logo-kabmalang.png");
        if (resp.ok) {
            const blob = await resp.blob();
            const reader = new FileReader();
            await new Promise<void>(resolve => {
                reader.onload = () => {
                    doc.addImage(reader.result as string, "PNG", margin, y, 18, 18);
                    resolve();
                };
                reader.readAsDataURL(blob);
            });
        }
    } catch { /* logo optional */ }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PEMERINTAH KABUPATEN MALANG", pageW / 2, y + 4, { align: "center" });
    doc.setFontSize(12);
    doc.text("DINAS KESEHATAN", pageW / 2, y + 10, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Jl. Panji No 120 Kepanjen – Telp. (0341) 394120 – Fax. (0341) 395976", pageW / 2, y + 16, { align: "center" });
    doc.text("Email: dinkeskabmalang@gmail.com  |  Web: dinkeskabmalang.go.id", pageW / 2, y + 20, { align: "center" });

    y += 26;
    // horizontal rule double line
    doc.setDrawColor(0);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageW - margin, y);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5);

    y += 8;

    // ── Title ────────────────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("BERITA ACARA", pageW / 2, y, { align: "center" });
    y += 6;
    doc.setFontSize(10);
    const titleLines = doc.splitTextToSize(
        "HASIL SUPERVISI DAN BIMBINGAN TEKNIS INTEGRASI PROGRAM KESEHATAN KELUARGA DAN GIZI",
        contentW
    );
    doc.text(titleLines, pageW / 2, y, { align: "center" });
    y += titleLines.length * 5 + 5;

    // ── Pembukaan ─────────────────────────────────────────────────────────────
    const tanggalFormatted = meta.tanggal_kegiatan
        ? new Date(meta.tanggal_kegiatan).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        : "_______________";
    const tempat = meta.tempat_kegiatan || "_______________";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const pembukaan = `Pada hari ini ${tanggalFormatted} bertempat di ${tempat}, kami yang bertanda tangan di bawah ini:`;
    const pembukaanLines = doc.splitTextToSize(pembukaan, contentW);
    doc.text(pembukaanLines, margin, y);
    y += pembukaanLines.length * 5 + 3;

    // ── Signatory Block 1 — Penanggung Jawab Dinkes ───────────────────────────
    const sigItems = [
        { label: "Nama", value: "___________________________________" },
        { label: "NIP", value: "___________________________________" },
        { label: "Jabatan", value: `PJ Program KGM Dinas Kesehatan Kabupaten Malang` },
    ];
    const sigItems2 = [
        { label: "Nama", value: "___________________________________" },
        { label: "NIP", value: "___________________________________" },
        { label: "Jabatan", value: `Kepala Puskesmas ${meta.puskesmas_name}` },
    ];

    const renderSigBlock = (items: { label: string; value: string }[], startY: number): number => {
        let cy = startY;
        items.forEach(item => {
            doc.setFont("helvetica", "bold");
            doc.text(`${item.label}`, margin + 5, cy);
            doc.setFont("helvetica", "normal");
            doc.text(`: ${item.value}`, margin + 25, cy);
            cy += 4.5;
        });
        return cy;
    };

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.text("I.", margin, y);
    y = renderSigBlock(sigItems, y) + 2;
    doc.text("II.", margin, y);
    y = renderSigBlock(sigItems2, y) + 4;

    // ── Dasar Hukum ───────────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.text("Dasar Hukum :", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    DASAR_HUKUM.forEach((dh, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${dh}`, contentW - 5);
        doc.text(lines, margin + 3, y);
        y += lines.length * 4.5;
    });
    y += 3;

    // ── Opening paragraph for 5 programs ─────────────────────────────────────
    const openProg = doc.splitTextToSize(
        `Meninjau Program Pelaksanaan Integrasi Program KGM Tahun berjalan, telah dilakukan Supervisi dan Bimbingan Teknis Integrasi Program Kesehatan Keluarga dan Gizi di Puskesmas ${meta.puskesmas_name}, yang meliputi program-program sebagai berikut:`,
        contentW
    );
    doc.text(openProg, margin, y);
    y += openProg.length * 4.5 + 3;

    // ── 5 Program Tables ──────────────────────────────────────────────────────
    BA_PROGRAMS.forEach((prog, idx) => {
        const rows = programs[prog.id] || [];
        const tableBody: any[][] = rows.map(r => [
            r.hasil_supervisi || "",
            r.rencana_tindak_lanjut || "",
        ]);
        if (tableBody.length === 0) tableBody.push(["", ""]); // at least 1 empty row

        // Check page break
        if (y > 240) { doc.addPage(); y = 15; }

        autoTable(doc, {
            startY: y,
            head: [[
                { content: `${idx + 1}. ${prog.label.toUpperCase()}`, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 255], fontSize: 9 } }
            ],
            [
                { content: 'HASIL SUPERVISI', styles: { halign: 'center', fontStyle: 'bold', fillColor: [235, 245, 255], fontSize: 8.5 } },
                { content: 'RENCANA TINDAK LANJUT', styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 255, 245], fontSize: 8.5 } },
            ]],
            body: tableBody,
            theme: 'grid',
            columnStyles: {
                0: { cellWidth: contentW / 2, fontSize: 8.5, cellPadding: 4, minCellHeight: 20 },
                1: { cellWidth: contentW / 2, fontSize: 8.5, cellPadding: 4, minCellHeight: 20 },
            },
            styles: { valign: 'top', overflow: 'linebreak' },
            margin: { left: margin, right: margin },
        });

        y = (doc as any).lastAutoTable.finalY + 6;
    });

    // ── Penutup ───────────────────────────────────────────────────────────────
    if (y > 250) { doc.addPage(); y = 15; }
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    const penutupLines = doc.splitTextToSize(PENUTUP_TEXT, contentW);
    doc.text(penutupLines, margin, y);
    y += penutupLines.length * 5 + 5;

    // ── Tanggal ───────────────────────────────────────────────────────────────
    const kota = `Kepanjen, ${tanggalFormatted.split(",")[1]?.trim() || tanggalFormatted}`;
    doc.text(kota, pageW - margin, y, { align: "right" });
    y += 8;

    // ── Signature area ────────────────────────────────────────────────────────
    const colW = contentW / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`KEPALA PUSKESMAS ${meta.puskesmas_name.toUpperCase()}`, margin + colW / 2, y, { align: "center" });
    doc.text("PJ PROGRAM KESGA GIZI\nDINAS KESEHATAN KABUPATEN\nMALANG", margin + colW + colW / 2, y, { align: "center" });
    y += 28; // space for signature

    doc.setFont("helvetica", "normal");
    doc.text("(____________________________)", margin + colW / 2, y, { align: "center" });
    doc.text("(____________________________)", margin + colW + colW / 2, y, { align: "center" });
    y += 4;
    doc.text("NIP:", margin + colW / 2, y, { align: "center" });
    doc.text("NIP:", margin + colW + colW / 2, y, { align: "center" });

    // Save
    const filename = `BA_Bimtek_${meta.puskesmas_name}_${meta.tanggal_kegiatan}.pdf`;
    doc.save(filename);
}
