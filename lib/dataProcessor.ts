import Papa from 'papaparse';
import { format, parse } from 'date-fns';
import type {
  ProfitabilityRecord,
  OTRRecord,
  DashboardMetrics,
  ServiceTypeMetric,
  CustomerMetric,
  MonthlyMetric,
  DriverMetric,
  ManagerMetrics,
  YardStorageMetrics,
  MonthlyRevenueComparison,
} from './types';
import type { PLSummary } from './plParser';

// Pass-through charges that should be excluded from profitability analysis
const PASSTHROUGH_CHARGES = ['transload', 'Unloading', 'unloading'];

export function parseCurrency(value: string): number {
  if (!value || value === '0') return 0;
  const cleaned = value.replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parsePercentage(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/%/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function extractLoadId(loadNumber: string): string {
  // Extract the suffix from load number (e.g., "AIM_M103161" -> "M103161")
  const match = loadNumber.match(/AIM_([A-Z]\d+)/);
  return match ? match[1] : '';
}

export async function parseOTRData(csvContent: string): Promise<Set<string>> {
  return new Promise((resolve, reject) => {
    const otrLoadIds = new Set<string>();

    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        results.data.forEach((row: any) => {
          const aimRef = row['AIM REFENCE NUMBER ']?.trim();
          if (aimRef) {
            otrLoadIds.add(aimRef);
          }
        });
        resolve(otrLoadIds);
      },
      error: (error: Error) => reject(error),
    });
  });
}

export async function parseProfitabilityData(
  csvContent: string,
  otrLoadIds: Set<string>
): Promise<ProfitabilityRecord[]> {
  return new Promise((resolve, reject) => {
    const records: ProfitabilityRecord[] = [];

    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        results.data.forEach((row: any) => {
          const loadNumber = row['Load #']?.trim();
          if (!loadNumber) return;

          const loadId = extractLoadId(loadNumber);

          let chargesType = row['Charges Type']
            ?.split(',')
            .map((c: string) => c.trim())
            .filter((c: string) => c) || [];

          // A load is OTR if it's in the OTR runs sheet, or if the export
          // already labels it with an OTR LINEHAUL charge (newer exports)
          const isOTR = otrLoadIds.has(loadId) || chargesType.includes('OTR LINEHAUL');

          // If this is an OTR load, replace "Base Price" with "OTR LINEHAUL"
          if (isOTR) {
            chargesType = chargesType.map((charge: string) =>
              charge === 'Base Price' ? 'OTR LINEHAUL' : charge
            );
            // If chargesType is empty or only had Base Price, ensure OTR LINEHAUL is included
            if (chargesType.length === 0) {
              chargesType = ['OTR LINEHAUL'];
            }
          }

          // Parse date to Date object
          const dateStr = row['Date']?.trim() || '';
          let dateObj = new Date();
          try {
            dateObj = parse(dateStr, 'M/d/yyyy', new Date());
          } catch (e) {
            console.error('Error parsing date:', dateStr, e);
          }

          records.push({
            loadNumber,
            containerNumber: row['Container #']?.trim() || '',
            customer: row['Customer']?.trim() || '',
            date: dateStr,
            dateObj,
            driver: row['Driver']?.trim() || '',
            chargesType,
            totalCharges: parseCurrency(row['Total Charges'] || '0'),
            driverPayTotal: parseCurrency(row['Driver Pay Total'] || '0'),
            expenseTotal: parseCurrency(row['Expense Total'] || '0'),
            profit: parseCurrency(row['Profit'] || '0'),
            profitMargin: parsePercentage(row['Profit Margin'] || '0'),
            isOTR,
          });
        });
        resolve(records);
      },
      error: (error: Error) => reject(error),
    });
  });
}

export function filterRecordsByDateRange(
  records: ProfitabilityRecord[],
  startDate: Date,
  endDate: Date
): ProfitabilityRecord[] {
  return records.filter(record => {
    const recordDate = record.dateObj;
    return recordDate >= startDate && recordDate <= endDate;
  });
}

