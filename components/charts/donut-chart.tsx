"use client";

import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from "recharts";

type DonutDatum = {
  name: string;
  value: number;
  color: string;
};

type Props = {
  data: DonutDatum[];
  centerLabel?: string;
  centerValue?: string;
  height?: number;
};

export function DonutChart({ data, centerLabel, centerValue, height = 240 }: Props) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (!data.length || total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted">
        нет данных
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="90%"
            paddingAngle={2}
            stroke="rgba(0,0,0,0)"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#0b0b0b", border: "1px solid rgba(57,255,20,0.3)" }}
            formatter={(value, name) => [value, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel || centerValue ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerLabel ? <span className="text-xs text-muted">{centerLabel}</span> : null}
          {centerValue ? <span className="text-lg font-semibold text-white">{centerValue}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
