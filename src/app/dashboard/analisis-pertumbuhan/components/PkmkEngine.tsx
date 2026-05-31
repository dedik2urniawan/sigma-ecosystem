"use client";

import React, { useState } from "react";
import { searchBalita } from "@/app/actions/search-balita";
import { getPkmkPrescription, PkmkBalitaContext } from "@/app/actions/get-pkmk-prescription";

interface Filters {
    periode: string;
    kecamatan: string;
    puskesmas: string;
    kelurahan?: string;
}

export default function PkmkEngine({ filters }: { filters: Filters }) {
    const [query, setQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedBalita, setSelectedBalita] = useState<any | null>(null);

    const [isGenerating, setIsGenerating] = useState(false);
    const [prescription, setPrescription] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (query.length < 3) {
            alert("Masukkan minimal 3 karakter NIK atau Nama");
            return;
        }

        setIsSearching(true);
        setSelectedBalita(null);
        setPrescription(null);

        const res = await searchBalita({
            query,
            periode: filters.periode,
            puskesmas: filters.puskesmas,
            kelurahan: filters.kelurahan
        });

        setIsSearching(false);
        if (res.success && res.data) {
            setSearchResults(res.data);
            if (res.data.length === 0) {
                alert("Tidak ditemukan balita dengan kriteria tersebut pada filter saat ini.");
            }
        } else {
            alert(res.error || "Gagal melakukan pencarian.");
        }
    };

    const handleSelectBalita = (b: any) => {
        setSelectedBalita(b);
        setPrescription(null);
        setSearchResults([]); // Hide search results after selection
    };

    const generatePrescription = async () => {
        if (!selectedBalita) return;
        setIsGenerating(true);
        
        // Calculate age in months roughly if not available
        let ageMonths = 0;
        if (selectedBalita.tgl_lahir) {
            const birthDate = new Date(selectedBalita.tgl_lahir);
            const measureDate = selectedBalita.tgl_ukur ? new Date(selectedBalita.tgl_ukur) : new Date();
            const diffTime = Math.abs(measureDate.getTime() - birthDate.getTime());
            ageMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));
        }

        const ctx: PkmkBalitaContext = {
            nama: selectedBalita.nama_balita || "Anonim",
            usiaBulan: ageMonths,
            jk: selectedBalita.jk || "L",
            bb: Number(selectedBalita.bb || 0),
            tb: Number(selectedBalita.tinggi || 0),
            zs_bbu: Number(selectedBalita.zs_bbu || 0),
            zs_tbu: Number(selectedBalita.zs_tbu || 0),
            zs_bbtb: Number(selectedBalita.zs_bbtb || 0),
            bblr_pblr: "Tidak diketahui" // Database might not have this column natively in the main view easily accessible here
        };

        const res = await getPkmkPrescription(ctx);
        setIsGenerating(false);

        if (res.success && res.data) {
            setPrescription(res.data);
        } else {
            alert(res.error || "Gagal membuat resep.");
        }
    };

    const formatMarkdown = (text: string) => {
        return text.split('\n').map((line, i) => {
            if (line.trim() === '') return <br key={i} />;
            
            // Bold parser
            let formattedLine = line;
            const boldRegex = /\*\*(.*?)\*\*/g;
            const parts = [];
            let lastIndex = 0;
            let match;
            
            while ((match = boldRegex.exec(line)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(line.substring(lastIndex, match.index));
                }
                parts.push(<strong key={lastIndex + match.index} className="text-slate-900 font-bold">{match[1]}</strong>);
                lastIndex = match.index + match[0].length;
            }
            if (lastIndex < line.length) {
                parts.push(line.substring(lastIndex));
            }

            // List item parser
            if (line.trim().startsWith('- ')) {
                return (
                    <li key={i} className="ml-4 list-disc text-slate-700 leading-relaxed mb-1">
                        {parts.length > 0 ? parts : line.substring(2)}
                    </li>
                );
            }

            return (
                <p key={i} className="text-slate-700 leading-relaxed mb-2">
                    {parts.length > 0 ? parts : line}
                </p>
            );
        });
    };

    return (
        <div className="bg-white border border-indigo-100 rounded-3xl p-6 md:p-8 shadow-xl shadow-indigo-900/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-bl-full -z-10 blur-3xl opacity-60 pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <span className="material-icons-round">medical_information</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">
                            Personalized PKMK Engine <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold ml-2 relative -top-1">BETA AI</span>
                        </h3>
                    </div>
                    <p className="text-slate-500 text-sm max-w-xl">
                        Cari balita bermasalah dan dapatkan rekomendasi resep Pangan Olahan Keperluan Medis Khusus (PKMK) berdasarkan pedoman Kemenkes secara otomatis menggunakan Clinical Decision Support System.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl relative z-10">
                <div className="relative flex-1">
                    <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Masukkan NIK atau Nama Balita (min. 3 huruf)..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={isSearching}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    {isSearching ? <span className="material-icons-round animate-spin">autorenew</span> : "Cari Pasien"}
                </button>
            </form>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
                <div className="mt-4 max-w-2xl bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden divide-y divide-slate-100">
                    {searchResults.map((b, i) => (
                        <div 
                            key={i} 
                            onClick={() => handleSelectBalita(b)}
                            className="p-4 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors"
                        >
                            <div>
                                <h4 className="font-bold text-slate-800">{b.nama_balita}</h4>
                                <p className="text-xs text-slate-500">NIK: {b.nik} • {b.kelurahan} • L/P: {b.jk}</p>
                            </div>
                            <span className="material-icons-round text-slate-300">chevron_right</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Selected Profile View */}
            {selectedBalita && (
                <div className="mt-8 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60 mb-6 flex flex-col md:flex-row gap-6 justify-between items-start">
                        <div>
                            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Profil Medis Aktif</div>
                            <h2 className="text-2xl font-black text-slate-800 mb-2">{selectedBalita.nama_balita}</h2>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                                <div><span className="text-slate-400">NIK:</span> {selectedBalita.nik}</div>
                                <div><span className="text-slate-400">Puskesmas:</span> {selectedBalita.puskesmas}</div>
                                <div><span className="text-slate-400">BB:</span> <span className="font-bold">{selectedBalita.bb} kg</span></div>
                                <div><span className="text-slate-400">TB:</span> <span className="font-bold">{selectedBalita.tinggi} cm</span></div>
                                <div className="text-red-600 font-semibold text-xs border border-red-200 bg-red-50 px-2 py-0.5 rounded ml-2">
                                    ZS BB/TB: {selectedBalita.zs_bbtb}
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={generatePrescription}
                            disabled={isGenerating}
                            className="shrink-0 bg-gradient-to-r from-teal-500 to-indigo-600 text-white px-6 py-4 rounded-xl font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <>
                                    <span className="material-icons-round animate-spin">autorenew</span>
                                    AI Sedang Meracik...
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-round">science</span>
                                    SIGMA Ai Prescription
                                </>
                            )}
                        </button>
                    </div>

                    {/* Prescription Markdown Display */}
                    {prescription && (
                        <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl p-6 md:p-8 border border-indigo-100 shadow-inner">
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-200">
                                <span className="material-icons-round text-teal-600">assignment_turned_in</span>
                                <h4 className="font-bold text-slate-800">Tata Laksana Dietetik (Sigma Advisor Analysis)</h4>
                            </div>
                            <div className="prose-sm md:prose max-w-none text-slate-700">
                                {formatMarkdown(prescription)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