export function calculateDashboardMetrics(
  records: ProfitabilityRecord[],
  plSummary?: PLSummary
): DashboardMetrics {
  // Filter out pass-through charges from profitability calculations
  const profitableRecords = records.filter(record => {
    // Keep the record if it has at least one non-passthrough charge
    const hasProfitableCharge = record.chargesType.some(
      charge => !PASSTHROUGH_CHARGES.includes(charge)
    );
    return hasProfitableCharge || record.chargesType.length === 0;
  });

  const totalRevenue = records.reduce((sum, r) => sum + r.totalCharges, 0);
  const totalProfit = records.reduce((sum, r) => sum + r.profit, 0);
  const totalDriverPay = records.reduce((sum, r) => sum + r.driverPayTotal, 0);
  const totalExpenses = records.reduce((sum, r) => sum + r.expenseTotal, 0);
  const totalLoads = records.length;

  // OTR Metrics
  const otrRecords = records.filter(r => r.isOTR);
  const otrRevenue = otrRecords.reduce((sum, r) => sum + r.totalCharges, 0);
  const otrProfit = otrRecords.reduce((sum, r) => sum + r.profit, 0);
  const otrDriverPay = otrRecords.reduce((sum, r) => sum + r.driverPayTotal, 0);
  const otrExpenses = otrRecords.reduce((sum, r) => sum + r.expenseTotal, 0);

  // Local Drayage Metrics
  const localRecords = records.filter(r => !r.isOTR);
  const localRevenue = localRecords.reduce((sum, r) => sum + r.totalCharges, 0);
  const localProfit = localRecords.reduce((sum, r) => sum + r.profit, 0);
  const localDriverPay = localRecords.reduce((sum, r) => sum + r.driverPayTotal, 0);
  const localExpenses = localRecords.reduce((sum, r) => sum + r.expenseTotal, 0);

  // Service Type Breakdown
  const serviceMap = new Map<string, ServiceTypeMetric>();
  profitableRecords.forEach(record => {
    record.chargesType.forEach(service => {
      if (PASSTHROUGH_CHARGES.includes(service)) return;

      if (!serviceMap.has(service)) {
        serviceMap.set(service, {
          serviceType: service,
          revenue: 0,
          profit: 0,
          loads: 0,
          margin: 0,
        });
      }
      const metric = serviceMap.get(service)!;
      metric.revenue += record.totalCharges / record.chargesType.length;
      metric.profit += record.profit / record.chargesType.length;
      metric.loads += 1;
    });
  });

  serviceMap.forEach(metric => {
    metric.margin = metric.revenue > 0 ? (metric.profit / metric.revenue) * 100 : 0;
  });

  // Customer Breakdown
  const customerMap = new Map<string, CustomerMetric>();
  records.forEach(record => {
    if (!customerMap.has(record.customer)) {
      customerMap.set(record.customer, {
        customer: record.customer,
        revenue: 0,
        profit: 0,
        loads: 0,
        margin: 0,
      });
    }
    const metric = customerMap.get(record.customer)!;
    metric.revenue += record.totalCharges;
    metric.profit += record.profit;
    metric.loads += 1;
  });

  customerMap.forEach(metric => {
    metric.margin = metric.revenue > 0 ? (metric.profit / metric.revenue) * 100 : 0;
  });

  // Monthly Breakdown
  const monthMap = new Map<string, MonthlyMetric>();
  records.forEach(record => {
    try {
      const date = record.dateObj; // Use pre-parsed date object
      const monthKey = format(date, 'MMM yyyy');

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          month: monthKey,
          revenue: 0,
          otrRevenue: 0,
          localDrayageRevenue: 0,
          profit: 0,
          otrProfit: 0,
          localDrayageProfit: 0,
          loads: 0,
          margin: 0,
          driverPay: 0,
          otrDriverPay: 0,
          localDrayageDriverPay: 0,
          expenses: 0,
        });
      }
      const metric = monthMap.get(monthKey)!;
      metric.revenue += record.totalCharges;

      // Split revenue, profit, and driver pay between OTR and Local Drayage
      if (record.isOTR) {
        metric.otrRevenue += record.totalCharges;
        metric.otrProfit += record.profit;
        metric.otrDriverPay += record.driverPayTotal;
      } else {
        metric.localDrayageRevenue += record.totalCharges;
        metric.localDrayageProfit += record.profit;
        metric.localDrayageDriverPay += record.driverPayTotal;
      }

      metric.profit += record.profit;
      metric.loads += 1;
      metric.driverPay += record.driverPayTotal;
      metric.expenses += record.expenseTotal;
    } catch (e) {
      console.error('Error parsing date:', record.date, e);
    }
  });

  monthMap.forEach(metric => {
    metric.margin = metric.revenue > 0 ? (metric.profit / metric.revenue) * 100 : 0;
  });

  // Driver Performance
  const driverMap = new Map<string, DriverMetric>();
  records.forEach(record => {
    if (!record.driver) return;

    if (!driverMap.has(record.driver)) {
      driverMap.set(record.driver, {
        driver: record.driver,
        revenue: 0,
        profit: 0,
        loads: 0,
        margin: 0,
        totalPay: 0,
      });
    }
    const metric = driverMap.get(record.driver)!;
    metric.revenue += record.totalCharges;
    metric.profit += record.profit;
    metric.loads += 1;
    metric.totalPay += record.driverPayTotal;
  });

  driverMap.forEach(metric => {
    metric.margin = metric.revenue > 0 ? (metric.profit / metric.revenue) * 100 : 0;
  });

  // Calculate Yard Storage Metrics from P&L data
  const yardStorageMetrics: YardStorageMetrics = plSummary ? {
    totalIncome: plSummary.yardStorage.totalIncome,
    totalExpenses: plSummary.yardStorage.totalExpenses,
    startupCosts: plSummary.yardStorage.startupCosts,
    netProfit: plSummary.yardStorage.netProfit,
    startDate: 'January 2025',
  } : {
    totalIncome: 0,
    totalExpenses: 0,
    startupCosts: 0,
    netProfit: 0,
    startDate: 'January 2025',
  };

  // Calculate Manager Metrics
  const managerMetrics: ManagerMetrics[] = [];

  // Sarah Outland - OTR Manager
  const sarahOverhead = 85545.66;
  const sarahThreshold = 150000;
  const sarahBonus = otrProfit > sarahThreshold ? (otrProfit - sarahThreshold) * 0.05 : 0;
  managerMetrics.push({
    name: 'Sarah Outland',
    businessLine: 'OTR',
    annualOverhead: sarahOverhead,
    bonusThreshold: sarahThreshold,
    bonusPercentage: 5,
    businessProfit: otrProfit,
    bonusEligible: otrProfit > sarahThreshold,
    bonusAmount: sarahBonus,
  });

  // Bobby Lacy - Local Drayage Manager
  const bobbyOverhead = 101820.66;
  const bobbyThreshold = 250000;
  const bobbyBonus = localProfit > bobbyThreshold ? (localProfit - bobbyThreshold) * 0.05 : 0;
  managerMetrics.push({
    name: 'Bobby Lacy',
    businessLine: 'Local Drayage',
    annualOverhead: bobbyOverhead,
    bonusThreshold: bobbyThreshold,
    bonusPercentage: 5,
    businessProfit: localProfit,
    bonusEligible: localProfit > bobbyThreshold,
    bonusAmount: bobbyBonus,
  });

  return {
    totalRevenue,
    totalProfit,
    totalLoads,
    averageRevenuePerLoad: totalLoads > 0 ? totalRevenue / totalLoads : 0,
    averageProfitPerLoad: totalLoads > 0 ? totalProfit / totalLoads : 0,
    averageMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    totalDriverPay,
    totalExpenses,
    otrMetrics: {
      totalRevenue: otrRevenue,
      totalProfit: otrProfit,
      totalLoads: otrRecords.length,
      averageMargin: otrRevenue > 0 ? (otrProfit / otrRevenue) * 100 : 0,
      totalDriverPay: otrDriverPay,
      totalExpenses: otrExpenses,
    },
    localDrayageMetrics: {
      totalRevenue: localRevenue,
      totalProfit: localProfit,
      totalLoads: localRecords.length,
      averageMargin: localRevenue > 0 ? (localProfit / localRevenue) * 100 : 0,
      totalDriverPay: localDriverPay,
      totalExpenses: localExpenses,
    },
    yardStorageMetrics,
    managerMetrics,
    serviceTypeBreakdown: Array.from(serviceMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    ),
    customerBreakdown: Array.from(customerMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    ),
    monthlyBreakdown: Array.from(monthMap.values()).sort((a, b) => {
      try {
        const dateA = parse(a.month, 'MMM yyyy', new Date());
        const dateB = parse(b.month, 'MMM yyyy', new Date());
        return dateA.getTime() - dateB.getTime();
      } catch {
        return 0;
      }
    }),
    driverPerformance: Array.from(driverMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    ),
  };
}

