const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

code = code.replace(
  '// Offline mode handling (mock)\n      setGeneralFundTransactions(nextTx);',
  '// Offline mode handling (mock)\n      setGeneralFundTransactions(nextTx);\n      const stored = localStorage.getItem("axotic_mock_general_settings");\n      let parsed = stored ? JSON.parse(stored) : {};\n      parsed.generalFundTransactions = nextTx;\n      localStorage.setItem("axotic_mock_general_settings", JSON.stringify(parsed));'
);

code = code.replace(
  'const nextTx = generalFundTransactions.filter(t => t.id !== txId);\n    \n    if (currentUser.isOfflineMock) {\n      setGeneralFundTransactions(nextTx);\n      return;\n    }',
  'const nextTx = generalFundTransactions.filter(t => t.id !== txId);\n    \n    if (currentUser.isOfflineMock) {\n      setGeneralFundTransactions(nextTx);\n      const stored = localStorage.getItem("axotic_mock_general_settings");\n      let parsed = stored ? JSON.parse(stored) : {};\n      parsed.generalFundTransactions = nextTx;\n      localStorage.setItem("axotic_mock_general_settings", JSON.stringify(parsed));\n      return;\n    }'
);

fs.writeFileSync('src/components/AdminSettings.tsx', code);
