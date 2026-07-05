const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Remove overflow from aside
content = content.replace(
  `h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`,
  `h-full`
);

// 2. Add overflow to nav
content = content.replace(
  `id="viewport-nav" className="hidden md:flex flex-1 p-4 space-y-1.5 flex-col justify-start text-left"`,
  `id="viewport-nav" className="hidden md:flex flex-1 p-4 space-y-1.5 flex-col justify-start text-left overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"`
);

// 3. Change button icon
// Currently it's: ChevronRight className={\`size-3.5 transition-transform duration-300 \$\{isSidebarCollapsed ? "" : "rotate-180"\}\`}
content = content.replace(
  `ChevronRight className={\`size-3.5 transition-transform duration-300 \$\{isSidebarCollapsed ? "" : "rotate-180"\}\`}`,
  `ChevronRight className={\`size-3.5 transition-transform duration-300 \$\{isSidebarCollapsed ? "rotate-180" : ""\}\`}` // Note: I might need to flip the logic depending on what it was. Wait, let's use PanelLeftClose / PanelLeftOpen. 
);

fs.writeFileSync('src/App.tsx', content);
