import ComingSoon from "@/components/dashboard/ComingSoon";

export default function IntervensiGiziBurukPage() {
    return (
        <ComingSoon
            title="Intervensi Gizi Buruk"
            icon="emergency"
            description="Modul pemantauan tatalaksana dan evaluasi klinis balita gizi buruk (rawat inap & rawat jalan) melalui jejaring Therapeutic Feeding Center (TFC) dan Community Feeding Center (CFC)."
            gradient="from-red-500 to-amber-600"
            progress={15}
            features={["Registrasi TFC/CFC", "Kohort Klinis Balita", "Monitoring F75/F100/RUTF"]}
        />
    );
}
