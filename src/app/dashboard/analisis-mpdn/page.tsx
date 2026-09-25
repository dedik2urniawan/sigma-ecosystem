import ComingSoon from "@/components/dashboard/ComingSoon";

export default function AnalisisMPDNPage() {
    return (
        <ComingSoon
            title="Analisis MPDN (Maternal & Perinatal Death Notification)"
            icon="monitor_heart"
            description="Modul surveilans dan audit kematian maternal serta perinatal terintegrasi untuk akselerasi penurunan angka kematian ibu dan bayi."
            gradient="from-red-500 to-rose-700"
            progress={30}
            features={["Notifikasi Kematian", "Audit Maternal", "Audit Perinatal"]}
        />
    );
}
