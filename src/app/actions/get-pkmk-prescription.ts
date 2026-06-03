"use server";

import { GoogleAuth } from "google-auth-library";

export interface PkmkBalitaContext {
    nama: string;
    usiaBulan: number;
    jk: string;
    bb: number; // kg
    tb: number; // cm
    zs_bbu: number;
    zs_tbu: number;
    zs_bbtb: number;
    bblr_pblr: string; // e.g., "BBLR + PBLR", "Normal"
}

export async function getPkmkPrescription(balita: PkmkBalitaContext) {
    console.log("Generating PKMK Prescription for:", balita.nama);

    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    const aiModel = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-3.1-flash-lite';

    if (!projectId) {
        return { success: false, error: "Konfigurasi Project ID belum diatur." };
    }

    try {
        let auth;
        if (process.env.GOOGLE_CREDENTIALS_BASE64) {
            const credsStr = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
            const credentials = JSON.parse(credsStr);
            auth = new GoogleAuth({ credentials, scopes: 'https://www.googleapis.com/auth/cloud-platform' });
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
        } else {
            return { success: false, error: "Konfigurasi Kredensial GCP tidak ditemukan." };
        }

        const accessToken = await auth.getAccessToken();
        const vertexEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${aiModel}:generateContent`;

        const promptText = `
Anda adalah seorang Dokter Spesialis Anak & Clinical Pediatric Dietitian (Sistem Pakar).
Tugas Anda adalah merancang "Resep Tata Laksana Dietetik / PKMK" (Pangan Olahan Keperluan Medis Khusus) berdasarkan data pasien balita berikut:

**Profil Pasien:**
- Usia: ${balita.usiaBulan} bulan
- Jenis Kelamin: ${balita.jk === 'L' ? 'Laki-laki' : 'Perempuan'}
- Berat Badan: ${balita.bb} kg
- Panjang/Tinggi Badan: ${balita.tb} cm
- Z-Score BB/U (Underweight): ${balita.zs_bbu}
- Z-Score TB/U (Stunting): ${balita.zs_tbu}
- Z-Score BB/TB (Wasting): ${balita.zs_bbtb}
- Riwayat BBLR/PBLR: ${balita.bblr_pblr || 'Tidak diketahui/Normal'}

**Instruksi:**
Berdasarkan Pedoman Tata Laksana Gizi Buruk WHO / Kemenkes RI:
1.  **Diagnosis Status Gizi & Keparahan:** Tentukan kategori Gizi Buruk (Severe Acute Malnutrition), Gizi Kurang (Moderate), atau At-Risk Faltering berdasarkan Z-Score di atas.
2.  **Kalkulasi Kalori Kasar:** Hitung estimasi kebutuhan energi total (kkal/hari) dan protein (g/hari) untuk fase stabilisasi atau rehabilitasi/pemulihan (misal: 100-150 kkal/kgBB/hari untuk fase rehabilitasi). *Tampilkan hasil perhitungannya untuk pasien dengan BB ${balita.bb} kg ini.*
3.  **Rekomendasi Preskripsi PKMK:** 
    - Pilih formula yang sesuai usianya (misal bayi <6 bulan vs >6 bulan).
    - Pilih jenis formula medis (F-75, F-100, RUTF, atau suplemen makanan tinggi kalori protein).
    - Berikan instruksi pemberian (contoh: dibagi dalam 6x pemberian sehari).
4.  **Red Flags & Rujukan:** Sebutkan kriteria tanda bahaya (seperti edema, anoreksia, atau komplikasi medis) di mana anak harus dirawat inap (fase stabilisasi di RS) dan tidak boleh rawat jalan.

**Formatting:**
Gunakan Bahasa Indonesia profesional. Format menggunakan Markdown. 
Jangan gunakan tag Heading (seperti # atau ##). Cukup gunakan Bold (**teks**) dan List (-).
Di bagian paling bawah, tambahkan *disclaimer* berikut persis seperti ini:
*"⚠️ **Disclaimer Medis:** Kalkulasi ini dihasilkan oleh AI berdasarkan pedoman standar. Keputusan medis, dosis final, dan tata laksana klinis **wajib** dikonsultasikan dengan Dokter Spesialis Anak atau Ahli Gizi Terdaftar yang memeriksa kondisi klinis pasien secara langsung."*
        `;

        const response = await fetch(vertexEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: "Anda adalah SIGMA Advisor, Clinical Pediatric Dietitian System." }] },
                contents: [{ role: "user", parts: [{ text: promptText }] }],
                generationConfig: { temperature: 0.2, topP: 0.8, maxOutputTokens: 1024 }
            }),
        });

        const responseData = await response.json();

        if (!response.ok || responseData.error) {
            console.error("Vertex AI Error:", responseData.error);
            return { success: false, error: "Gagal memproses resep dari Vertex AI." };
        }

        const aiText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
        return { success: true, data: aiText };

    } catch (error: any) {
        console.error("=== PKMK PRESCRIPTION ERROR ===", error.message);
        return { success: false, error: "Terjadi kesalahan internal saat menghubungi AI." };
    }
}
