const fs = require('fs');

let content = fs.readFileSync('src/components/PublicLanding.tsx', 'utf-8');

// Colors replacement map
const replacements = [
  ['bg-slate-50/80', 'bg-slate-50/80 dark:bg-slate-900/80'],
  ['bg-white/70', 'bg-white/70 dark:bg-slate-900/70'],
  ['bg-white ', 'bg-white dark:bg-slate-900 '],
  ['bg-white"', 'bg-white dark:bg-slate-900"'],
  ['text-slate-800', 'text-slate-800 dark:text-slate-200'],
  ['text-slate-600', 'text-slate-600 dark:text-slate-300'],
  ['text-slate-500', 'text-slate-500 dark:text-slate-400'],
  ['bg-slate-50 ', 'bg-slate-50 dark:bg-slate-800 '],
  ['border-[#0f2e46]/20', 'border-[#0f2e46]/20 dark:border-white/20'],
  ['border-slate-200/80', 'border-slate-200/80 dark:border-slate-700/80'],
  ['border-slate-200/60', 'border-slate-200/60 dark:border-slate-700/60'],
  ['border-slate-200/40', 'border-slate-200/40 dark:border-slate-700/40'],
  ['border-slate-200/70', 'border-slate-200/70 dark:border-slate-700/70'],
  ['border-slate-200"', 'border-slate-200 dark:border-slate-700"'],
  ['border-slate-200 ', 'border-slate-200 dark:border-slate-700 '],
  ['border-slate-100/80', 'border-slate-100/80 dark:border-slate-800/80'],
  ['from-white', 'from-white dark:from-slate-900'],
  ['to-slate-50/50', 'to-slate-50/50 dark:to-slate-800/50'],
  ['border-slate-150', 'border-slate-200 dark:border-slate-700'],
  ['bg-slate-100/50', 'bg-slate-100/50 dark:bg-slate-800/50'],
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync('src/components/PublicLanding.tsx', content);
