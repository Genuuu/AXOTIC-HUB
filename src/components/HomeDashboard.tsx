import React, { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc } from "firebase/firestore";
import { 
  Compass, Banknote, Sliders, Layers, ShieldCheck, 
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
  Tag,
  Trophy,
  X
} from "lucide-react";
import { UserProfile, Project, ProjectLog, InventoryItem, ProjectStatus, AllocatedHardware, Competition, GeneralFundTransaction } from "../types";
import TagInput from "./TagInput";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  Cell, 
  PieChart, 
  Pie 
  , LineChart, Line, AreaChart, Area, CartesianGrid } from "recharts";
import { useWorkspaceSettings } from "../useWorkspaceSettings";

interface HomeDashboardProps {
  currentUser: UserProfile;
  roster: UserProfile[];
  projectsList: Project[];
  onNavigate: (tab: "projects" | "inventory" | "roster" | "settings" | "ideas" | "competitions", projectId?: string) => void;
  onOpenEditProfile: () => void;
}

// Visual color palette for charts
const COLORS = [
  "#2563eb", // blue-600
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#3b82f6", // blue-500
  "#84cc16", // lime-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ec4899", // pink-500
  "#f43f5e", // rose-500
];

// Rich Custom Tooltip component for part allocation breakdown
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-750 text-white p-3.5 rounded-xl shadow-lg text-[11px] max-w-xs space-y-2 text-left z-50">
        <div>
          <span className="font-extrabold text-[8.5px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
            {data.category}
          </span>
        </div>
        <div className="font-bold text-slate-100 text-xs leading-tight">{data.name}</div>
        <div className="flex items-center gap-1.5 text-slate-350 border-t border-slate-800/60 pt-1.5">
          <span>Assigned Quantity:</span>
          <span className="font-mono font-black text-emerald-400 text-xs">{data.quantity} units</span>
        </div>
        {data.projects && Object.keys(data.projects).length > 0 && (
          <div className="border-t border-slate-800 pt-1.5 space-y-1">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Workspace Sharing:</div>
            {Object.entries<number>(data.projects).map(([projTitle, qty]) => (
              <div key={projTitle} className="flex justify-between items-center gap-4 text-[10px] text-slate-300">
                <span className="truncate max-w-[150px]" title={projTitle}>{projTitle}</span>
                <span className="font-mono font-bold text-slate-100">{qty} unit{qty > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function HomeDashboard({ currentUser, roster, projectsList, onNavigate, onOpenEditProfile }: HomeDashboardProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [allLogs, setAllLogs] = useState<ProjectLog[]>([]);
  const [allAllocations, setAllAllocations] = useState<{ [projectId: string]: AllocatedHardware[] }>({});
  const [chartView, setChartView] = useState<"parts" | "categories">("parts");
  const [competitions, setCompetitions] = useState<Competition[]>([]);
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
        console.warn("Could not query inventory real-time for home metrics.", err instanceof Error ? err.message : String(err));
      });
      return () => unsubscribe();
    }
  }, [currentUser.isOfflineMock]);

  // Fetch live competitions
  useEffect(() => {
    if (currentUser.isOfflineMock) {
      const handleStorageUpdate = () => {
        const localComps = localStorage.getItem("axotic_mock_competitions");
        if (localComps) {
          try {
            setCompetitions(JSON.parse(localComps));
          } catch (_) {}
        }
      };
      handleStorageUpdate();
      window.addEventListener("axotic_db_update", handleStorageUpdate);
      return () => window.removeEventListener("axotic_db_update", handleStorageUpdate);
    } else {
      const q = query(collection(db, "competitions"), orderBy("date", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: Competition[] = [];
        snapshot.forEach((snapDoc) => {
          items.push({ id: snapDoc.id, ...snapDoc.data() } as Competition);
        });
        setCompetitions(items);
      }, (err) => {
        console.warn("Could not query competitions real-time for home metrics.", err instanceof Error ? err.message : String(err));
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
          console.warn(`Firestore log stream skipped for project ${p.id}`, err instanceof Error ? err.message : String(err));
          handleFirestoreError(err, OperationType.LIST, `projects/${p.id}/logs`);
        });
        unsubscribers.push(unsub);
      });

      return () => {
        unsubscribers.forEach(unsub => unsub());
      };
    }
  }, [projectsList, currentUser.isOfflineMock]);

  // 3. Fetch live active stockroom hardware allocation matrices recursively
  useEffect(() => {
    if (projectsList.length === 0) {
      setAllAllocations({});
      return;
    }

    if (currentUser.isOfflineMock) {
      const aggregateMockHardware = () => {
        const aggregated: { [projectId: string]: AllocatedHardware[] } = {};
        
        const projectsWithMockHw = [
          {
            id: "mock-proj-1",
            hardware: [
              {
                id: "hw-motor",
                name: "NEMA 17 Stepper Motor High Torque",
                category: "Hardware",
                quantity: 4,
                allocatedBy: "mock-bob",
                allocatedByName: "Bob Axel",
                allocatedAt: new Date(Date.now() - 3600000 * 24 * 12).toISOString()
              },
              {
                id: "hw-extrusion",
                name: "Aluminum Extrusions Profile 2020",
                category: "Hardware",
                quantity: 8,
                allocatedBy: "mock-bob",
                allocatedByName: "Bob Axel",
                allocatedAt: new Date(Date.now() - 3600000 * 24 * 12).toISOString()
              }
            ]
          },
          {
            id: "mock-proj-2",
            hardware: [
              {
                id: "hw-esp32",
                name: "ESP32-WROOM-32E Dev Board",
                category: "Microcontrollers",
                quantity: 3,
                allocatedBy: "mock-genu",
                allocatedByName: "Genu Kakisara (Lead)",
                allocatedAt: new Date(Date.now() - 3600000 * 24 * 14).toISOString()
              },
              {
                id: "hw-lidar",
                name: "LIDAR Sensor Node v2",
                category: "Sensors",
                quantity: 2,
                allocatedBy: "mock-genu",
                allocatedByName: "Genu Kakisara (Lead)",
                allocatedAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString()
              }
            ]
          },
          {
            id: "mock-proj-3",
            hardware: [
              {
                id: "hw-pcb",
                name: "Double sided Custom Copper PCB Shield",
                category: "Electrical",
                quantity: 5,
                allocatedBy: "mock-sarah",
                allocatedByName: "Sarah Connor",
                allocatedAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString()
              },
              {
                id: "hw-buck",
                name: "Power Buck Converter 5V",
                category: "Electrical",
                quantity: 6,
                allocatedBy: "mock-sarah",
                allocatedByName: "Sarah Connor",
                allocatedAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
              }
            ]
          }
        ];

        let updatedAny = false;
        projectsList.forEach(p => {
          const hwKey = `axotic_mock_hardware_${p.id}`;
          let stored = localStorage.getItem(hwKey);
          if (!stored) {
            const seedConfig = projectsWithMockHw.find(item => item.id === p.id);
            if (seedConfig) {
              localStorage.setItem(hwKey, JSON.stringify(seedConfig.hardware));
              stored = JSON.stringify(seedConfig.hardware);
              updatedAny = true;
            }
          }
          if (stored) {
            try {
              aggregated[p.id] = JSON.parse(stored);
            } catch (_) {
              aggregated[p.id] = [];
            }
          } else {
            aggregated[p.id] = [];
          }
        });

        setAllAllocations(aggregated);
        if (updatedAny) {
          window.dispatchEvent(new Event("axotic_db_update"));
        }
      };

      aggregateMockHardware();
      window.addEventListener("axotic_db_update", aggregateMockHardware);
      return () => window.removeEventListener("axotic_db_update", aggregateMockHardware);
    } else {
      const unsubscribers: (() => void)[] = [];
      const tempAllocations: { [projectId: string]: AllocatedHardware[] } = {};

      const updateState = () => {
        setAllAllocations({ ...tempAllocations });
      };

      projectsList.forEach((p) => {
        const hwQuery = query(collection(db, "projects", p.id, "hardware"));
        const unsub = onSnapshot(hwQuery, (snapshot) => {
          const projectHwList: AllocatedHardware[] = [];
          snapshot.forEach((docSnap) => {
            projectHwList.push({ id: docSnap.id, ...docSnap.data() } as AllocatedHardware);
          });
          tempAllocations[p.id] = projectHwList;
          updateState();
        }, (err) => {
          console.warn(`Firestore hardware stream skipped for project ${p.id}`, err instanceof Error ? err.message : String(err));
          handleFirestoreError(err, OperationType.LIST, `projects/${p.id}/hardware`);
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

  // Solution for very long budget / estimated cost values: abbreviate beautifully while offering an exact tooltip on hover
  const formatShortLKR = (val: number, includeDecimals = false) => {
    if (val >= 1_000_000_000_000) {
      return `${(val / 1_000_000_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}T`;
    }
    if (val >= 1_000_000_000) {
      return `${(val / 1_000_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}B`;
    }
    if (val >= 1_000_000) {
      return `${(val / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
    }
    if (val >= 100_000) {
      return `${(val / 1_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`;
    }
    return val.toLocaleString('en-US', { 
      minimumFractionDigits: includeDecimals ? 2 : 0, 
      maximumFractionDigits: includeDecimals ? 2 : 0 
    });
  };

  // Stat computations
  
  const fundChartData = useMemo(() => {
    if (!generalFundTransactions || generalFundTransactions.length === 0) return [];
    
    // Sort transactions by date ascending
    const sorted = [...generalFundTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // First, find the starting balance before the 30-day window
    let runningBalance = 0;
    
    for (const tx of sorted) {
      if (new Date(tx.date).getTime() < thirtyDaysAgo.getTime()) {
        runningBalance += (tx.type === "deposit" ? tx.amount : -tx.amount);
      }
    }
    
    // Generate an entry for each of the last 30 days
    const data = [];
    let currentDay = new Date(thirtyDaysAgo);
    
    while (currentDay <= now) {
      const dayStart = new Date(currentDay);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDay);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayTx = sorted.filter(tx => {
        const txDate = new Date(tx.date).getTime();
        return txDate >= dayStart.getTime() && txDate <= dayEnd.getTime();
      });
      
      const dayChange = dayTx.reduce((sum, tx) => sum + (tx.type === "deposit" ? tx.amount : -tx.amount), 0);
      runningBalance += dayChange;
      
      data.push({
        date: currentDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        balance: runningBalance,
      });
      
      currentDay = new Date(currentDay.getTime() + 24 * 60 * 60 * 1000);
    }
    
    return data;
  }, [generalFundTransactions]);
  const ongoingProjects = projectsList.filter(p => p.status !== "Finished");
  const totalGeneralFundAllocations = projectsList.reduce((sum, p) => {
    const fundsList = p.generalFundAllocations || [];
    return sum + fundsList.reduce((subSum, s) => subSum + s.amount, 0);
  }, 0);
  const totalBudgetLimit = projectsList.reduce((sum, p) => sum + (p.budget || 0), 0);
  const lowStockItems = inventory.filter(item => item.availableQuantity <= 5);
  const myProjects = projectsList.filter(p => p.leaderId === currentUser.uid || (p.memberIds && p.memberIds.includes(currentUser.uid)));

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingComps = competitions.filter(c => c.date === "TBD" || c.date === "To Be Decided" || !c.date || c.date >= todayStr);
  const myUpcomingComps = upcomingComps.filter(c => (c.registeredUserIds || []).includes(currentUser.uid) || (c.remindUserIds || []).includes(currentUser.uid));

  // Aggregate current assignments of stockroom parts to active projects
  const partUsageMap: { 
    [partName: string]: { 
      quantity: number; 
      category: string; 
      projects: { [projectTitle: string]: number } 
    } 
  } = {};

  const categoryUsageMap: { [category: string]: number } = {};

  ongoingProjects.forEach(proj => {
    const list = allAllocations[proj.id] || [];
    list.forEach(item => {
      const name = item.name;
      const qty = item.quantity || 0;
      const category = item.category || "General";
      
      // Group by Part Name
      if (!partUsageMap[name]) {
        partUsageMap[name] = { quantity: 0, category, projects: {} };
      }
      partUsageMap[name].quantity += qty;
      partUsageMap[name].projects[proj.title] = (partUsageMap[name].projects[proj.title] || 0) + qty;

      // Group by Category
      categoryUsageMap[category] = (categoryUsageMap[category] || 0) + qty;
    });
  });

  const partChartData = Object.entries(partUsageMap).map(([name, info]) => ({
    name,
    quantity: info.quantity,
    category: info.category,
    projects: info.projects,
    shortName: name.length > 15 ? name.substring(0, 13) + "..." : name
  })).filter(d => d.quantity > 0);

  // Sort by quantity descending and limit to top 6 elements to prevent overcrowding 
  partChartData.sort((a, b) => b.quantity - a.quantity);
  const displayPartData = partChartData.slice(0, 6);

  const categoryChartData = Object.entries(categoryUsageMap).map(([name, value]) => ({
    name,
    value
  })).filter(d => d.value > 0);

  return (
    <div id="home-dashboard-root" className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-8">
      {/* 1. VISUAL WELCOME BANNER (HERO) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[32px] bg-[#0f172a] border border-[#1e293b] text-white shadow-2xl"
      >
        {/* Abstract structural grid background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        
        {/* Soft atmospheric gradients */}
        <div className="absolute -right-20 -top-20 size-[400px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute left-1/4 -bottom-32 size-[300px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="p-8 md:p-12 relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex items-center gap-6 text-left">
            <div className="relative shrink-0">
              <img 
                src={currentUser.avatarUrl || undefined} 
                alt={currentUser.displayName} 
                referrerPolicy="no-referrer"
                className="size-20 md:size-24 rounded-2xl border-[3px] border-white/10 object-cover shadow-xl transform hover:rotate-2 transition-transform duration-300"
              />
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 size-5 border-4 border-[#0f172a] rounded-full animate-pulse" title="Online" />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-widest bg-white/10 backdrop-blur-sm text-white border border-white/20 px-3 py-1 rounded-full">
                  {currentUser.role === "admin" ? "Systems Administrator" : "Active Specialist"}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Joined {currentUser.joinedAt ? new Date(currentUser.joinedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : "Recently"}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white font-display flex items-center gap-2">
                {getGreeting()}, {currentUser.displayName.split(' ')[0]}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300 font-medium">
                <span className="text-slate-400 font-mono">{currentUser.email}</span>
                {currentUser.homepageUrl ? (
                  <>
                    <span className="text-slate-600">•</span>
                    <a 
                      href={currentUser.homepageUrl.startsWith("http") ? currentUser.homepageUrl : `https://${currentUser.homepageUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1.5 hover:underline transition-colors"
                    >
                      <Sparkles className="size-3.5" /> Homepage
                    </a>
                  </>
                ) : (
                  <>
                    <span className="text-slate-600">•</span>
                    <button
                      onClick={onOpenEditProfile}
                      className="text-slate-400 hover:text-white flex items-center gap-1.5 hover:underline transition-colors cursor-pointer"
                    >
                      <Plus className="size-3.5" /> Link portfolio
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Roster Peek */}
          <div className="flex items-center gap-5 shrink-0 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
            <div 
              onClick={() => onNavigate("roster")}
              className="flex -space-x-3 cursor-pointer group" 
              title="Active Specialists Directory"
            >
              {roster.slice(0, 5).map(m => (
                <img 
                  key={m.uid}
                  src={m.avatarUrl || undefined} 
                  alt={m.displayName}
                  className="size-10 rounded-full border-2 border-[#0f172a] object-cover bg-slate-800 transition-transform group-hover:-translate-y-1" 
                />
              ))}
              {roster.length > 5 && (
                <div className="size-10 rounded-full border-2 border-[#0f172a] bg-slate-800 flex items-center justify-center text-[11px] font-bold text-slate-300 relative z-10 transition-transform group-hover:-translate-y-1">
                  +{roster.length - 5}
                </div>
              )}
            </div>
            <button
              onClick={onOpenEditProfile}
              className="size-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg border border-blue-400 flex items-center justify-center cursor-pointer transition-all hover:scale-105"
              title="Edit My Profile"
            >
              <Wrench className="size-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* 2. BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-auto">
        
        {/* Main Chart (Span 8) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-8 bg-white border border-slate-200 rounded-[32px] p-8 shadow-3xs flex flex-col min-h-[360px]"
        >
          <div className="flex justify-between items-start mb-8">
            <div>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest block mb-2 flex items-center gap-2">
                <Banknote className="size-3.5" /> General Fund Treasury
              </span>
              <div 
                className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 cursor-help"
                title={`LKR ${totalGeneralFundAllocations.toLocaleString('en-US')}`}
              >
                LKR {formatShortLKR(totalGeneralFundAllocations)}
              </div>
              <div className="mt-2 text-xs text-slate-500 font-medium">
                Limit cap set at LKR {formatShortLKR(totalBudgetLimit)} across operations
              </div>
            </div>
            <button
              onClick={() => setShowAddFundModal(true)}
              className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl cursor-pointer transition-colors shadow-sm"
              title="Inject Funds"
            >
              <Plus className="size-5" />
            </button>
          </div>
          <div className="flex-1 w-full mt-4 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fundChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  tickFormatter={(val) => `${formatShortLKR(val)}`}
                  dx={-10}
                />
                <ChartTooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#0f172a' }}
                  formatter={(val) => [`LKR ${Number(val).toLocaleString()}`, 'Balance']}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Action Portal (Span 4) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-4 bg-slate-900 rounded-[32px] p-8 shadow-lg text-white relative overflow-hidden flex flex-col border border-slate-800"
        >
          <div className="absolute top-0 right-0 p-8 opacity-[0.08] pointer-events-none">
            <Sparkles className="size-40 rotate-12" />
          </div>
          <h3 className="text-lg font-black tracking-wider text-slate-300 font-display mb-6 relative z-10 flex items-center gap-2">
            <Terminal className="size-4" /> Command Center
          </h3>
          <div className="space-y-3 relative z-10 mt-auto">
            <button 
              onClick={() => onNavigate("inventory")} 
              className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-sm group cursor-pointer"
            >
              <span className="flex items-center gap-3 font-semibold text-slate-200">
                <Warehouse className="size-5 text-blue-400" /> Stockroom & Parts
              </span>
              <ArrowRight className="size-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
            <button 
              onClick={() => onNavigate("roster")} 
              className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-sm group cursor-pointer"
            >
              <span className="flex items-center gap-3 font-semibold text-slate-200">
                <Users className="size-5 text-purple-400" /> Specialist Directory
              </span>
              <ArrowRight className="size-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
            {currentUser.role === "admin" && (
              <button 
                onClick={() => onNavigate("settings")} 
                className="w-full flex items-center justify-between p-4 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-2xl border border-emerald-500/20 transition-all text-sm group cursor-pointer"
              >
                <span className="flex items-center gap-3 font-semibold text-emerald-400">
                  <Sliders className="size-5" /> Admin Settings
                </span>
                <ArrowRight className="size-4 text-emerald-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Small Stat 1: Ongoing Projects (Span 4) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-4 bg-[#eff6ff] border border-[#dbeafe] rounded-[32px] p-8 flex flex-col justify-between shadow-3xs"
        >
          <div className="size-14 bg-blue-600 rounded-[20px] flex items-center justify-center text-white mb-8 shadow-md">
            <Compass className="size-7" />
          </div>
          <div>
            <span className="text-5xl font-black tracking-tighter text-blue-950 block mb-3 font-display">
              {ongoingProjects.length}
            </span>
            <span className="text-[13px] font-extrabold uppercase tracking-widest text-blue-700 block mb-1">
              Active Operations
            </span>
            <span className="text-xs font-semibold text-blue-600/70 flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> {projectsList.filter(p => p.status === "Finished").length} logged as complete
            </span>
          </div>
        </motion.div>

        {/* Small Stat 2: Low Stock (Span 4) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-4 bg-[#fff1f2] border border-[#ffe4e6] rounded-[32px] p-8 flex flex-col justify-between shadow-3xs"
        >
          <div className="size-14 bg-rose-600 rounded-[20px] flex items-center justify-center text-white mb-8 shadow-md">
            <AlertTriangle className="size-7" />
          </div>
          <div>
            <span className="text-5xl font-black tracking-tighter text-rose-950 block mb-3 font-display">
              {lowStockItems.length}
            </span>
            <span className="text-[13px] font-extrabold uppercase tracking-widest text-rose-700 block mb-1">
              Low Stock Alerts
            </span>
            <span className="text-xs font-semibold text-rose-600/70 flex items-center gap-1">
              <Layers className="size-3.5" /> {inventory.length} total active parts
            </span>
          </div>
        </motion.div>

        {/* Small Stat 3: Team (Span 4) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-4 bg-white border border-slate-200 rounded-[32px] p-8 flex flex-col justify-between shadow-3xs"
        >
          <div className="size-14 bg-slate-100 rounded-[20px] flex items-center justify-center text-slate-700 mb-8 border border-slate-200 shadow-sm">
            <Users className="size-7" />
          </div>
          <div>
            <span className="text-5xl font-black tracking-tighter text-slate-900 block mb-3 font-display">
              {roster.length}
            </span>
            <span className="text-[13px] font-extrabold uppercase tracking-widest text-slate-700 block mb-1">
              Roster Specialists
            </span>
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-emerald-500" /> Fully cleared personnel
            </span>
          </div>
        </motion.div>

        {/* Bottom Wide: My Projects (Span 12) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-12 bg-white border border-slate-200 rounded-[32px] p-8 shadow-3xs"
        >
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
            <h3 className="text-xl font-black font-display text-slate-900 flex items-center gap-3">
              <div className="size-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <Compass className="size-4" /> 
              </div>
              My Associated Builds
            </h3>
            <button 
              onClick={() => onNavigate("projects")} 
              className="text-xs font-extrabold uppercase tracking-wider text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              View All <ArrowRight className="size-3.5" />
            </button>
          </div>
          
          {myProjects.length === 0 ? (
            <div className="text-center py-12 px-6 bg-slate-50 border border-slate-200/60 rounded-2xl border-dashed">
              <Compass className="size-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">No active assignments</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You haven't been assigned to any ongoing operations yet. Check the project hub to join an existing build or initiate a new one.
              </p>
              <button 
                onClick={() => onNavigate("projects")}
                className="mt-4 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer"
              >
                Browse Projects
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myProjects.slice(0, 3).map(p => (
                <div 
                  key={p.id} 
                  onClick={() => onNavigate("projects", p.id)} 
                  className="group cursor-pointer p-6 bg-slate-50 border border-slate-200 rounded-[24px] hover:bg-white hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-5">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest ${
                      p.status === "Finished" ? "bg-purple-100 text-purple-700 border-purple-200" :
                      p.status === "Testing" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                      p.status === "Fabricating" ? "bg-blue-100 text-blue-700 border-blue-200" :
                      "bg-amber-100 text-amber-700 border-amber-200"
                    }`}>
                      {p.status}
                    </span>
                    <div className="size-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 group-hover:bg-blue-50 transition-all shadow-sm">
                      <ArrowRight className="size-4 transform group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                  <h4 className="font-bold text-lg text-slate-900 mb-2 line-clamp-1">{p.title}</h4>
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-6 flex-1">
                    {p.description || "No description provided for this active build."}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200/70">
                    <div className="flex -space-x-2">
                      {p.memberIds.slice(0, 5).map(uid => {
                        const m = roster.find(r => r.uid === uid);
                        return m ? (
                          <img 
                            key={uid} 
                            src={m.avatarUrl} 
                            alt={m.displayName}
                            className="size-7 rounded-full border-2 border-slate-50 bg-white object-cover" 
                          />
                        ) : null;
                      })}
                      {p.memberIds.length > 5 && (
                        <div className="size-7 rounded-full border-2 border-slate-50 bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 z-10">
                          +{p.memberIds.length - 5}
                        </div>
                      )}
                    </div>
                    {p.deadline && (
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        {new Date(p.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Add Funds Modal */}
      {showAddFundModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200 transform transition-all">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-display font-black text-slate-800 text-base flex items-center gap-2">
                <Banknote className="size-5 text-emerald-600" />
                Add Treasury Funds
              </h3>
              <button 
                onClick={() => setShowAddFundModal(false)}
                className="text-slate-400 hover:text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors p-1.5 rounded-full shadow-sm cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Transaction Type</label>
                <div className="flex rounded-xl overflow-hidden border border-slate-200 p-1 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setNewFundType("deposit")}
                    className={`flex-1 py-2 text-xs font-black tracking-wide rounded-lg transition-all cursor-pointer ${
                      newFundType === "deposit" ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    }`}
                  >
                    Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFundType("withdrawal")}
                    className={`flex-1 py-2 text-xs font-black tracking-wide rounded-lg transition-all cursor-pointer ${
                      newFundType === "withdrawal" ? "bg-white text-rose-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    }`}
                  >
                    Withdrawal
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Amount (LKR)</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm outline-hidden font-bold transition-colors"
                  value={newFundAmount}
                  onChange={(e) => setNewFundAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Description</label>
                <input
                  type="text"
                  placeholder="e.g. University Grant"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm outline-hidden font-medium transition-colors"
                  value={newFundNotes}
                  onChange={(e) => setNewFundNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="px-6 py-5 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowAddFundModal(false)}
                className="px-5 py-2.5 text-xs font-extrabold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFundTransaction}
                disabled={fundLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wide rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center min-w-[140px]"
              >
                {fundLoading ? "Saving..." : "Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
