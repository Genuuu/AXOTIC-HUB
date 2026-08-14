const fs = require('fs');
let code = fs.readFileSync('src/components/ProjectHub.tsx', 'utf8');

code = code.replace(
  'const netCostToSplit = Math.max(0, costVal + memberReimbursableTotal - sponsorTotal - memberDonationsTotal);',
  'const generalFundTotal = items.filter(it => it.paidById === "general_fund").reduce((sum, it) => sum + (it.unitCost * it.quantity), 0);\n              const netCostToSplit = Math.max(0, costVal + memberReimbursableTotal - sponsorTotal - memberDonationsTotal - generalFundTotal);'
);

fs.writeFileSync('src/components/ProjectHub.tsx', code);
