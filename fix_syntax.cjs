const fs = require('fs');
let code = fs.readFileSync('src/components/HomeDashboard.tsx', 'utf8');

// Find the last 20 lines and fix the wrapper
code = code.replace(
  '    </div>\n\n      {/* Add Funds Modal */}\n      {showAddFundModal',
  '      {/* Add Funds Modal */}\n      {showAddFundModal'
);

code = code.replace(
  '      )}\n\n  );\n}\n',
  '      )}\n    </div>\n  );\n}\n'
);

fs.writeFileSync('src/components/HomeDashboard.tsx', code);
