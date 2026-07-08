const fs = require('fs');

let content = fs.readFileSync('src/components/PublicLanding.tsx', 'utf-8');

const replacements = [
  ['bg-slate-100 border-b border-slate-100', 'bg-slate-100 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800'],
  ['hover:bg-slate-100/50', 'hover:bg-slate-100/50 dark:hover:bg-slate-700/50'],
  ['hover:bg-slate-100 flex items-center', 'hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center']
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync('src/components/PublicLanding.tsx', content);
