import ComingSoon from "@/components/dashboard/ComingSoon";

export default function ObatGiziPage() {
    return (
        <ComingSoon
            title="Logistik Obat Gizi"
            icon="medication"
            description="Sistem pengelolaan rantai pasok dan pemantauan kepatuhan konsumsi suplementasi gizi mikro, Vitamin A, Tablet Tambah Darah (TTD), dan Taburia."
            gradient="from-emerald-500 to-teal-700"
            progress={20}
            features={["Inventori Suplemen", "Distribusi Puskesmas", "Kepatuhan Konsumsi"]}
        />
    );
}
