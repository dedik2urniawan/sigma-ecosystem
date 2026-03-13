const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src/app/dashboard/upload/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Chunk 1: UploadConfig
content = content.replace(
    /columns: string\[\];\n    ready: boolean;\n}/g,
    `columns: string[];\n    ready: boolean;\n    hasManage?: boolean;\n}`
);

// Chunk 2: analisis-pertumbuhan Config
content = content.replace(
    /        id: "analisis-pertumbuhan",\s+label: "Analisis Pertumbuhan \(EPPGBM\)",\s+icon: "query_stats",\s+gradient: "from-cyan-500 to-cyan-700",\s+tableName: "data_eppgbm",\s+fileName: "data_eppgbm",\s+description: "Data analisis pertumbuhan EPPGBM",\s+columns: \[\],\s+ready: false,/g,
    `        id: "analisis-pertumbuhan",
        label: "Analisis Pertumbuhan (EPPGBM)",
        icon: "query_stats",
        gradient: "from-cyan-500 to-cyan-700",
        tableName: "data_eppgbm",
        fileName: "data_eppgbm",
        description: "Data analisis pertumbuhan EPPGBM",
        columns: [
            "periode", "nik", "nama_balita", "jk", "Tgl_Lahir", "BB_Lahir", "TB_Lahir", "Nama_Ortu",
            "Prov", "kabupaten", "kec", "puskesmas", "kelurahan", "posyandu", "rt", "rw", "alamat",
            "usia_saatukur", "Tgl_ukur", "bb", "tinggi", "cara_ukur", "LiLA",
            "BBU", "ZS_BBU", "TBU", "ZS_TBU", "BBTB", "ZS_BBTB",
            "Naik_Berat_Badan", "Jml_Vit_A", "KPSP", "KIA", "Detail"
        ],
        ready: true,
        hasManage: true,`
);

// Chunk 3: Column Maps
content = content.replace(
    /    "jumlah_balita_stunting_dirujuk_puskesmas_ke_rs_sampai_bulan_ini": "jumlah_balita_stunting_dirujuk_puskesmas_ke_rs_sampai_bulan_ini",\n\};\n\nexport default function/g,
    `    "jumlah_balita_stunting_dirujuk_puskesmas_ke_rs_sampai_bulan_ini": "jumlah_balita_stunting_dirujuk_puskesmas_ke_rs_sampai_bulan_ini",
    
    // EPPGBM Columns
    periode: "periode",
    nik: "nik",
    nama_balita: "nama_balita",
    jk: "jk",
    tgl_lahir: "tgl_lahir",
    bb_lahir: "bb_lahir",
    tb_lahir: "tb_lahir",
    nama_ortu: "nama_ortu",
    prov: "prov",
    kabupaten: "kabupaten",
    kec: "kec",
    puskesmas: "puskesmas",
    kelurahan: "kelurahan",
    posyandu: "posyandu",
    rt: "rt",
    rw: "rw",
    alamat: "alamat",
    usia_saatukur: "usia_saatukur",
    tgl_ukur: "tgl_ukur",
    bb: "bb",
    tinggi: "tinggi",
    cara_ukur: "cara_ukur",
    lila: "lila",
    bbu: "bbu",
    zs_bbu: "zs_bbu",
    tbu: "tbu",
    zs_tbu: "zs_tbu",
    bbtb: "bbtb",
    zs_bbtb: "zs_bbtb",
    naik_berat_badan: "naik_berat_badan",
    jml_vit_a: "jml_vit_a",
    kpsp: "kpsp",
    kia: "kia",
    detail: "detail",
};

export default function`
);

