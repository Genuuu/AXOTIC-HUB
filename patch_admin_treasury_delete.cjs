const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

// We need to add a 5th column for actions.
code = code.replace(
  '<th className="p-3 text-right">Amount (LKR)</th>\\n                    </tr>',
  '<th className="p-3 text-right">Amount (LKR)</th>\\n                      <th className="p-3 w-10"></th>\\n                    </tr>'
);

code = code.replace(
  '<td className={`p-3 text-right font-mono font-bold whitespace-nowrap ${\n                          tx.type === "deposit" \n                            ? "text-emerald-600 dark:text-emerald-400" \n                            : "text-amber-600 dark:text-amber-400"\n                        }`}>\n                          {tx.type === "deposit" ? "+" : "-"} {tx.amount.toLocaleString(\'en-US\', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n                        </td>\n                      </tr>',
  '<td className={`p-3 text-right font-mono font-bold whitespace-nowrap ${\n                          tx.type === "deposit" \n                            ? "text-emerald-600 dark:text-emerald-400" \n                            : "text-amber-600 dark:text-amber-400"\n                        }`}>\n                          {tx.type === "deposit" ? "+" : "-"} {tx.amount.toLocaleString(\'en-US\', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n                        </td>\n                        <td className="p-3 text-right">\n                          <button\n                            type="button"\n                            onClick={() => handleDeleteFundTransaction(tx.id)}\n                            className="text-slate-400 hover:text-red-500 transition-colors p-1"\n                            title="Delete transaction"\n                          >\n                            <Trash2 className="size-3.5" />\n                          </button>\n                        </td>\n                      </tr>'
);

fs.writeFileSync('src/components/AdminSettings.tsx', code);
