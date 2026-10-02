const fs = require('fs');
const files = [
  'src/useWorkspaceSettings.ts'
];
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(
    'if (storedLogo) setLogoUrl(storedLogo);',
    'if (storedLogo) setLogoUrl(storedLogo === "/AXOTIC Logo-1.png" ? "/logo.png" : storedLogo);'
  );
  code = code.replace(
    'if (_logo) setLogoUrl(_logo);',
    'if (_logo) setLogoUrl(_logo === "/AXOTIC Logo-1.png" ? "/logo.png" : _logo);'
  );
  code = code.replace(
    'if (data.logoUrl) setLogoUrl(data.logoUrl);',
    'if (data.logoUrl) setLogoUrl(data.logoUrl === "/AXOTIC Logo-1.png" ? "/logo.png" : data.logoUrl);'
  );
  fs.writeFileSync(file, code);
}
