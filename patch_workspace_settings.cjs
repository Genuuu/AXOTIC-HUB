const fs = require('fs');
let code = fs.readFileSync('src/useWorkspaceSettings.ts', 'utf8');

code = code.replace(
  'import { db } from "./firebase";',
  'import { db } from "./firebase";\nimport { GeneralFundTransaction } from "./types";'
);

code = code.replace(
  '  const [workspaceName, setWorkspaceName] = useState<string>("AXOTIC Robotics Hub");',
  '  const [workspaceName, setWorkspaceName] = useState<string>("AXOTIC Robotics Hub");\n  const [generalFundTransactions, setGeneralFundTransactions] = useState<GeneralFundTransaction[]>([]);'
);

code = code.replace(
  '      if (storedName) setWorkspaceName(storedName);',
  '      if (storedName) setWorkspaceName(storedName);\n      const storedGen = localStorage.getItem("axotic_mock_general_settings");\n      if (storedGen) {\n        try {\n          const p = JSON.parse(storedGen);\n          if (p.generalFundTransactions) setGeneralFundTransactions(p.generalFundTransactions);\n        } catch(e) {}\n      }'
);

code = code.replace(
  '        if (_name) setWorkspaceName(_name);',
  '        if (_name) setWorkspaceName(_name);\n        const _storedGen = localStorage.getItem("axotic_mock_general_settings");\n        if (_storedGen) {\n          try {\n            const p = JSON.parse(_storedGen);\n            if (p.generalFundTransactions) setGeneralFundTransactions(p.generalFundTransactions);\n          } catch(e) {}\n        }'
);

code = code.replace(
  '          if (data.workspaceName) setWorkspaceName(data.workspaceName);',
  '          if (data.workspaceName) setWorkspaceName(data.workspaceName);\n          if (data.generalFundTransactions) setGeneralFundTransactions(data.generalFundTransactions);'
);

code = code.replace(
  '  return { logoUrl, workspaceName };',
  '  return { logoUrl, workspaceName, generalFundTransactions };'
);

fs.writeFileSync('src/useWorkspaceSettings.ts', code);
