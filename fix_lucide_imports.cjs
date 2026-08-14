const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

code = code.replace(
  '} from "lucide-react";',
  '  Banknote,\n  Layers\n} from "lucide-react";'
);
fs.writeFileSync('src/components/AdminSettings.tsx', code);
