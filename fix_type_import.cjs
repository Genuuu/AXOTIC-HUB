const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

code = code.replace(
  'import { UserProfile, UserRole, AdminLog } from "../types";',
  'import { UserProfile, UserRole, AdminLog, GeneralFundTransaction } from "../types";'
);

fs.writeFileSync('src/components/AdminSettings.tsx', code);
