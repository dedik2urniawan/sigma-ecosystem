/**
 * generateSupervisiRsPDF.ts
 * Generates a PDF for Supervisi Gizi Rumah Sakit.
 * Uses jsPDF + jspdf-autotable for table rendering.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SUPERVISI_RS_SECTIONS } from "./supervisiRsConfig";

interface SessionMeta {
    rsName: string;
    tanggalSupervisi: string;
    timSupervisor: string;
    penanggungJawab: string;
}

interface ItemRow {
    section: string;
    item_number: number;
    item_label: string;
    score: number | null;
    catatan: string | null;
    rtl: string | null;
}

/**
 * Loads an image from a URL and returns it as a base64 data URL.
 */
async function loadImageAsBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = url;
    });
}

function formatDate(dateStr: string): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

export async function generateSupervisiRsPDF(meta: SessionMeta, items: ItemRow[]) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    // ─── Load logo ──────────────────────────────────────────────────────
    let logoBase64: string | null = null;
    try {
        logoBase64 = await loadImageAsBase64("/images/logo-kabmalang.png");
    } catch {
        console.warn("Could not load logo image");
    }

    // ─── Header ─────────────────────────────────────────────────────────
    if (logoBase64) {
        doc.addImage(logoBase64, "PNG", margin, y, 18, 20);
    }

    const headerX = margin + 24;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("PEMERINTAH KABUPATEN MALANG", pageWidth / 2, y + 4, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("DINAS KESEHATAN", pageWidth / 2, y + 10, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Jalan Panji Nomor 120 Kepanjen, Kabupaten Malang, Jawa Timur", pageWidth / 2, y + 15, { align: "center" });
    doc.text("Telepon (0341) 393730, Faksimile (0341) 393731", pageWidth / 2, y + 19, { align: "center" });
    doc.text("Laman: http://dinkes.malangkab.go.id", pageWidth / 2, y + 23, { align: "center" });
    doc.text("Pos-el: dinkes@malangkab.go.id, Kode Pos 65163", pageWidth / 2, y + 27, { align: "center" });

    y += 31;

    // Separator line
    doc.setDrawColor(0);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 1, pageWidth - margin, y + 1);
    y += 6;

    // ─── Title ──────────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("FORM SUPERVISI DAN BIMBINGAN TEKNIS", pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.text("GIZI RUMAH SAKIT", pageWidth / 2, y, { align: "center" });
    y += 8;

    // ─── Meta Info ──────────────────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const metaFields = [
        ["Nama Rumah Sakit", meta.rsName],
        ["Tanggal Supervisi", formatDate(meta.tanggalSupervisi)],
        ["Tim Supervisor", meta.timSupervisor || "—"],
        ["Penanggung Jawab", meta.penanggungJawab || "—"],
    ];

    const labelX = margin;
    const colonX = margin + 52;
    const valueX = margin + 56;

    metaFields.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, labelX, y);
        doc.text(":", colonX, y);
        doc.setFont("helvetica", "normal");
        doc.text(value, valueX, y);
        y += 5.5;
    });

    y += 4;

    // ─── Table ──────────────────────────────────────────────────────────
    const tableBody: any[][] = [];

    for (const section of SUPERVISI_RS_SECTIONS) {
        // Section header row — spans all columns
        tableBody.push([
            {
                content: section.title.toUpperCase(),
                colSpan: 5,
                styles: { fontStyle: "bold" as const, fillColor: [240, 240, 240] as unknown as string, cellPadding: 2, halign: "left" as const },
            },
        ]);

        const sectionItems = items.filter(i => i.section === section.id);
        for (const item of section.items) {
            const data = sectionItems.find(i => i.item_number === item.number);
            const scoreText = data?.score !== null && data?.score !== undefined ? String(data.score) : "";
            
            tableBody.push([
                String(item.number),
                item.label,
                scoreText,
                data?.catatan || "",
                data?.rtl || "",
            ]);
        }
    }

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["No", "Indikator / Pertanyaan", "Skor", "Catatan", "Rencana Tindak Lanjut"]],
        body: tableBody,
        theme: "grid",
        headStyles: {
            fillColor: [6, 182, 212], // cyan-500
            textColor: 255,
            fontSize: 9,
            fontStyle: "bold",
            halign: "center",
            valign: "middle",
        },
        styles: {
            fontSize: 8,
            cellPadding: 3,
            lineColor: [220, 220, 220],
            lineWidth: 0.1,
            valign: "top",
        },
        columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: 65 },
            2: { cellWidth: 15, halign: "center", fontStyle: "bold" },
            3: { cellWidth: "auto" },
            4: { cellWidth: "auto" },
        },
    });

    const pageH = doc.internal.pageSize.getHeight();
    let sigY = (doc as any).lastAutoTable.finalY + 15;
    
    // Check if signatures fit on current page (needs about 40mm)
    if (sigY + 40 > pageH - margin) {
        doc.addPage();
        sigY = margin + 10;
    }

    // ─── Signatures ─────────────────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const contentW = pageWidth - margin * 2;
    const colW = contentW / 2;
    
    const leftColX = margin + colW / 2;
    const rightColX = margin + colW + colW / 2;

    doc.text("Pihak Rumah Sakit", leftColX, sigY, { align: "center" });
    doc.text("Penanggung Jawab Gizi", leftColX, sigY + 5, { align: "center" });
    
    doc.text("Tim Supervisi", rightColX, sigY, { align: "center" });
    doc.text("Dinas Kesehatan Kab. Malang", rightColX, sigY + 5, { align: "center" });

    // signature lines
    const lineSigY = sigY + 25;
    doc.text(meta.penanggungJawab || "(................................)", leftColX, lineSigY, { align: "center" });
    doc.text(meta.timSupervisor || "(................................)", rightColX, lineSigY, { align: "center" });

    doc.save(`Supervisi_Gizi_RS_${meta.rsName.replace(/\s+/g, "_")}_${meta.tanggalSupervisi}.pdf`);
}
