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
    startDate: new Date(2023, 0, 1), // Jan 1, 2023
    endDate: new Date(2023, 8, 30), // Sep 30, 2023
  },
  {
    label: '2023 Q4 - 2024 Q3 (Oct 2023 - Sep 2024)',
    startDate: new Date(2023, 9, 1), // Oct 1, 2023
    endDate: new Date(2024, 8, 30), // Sep 30, 2024
  },
  {
    label: '2024 Q4 - 2025 Q3 (Oct 2024 - Sep 2025)',
    startDate: new Date(2024, 9, 1), // Oct 1, 2024
    endDate: new Date(2025, 8, 30), // Sep 30, 2025
  },
  {
    label: '2025 Q4 - 2026 Q2 (Oct 2025 - Jun 2026)',
    startDate: new Date(2025, 9, 1), // Oct 1, 2025
    endDate: new Date(2026, 5, 30), // Jun 30, 2026
  },
];

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'financial' | 'operations' | 'customers'>('financial');
  const [allRecords, setAllRecords] = useState<ProfitabilityRecord[]>([]);
  const [quarterlyComparison, setQuarterlyComparison] = useState<QuarterlyComparisonMetric[]>([]);
  const [monthlyRevenueComparison, setMonthlyRevenueComparison] = useState<MonthlyRevenueComparison[]>([]);
  const [plSummary, setPlSummary] = useState<any>(null);
  const [selectedDateRangeIndex, setSelectedDateRangeIndex] = useState(3); // Default to 2025 Q4 - 2026 Q2

  // Load initial data once
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Load CSV files
        const [profitabilityResponse, otrResponse] = await Promise.all([
          fetch('/2026-07-10T16_38_57.419Z-profitability.csv'),
          fetch('/AIM TRUCK OTR  - COMPLETED RUNS.csv'),
        ]);

        if (!profitabilityResponse.ok || !otrResponse.ok) {
          throw new Error('Failed to load data files');
        }

        const profitabilityText = await profitabilityResponse.text();
        const otrText = await otrResponse.text();

        // Parse data
        const otrLoadIds = await parseOTRData(otrText);
        const records = await parseProfitabilityData(profitabilityText, otrLoadIds);

        // Store all records
        setAllRecords(records);

        // Load complete P&L data (all years) for quarterly comparison chart
        const completePLSummary = await parsePLData(); // No date range filter
        setQuarterlyComparison(completePLSummary.quarterlyComparison);

        // Calculate monthly revenue comparison for all years (no date filter)
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

        // Filter records by selected date range
        const filteredRecords = filterRecordsByDateRange(
          allRecords,
          selectedRange.startDate,
          selectedRange.endDate
        );

        // Parse P&L data with date range filter (for yard storage metrics and overall P&L)
        const plSummary = await parsePLData(selectedRange.startDate, selectedRange.endDate);
        setPlSummary(plSummary);

        // Note: quarterlyComparison is NOT updated here - it shows all years always

        // Calculate metrics for filtered records
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
              <h1 className="text-2xl font-bold">AIM Trucking Services Performance Dashboard</h1>
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

        {/* QuickBooks NET Profit Section */}
        {plSummary && plSummary.overallPL && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">QuickBooks Financial Performance</h2>
            <div className="bg-[#1a2332] rounded-lg p-6 border border-[#2d3748]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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

              {/* Detailed Expense Breakdown */}
              {plSummary.overallPL.expenseBreakdown && (
                <div className="border-t border-[#2d3748] pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-4 text-blue-400">Where Your Money Goes - Detailed Expense Breakdown</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Direct Operations Costs */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Direct Operations Costs</h4>
                      <div className="space-y-2 bg-[#0f1419] rounded-lg p-4">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Driver Pay (Base + Drayage):</span>
                          <span className="font-semibold text-red-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.driverPay)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Fuel:</span>
                          <span className="font-semibold text-red-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.fuel)}</span>
                        </div>
                        {plSummary.overallPL.expenseBreakdown.longHaulDrayage > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Long Haul Drayage:</span>
                            <span className="font-semibold text-red-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.longHaulDrayage)}</span>
                          </div>
                        )}
                        {plSummary.overallPL.expenseBreakdown.hazmat !== 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Hazmat:</span>
                            <span className="font-semibold text-red-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.hazmat)}</span>
                          </div>
                        )}
                        {plSummary.overallPL.expenseBreakdown.pilotCarEscort > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Pilot Car Escort:</span>
                            <span className="font-semibold text-red-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.pilotCarEscort)}</span>
                          </div>
                        )}
                        {plSummary.overallPL.expenseBreakdown.placardRemoval > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Placard Removal:</span>
                            <span className="font-semibold text-red-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.placardRemoval)}</span>
                          </div>
                        )}
                        {plSummary.overallPL.expenseBreakdown.overweight !== 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Overweight:</span>
                            <span className="font-semibold text-red-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.overweight)}</span>
                          </div>
                        )}
                        {plSummary.overallPL.expenseBreakdown.oversizedPermit > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Oversized Permit:</span>
                            <span className="font-semibold text-red-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.oversizedPermit)}</span>
                          </div>
                        )}
                        {plSummary.overallPL.expenseBreakdown.otherOperational !== 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Other Operational:</span>
                            <span className="font-semibold text-red-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.otherOperational)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-[#2d3748]">
                          <span className="text-gray-300 font-semibold">Subtotal:</span>
                          <span className="font-bold text-red-400">
                            {formatCurrency(
                              plSummary.overallPL.expenseBreakdown.driverPay +
                              plSummary.overallPL.expenseBreakdown.fuel +
                              plSummary.overallPL.expenseBreakdown.longHaulDrayage +
                              plSummary.overallPL.expenseBreakdown.hazmat +
                              plSummary.overallPL.expenseBreakdown.pilotCarEscort +
                              plSummary.overallPL.expenseBreakdown.placardRemoval +
                              plSummary.overallPL.expenseBreakdown.overweight +
                              plSummary.overallPL.expenseBreakdown.oversizedPermit +
                              plSummary.overallPL.expenseBreakdown.otherOperational
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 pt-2">
                          {(((plSummary.overallPL.expenseBreakdown.driverPay + plSummary.overallPL.expenseBreakdown.fuel + plSummary.overallPL.expenseBreakdown.longHaulDrayage + plSummary.overallPL.expenseBreakdown.hazmat + plSummary.overallPL.expenseBreakdown.pilotCarEscort + plSummary.overallPL.expenseBreakdown.placardRemoval + plSummary.overallPL.expenseBreakdown.overweight + plSummary.overallPL.expenseBreakdown.oversizedPermit + plSummary.overallPL.expenseBreakdown.otherOperational) / plSummary.overallPL.totalExpenses) * 100).toFixed(1)}% of total expenses
                        </div>
                      </div>
                    </div>

                    {/* Pass-Through Costs */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Pass-Through Costs</h4>
                      <div className="space-y-2 bg-[#0f1419] rounded-lg p-4">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Transloading:</span>
                          <span className="font-semibold text-cyan-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.transloading)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Warehouse Storage:</span>
                          <span className="font-semibold text-cyan-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.warehouseStorage)}</span>
                        </div>
                        {plSummary.overallPL.expenseBreakdown.shrinkWrap > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Shrink Wrap:</span>
                            <span className="font-semibold text-cyan-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.shrinkWrap)}</span>
                          </div>
                        )}
                        {plSummary.overallPL.expenseBreakdown.palletization > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Palletization (A-B Pallet):</span>
                            <span className="font-semibold text-cyan-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.palletization)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-[#2d3748]">
                          <span className="text-gray-300 font-semibold">Subtotal:</span>
                          <span className="font-bold text-cyan-400">
                            {formatCurrency(
                              plSummary.overallPL.expenseBreakdown.transloading +
                              plSummary.overallPL.expenseBreakdown.warehouseStorage +
                              plSummary.overallPL.expenseBreakdown.shrinkWrap +
                              plSummary.overallPL.expenseBreakdown.palletization
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 pt-2">
                          {(((plSummary.overallPL.expenseBreakdown.transloading + plSummary.overallPL.expenseBreakdown.warehouseStorage + plSummary.overallPL.expenseBreakdown.shrinkWrap + plSummary.overallPL.expenseBreakdown.palletization) / plSummary.overallPL.totalExpenses) * 100).toFixed(1)}% of total expenses
                        </div>
                        <div className="text-xs text-gray-400 pt-2 italic">
                          * Should be offset by pass-through income
                        </div>
                      </div>
                    </div>

                    {/* Payroll & Benefits */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Payroll & Benefits</h4>
                      <div className="space-y-2 bg-[#0f1419] rounded-lg p-4">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Payroll Expenses:</span>
                          <span className="font-semibold text-orange-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.payrollExpenses)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Health Insurance:</span>
                          <span className="font-semibold text-orange-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.healthInsurance)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[#2d3748]">
                          <span className="text-gray-300 font-semibold">Subtotal:</span>
                          <span className="font-bold text-orange-400">
                            {formatCurrency(
                              plSummary.overallPL.expenseBreakdown.payrollExpenses +
                              plSummary.overallPL.expenseBreakdown.healthInsurance
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 pt-2">
                          {(((plSummary.overallPL.expenseBreakdown.payrollExpenses + plSummary.overallPL.expenseBreakdown.healthInsurance) / plSummary.overallPL.totalExpenses) * 100).toFixed(1)}% of total expenses
                        </div>
                      </div>
                    </div>

                    {/* Facility & Equipment */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Facility & Equipment</h4>
                      <div className="space-y-2 bg-[#0f1419] rounded-lg p-4">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Commercial Insurance:</span>
                          <span className="font-semibold text-yellow-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.commercialInsurance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Chassis Rental:</span>
                          <span className="font-semibold text-yellow-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.chassisRental)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Rent Expense:</span>
                          <span className="font-semibold text-yellow-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.rentExpense)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Utilities:</span>
                          <span className="font-semibold text-yellow-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.utilities)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Repairs & Maintenance:</span>
                          <span className="font-semibold text-yellow-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.repairsAndMaintenance)}</span>
                        </div>
                        {plSummary.overallPL.expenseBreakdown.equipmentRental > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Equipment Rental:</span>
                            <span className="font-semibold text-yellow-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.equipmentRental)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-[#2d3748]">
                          <span className="text-gray-300 font-semibold">Subtotal:</span>
                          <span className="font-bold text-yellow-400">
                            {formatCurrency(
                              plSummary.overallPL.expenseBreakdown.commercialInsurance +
                              plSummary.overallPL.expenseBreakdown.chassisRental +
                              plSummary.overallPL.expenseBreakdown.rentExpense +
                              plSummary.overallPL.expenseBreakdown.utilities +
                              plSummary.overallPL.expenseBreakdown.repairsAndMaintenance +
                              plSummary.overallPL.expenseBreakdown.equipmentRental
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 pt-2">
                          {(((plSummary.overallPL.expenseBreakdown.commercialInsurance + plSummary.overallPL.expenseBreakdown.chassisRental + plSummary.overallPL.expenseBreakdown.rentExpense + plSummary.overallPL.expenseBreakdown.utilities + plSummary.overallPL.expenseBreakdown.repairsAndMaintenance + plSummary.overallPL.expenseBreakdown.equipmentRental) / plSummary.overallPL.totalExpenses) * 100).toFixed(1)}% of total expenses
                        </div>
                      </div>
                    </div>

                    {/* Administrative & Other */}
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Administrative & Other</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 bg-[#0f1419] rounded-lg p-4">
                          {plSummary.overallPL.expenseBreakdown.depreciation > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 font-semibold">Depreciation:</span>
                              <span className="font-semibold text-purple-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.depreciation)}</span>
                            </div>
                          )}
                          {plSummary.overallPL.expenseBreakdown.professionalFees > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 font-semibold">Professional Fees (CPA):</span>
                              <span className="font-semibold text-purple-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.professionalFees)}</span>
                            </div>
                          )}
                          {plSummary.overallPL.expenseBreakdown.accountingServices > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Accounting Services:</span>
                              <span className="font-semibold text-purple-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.accountingServices)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-400">Computer & Internet:</span>
                            <span className="font-semibold text-purple-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.computerAndInternet)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Bank Charges:</span>
                            <span className="font-semibold text-purple-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.bankCharges)}</span>
                          </div>
                        </div>
                        <div className="space-y-2 bg-[#0f1419] rounded-lg p-4">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Business Licenses:</span>
                            <span className="font-semibold text-purple-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.businessLicenses)}</span>
                          </div>
                          {plSummary.overallPL.expenseBreakdown.advertising > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Advertising:</span>
                              <span className="font-semibold text-purple-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.advertising)}</span>
                            </div>
                          )}
                          {plSummary.overallPL.expenseBreakdown.otherAdministrative !== 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Other Administrative:</span>
                              <span className="font-semibold text-purple-400">{formatCurrency(plSummary.overallPL.expenseBreakdown.otherAdministrative)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 bg-[#0f1419] rounded-lg p-4">
                        <div className="flex justify-between">
                          <span className="text-gray-300 font-semibold">Category Subtotal:</span>
                          <span className="font-bold text-purple-400">
                            {formatCurrency(
                              plSummary.overallPL.expenseBreakdown.accountingServices +
                              plSummary.overallPL.expenseBreakdown.professionalFees +
                              plSummary.overallPL.expenseBreakdown.depreciation +
                              plSummary.overallPL.expenseBreakdown.computerAndInternet +
                              plSummary.overallPL.expenseBreakdown.bankCharges +
                              plSummary.overallPL.expenseBreakdown.businessLicenses +
                              plSummary.overallPL.expenseBreakdown.advertising +
                              plSummary.overallPL.expenseBreakdown.otherAdministrative
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 pt-2">
                          {(((plSummary.overallPL.expenseBreakdown.accountingServices + plSummary.overallPL.expenseBreakdown.professionalFees + plSummary.overallPL.expenseBreakdown.depreciation + plSummary.overallPL.expenseBreakdown.computerAndInternet + plSummary.overallPL.expenseBreakdown.bankCharges + plSummary.overallPL.expenseBreakdown.businessLicenses + plSummary.overallPL.expenseBreakdown.advertising + plSummary.overallPL.expenseBreakdown.otherAdministrative) / plSummary.overallPL.totalExpenses) * 100).toFixed(1)}% of total expenses
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis */}
              <div className="border-t border-[#2d3748] pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-3 text-purple-400">Financial Analysis</h3>
                <div className="space-y-3 text-gray-300">
                  <div className="flex items-start">
                    <span className="text-purple-400 mr-2 mt-1">•</span>
                    <div>
                      <strong>Profit Margin:</strong> {' '}
                      <span className={`font-semibold ${(plSummary.overallPL.netProfit / plSummary.overallPL.totalIncome * 100) >= 10 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {((plSummary.overallPL.netProfit / plSummary.overallPL.totalIncome) * 100).toFixed(2)}%
                      </span>
                      {' '}- {(plSummary.overallPL.netProfit / plSummary.overallPL.totalIncome * 100) >= 10
                        ? 'Strong profit margins indicate healthy operational efficiency'
                        : 'Profit margins could be improved through cost optimization or revenue growth'}
                    </div>
                  </div>

                  <div className="flex items-start">
                    <span className="text-purple-400 mr-2 mt-1">•</span>
                    <div>
                      <strong>Expense Ratio:</strong> {' '}
                      <span className="font-semibold text-orange-400">
                        {((plSummary.overallPL.totalExpenses / plSummary.overallPL.totalIncome) * 100).toFixed(2)}%
                      </span>
                      {' '}of total income goes to expenses.
                      {(plSummary.overallPL.totalExpenses / plSummary.overallPL.totalIncome) < 0.85
                        ? ' This is a healthy expense ratio for the trucking industry.'
                        : ' Consider reviewing expense categories for optimization opportunities.'}
                    </div>
                  </div>

                  <div className="flex items-start">
                    <span className="text-purple-400 mr-2 mt-1">•</span>
                    <div>
                      <strong>Break-even Analysis:</strong> The company needs {formatCurrency(plSummary.overallPL.totalExpenses)} in revenue to cover all expenses.
                      Current revenue of {formatCurrency(plSummary.overallPL.totalIncome)} provides a {' '}
                      <span className={`font-semibold ${plSummary.overallPL.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(Math.abs(plSummary.overallPL.netProfit))} {plSummary.overallPL.netProfit >= 0 ? 'surplus' : 'shortfall'}
                      </span>.
                    </div>
                  </div>

                  <div className="flex items-start">
                    <span className="text-purple-400 mr-2 mt-1">•</span>
                    <div>
                      <strong>Dashboard Gross Profit vs QB Net Profit:</strong> The dashboard shows operating profit from load-level data
                      ({formatCurrency(metrics.totalProfit)}), while QuickBooks shows company-wide net profit after all overhead expenses
                      ({formatCurrency(plSummary.overallPL.netProfit)}). The difference of approximately {' '}
                      <span className="font-semibold text-yellow-400">
                        {formatCurrency(Math.abs(metrics.totalProfit - plSummary.overallPL.netProfit))}
                      </span>
                      {' '}represents overhead costs including payroll, insurance, facilities, and administrative expenses.
                    </div>
                  </div>

                  {plSummary.overallPL.netProfit < 0 && (
                    <div className="flex items-start">
                      <span className="text-red-400 mr-2 mt-1">⚠</span>
                      <div>
                        <strong className="text-red-400">Attention Required:</strong> The company is currently operating at a loss.
                        Immediate actions should include reviewing high-cost expense categories, optimizing route efficiency,
                        renegotiating vendor contracts, and exploring revenue growth opportunities.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manager Performance */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Manager Performance & Bonuses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metrics.managerMetrics.map((manager) => (
              <div key={manager.name} className="bg-[#1a2332] rounded-lg p-6 border border-[#2d3748]">
                <h3 className="text-lg font-semibold mb-4 text-blue-400">
                  {manager.name}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Business Line:</span>
                    <span className="font-semibold">{manager.businessLine}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Annual Overhead:</span>
                    <span className="font-semibold">{formatCurrency(manager.annualOverhead)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Business Profit:</span>
                    <span className="font-semibold text-green-400">{formatCurrency(manager.businessProfit)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-[#2d3748]">
                    <span className="text-gray-400">Bonus Threshold:</span>
                    <span className="font-semibold">{formatCurrency(manager.bonusThreshold)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bonus Eligible:</span>
                    <span className={`font-semibold ${manager.bonusEligible ? 'text-green-400' : 'text-gray-400'}`}>
                      {manager.bonusEligible ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {manager.bonusEligible && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bonus Amount (5%):</span>
                      <span className="font-semibold text-green-400">{formatCurrency(manager.bonusAmount)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Business Analysis */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Business Analysis & Insights</h2>
          <div className="bg-[#1a2332] rounded-lg p-6 border border-[#2d3748]">
            <div className="space-y-6">
              {/* Overall Company Performance */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-blue-400">Overall Company Performance</h3>
                <p className="text-gray-300 leading-relaxed">
                  AIM Trucking Services has generated <span className="text-green-400 font-semibold">{formatCurrency(metrics.totalRevenue)}</span> in total revenue
                  with a gross profit of <span className="text-green-400 font-semibold">{formatCurrency(metrics.totalProfit)}</span> ({formatPercent(metrics.averageMargin)} margin)
                  across {metrics.totalLoads} loads. The company operates three distinct business lines, each contributing to the overall performance.
                </p>
              </div>

              {/* OTR Analysis */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-blue-400">Over the Road (OTR) - Started May 2024</h3>
                <p className="text-gray-300 leading-relaxed">
                  {metrics.otrMetrics.totalLoads > 0 ? (
                    <>
                      The OTR division, managed by Sarah Outland, has processed {metrics.otrMetrics.totalLoads} loads generating
                      <span className="text-green-400 font-semibold"> {formatCurrency(metrics.otrMetrics.totalRevenue)}</span> in revenue
                      ({formatPercent((metrics.otrMetrics.totalRevenue / (metrics.totalRevenue || 1)) * 100)} of total) with a profit of
                      <span className="text-green-400 font-semibold"> {formatCurrency(metrics.otrMetrics.totalProfit)}</span> at
                      a {formatPercent(metrics.otrMetrics.averageMargin)} margin. This business line contributes significantly to the company's overall trucking operations.
                    </>
                  ) : (
                    <span className="text-gray-400">The OTR business line was not active during this period.</span>
                  )}
                </p>
              </div>

              {/* Local Drayage Analysis */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-green-400">Local Drayage - Started January 2023</h3>
                <p className="text-gray-300 leading-relaxed">
                  Local Drayage, managed by Bobby Lacy, is the foundation business line with {metrics.localDrayageMetrics.totalLoads} loads,
                  generating <span className="text-green-400 font-semibold">{formatCurrency(metrics.localDrayageMetrics.totalRevenue)}</span> in revenue
                  ({formatPercent((metrics.localDrayageMetrics.totalRevenue / (metrics.totalRevenue || 1)) * 100)} of total) with a profit of
                  <span className="text-green-400 font-semibold"> {formatCurrency(metrics.localDrayageMetrics.totalProfit)}</span> at
                  a {formatPercent(metrics.localDrayageMetrics.averageMargin)} margin. As the original business line, Local Drayage continues to be a core strength of the company.
                </p>
              </div>

              {/* Yard Storage Analysis */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-yellow-400">Yard Storage - Started January 2025</h3>
                <p className="text-gray-300 leading-relaxed">
                  {metrics.yardStorageMetrics.totalIncome > 0 ? (
                    <>
                      The Yard Storage business line has generated
                      <span className="text-green-400 font-semibold"> {formatCurrency(metrics.yardStorageMetrics.totalIncome)}</span> in income
                      with operating expenses of <span className="text-red-400 font-semibold">{formatCurrency(metrics.yardStorageMetrics.totalExpenses)}</span> (rent and utilities).
                      After accounting for startup costs of <span className="text-orange-400 font-semibold">{formatCurrency(metrics.yardStorageMetrics.startupCosts)}</span>,
                      the division shows a net {metrics.yardStorageMetrics.netProfit >= 0 ? 'profit' : 'loss'} of
                      <span className={`font-semibold ${metrics.yardStorageMetrics.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {' '}{formatCurrency(Math.abs(metrics.yardStorageMetrics.netProfit))}
                      </span>.
                      {metrics.yardStorageMetrics.netProfit >= 0 ? (
                        <span className="text-green-400"> This represents positive performance for the business line.</span>
                      ) : (
                        <span className="text-yellow-400"> This is within expectations for a newer business line.</span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">The Yard Storage business line was not active during this period.</span>
                  )}
                </p>
              </div>

              {/* Strategic Insights */}
              <div className="pt-4 border-t border-[#2d3748]">
                <h3 className="text-lg font-semibold mb-3 text-purple-400">Strategic Insights</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>Average revenue per load: <span className="text-green-400 font-semibold">{formatCurrency(metrics.averageRevenuePerLoad)}</span> with
                    average profit per load of <span className="text-green-400 font-semibold">{formatCurrency(metrics.averageProfitPerLoad)}</span></span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>Total manager overhead: <span className="font-semibold">{formatCurrency(metrics.managerMetrics.reduce((sum, m) => sum + m.annualOverhead, 0))}</span> with
                    potential bonuses totaling <span className="text-green-400 font-semibold">{formatCurrency(metrics.managerMetrics.reduce((sum, m) => sum + m.bonusAmount, 0))}</span></span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>Portfolio diversification across three business lines provides revenue stability and growth opportunities</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>Strong operational execution with {formatPercent((metrics.otrMetrics.totalLoads + metrics.localDrayageMetrics.totalLoads) / metrics.totalLoads * 100)} of loads successfully tracked</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

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
                  header: 'Driver Pay',
                  accessor: (row) => formatCurrency(row.driverPay),
                  className: 'text-yellow-400'
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
                  className: 'text-yellow-400'
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

      {/* Footer */}
      <footer className="bg-[#1a2332] border-t border-[#2d3748] mt-12">
        <div className="max-w-[1600px] mx-auto px-6 py-4 text-center text-sm text-gray-400">
          <p>© 2025 AIM Trucking Services, Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
