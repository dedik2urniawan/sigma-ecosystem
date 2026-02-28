/**
 * baBimtekConfig.ts
 * Configuration for BA Bimtek KGM programs and preset dasar hukum.
 */

export const BA_PROGRAMS = [
    { id: 'kia', label: 'Program Kesehatan Ibu dan Anak' },
    { id: 'kb_kespro', label: 'Program KB dan Kesehatan Reproduksi' },
    { id: 'ausrem', label: 'Program Anak Usia Sekolah dan Remaja' },
    { id: 'lansia', label: 'Program Kesehatan Usia Lanjut' },
    { id: 'gizi', label: 'Program Gizi' },
] as const;

export type ProgramId = typeof BA_PROGRAMS[number]['id'];

export const DASAR_HUKUM = [
    'Peraturan Presiden Nomor 72 Tahun 2021 tentang Percepatan Penurunan Stunting.',
    'Peraturan Menteri Kesehatan Nomor 86 Tahun 2024 PCN tentang Penyelenggaraan Tujuh Kebiasaan Hidup Sehat.',
    'Surat Keputusan Menteri Kesehatan Nomor HK.01.07/MENKES/626/04/2023 tentang Petunjuk Teknis Pengelolaan Program Kesehatan Keluarga dan Gizi.',
];

export const PEMBUKAAN_TEXT = (tanggal: string, tempat: string) =>
    `Pada hari ini ${tanggal} bertempat di ${tempat || '_______________'}, kami yang bertanda tangan di bawah ini:`;

export const PENUTUP_TEXT =
    'Demikian Berita Acara ini dibuat untuk dijadikan sebagaimana mestinya.';
