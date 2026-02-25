/**
 * generateSupervisiPDF.ts
 * Generates a PDF matching the official Dinkes Kab. Malang supervision form.
 * Uses jsPDF + jspdf-autotable for table rendering.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SUPERVISI_SECTIONS } from "./supervisiConfig";

interface SessionMeta {
    puskesmasName: string;
    tanggalSupervisi: string;
    timSupervisor: string;
    penanggungJawab: string;
}

interface ItemRow {
    section: string;
    item_number: number;
    item_label: string;
    value: string | null;
    catatan: string | null;
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

export async function generateSupervisiPDF(meta: SessionMeta, items: ItemRow[]) {
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
    doc.text("TOOLS SUPERVISI DAN BIMBINGAN TEKNIS", pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.text("INTEGRASI PROGRAM KESGA GIZI", pageWidth / 2, y, { align: "center" });
    y += 8;

    // ─── Meta Info ──────────────────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const metaFields = [
        ["Nama Puskesmas", meta.puskesmasName],
        ["Tanggal Supervisi", formatDate(meta.tanggalSupervisi)],
        ["Tim Supervisor", meta.timSupervisor || "—"],
        ["Penanggung Jawab Program", meta.penanggungJawab || "—"],
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

    for (const section of SUPERVISI_SECTIONS) {
        // Section header row — spans all columns
        tableBody.push([
            {
                content: section.title.toUpperCase(),
                colSpan: 5,
                styles: { fontStyle: "bold" as const, fillColor: [240, 240, 240] as unknown as string, cellPadding: 2, halign: "left" as const },
            },
        ]);

        // Item rows — use marker for drawing checkmarks later
        const sectionItems = items.filter(i => i.section === section.id);
        for (const item of section.items) {
            const data = sectionItems.find(i => i.item_number === item.number);
            tableBody.push([
                String(item.number),
                item.label,
                data?.value === "ya" ? "__CHECK__" : "",
                data?.value === "tidak" ? "__CHECK__" : "",
                data?.catatan || "",
            ]);
        }
    }

    autoTable(doc, {
        startY: y,
        head: [["No", "Komponen", "Ya", "Tidak", "Catatan"]],
        body: tableBody as any,
        theme: "grid",
        styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.2,
            textColor: [0, 0, 0],
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: "bold",
            halign: "center",
            lineWidth: 0.3,
        },
        columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 70 },
            2: { cellWidth: 15, halign: "center" },
            3: { cellWidth: 15, halign: "center" },
            4: { cellWidth: pageWidth - margin * 2 - 10 - 70 - 15 - 15 },
        },
        margin: { left: margin, right: margin },
        didParseCell: (data: any) => {
            // Style section header rows
            if (data.row.raw && data.row.raw[0]?.styles?.fontStyle === "bold") {
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fillColor = [240, 240, 240];
            }
            // Hide marker text so we can draw the checkmark instead
            if (data.cell.text?.[0] === "__CHECK__") {
                data.cell.text = [""];
            }
        },
        didDrawCell: (data: any) => {
            // Draw checkmark in Ya/Tidak columns (index 2 and 3)
            if ((data.column.index === 2 || data.column.index === 3) && data.section === "body") {
                const rawValue = data.row.raw?.[data.column.index];
                if (rawValue === "__CHECK__") {
                    const cellX = data.cell.x;
                    const cellY = data.cell.y;
                    const cellW = data.cell.width;
                    const cellH = data.cell.height;

                    // Center of the cell
                    const cx = cellX + cellW / 2;
                    const cy = cellY + cellH / 2;

                    // Draw a checkmark ✓ shape
                    const size = 2.5;
                    doc.setDrawColor(0, 0, 0);
                    doc.setLineWidth(0.5);
                    // Short stroke down-left
                    doc.line(cx - size * 0.6, cy, cx - size * 0.1, cy + size * 0.5);
                    // Long stroke up-right
                    doc.line(cx - size * 0.1, cy + size * 0.5, cx + size * 0.7, cy - size * 0.6);
                }
            }
        },
    });

    // ─── Footer ─────────────────────────────────────────────────────────
    const finalY = (doc as any).lastAutoTable?.finalY || y + 100;
    if (finalY + 30 < doc.internal.pageSize.getHeight()) {
        const footerY = finalY + 15;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Dicetak pada: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`, margin, footerY);
        doc.text("Dokumen ini digenerate otomatis oleh SIGMA Ecosystem", margin, footerY + 4);
    }

    // ─── Save ───────────────────────────────────────────────────────────
    const safeFileName = meta.puskesmasName.replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`Supervisi_${safeFileName}_${meta.tanggalSupervisi}.pdf`);
}

function formatDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    } catch {
        return dateStr;
    }
}
