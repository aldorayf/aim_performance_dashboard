'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { MonthlyRevenueComparison } from '@/lib/types';

interface MonthlyRevenueComparisonChartProps {
  data: MonthlyRevenueComparison[];
}

// Define colors for different years and business lines
const COLORS: Record<string, { otr: string; local: string }> = {
  '2023': { otr: '#3b82f6', local: '#93c5fd' }, // Blue shades
  '2024': { otr: '#10b981', local: '#6ee7b7' }, // Green shades
  '2025': { otr: '#f59e0b', local: '#fcd34d' }, // Orange/Yellow shades
  '2026': { otr: '#a855f7', local: '#d8b4fe' }, // Purple shades
};

export default function MonthlyRevenueComparisonChart({ data }: MonthlyRevenueComparisonChartProps) {
  const [showOTR, setShowOTR] = useState(true);
  const [showLocal, setShowLocal] = useState(true);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Determine which years are available in the data
  const availableYears = new Set<string>();
  data.forEach(row => {
    Object.keys(row).forEach(key => {
      if (key.startsWith('otrRevenue') || key.startsWith('localRevenue')) {
        const year = key.replace('otrRevenue', '').replace('localRevenue', '');
        if (year) availableYears.add(year);
      }
    });
  });

  const years = Array.from(availableYears).sort();

  return (
    <div className="bg-[#1a2332] rounded-lg p-6 border border-[#2d3748]">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Monthly Revenue Comparison - OTR vs Local Drayage
          </h3>
          <p className="text-sm text-gray-400">
            Track monthly revenue trends across years to identify growth and retraction patterns
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowOTR(!showOTR)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showOTR
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-[#0f1419] text-gray-400 border border-[#2d3748] hover:bg-[#1a2332]'
            }`}
          >
            OTR
          </button>
          <button
            onClick={() => setShowLocal(!showLocal)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showLocal
                ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                : 'bg-[#0f1419] text-gray-400 border border-[#2d3748] hover:bg-[#1a2332]'
            }`}
          >
            Local
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
          <XAxis
            dataKey="month"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a2332',
              border: '1px solid #2d3748',
              borderRadius: '8px',
              color: '#e4e6eb',
            }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend
            wrapperStyle={{ color: '#9ca3af' }}
            iconType="line"
          />
          {/* Dynamically create lines for each year's OTR and Local revenue */}
          {years.map(year => (
            <React.Fragment key={year}>
              {showOTR && (
                <Line
                  type="monotone"
                  dataKey={`otrRevenue${year}`}
                  stroke={COLORS[year]?.otr || '#3b82f6'}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name={`${year} OTR`}
                  connectNulls
                />
              )}
              {showLocal && (
                <Line
                  type="monotone"
                  dataKey={`localRevenue${year}`}
                  stroke={COLORS[year]?.local || '#10b981'}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                  name={`${year} Local Drayage`}
                  connectNulls
                />
              )}
            </React.Fragment>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
