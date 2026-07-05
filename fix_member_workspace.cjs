const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  `              <div className={\`text-[10px] uppercase tracking-widest text-slate-500 font-bold px-2.5 mb-2 hidden md:block \$\{isSidebarCollapsed ? "opacity-0 invisible" : "opacity-100 visible"\} transition-all\`}>\n                Member Workspace\n              </div>`,
  `              {!isSidebarCollapsed && <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-2.5 mb-2 hidden md:block animate-fade-in">\n                Member Workspace\n              </div>}`
);

fs.writeFileSync('src/App.tsx', content);
