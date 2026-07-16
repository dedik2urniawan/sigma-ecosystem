/**
 * supervisiRsConfig.ts
 * Instrumen Supervisi Gizi Rumah Sakit — 22 item, 5 domain.
 * Scoring: 0 = Tidak ada dokumen, 1 = Ada tapi tidak lengkap, 2 = Dokumen lengkap
 * Max total score = 22 × 2 = 44
 * Klasifikasi: ≥80% = BAIK, 60–79% = CUKUP, <60% = KURANG
 */

export interface SupervisiRsItem {
    number: number;           // nomor dalam seksi (1-based)
    standar: string;          // sub-judul / standar
    label: string;            // pertanyaan telaah
    metode: string;           // metode verifikasi
    buktiObjektif: string;    // bukti objektif yang dicari
}

export interface SupervisiRsSection {
    id: string;
    title: string;
    items: SupervisiRsItem[];
}

export const SUPERVISI_RS_SECTIONS: SupervisiRsSection[] = [
    {
        id: 'manajemen',
        title: 'Manajemen',
        items: [
            {
                number: 1,
                standar: 'Struktur Organisasi',
                label: 'Apakah rumah sakit memiliki struktur organisasi Instalasi Gizi yang jelas beserta penanggung jawab tiap unit (MSPM, Klinik, Mutu)?',
                metode: 'Dokumen',
                buktiObjektif: 'SK Struktur Organisasi',
            },
            {
                number: 2,
                standar: 'Uraian Tugas',
                label: 'Apakah terdapat uraian tugas (job desk) tertulis untuk kepala instalasi, dietisien, petugas produksi, dan logistik?',
                metode: 'Dokumen',
                buktiObjektif: 'Dokumen Uraian Tugas',
            },
            {
                number: 3,
                standar: 'Pedoman & SOP',
                label: 'Apakah rumah sakit memiliki pedoman pelayanan instalasi gizi dan SOP induk yang mutakhir dan disahkan?',
                metode: 'Dokumen',
                buktiObjektif: 'Pedoman Pelayanan dan SOP',
            },
            {
                number: 4,
                standar: 'Evaluasi Mutu',
                label: 'Apakah instalasi gizi rutin memantau indikator mutu (sisa makanan, ketepatan waktu, ketepatan diet, survey kepuasan pasien dll)?',
                metode: 'Dokumen & Observasi',
                buktiObjektif: 'Rekapitulasi indikator mutu & laporan capaian (ketepatan waktu, ketepatan diet, food waste)',
            },
        ],
    },
    {
        id: 'mspm',
        title: 'MSPM (Manajemen Sistem Penyelenggaraan Makanan)',
        items: [
            {
                number: 1,
                standar: 'Perencanaan Menu',
                label: 'Apakah terdapat siklus menu terstandar yang dievaluasi secara berkala (termasuk tingkat kebosanan)?',
                metode: 'Dokumen & Wawancara',
                buktiObjektif: 'Dokumen siklus menu & hasil evaluasi',
            },
            {
                number: 2,
                standar: 'Pengadaan Bahan',
                label: 'Apakah pengadaan bahan makanan memiliki spesifikasi yang jelas, kontrol vendor, dan mekanisme saat stok kurang?',
                metode: 'Dokumen',
                buktiObjektif: 'PO, kontrak vendor, spesifikasi bahan',
            },
            {
                number: 3,
                standar: 'Penyimpanan (Gudang)',
                label: 'Apakah penyimpanan menerapkan prinsip FIFO/FEFO, pemisahan bahan basah-kering, dan pemantauan suhu ruangan/kulkas?',
                metode: 'Observasi & Dokumen',
                buktiObjektif: 'Form pemantauan suhu, penataan stok, kartu stok',
            },
            {
                number: 4,
                standar: 'Produksi & Higiene',
                label: 'Apakah petugas konsisten menggunakan APD lengkap, mencuci tangan, dan menjaga personal hygiene saat mengolah makanan?',
                metode: 'Observasi',
                buktiObjektif: 'Kepatuhan APD di dapur, fasilitas cuci tangan',
            },
            {
                number: 5,
                standar: 'Keamanan Pangan',
                label: 'Apakah prinsip keamanan pangan (HACCP/GMP) benar-benar diimplementasikan dalam praktik produksi?',
                metode: 'Observasi & Wawancara',
                buktiObjektif: 'Form monitoring HACCP, pengecekan titik kritis',
            },
            {
                number: 6,
                standar: 'Distribusi Makanan',
                label: 'Apakah distribusi makanan ke pasien dipastikan tepat diet, tepat pasien, dan tepat waktu?',
                metode: 'Observasi & Tracer',
                buktiObjektif: 'Label makanan, jam kedatangan troli di ruangan',
            },
        ],
    },
    {
        id: 'gizi_klinik',
        title: 'Gizi Klinik',
        items: [
            {
                number: 1,
                standar: 'Skrining Gizi',
                label: 'Apakah seluruh pasien rawat inap menjalani skrining risiko gizi dalam 24 jam pertama masuk RS?',
                metode: 'Tracer RM',
                buktiObjektif: 'Form skrining gizi di Rekam Medis terisi',
            },
            {
                number: 2,
                standar: 'Asesmen & Diagnosis',
                label: 'Apakah pasien berisiko gizi mendapat asesmen lanjutan, diagnosis gizi, dan rencana intervensi individual (PAGT/NCP)?',
                metode: 'Tracer RM',
                buktiObjektif: 'Catatan ADIME di rekam medis terintegrasi',
            },
            {
                number: 3,
                standar: 'Pemantauan Asupan',
                label: 'Apakah dilakukan pemantauan asupan makan harian, toleransi, dan evaluasi kecukupan energi-protein pasien?',
                metode: 'Tracer RM & Dokumen',
                buktiObjektif: 'Lembar observasi asupan (intake), evaluasi gizi harian',
            },
            {
                number: 4,
                standar: 'Edukasi Gizi — Dokumentasi',
                label: 'Apakah pasien/keluarga mendapat edukasi gizi dan didokumentasikan dengan baik di rekam medis?',
                metode: 'Tracer RM & Wawancara',
                buktiObjektif: 'Catatan edukasi gizi terintegrasi di RM',
            },
            {
                number: 5,
                standar: 'Edukasi Gizi — Media & Alat',
                label: 'Apakah dalam proses konseling telah menggunakan media gizi yang proper (Leaflet, media cetak, media digital, food model dll) dan alat ukur assessment yang terstandar (antropometri kit, BSA, Blood Analysis dll)?',
                metode: 'Tracer & Cek Kelengkapan',
                buktiObjektif: 'Media KIE, kelengkapan alat ukur assessment gizi',
            },
        ],
    },
    {
        id: 'sdm',
        title: 'SDM (Sumber Daya Manusia)',
        items: [
            {
                number: 1,
                standar: 'Ketersediaan Staf',
                label: 'Apakah jumlah dan kualifikasi SDM gizi sesuai dengan beban kerja pelayanan di rumah sakit?',
                metode: 'Dokumen',
                buktiObjektif: 'Pola ketenagaan / Analisis beban kerja (ABK)',
            },
            {
                number: 2,
                standar: 'Pelatihan Staf',
                label: 'Apakah staf gizi rutin mendapat pelatihan berkala (higiene sanitasi, asuhan gizi, PPI, keselamatan pasien)?',
                metode: 'Dokumen',
                buktiObjektif: 'Sertifikat / Daftar hadir in-house training',
            },
            {
                number: 3,
                standar: 'Supervisi Internal / Audit Internal RS',
                label: 'Apakah kepala unit/supervisor melakukan supervisi internal secara rutin dan memberikan umpan balik (feedback)?',
                metode: 'Dokumen',
                buktiObjektif: 'Form supervisi internal, buku log coaching/feedback',
            },
        ],
    },
    {
        id: 'pelita_kesmas',
        title: 'Pelaporan Pelita Kesmas',
        items: [
            {
                number: 1,
                standar: 'Akses & Registrasi',
                label: 'Apakah RS memiliki PIC khusus dan akses aktif pada platform SIGIZI-KESGA (Modul Pelita Kesmas)?',
                metode: 'Dokumen & Praktik',
                buktiObjektif: 'SK Penunjukan PIC, demonstrasi login aplikasi',
            },
            {
                number: 2,
                standar: 'Input Pasien Masuk',
                label: 'Apakah balita gizi buruk yang dirawat inap langsung dicatat identitas, keluhan penyerta, dan riwayat gizi pada aplikasi?',
                metode: 'Telusur Aplikasi & RM',
                buktiObjektif: 'Kesesuaian data RM balita dengan rekap aplikasi',
            },
            {
                number: 3,
                standar: 'Monitoring Perawatan',
                label: 'Apakah riwayat pemberian tata laksana medis dan terapi gizi (F75, F100, MTG) diupdate secara berkala selama rawat inap?',
                metode: 'Telusur Aplikasi',
                buktiObjektif: 'History catatan rawat inap di dashboard Pelita Kesmas',
            },
            {
                number: 4,
                standar: 'Status Keluar & Rujukan',
                label: 'Apakah kriteria keluar rawat inap dipatuhi (klinis membaik, edema berkurang) dan status kepulangan diupdate di sistem?',
                metode: 'Telusur Aplikasi & Dokumen',
                buktiObjektif: 'Dokumen rujukan balik ke faskes primer, status aplikasi',
            },
        ],
    },
];

