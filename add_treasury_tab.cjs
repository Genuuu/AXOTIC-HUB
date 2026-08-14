const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

code = code.replace(
  'const [activeSubTab, setActiveSubTab] = useState<"general" | "onboard" | "logs" | "preferences" | "public_page">(() => {',
  'const [activeSubTab, setActiveSubTab] = useState<"general" | "onboard" | "logs" | "preferences" | "public_page" | "treasury">(() => {'
);

const newTabBtn = `
          {currentUser?.role === "admin" && (
            <button
              onClick={() => setActiveSubTab("treasury")}
              className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap \${
                activeSubTab === "treasury" 
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              }\`}
            >
              <Banknote className="size-4" />
              General Fund
            </button>
          )}`;

code = code.replace(
  `            onClick={() => setActiveSubTab("public_page")}
            className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap \${
              activeSubTab === "public_page" 
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm" 
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            }\`}
          >
            <Globe className="size-4" />
            Public Page
          </button>
        )}`,
  `            onClick={() => setActiveSubTab("public_page")}
            className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap \${
              activeSubTab === "public_page" 
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm" 
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            }\`}
          >
            <Globe className="size-4" />
            Public Page
          </button>
        )}
        ${newTabBtn}`
);

fs.writeFileSync('src/components/AdminSettings.tsx', code);