// Chunk 4: States
content = content.replace(
    /    const \[fileName, setFileName\] = useState<string>\(""\);\n\n    useEffect\(\(\) => \{/g,
    `    const [fileName, setFileName] = useState<string>("");

    type UploadResultType = { success: boolean; message: string; count?: number } | null;
    const [manageConfig, setManageConfig] = useState<UploadConfig | null>(null);
    const [existingPeriods, setExistingPeriods] = useState<string[]>([]);
    const [loadingPeriods, setLoadingPeriods] = useState(false);
    const [deletingPeriod, setDeletingPeriod] = useState<string | null>(null);

    const openManageData = async (config) => {
        setManageConfig(config);
        setLoadingPeriods(true);
        try {
            const { data, error } = await supabase.rpc('get_distinct_periods');
            if (!error && data) {
                setExistingPeriods(data.map((r) => r.periode).filter(Boolean));
            } else {
                setExistingPeriods([]);
            }
        } catch {
            setExistingPeriods([]);
        } finally {
            setLoadingPeriods(false);
        }
    };

    const handleDeletePeriod = async (periode: string) => {
        if (!confirm(\`Apakah Anda yakin ingin menghapus SEMUA data untuk periode \${periode}? Tindakan ini tidak dapat dibatalkan.\`)) return;
        
        setDeletingPeriod(periode);
        const { error } = await supabase.from(manageConfig.tableName).delete().eq("periode", periode);
        if (!error) {
            setExistingPeriods(prev => prev.filter(p => p !== periode));
            setUploadResult({ success: true, message: \`Berhasil menghapus seluruh data periode \${periode}.\` } as UploadResultType);
        } else {
            setUploadResult({ success: false, message: \`Gagal menghapus periode \${periode}: \${error.message}\` } as UploadResultType);
        }
        setDeletingPeriod(null);
    };

    useEffect(() => {`
);

// Chunk 5: Object entries logic inside handleUpload
content = content.replace(
    /                Object.entries\(row\).forEach\(\(\[key, value\]\) => \{\s+const normalizedKey = key.toLowerCase\(\).trim\(\).replace\(\/\\s\+\/g, "_"\);\s+const dbCol = COLUMN_MAP\[normalizedKey\];\s+if \(dbCol\) \{\s+if \(dbCol === "puskesmas" \|\| dbCol === "kelurahan"\) \{\s+mapped\[dbCol\] = String\(value\).trim\(\);\s+\} else if \(dbCol === "tahun" \|\| dbCol === "bulan"\) \{\s+mapped\[dbCol\] = Number\(value\);\s+\} else \{\s+mapped\[dbCol\] = Number\(value\) \|\| 0;\s+\}\s+\}\s+\}\);/g,
    `                const stringColumns = [
                    "periode", "nik", "nama_balita", "jk", "nama_ortu", "prov", "kabupaten", 
                    "kec", "puskesmas", "kelurahan", "posyandu", "rt", "rw", "alamat", 
                    "cara_ukur", "bbu", "tbu", "bbtb", "naik_berat_badan", "jml_vit_a", 
                    "kpsp", "kia", "detail"
                ];
                const dateColumns = ["tgl_lahir", "tgl_ukur"];
                
                Object.entries(row).forEach(([key, value]) => {
                    const normalizedKey = key.toLowerCase().trim().replace(/\\s+/g, "_");
                    const dbCol = COLUMN_MAP[normalizedKey];
                    
                    if (dbCol) {
                        if (stringColumns.includes(dbCol)) {
                            mapped[dbCol] = value != null ? String(value).trim() : null;
                        } else if (dateColumns.includes(dbCol)) {
                            if (typeof value === 'number') {
                                try {
                                    const date = new Date((value - (25567 + 2)) * 86400 * 1000);
                                    mapped[dbCol] = !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : null;
                                } catch { mapped[dbCol] = null; }
                            } else if (typeof value === 'string') {
                                mapped[dbCol] = value.trim() ? value : null;
                            } else if (value instanceof Date) {
                                mapped[dbCol] = value.toISOString().split('T')[0];
                            } else {
                                mapped[dbCol] = null;
                            }
                        } else if (dbCol === "tahun" || dbCol === "bulan") {
                            mapped[dbCol] = Number(value);
                        } else {
                            if (typeof value === 'string' && value.trim() === '') mapped[dbCol] = null;
                            else mapped[dbCol] = typeof value === 'number' ? value : Number(value) || 0;
                        }
                    }
                });`
);

// Chunk 6: Valid Rows Filter and Replace logic
content = content.replace(
    /            const isDesa = selectedConfig.tableName === "data_bultim_desa" \|\| selectedConfig.tableName === "data_balita_gizi";\n            const validRows = rows.filter\(\(r\) => r.puskesmas && r.tahun && r.bulan && \(!isDesa \|\| r.kelurahan\)\);\n\n            if \(validRows.length === 0\) \{\n                setUploadResult\(\{\n                    success: false,\n                    message: "Tidak ada baris valid. Pastikan kolom Tahun, Bulan, dan Puskesmas terisi.",\n                \}\);\n                setUploading\(false\);\n                return;\n            \}\n\n            \/\/ ─── FULL REPLACE strategy ──────────────────────────\n            \/\/ Delete ALL existing rows for each tahun\+bulan period\n            \/\/ found in the uploaded file, then insert the new data.\n            \/\/ This ensures SIGIZI KESGA data is always a clean snapshot.\n            const periods = new Set\(validRows.map\(\(r\) => `\$\{r.tahun\}-\$\{r.bulan\}`\)\);\n\n            for \(const period of periods\) \{\n                const \[tahun, bulan\] = period.split\("-"\).map\(Number\);\n\n                \/\/ Delete ALL rows for this tahun\+bulan \(full replace\)\n                const \{ error: delError \} = await supabase\n                    .from\(selectedConfig.tableName\)\n                    .delete\(\)\n                    .eq\("tahun", tahun\)\n                    .eq\("bulan", bulan\);\n\n                if \(delError\) \{\n                    setUploadResult\(\{\n                        success: false,\n                        message: `Gagal menghapus data lama periode \$\{bulan\}\/\$\{tahun\}: \$\{delError.message\}`,\n                    \}\);\n                    setUploading\(false\);\n                    return;\n                \}\n            \}/g,
    `            const isDesa = selectedConfig.tableName === "data_bultim_desa" || selectedConfig.tableName === "data_balita_gizi";
            const isEppgbm = selectedConfig.tableName === "data_eppgbm";
            
            const validRows = rows.filter((r) => {
                if (isEppgbm) return r.periode && r.nik; // Validasi untu EPPGBM
                return r.puskesmas && r.tahun && r.bulan && (!isDesa || r.kelurahan);
            });

            if (validRows.length === 0) {
                setUploadResult({
                    success: false,
                    message: "Tidak ada baris valid. Pastikan kolom wajib terisi.",
                });
                setUploading(false);
                return;
            }

            // ─── FULL REPLACE strategy ──────────────────────────
            if (isEppgbm) {
                const periods = new Set(validRows.map((r) => String(r.periode)));
                for (const period of periods) {
                    const { error: delError } = await supabase
                        .from(selectedConfig.tableName)
                        .delete()
                        .eq("periode", period);

                    if (delError) {
                        setUploadResult({
                            success: false,
                            message: \`Gagal menghapus data lama periode \${period}: \${delError.message}\`,
                        });
                        setUploading(false);
                        return;
                    }
                }
            } else {
                const periods = new Set(validRows.map((r) => \`\${r.tahun}-\${r.bulan}\`));
                for (const period of periods) {
                    const [tahun, bulan] = period.split("-").map(Number);
                    const { error: delError } = await supabase
                        .from(selectedConfig.tableName)
                        .delete()
                        .eq("tahun", tahun)
                        .eq("bulan", bulan);

                    if (delError) {
                        setUploadResult({
                            success: false,
                            message: \`Gagal menghapus data lama periode \${bulan}/\${tahun}: \${delError.message}\`,
                        });
                        setUploading(false);
                        return;
                    }
                }
            }`
);

// period list string formatting
content = content.replace(
    /                const periodList = Array.from\(periods\)\n                    .map\(\(p\) => \{\n                        const \[t, b\] = p.split\("-"\);\n                        const bulanNames = \["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"\];\n                        return `\$\{bulanNames\[Number\(b\)\]\} \$\{t\}`;\n                    \}\)\n                    .join\(", "\);/g,
    `                const periodList = selectedConfig.tableName === "data_eppgbm" 
                    ? Array.from(new Set(validRows.map((r) => String(r.periode)))).join(", ")
                    : Array.from(new Set(validRows.map((r) => \`\${r.tahun}-\${r.bulan}\`)))
                        .map((p) => {
                            const [t, b] = p.split("-");
                            const bulanNames = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
                            return \`\${bulanNames[Number(b)]} \${t}\`;
                        })
                        .join(", ");`
);


// Chunk 7: Card Buttons & Manage Data Modal
content = content.replace(
    /                                    <\/label>\n                                <\/div>/g,
    `                                    </label>
                                    {config.hasManage && (
                                        <button
                                            onClick={() => openManageData(config)}
                                            className="w-full py-2.5 px-4 rounded-xl bg-red-50 text-red-600 font-bold text-xs uppercase tracking-widest hover:bg-red-100 border border-red-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="material-icons-round text-sm">delete_sweep</span>
                                            Manage / Hapus Data
                                        </button>
                                    )}
                                </div>`
);

content = content.replace(
    /            \{\/\* Upload Cards \*\/\}/g,
    `            {/* Manage Data Modal */}
            {manageConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 flex-1">
                                Kelola Data - {manageConfig.label}
                            </h3>
                            <button
                                onClick={() => setManageConfig(null)}
                                className="p-2 -mr-2 rounded-xl hover:bg-slate-100 text-slate-400"
                            >
                                <span className="material-icons-round">close</span>
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            Data yang sudah tidak diperlukan lagi bisa Anda hapus berdasarkan periode untuk menghemat kapasitas <strong>database storage</strong> Anda.
                        </p>

                        {loadingPeriods ? (
                            <div className="text-center py-6">
                                <span className="material-icons-round animate-spin text-emerald-500">sync</span>
                                <p className="text-sm text-slate-500 mt-2">Memuat periode data...</p>
                            </div>
                        ) : existingPeriods.length === 0 ? (
                            <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="material-icons-round text-slate-300 text-4xl mb-2">inbox</span>
                                <p className="text-sm text-slate-500 font-medium">Belum ada data tersedia di database.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {existingPeriods.map((period) => (
                                    <div key={period} className="flex items-center justify-between p-4 rounded-xl border border-rose-100 bg-rose-50/50">
                                        <span className="font-bold text-slate-800 tracking-wide text-sm bg-white px-3 py-1 rounded shadow-sm border border-slate-200">{period}</span>
                                        <button
                                            onClick={() => handleDeletePeriod(period)}
                                            disabled={deletingPeriod === period}
                                            className="px-4 py-2 font-semibold text-xs text-white bg-rose-500 hover:bg-rose-600 rounded-lg flex items-center gap-2 shadow-md shadow-rose-200/50 disabled:opacity-50 transition-colors"
                                        >
                                            <span className="material-icons-round text-[16px]">
                                                {deletingPeriod === period ? "sync" : "delete"}
                                            </span>
                                            Hapus
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Upload Cards */}`
);

fs.writeFileSync(targetFile, content);
console.log("Successfully modified page.tsx");
