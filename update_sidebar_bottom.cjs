const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Edit Profile
content = content.replace(
  `<Settings className="size-3.5" /> Edit Profile`,
  `<Settings className="size-3.5 shrink-0" /> {!isSidebarCollapsed && <span className="truncate">Edit Profile</span>}`
);

// Log Out Workspace
content = content.replace(
  `<LogOut className="size-3.5" /> Log Out Workspace`,
  `<LogOut className="size-3.5 shrink-0" /> {!isSidebarCollapsed && <span className="truncate">Log Out Workspace</span>}`
);

// Version footer
content = content.replace(
  `              {/* Version & Copyright Footer */}\n              <div className="pt-4 pb-2 text-center flex flex-col space-y-1">\n                <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">AXOTIC HUB V1.0</span>\n                <span className="text-[8px] text-slate-600 font-sans tracking-wide">&copy; All rights reserved TEAM AXOTIC</span>\n              </div>`,
  `              {/* Version & Copyright Footer */}\n              <div className={\`pt-4 pb-2 text-center flex flex-col space-y-1 \$\{isSidebarCollapsed ? "hidden" : "flex"\}\`}>\n                <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">AXOTIC HUB V1.0</span>\n                <span className="text-[8px] text-slate-600 font-sans tracking-wide">&copy; All rights reserved TEAM AXOTIC</span>\n              </div>`
);

fs.writeFileSync('src/App.tsx', content);
