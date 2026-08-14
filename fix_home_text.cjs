const fs = require('fs');
let code = fs.readFileSync('src/components/HomeDashboard.tsx', 'utf8');

code = code.replace(/totalSponsorFunds/g, 'totalGeneralFundAllocations');
code = code.replace(/Total Sponsor Sponsorship/g, 'Total General Fund Allocations');
code = code.replace(/Sponsor Funding/g, 'General Fund Support');
code = code.replace(/SPONSOR \& GRANTS OVERVIEW ROLL/g, 'GENERAL FUND ALLOCATIONS OVERVIEW');
code = code.replace(/Consolidated Sponsor Contributions Roll/g, 'Consolidated General Fund Allocations');
code = code.replace(/active sponsor fundings logged/g, 'active general fund allocations logged');
code = code.replace(/Sponsoring backing/g, 'General Fund backing');

fs.writeFileSync('src/components/HomeDashboard.tsx', code);