/** Total item across all sections */
export const TOTAL_RS_ITEMS = SUPERVISI_RS_SECTIONS.reduce((s, sec) => s + sec.items.length, 0);

/** Max possible score = total items × 2 */
export const MAX_RS_SCORE = TOTAL_RS_ITEMS * 2;

export type ScoreValue = 0 | 1 | 2 | null;

/** Calculate score metrics from items */
export function calculateRsScore(items: { score: ScoreValue }[]): {
    totalScore: number;
    maxScore: number;
    percentage: number;
    score0: number;
    score1: number;
    score2: number;
    filled: number;
    classification: 'BAIK' | 'CUKUP' | 'KURANG' | 'BELUM';
    classColor: string;
    classBadge: string;
} {
    const scored = items.filter(i => i.score !== null && i.score !== undefined);
    const filled = scored.length;
    const totalScore = scored.reduce((s, i) => s + (i.score ?? 0), 0);
    const maxScore = items.length * 2;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const score0 = items.filter(i => i.score === 0).length;
    const score1 = items.filter(i => i.score === 1).length;
    const score2 = items.filter(i => i.score === 2).length;

    let classification: 'BAIK' | 'CUKUP' | 'KURANG' | 'BELUM';
    let classColor: string;
    let classBadge: string;

    if (filled === 0) {
        classification = 'BELUM';
        classColor = 'text-slate-400';
        classBadge = 'bg-slate-100 text-slate-500 border-slate-200';
    } else if (percentage >= 80) {
        classification = 'BAIK';
        classColor = 'text-emerald-600';
        classBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (percentage >= 60) {
        classification = 'CUKUP';
        classColor = 'text-amber-600';
        classBadge = 'bg-amber-50 text-amber-700 border-amber-200';
    } else {
        classification = 'KURANG';
        classColor = 'text-red-600';
        classBadge = 'bg-red-50 text-red-700 border-red-200';
    }

    return { totalScore, maxScore, percentage, score0, score1, score2, filled, classification, classColor, classBadge };
}

/** Score label and color helper */
export function getScoreLabel(score: ScoreValue): { label: string; color: string; bg: string } {
    if (score === null || score === undefined) return { label: '—', color: 'text-slate-400', bg: 'bg-slate-50' };
    if (score === 0) return { label: '0 – Tidak Ada', color: 'text-red-600', bg: 'bg-red-50' };
    if (score === 1) return { label: '1 – Tidak Lengkap', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { label: '2 – Lengkap', color: 'text-emerald-600', bg: 'bg-emerald-50' };
}
