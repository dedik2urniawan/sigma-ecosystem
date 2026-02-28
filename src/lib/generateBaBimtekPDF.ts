/**
 * generateBaBimtekPDF.ts
 * Official BA Bimtek KGM PDF — Dinkes Kabupaten Malang format.
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
    pj_dinkes_nama: string;
    pj_dinkes_nip: string;
    kepala_pkm_nama: string;
    kepala_pkm_nip: string;
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

    // ── Logo (left-aligned) ──────────────────────────────────────────────────
    const logoSize = 26; // mm, larger to match template
    const logoX = margin;
    const logoY = y;
    let logoLoaded = false;
    try {
        const resp = await fetch("/images/logo-kabmalang.png");
        if (resp.ok) {
            const blob = await resp.blob();
            const reader = new FileReader();
            await new Promise<void>(resolve => {
                reader.onload = () => {
                    doc.addImage(reader.result as string, "PNG", logoX, logoY, logoSize, logoSize);
                    logoLoaded = true;
                    resolve();
                };
                reader.readAsDataURL(blob);
            });
        }
    } catch { /* logo optional */ }

    // ── Kop Surat — text block (centered in page, right of logo) ─────────────
    // Text center: pageW/2 + slight offset because logo shifts visual balance
    const textCenterX = (margin + logoSize + pageW - margin) / 2; // midpoint of remaining space
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

    // ── Double horizontal rule ────────────────────────────────────────────────
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.2);
    doc.line(margin, y, pageW - margin, y);
    doc.setLineWidth(0.4);
    doc.line(margin, y + 2, pageW - margin, y + 2);
    y += 8;

    // ── Title (centered, bold) ────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("BERITA ACARA", pageW / 2, y, { align: "center" });
    y += 6;
    doc.setFontSize(12);
    // Title split into lines manually as in template
    doc.text("HASIL SUPERVISI DAN BIMBINGAN TEKNIS INTEGRASI PROGRAM", pageW / 2, y, { align: "center" });
    y += 6;
    doc.text("KESEHATAN KELUARGA DAN GIZI", pageW / 2, y, { align: "center" });
    y += 8;

    // ── Opening Paragraph ─────────────────────────────────────────────────────
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

    // ── Signatory I — PJ Dinkes ───────────────────────────────────────────────
    const lineW = 60;
    const labelCol = margin + 5;
    const colonCol = margin + 22;
    const valueCol = margin + 25;

    const renderSig = (label: string, val: string, cy: number): number => {
        doc.setFont("helvetica", "bold");
        doc.text(label, labelCol, cy);
        doc.setFont("helvetica", "normal");
        doc.text(":", colonCol, cy);
        if (val && val.trim()) {
            doc.text(val, valueCol, cy);
        } else {
            // blank underline
            doc.line(valueCol, cy + 0.5, valueCol + lineW, cy + 0.5);
        }
        return cy + 4.5;
    };

    doc.text("I.", margin, y);
    y = renderSig("Nama", meta.pj_dinkes_nama || "", y);
    y = renderSig("NIP", meta.pj_dinkes_nip || "", y);
    doc.setFont("helvetica", "bold"); doc.text("Jabatan", labelCol, y);
    doc.setFont("helvetica", "normal"); doc.text(":", colonCol, y);
    doc.text("PJ Program KGM Dinas Kesehatan Kabupaten Malang", valueCol, y);
    y += 5;

    doc.text("II.", margin, y);
    y = renderSig("Nama", meta.kepala_pkm_nama || "", y);
    y = renderSig("NIP", meta.kepala_pkm_nip || "", y);
    doc.setFont("helvetica", "bold"); doc.text("Jabatan", labelCol, y);
    doc.setFont("helvetica", "normal"); doc.text(":", colonCol, y);
    doc.text(`Kepala Puskesmas ${meta.puskesmas_name}`, valueCol, y);
    y += 7;

    // ── Dasar Hukum ───────────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("Dasar Hukum :", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    DASAR_HUKUM.forEach((dh, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${dh}`, contentW - 5);
        doc.text(lines, margin + 3, y);
        y += lines.length * 4.5;
    });
    y += 3;

    // ── Menyatakan Bahwa paragraph ────────────────────────────────────────────
    const menyatakanText = `Menyatakan Bahwa Penanggung Jawab Program KGM Dinas Kesehatan telah melakukan Supervisi dan Bimbingan Teknis Integrasi Program Kesehatan Keluarga dan Gizi kepada Penanggung Jawab Program Puskesmas ${meta.puskesmas_name}. Adapun hasil kegiatan tersebut diantaranya:`;
    const menyatakanLines = doc.splitTextToSize(menyatakanText, contentW);
    doc.text(menyatakanLines, margin, y);
    y += menyatakanLines.length * 4.5 + 4;

    // ── 5 Program Tables ── black borders, black text, professional ───────────
    BA_PROGRAMS.forEach((prog, idx) => {
        const rows = programs[prog.id] || [];
        const tableBody: string[][] = rows.map(r => [
            r.hasil_supervisi || "",
            r.rencana_tindak_lanjut || "",
        ]);
        if (tableBody.length === 0) tableBody.push(["", ""]);

        if (y > 235) { doc.addPage(); y = 15; }

        autoTable(doc, {
            startY: y,
            head: [
                [{ content: `${idx + 1}. ${prog.label.toUpperCase()}`, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 9, lineColor: [0, 0, 0], lineWidth: 0.4 } }],
                [
                    { content: 'HASIL SUPERVISI', styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 8.5, lineColor: [0, 0, 0], lineWidth: 0.3 } },
                    { content: 'RENCANA TINDAK LANJUT', styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 8.5, lineColor: [0, 0, 0], lineWidth: 0.3 } },
                ]
            ],
            body: tableBody,
            theme: 'grid',
            columnStyles: {
                0: { cellWidth: contentW / 2, fontSize: 9, cellPadding: 5, minCellHeight: 22, textColor: [0, 0, 0] },
                1: { cellWidth: contentW / 2, fontSize: 9, cellPadding: 5, minCellHeight: 22, textColor: [0, 0, 0] },
            },
            styles: {
                valign: 'top',
                overflow: 'linebreak',
                lineColor: [0, 0, 0],
                lineWidth: 0.3,
                textColor: [0, 0, 0],
            },
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                lineColor: [0, 0, 0],
                lineWidth: 0.3,
            },
            bodyStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
            },
            margin: { left: margin, right: margin },
        });

        y = (doc as any).lastAutoTable.finalY + 5;
    });

    // ── Penutup ───────────────────────────────────────────────────────────────
    if (y > 255) { doc.addPage(); y = 15; }
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    const penutupLines = doc.splitTextToSize(PENUTUP_TEXT, contentW);
    doc.text(penutupLines, margin, y);
    y += penutupLines.length * 5 + 5;

    // ── Tanggal & Tanda Tangan ────────────────────────────────────────────────
    const tanggalShort = meta.tanggal_kegiatan
        ? new Date(meta.tanggal_kegiatan).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
        : "_______________";
    doc.setFont("helvetica", "normal");
    doc.text(`Kepanjen, ${tanggalShort}`, pageW - margin, y, { align: "right" });
    y += 8;

    const colW = contentW / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`KEPALA PUSKESMAS\n${meta.puskesmas_name.toUpperCase()}`, margin + colW / 2, y, { align: "center" });
    doc.text("PJ PROGRAM KESGA GIZI\nDINAS KESEHATAN KABUPATEN\nMALANG", margin + colW + colW / 2, y, { align: "center" });
    y += 28;

    doc.setFont("helvetica", "normal");
    // If name filled → show name, else blank underline
    const namePKM = meta.kepala_pkm_nama || "____________________________";
    const nipPKM = meta.kepala_pkm_nip ? `NIP: ${meta.kepala_pkm_nip}` : "NIP:";
    const nameDinkes = meta.pj_dinkes_nama || "____________________________";
    const nipDinkes = meta.pj_dinkes_nip ? `NIP: ${meta.pj_dinkes_nip}` : "NIP:";

    doc.text(namePKM, margin + colW / 2, y, { align: "center" });
    doc.text(nameDinkes, margin + colW + colW / 2, y, { align: "center" });
    y += 5;
    doc.text(nipPKM, margin + colW / 2, y, { align: "center" });
    doc.text(nipDinkes, margin + colW + colW / 2, y, { align: "center" });

    const filename = `BA_Bimtek_${meta.puskesmas_name}_${meta.tanggal_kegiatan}.pdf`;
    doc.save(filename);
}