export function exportOTRLoadsToCSV(records: ProfitabilityRecord[]): string {
  const otrRecords = records.filter(r => r.isOTR);

  // CSV header
  const headers = [
    'Load #',
    'Container #',
    'Customer',
    'Date',
    'Driver',
    'Charges Type',
    'Total Charges',
    'Driver Pay Total',
    'Expense Total',
    'Profit',
    'Profit Margin'
  ];

  // CSV rows
  const rows = otrRecords.map(record => [
    record.loadNumber,
    record.containerNumber,
    record.customer,
    record.date,
    record.driver,
    record.chargesType.join(', '),
    `$${record.totalCharges.toFixed(2)}`,
    `$${record.driverPayTotal.toFixed(2)}`,
    `$${record.expenseTotal.toFixed(2)}`,
    `$${record.profit.toFixed(2)}`,
    `${record.profitMargin.toFixed(2)}%`
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

export function calculateMonthlyRevenueComparison(
  records: ProfitabilityRecord[]
): MonthlyRevenueComparison[] {
  // Month names for display
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Initialize data structure with all 12 months
  const monthlyData = new Map<number, MonthlyRevenueComparison>();
  for (let i = 0; i < 12; i++) {
    monthlyData.set(i + 1, {
      month: monthNames[i],
      monthNumber: i + 1,
    });
  }

  // Process each record and aggregate by month and year
  records.forEach(record => {
    try {
      const date = record.dateObj;
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-12

      const monthData = monthlyData.get(month);
      if (!monthData) return;

      // Add revenue to the appropriate year and business line
      if (record.isOTR) {
        const key = `otrRevenue${year}`;
        monthData[key] = (monthData[key] as number || 0) + record.totalCharges;
      } else {
        const key = `localRevenue${year}`;
        monthData[key] = (monthData[key] as number || 0) + record.totalCharges;
      }
    } catch (e) {
      console.error('Error processing record for monthly comparison:', record.date, e);
    }
  });

  // Convert to array and ensure all months are present
  return Array.from(monthlyData.values()).sort((a, b) => a.monthNumber - b.monthNumber);
}
