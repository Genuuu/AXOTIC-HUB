const fs = require('fs');
let code = fs.readFileSync('src/components/ProjectHub.tsx', 'utf8');

code = code.replace(
  'const generalFundTotal = allocations.reduce((sum, s) => sum + s.amount, 0);',
  'const generalFundAllocationsTotal = allocations.reduce((sum, s) => sum + s.amount, 0);'
);

code = code.replace(
  'const netCostToSplit = Math.max(0, costVal + memberReimbursableTotal - generalFundTotal - memberDonationsTotal - generalFundTotal);',
  'const netCostToSplit = Math.max(0, costVal + memberReimbursableTotal - generalFundAllocationsTotal - memberDonationsTotal - generalFundTotal);'
);

code = code.replace(/generalFundTotal/g, (match, offset) => {
  // We only replace the ones that were meant to be the allocations total
  // Let's manually replace the known spots.
  return match;
});

fs.writeFileSync('src/components/ProjectHub.tsx', code);
