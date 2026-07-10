import Papa from 'papaparse';

export interface ExpenseBreakdown {
  // Direct Operations Costs
  driverPay: number; // Base Price + Drayage expenses
  fuel: number;
  longHaulDrayage: number;
  hazmat: number;
  pilotCarEscort: number;
  placardRemoval: number;
  overweight: number;
  oversizedPermit: number;
  otherOperational: number; // Small operational expenses

  // Pass-Through Costs (should net with income)
  transloading: number;
  warehouseStorage: number;
  shrinkWrap: number;
  palletization: number;

  // Payroll & Benefits
  payrollExpenses: number;
  healthInsurance: number;

  // Facility & Equipment
  commercialInsurance: number;
  rentExpense: number;
  utilities: number;
  repairsAndMaintenance: number;
  chassisRental: number;
  equipmentRental: number;

  // Administrative & Other
  accountingServices: number;
  professionalFees: number;
  depreciation: number;
  computerAndInternet: number;
  bankCharges: number;
  businessLicenses: number;
  advertising: number;
  otherAdministrative: number;
}

export interface QuarterlyPL {
  quarter: string;
  year: number;
  dateRange: string;

  // Overall P&L totals
  totalIncome: number;
  totalExpenses: number;

  // Detailed expense breakdown
  expenses: ExpenseBreakdown;

  // Yard Storage
  yardStorageIncome: number;
  rentExpense: number;
  utilities: number;
  repairsAndMaintenance: number;
  equipmentRental: number;

  // Pass-through charges
  passThroughIncome: {
    palletization: number;
    sslDetention: number;
    unloading: number;
    transload: number;
    warehouseStorage: number;
  };
  passThroughExpenses: {
    palletization: number;
    sslDetention: number;
    unloading: number;
    transload: number;
    warehouseStorage: number;
  };
}

export interface QuarterlyPLMetric {
  period: string; // e.g., "Q1 2023"
  totalRevenue: number;
  totalExpenses: number;
}

export interface QuarterlyComparisonMetric {
  quarter: string; // Q1, Q2, Q3, or Q4
  [key: string]: string | number; // revenue2023, expenses2023, revenue2024, etc.
}

export interface PLSummary {
  quarters: QuarterlyPL[];
  quarterlyMetrics: QuarterlyPLMetric[];
  quarterlyComparison: QuarterlyComparisonMetric[];
  yardStorage: {
    totalIncome: number;
    totalExpenses: number;
    startupCosts: number; // Dec 2024 - May 2025
    netProfit: number;
  };
  overallPL: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    operatingProfit: number; // Before overhead expenses
    overheadExpenses: number;
    expenseBreakdown: ExpenseBreakdown;
  };
}

// Map file numbers to quarters
const FILE_QUARTER_MAP: Record<string, { year: number; quarter: string }> = {
  '10': { year: 2023, quarter: 'Q1' },
  '9': { year: 2023, quarter: 'Q2' },
  '8': { year: 2023, quarter: 'Q3' },
  '7': { year: 2023, quarter: 'Q4' },
  '6': { year: 2024, quarter: 'Q1' },
  '5': { year: 2024, quarter: 'Q2' },
  '3': { year: 2024, quarter: 'Q3' },
  '4': { year: 2024, quarter: 'Q4' },
  '14': { year: 2025, quarter: 'Q1' },
  '15': { year: 2025, quarter: 'Q2' },
  '16': { year: 2025, quarter: 'Q3' },
  '17': { year: 2025, quarter: 'Q4' },
  '18': { year: 2026, quarter: 'Q1' },
  '19': { year: 2026, quarter: 'Q2' },
};

