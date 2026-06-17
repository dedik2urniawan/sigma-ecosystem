"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SignatureCanvas from "react-signature-canvas";

import { supabase } from "@/lib/supabase";

const KELOMPOK_SASARAN = ["Balita", "PAUD", "SD Kelas 1-3", "SD Kelas 4-6", "SMP", "SMA", "Ibu Hamil", "Ibu Menyusui"];
const KOMPONEN_HIDANGAN = ["Makanan Pokok", "Lauk Hewani", "Lauk Nabati", "Sayuran", "Buah", "Susu"];
const KOMPONEN_GIZI = ["Kalori (kkal)", "Karbohidrat (g)", "Protein (g)", "Lemak (g)", "Vitamin A (mcg)", "Vitamin C (mg)", "Zat Besi (mg)"];

const CLOSED_QUESTIONS = [
    {
        category: "A. Sumber Daya Manusia & Perencanaan Menu",
        questions: [
            { id: "q1", text: "Apakah SPPG memiliki Tenaga Ahli Gizi (Pengawas Produksi dan Kualitas) yang memenuhi kualifikasi (Lulusan D3/D4/S1 Gizi atau berpengalaman minimal 1 tahun di bidangnya)?", crucial: false },
            { id: "q2", text: "Apakah penyusunan master menu dilakukan secara berkala setiap minggu oleh Ahli Gizi bersama tim dapur?", crucial: false },
            { id: "q3", text: "Apakah master menu disusun spesifik dan disesuaikan berdasarkan variasi kebutuhan gizi masing-masing kelompok sasaran (Balita, PAUD, dll)?", crucial: false },
            { id: "q4", text: "Apakah penentuan bahan pangan dan siklus menu telah dikoordinasikan antar-tenaga gizi SPPG sewilayah untuk mencegah kelangkaan bahan di pasar lokal?", crucial: false },
            { id: "q5", text: "Apakah bahan pangan wajib terfortifikasi (seperti tepung terigu, minyak kelapa sawit kemasan, garam beryodium, dan beras terfortifikasi jika ada) wajib digunakan dalam setiap pengolahan?", crucial: false },
            { id: "q6", text: "Apakah menu hidangan dirancang dengan mengutamakan bahan makanan lokal yang sudah dikenal oleh masyarakat setempat?", crucial: false },
            { id: "q7", text: "Apakah sudah dilakukan identifikasi terhadap sasaran (anak/ibu) yang memiliki riwayat alergi, intoleransi, atau fobia makanan, serta disediakan menu alternatif untuk mereka?", crucial: false }
        ]
    },
    {
        category: "B. Standar Kontribusi Gizi & Kualitas Hidangan",
        questions: [
            { id: "q8", text: "Apakah struktur menu yang disajikan sudah lengkap mengacu pada prinsip Gizi Seimbang (terdiri dari makanan pokok, lauk-pauk, sayuran, dan buah)?", crucial: false },
            { id: "q9", text: "Jika MBG disajikan sebagai makan pagi (pukul 06.00–09.00), apakah kandungan gizinya dipastikan berkontribusi sebesar 20–25% dari Angka Kecukupan Gizi (AKG) harian sasaran?", crucial: false },
            { id: "q10", text: "Jika MBG disajikan sebagai makan siang (pukul 11.00–14.00), apakah kandungan gizinya dipastikan berkontribusi sebesar 30–35% dari AKG harian sasaran?", crucial: false },
            { id: "q11", text: "Apakah masakan diupayakan kering atau minim kuah untuk mencegah makanan cepat basi serta menghindari risiko tumpah selama distribusi?", crucial: false },
            { id: "q12", text: "Apakah pihak dapur SPPG telah memiliki Sertifikat Halal resmi?", crucial: false }
        ]
    },
    {
        category: "C. Operasional Dapur, Keselamatan Pangan (Food Safety), dan Sampel",
        questions: [
            { id: "q13", text: "Apakah pengolahan/memasak makanan dilakukan dalam rentang waktu maksimal 4–6 jam sebelum jam makan bersama dilaksanakan di sekolah/posyandu?", crucial: false },
            { id: "q14", text: "Apakah Ahli Gizi melakukan Quality Control fisik (pengecekan rasa, warna, dan aroma) terhadap masakan sebelum dikemas dan dikirim?", crucial: false },
            { id: "q15", text: "Apakah petugas penjamah makanan (food handler) mengenakan seragam dan perlengkapan higienis (masker, sarung tangan, penutup kepala) saat mengolah dan memporsi makanan?", crucial: false },
            { id: "q16", text: "Krusial: Apakah pihak SPPG mengambil dan menyimpan sampel makanan (food sample/safety food) sebanyak 1 porsi lengkap di dalam lemari pendingin setiap hari sebagai protokol penanganan darurat keracunan?", crucial: true },
            { id: "q17", text: "Apakah makanan dikemas menggunakan wadah makanan (foodtray) tertutup berbahan stainless steel tipe foodgrade (diutamakan tipe 304/316/430) yang memiliki 5 cekungan?", crucial: false },
            { id: "q18", text: "Apakah kendaraan pengantaran makanan menggunakan mobil box tertutup yang higienis dan dilengkapi rak khusus penyimpanan wadah makanan?", crucial: false }
        ]
    },
    {
        category: "D. Distribusi dan Pemantauan Status Gizi",
        questions: [
            { id: "q19", text: "Apakah waktu tempuh pengiriman dari lokasi dapur SPPG sampai ke titik sasaran terjaga maksimal 20 menit (atau radius maksimal 6 km)?", crucial: false },
            { id: "q20", text: "Untuk kelompok sasaran non-sekolah (Ibu Hamil, Ibu Menyusui, dan Balita), apakah distribusi berkolaborasi aktif dengan bidan desa serta kader Posyandu/PKK/KB setempat?", crucial: false },
            { id: "q21", text: "Apakah dilakukan pemantauan perkembangan gizi penerima manfaat secara berkala (pengukuran Berat Badan, Tinggi/Panjang Badan) setiap 6 bulan sekali melalui prosedur kesehatan?", crucial: false }
        ]
    }
];

