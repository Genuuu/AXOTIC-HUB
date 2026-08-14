const fs = require('fs');
let code = fs.readFileSync('src/components/ProjectHub.tsx', 'utf8');

// Replace state variables for new form
code = code.replace(/newSponsorName/g, 'newAllocationName');
code = code.replace(/setNewSponsorName/g, 'setNewAllocationName');
code = code.replace(/newSponsorAmount/g, 'newAllocationAmount');
code = code.replace(/setNewSponsorAmount/g, 'setNewAllocationAmount');
code = code.replace(/newSponsorNotes/g, 'newAllocationNotes');
code = code.replace(/setNewSponsorNotes/g, 'setNewAllocationNotes');

// Replace handlers and props
code = code.replace(/handleUpdateSponsorFundings/g, 'handleUpdateGeneralFundAllocations');
code = code.replace(/sponsorFundings/g, 'generalFundAllocations');
code = code.replace(/sponsorName/g, 'allocationName');
code = code.replace(/SponsorFunding/g, 'GeneralFundAllocation');
code = code.replace(/sponsorTotal/g, 'generalFundTotal');
code = code.replace(/Sponsor Support/g, 'General Fund Support');
code = code.replace(/Sponsors & Grants/g, 'General Fund Allocations');
code = code.replace(/Sponsor Name/g, 'Allocation Name');
code = code.replace(/external sponsor funding/g, 'general fund allocations');
code = code.replace(/Sponsor Offsets/g, 'General Fund Offsets');
code = code.replace(/Add Inbound Sponsor Support Row/g, 'Add General Fund Allocation Row');
code = code.replace(/Sponsor \(e\.g\. AXOTIC Hub, Grant, Aerospace Club\)/g, 'Allocation Name (e.g. AXOTIC Hub Grant)');
code = code.replace(/Add Sponsorship Record/g, 'Add General Fund Allocation');
code = code.replace(/Add Sponsorship inline controls/g, 'Add General Fund Allocation inline controls');
code = code.replace(/Remove sponsor funding/g, 'Remove general fund allocation');

code = code.replace(/const sponsors = /g, 'const allocations = ');
code = code.replace(/const nextSponsors = /g, 'const nextAllocations = ');
code = code.replace(/\bsponsors\./g, 'allocations.');
code = code.replace(/\bsponsors\.map/g, 'allocations.map');
code = code.replace(/\bsponsors\.reduce/g, 'allocations.reduce');
code = code.replace(/\bsponsors\.length/g, 'allocations.length');
code = code.replace(/\bsponsors\.filter/g, 'allocations.filter');

fs.writeFileSync('src/components/ProjectHub.tsx', code);
