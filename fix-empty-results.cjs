const fs = require('fs');
let code = fs.readFileSync('src/components/CompetitionsHub.tsx', 'utf8');

code = code.replace(
  `}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-sans italic p-3 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-lg border border-dashed border-slate-100 dark:border-slate-900/60">
                          No results recorded yet.
                        </p>
                      )}`,
  `}
                        </div>
                      ) : (!comp.teamPlacement && !comp.teamMedals) ? (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-sans italic p-3 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-lg border border-dashed border-slate-100 dark:border-slate-900/60">
                          No results recorded yet.
                        </p>
                      ) : null}
`
);

fs.writeFileSync('src/components/CompetitionsHub.tsx', code);
console.log("Fixed empty results check.");
