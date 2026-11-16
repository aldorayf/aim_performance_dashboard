# July–September 2026 data update

Both dashboards now default to October 1, 2025–September 30, 2026.

## Source files

- PortPro: `public/2026-11-16T13_40_05.019Z-profitability.csv`, kept unchanged from the supplied export. It adds 847 unique loads dated July 1–September 30, 2026 to the historical export, with no overlapping load IDs.
- QuickBooks: `public/Aim Trucking Services, Inc._Profit and Loss (20).csv`, kept unchanged from the supplied export. The uploaded filename ended in `(4)`, but that filename already represents Q4 2024 in this repository, so the new quarter uses `(20)`.

## Reconciliation

| Q3 2026 source | Revenue / income | Expenses | Profit |
| --- | ---: | ---: | ---: |
| PortPro | $1,043,310.11 | $644,712.07 driver pay + $192,743.50 other expenses | $205,854.54 gross profit |
| QuickBooks, accrual | $1,044,814.00 | $971,884.28 | $72,929.72 net income |

The resulting October 2025–September 2026 PortPro period has 2,998 loads, $3,448,387.16 revenue and $676,712.59 gross profit. QuickBooks shows $3,715,342.78 income, $3,474,763.10 expenses and $240,579.68 net income for that period. The two source systems are displayed independently.

## Import behavior

- All source charge types are retained. Existing load classification remains based on the OTR runs reference and the `OTR LINEHAUL` charge, not a driver's usual division. Q3 has 438 OTR-classified loads and 409 other loads under that existing rule.
- PortPro two-digit and four-digit years are supported. The export's totals footer is excluded from loads.
- QuickBooks supports `Total Income` / `Total Expenses` as well as the older `Total for ...` labels. Filtering uses the registered quarter, so the new `July-September, 2026` heading does not leak into earlier periods.
- The Q3 negative fuel expense is preserved. Professional fees and tire repairs are included in their expense categories.

## Validation

Run `node scripts/verify-q3-2026.cjs` and `npm run build`. The regression checks cover source totals, dates, unique load IDs, monthly counts, classification, Q3 expense reconciliation and exclusion from historical periods.
