const fs = require('fs');
let code = fs.readFileSync('src/components/CompetitionResultsModal.tsx', 'utf8');

code = code.replace(
  'const { isOfflineMode } = useWorkspaceSettings();',
  ''
);

code = code.replace(
  'if (isOfflineMode) {',
  'if (currentUser?.isOfflineMock) {'
);

fs.writeFileSync('src/components/CompetitionResultsModal.tsx', code);
console.log("Updated CompetitionResultsModal");
