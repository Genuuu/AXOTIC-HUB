const fs = require('fs');
let code = fs.readFileSync('src/components/CompetitionsHub.tsx', 'utf8');

const regex = /\{\(currentUser\.role === "admin" \|\| currentUser\.uid === comp\.createdBy\) && \(\s*<button\s*onClick=\{\(\) => setResultsModalComp\(comp\)\}\s*className="text-\[10px\] text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1 cursor-pointer"\s*>\s*<span>Manage Results<\/span>\s*<\/button>\s*\)\}\s*<\/div>\s*\{comp\.results && comp\.results\.length > 0 \? \(/;

const replacement = `{(currentUser.role === "admin" || currentUser.uid === comp.createdBy || (comp.registeredUserIds || []).includes(currentUser.uid)) && (
                          <button
                            onClick={() => setResultsModalComp(comp)}
                            className="text-[10px] text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span>Manage Results</span>
                          </button>
                        )}
                      </div>
                      
                      {(comp.teamPlacement || comp.teamMedals) && (
                        <div className="flex flex-col gap-2 p-3 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/10 dark:to-amber-900/5 border border-amber-200/50 dark:border-amber-800/30 rounded-xl mb-3">
                          {comp.teamPlacement && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-amber-700/70 dark:text-amber-500/70 uppercase tracking-wider">Overall Placement</span>
                              <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-display">{comp.teamPlacement}</span>
                            </div>
                          )}
                          {comp.teamMedals && (
                            <div className="flex items-center justify-between border-t border-amber-200/30 dark:border-amber-800/30 pt-2 mt-1">
                              <span className="text-[10px] font-bold text-amber-700/70 dark:text-amber-500/70 uppercase tracking-wider">Total Awards</span>
                              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-200/50 dark:bg-amber-800/50 px-2 py-0.5 rounded-md">{comp.teamMedals}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {comp.results && comp.results.length > 0 ? (`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/CompetitionsHub.tsx', code);
    console.log("Updated CompetitionsHub successfully.");
} else {
    console.log("Regex didn't match.");
}
