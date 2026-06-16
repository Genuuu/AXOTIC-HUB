import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { 
  Compass, 
  Warehouse, 
  Users, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  Coins, 
  Terminal, 
  User, 
  Plus, 
  Wrench, 
  Calendar, 
  Code, 
  CheckCircle2, 
  Briefcase, 
  ArrowRight,
  Sparkles,
  Tag
} from "lucide-react";
import { UserProfile, Project, ProjectLog, InventoryItem } from "../types";
import TagInput from "./TagInput";

interface HomeDashboardProps {
  currentUser: UserProfile;
  roster: UserProfile[];
  projectsList: Project[];
  onNavigate: (tab: "projects" | "inventory" | "roster" | "settings", projectId?: string) => void;
  onOpenEditProfile: () => void;
}

export default function HomeDashboard({ currentUser, roster, projectsList, onNavigate, onOpenEditProfile }: HomeDashboardProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [allLogs, setAllLogs] = useState<ProjectLog[]>([]);

  // 1. Fetch live stockroom parameters
  useEffect(() => {
    if (currentUser.isOfflineMock) {
      const handleStorageUpdate = () => {
        const localItems = localStorage.getItem("axotic_mock_inventory");
        if (localItems) {
          try {
            setInventory(JSON.parse(localItems));
          } catch (_) {}
        }
      };
      // Initial seed query
      handleStorageUpdate();
      window.addEventListener("axotic_db_update", handleStorageUpdate);
      return () => window.removeEventListener("axotic_db_update", handleStorageUpdate);
    } else {
      const q = query(collection(db, "inventory"), orderBy("name", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: InventoryItem[] = [];
        snapshot.forEach((snapDoc) => {
          items.push({ id: snapDoc.id, ...snapDoc.data() } as InventoryItem);
        });
        setInventory(items);
      }, (err) => {
        console.warn("Could not query inventory real-time for home metrics.", err);
      });
      return () => unsubscribe();
    }
  }, [currentUser.isOfflineMock]);

  // 2. Fetch live logged entries recursively from active projects to form a dynamic Unified Hub Feed
  useEffect(() => {
    if (projectsList.length === 0) {
      setAllLogs([]);
      return;
    }

    if (currentUser.isOfflineMock) {
      // Aggregate mock logs from localStorage
      const aggregateMockLogs = () => {
        const aggregated: ProjectLog[] = [];
        projectsList.forEach(p => {
          const stored = localStorage.getItem(`axotic_mock_logs_${p.id}`);
          if (stored) {
            try {
              const logsList: ProjectLog[] = JSON.parse(stored);
              logsList.forEach(log => {
                aggregated.push({
                  ...log,
                  projectId: p.id // ensure back-associated
                });
              });
            } catch (_) {}
          }
        });
        // Sort newest first
        aggregated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllLogs(aggregated.slice(0, 8)); // top 8 newest
      };

      aggregateMockLogs();
      window.addEventListener("axotic_db_update", aggregateMockLogs);
      return () => window.removeEventListener("axotic_db_update", aggregateMockLogs);
    } else {
      // Dynamic collection listener aggregate
      const unsubscribers: (() => void)[] = [];
      const logsMap: Record<string, ProjectLog[]> = {};

      const renderAggregated = () => {
        const consolidated = Object.values(logsMap).flat();
        consolidated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllLogs(consolidated.slice(0, 8)); // Top 8 newest live logs
      };

      projectsList.forEach((p) => {
        const logsQuery = query(collection(db, "projects", p.id, "logs"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(logsQuery, (snapshot) => {
          const projectLogsList: ProjectLog[] = [];
          snapshot.forEach((docSnap) => {
            projectLogsList.push({ id: docSnap.id, projectId: p.id, ...docSnap.data() } as ProjectLog);
          });
          logsMap[p.id] = projectLogsList;
          renderAggregated();
        }, (err) => {
          console.warn(`Firestore log stream skipped for project ${p.id}`, err);
        });
        unsubscribers.push(unsub);
      });

      return () => {
        unsubscribers.forEach(unsub => unsub());
      };
    }
  }, [projectsList, currentUser.isOfflineMock]);

  // Determine dynamic time greeting
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good morning";
    if (hours < 18) return "Good afternoon";
    return "Good evening";
  };

  // Stat computations
  const ongoingProjects = projectsList.filter(p => p.status !== "Finished");
  const totalSponsorFunds = projectsList.reduce((sum, p) => {
    const fundsList = p.sponsorFundings || [];
    return sum + fundsList.reduce((subSum, s) => subSum + s.amount, 0);
  }, 0);
  const totalBudgetLimit = projectsList.reduce((sum, p) => sum + (p.budget || 0), 0);
  const lowStockItems = inventory.filter(item => item.availableQuantity <= 5);
  const myProjects = projectsList.filter(p => p.leaderId === currentUser.uid || (p.memberIds && p.memberIds.includes(currentUser.uid)));

  return (
    <div id="home-dashboard-root" className="w-full max-w-7xl mx-auto px-1 py-4 space-y-6">
      
      {/* 1. VISUAL WELCOME BANNER BOARD */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl"
      >
        {/* Decorative background ambient nodes */}
        <div className="absolute right-0 top-0 size-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 size-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="p-6 md:p-8 relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5 text-left">
            <img 
              src={currentUser.avatarUrl} 
              alt={currentUser.displayName} 
              referrerPolicy="no-referrer"
              className="size-16 md:size-20 rounded-2xl border-2 border-slate-750 bg-slate-800 shadow-md transform hover:rotate-3 transition-transform"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-md">
                  {currentUser.role === "admin" ? "Systems Administrator" : "Active Specialist"}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Joined {currentUser.joinedAt ? new Date(currentUser.joinedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : "Recently"}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white mt-1.5 font-display">
                {getGreeting()}, {currentUser.displayName}
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl font-sans leading-relaxed">
                <span className="text-slate-400 font-mono">{currentUser.email}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onOpenEditProfile}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer select-none transition-all duration-150 flex items-center gap-2 shadow-xs shrink-0 border border-blue-500 hover:shadow-md"
          >
            <User className="size-4" /> Edit My Profile
          </button>
        </div>
      </motion.div>

      {/* 2. CORE STATS MULTI-CARD GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metrics Card A: Ongoing Projects */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs hover:shadow-2xs transition-all">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Ongoing Projects</span>
            <span className="text-2xl font-black font-mono text-slate-800 block">{ongoingProjects.length}</span>
            <span className="text-[9.5px] text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-500" /> {projectsList.filter(p => p.status === "Finished").length} logged done
            </span>
          </div>
          <div className="size-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 shadow-3xs">
            <Compass className="size-5" />
          </div>
        </div>

        {/* Metrics Card B: Total Sponsor Sponsorship */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs hover:shadow-2xs transition-all">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Sponsor Funding</span>
            <span className="text-2xl font-black font-mono text-emerald-700 block">
              LKR {totalSponsorFunds.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[9.5px] text-slate-450 flex items-center gap-1 hover:underline cursor-help" title={`Total Budget limits across active builds: LKR ${totalBudgetLimit}`}>
              <Coins className="size-3 text-emerald-500" /> Offset on LKR {totalBudgetLimit.toLocaleString('en-US', { maximumFractionDigits: 0 })} cap
            </span>
          </div>
          <div className="size-11 rounded-xl bg-emerald-50/50 flex items-center justify-center text-emerald-600 shrink-0 shadow-3xs">
            <Briefcase className="size-5" />
          </div>
        </div>

        {/* Metrics Card C: Low-Stock Shortfalls */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs hover:shadow-2xs transition-all">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Low Stock Alarms</span>
            {lowStockItems.length > 0 ? (
              <span className="text-2xl font-black font-mono text-rose-600 block flex items-center gap-1.5 animate-pulse">
                {lowStockItems.length} <AlertTriangle className="size-4 text-rose-500 shrink-0" />
              </span>
            ) : (
              <span className="text-2xl font-black font-mono text-slate-850 block">0</span>
            )}
            <span className="text-[9.5px] text-slate-500 flex items-center gap-1">
              <Warehouse className="size-3 text-slate-400" /> {inventory.length} active parts registered
            </span>
          </div>
          <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 shadow-3xs ${lowStockItems.length > 0 ? "bg-rose-50 text-rose-650" : "bg-slate-50 text-slate-500"}`}>
            <AlertTriangle className="size-5" />
          </div>
        </div>

        {/* Metrics Card D: Active Team Specialists */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs hover:shadow-2xs transition-all">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Roster Specialists</span>
            <span className="text-2xl font-black font-mono text-slate-805 block">{roster.length}</span>
            <span className="text-[9.5px] text-slate-500 flex items-center gap-1">
              <Users className="size-3 text-slate-450" /> Fully cleared for access
            </span>
          </div>
          <div className="size-11 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 shrink-0 shadow-3xs">
            <Users className="size-5" />
          </div>
        </div>
      </div>

      {/* 3. CO-LAYOUT COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* LEFT COLUMN: 3/5 WIDTH */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* MY DESIGNATED LABOR PROJECTS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                <Compass className="size-4 hover:rotate-45 transition-transform text-blue-600" />
                My Associated Lab Projects ({myProjects.length})
              </h3>
              <button 
                onClick={() => onNavigate("projects")}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
              >
                Launch Complete Board <ArrowRight className="size-3" />
              </button>
            </div>

            {myProjects.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs italic shadow-3xs">
                You are currently not listed as a leader or formal member of any active projects.
                <button
                  onClick={() => onNavigate("projects")}
                  className="block mx-auto mt-3.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 font-bold text-white uppercase tracking-wider text-[10px] rounded-lg shadow-sm cursor-pointer"
                >
                  Join / Scaffold a Build Row
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                {myProjects.map((proj) => {
                  // Compute simple progression ratio based on status
                  const statusRatios = { Planning: 15, Fabricating: 50, Testing: 80, Finished: 100 };
                  const percent = statusRatios[proj.status] || 0;
                  
                  // Compute project sponsorship offset ratio
                  const bVal = proj.budget || 0;
                  const itemCostSum = (proj.budgetItems || []).reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
                  const isOverLimit = bVal > 0 && itemCostSum > bVal;

                  const pUsers = Array.from(new Set([proj.leaderId, ...(proj.memberIds || [])]));

                  return (
                    <div 
                      key={proj.id}
                      className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-3xs hover:shadow-2xs transition-all relative group flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2 text-left">
                          <div>
                            <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                              proj.status === "Planning" ? "bg-slate-100 text-slate-650" :
                              proj.status === "Fabricating" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                              proj.status === "Testing" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                              "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            }`}>
                              {proj.status}
                            </span>
                            <h4 className="font-bold text-sm text-slate-800 tracking-tight mt-1.5 font-display line-clamp-1">
                              {proj.title}
                            </h4>
                          </div>
                          
                          <button
                            onClick={() => onNavigate("projects", proj.id)}
                            className="bg-slate-50 border border-slate-150 hover:bg-blue-50 hover:border-blue-200 text-slate-500 hover:text-blue-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Launch this workspace"
                          >
                            <ArrowRight className="size-4" />
                          </button>
                        </div>

                        <p className="text-[11.5px] text-slate-500 line-clamp-2 text-left leading-relaxed">
                          {proj.description}
                        </p>

                        {/* Progress gauge visual bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-medium">Build Progression Status</span>
                            <span className="font-bold text-slate-700 font-mono">{percent}% finished</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                proj.status === "Planning" ? "bg-slate-400" :
                                proj.status === "Fabricating" ? "bg-blue-500" :
                                proj.status === "Testing" ? "bg-amber-500" :
                                "bg-emerald-500"
                              }`} 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>

                        {/* Financial safeguard limits bar */}
                        <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-150 text-[10px] space-y-1">
                          <div className="flex justify-between font-mono">
                            <span className="text-slate-450 font-sans">Hardware cost ledger</span>
                            <span className={`font-semibold ${isOverLimit ? "text-rose-600" : "text-slate-700"}`}>
                              LKR {itemCostSum.toFixed(2)} / LKR {bVal.toLocaleString('en-US', { maximumFractionDigits: 0 })} lim
                            </span>
                          </div>
                          <div className="relative w-full h-1 back-neutral-200 rounded-full bg-slate-200 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isOverLimit ? "bg-rose-500" : "bg-indigo-500"}`}
                              style={{ width: bVal > 0 ? `${Math.min(100, (itemCostSum / bVal) * 100)}%` : "0%" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Footer: members and scheduling */}
                      <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-slate-400 font-mono font-bold select-none uppercase">Members:</span>
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {pUsers.map((uid) => {
                              const found = roster.find(u => u.uid === uid);
                              if (!found) return null;
                              return (
                                <img
                                  key={uid}
                                  src={found.avatarUrl}
                                  alt={found.displayName}
                                  referrerPolicy="no-referrer"
                                  className="inline-block size-5 rounded-md border border-white shrink-0"
                                  title={found.displayName}
                                />
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {proj.startDate && (
                            <span className="text-[9.5px] font-mono text-slate-500 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded flex items-center gap-1 select-none">
                              <span className="text-[8px] uppercase font-semibold text-slate-400">Started:</span> {new Date(proj.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {proj.deadline ? (
                            <span className="text-[9.5px] font-mono text-slate-500 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded flex items-center gap-1 select-none">
                              <Calendar className="size-3 text-slate-400" /> Due {new Date(proj.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-[9.5px] font-mono text-slate-400 bg-slate-50 border border-slate-150 border-dashed px-2 py-0.5 rounded flex items-center select-none italic">
                              No due date
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SPONSOR & GRANTS OVERVIEW ROLL */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
              <Briefcase className="size-4 text-emerald-600" />
              Consolidated Sponsor Contributions Roll
            </h3>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              {projectsList.filter(p => p.sponsorFundings && p.sponsorFundings.length > 0).length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  No active sponsor fundings logged on workspace project books. Define inbound grants under project spreadsheet sections to override costs.
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-[10px] text-slate-500 text-left border-b border-slate-100 pb-1.5 mb-1.5">
                    Live list of scholarships, academic sponsorships, and department offsets.
                  </div>
                  {projectsList.map((p) => {
                    const projectGrants = p.sponsorFundings || [];
                    if (projectGrants.length === 0) return null;
                    return (
                      <div key={p.id} className="p-3 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-left transition-colors">
                        <div>
                          <div className="text-[11.5px] font-bold text-slate-850 flex items-center gap-1.5">
                            <span className="bg-emerald-100 text-emerald-800 text-[8.5px] font-black uppercase px-2 py-0.2 rounded font-mono">Offset</span>
                            {p.title}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {projectGrants.map((g) => (
                              <span key={g.id} className="text-[10px] bg-white border border-slate-205 rounded px-2 py-0.5 text-slate-600" title={g.notes || "Sponsoring backing"}>
                                🔬 <strong>{g.sponsorName}</strong>: LKR {g.amount.toFixed(0)} {g.notes && `(${g.notes})`}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs text-slate-450 block uppercase text-[8px] font-bold tracking-widest font-sans">Total Offset</span>
                          <span className="text-xs font-black font-mono text-emerald-600">
                            +LKR {projectGrants.reduce((sum, g) => sum + g.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: 2/5 WIDTH */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* QUICK PORTAL ACTION MENU */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <Sparkles className="size-4 text-violet-500 animate-pulse" />
              Quick Action Portal Routing
            </h3>

            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2 text-left shadow-3xs">
              <button 
                onClick={() => onNavigate("inventory")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-150 hover:border-blue-200 transition-all text-slate-750 font-bold text-xs group cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Warehouse className="size-4 text-slate-500 group-hover:text-blue-500" />
                  Stockroom & Parts Registry
                </span>
                <ArrowRight className="size-3.5 text-slate-400 group-hover:text-blue-500 transform group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button 
                onClick={() => onNavigate("roster")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-150 hover:border-blue-200 transition-all text-slate-750 font-bold text-xs group cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Users className="size-4 text-slate-500 group-hover:text-blue-500" />
                  Roster Specialist Directory
                </span>
                <ArrowRight className="size-3.5 text-slate-400 group-hover:text-blue-500 transform group-hover:translate-x-0.5 transition-transform" />
              </button>

              {currentUser.role === "admin" && (
                <button 
                  onClick={() => onNavigate("settings")}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-150 hover:border-blue-200 transition-all text-slate-750 font-bold text-xs group cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Terminal className="size-4 text-slate-500 group-hover:text-blue-500" />
                    Admin Command Console
                  </span>
                  <ArrowRight className="size-3.5 text-slate-400 group-hover:text-blue-500 transform group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
