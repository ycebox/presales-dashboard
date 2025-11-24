export default function CeoWeeklySummaryPanel() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold">CEO weekly summary</h2>
          <p className="text-xs text-gray-500">
            Snapshot for your standing weekly call
          </p>
        </div>
        <button className="text-[11px] text-blue-600 hover:underline">
          Edit highlights
        </button>
      </div>
      <div className="space-y-2 text-sm text-gray-600">
        <p>
          <span className="font-semibold text-gray-900">Wins:</span>{" "}
          Closed 1 major PH deal (~$2.1M), completed VIB demo cycle with positive feedback.
        </p>
        <p>
          <span className="font-semibold text-gray-900">In focus:</span>{" "}
          Metrobank CCMS response, Bayad Everest, APAC presales allocation for PH/VN.
        </p>
        <p>
          <span className="font-semibold text-gray-900">Risks:</span>{" "}
          SLK RFP timeline tight, one presales resource underperforming for 2 cycles.
        </p>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <button className="px-3 py-1.5 text-xs rounded-full border border-gray-200 text-gray-600 bg-gray-50">
          Copy to clipboard
        </button>
        <button className="px-3 py-1.5 text-xs rounded-full bg-blue-600 text-white">
          Export PDF
        </button>
      </div>
    </div>
  );
}
