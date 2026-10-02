import React, { useState, useMemo } from 'react';
import { 
  Landmark, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Download, 
  Trash2, 
  ShieldCheck, 
  Lock, 
  Wallet, 
  TrendingUp, 
  PieChart, 
  Clock, 
  CheckCircle2, 
  X,
  FileSpreadsheet
} from 'lucide-react';
import { UserProfile, GeneralFundTransaction, CustomRole } from '../types';
import { hasPermission } from '../roleUtils';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface TreasuryHubProps {
  currentUser: UserProfile;
  generalFundTransactions: GeneralFundTransaction[];
  customRoles?: CustomRole[];
}

export const TreasuryHub: React.FC<TreasuryHubProps> = ({
  currentUser,
  generalFundTransactions = [],
  customRoles
}) => {
  const isAuthorized = hasPermission(currentUser, "manage_treasury", customRoles);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "deposit" | "withdrawal">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Record Modal / Form State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [txType, setTxType] = useState<"deposit" | "withdrawal">("deposit");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("Sponsorship");
  const [txNotes, setTxNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Calculate Metrics
  const { totalBalance, totalDeposits, totalExpenses, filteredTransactions, categoryBreakdown } = useMemo(() => {
    let deposits = 0;
    let expenses = 0;
    const catMap: Record<string, number> = {};

    generalFundTransactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === "deposit") {
        deposits += amt;
      } else {
        expenses += amt;
      }

      const cat = tx.notes ? tx.notes.split('-')[0].trim() : "General";
      catMap[cat] = (catMap[cat] || 0) + amt;
    });

    const balance = deposits - expenses;

    // Filter list
    const filtered = generalFundTransactions.filter(tx => {
      const matchesSearch = 
        tx.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === "all" || tx.type === typeFilter;
      const matchesCategory = categoryFilter === "all" || (tx.notes && tx.notes.toLowerCase().includes(categoryFilter.toLowerCase()));

      return matchesSearch && matchesType && matchesCategory;
    });

    // Sort newest first
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      totalBalance: balance,
      totalDeposits: deposits,
      totalExpenses: expenses,
      filteredTransactions: filtered,
      categoryBreakdown: catMap
    };
  }, [generalFundTransactions, searchTerm, typeFilter, categoryFilter]);

  // Handle Record Transaction
  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setErrorMsg("Unauthorized: You require Treasury Management clearance.");
      return;
    }

    const numericAmount = parseFloat(txAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg("Please enter a valid amount greater than LKR 0.00");
      return;
    }

    if (!txNotes.trim()) {
      setErrorMsg("Please provide a description or reference note.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const newTx: GeneralFundTransaction = {
      id: "tx-" + Date.now(),
      type: txType,
      amount: numericAmount,
      date: new Date().toISOString(),
      notes: `${txCategory} - ${txNotes.trim()}`,
      recordedBy: currentUser.displayName || currentUser.uid
    };

    try {
      if (currentUser.isOfflineMock) {
        const storedGen = localStorage.getItem("axotic_mock_general_settings");
        let p = storedGen ? JSON.parse(storedGen) : {};
        const currentTx: GeneralFundTransaction[] = Array.isArray(p.generalFundTransactions) ? p.generalFundTransactions : generalFundTransactions;
        const nextTx = [newTx, ...currentTx];
        p.generalFundTransactions = nextTx;
        localStorage.setItem("axotic_mock_general_settings", JSON.stringify(p));
        window.dispatchEvent(new Event("axotic_db_update"));
      } else {
        const docRef = doc(db, "settings", "general");
        const snap = await getDoc(docRef);
        let currentTx: GeneralFundTransaction[] = [];
        if (snap.exists() && snap.data()?.generalFundTransactions && Array.isArray(snap.data().generalFundTransactions)) {
          currentTx = snap.data().generalFundTransactions;
        } else {
          currentTx = generalFundTransactions;
        }
        const nextTx = [newTx, ...currentTx];
        await setDoc(docRef, { generalFundTransactions: nextTx }, { merge: true });
      }

      setSuccessMsg(`Successfully logged ${txType === "deposit" ? "deposit" : "expense"} of LKR ${numericAmount.toLocaleString()}.`);
      setTxAmount("");
      setTxNotes("");
      setIsRecordModalOpen(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to record treasury transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Transaction
  const handleDeleteTransaction = async (txId: string) => {
    if (!isAuthorized) {
      alert("Unauthorized: Only assigned Treasury Managers or Admins can void transaction entries.");
      return;
    }

    if (!window.confirm("Are you sure you want to void and delete this treasury ledger entry?")) return;

    try {
      if (currentUser.isOfflineMock) {
        const storedGen = localStorage.getItem("axotic_mock_general_settings");
        let p = storedGen ? JSON.parse(storedGen) : {};
        const currentTx: GeneralFundTransaction[] = Array.isArray(p.generalFundTransactions) ? p.generalFundTransactions : generalFundTransactions;
        const nextTx = currentTx.filter(t => t.id !== txId);
        p.generalFundTransactions = nextTx;
        localStorage.setItem("axotic_mock_general_settings", JSON.stringify(p));
        window.dispatchEvent(new Event("axotic_db_update"));
      } else {
        const docRef = doc(db, "settings", "general");
        const snap = await getDoc(docRef);
        let currentTx: GeneralFundTransaction[] = [];
        if (snap.exists() && snap.data()?.generalFundTransactions && Array.isArray(snap.data().generalFundTransactions)) {
          currentTx = snap.data().generalFundTransactions;
        } else {
          currentTx = generalFundTransactions;
        }
        const nextTx = currentTx.filter(t => t.id !== txId);
        await setDoc(docRef, { generalFundTransactions: nextTx }, { merge: true });
      }

      setSuccessMsg("Transaction successfully deleted from ledger.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert("Failed to delete transaction.");
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;
    
    const headers = ["Transaction ID", "Date", "Type", "Amount (LKR)", "Description & Category"];
    const rows = filteredTransactions.map(tx => [
      tx.id,
      new Date(tx.date).toLocaleDateString(),
      tx.type.toUpperCase(),
      tx.amount.toFixed(2),
      `"${(tx.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AXOTIC_Treasury_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in pb-12">
      {/* Top Banner & Treasury Status */}
      <div className="bg-slate-900 border border-slate-800 text-white p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 size-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 size-60 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
                <Landmark className="size-3" /> AXOTIC Financial Ledger
              </span>
              {isAuthorized ? (
                <span className="px-3 py-1 bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck className="size-3 text-blue-400" /> Treasury Clearance Granted
                </span>
              ) : (
                <span className="px-3 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Lock className="size-3" /> View Only Mode
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">
              General Fund & Team Treasury
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Global team financial reserve monitoring sponsorship funds, university grants, competition prize allocations, and hardware fabrication expenditures.
            </p>
          </div>

          {/* Quick Record Action Button */}
          {isAuthorized && (
            <button
              onClick={() => setIsRecordModalOpen(true)}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
            >
              <PlusCircle className="size-4" /> Record Transaction
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Financial Telemetry Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Available Reserve */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Net Reserve Balance</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Wallet className="size-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-700 dark:text-emerald-400">
            LKR {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-2 text-[10px] font-mono text-slate-400">
            {generalFundTransactions.length} total entries recorded
          </div>
        </div>

        {/* Total Deposits Inflow */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Total Inflow / Deposits</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <ArrowUpRight className="size-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-blue-600 dark:text-blue-400">
            LKR {totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-2 text-[10px] font-mono text-blue-500/80">
            Sponsorships, Grants & Prize Allocations
          </div>
        </div>

        {/* Total Expenses Outflow */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Total Outflow / Expenditures</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ArrowDownLeft className="size-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
            LKR {totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-2 text-[10px] font-mono text-amber-500/80">
            Hardware, Travel & Fabrication Costs
          </div>
        </div>
      </div>

      {/* Main Ledger Table & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs space-y-0">
        
        {/* Filter Bar */}
        <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search transaction description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-hidden"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits (+)</option>
              <option value="withdrawal">Expenses (-)</option>
            </select>
          </div>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-500" /> Export CSV
          </button>
        </div>

        {/* Ledger Table */}
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs">
            No transaction records match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] tracking-widest font-mono select-none">
                  <th className="p-4">Transaction Date</th>
                  <th className="p-4">Flow Type</th>
                  <th className="p-4">Reference & Description</th>
                  <th className="p-4 text-right">Amount (LKR)</th>
                  {isAuthorized && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-sans">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9.5px] font-bold uppercase font-mono border ${
                        tx.type === "deposit"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60"
                          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60"
                      }`}>
                        {tx.type === "deposit" ? <ArrowUpRight className="size-3" /> : <ArrowDownLeft className="size-3" />}
                        {tx.type === "deposit" ? "Deposit" : "Expense"}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                      {tx.notes || "General Fund Ledger Entry"}
                    </td>
                    <td className={`p-4 text-right font-mono font-bold text-sm whitespace-nowrap ${
                      tx.type === "deposit" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    }`}>
                      {tx.type === "deposit" ? "+" : "-"} LKR {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    {isAuthorized && (
                      <td className="p-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Void / Delete Transaction"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Transaction Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-left relative">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Landmark className="size-4 text-emerald-500" /> Record Treasury Ledger Entry
              </h3>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRecordTransaction} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono mb-1.5">
                  Flow Direction Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTxType("deposit")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all ${
                      txType === "deposit"
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <ArrowUpRight className="size-3.5" /> Deposit (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType("withdrawal")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all ${
                      txType === "withdrawal"
                        ? "bg-amber-600 text-white border-amber-500 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <ArrowDownLeft className="size-3.5" /> Expense (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono mb-1.5">
                  Category Tag
                </label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden"
                >
                  <option value="Sponsorship">Corporate Sponsorship</option>
                  <option value="University Grant">University / Faculty Grant</option>
                  <option value="Prize Money">Competition Prize Money</option>
                  <option value="Donation">Private Donation</option>
                  <option value="Hardware Purchase">Hardware & Component Parts</option>
                  <option value="Machining & Fabrication">Machining & Chassis Fabrication</option>
                  <option value="Travel & Lodging">Competition Travel & Accommodation</option>
                  <option value="Outreach & Events">Outreach & Workshop Supplies</option>
                  <option value="Miscellaneous">Other / Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono mb-1.5">
                  Amount in LKR
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm font-mono text-slate-800 dark:text-slate-200 text-right focus:outline-hidden focus:border-emerald-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono mb-1.5">
                  Description / Reference Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. SLIIT ROBOFEST 1st Place Prize, SolidWorks Sponsor Grant..."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-sans text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-mono cursor-pointer shadow-md"
                >
                  {submitting ? "Logging..." : "Confirm & Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
