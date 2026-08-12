const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  'results?: CompetitionResult[];\n}',
  'results?: CompetitionResult[];\n  teamPlacement?: string;\n  teamMedals?: string;\n}'
);

fs.writeFileSync('src/types.ts', code);
console.log("Updated types.ts");
