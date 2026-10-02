const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');
code = code.replace(
  'if (logo) setLogoUrl(logo);',
  'if (logo) setLogoUrl(logo === "/AXOTIC Logo-1.png" ? "/logo.png" : logo);'
);
code = code.replace(
  'if (data.logoUrl) setLogoUrl(data.logoUrl);',
  'if (data.logoUrl) setLogoUrl(data.logoUrl === "/AXOTIC Logo-1.png" ? "/logo.png" : data.logoUrl);'
);
fs.writeFileSync('src/components/AdminSettings.tsx', code);
