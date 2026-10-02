const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

code = code.replace(
  '} else if (log.action === "competition_added" || log.action === "competition_updated") {\n                  actionColor = "bg-orange-50 text-orange-700 border-orange-100";\n                  actionBadge = "Competition";\n                  actionIcon = <Trophy className="size-4" />;\n                }\n                } else if (log.action === "WORKSPACE_CONFIG") {',
  '} else if (log.action === "competition_added" || log.action === "competition_updated") {\n                  actionColor = "bg-orange-50 text-orange-700 border-orange-100";\n                  actionBadge = "Competition";\n                  actionIcon = <Trophy className="size-4" />;\n                } else if (log.action === "WORKSPACE_CONFIG") {'
);

fs.writeFileSync('src/components/AdminSettings.tsx', code);
