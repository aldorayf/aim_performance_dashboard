const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

function extractLoadId(loadNumber) {
  const match = loadNumber.match(/AIM_([A-Z]\d+)/);
  return match ? match[1] : '';
}

console.log('Finding OTR loads not in profitability report...\n');

// Read Profitability CSV to get all load IDs
const profitCsvPath = path.join(__dirname, '../public/2026-07-10T17_23_49.573Z-profitability.csv');
const profitCsvContent = fs.readFileSync(profitCsvPath, 'utf-8');

const profitabilityLoadIds = new Set();
Papa.parse(profitCsvContent, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    results.data.forEach((row) => {
      const loadNumber = row['Load #']?.trim();
      if (loadNumber) {
        const loadId = extractLoadId(loadNumber);
        if (loadId) {
          profitabilityLoadIds.add(loadId);
        }
      }
    });
  }
});

console.log(`Found ${profitabilityLoadIds.size} loads in profitability CSV`);

// Read OTR CSV
const otrCsvPath = path.join(__dirname, '../public/AIM TRUCK OTR  - COMPLETED RUNS.csv');
const otrCsvContent = fs.readFileSync(otrCsvPath, 'utf-8');

const unmatchedOTRLoads = [];
const allOTRLoads = [];

Papa.parse(otrCsvContent, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    results.data.forEach((row) => {
      const aimRef = row['AIM REFENCE NUMBER ']?.trim();

      // Skip empty rows
      if (!aimRef) return;

      allOTRLoads.push(aimRef);

      // Check if this load is NOT in profitability data
      if (!profitabilityLoadIds.has(aimRef)) {
        unmatchedOTRLoads.push({
          'AIM REFERENCE NUMBER': aimRef,
          'DELIVERY LOCATION': row['DELIVERY LOCATION']?.trim() || '',
          'CONTAINER': row['CONTAINER ']?.trim() || '',
          'ETA': row['ETA']?.trim() || '',
          'VESSEL': row['VESSEL']?.trim() || '',
          'DELIVERY DATE': row['DELIVERY DATE']?.trim() || '',
          'CUSTOMER': row['CUSTOMER']?.trim() || '',
          'DRIVER': row['DRIVER']?.trim() || '',
          'MARGIN': row['Margin']?.trim() || '',
          'STATUS': 'Not Found in Profitability Report'
        });
      }
    });
  }
});

console.log(`Found ${allOTRLoads.length} total OTR loads in reference CSV`);
console.log(`Found ${unmatchedOTRLoads.length} OTR loads NOT in profitability report\n`);

// Calculate statistics
const matchedCount = allOTRLoads.length - unmatchedOTRLoads.length;
const matchRate = ((matchedCount / allOTRLoads.length) * 100).toFixed(1);

console.log('Statistics:');
console.log(`  Matched:     ${matchedCount} loads (${matchRate}%)`);
console.log(`  Not Matched: ${unmatchedOTRLoads.length} loads (${(100 - matchRate).toFixed(1)}%)`);
console.log('');

// Sort by AIM reference number
unmatchedOTRLoads.sort((a, b) => {
  const aNum = a['AIM REFERENCE NUMBER'];
  const bNum = b['AIM REFERENCE NUMBER'];
  return aNum.localeCompare(bNum);
});

// Generate CSV
const csv = Papa.unparse(unmatchedOTRLoads);

// Write to file
const outputPath = path.join(__dirname, '../public/OTR-Loads-Not-In-Profitability.csv');
fs.writeFileSync(outputPath, csv, 'utf-8');

console.log(`âœ… Created unmatched OTR loads CSV at: ${outputPath}`);
console.log(`   Total unmatched loads: ${unmatchedOTRLoads.length}`);

// Show first few examples
if (unmatchedOTRLoads.length > 0) {
  console.log('\nFirst 10 unmatched loads:');
  unmatchedOTRLoads.slice(0, 10).forEach((load, idx) => {
    console.log(`  ${idx + 1}. ${load['AIM REFERENCE NUMBER']} - ${load['CUSTOMER']} - ${load['DELIVERY DATE']}`);
  });

  if (unmatchedOTRLoads.length > 10) {
    console.log(`  ... and ${unmatchedOTRLoads.length - 10} more`);
  }
}


