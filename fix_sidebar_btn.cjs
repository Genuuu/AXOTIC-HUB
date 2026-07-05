const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// I want to use a nice button, maybe PanelLeftClose and PanelLeft
// Let's add PanelLeftClose, PanelLeftOpen to imports
content = content.replace(
  `ChevronRight,`,
  `ChevronRight, PanelLeftClose, PanelLeftOpen,`
);

const oldBtn = `            {/* Collapse Toggle Button */}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-16 rounded-r-xl bg-slate-800/90 border border-l-0 border-slate-700 text-slate-500 hover:text-white flex items-center justify-center z-50 hidden md:flex hover:w-5 transition-all shadow-md group backdrop-blur-sm cursor-pointer"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <ChevronRight className={\`size-3.5 transition-transform duration-300 \$\{isSidebarCollapsed ? "rotate-180" : ""\}\`} />
            </button>`;

const newBtn = `            {/* Collapse Toggle Button */}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-12 rounded-r-md bg-slate-800 border border-l-0 border-slate-700 text-slate-400 hover:text-white flex items-center justify-center z-50 hidden md:flex hover:w-5 transition-all shadow-md group cursor-pointer"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="size-3 transition-transform duration-300 group-hover:scale-110" />
              ) : (
                <PanelLeftClose className="size-3 transition-transform duration-300 group-hover:scale-110" />
              )}
            </button>`;

content = content.replace(oldBtn, newBtn);

fs.writeFileSync('src/App.tsx', content);
