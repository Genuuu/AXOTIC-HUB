const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

const newOptions = `
                <option value="ALL">All Event Types</option>
                <option value="MEMBER_ONBOARDED">Onboarded Members</option>
                <option value="USER_OVERRIDE">Role Overrides</option>
                <option value="USER_DISMISSED">Roster Dismissals</option>
                
                {/* Inventory & Logistics */}
                <option value="INVENTORY_ADDED">Parts Registered</option>
                <option value="INVENTORY_UPDATED">Parts Updated</option>
                <option value="INVENTORY_DELETED">Parts Deleted</option>
                <option value="HARDWARE_ALLOCATED">Hardware Allocated</option>
                <option value="HARDWARE_SALVAGED">Hardware Salvaged</option>
                
                {/* Projects & Build Logs */}
                <option value="PROJECT_CREATED">Projects Initiated</option>
                <option value="PROJECT_DELETED">Projects Archived</option>
                <option value="PROJECT_LOG_ADDED">Project Logs Added</option>
                
                {/* Ideas & Brainstorming */}
                <option value="IDEA_CREATED">Ideas Pitched</option>
                <option value="IDEA_UPDATED">Idea Status Updates</option>
                <option value="IDEA_DELETED">Ideas Discarded</option>
                
                {/* Competitions */}
                <option value="competition_added">Competitions Created</option>
                <option value="competition_updated">Competitions Updated</option>

                {/* System Classifications */}
                <option value="CATEGORY_ADDED">Categories Registered</option>
                <option value="CATEGORY_DELETED">Categories Wiped</option>
                <option value="WORKSPACE_CONFIG">General Config Updates</option>
                <option value="AUDIT_PURGED">Audit Purges</option>
`;

code = code.replace(
  /<option value="ALL">All Event Types<\/option>[\s\S]*?<option value="AUDIT_PURGED">Audit Purges<\/option>/,
  newOptions.trim()
);

fs.writeFileSync('src/components/AdminSettings.tsx', code);
