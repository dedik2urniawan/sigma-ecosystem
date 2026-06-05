import React from 'react';

const SystemArchitectureSection = () => {
  return (
    <section id="architecture" className="py-24 bg-slate-900 text-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-20"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]"></div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-6 border border-slate-700 font-mono shadow-sm">
            Data Architecture Flow
          </span>
          <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
            Arsitektur <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-purple-400">Sistem Integrasi</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Visualisasi aliran data kesehatan dari proses pengumpulan data (Input) hingga pemrosesan analitik menggunakan <strong className="text-white">Aplikasi AI Kesehatan</strong> dan platform <strong className="text-white">Surveilans Stunting</strong> yang menghasilkan luaran presisi.
          </p>
        </div>

        {/* Pipeline Container */}
        <div className="flex flex-col lg:flex-row gap-6 md:gap-8 justify-center items-stretch relative">
          
          {/* Animated Connecting Lines (Desktop only) */}
          <div className="hidden lg:block absolute top-1/2 left-[20%] right-[20%] h-1 bg-slate-800 -translate-y-1/2 z-0">
             <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500 w-full animate-[shimmer_2s_infinite] opacity-50"></div>
          </div>

          {/* 1. INPUT STAGE */}
          <div className="flex-1 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-3xl p-6 relative z-10 hover:border-blue-500/50 transition-colors group">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                 <span className="material-icons-round">input</span>
               </div>
               <h3 className="text-xl font-bold">1. Data Ingestion</h3>
            </div>
            <div className="space-y-3">
              {['SIGIZI KESGA & EPPGBM', 'Indikator Balita Gizi & KIA', 'SIGMA PKMK Apps', 'Upload Data Excel Base'].map((item, idx) => (
                <div key={idx} className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 text-sm text-slate-300 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* 2. PROCESS & ANALYSIS STAGE */}
          <div className="flex-[1.5] bg-slate-800/80 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-6 relative z-10 shadow-2xl shadow-emerald-500/10 hover:border-emerald-400 transition-colors">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]">
               Core Engine
            </div>
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                   <span className="material-icons-round">memory</span>
                 </div>
                 <div>
                   <h3 className="text-xl font-bold">2. Process & Analysis</h3>
                   <span className="text-xs text-emerald-400 font-mono tracking-wide">SIGMA RCS & AI Powered</span>
                 </div>
               </div>
               <div className="w-10 h-10 rounded-full border-2 border-emerald-400/50 flex items-center justify-center group-hover:animate-spin-slow transition-all">
                  <span className="material-icons-round text-emerald-400 text-sm drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]">auto_awesome</span>
               </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="bg-slate-900/50 p-4 rounded-xl border border-emerald-500/20">
                 <h4 className="text-xs font-bold text-emerald-400 mb-2 uppercase font-mono">Lane 1: EPPGBM</h4>
                 <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                   <li>Digit Preferences</li>
                   <li>Z-Score Flag Analysis</li>
                   <li>CIAF Analysis</li>
                 </ul>
               </div>
               <div className="bg-slate-900/50 p-4 rounded-xl border border-emerald-500/20">
                 <h4 className="text-xs font-bold text-emerald-400 mb-2 uppercase font-mono">Lane 2: PMT</h4>
                 <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                   <li>Analisis Balita Wasting</li>
                   <li>Balita Underweight & T</li>
                   <li>PMT Ibu Hamil</li>
                 </ul>
               </div>
               <div className="col-span-1 sm:col-span-2 bg-slate-900/50 p-4 rounded-xl border border-emerald-500/20">
                 <h4 className="text-xs font-bold text-emerald-400 mb-2 uppercase font-mono">Lane 3: Advanced Analytics</h4>
                 <div className="flex flex-wrap gap-2">
                   {['Deteksi Outlier', 'Tren Metrik', 'Korelasi Antar Wilayah', 'SEM (Structural Equation Modeling)', 'Peta Interaktif'].map((tag, i) => (
                     <span key={i} className="bg-emerald-500/10 text-emerald-300 text-[10px] px-2 py-1 rounded border border-emerald-500/20">
                       {tag}
                     </span>
                   ))}
                 </div>
               </div>
            </div>
          </div>

          {/* 3. OUTPUT & RESULT STAGE */}
          <div className="flex-1 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-3xl p-6 relative z-10 hover:border-purple-500/50 transition-colors group">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                 <span className="material-icons-round">output</span>
               </div>
               <h3 className="text-xl font-bold">3. Output & Delivery</h3>
            </div>
            <div className="space-y-3">
              {[
                { name: 'SIGMA Calculator', icon: 'calculate' },
                { name: 'SIGMA Chatbot AI', icon: 'smart_toy' },
                { name: 'SIGMA API Gateway', icon: 'hub' },
                { name: 'SIGMA Mobileapp', icon: 'smartphone' }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 text-sm text-slate-300 flex items-center gap-3 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all cursor-default">
                  <span className="material-icons-round text-purple-400 text-lg">{item.icon}</span>
                  {item.name}
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default SystemArchitectureSection;
