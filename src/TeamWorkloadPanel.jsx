import { useEffect, useState } from "react";

export default function TeamWorkloadPanel() {
  const [team, setTeam] = useState([]);

  useEffect(() => {
    // TODO: real query joining presales_users + project_tasks
    setTeam([
      { name: "JP", role: "PH / VN lead", tasks: 12, load: 0.9 },
      { name: "Mark", role: "MY / SG", tasks: 5, load: 0.6 },
      { name: "Paolo", role: "PH support", tasks: 7, load: 0.7 },
      { name: "New hire", role: "Bench / support", tasks: 1, load: 0.2 },
    ]);
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-card p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">Presales team workload</h2>
        <p className="text-xs text-gray-500">
          Who is handling what in APAC
        </p>
      </div>
      <div className="space-y-3 mt-1 text-xs">
        {team.map((m) => (
          <div
            key={m.name}
            className="flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-gray-900">{m.name}</p>
              <p className="text-[11px] text-gray-500">{m.role}</p>
            </div>
            <div className="flex-1 mx-3">
              <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${m.load * 100}%` }}
                />
              </div>
            </div>
            <div className="text-[11px] text-gray-500">
              {m.tasks} tasks
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
