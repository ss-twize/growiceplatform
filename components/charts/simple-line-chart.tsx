"use client";

import { useEffect, useRef, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
  BarChart,
  Customized
} from "recharts";

type GenericRecord = Record<string, string | number | null>;

type Props = {
  data: GenericRecord[];
  xKey: string;
  lineKey: string;
  secondaryLineKey?: string;
  bar?: boolean;
  hideYAxisTicks?: boolean;
  hideYAxis?: boolean;
};

export function SimpleLineChart({
  data,
  xKey,
  lineKey,
  secondaryLineKey,
  bar = false,
  hideYAxisTicks = false,
  hideYAxis = false
}: Props) {
  const labelMap: Record<string, string> = {
    revenue: "Выручка",
    unique_inquiries: "Уникальные обращения",
    total_messages: "Сообщения",
    new_bookings: "Записи",
    potential_revenue: "Потенциальная выручка",
    conversion: "Конверсия (%)",
    avg_check: "Средний чек",
    no_show_rate: "Не пришли (%)",
    inbound_messages: "Входящие",
    outbound_messages: "Исходящие",
    inquiries: "Обращения",
    messages: "Сообщения"
  };

  const numberFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
  const yAxisWidth = 24;
  const tickBoxHeight = 18;
  const renderYAxisTick = (props: { x?: number; y?: number; payload?: { value?: number | string } }) => {
    if (hideYAxisTicks) {
      return null;
    }
    const value = props?.payload?.value ?? "";
    const label = typeof value === "number" ? numberFormatter.format(value) : String(value);
    const tickBoxWidth = Math.min(40, Math.max(18, label.length * 6 + 6));
    const baseX = props.x ?? 0;
    const axisWidth = typeof (props as { width?: number }).width === "number" ? (props as { width?: number }).width! : yAxisWidth;
    const x = baseX;
    const y = props.y ?? 0;
    const showBox = !(typeof value === "number" && value === 0);
    if (typeof value === "number" && value === 0) {
      return null;
    }
    return (
      <g transform={`translate(${x},${y})`}>
        {showBox ? (
          <rect
            x={-tickBoxWidth / 2}
            y={-tickBoxHeight / 2}
            width={tickBoxWidth}
            height={tickBoxHeight}
            rx={4}
            fill="rgba(11,11,11,1)"
            stroke="rgba(57,255,20,0.18)"
          />
        ) : null}
        <text x={0} y={0} dy={3} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize={9}>
          {label}
        </text>
      </g>
    );
  };

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => setContainerWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const xAxisProps = {
    dataKey: xKey,
    stroke: "#9ca3af",
    tickMargin: 6,
    interval: 0,
    minTickGap: 0,
    height: 40,
    tick: { dy: 6, fontSize: 9, angle: -30, textAnchor: "end" },
    padding: { left: 0, right: 0 },
    type: "category",
    allowDuplicatedCategory: false,
    scale: "point"
  } as const;

  const renderUniformVerticalLines = (props: { width?: number; height?: number; offset?: { left: number; right: number; top: number; bottom: number } }) => {
    const { width = 0, height = 0, offset } = props;
    if (!offset) return null;
    const plotWidth = width - offset.left - offset.right;
    const plotHeight = height - offset.top - offset.bottom;
    const x = offset.left;
    const y = offset.top;
    const count = data.length;
    if (count <= 1 || plotWidth <= 0 || plotHeight <= 0) return null;
    const step = plotWidth / (count - 1);
    return (
      <g>
        {data.map((_, index) => {
          const xPos = x + step * index;
          return (
            <line
              key={`v-${index}`}
              x1={xPos}
              x2={xPos}
              y1={y}
              y2={y + plotHeight}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3 3"
            />
          );
        })}
      </g>
    );
  };

  if (!data.length) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted">
        нет данных
      </div>
    );
  }

  if (bar) {
    return (
      <div className="h-[280px] w-full overflow-visible" ref={containerRef}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 0 }} style={{ overflow: "visible" }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} horizontal />
            <Customized component={renderUniformVerticalLines} />
            <XAxis {...xAxisProps} />
            <Tooltip
              cursor={{ fill: "rgba(0,227,120,0.08)" }}
              contentStyle={{ background: "#0b0b0b", border: "1px solid rgba(0,227,120,0.3)", color: "#ffffff" }}
              labelStyle={{ color: "#9ca3af" }}
              itemStyle={{ color: "#ffffff" }}
              formatter={(value, name) => [
                typeof value === "number" ? Math.round(value) : value,
                labelMap[String(name)] || String(name)
              ]}
            />
            <Bar dataKey={lineKey} fill="#00E378" radius={[4, 4, 0, 0]} barSize={12} />
            {!hideYAxis ? (
              <YAxis
                stroke="#9ca3af"
                tick={renderYAxisTick}
                width={yAxisWidth}
                tickMargin={2}
                axisLine
                tickLine={false}
                tickCount={5}
              />
            ) : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full overflow-visible" ref={containerRef}>
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 0 }} style={{ overflow: "visible" }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} horizontal />
            <Customized component={renderUniformVerticalLines} />
          <XAxis {...xAxisProps} />
          <Tooltip
            cursor={{ stroke: "rgba(0,227,120,0.2)", strokeWidth: 1 }}
            contentStyle={{ background: "#0b0b0b", border: "1px solid rgba(0,227,120,0.3)", color: "#ffffff" }}
            labelStyle={{ color: "#9ca3af" }}
            itemStyle={{ color: "#ffffff" }}
            formatter={(value, name) => [
              typeof value === "number" ? Math.round(value) : value,
              labelMap[String(name)] || String(name)
            ]}
          />
          <Line type="monotone" dataKey={lineKey} stroke="#00E378" strokeWidth={2} dot={false} />
          {secondaryLineKey ? <Line type="monotone" dataKey={secondaryLineKey} stroke="#66f7bf" strokeWidth={2} dot={false} /> : null}
          {!hideYAxis ? (
            <YAxis
              stroke="#9ca3af"
              tick={renderYAxisTick}
              width={yAxisWidth}
              tickMargin={2}
              axisLine
              tickLine={false}
              tickCount={5}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
