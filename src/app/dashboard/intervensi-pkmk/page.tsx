import DashboardTabContainer from "@/components/pkmk/DashboardTabContainer";

export const metadata = {
  title: "Intervensi PKMK | SIGMA RCS Dashboard",
  description: "Dashboard Monitoring Evaluasi Intervensi Formula PKMK dan Analisis Pertumbuhan Stunting",
};

export default async function IntervensiPkmkPage() {
  return (
    <>
      <style>{`
        .dashboard-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 16px;
        }
        @media (min-width: 768px) {
          .dashboard-container {
            padding: 24px 32px;
          }
        }
        .page-header {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (min-width: 768px) {
          .page-header {
            flex-direction: row;
            align-items: flex-end;
            justify-content: space-between;
          }
        }
        .page-title {
          font-size: 28px;
          font-weight: 900;
          color: #111817;
          letter-spacing: -0.025em;
        }
        .page-subtitle {
          color: #638884;
          margin-top: 4px;
        }
        .date-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #638884;
          background: white;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #dce5e4;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }
        @media (min-width: 640px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          border-radius: 16px 0 0 16px;
          transition: all 0.3s ease;
        }
        .stat-card.blue-accent::before { background: linear-gradient(180deg, #3b82f6, #2563eb); }
        .stat-card.teal-accent::before { background: linear-gradient(180deg, #14b8a6, #0d9488); }
        .stat-card.orange-accent::before { background: linear-gradient(180deg, #f97316, #ea580c); }
        .stat-card.purple-accent::before { background: linear-gradient(180deg, #8b5cf6, #7c3aed); }
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -8px rgba(0,0,0,0.12);
        }
        .stat-card-decoration {
          position: absolute;
          top: -30px;
          right: -30px;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          opacity: 0.5;
        }
        .stat-card.blue-accent .stat-card-decoration { background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.05)); }
        .stat-card.teal-accent .stat-card-decoration { background: linear-gradient(135deg, rgba(20,184,166,0.2), rgba(20,184,166,0.05)); }
        .stat-card.orange-accent .stat-card-decoration { background: linear-gradient(135deg, rgba(249,115,22,0.2), rgba(249,115,22,0.05)); }
        .stat-card.purple-accent .stat-card-decoration { background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05)); }
        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
        }
        .stat-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .stat-icon.blue {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
        }
        .stat-icon.teal {
          background: linear-gradient(135deg, #14b8a6, #0d9488);
          color: white;
          box-shadow: 0 4px 12px rgba(20, 184, 166, 0.35);
        }
        .stat-icon.orange {
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: white;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.35);
        }
        .stat-icon.purple {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.35);
        }
        .stat-card:hover .stat-icon {
          transform: scale(1.05);
        }
        .stat-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 700;
          padding: 5px 10px;
          border-radius: 20px;
        }
        .stat-badge.green {
          background: linear-gradient(135deg, #ecfdf5, #d1fae5);
          color: #059669;
        }
        .stat-badge.gray {
          background: #fef3c7;
          color: #d97706;
        }
        .stat-badge.blue {
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          color: #2563eb;
        }
        .stat-label {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          position: relative;
          z-index: 1;
        }
        .stat-value {
          font-size: 34px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.1;
          position: relative;
          z-index: 1;
        }
        .stat-value.small {
          font-size: 22px;
        }
        .stat-hint {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 8px;
          position: relative;
          z-index: 1;
        }
        .info-panel {
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.05), transparent);
          border: 1px solid #dce5e4;
          border-radius: 12px;
          padding: 24px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 32px;
        }
        .info-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(20, 184, 166, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #14b8a6;
        }
        .info-title {
          font-weight: 600;
          color: #111817;
          margin-bottom: 4px;
        }
        .info-text {
          font-size: 14px;
          color: #638884;
          line-height: 1.6;
        }
      `}</style>

      <DashboardTabContainer />
    </>
  );
}
