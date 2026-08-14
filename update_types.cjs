const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const newTypes = `
export interface GeneralFundTransaction {
  id: string;
  amount: number;
  type: "deposit" | "withdrawal";
  notes: string;
  date: string;
  recordedBy: string;
}
`;

code = code + newTypes;
fs.writeFileSync('src/types.ts', code);
