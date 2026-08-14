const fs = require('fs');
let code = fs.readFileSync('src/components/ProjectHub.tsx', 'utf8');

code = code.replace(/updatedSponsors/g, 'updatedAllocations');
code = code.replace(/nextSponsors/g, 'nextAllocations');
code = code.replace(/\.\.\.sponsors,/g, '...allocations,');
code = code.replace(/id: `sponsor-\$\{Date\.now\(\)\}`,/g, 'id: `gf-alloc-${Date.now()}`,');
code = code.replace(/const sponsors = selectedProject\.generalFundAllocations \|\| \[\];/g, 'const allocations = selectedProject.generalFundAllocations || [];');

code = code.replace(/Sponsors \& Grants/g, 'General Fund Allocations');
code = code.replace(/EXTERNAL TRUST SPONSORSHIPS/g, 'GENERAL FUND ALLOCATIONS');
code = code.replace(/Sponsor Funding \(Inbound\)/g, 'General Fund Support (Inbound)');
code = code.replace(/Sponsor \/ Grant Entity/g, 'Allocation Source Entity');
code = code.replace(/Sponsors \& Offsetting Grants/g, 'General Fund Allocations');
code = code.replace(/Exact Sponsor fundings:/g, 'Exact General Fund support:');
code = code.replace(/Document scholarships, academic grants, or external sponsorships/g, 'Document global treasury allocations that reduce out-of-pocket costs');
code = code.replace(/New sponsor funding scratch states/g, 'New general fund scratch states');

fs.writeFileSync('src/components/ProjectHub.tsx', code);
