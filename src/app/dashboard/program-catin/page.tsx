import ComingSoon from "@/components/dashboard/ComingSoon";

export default function ProgramCatinPage() {
    return (
        <ComingSoon
            title="Program Catin (Calon Pengantin)"
            icon="favorite_border"
            description="Modul skrining terpadu calon pengantin meliputi pemeriksaan status gizi, kadar hemoglobin (Hb), risiko KEK, dan pendampingan gizi pranikah guna pencegahan stunting dari hulu."
            gradient="from-rose-500 to-pink-600"
            progress={20}
            features={["Skrining Anemia", "Status LILA / IMT", "E-Sertifikat Catin"]}
        />
    );
}
