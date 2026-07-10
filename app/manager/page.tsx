'use client';

import React, { useEffect, useState } from 'react';
import MetricCard from '@/components/MetricCard';
import DataTable from '@/components/DataTable';
import RevenueChart from '@/components/RevenueChart';
import ServiceTypeChart from '@/components/ServiceTypeChart';
import QuarterlyPLChart from '@/components/QuarterlyPLChart';
import MonthlyRevenueComparisonChart from '@/components/MonthlyRevenueComparisonChart';
import type { DashboardMetrics, ProfitabilityRecord, DateRange, MonthlyRevenueComparison } from '@/lib/types';
import {
  parseProfitabilityData,
  parseOTRData,
  calculateDashboardMetrics,
  filterRecordsByDateRange,
  calculateMonthlyRevenueComparison,
} from '@/lib/dataProcessor';
import { parsePLData, type QuarterlyComparisonMetric } from '@/lib/plParser';

// Define date range options
const DATE_RANGES: DateRange[] = [
  {
    label: '2023 Q1-Q3 (Jan - Sep 2023)',
    startDate: new Date(2023, 0, 1),
    endDate: new Date(2023, 8, 30),
  },
  {
    label: '2023 Q4 - 2024 Q3 (Oct 2023 - Sep 2024)',
    startDate: new Date(2023, 9, 1),
    endDate: new Date(2024, 8, 30),
  },
  {
    label: '2024 Q4 - 2025 Q3 (Oct 2024 - Sep 2025)',
    startDate: new Date(2024, 9, 1),
    endDate: new Date(2025, 8, 30),
  },
  {
    label: '2025 Q4 - 2026 Q2 (Oct 2025 - Jun 2026)',
    startDate: new Date(2025, 9, 1),
    endDate: new Date(2026, 5, 30),
  },
];

