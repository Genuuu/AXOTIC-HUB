const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

code = code.replace(/import \{/g, 'import { Banknote,');
// Only need it once, but just replace the first 'import {' matching lucide-react?
// Safer:
code = code.replace('import { \n  Settings, \n  Shield,', 'import { \n  Settings, \n  Banknote, \n  Shield,');
fs.writeFileSync('src/components/AdminSettings.tsx', code);