export default function SupervisiFormPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Form States
    const [puskesmas, setPuskesmas] = useState("");
    const [desa, setDesa] = useState("");
    const [sppgId, setSppgId] = useState("");
    const [namaYayasan, setNamaYayasan] = useState("");
    const [namaAhliGizi, setNamaAhliGizi] = useState("");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    
    // RBAC & Dynamic Refs
    const [role, setRole] = useState<string | null>(null);
    const [puskesmasOptions, setPuskesmasOptions] = useState<{ id: string; name: string }[]>([]);
    const [desaOptions, setDesaOptions] = useState<{ id: string; name: string; puskesmas_id: string, puskesmas_name: string }[]>([]);
    const [filteredDesa, setFilteredDesa] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        const storedRole = localStorage.getItem("mbg_role");
        const storedPuskesmas = localStorage.getItem("mbg_puskesmas");
        if (storedRole) setRole(storedRole);

        const fetchRefs = async () => {
            try {
                const res = await fetch("/api/mbg/refs");
                const data = await res.json();
                if (data.success) {
                    const pData = data.data.puskesmas;
                    const dData = data.data.desa;
                    
                    let pOptions = pData ? pData.map((p: any) => ({ id: p.id, name: p.nama })) : [];
                    let dOptions = dData ? dData.map((d: any) => ({ id: d.id, name: d.desa_kel, puskesmas_id: d.puskesmas_id, puskesmas_name: d.puskesmas })) : [];

                    setDesaOptions(dOptions);

                    if (storedRole === "admin_puskesmas" && storedPuskesmas) {
                        // Normalize check (e.g. "Puskesmas Singosari" vs "SINGOSARI")
                        const cleanStored = storedPuskesmas.toLowerCase().replace('puskesmas', '').trim();
                        const myPuskesmas = pOptions.find((p: any) => p.name.toLowerCase().includes(cleanStored));
                        if (myPuskesmas) {
                            pOptions = [myPuskesmas];
                            setPuskesmas(myPuskesmas.name);
                            setFilteredDesa(dOptions.filter((d: any) => d.puskesmas_name === myPuskesmas.name));
                        }
                    }
                    setPuskesmasOptions(pOptions);
                }
            } catch (e) {
                console.error("Failed to fetch refs", e);
            }
        };
        fetchRefs();
    }, []);

    useEffect(() => {
        if (puskesmas && role === "superadmin") {
            setFilteredDesa(desaOptions.filter(d => d.puskesmas_name === puskesmas));
        }
    }, [puskesmas, desaOptions, role]);
    
    // Closed Questions State (answer: yes/no, note: string)
    const [closedAnswers, setClosedAnswers] = useState<Record<string, { answer: boolean | null, note: string }>>(
        CLOSED_QUESTIONS.flatMap(c => c.questions).reduce((acc, q) => ({ ...acc, [q.id]: { answer: null, note: "" } }), {})
    );

    // Open Questions State
    const [openAnswers, setOpenAnswers] = useState({
        preferensi: "",
        fortifikasi: "",
        konsultasi: "",
        edukasi: "",
        kedaruratan: ""
    });

    // Multiple Sasaran Audit State
    type AuditItem = Record<string, { std: string, s1: string, s2: string, s3: string }>;
    type GiziItem = Record<string, { std: string, real: string }>;
    interface SasaranAudit {
        id: string;
        sasaran_name: string;
        auditData: AuditItem;
        giziData: GiziItem;
    }

    const defaultAuditData = () => KOMPONEN_HIDANGAN.reduce((acc, k) => ({ ...acc, [k]: { std: "", s1: "", s2: "", s3: "" } }), {});
    const defaultGiziData = () => KOMPONEN_GIZI.reduce((acc, k) => ({ ...acc, [k]: { std: "", real: "" } }), {});

    const [sasaranList, setSasaranList] = useState<SasaranAudit[]>([
        { id: Date.now().toString(), sasaran_name: "", auditData: defaultAuditData() as AuditItem, giziData: defaultGiziData() as GiziItem }
    ]);
    const [activeSasaranIndex, setActiveSasaranIndex] = useState<number>(0);

    const addSasaran = () => {
        setSasaranList([...sasaranList, { id: Date.now().toString(), sasaran_name: "", auditData: defaultAuditData() as AuditItem, giziData: defaultGiziData() as GiziItem }]);
        setActiveSasaranIndex(sasaranList.length);
    };

    const removeSasaran = (index: number) => {
        if (sasaranList.length === 1) return;
        const newList = [...sasaranList];
        newList.splice(index, 1);
        setSasaranList(newList);
        setActiveSasaranIndex(Math.max(0, index - 1));
    };

    const calculateScorePercentage = (): number => {
        // Mock logic for score
        return 85;
    };

    const nextStep = () => setStep(s => Math.min(4, s + 1));
    const prevStep = () => setStep(s => Math.max(1, s - 1));

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError("");

        try {
            // Spread closedAnswers to qX_ans and qX_note
            const spreadAnswers: any = {};
            for (let i = 1; i <= 21; i++) {
                spreadAnswers[`q${i}_ans`] = closedAnswers[`q${i}`]?.answer ?? null;
                spreadAnswers[`q${i}_note`] = closedAnswers[`q${i}`]?.note ?? "";
            }

            const payload = {
                puskesmas,
                desa,
                sppg_id: sppgId,
                nama_yayasan: namaYayasan,
                nama_ahli_gizi: namaAhliGizi,
                lat: parseFloat(lat) || 0,
                lng: parseFloat(lng) || 0,
                ...spreadAnswers,
                open_preferensi: openAnswers.preferensi,
                open_fortifikasi: openAnswers.fortifikasi,
                open_konsultasi: openAnswers.konsultasi,
                open_edukasi: openAnswers.edukasi,
                open_kedaruratan: openAnswers.kedaruratan,
                audit_weighting: sasaranList,
                audit_gizi: sasaranList, // save both under same array, or null
                score_percentage: calculateScorePercentage(),
                status: "submitted"
            };

            const response = await fetch("/api/mbg/supervisi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Gagal mengirim data.");

            alert("Laporan Supervisi berhasil dikirim!");
            router.push("/mbg/supervisi");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolokasi tidak didukung oleh browser Anda.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLat(position.coords.latitude.toString());
                setLng(position.coords.longitude.toString());
            },
            (err) => {
                alert("Gagal mendapatkan lokasi: " + err.message);
            }
        );
    };

    const sigCanvas = useRef<SignatureCanvas>(null);
    const clearSignature = () => {
        sigCanvas.current?.clear();
    };

    const renderStepIndicator = () => (
        <div className="mb-10">
            <div className="flex items-center justify-between w-full relative">
                {[1, 2, 3, 4].map((s, index) => (
                    <React.Fragment key={s}>
                        {/* Step Circle */}
                        <div className="flex flex-col items-center relative z-10 w-16">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-2 ${s === step ? 'bg-amber-600 text-white border-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-110' : s < step ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-400 border-slate-300'}`}>
                                {s < step ? <span className="material-icons-round text-sm">check</span> : s}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider mt-3 whitespace-nowrap transition-colors duration-300 ${s <= step ? 'text-amber-700' : 'text-slate-400'}`}>
                                {s === 1 ? "Identitas" : s === 2 ? "Kualitatif" : s === 3 ? "Kuantitatif" : "Finalisasi"}
                            </span>
                        </div>
                        {/* Connecting Line */}
                        {index < 3 && (
                            <div className="flex-auto h-1 mx-2 rounded-full bg-slate-200 relative overflow-hidden mt-[-24px]">
                                <div className="absolute top-0 left-0 h-full bg-amber-500 transition-all duration-500 ease-in-out" style={{ width: s < step ? '100%' : '0%' }}></div>
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-display">
            <nav className="fixed top-0 w-full z-50 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-3">
                            <Link href="/mbg/supervisi" className="p-2 -ml-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                <span className="material-icons-round">arrow_back</span>
                            </Link>
                            <h1 className="font-bold text-slate-900">Form Supervisi SPPG</h1>
                        </div>
                        <div className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                            Draft Mode
                        </div>
                    </div>
                </div>
            </nav>

            <main className="pt-24 pb-24 px-4 sm:px-6 max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-10">
                    {renderStepIndicator()}
                    {error && <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200 font-bold">{error}</div>}

                    {/* STEP 1: IDENTITAS */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <span className="material-icons-round text-amber-500">assignment_ind</span>
                                Identitas SPPG & Wilayah
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Puskesmas Pembina</label>
                                    <select 
                                        value={puskesmas} onChange={e => { setPuskesmas(e.target.value); setDesa(""); }}
                                        className="w-full rounded-xl border border-slate-300 shadow-sm bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm appearance-none"
                                        disabled={role === "admin_puskesmas"}
                                    >
                                        <option value="">-- Pilih Puskesmas --</option>
                                        {puskesmasOptions.map(p => (
                                            <option key={p.id} value={p.name}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Desa / Kelurahan</label>
                                    <select 
                                        value={desa} onChange={e => setDesa(e.target.value)} disabled={!puskesmas}
                                        className="w-full rounded-xl border border-slate-300 shadow-sm bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm appearance-none disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        <option value="">-- Pilih Desa --</option>
                                        {filteredDesa.map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">ID SPPG (Kode)</label>
                                    <input 
                                        type="text" 
                                        placeholder="Misal: SPPG-012"
                                        value={sppgId} onChange={e => setSppgId(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 shadow-sm bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Nama Yayasan / Mitra</label>
                                    <input 
                                        type="text" 
                                        value={namaYayasan} onChange={e => setNamaYayasan(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 shadow-sm bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                                    />
                                </div>
                                <div className="sm:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Nama Ahli Gizi (Pengawas)</label>
                                        <input 
                                            type="text" 
                                            value={namaAhliGizi} onChange={e => setNamaAhliGizi(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 shadow-sm bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="col-span-2">
                                            <div className="flex justify-between items-end mb-2">
                                                <label className="block text-xs font-bold text-slate-500 uppercase">Koordinat Lokasi</label>
                                                <button type="button" onClick={handleGetLocation} className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-lg transition-colors flex items-center gap-1">
                                                    <span className="material-icons-round text-sm">my_location</span> Get Koordinat
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <input 
                                                        type="number" step="any"
                                                        value={lat} onChange={e => setLat(e.target.value)}
                                                        className="w-full rounded-xl border border-slate-300 shadow-sm bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                                                        placeholder="Lat: -7.1234"
                                                    />
                                                </div>
                                                <div>
                                                    <input 
                                                        type="number" step="any"
                                                        value={lng} onChange={e => setLng(e.target.value)}
                                                        className="w-full rounded-xl border border-slate-300 shadow-sm bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                                                        placeholder="Lng: 112.1234"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: KUALITATIF */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <span className="material-icons-round text-amber-500">checklist</span>
                                Evaluasi Kualitatif
                            </h2>
                            
                            <div className="mb-8">
                                <div className="space-y-8">
                                    {CLOSED_QUESTIONS.map((category) => (
                                        <div key={category.category} className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                                            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">{category.category}</h3>
                                            <div className="space-y-4">
                                                {category.questions.map((q) => {
                                                    const qIdx = parseInt(q.id.replace('q', ''));
                                                    return (
                                                        <div key={q.id} className={`p-4 rounded-xl border ${q.crucial && closedAnswers[q.id].answer === false ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white shadow-sm'}`}>
                                                            <div className="flex gap-3 items-start mb-3">
                                                                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0">{qIdx}</span>
                                                                <div className="flex-grow">
                                                                    <p className="text-sm font-medium text-slate-800 leading-relaxed">
                                                                        {q.crucial && <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full mr-2 uppercase tracking-wide"><span className="material-icons-round text-[10px]">warning</span>Krusial</span>}
                                                                        {q.text}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="ml-9 flex flex-col sm:flex-row gap-4 sm:items-center">
                                                                <div className="flex gap-4">
                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                        <input type="radio" checked={closedAnswers[q.id].answer === true} onChange={() => setClosedAnswers(p => ({...p, [q.id]: {...p[q.id], answer: true}}))} className="text-amber-600 focus:ring-amber-500 border-slate-300" />
                                                                        <span className="text-sm font-medium">Ya</span>
                                                                    </label>
                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                        <input type="radio" checked={closedAnswers[q.id].answer === false} onChange={() => setClosedAnswers(p => ({...p, [q.id]: {...p[q.id], answer: false}}))} className="text-red-600 focus:ring-red-500 border-slate-300" />
                                                                        <span className="text-sm font-medium">Tidak</span>
                                                                    </label>
                                                                </div>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Catatan / Bukti Objektif..."
                                                                    value={closedAnswers[q.id].note}
                                                                    onChange={e => setClosedAnswers(p => ({...p, [q.id]: {...p[q.id], note: e.target.value}}))}
                                                                    className="flex-grow rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-amber-500 focus:border-amber-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded-lg mb-4">Bagian 2: Pertanyaan Terbuka (Kualitatif Mendalam)</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">1. Bagaimana cara mengidentifikasi preferensi anak agar sisa makanan (food waste) minimal?</label>
                                        <textarea rows={2} value={openAnswers.preferensi} onChange={e => setOpenAnswers(p => ({...p, preferensi: e.target.value}))} className="w-full rounded-xl border border-slate-300 shadow-sm px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">2. Hambatan memperoleh bahan pangan wajib terfortifikasi?</label>
                                        <textarea rows={2} value={openAnswers.fortifikasi} onChange={e => setOpenAnswers(p => ({...p, fortifikasi: e.target.value}))} className="w-full rounded-xl border border-slate-300 shadow-sm px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">3. Mekanisme konsultasi gizi gratis?</label>
                                        <textarea rows={2} value={openAnswers.konsultasi} onChange={e => setOpenAnswers(p => ({...p, konsultasi: e.target.value}))} className="w-full rounded-xl border border-slate-300 shadow-sm px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">4. Sinergi manajemen edukasi gizi dengan Dinkes?</label>
                                        <textarea rows={2} value={openAnswers.edukasi} onChange={e => setOpenAnswers(p => ({...p, edukasi: e.target.value}))} className="w-full rounded-xl border border-slate-300 shadow-sm px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">5. Alur koordinasi teknis penanganan alergi / kedaruratan (keracunan)?</label>
                                        <textarea rows={2} value={openAnswers.kedaruratan} onChange={e => setOpenAnswers(p => ({...p, kedaruratan: e.target.value}))} className="w-full rounded-xl border border-slate-300 shadow-sm px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: KUANTITATIF */}
                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                                <span className="material-icons-round text-amber-500">balance</span>
                                Evaluasi Kuantitatif
                            </h2>
                            <p className="text-sm text-slate-500 mb-6">Analisis weighting gramasi hidangan dan kandungan zat gizi hasil uji petik/sampling.</p>
                            
                            <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
                                {sasaranList.map((sasaranItem, idx) => (
                                    <button 
                                        key={sasaranItem.id} 
                                        onClick={() => setActiveSasaranIndex(idx)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-colors whitespace-nowrap ${
                                            activeSasaranIndex === idx 
                                                ? "bg-amber-100 text-amber-700 border-amber-300" 
                                                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        <span>{sasaranItem.sasaran_name || `Sasaran ${idx + 1}`}</span>
                                        {sasaranList.length > 1 && (
                                            <span 
                                                className="material-icons-round text-sm hover:text-red-500 transition-colors" 
                                                onClick={(e) => { e.stopPropagation(); removeSasaran(idx); }}
                                            >close</span>
                                        )}
                                    </button>
                                ))}
                                <button 
                                    onClick={addSasaran}
                                    className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold bg-white border border-dashed border-slate-400 text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap"
                                >
                                    <span className="material-icons-round text-sm">add</span> Tambah Sasaran
                                </button>
                            </div>

                            {sasaranList[activeSasaranIndex] && (
                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                    <div className="mb-6">
                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Kelompok Sasaran Uji Petik</label>
                                        <select 
                                            value={sasaranList[activeSasaranIndex].sasaran_name} 
                                            onChange={e => {
                                                const newList = [...sasaranList];
                                                newList[activeSasaranIndex].sasaran_name = e.target.value;
                                                setSasaranList(newList);
                                            }}
                                            className="w-full sm:w-1/2 rounded-xl border border-slate-300 shadow-sm px-4 py-3 bg-white text-sm focus:ring-amber-500 focus:border-amber-500 outline-none"
                                        >
                                            <option value="">-- Pilih Kelompok Sasaran --</option>
                                            {KELOMPOK_SASARAN.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>

                                    <div className="mb-8 overflow-x-auto">
                                        <h3 className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded-lg mb-4">A. Audit Weighting Gramasi (Gram)</h3>
                                        <table className="w-full text-left border-collapse min-w-[700px]">
                                            <thead>
                                                <tr>
                                                    <th className="p-3 bg-slate-50 border-y border-slate-200 text-xs font-bold text-slate-600 uppercase w-48">Komponen</th>
                                                    <th className="p-3 bg-slate-50 border-y border-slate-200 text-xs font-bold text-slate-600 uppercase text-center">Standar Menu</th>
                                                    <th className="p-3 bg-slate-50 border-y border-slate-200 text-xs font-bold text-slate-600 uppercase text-center">Sampel 1</th>
                                                    <th className="p-3 bg-slate-50 border-y border-slate-200 text-xs font-bold text-slate-600 uppercase text-center">Sampel 2</th>
                                                    <th className="p-3 bg-slate-50 border-y border-slate-200 text-xs font-bold text-slate-600 uppercase text-center">Sampel 3</th>
                                                    <th className="p-3 bg-emerald-50 border-y border-emerald-200 text-xs font-bold text-emerald-800 uppercase text-center">Rata-rata</th>
                                                    <th className="p-3 bg-blue-50 border-y border-blue-200 text-xs font-bold text-blue-800 uppercase text-center">% Kesesuaian</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {KOMPONEN_HIDANGAN.map(k => {
                                                    const data = sasaranList[activeSasaranIndex].auditData[k];
                                                    const vStd = parseFloat(data.std) || 0;
                                                    const v1 = parseFloat(data.s1) || 0;
                                                    const v2 = parseFloat(data.s2) || 0;
                                                    const v3 = parseFloat(data.s3) || 0;
                                                    const avg = (v1 && v2 && v3) ? ((v1+v2+v3)/3).toFixed(1) : "-";
                                                    let pct = "-";
                                                    let badgeClass = "bg-slate-100 text-slate-500";
                                                    if (avg !== "-" && vStd > 0) {
                                                        const p = (parseFloat(avg) / vStd) * 100;
                                                        pct = p.toFixed(1) + "%";
                                                        if (p >= 95 && p <= 105) badgeClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
                                                        else if (p < 95) badgeClass = "bg-red-100 text-red-700 border-red-200";
                                                        else badgeClass = "bg-amber-100 text-amber-700 border-amber-200";
                                                    }

                                                    return (
                                                        <tr key={k}>
                                                            <td className="p-2 text-sm font-medium text-slate-700">{k}</td>
                                                            <td className="p-2">
                                                                <input type="number" placeholder="0" value={data.std} 
                                                                    onChange={e => {
                                                                        const newList = [...sasaranList];
                                                                        newList[activeSasaranIndex].auditData[k].std = e.target.value;
                                                                        setSasaranList(newList);
                                                                    }} 
                                                                    className="w-20 text-center rounded-lg border-slate-200 p-1.5 text-xs focus:ring-amber-500 focus:border-amber-500 mx-auto block" />
                                                            </td>
                                                            <td className="p-2">
                                                                <input type="number" placeholder="0" value={data.s1} 
                                                                    onChange={e => {
                                                                        const newList = [...sasaranList];
                                                                        newList[activeSasaranIndex].auditData[k].s1 = e.target.value;
                                                                        setSasaranList(newList);
                                                                    }} 
                                                                    className="w-20 text-center rounded-lg border-slate-200 p-1.5 text-xs focus:ring-amber-500 focus:border-amber-500 mx-auto block" />
                                                            </td>
                                                            <td className="p-2">
                                                                <input type="number" placeholder="0" value={data.s2} 
                                                                    onChange={e => {
                                                                        const newList = [...sasaranList];
                                                                        newList[activeSasaranIndex].auditData[k].s2 = e.target.value;
                                                                        setSasaranList(newList);
                                                                    }} 
                                                                    className="w-20 text-center rounded-lg border-slate-200 p-1.5 text-xs focus:ring-amber-500 focus:border-amber-500 mx-auto block" />
                                                            </td>
                                                            <td className="p-2">
                                                                <input type="number" placeholder="0" value={data.s3} 
                                                                    onChange={e => {
                                                                        const newList = [...sasaranList];
                                                                        newList[activeSasaranIndex].auditData[k].s3 = e.target.value;
                                                                        setSasaranList(newList);
                                                                    }} 
                                                                    className="w-20 text-center rounded-lg border-slate-200 p-1.5 text-xs focus:ring-amber-500 focus:border-amber-500 mx-auto block" />
                                                            </td>
                                                            <td className="p-2 text-center text-sm font-bold text-slate-700">{avg}</td>
                                                            <td className="p-2 text-center">
                                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${badgeClass}`}>{pct}</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <h3 className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded-lg mb-4">B. Audit Analisis Zat Gizi</h3>
                                        <table className="w-full text-left border-collapse min-w-[500px]">
                                            <thead>
                                                <tr>
                                                    <th className="p-3 bg-slate-50 border-y border-slate-200 text-xs font-bold text-slate-600 uppercase w-48">Zat Gizi</th>
                                                    <th className="p-3 bg-slate-50 border-y border-slate-200 text-xs font-bold text-slate-600 uppercase text-center">Standar AKG/Resep</th>
                                                    <th className="p-3 bg-slate-50 border-y border-slate-200 text-xs font-bold text-slate-600 uppercase text-center">Hasil FCT / Sigma Calculator</th>
                                                    <th className="p-3 bg-blue-50 border-y border-blue-200 text-xs font-bold text-blue-800 uppercase text-center">Deviasi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {KOMPONEN_GIZI.map(k => {
                                                    const data = sasaranList[activeSasaranIndex].giziData[k];
                                                    const std = parseFloat(data.std) || 0;
                                                    const real = parseFloat(data.real) || 0;
                                                    let diffStr = "-";
                                                    if (std > 0 && real > 0) {
                                                        const diff = real - std;
                                                        diffStr = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
                                                    }
                                                    return (
                                                        <tr key={k}>
                                                            <td className="p-2 text-sm font-medium text-slate-700">{k}</td>
                                                            <td className="p-2">
                                                                <input type="number" placeholder="0" value={data.std} 
                                                                    onChange={e => {
                                                                        const newList = [...sasaranList];
                                                                        newList[activeSasaranIndex].giziData[k].std = e.target.value;
                                                                        setSasaranList(newList);
                                                                    }} 
                                                                    className="w-24 text-center rounded-lg border-slate-200 p-1.5 text-xs focus:ring-amber-500 focus:border-amber-500 mx-auto block" />
                                                            </td>
                                                            <td className="p-2">
                                                                <input type="number" placeholder="0" value={data.real} 
                                                                    onChange={e => {
                                                                        const newList = [...sasaranList];
                                                                        newList[activeSasaranIndex].giziData[k].real = e.target.value;
                                                                        setSasaranList(newList);
                                                                    }} 
                                                                    className="w-24 text-center rounded-lg border-slate-200 p-1.5 text-xs focus:ring-amber-500 focus:border-amber-500 mx-auto block" />
                                                            </td>
                                                            <td className="p-2 text-center text-sm font-bold text-slate-500">{diffStr}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 4: FINALISASI */}
                    {step === 4 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col items-center text-center py-8">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                                <span className="material-icons-round text-4xl">task_alt</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Finalisasi Form Supervisi</h2>
                            <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">
                                Pastikan seluruh data identitas, evaluasi kualitatif, dan audit penimbangan telah diisi dengan benar sesuai fakta lapangan.
                            </p>

                            <div className="bg-slate-50 w-full max-w-md rounded-2xl p-6 border border-slate-200 mb-8 text-left">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanda Tangan Elektronik</h3>
                                    <button onClick={clearSignature} className="text-xs text-red-500 font-bold hover:text-red-700">Bersihkan</button>
                                </div>
                                <div className="h-36 bg-white border-2 border-dashed border-slate-300 rounded-xl mb-2 overflow-hidden w-full relative">
                                    <SignatureCanvas 
                                        ref={sigCanvas} 
                                        penColor="#1e293b" 
                                        canvasProps={{ className: "w-full h-full absolute inset-0 touch-none" }} 
                                    />
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                        <span className="text-slate-200 text-sm font-medium">Tanda Tangan Disini</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 text-center">Saya menyatakan data yang diinput adalah benar dan dapat dipertanggungjawabkan.</p>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full max-w-md bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Menyimpan...</>
                                ) : (
                                    <><span className="material-icons-round">cloud_upload</span> Kirim Laporan Supervisi</>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center">
                        <button
                            onClick={prevStep}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${step === 1 ? 'invisible' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            <span className="material-icons-round text-sm">arrow_back</span> Sebelumnya
                        </button>
                        
                        {step < 4 && (
                            <button
                                onClick={nextStep}
                                className="px-5 py-2.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-sm font-bold flex items-center gap-2 shadow-md shadow-amber-200 transition-colors"
                            >
                                Selanjutnya <span className="material-icons-round text-sm">arrow_forward</span>
                            </button>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}
