const fs = require('fs');
let code = fs.readFileSync('src/components/CompetitionResultsModal.tsx', 'utf8');

code = code.replace(
  'const [results, setResults] = useState<CompetitionResult[]>(competition.results || []);',
  `const [results, setResults] = useState<CompetitionResult[]>(competition.results || []);
  const [teamPlacement, setTeamPlacement] = useState<string>(competition.teamPlacement || '');
  const [teamMedals, setTeamMedals] = useState<string>(competition.teamMedals || '');`
);

const saveReplacement = `        if (compIndex >= 0) {
          list[compIndex].results = validResults;
          list[compIndex].teamPlacement = teamPlacement;
          list[compIndex].teamMedals = teamMedals;
          localStorage.setItem("axotic_mock_competitions", JSON.stringify(list));`;
          
code = code.replace(
  `        if (compIndex >= 0) {
          list[compIndex].results = validResults;
          localStorage.setItem("axotic_mock_competitions", JSON.stringify(list));`,
  saveReplacement
);

const fbSaveReplacement = `      try {
        await updateDoc(doc(db, "competitions", competition.id), {
          results: validResults,
          teamPlacement,
          teamMedals
        });`;

code = code.replace(
  `      try {
        await updateDoc(doc(db, "competitions", competition.id), {
          results: validResults
        });`,
  fbSaveReplacement
);

const inputsReplacement = `        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950">
          <div className="space-y-6">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Trophy className="size-4 text-blue-500" /> Overall Team Performance
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Team Placement / Rank
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Place Overall"
                    value={teamPlacement}
                    onChange={(e) => setTeamPlacement(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Total Medals / Awards
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3 Gold, 1 Silver"
                    value={teamMedals}
                    onChange={(e) => setTeamMedals(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Individual Member Results
              </h3>`;

code = code.replace(
  `<div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950">
          <div className="space-y-4">`,
  inputsReplacement
);

code = code.replace(
  `<button
              onClick={handleAddResult}
              className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
            >
              <Plus className="size-4" /> Add Result
            </button>`,
  `<button
              onClick={handleAddResult}
              className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
            >
              <Plus className="size-4" /> Add Member Result
            </button>
            </div>`
);

fs.writeFileSync('src/components/CompetitionResultsModal.tsx', code);
console.log("Updated CompetitionResultsModal with team fields");
