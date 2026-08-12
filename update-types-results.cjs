const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

// Update Competition status
code = code.replace(
  'status?: "scheduled" | "postponed" | "cancelled";',
  'status?: "scheduled" | "postponed" | "cancelled" | "finished";'
);

// Add CompetitionResult interface and update Competition
const competitionResultInterface = `export interface CompetitionResult {
  memberId: string;
  placement: string;
  award?: string;
  notes?: string;
}

export interface Competition {`;

code = code.replace('export interface Competition {', competitionResultInterface);

const resultsField = `  registeredUserIds: string[]; // array of userIds of team members registered to attend/participate
  status?: "scheduled" | "postponed" | "cancelled" | "finished";
  results?: CompetitionResult[];`;

code = code.replace(`  registeredUserIds: string[]; // array of userIds of team members registered to attend/participate
  status?: "scheduled" | "postponed" | "cancelled" | "finished";`, resultsField);

fs.writeFileSync('src/types.ts', code);
console.log("Updated types.ts");
