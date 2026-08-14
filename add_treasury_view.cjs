const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

const newTabContent = `
        {/* Treasury / General Fund Management */}
        {activeSubTab === "treasury" && currentUser?.role === "admin" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 uppercase tracking-wider flex items-center gap-2">
                <Banknote className="size-4 text-emerald-500" />
                General Fund & Treasury
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Add money to the global team treasury. This balance is used to pay for collective team expenses and items logged as "General Fund" in project ledgers.
              </p>
              
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-xl mb-6">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold uppercase tracking-wider mb-1">
                  Available General Fund Balance
                </div>
                <div className="text-3xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  LKR {generalFundTransactions.reduce((acc, t) => acc + (t.type === "deposit" ? t.amount : -t.amount), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Record New Transaction</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <select
                    className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white"
                    value={newFundType}
                    onChange={(e) => setNewFundType(e.target.value as "deposit" | "withdrawal")}
                  >
                    <option value="deposit">Deposit (Add Funds)</option>
                    <option value="withdrawal">Withdrawal (Remove Funds)</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Amount (LKR)"
                    min="1"
                    className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white font-mono"
                    value={newFundAmount}
                    onChange={(e) => setNewFundAmount(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Description / Source"
                    className="w-full md:col-span-2 text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white"
                    value={newFundNotes}
                    onChange={(e) => setNewFundNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleAddFundTransaction}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    Save Transaction
                  </button>
                </div>
              </div>

              <div className="mt-8">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Transaction History</h4>
                {generalFundTransactions.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 text-center bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    No transactions recorded yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-32">Date</th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-24">Type</th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Amount (LKR)</th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {generalFundTransactions.map((t, idx) => (
                          <tr key={t.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                            <td className="p-3 font-mono text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                            <td className="p-3">
                              <span className={\`text-[9px] uppercase font-bold px-2 py-1 rounded \${
                                t.type === "deposit" 
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                                  : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                              }\`}>
                                {t.type}
                              </span>
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">{t.notes}</td>
                            <td className={\`p-3 font-mono font-bold text-right \${
                              t.type === "deposit" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            }\`}>
                              {t.type === "deposit" ? "+" : "-"}{t.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteFundTransaction(t.id)}
                                className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="size-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
`;

code = code.replace(
  '{/* Profile Preferences Tab */}',
  newTabContent + '\n        {/* Profile Preferences Tab */}'
);

fs.writeFileSync('src/components/AdminSettings.tsx', code);
