"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Sparkles, 
  MapPin, 
  Activity, 
  Brain, 
  Dna, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Layers,
  Award,
  HeartHandshake
} from "lucide-react";

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'features' | 'workflow' | 'tips'>('features');

  useEffect(() => {
    // Check if modal was already shown in this session
    const shownThisSession = sessionStorage.getItem("pkmk_welcome_shown_v2");
    if (shownThisSession !== "true") {
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem("pkmk_welcome_shown_v2", "true");
      }, 350);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200/80 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header with Gradient Banner */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800 p-5 sm:p-6 text-white shrink-0 overflow-hidden">
          {/* Background Decorative Glow */}
          <div className="absolute -right-10 -top-10 w-44 h-44 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-32 -bottom-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-inner shrink-0">
                <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Selamat Datang di SIGMA PKMK
                  </h2>
                  <span className="bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full shadow-sm">
                    RELEASE v2.0
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-0.5">
                  Platform Analisis Klinis Longitudinal & Intervensi Gizi Medis Terintegrasi
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/15 shrink-0"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs Header */}
          <div className="flex items-center gap-2 mt-5 pt-3 border-t border-white/15 text-xs font-bold">
            <button
              onClick={() => setActiveTab('features')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'features'
                  ? 'bg-white text-teal-900 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Fitur Baru v2.0
            </button>
            <button
              onClick={() => setActiveTab('workflow')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'workflow'
                  ? 'bg-white text-teal-900 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-300" />
              Alur & Urutan Kerja
            </button>
            <button
              onClick={() => setActiveTab('tips')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'tips'
                  ? 'bg-white text-teal-900 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
              Tips & Kepatuhan
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-700 text-sm max-h-[calc(92vh-190px)]">
          
          {/* TAB 1: FITUR BARU v2.0 */}
          {activeTab === 'features' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-teal-200/80 rounded-2xl p-4 flex items-start gap-3">
                <Award className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-teal-900 text-sm">
                    Revolusi Analisis Saintifik & Asesmen Terpadu
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    SIGMA PKMK v2.0 menghadirkan modul komputasi klinis mutakhir untuk mendukung tenaga gizi dan puskesmas dalam pemantauan longitudinal balita stunting secara presisi.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                
                {/* Feature 1: Geo-AI Hotspot */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-md transition group">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-sky-700 transition">
                        Geo-AI Stunting Hotspot
                      </h4>
                      <span className="text-[10px] text-sky-600 font-semibold">Spasial GIS & Klaster Risiko</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pemetaan spasial cerdas berbasis koordinat geotag tempat tinggal balita untuk mendeteksi kantong stunting dan klaster prioritas intervensi.
                  </p>
                </div>

                {/* Feature 2: Scientific Dashboard */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition group">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-emerald-700 transition">
                        Dashboard Analisis Saintifik
                      </h4>
                      <span className="text-[10px] text-emerald-600 font-semibold">WHO LMS Z-Score & Kinetika BB</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Evaluasi dinamika kurva pertumbuhan, perhitungan laju *weight increment* harian/mingguan, serta evaluasi rasio efektivitas PKMK.
                  </p>
                </div>

                {/* Feature 3: SDIDTK & M-CHAT-R */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition group">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-indigo-700 transition">
                        SDIDTK & M-CHAT-R Autisme
                      </h4>
                      <span className="text-[10px] text-indigo-600 font-semibold">Kemenkes RI 2022 Terintegrasi</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Kuesioner KPSP 10 bracket usia, radar 4 sektor perkembangan, skrining TDD/TDL/Leukokoria, serta modul lengkap 20 butir M-CHAT-R deteksi autisme.
                  </p>
                </div>

                {/* Feature 4: TPG Mid-Parental Height */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-teal-300 hover:shadow-md transition group">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                      <Dna className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-teal-700 transition">
                        Tinggi Potensi Genetik (TPG)
                      </h4>
                      <span className="text-[10px] text-teal-600 font-semibold">Proyeksi Tinggi Dewasa & MPH</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Perhitungan otomatis proyeksi potensi genetik tinggi badan anak saat dewasa berdasarkan tinggi biologis orang tua & rentang deviasi ±8.5 cm.
                  </p>
                </div>

                {/* Feature 5: Digital Report Card (Full Width) */}
                <div className="md:col-span-2 p-4 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50/60 via-amber-50/30 to-purple-50/40 hover:shadow-md transition group">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-rose-700 transition">
                        Kartu Rapor Balita Digital & E-Certificate PKMK
                      </h4>
                      <span className="text-[10px] text-rose-600 font-semibold">Rekap Intervensi 12 Minggu Siap Cetak</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Generate lembar laporan komprehensif balita per siklus yang merangkum kurva kenaikan antropometri, tingkat kepatuhan konsumsi kalori, hasil asesmen SDIDTK, catatan evaluasi medis, dan status kelulusan intervensi.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: ALUR KERJA STANDAR */}
          {activeTab === 'workflow' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-2.5">
                <span className="font-bold text-base">⚠️</span>
                <div>
                  <strong className="block font-bold mb-0.5">Penting: Urutan Alur Pengisian Data</strong>
                  Untuk mencegah *orphaned records* dan menjamin data kohort sinkron, ikuti alur standar berikut:
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Registrasi Master Balita</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Input data identitas balita (NIK 16 digit, Nama, Tgl Lahir, Jenis Kelamin, Orang Tua) melalui menu <strong>Daftar Balita</strong> atau Import Excel.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Pendaftaran Kohort PKMK (1x per Siklus)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Daftarkan balita yang memenuhi kriteria stunting/weight faltering ke dalam <strong>Kohort PKMK</strong> untuk membuka siklus pemantauan 12 minggu.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Input Monitoring Berkala (Minggu 1 – 12)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gunakan tombol aksi di tabel monitoring: <strong>📏 Antropometri</strong>, <strong>🍽️ Konsumsi</strong>, dan <strong>💜 Pemberian PKMK</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Asesmen Lanjutan (TPG, Geotag & SDIDTK)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Lakukan asesmen berkala Tinggi Potensi Genetik, titikan koordinat rumah balita, serta skrining tumbuh kembang SDIDTK & autisme M-CHAT-R.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    5
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Penyelesaian Intervensi & Rapor Digital</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Balita yang telah terpantau ≥ 10 minggu dapat ditandai <strong>Selesai Intervensi</strong> melalui tombol centang dan di-generate kartu rapornya.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TIPS & KEBIJAKAN */}
          {activeTab === 'tips' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Validasi Tanggal Pemantauan
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Sistem memvalidasi bahwa tanggal pemeriksaan/monitoring tidak boleh melebihi tanggal hari ini (*anti-future date*).
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Format NIK Baku 16 Digit
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Pastikan NIK balita tepat 16 digit angka sesuai Kartu Keluarga untuk integrasi data kependudukan dan rujukan faskes.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Import & Export Excel Cepat
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Manfaatkan menu Import Excel untuk pendaftaran balita dan pemantauan massal saat posyandu selesai dilakukan.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Kepatuhan Dosis Kalori PKMK
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Pantau target asupan kalori PKMK harian agar intervensi memenuhi standar pemulihan berat badan (*catch-up growth*).
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-300 rounded-xl p-4 text-xs text-emerald-900 flex items-center gap-3">
                <HeartHandshake className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>
                  <strong>Dukungan Teknis Dinkes Kab. Malang:</strong> Apabila menemui kendala pengoperasian atau membutuhkan pendampingan data, silakan hubungi tim admin gizi Dinas Kesehatan.
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer with Action Buttons */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-400 text-center sm:text-left font-medium">
            💡 Informasi panduan & insight v2.0 dapat diakses kembali kapan saja.
          </span>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {activeTab !== 'tips' ? (
              <button
                onClick={() => setActiveTab(activeTab === 'features' ? 'workflow' : 'tips')}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition flex items-center justify-center gap-1"
              >
                Selanjutnya <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : null}
            <button
              onClick={handleClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs shadow-md shadow-teal-700/20 hover:from-emerald-700 hover:to-teal-800 transition flex items-center justify-center gap-1.5"
            >
              Mulai Menggunakan SIGMA PKMK
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
