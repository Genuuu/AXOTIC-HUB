const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Add state
content = content.replace(
  `  const [showUserPopover, setShowUserPopover] = useState(false);`,
  `  const [showUserPopover, setShowUserPopover] = useState(false);\n  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);`
);

// Update aside className
content = content.replace(
  `          {/* Side navigation for desktop / top header for mobile */}\n          <aside id="secured-hub-sidebar" className="sticky top-0 z-40 w-full md:w-64 bg-slate-900/85 backdrop-blur-md border-b border-slate-800 md:relative md:bg-slate-900 md:backdrop-blur-none md:border-b-0 md:border-r flex flex-col justify-between shrink-0 transition-all duration-300">`,
  `          {/* Side navigation for desktop / top header for mobile */}\n          <aside id="secured-hub-sidebar" className={\`sticky top-0 z-40 w-full \$\{isSidebarCollapsed ? "md:w-16" : "md:w-64"\} bg-slate-900/85 backdrop-blur-md border-b border-slate-800 md:relative md:bg-slate-900 md:backdrop-blur-none md:border-b-0 md:border-r md:border-slate-800/80 md:shadow-[4px_0_24px_rgba(0,0,0,0.1)] flex flex-col justify-between shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]\`}>\n            {/* Collapse Toggle Button */}\n            <button \n              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}\n              className="absolute -right-3 top-1/2 -translate-y-1/2 size-6 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center z-50 hidden md:flex transition-transform hover:scale-110 shadow-sm"\n              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}\n            >\n              <ChevronRight className={\`size-3 transition-transform duration-300 \$\{isSidebarCollapsed ? "" : "rotate-180"\}\`} />\n            </button>`
);

// We need to hide text in the top logo when collapsed
content = content.replace(
  `                  <h1 className="font-display font-bold text-sm tracking-tight text-white flex items-center gap-1.5 uppercase">\n                    AXOTIC <span className="text-blue-400">HUB</span>\n                  </h1>`,
  `                  {!isSidebarCollapsed && <h1 className="font-display font-bold text-sm tracking-tight text-white flex items-center gap-1.5 uppercase animate-fade-in">\n                    AXOTIC <span className="text-blue-400">HUB</span>\n                  </h1>}`
);

// We need to adjust connection status
content = content.replace(
  `                  {currentUser?.isOfflineMock ? (\n                    <div className="flex items-center gap-1 text-[9px] font-mono text-amber-400">\n                      <span>SANDBOX CONNECT</span>\n                      <span className="size-1.5 bg-amber-500 rounded-full animate-pulse" />\n                    </div>\n                  ) : (\n                    <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400">\n                      <span>LIVE CONNECTIVITY</span>\n                      <span className="size-1.5 bg-emerald-500 rounded-full animate-ping" />\n                    </div>\n                  )}`,
  `                  {!isSidebarCollapsed && (currentUser?.isOfflineMock ? (\n                    <div className="flex items-center gap-1 text-[9px] font-mono text-amber-400 animate-fade-in">\n                      <span>SANDBOX CONNECT</span>\n                      <span className="size-1.5 bg-amber-500 rounded-full animate-pulse shrink-0" />\n                    </div>\n                  ) : (\n                    <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400 animate-fade-in">\n                      <span>LIVE CONNECTIVITY</span>\n                      <span className="size-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />\n                    </div>\n                  ))}`
);


fs.writeFileSync('src/App.tsx', content);
