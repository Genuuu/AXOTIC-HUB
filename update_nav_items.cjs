const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Hide the "Member Workspace"
content = content.replace(
  `              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-2.5 mb-2 hidden md:block">
                Member Workspace
              </div>`,
  `              <div className={\`text-[10px] uppercase tracking-widest text-slate-500 font-bold px-2.5 mb-2 hidden md:block \$\{isSidebarCollapsed ? "opacity-0 invisible" : "opacity-100 visible"\} transition-all\`}>
                Member Workspace
              </div>`
);

// We need to span-wrap text elements to conditionally hide them.
// Let's replace the nav button contents.
// Home
content = content.replace(
  `<LayoutGrid className="size-4" /> Home Dashboard`,
  `<LayoutGrid className="size-4 shrink-0" /> {!isSidebarCollapsed && <span className="truncate">Home Dashboard</span>}`
);
// Projects
content = content.replace(
  `<Cpu className="size-4" /> Project Workspace`,
  `<Cpu className="size-4 shrink-0" /> {!isSidebarCollapsed && <span className="truncate">Project Workspace</span>}`
);
// Ideas
content = content.replace(
  `<Zap className="size-4" /> Ideas Board`,
  `<Zap className="size-4 shrink-0" /> {!isSidebarCollapsed && <span className="truncate">Ideas Board</span>}`
);
// Inventory
content = content.replace(
  `<Boxes className="size-4" /> Stockroom Inventory`,
  `<Boxes className="size-4 shrink-0" /> {!isSidebarCollapsed && <span className="truncate">Stockroom Inventory</span>}`
);
// Members
content = content.replace(
  `<Users className="size-4" /> Members`,
  `<Users className="size-4 shrink-0" /> {!isSidebarCollapsed && <span className="truncate">Members</span>}`
);
// Competitions
content = content.replace(
  `<Trophy className="size-4" /> Competitions`,
  `<Trophy className="size-4 shrink-0" /> {!isSidebarCollapsed && <span className="truncate">Competitions</span>}`
);
// Settings
content = content.replace(
  `<Settings className="size-4" /> {effectiveUser?.role === "admin" ? "System Settings" : "Preferences & Theme"}`,
  `<Settings className="size-4 shrink-0" /> {!isSidebarCollapsed && <span className="truncate">{effectiveUser?.role === "admin" ? "System Settings" : "Preferences & Theme"}</span>}`
);

// We also need to hide the profile widget details when collapsed
content = content.replace(
  `              <div className="flex items-center gap-3">\n                <img\n                  referrerPolicy="no-referrer"\n                  src={effectiveUser.avatarUrl || undefined}\n                  alt={effectiveUser.displayName}\n                  className="size-9 rounded-lg border border-slate-700 shadow-xs shrink-0"\n                />`,
  `              <div className={\`flex items-center \$\{isSidebarCollapsed ? "justify-center" : "gap-3"\}\`}>\n                <img\n                  referrerPolicy="no-referrer"\n                  src={effectiveUser.avatarUrl || undefined}\n                  alt={effectiveUser.displayName}\n                  className="size-9 rounded-lg border border-slate-700 shadow-xs shrink-0"\n                />`
);

content = content.replace(
  `                <div className="flex-1 min-w-0">\n                  <p className="text-xs font-bold text-white truncate">{effectiveUser.displayName}</p>\n                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">\n                    {effectiveUser.role === "admin" ? <Lock className="size-3 text-red-400" /> : <UserCircle className="size-3" />}\n                    {effectiveUser.role === "admin" ? "System Admin" : "Team Member"}\n                  </p>\n                </div>\n              </div>`,
  `                {!isSidebarCollapsed && <div className="flex-1 min-w-0 animate-fade-in">\n                  <p className="text-xs font-bold text-white truncate">{effectiveUser.displayName}</p>\n                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">\n                    {effectiveUser.role === "admin" ? <Lock className="size-3 text-red-400" /> : <UserCircle className="size-3" />}\n                    {effectiveUser.role === "admin" ? "System Admin" : "Team Member"}\n                  </p>\n                </div>}\n              </div>`
);

fs.writeFileSync('src/App.tsx', content);
