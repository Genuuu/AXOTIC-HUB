const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');
code = code.replace('  Link\n  Banknote,', '  Link,\n  Banknote,');
fs.writeFileSync('src/components/AdminSettings.tsx', code);