const PL_FILES = [
  'Aim Trucking Services, Inc._Profit and Loss (10).csv', // Q1 2023
  'Aim Trucking Services, Inc._Profit and Loss (9).csv',  // Q2 2023
  'Aim Trucking Services, Inc._Profit and Loss (8).csv',  // Q3 2023
  'Aim Trucking Services, Inc._Profit and Loss (7).csv',  // Q4 2023
  'Aim Trucking Services, Inc._Profit and Loss (6).csv',  // Q1 2024
  'Aim Trucking Services, Inc._Profit and Loss (5).csv',  // Q2 2024
  'Aim Trucking Services, Inc._Profit and Loss (3).csv',  // Q3 2024
  'Aim Trucking Services, Inc._Profit and Loss (4).csv',  // Q4 2024
  'Aim Trucking Services, Inc._Profit and Loss (14).csv', // Q1 2025
  'Aim Trucking Services, Inc._Profit and Loss (15).csv', // Q2 2025
  'Aim Trucking Services, Inc._Profit and Loss (16).csv', // Q3 2025
  'Aim Trucking Services, Inc._Profit and Loss (17).csv', // Q4 2025
  'Aim Trucking Services, Inc._Profit and Loss (18).csv', // Q1 2026
  'Aim Trucking Services, Inc._Profit and Loss (19).csv', // Q2 2026
];

