const fs = require('fs');
let code = fs.readFileSync('src/components/ProjectHub.tsx', 'utf8');

code = code.replace(/rows\.push\(\["General Fund Support \(Inbound\)", generalFundTotal\.toFixed\(2\)]\);/, 'rows.push(["General Fund Support (Inbound)", generalFundAllocationsTotal.toFixed(2)]);');
code = code.replace(/getDynamicFontSizeClass\(generalFundTotal\)/g, 'getDynamicFontSizeClass(generalFundAllocationsTotal)');
code = code.replace(/\$\{generalFundTotal\.toLocaleString/g, '${generalFundAllocationsTotal.toLocaleString');
code = code.replace(/formatShortOption\(generalFundTotal, generalFundTotal < 100_000\)/g, 'formatShortOption(generalFundAllocationsTotal, generalFundAllocationsTotal < 100_000)');
code = code.replace(/generalFundTotal \> 0 \|\| memberDonationsTotal/g, 'generalFundAllocationsTotal > 0 || memberDonationsTotal');
code = code.replace(/generalFundTotal \> 0 \&\& \` \(General Fund Support/g, 'generalFundAllocationsTotal > 0 && ` (General Fund Support');
code = code.replace(/\$\{generalFundTotal\.toFixed\(2\)\}\)/g, '${generalFundAllocationsTotal.toFixed(2)})');
code = code.replace(/LKR \{generalFundTotal\.toLocaleString\('en-US', \{ minimumFractionDigits/g, 'LKR {generalFundAllocationsTotal.toLocaleString(\'en-US\', { minimumFractionDigits');

fs.writeFileSync('src/components/ProjectHub.tsx', code);
