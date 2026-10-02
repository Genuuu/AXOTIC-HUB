const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

code = code.replace(
  'Layers\n  PackageOpen,',
  'Layers,\n  PackageOpen,'
);

fs.writeFileSync('src/components/AdminSettings.tsx', code);