function parseAmount(value: string): number {
  if (!value || value.trim() === '') return 0;
  // Remove quotes, dollar signs, commas, and convert to number
  const cleaned = value.replace(/["$,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function getFileNumber(filename: string): string {
  const match = filename.match(/\((\d+)\)\.csv$/);
  return match ? match[1] : '';
}

async function parsePLFile(csvText: string, filename: string): Promise<QuarterlyPL> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      complete: (results) => {
        const rows = results.data as string[][];

        // Extract date range from row 3
        const dateRange = rows[2]?.[0] || '';

        // Get quarter info from filename
        const fileNum = getFileNumber(filename);
        const quarterInfo = FILE_QUARTER_MAP[fileNum] || { year: 0, quarter: 'Q1' };

        const plData: QuarterlyPL = {
          quarter: quarterInfo.quarter,
          year: quarterInfo.year,
          dateRange,
          totalIncome: 0,
          totalExpenses: 0,
          expenses: {
            driverPay: 0,
            fuel: 0,
            longHaulDrayage: 0,
            hazmat: 0,
            pilotCarEscort: 0,
            placardRemoval: 0,
            overweight: 0,
            oversizedPermit: 0,
            otherOperational: 0,
            transloading: 0,
            warehouseStorage: 0,
            shrinkWrap: 0,
            palletization: 0,
            payrollExpenses: 0,
            healthInsurance: 0,
            commercialInsurance: 0,
            rentExpense: 0,
            utilities: 0,
            repairsAndMaintenance: 0,
            chassisRental: 0,
            equipmentRental: 0,
            accountingServices: 0,
            professionalFees: 0,
            depreciation: 0,
            computerAndInternet: 0,
            bankCharges: 0,
            businessLicenses: 0,
            advertising: 0,
            otherAdministrative: 0,
          },
          yardStorageIncome: 0,
          rentExpense: 0,
          utilities: 0,
          repairsAndMaintenance: 0,
          equipmentRental: 0,
          passThroughIncome: {
            palletization: 0,
            sslDetention: 0,
            unloading: 0,
            transload: 0,
            warehouseStorage: 0,
          },
          passThroughExpenses: {
            palletization: 0,
            sslDetention: 0,
            unloading: 0,
            transload: 0,
            warehouseStorage: 0,
          },
        };

        let inIncomeSection = false;
        let inExpenseSection = false;

        for (const row of rows) {
          const label = row[0]?.trim() || '';
          const value = row[1]?.trim() || '';

          // Track sections and capture totals
          if (label === 'Income') {
            inIncomeSection = true;
            inExpenseSection = false;
            continue;
          }
          if (label === 'Expenses') {
            inIncomeSection = false;
            inExpenseSection = true;
            continue;
          }
          if (label.startsWith('Total for Income')) {
            plData.totalIncome = parseAmount(value);
            inIncomeSection = false;
            continue;
          }
          if (label.startsWith('Total for Expenses')) {
            plData.totalExpenses = parseAmount(value);
            inExpenseSection = false;
            continue;
          }
          if (label.startsWith('Net Operating Income')) {
            inIncomeSection = false;
          }

          // Extract Yard Storage income
          if (inIncomeSection) {
            if (label === 'AIM YARD STORAGE 1' || label === 'YARD STORAGE 1') {
              plData.yardStorageIncome += parseAmount(value);
            }
            // Pass-through income
            if (label === 'PALLETIZATION') {
              plData.passThroughIncome.palletization += parseAmount(value);
            }
            if (label === 'SSL DETENTION') {
              plData.passThroughIncome.sslDetention += parseAmount(value);
            }
            if (label === 'UNLOADING 1') {
              plData.passThroughIncome.unloading += parseAmount(value);
            }
            if (label === 'Transload') {
              plData.passThroughIncome.transload += parseAmount(value);
            }
            if (label === 'WAREHOUSE STORAGE INCOME') {
              plData.passThroughIncome.warehouseStorage += parseAmount(value);
            }
          }

          // Extract detailed expenses
          if (inExpenseSection) {
            const amount = parseAmount(value);

            // Direct Operations Costs
            if (label === 'Base Price' || label === 'Drayage' || label === 'DRAYAGE -CA EXPENSE') {
              plData.expenses.driverPay += amount;
            } else if (label === 'Fuel') {
              plData.expenses.fuel += amount;
            } else if (label === 'Long Haul Drayage Expense') {
              plData.expenses.longHaulDrayage += amount;
            } else if (label === 'Hazmat') {
              plData.expenses.hazmat += amount;
            } else if (label === 'Pilot Car Escort') {
              plData.expenses.pilotCarEscort += amount;
            } else if (label === 'Placard Removal Cost') {
              plData.expenses.placardRemoval += amount;
            } else if (label === 'Overweight') {
              plData.expenses.overweight += amount;
            } else if (label === 'Oversized Permit') {
              plData.expenses.oversizedPermit += amount;
            }
            // Pass-Through Costs
            else if (label === 'Transloading') {
              plData.expenses.transloading += amount;
            } else if (label === 'WAREHOUSE STORAGE') {
              plData.expenses.warehouseStorage += amount;
            } else if (label === 'Shrink Wrap') {
              plData.expenses.shrinkWrap += amount;
            } else if (label === 'A-B PALLET' || label === 'PALLETIZATION') {
              plData.expenses.palletization += amount;
            }
            // Payroll & Benefits
            else if (label === 'Payroll Expenses') {
              plData.expenses.payrollExpenses += amount;
            } else if (label === 'HRA Employee Benefit') {
              plData.expenses.healthInsurance += amount;
            } else if (label.startsWith('Total for Health Insurance')) {
              // Use the total if available (it already includes HRA) - REPLACE accumulated value
              plData.expenses.healthInsurance = amount;
            }
            // Insurance - Use ONLY the total if it exists, otherwise use individual items
            else if (label.startsWith('Total for Insurance')) {
              // Replace accumulated insurance value with the total
              plData.expenses.commercialInsurance = amount;
            } else if (label === 'Insurance - Commercial' || label === 'Driver Insurance Deduction') {
              // Only accumulate individual items; will be replaced by Total if it exists
              plData.expenses.commercialInsurance += amount;
            }
            // Facility & Equipment
            else if (label === 'Rent Expense') {
              plData.expenses.rentExpense += amount;
              plData.rentExpense = amount;
            } else if (label === 'Utilities') {
              plData.expenses.utilities += amount;
              plData.utilities = amount;
            } else if (label === 'Repairs and Maintenance') {
              plData.expenses.repairsAndMaintenance += amount;
              plData.repairsAndMaintenance = amount;
            } else if (label.startsWith('Total for Chassis Rental')) {
              // Use the total if available - REPLACE accumulated value
              plData.expenses.chassisRental = amount;
            } else if (label === 'Chassis Rental' || label === 'Repairs - Chassis') {
              plData.expenses.chassisRental += amount;
            } else if (label === 'Equipment Rental Expense') {
              plData.expenses.equipmentRental += amount;
              plData.equipmentRental = amount;
            }
            // Administrative & Other
            else if (label === 'ACCOUNTING SERVICES EXPENSE') {
              plData.expenses.accountingServices += amount;
            } else if (label === 'CPA Services' || label.startsWith('Total for Professional Fees')) {
              plData.expenses.professionalFees += amount;
            } else if (label === 'Depreciation Expense') {
              plData.expenses.depreciation += amount;
            } else if (label === 'Computer and Internet Expenses') {
              plData.expenses.computerAndInternet += amount;
            } else if (label === 'Bank Service Charges') {
              plData.expenses.bankCharges += amount;
            } else if (label === 'Business Licenses and Permits') {
              plData.expenses.businessLicenses += amount;
            } else if (label === 'Advertising') {
              plData.expenses.advertising += amount;
            }
            // Small operational expenses (catch-all for uncategorized operational items)
            else if (amount !== 0 && !label.startsWith('Total for') &&
                     (label.includes('Permit') || label.includes('Fee') || label.includes('Charge') ||
                      label.includes('Expense') || label.includes('Cost'))) {
              // These are likely small operational costs
              plData.expenses.otherOperational += amount;
            }
            // Administrative catch-all (for truly misc items)
            else if (amount !== 0 && !label.startsWith('Total for')) {
              plData.expenses.otherAdministrative += amount;
            }

            // Also track pass-through expenses separately for yard storage
            if (label === 'A-B PALLET') {
              plData.passThroughExpenses.palletization += amount;
            }
            if (label === 'SSL DETENTION' || label === 'SSL Detention') {
              plData.passThroughExpenses.sslDetention += amount;
            }
            if (label === 'UNLOADING EXPENSE') {
              plData.passThroughExpenses.unloading += amount;
            }
            if (label === 'Transloading') {
              plData.passThroughExpenses.transload += amount;
            }
            if (label === 'WAREHOUSE STORAGE') {
              plData.passThroughExpenses.warehouseStorage += amount;
            }
          }
        }

        resolve(plData);
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

export async function parsePLData(startDate?: Date, endDate?: Date): Promise<PLSummary> {
  const quarters: QuarterlyPL[] = [];

  // Load and parse all P&L files
  for (const filename of PL_FILES) {
    try {
      const response = await fetch(`/${filename}`);
      if (!response.ok) {
        console.error(`Failed to load ${filename}`);
        continue;
      }
      const text = await response.text();
      const plData = await parsePLFile(text, filename);

      // Filter by date range if provided
      if (startDate && endDate) {
        // Parse the date range from the P&L quarter
        const dateRange = plData.dateRange;
        // Extract dates from format like "January 1-March 31, 2023"
        const match = dateRange.match(/([A-Za-z]+)\s+(\d+)-([A-Za-z]+)\s+(\d+),\s+(\d+)/);
        if (match) {
          const startMonth = match[1];
          const endMonth = match[3];
          const year = parseInt(match[5]);

          // Create quarter start and end dates
          const monthMap: Record<string, number> = {
            'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
            'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
          };

          const quarterStart = new Date(year, monthMap[startMonth], 1);
          const quarterEnd = new Date(year, monthMap[endMonth] + 1, 0); // Last day of month

          // Check if quarter overlaps with selected date range
          if (quarterEnd < startDate || quarterStart > endDate) {
            continue; // Skip this quarter
          }
        }
      }

      quarters.push(plData);
    } catch (error) {
      console.error(`Error parsing ${filename}:`, error);
    }
  }

  // Calculate Yard Storage summary
  let totalIncome = 0;
  let totalExpenses = 0;
  let startupCosts = 0;

  for (const q of quarters) {
    totalIncome += q.yardStorageIncome;
    totalExpenses += q.rentExpense + q.utilities;

    // Startup costs: Dec 2024 (Q4 2024) - May 2025 (Q1-Q2 2025)
    // Q4 2024: 1 month (Dec) of repairs - approximate as 1/3 of quarter
    // Q1 2025: 3 months (Jan-Mar) - full quarter
    // Q2 2025: 2 months (Apr-May) - approximate as 2/3 of quarter
    if (q.year === 2024 && q.quarter === 'Q4') {
      startupCosts += (q.repairsAndMaintenance / 3); // Dec only
    }
    if (q.year === 2025 && q.quarter === 'Q1') {
      startupCosts += q.repairsAndMaintenance + q.equipmentRental;
    }
    if (q.year === 2025 && q.quarter === 'Q2') {
      startupCosts += (q.repairsAndMaintenance * 2 / 3); // Apr-May only
    }
  }

  const netProfit = totalIncome - totalExpenses - startupCosts;

  // Create quarterly metrics for the chart
  const quarterlyMetrics: QuarterlyPLMetric[] = quarters
    .sort((a, b) => {
      // Sort by year then by quarter
      if (a.year !== b.year) return a.year - b.year;
      const quarterOrder = { 'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4 };
      return quarterOrder[a.quarter as keyof typeof quarterOrder] - quarterOrder[b.quarter as keyof typeof quarterOrder];
    })
    .map(q => ({
      period: `${q.quarter} ${q.year}`,
      totalRevenue: q.totalIncome,
      totalExpenses: q.totalExpenses,
    }));

  // Create quarterly comparison data (Q1-Q4 on x-axis, multiple years as lines)
  const comparisonMap: Record<string, QuarterlyComparisonMetric> = {
    'Q1': { quarter: 'Q1' },
    'Q2': { quarter: 'Q2' },
    'Q3': { quarter: 'Q3' },
    'Q4': { quarter: 'Q4' },
  };

  // Populate data for each year
  quarters.forEach(q => {
    const key = q.quarter;
    if (comparisonMap[key]) {
      comparisonMap[key][`revenue${q.year}`] = q.totalIncome;
      comparisonMap[key][`expenses${q.year}`] = q.totalExpenses;
    }
  });

  const quarterlyComparison: QuarterlyComparisonMetric[] = [
    comparisonMap['Q1'],
    comparisonMap['Q2'],
    comparisonMap['Q3'],
    comparisonMap['Q4'],
  ];

  // Calculate overall P&L totals for the filtered period
  let overallIncome = 0;
  let overallExpenses = 0;

  // Initialize aggregated expense breakdown
  const aggregatedExpenses: ExpenseBreakdown = {
    driverPay: 0,
    fuel: 0,
    longHaulDrayage: 0,
    hazmat: 0,
    pilotCarEscort: 0,
    placardRemoval: 0,
    overweight: 0,
    oversizedPermit: 0,
    otherOperational: 0,
    transloading: 0,
    warehouseStorage: 0,
    shrinkWrap: 0,
    palletization: 0,
    payrollExpenses: 0,
    healthInsurance: 0,
    commercialInsurance: 0,
    rentExpense: 0,
    utilities: 0,
    repairsAndMaintenance: 0,
    chassisRental: 0,
    equipmentRental: 0,
    accountingServices: 0,
    professionalFees: 0,
    depreciation: 0,
    computerAndInternet: 0,
    bankCharges: 0,
    businessLicenses: 0,
    advertising: 0,
    otherAdministrative: 0,
  };

  for (const q of quarters) {
    overallIncome += q.totalIncome;
    overallExpenses += q.totalExpenses;

    // Aggregate expense breakdown
    aggregatedExpenses.driverPay += q.expenses.driverPay;
    aggregatedExpenses.fuel += q.expenses.fuel;
    aggregatedExpenses.longHaulDrayage += q.expenses.longHaulDrayage;
    aggregatedExpenses.hazmat += q.expenses.hazmat;
    aggregatedExpenses.pilotCarEscort += q.expenses.pilotCarEscort;
    aggregatedExpenses.placardRemoval += q.expenses.placardRemoval;
    aggregatedExpenses.overweight += q.expenses.overweight;
    aggregatedExpenses.oversizedPermit += q.expenses.oversizedPermit;
    aggregatedExpenses.otherOperational += q.expenses.otherOperational;
    aggregatedExpenses.transloading += q.expenses.transloading;
    aggregatedExpenses.warehouseStorage += q.expenses.warehouseStorage;
    aggregatedExpenses.shrinkWrap += q.expenses.shrinkWrap;
    aggregatedExpenses.palletization += q.expenses.palletization;
    aggregatedExpenses.payrollExpenses += q.expenses.payrollExpenses;
    aggregatedExpenses.healthInsurance += q.expenses.healthInsurance;
    aggregatedExpenses.commercialInsurance += q.expenses.commercialInsurance;
    aggregatedExpenses.rentExpense += q.expenses.rentExpense;
    aggregatedExpenses.utilities += q.expenses.utilities;
    aggregatedExpenses.repairsAndMaintenance += q.expenses.repairsAndMaintenance;
    aggregatedExpenses.chassisRental += q.expenses.chassisRental;
    aggregatedExpenses.equipmentRental += q.expenses.equipmentRental;
    aggregatedExpenses.accountingServices += q.expenses.accountingServices;
    aggregatedExpenses.professionalFees += q.expenses.professionalFees;
    aggregatedExpenses.depreciation += q.expenses.depreciation;
    aggregatedExpenses.computerAndInternet += q.expenses.computerAndInternet;
    aggregatedExpenses.bankCharges += q.expenses.bankCharges;
    aggregatedExpenses.businessLicenses += q.expenses.businessLicenses;
    aggregatedExpenses.advertising += q.expenses.advertising;
    aggregatedExpenses.otherAdministrative += q.expenses.otherAdministrative;
  }

  const overallNetProfit = overallIncome - overallExpenses;

  // Calculate direct operations costs
  const directOperationsCosts = aggregatedExpenses.driverPay +
    aggregatedExpenses.fuel +
    aggregatedExpenses.longHaulDrayage +
    aggregatedExpenses.hazmat +
    aggregatedExpenses.pilotCarEscort +
    aggregatedExpenses.placardRemoval +
    aggregatedExpenses.overweight +
    aggregatedExpenses.oversizedPermit +
    aggregatedExpenses.otherOperational;

  // Calculate pass-through costs
  const passThroughCosts = aggregatedExpenses.transloading +
    aggregatedExpenses.warehouseStorage +
    aggregatedExpenses.shrinkWrap +
    aggregatedExpenses.palletization;

  // Calculate overhead expenses (everything except direct operations and pass-through)
  const overallOverheadExpenses = aggregatedExpenses.payrollExpenses +
    aggregatedExpenses.healthInsurance +
    aggregatedExpenses.commercialInsurance +
    aggregatedExpenses.rentExpense +
    aggregatedExpenses.utilities +
    aggregatedExpenses.repairsAndMaintenance +
    aggregatedExpenses.chassisRental +
    aggregatedExpenses.equipmentRental +
    aggregatedExpenses.accountingServices +
    aggregatedExpenses.professionalFees +
    aggregatedExpenses.depreciation +
    aggregatedExpenses.computerAndInternet +
    aggregatedExpenses.bankCharges +
    aggregatedExpenses.businessLicenses +
    aggregatedExpenses.advertising +
    aggregatedExpenses.otherAdministrative;

  const overallOperatingProfit = overallIncome - directOperationsCosts - passThroughCosts;

  return {
    quarters,
    quarterlyMetrics,
    quarterlyComparison,
    yardStorage: {
      totalIncome,
      totalExpenses,
      startupCosts,
      netProfit,
    },
    overallPL: {
      totalIncome: overallIncome,
      totalExpenses: overallExpenses,
      netProfit: overallNetProfit,
      operatingProfit: overallOperatingProfit,
      overheadExpenses: overallOverheadExpenses,
      expenseBreakdown: aggregatedExpenses,
    },
  };
}
