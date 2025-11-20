import { useEffect, useState } from "react";
// import your supabase client if already set up

export default function RegionalPipelinePanel() {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    // TODO: replace with real Supabase query
    // For now, mock data:
    setStats([
      { stage: "Lead", count: 6, value: 3200000 },
      { stage: "Opportunity", count: 9, value: 5400000 },
      { stage: "Proposal", count: 3, value: 1800000 },
      { stage: "Contracting", count: 2, value: 4500000 },
      { stage: "Done", count: 4, value: 6100000 },
    ]);
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold">Regional pipeline</h2>
          <p className="text-xs text-gray-500">
            All active deals across APAC
          </p>
        </div>
        <select className="text-[11px] border border-gray-200 rounded-full px-2 py-1 bg-gray-50">
          <option>All countries</option>
          <option>Philippines</option>
          <option>Vietnam</option>
          <option>Malaysia</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-2">
        {stats.map((s) => (
          <button
            key={s.stage}
            className="flex flex-col items-start rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <span className="text-[11px] font-medium text-gray-500">
              {s.stage}
            </span>
            <span className="text-lg font-semibold leading-none mt-1">
              {s.count}
            </span>
            <span className="text-[11px] text-gray-500 mt-0.5">
              {`$${(s.value / 1000000).toFixed(1)}M`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
