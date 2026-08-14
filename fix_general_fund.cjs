const fs = require('fs');
let code = fs.readFileSync('src/components/ProjectHub.tsx', 'utf8');

code = code.replace(
  'const netCostToSplit = Math.max(0, costVal + memberReimbursableTotal - sponsorTotal - memberDonationsTotal);',
  'const generalFundTotal = items.filter(it => it.paidById === "general_fund").reduce((sum, it) => sum + (it.unitCost * it.quantity), 0);\n              const netCostToSplit = Math.max(0, costVal + memberReimbursableTotal - sponsorTotal - memberDonationsTotal - generalFundTotal);'
);

code = code.replace(
  'const getParticipantName = (uid: string) => {',
  'const getParticipantName = (uid: string) => {\n                if (uid === "general_fund") return "General Fund";'
);

code = code.replace(
  'const getParticipantRoleLabel = (uid: string) => {',
  'const getParticipantRoleLabel = (uid: string) => {\n                if (uid === "general_fund") return "Team Fund";'
);

fs.writeFileSync('src/components/ProjectHub.tsx', code);
