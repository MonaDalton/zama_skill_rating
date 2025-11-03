"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

interface RadarChartProps {
  data: {
    dimension: string;
    score: number;
  }[];
  maxValue?: number;
}

export function SkillRadarChart({ data, maxValue = 10 }: RadarChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    fullMark: maxValue,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={chartData}>
        <PolarGrid />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fontSize: 12, fill: "currentColor" }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, maxValue]}
          tick={{ fontSize: 10, fill: "currentColor" }}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#6366F1"
          fill="#6366F1"
          fillOpacity={0.6}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}



