const fs = require('fs');
['src/App.tsx', 'src/components/AuthModal.tsx', 'src/components/PublicLanding.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/import defaultLogoUrl from ".*Logo\.png";/, 'const defaultLogoUrl = "/AXOTIC Logo-1.png";');
  fs.writeFileSync(file, code);
});
console.log("Updated default logo");
