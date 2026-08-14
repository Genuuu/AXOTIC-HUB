const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

code = code.replace(
  'if (data.returnPeriod) setReturnPeriod(data.returnPeriod);',
  'if (data.returnPeriod) setReturnPeriod(data.returnPeriod);\n          if (data.generalFundTransactions) setGeneralFundTransactions(data.generalFundTransactions);'
);

code = code.replace(
  'const [generalFundTransactions, setGeneralFundTransactions] = useState<GeneralFundTransaction[]>([]);',
  'const [generalFundTransactions, setGeneralFundTransactions] = useState<GeneralFundTransaction[]>([]);'
);

fs.writeFileSync('src/components/AdminSettings.tsx', code);
