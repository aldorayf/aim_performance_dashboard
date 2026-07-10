const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Simple versions of the utility functions
function parseCurrency(value) {
  if (!value || value === '0') return 0;
  const cleaned = value.replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parsePercentage(value) {
  if (!value) return 0;
  const cleaned = value.replace(/%/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function extractLoadId(loadNumber) {
  const match = loadNumber.match(/AIM_([A-Z]\d+)/);
  return match ? match[1] : '';
}

// Read OTR CSV
const otrCsvPath = path.join(__dirname, '../public/AIM TRUCK OTR  - COMPLETED RUNS.csv');
const otrCsvContent = fs.readFileSync(otrCsvPath, 'utf-8');

const otrLoadIds = new Set();
Papa.parse(otrCsvContent, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    results.data.forEach((row) => {
      const aimRef = row['AIM REFENCE NUMBER ']?.trim();
      if (aimRef) {
        otrLoadIds.add(aimRef);
      }
    });
  }
});

console.log(`Found ${otrLoadIds.size} OTR loads in reference CSV`);

// Read Profitability CSV
const profitCsvPath = path.join(__dirname, '../public/2026-07-10T17_23_49.573Z-profitability.csv');
const profitCsvContent = fs.readFileSync(profitCsvPath, 'utf-8');

const otrRecords = [];
Papa.parse(profitCsvContent, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    results.data.forEach((row) => {
      const loadNumber = row['Load #']?.trim();
      if (!loadNumber) return;

      const loadId = extractLoadId(loadNumber);
      const isOTR = otrLoadIds.has(loadId);

      if (isOTR) {
        let chargesType = row['Charges Type']
          ?.split(',')
          .map((c) => c.trim())
          .filter((c) => c) || [];

        // Replace "Base Price" with "OTR LINEHAUL" for OTR loads
        chargesType = chargesType.map(charge =>
          charge === 'Base Price' ? 'OTR LINEHAUL' : charge
        );
        if (chargesType.length === 0) {
          chargesType = ['OTR LINEHAUL'];
        }

        otrRecords.push({
          'Load #': loadNumber,
          'Container #': row['Container #']?.trim() || '',
          'Customer': row['Customer']?.trim() || '',
          'Date': row['Date']?.trim() || '',
          'Driver': row['Driver']?.trim() || '',
          'Charges Type': chargesType.join(', '),
          'Total Charges': row['Total Charges'] || '$0.00',
          'Driver Pay Total': row['Driver Pay Total'] || '$0.00',
          'Expense Total': row['Expense Total'] || '$0.00',
          'Profit': row['Profit'] || '$0.00',
          'Profit Margin': row['Profit Margin'] || '0%'
        });
      }
    });
  }
});

console.log(`Matched ${otrRecords.length} OTR loads from profitability data`);

// Generate CSV
const csv = Papa.unparse(otrRecords);

// Write to file
const outputPath = path.join(__dirname, '../public/OTR-Loads-From-Profitability.csv');
fs.writeFileSync(outputPath, csv, 'utf-8');

console.log(`âœ… Created OTR loads CSV at: ${outputPath}`);
console.log(`   Total OTR loads exported: ${otrRecords.length}`);


