// Regression checks against the supplied PortPro and QuickBooks exports.
// Run: node scripts/verify-q3-2026.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'public', name), 'utf8');
function loadTS(name) {
  const filename = path.join(root, name);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = module.paths;
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}
const money = (actual, expected) => assert.equal(Math.round(actual * 100), Math.round(expected * 100));

async function main() {
  const processor = loadTS('lib/dataProcessor.ts');
  const pl = loadTS('lib/plParser.ts');
  global.fetch = async url => ({ ok: true, text: async () => read(url.slice(1)) });
  const otr = await processor.parseOTRData(read('AIM TRUCK OTR  - COMPLETED RUNS.csv'));
  const old = await processor.parseProfitabilityData(read('2026-07-10T17_23_49.573Z-profitability.csv'), otr);
  const added = await processor.parseProfitabilityData(read('2026-11-16T13_40_05.019Z-profitability.csv'), otr);
  const all = [...old, ...added];
  assert.equal(added.length, 847); // Footer must not count as a load.
  assert.equal(new Set(all.map(row => row.loadNumber)).size, all.length);
  assert(added.every(row => row.dateObj.getFullYear() === 2026));
  const q3 = processor.filterRecordsByDateRange(all, new Date(2026, 6, 1), new Date(2026, 8, 30));
  assert.equal(q3.length, 847);
  for (const [month, count] of [[6, 267], [7, 322], [8, 258]]) {
    assert.equal(q3.filter(row => row.dateObj.getMonth() === month).length, count);
  }
  const metrics = processor.calculateDashboardMetrics(q3);
  money(metrics.totalRevenue, 1043310.11);
  money(metrics.totalProfit, 205854.54);
  assert.equal(q3.filter(row => row.isOTR).length, 438);
  // Local drivers can appear on an OTR load; classification is by load.
  assert(q3.some(row => row.driver === 'BOBBY OUTLAND' && row.isOTR));
  const priorStart = new Date(2025, 9, 1);
  const priorEnd = new Date(2026, 5, 30);
  const prior = processor.filterRecordsByDateRange(all, priorStart, priorEnd);
  assert.deepEqual(prior, processor.filterRecordsByDateRange(old, priorStart, priorEnd));
  assert.equal(prior.length, 2151);
  const annual = processor.calculateDashboardMetrics(processor.filterRecordsByDateRange(all, priorStart, new Date(2026, 8, 30)));
  assert.equal(annual.totalLoads, 2998);
  money(annual.totalRevenue, processor.calculateDashboardMetrics(prior).totalRevenue + 1043310.11);

  const q3PL = await pl.parsePLData(new Date(2026, 6, 1), new Date(2026, 8, 30));
  assert.equal(q3PL.quarters.length, 1);
  assert.equal(q3PL.quarters[0].quarter, 'Q3');
  money(q3PL.overallPL.totalIncome, 1044814);
  money(q3PL.overallPL.totalExpenses, 971884.28);
  money(q3PL.overallPL.netProfit, 72929.72);
  money(q3PL.yardStorage.totalIncome, 7800);
  money(q3PL.overallPL.expenseBreakdown.fuel, -11920.29);
  money(q3PL.overallPL.expenseBreakdown.repairsAndMaintenance, 320);
  money(Object.values(q3PL.overallPL.expenseBreakdown).reduce((a, b) => a + b, 0), 971884.28);
  const startupPeriod = await pl.parsePLData(new Date(2024, 9, 1), new Date(2024, 11, 31));
  money(startupPeriod.yardStorage.startupCosts, 603.22 / 3);
  for (const [start, end, expected] of [
    [new Date(2023, 0, 1), new Date(2023, 8, 30), 3],
    [new Date(2023, 9, 1), new Date(2024, 8, 30), 4],
    [new Date(2024, 9, 1), new Date(2025, 8, 30), 4],
    [priorStart, priorEnd, 3],
  ]) {
    const history = await pl.parsePLData(start, end);
    assert.equal(history.quarters.length, expected);
    assert(!history.quarters.some(q => q.year === 2026 && q.quarter === 'Q3'));
  }
  const annualPL = await pl.parsePLData(priorStart, new Date(2026, 8, 30));
  assert.equal(annualPL.quarters.length, 4);
  console.log(JSON.stringify({ status: 'PASS', q3: { loads: 847, revenue: metrics.totalRevenue, grossProfit: metrics.totalProfit }, annual: { loads: annual.totalLoads, revenue: annual.totalRevenue, grossProfit: annual.totalProfit }, quickBooksAnnual: annualPL.overallPL }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