export default function ManagerDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'financial' | 'operations' | 'customers'>('financial');
  const [allRecords, setAllRecords] = useState<ProfitabilityRecord[]>([]);
  const [quarterlyComparison, setQuarterlyComparison] = useState<QuarterlyComparisonMetric[]>([]);
  const [monthlyRevenueComparison, setMonthlyRevenueComparison] = useState<MonthlyRevenueComparison[]>([]);
  const [plSummary, setPlSummary] = useState<any>(null);
  const [selectedDateRangeIndex, setSelectedDateRangeIndex] = useState(3);

  // Load initial data once
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [profitabilityResponse, otrResponse] = await Promise.all([
          fetch('/2026-07-10T17_23_49.573Z-profitability.csv'),
          fetch('/AIM TRUCK OTR  - COMPLETED RUNS.csv'),
        ]);

        if (!profitabilityResponse.ok || !otrResponse.ok) {
          throw new Error('Failed to load data files');
        }

        const profitabilityText = await profitabilityResponse.text();
        const otrText = await otrResponse.text();

        const otrLoadIds = await parseOTRData(otrText);
        const records = await parseProfitabilityData(profitabilityText, otrLoadIds);

        setAllRecords(records);

        const completePLSummary = await parsePLData();
        setQuarterlyComparison(completePLSummary.quarterlyComparison);

        const monthlyComparison = calculateMonthlyRevenueComparison(records);
        setMonthlyRevenueComparison(monthlyComparison);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Recalculate metrics when date range or records change
  useEffect(() => {
    async function calculateMetrics() {
      if (allRecords.length === 0) return;

      try {
        const selectedRange = DATE_RANGES[selectedDateRangeIndex];

        const filteredRecords = filterRecordsByDateRange(
          allRecords,
          selectedRange.startDate,
          selectedRange.endDate
        );

        const plSummary = await parsePLData(selectedRange.startDate, selectedRange.endDate);
        setPlSummary(plSummary);

        const dashboardMetrics = calculateDashboardMetrics(filteredRecords, plSummary);
        setMetrics(dashboardMetrics);
      } catch (err) {
        console.error('Error calculating metrics:', err);
      }
    }

    calculateMetrics();
  }, [allRecords, selectedDateRangeIndex]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1419] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1419] text-white">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">Error Loading Data</div>
          <p className="text-gray-400">{error || 'Unknown error occurred'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-white">
      {/* Header */}
      <header className="bg-[#1a2332] border-b border-[#2d3748] sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">AIM Trucking Services - Manager Dashboard</h1>
              <p className="text-sm text-gray-400 mt-1">
                Performance Overview: {DATE_RANGES[selectedDateRangeIndex].label}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">Date Range:</label>
              <select
                value={selectedDateRangeIndex}
                onChange={(e) => setSelectedDateRangeIndex(Number(e.target.value))}
                className="bg-[#0f1419] border border-[#2d3748] rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                {DATE_RANGES.map((range, index) => (
                  <option key={index} value={index}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(metrics.totalRevenue)}
            subtitle={`${metrics.totalLoads} total loads`}
          />
          <MetricCard
            title="Gross Profit"
            value={formatCurrency(metrics.totalProfit)}
            subtitle={`${formatPercent(metrics.averageMargin)} avg margin`}
          />
          <MetricCard
            title="Average Revenue per Load"
            value={formatCurrency(metrics.averageRevenuePerLoad)}
            subtitle="Per load average"
          />
          <MetricCard
            title="Average Profit per Load"
            value={formatCurrency(metrics.averageProfitPerLoad)}
            subtitle="Per load average"
          />
        </div>

        {/* Three Business Lines Comparison */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Business Lines Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* OTR Card */}
            <div className="bg-[#1a2332] rounded-lg p-6 border border-[#2d3748]">
              <h3 className="text-lg font-semibold mb-4 text-blue-400">
                Over the Road (OTR)
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Loads:</span>
                  <span className="font-semibold">{metrics.otrMetrics.totalLoads}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Revenue:</span>
                  <span className="font-semibold">{formatCurrency(metrics.otrMetrics.totalRevenue)}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span className="text-gray-400 text-sm">Driver Pay:</span>
                  <span className="font-semibold text-sm text-red-400">-{formatCurrency(metrics.otrMetrics.totalDriverPay)}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span className="text-gray-400 text-sm">Other Expenses:</span>
                  <span className="font-semibold text-sm text-red-400">-{formatCurrency(metrics.otrMetrics.totalExpenses)}</span>
                </div>
                <div className="flex justify-between border-t border-[#2d3748] pt-2">
                  <span className="text-gray-400 font-semibold">Profit:</span>
                  <span className="font-semibold text-green-400">{formatCurrency(metrics.otrMetrics.totalProfit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Margin:</span>
                  <span className="font-semibold">{formatPercent(metrics.otrMetrics.averageMargin)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-[#2d3748]">
                  <span className="text-gray-400">% of Total Revenue:</span>
                  <span className="font-semibold">
                    {formatPercent((metrics.otrMetrics.totalRevenue / metrics.totalRevenue) * 100)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Manager:</span>
                  <span className="text-sm">Sarah Outland</span>
                </div>
              </div>
            </div>

            {/* Local Drayage Card */}
            <div className="bg-[#1a2332] rounded-lg p-6 border border-[#2d3748]">
              <h3 className="text-lg font-semibold mb-4 text-green-400">
                Local Drayage
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Loads:</span>
                  <span className="font-semibold">{metrics.localDrayageMetrics.totalLoads}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Revenue:</span>
                  <span className="font-semibold">{formatCurrency(metrics.localDrayageMetrics.totalRevenue)}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span className="text-gray-400 text-sm">Driver Pay:</span>
                  <span className="font-semibold text-sm text-red-400">-{formatCurrency(metrics.localDrayageMetrics.totalDriverPay)}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span className="text-gray-400 text-sm">Other Expenses:</span>
                  <span className="font-semibold text-sm text-red-400">-{formatCurrency(metrics.localDrayageMetrics.totalExpenses)}</span>
                </div>
                <div className="flex justify-between border-t border-[#2d3748] pt-2">
                  <span className="text-gray-400 font-semibold">Profit:</span>
                  <span className="font-semibold text-green-400">{formatCurrency(metrics.localDrayageMetrics.totalProfit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Margin:</span>
                  <span className="font-semibold">{formatPercent(metrics.localDrayageMetrics.averageMargin)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-[#2d3748]">
                  <span className="text-gray-400">% of Total Revenue:</span>
                  <span className="font-semibold">
                    {formatPercent((metrics.localDrayageMetrics.totalRevenue / metrics.totalRevenue) * 100)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Manager:</span>
                  <span className="text-sm">Bobby Lacy</span>
                </div>
              </div>
            </div>

            {/* Yard Storage Card */}
            <div className="bg-[#1a2332] rounded-lg p-6 border border-[#2d3748]">
              <h3 className="text-lg font-semibold mb-4 text-yellow-400">
                Yard Storage
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Start Date:</span>
                  <span className="font-semibold text-sm">{metrics.yardStorageMetrics.startDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Income:</span>
                  <span className="font-semibold">{formatCurrency(metrics.yardStorageMetrics.totalIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Expenses:</span>
                  <span className="font-semibold text-red-400">{formatCurrency(metrics.yardStorageMetrics.totalExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Startup Costs:</span>
                  <span className="font-semibold text-orange-400">{formatCurrency(metrics.yardStorageMetrics.startupCosts)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-[#2d3748]">
                  <span className="text-gray-400">Net Profit:</span>
                  <span className={`font-semibold ${metrics.yardStorageMetrics.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(metrics.yardStorageMetrics.netProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QuickBooks NET Profit Section - SIMPLIFIED */}
        {plSummary && plSummary.overallPL && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">QuickBooks Financial Performance</h2>
            <div className="bg-[#1a2332] rounded-lg p-6 border border-[#2d3748]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Income */}
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Total Income</div>
                  <div className="text-2xl font-bold text-green-400">
                    {formatCurrency(plSummary.overallPL.totalIncome)}
                  </div>
                </div>

                {/* Total Expenses */}
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Total Expenses</div>
                  <div className="text-2xl font-bold text-red-400">
                    {formatCurrency(plSummary.overallPL.totalExpenses)}
                  </div>
                </div>

                {/* Net Profit */}
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Net Profit</div>
                  <div className={`text-2xl font-bold ${plSummary.overallPL.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(plSummary.overallPL.netProfit)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-[#2d3748]">
            <button
              onClick={() => setActiveTab('financial')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'financial'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Financial
            </button>
            <button
              onClick={() => setActiveTab('operations')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'operations'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Operations
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'customers'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Customers
            </button>
          </div>
        </div>

        {/* Financial Tab */}
        {activeTab === 'financial' && (
          <div className="space-y-8">
            <QuarterlyPLChart data={quarterlyComparison} />
            <MonthlyRevenueComparisonChart data={monthlyRevenueComparison} />
            <RevenueChart data={metrics.monthlyBreakdown} />
            <ServiceTypeChart data={metrics.serviceTypeBreakdown} />

            <DataTable
              title="Service Type Performance"
              data={metrics.serviceTypeBreakdown}
              columns={[
                { header: 'Service Type', accessor: 'serviceType' },
                {
                  header: 'Revenue',
                  accessor: (row) => formatCurrency(row.revenue),
                  className: 'font-semibold'
                },
                {
                  header: 'Profit',
                  accessor: (row) => formatCurrency(row.profit),
                  className: 'text-green-400 font-semibold'
                },
                {
                  header: 'Loads',
                  accessor: 'loads',
                  className: 'text-gray-300'
                },
                {
                  header: 'Margin',
                  accessor: (row) => formatPercent(row.margin),
                  className: 'font-semibold'
                },
              ]}
              maxRows={10}
            />
          </div>
        )}

        {/* Operations Tab */}
        {activeTab === 'operations' && (
          <div className="space-y-8">
            <DataTable
              title="Driver Performance"
              data={metrics.driverPerformance}
              columns={[
                { header: 'Driver', accessor: 'driver' },
                {
                  header: 'Revenue',
                  accessor: (row) => formatCurrency(row.revenue),
                  className: 'font-semibold'
                },
                {
                  header: 'Profit',
                  accessor: (row) => formatCurrency(row.profit),
                  className: 'text-green-400 font-semibold'
                },
                {
                  header: 'Total Pay',
                  accessor: (row) => formatCurrency(row.totalPay),
                  className: 'text-orange-400 font-semibold'
                },
                {
                  header: 'Loads',
                  accessor: 'loads',
                  className: 'text-gray-300'
                },
                {
                  header: 'Margin',
                  accessor: (row) => formatPercent(row.margin),
                  className: 'font-semibold'
                },
              ]}
              maxRows={15}
            />

            <DataTable
              title="Monthly Performance"
              data={metrics.monthlyBreakdown}
              columns={[
                { header: 'Month', accessor: 'month' },
                {
                  header: 'Revenue',
                  accessor: (row) => formatCurrency(row.revenue),
                  className: 'font-semibold'
                },
                {
                  header: 'Profit',
                  accessor: (row) => formatCurrency(row.profit),
                  className: 'text-green-400 font-semibold'
                },
                {
                  header: 'Loads',
                  accessor: 'loads',
                  className: 'text-gray-300'
                },
                {
                  header: 'Margin',
                  accessor: (row) => formatPercent(row.margin),
                  className: 'font-semibold'
                },
              ]}
              maxRows={12}
            />
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="space-y-8">
            <DataTable
              title="Customer Performance"
              data={metrics.customerBreakdown}
              columns={[
                { header: 'Customer', accessor: 'customer' },
                {
                  header: 'Revenue',
                  accessor: (row) => formatCurrency(row.revenue),
                  className: 'font-semibold'
                },
                {
                  header: 'Profit',
                  accessor: (row) => formatCurrency(row.profit),
                  className: 'text-green-400 font-semibold'
                },
                {
                  header: 'Loads',
                  accessor: 'loads',
                  className: 'text-gray-300'
                },
                {
                  header: 'Margin',
                  accessor: (row) => formatPercent(row.margin),
                  className: 'font-semibold'
                },
              ]}
              maxRows={15}
            />
          </div>
        )}
      </main>
    </div>
  );
}
