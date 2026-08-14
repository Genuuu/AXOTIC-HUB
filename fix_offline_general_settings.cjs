const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');
code = code.replace(
  'if (pub) setAllowPublicVisibility(pub === "true");',
  'if (pub) setAllowPublicVisibility(pub === "true");\n      const storedGen = localStorage.getItem("axotic_mock_general_settings");\n      if (storedGen) {\n        try {\n          const p = JSON.parse(storedGen);\n          if (p.generalFundTransactions) setGeneralFundTransactions(p.generalFundTransactions);\n        } catch(e) {}\n      }'
);
fs.writeFileSync('src/components/AdminSettings.tsx', code);
