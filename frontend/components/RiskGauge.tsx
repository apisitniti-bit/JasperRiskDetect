"use client";

import type { RiskLevel } from "../lib/types";

interface RiskGaugeProps {
  score: number;
  level: RiskLevel;
  size?: number;
}

const LEVEL_COLORS: Record<RiskLevel, string> = {
  LOW: "#89d185",
  MEDIUM: "#cca700",
  HIGH: "#ff8c00",
  CRITICAL: "#f44747",
};

const LEVEL_LABELS_TH: Record<RiskLevel, string> = {
  LOW: "ต่ำ",
  MEDIUM: "ปานกลาง",
  HIGH: "สูง",
  CRITICAL: "วิกฤต",
};

export default function RiskGauge({ score, level, size = 140 }: RiskGaugeProps) {
  const color = LEVEL_COLORS[level];
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const offset = circumference - (progress / 100) * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="drop-shadow-lg">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#3c3c3c"
          strokeWidth="8"
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-all duration-700 ease-out"
        />
        {/* Score text */}
        <text
          x={center}
          y={center - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize="28"
          fontWeight="700"
          fontFamily="Fira Code, monospace"
        >
          {score}
        </text>
        <text
          x={center}
          y={center + 18}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#858585"
          fontSize="11"
          fontFamily="Sarabun, sans-serif"
        >
          / 100
        </text>
      </svg>
      <div className="flex items-center gap-1.5">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span
          className="text-sm font-semibold"
          style={{ color }}
        >
          {LEVEL_LABELS_TH[level]}
        </span>
      </div>
    </div>
  );
}
