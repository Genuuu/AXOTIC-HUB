const fs = require('fs');
let code = fs.readFileSync('src/components/HomeDashboard.tsx', 'utf8');

// 1. Add setDoc to firebase/firestore import
code = code.replace(
  'import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";',
  'import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc } from "firebase/firestore";'
);

// 2. Add GeneralFundTransaction to types import
code = code.replace(
  'import { UserProfile, Project, ProjectLog, InventoryItem, ProjectStatus, AllocatedHardware, Competition } from "../types";',
  'import { UserProfile, Project, ProjectLog, InventoryItem, ProjectStatus, AllocatedHardware, Competition, GeneralFundTransaction } from "../types";'
);

// 3. Add modal state variables inside HomeDashboard
const stateInjection = `  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const { generalFundTransactions } = useWorkspaceSettings(currentUser.isOfflineMock);
  
  // Add Fund Modal State
  const [showAddFundModal, setShowAddFundModal] = useState(false);
  const [newFundAmount, setNewFundAmount] = useState("");
  const [newFundType, setNewFundType] = useState<"deposit" | "withdrawal">("deposit");
  const [newFundNotes, setNewFundNotes] = useState("");
  const [fundLoading, setFundLoading] = useState(false);

  const handleAddFundTransaction = async () => {
    if (!currentUser || currentUser.role !== "admin") return;
    const amount = parseFloat(newFundAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!newFundNotes.trim()) {
      alert("Please enter a description for the transaction.");
      return;
    }

    const newTx: GeneralFundTransaction = {
      id: "tx-" + Date.now(),
      amount,
      type: newFundType,
      notes: newFundNotes.trim(),
      date: new Date().toISOString(),
      recordedBy: currentUser.uid
    };

    const nextTx = [newTx, ...generalFundTransactions];

    if (currentUser.isOfflineMock) {
      const stored = localStorage.getItem("axotic_mock_general_settings");
      let parsed = stored ? JSON.parse(stored) : {};
      parsed.generalFundTransactions = nextTx;
      localStorage.setItem("axotic_mock_general_settings", JSON.stringify(parsed));
      setNewFundAmount("");
      setNewFundNotes("");
      setShowAddFundModal(false);
      window.dispatchEvent(new Event("axotic_db_update"));
      return;
    }

    setFundLoading(true);
    try {
      await updateDoc(doc(db, "settings", "general"), {
        generalFundTransactions: nextTx
      });
      setNewFundAmount("");
      setNewFundNotes("");
      setShowAddFundModal(false);
    } catch (err) {
      try {
        await setDoc(doc(db, "settings", "general"), { generalFundTransactions: nextTx }, { merge: true });
        setNewFundAmount("");
        setNewFundNotes("");
        setShowAddFundModal(false);
      } catch (innerErr) {
        handleFirestoreError(innerErr, OperationType.WRITE, "settings/general");
        alert("Failed to add transaction.");
      }
    } finally {
      setFundLoading(false);
    }
  };
`;

code = code.replace(
  '  const [competitions, setCompetitions] = useState<Competition[]>([]);\n  const { generalFundTransactions } = useWorkspaceSettings(currentUser.isOfflineMock);',
  stateInjection
);

// 4. Update the chart header with the button
const headerOld = `            <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">\n              <TrendingUp className="size-4 text-emerald-600 animate-pulse" />\n              Treasury Balance (30 Days)\n            </h3>`;
const headerNew = `            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <TrendingUp className="size-4 text-emerald-600 animate-pulse" />
                Treasury Balance (30 Days)
              </h3>
              {currentUser.role === "admin" && (
                <button 
                  onClick={() => setShowAddFundModal(true)}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] px-2 py-1 rounded font-bold uppercase transition-colors cursor-pointer"
                >
                  + Add Funds
                </button>
              )}
            </div>`;
code = code.replace(headerOld, headerNew);


// 5. Inject the modal into the render output at the very end
const modalCode = `
      {/* Add Funds Modal */}
      {showAddFundModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-800 text-sm">Add Treasury Funds</h3>
              <button 
                onClick={() => setShowAddFundModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="size-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Transaction Type</label>
                <div className="flex rounded-lg overflow-hidden border border-slate-200 p-0.5 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setNewFundType("deposit")}
                    className={\`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all \${
                      newFundType === "deposit" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }\`}
                  >
                    Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFundType("withdrawal")}
                    className={\`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all \${
                      newFundType === "withdrawal" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }\`}
                  >
                    Withdrawal
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount (LKR)</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm outline-hidden font-medium"
                  value={newFundAmount}
                  onChange={(e) => setNewFundAmount(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Description</label>
                <input
                  type="text"
                  placeholder="e.g. University Grant"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm outline-hidden font-medium"
                  value={newFundNotes}
                  onChange={(e) => setNewFundNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setShowAddFundModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFundTransaction}
                disabled={fundLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                {fundLoading ? "Saving..." : "Record Transaction"}
              </button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(
  '    </div>\n  );\n}\n',
  '    </div>\n' + modalCode + '\n  );\n}\n'
);

fs.writeFileSync('src/components/HomeDashboard.tsx', code);
