const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  `<div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row font-sans transition-all duration-500 ease-in-out antialiased selection:bg-blue-100 dark:selection:bg-blue-900 selection:text-blue-950 dark:selection:text-blue-100">`,
  `<div className={\`\$\{currentUser ? "h-screen overflow-hidden" : "min-h-screen"\} bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row font-sans transition-all duration-500 ease-in-out antialiased selection:bg-blue-100 dark:selection:bg-blue-900 selection:text-blue-950 dark:selection:text-blue-100\`}>`
);

content = content.replace(
  `<div id="secure-hub-context-shell" className="flex-1 flex flex-col md:flex-row min-h-screen w-full">`,
  `<div id="secure-hub-context-shell" className="flex-1 flex flex-col md:flex-row h-full w-full">`
);

content = content.replace(
  `          {/* Main workspace frame on right */}\n          <div className="flex-1 flex flex-col min-w-0">`,
  `          {/* Main workspace frame on right */}\n          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">`
);

// Sidebar button
const oldButton = `            {/* Collapse Toggle Button */}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 size-6 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center z-50 hidden md:flex transition-transform hover:scale-110 shadow-sm"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <ChevronRight className={\`size-3 transition-transform duration-300 \$\{isSidebarCollapsed ? "" : "rotate-180"\}\`} />
            </button>`;

const newButton = `            {/* Collapse Toggle Button */}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-16 rounded-r-xl bg-slate-800/90 border border-l-0 border-slate-700 text-slate-500 hover:text-white flex items-center justify-center z-50 hidden md:flex hover:w-5 transition-all shadow-md group backdrop-blur-sm cursor-pointer"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <ChevronRight className={\`size-3.5 transition-transform duration-300 \$\{isSidebarCollapsed ? "" : "rotate-180"\}\`} />
            </button>`;

content = content.replace(oldButton, newButton);

fs.writeFileSync('src/App.tsx', content);
