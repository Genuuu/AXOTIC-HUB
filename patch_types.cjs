const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(/export interface SponsorFunding \{/, 'export interface GeneralFundAllocation {');
code = code.replace(/  sponsorName: string;/, '  allocationName: string;');
code = code.replace(/  sponsorFundings\?: SponsorFunding\[\];/, '  generalFundAllocations?: GeneralFundAllocation[];');

fs.writeFileSync('src/types.ts', code);
