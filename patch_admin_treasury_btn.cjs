const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

const publicPageBtn = `          <button
            type="button"
            onClick={() => setActiveSubTab("public_page")}
            className={\`shrink-0 px-3.5 py-2 text-[10.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 \${
              activeSubTab === "public_page"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-950"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
            }\`}
            id="btn-subnav-publicpage"
          >
            <Globe className="size-3.5 opacity-80" /> <span className="hidden sm:inline">Public Portal</span>
          </button>`;

const treasuryBtn = `          <button
            type="button"
            onClick={() => setActiveSubTab("treasury")}
            className={\`shrink-0 px-3.5 py-2 text-[10.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 \${
              activeSubTab === "treasury"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700/50"
            }\`}
            id="btn-subnav-treasury"
          >
            <Banknote className="size-3.5 opacity-80" /> <span className="hidden sm:inline">General Fund</span>
          </button>`;

code = code.replace(publicPageBtn, publicPageBtn + '\n' + treasuryBtn);
fs.writeFileSync('src/components/AdminSettings.tsx', code);
