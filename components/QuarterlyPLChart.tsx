'use client';

import React from 'react';
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
import type { QuarterlyComparisonMetric } from '@/lib/plParser';

interface QuarterlyPLChartProps {
  data: QuarterlyComparisonMetric[];
}

// Define colors for different years
const YEAR_COLORS: Record<string, { revenue: string; expenses: string }> = {
  '2023': { revenue: '#3b82f6', expenses: '#93c5fd' }, // Blue shades
  '2024': { revenue: '#10b981', expenses: '#6ee7b7' }, // Green shades
  '2025': { revenue: '#f59e0b', expenses: '#fcd34d' }, // Orange/Yellow shades
  '2026': { revenue: '#a855f7', expenses: '#d8b4fe' }, // Purple shades
};

export default function QuarterlyPLChart({ data }: QuarterlyPLChartProps) {
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
      if (key.startsWith('revenue') || key.startsWith('expenses')) {
        const year = key.replace('revenue', '').replace('expenses', '');
        if (year) availableYears.add(year);
      }
    });
  });

  const years = Array.from(availableYears).sort();

  return (
    <div className="bg-[#1a2332] rounded-lg p-6 border border-[#2d3748]">
      <h3 className="text-lg font-semibold text-white mb-4">
        Quarterly P&L Comparison - Total Revenue vs Total Expenses
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
          <XAxis
            dataKey="quarter"
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
          {/* Dynamically create lines for each year's revenue and expenses */}
          {years.map(year => (
            <React.Fragment key={year}>
              <Line
                type="monotone"
                dataKey={`revenue${year}`}
                stroke={YEAR_COLORS[year]?.revenue || '#3b82f6'}
                strokeWidth={2}
                dot={{ r: 4 }}
                name={`${year} Revenue`}
              />
              <Line
                type="monotone"
                dataKey={`expenses${year}`}
                stroke={YEAR_COLORS[year]?.expenses || '#ef4444'}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4 }}
                name={`${year} Expenses`}
              />
            </React.Fragment>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
