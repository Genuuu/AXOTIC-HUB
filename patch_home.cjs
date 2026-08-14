const fs = require('fs');
let code = fs.readFileSync('src/components/HomeDashboard.tsx', 'utf8');

code = code.replace(/sponsorFundings/g, 'generalFundAllocations');
code = code.replace(/sponsorTotal/g, 'generalFundAllocationsTotal');
code = code.replace(/Sponsor Support/g, 'General Fund Support');
code = code.replace(/sponsors/g, 'allocations');

fs.writeFileSync('src/components/HomeDashboard.tsx', code);
