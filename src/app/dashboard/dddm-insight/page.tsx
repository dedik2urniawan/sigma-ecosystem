import ComingSoon from "@/components/dashboard/ComingSoon";

export default function DDDMInsightPage() {
    return (
        <ComingSoon
            title="DDDM Insight (Data-Driven Decision Making)"
            icon="insights"
            description="Portal analisis data analitik mutakhir dan perumusan intervensi kebijakan gizi presisi berbasis komputasi multisektoral untuk pimpinan dinas dan pemangku kebijakan."
            gradient="from-indigo-500 to-cyan-600"
            progress={25}
            features={["Executive Brief", "Simulasi Kebijakan", "Spasial Prioritas Intervensi"]}
        />
    );
}
