/**
 * baBimtekRsConfig.ts
 * Config for Berita Acara Bimtek RS — 2 program: KIA & Gizi
 */

export const BA_RS_PROGRAMS = [
    { id: 'kia',  label: 'Program Kesehatan Ibu dan Anak' },
    { id: 'gizi', label: 'Program Gizi' },
] as const;

export type BaRsProgramId = typeof BA_RS_PROGRAMS[number]['id'];

export const DASAR_HUKUM_RS = [
    'Peraturan Presiden Nomor 72 Tahun 2021 tentang Percepatan Penurunan Stunting.',
    'Peraturan Menteri Kesehatan Nomor 78 Tahun 2013 tentang Pedoman Pelayanan Gizi Rumah Sakit.',
    'Surat Keputusan Menteri Kesehatan Nomor HK.01.07/MENKES/626/04/2023 tentang Petunjuk Teknis Pengelolaan Program Kesehatan Keluarga dan Gizi.',
];

export const PEMBUKAAN_RS_TEXT = (tanggal: string, tempat: string) =>
    `Pada hari ini ${tanggal} bertempat di ${tempat || '_______________'}, kami yang bertanda tangan di bawah ini:`;

export const PENUTUP_RS_TEXT =
    'Demikian Berita Acara ini dibuat untuk dijadikan sebagaimana mestinya.';
