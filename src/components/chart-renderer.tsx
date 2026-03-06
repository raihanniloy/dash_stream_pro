"use client";

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088FE", "#00C49F"];

interface ChartRendererProps {
  type: string;
  data: Record<string, unknown>[];
  config: {
    x: string;
    y: string;
    groupBy?: string;
  };
}

export function ChartRenderer({ type, data, config }: ChartRendererProps) {
  const { x, y } = config;

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      {type === "bar" ? (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={y} fill="#8884d8" />
        </BarChart>
      ) : type === "line" ? (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={y} stroke="#8884d8" />
        </LineChart>
      ) : type === "area" ? (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x} />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey={y} fill="#8884d8" fillOpacity={0.3} stroke="#8884d8" />
        </AreaChart>
      ) : type === "pie" ? (
        <PieChart>
          <Pie data={data} dataKey={y} nameKey={x} cx="50%" cy="50%" outerRadius={100} label>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      ) : type === "scatter" ? (
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x} name={x} />
          <YAxis dataKey={y} name={y} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={data} fill="#8884d8" />
        </ScatterChart>
      ) : (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={y} fill="#8884d8" />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
