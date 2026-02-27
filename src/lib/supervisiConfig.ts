/**
 * supervisiConfig.ts
 * Static configuration for the 32-item Supervisi & Bimtek Gizi form.
 * Each section maps 1-to-1 with the original paper form.
 */

/** 'text' = Ya/Tidak + catatan text. 'integer' = Ya/Tidak + catatan_integer (numeric) + catatan text */
export type SectionInputType = 'text' | 'integer';

export interface SupervisiItem {
    number: number;
    label: string;
}

export interface SupervisiSection {
    id: string;
    title: string;
    inputType: SectionInputType;
    items: SupervisiItem[];
}

/** Sections where catatan field is numeric (integer analysis) */
export const INTEGER_SECTIONS = ['sumber_daya_manusia', 'sarana_prasarana', 'stok_obat_program'];

export const SUPERVISI_SECTIONS: SupervisiSection[] = [
    {
        id: 'perencanaan_program',
        title: 'Perencanaan Program',
        inputType: 'text',
        items: [
            { number: 1, label: 'Tahunan Program Gizi' },
            { number: 2, label: 'Perencanaan berbasis analisis situasi wilayah' },
            { number: 3, label: 'Menggunakan data (ePPGBM dan SIGIZI) untuk dianalisa' },
            { number: 4, label: 'Ada microplanning per desa' },
        ],
    },
    {
        id: 'sumber_daya_manusia',
        title: 'Sumber Daya Manusia',
        inputType: 'integer',
        items: [
            { number: 1, label: 'Tersedia Tenaga Gizi' },
            { number: 2, label: 'Kader terlatih PMBA' },
            { number: 3, label: 'Kader terlatih Konseling Menyusui' },
            { number: 4, label: 'Tersedia Posyandu Aktif' },
        ],
    },
    {
        id: 'sarana_prasarana',
        title: 'Sarana Prasarana',
        inputType: 'integer',
        items: [
            { number: 1, label: 'Alat antropometri terstandar' },
            { number: 2, label: 'Ruang Laktasi' },
            { number: 3, label: 'Dapur Aktif' },
            { number: 4, label: 'Ruang Konseling Gizi' },
            { number: 5, label: 'Media KIE' },
            { number: 6, label: 'Gudang Penyimpanan PMT' },
        ],
    },
    {
        id: 'stok_obat_program',
        title: 'Stok Obat Program',
        inputType: 'integer',
        items: [
            { number: 1, label: 'Vitamin A biru' },
            { number: 2, label: 'Vitamin A merah' },
            { number: 3, label: 'Tablet Tambah Darah' },
            { number: 4, label: 'MMS' },
            { number: 5, label: 'Taburia' },
            { number: 6, label: 'ZInc' },
            { number: 7, label: 'PKMK <1 th' },
            { number: 8, label: 'PKMK >1 th' },
            { number: 9, label: 'PMT Ibu Hamil' },
        ],
    },
    {
        id: 'pencatatan_pelaporan',
        title: 'Pencatatan Pelaporan',
        inputType: 'text',
        items: [
            { number: 1, label: 'Validasi rutin setiap bulan' },
            { number: 2, label: 'Pelaporan tepat waktu' },
            { number: 3, label: 'Pemanfaatan data untuk perencanaan' },
            { number: 4, label: 'Kesesuaian data by name by address' },
            { number: 5, label: 'Form Asuhan Gizi' },
            { number: 6, label: 'Pelaporan Tatalaksana' },
        ],
    },
    {
        id: 'kemitraan_lintas_sektor',
        title: 'Kemitraan Lintas Sektor',
        inputType: 'text',
        items: [
            { number: 1, label: 'Keterlibatan dalam TPPS Kecamatan' },
            { number: 2, label: 'Kerjasama dengan pemerintah desa' },
            { number: 3, label: 'Dukungan dana desa untuk kesehatan' },
        ],
    },
];

/** Total number of checklist items across all sections */
export const TOTAL_ITEMS = SUPERVISI_SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

/** Calculate completion score from items */
export function calculateCompletionScore(items: { value: string | null }[]): {
    filled: number;
    total: number;
    yaCount: number;
    tidakCount: number;
    percentage: number;
} {
    const total = items.length;
    const filled = items.filter(i => i.value === 'ya' || i.value === 'tidak').length;
    const yaCount = items.filter(i => i.value === 'ya').length;
    const tidakCount = items.filter(i => i.value === 'tidak').length;
    const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;
    return { filled, total, yaCount, tidakCount, percentage };
}
