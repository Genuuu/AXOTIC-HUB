const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

const newCases = `
                } else if (log.action === "INVENTORY_ADDED" || log.action === "INVENTORY_UPDATED") {
                  actionColor = "bg-teal-50 text-teal-700 border-teal-100";
                  actionBadge = log.action === "INVENTORY_ADDED" ? "Parts Registry" : "Parts Updated";
                  actionIcon = <Layers className="size-4" />;
                } else if (log.action === "INVENTORY_DELETED") {
                  actionColor = "bg-rose-50 text-rose-700 border-rose-100";
                  actionBadge = "Parts Deleted";
                  actionIcon = <Trash2 className="size-4" />;
                } else if (log.action === "HARDWARE_ALLOCATED" || log.action === "HARDWARE_SALVAGED") {
                  actionColor = "bg-cyan-50 text-cyan-700 border-cyan-100";
                  actionBadge = log.action === "HARDWARE_ALLOCATED" ? "Checkout" : "Salvaged";
                  actionIcon = <PackageOpen className="size-4" />;
                } else if (log.action === "PROJECT_CREATED" || log.action === "PROJECT_LOG_ADDED") {
                  actionColor = "bg-blue-50 text-blue-700 border-blue-100";
                  actionBadge = log.action === "PROJECT_CREATED" ? "Project Init" : "Log Entry";
                  actionIcon = <Compass className="size-4" />;
                } else if (log.action === "PROJECT_DELETED") {
                  actionColor = "bg-rose-50 text-rose-700 border-rose-100";
                  actionBadge = "Project Deleted";
                  actionIcon = <Trash2 className="size-4" />;
                } else if (log.action === "IDEA_CREATED" || log.action === "IDEA_UPDATED") {
                  actionColor = "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100";
                  actionBadge = log.action === "IDEA_CREATED" ? "Idea Pitched" : "Idea Updated";
                  actionIcon = <Lightbulb className="size-4" />;
                } else if (log.action === "IDEA_DELETED") {
                  actionColor = "bg-rose-50 text-rose-700 border-rose-100";
                  actionBadge = "Idea Deleted";
                  actionIcon = <Trash2 className="size-4" />;
                } else if (log.action === "competition_added" || log.action === "competition_updated") {
                  actionColor = "bg-orange-50 text-orange-700 border-orange-100";
                  actionBadge = "Competition";
                  actionIcon = <Trophy className="size-4" />;
                }
`;

code = code.replace(
  /} else if \(log.action === "WORKSPACE_CONFIG"\) {/,
  newCases.trim() + '\n                } else if (log.action === "WORKSPACE_CONFIG") {'
);

// add icons imports
code = code.replace(
  'FileCode, ShieldOff, Search',
  'FileCode, ShieldOff, Search, PackageOpen, Lightbulb, Compass, Layers, Trophy, Trash2'
);

fs.writeFileSync('src/components/AdminSettings.tsx', code);
