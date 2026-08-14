const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

const treasuryContent = `
      {activeSubTab === "treasury" && (
        <div className="space-y-8 animate-fade-in text-left font-sans">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-50 dark:bg-emerald-950/20 p-4 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl">
            <div>
              <h3 className="text-base font-extrabold text-emerald-900 dark:text-emerald-100 uppercase font-mono tracking-tight flex items-center gap-2">
                <Banknote className="size-5 text-emerald-600 dark:text-emerald-500" /> General Fund & Treasury
              </h3>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                Manage global team treasury funds, direct deposits, grants, and withdrawals independent of specific projects.
              </p>
            </div>
          </div>

          {/* Add Funds Form */}
          <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Record Transaction</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">Type</label>
                <select
                  value={newFundType}
                  onChange={(e) => setNewFundType(e.target.value as "deposit" | "withdrawal")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-mono outline-hidden dark:text-white"
                >
                  <option value="deposit">Deposit (In)</option>
                  <option value="withdrawal">Withdrawal (Out)</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">Amount (LKR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newFundAmount}
                  onChange={(e) => setNewFundAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-mono outline-hidden text-right dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">Description</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFundNotes}
                    onChange={(e) => setNewFundNotes(e.target.value)}
                    placeholder="e.g. University Grant, Alumni Donation..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-mono outline-hidden dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddFundTransaction}
                    disabled={loading}
                    className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10.5px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer"
                  >
                    {loading ? "..." : "Record"}
                  </button>
                </div>
              </div>
            </div>
            {successMsg && <div className="text-xs font-bold text-emerald-600 animate-fade-in">{successMsg}</div>}
            {errorMsg && <div className="text-xs font-bold text-red-500 animate-fade-in">{errorMsg}</div>}
          </div>

          {/* Ledger Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="size-4 opacity-50" />
                Ledger History
              </h4>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Available General Fund Balance</span>
                <span className="font-mono text-lg font-black text-emerald-700 dark:text-emerald-400">
                  LKR {generalFundTransactions.reduce((sum, tx) => sum + (tx.type === "deposit" ? tx.amount : -tx.amount), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            
            {generalFundTransactions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm font-mono italic">
                No general fund transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] tracking-wider select-none">
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Amount (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {generalFundTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-mono text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <span className={\`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase \${
                            tx.type === "deposit"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }\`}>
                            {tx.type === "deposit" ? "+" : "-"} {tx.type}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                          {tx.notes}
                        </td>
                        <td className={\`p-3 text-right font-mono font-bold whitespace-nowrap \${
                          tx.type === "deposit" 
                            ? "text-emerald-600 dark:text-emerald-400" 
                            : "text-amber-600 dark:text-amber-400"
                        }\`}>
                          {tx.type === "deposit" ? "+" : "-"} {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
`;

code = code.replace(/\{activeSubTab === "public_page" && publicPageData && \(/, treasuryContent + '\n      {activeSubTab === "public_page" && publicPageData && (');
fs.writeFileSync('src/components/AdminSettings.tsx', code);
