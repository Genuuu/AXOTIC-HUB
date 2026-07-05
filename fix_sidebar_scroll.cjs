const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  `md:border-slate-800/80 md:shadow-[4px_0_24px_rgba(0,0,0,0.1)] flex flex-col justify-between shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`,
  `md:border-slate-800/80 md:shadow-[4px_0_24px_rgba(0,0,0,0.1)] flex flex-col justify-between shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] h-full overflow-y-auto no-scrollbar`
);

fs.writeFileSync('src/App.tsx', content);
