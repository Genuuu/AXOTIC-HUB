import React, { useState, useEffect } from "react";
import { db, createGlobalNotification, createAdminLog, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from "firebase/firestore";
import { 
  Trophy, 
  Calendar, 
  MapPin, 
  ExternalLink, 
  Plus, 
  Bell, 
  BellOff, 
  Search, 
  Filter, 
  Trash2, 
  Clock, 
  Sparkles, 
  Megaphone,
  X,
  AlertCircle,
  Check
} from "lucide-react";
import { UserProfile, Competition } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { CountdownTimer } from "./CountdownTimer";

interface CompetitionsHubProps {
  currentUser: UserProfile;
  roster: UserProfile[];
}

export default function CompetitionsHub({ currentUser, roster }: CompetitionsHubProps) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "upcoming" | "past">("upcoming");
  const [loading, setLoading] = useState(true);

  // Modal Control States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newLink, setNewLink] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Registration form & inline edit states
  const [newIsRegistered, setNewIsRegistered] = useState(false);
  const [newRegisteredName, setNewRegisteredName] = useState("");
  const [newRegisteredUserIds, setNewRegisteredUserIds] = useState<string[]>([]);
  const [editingRegCompId, setEditingRegCompId] = useState<string | null>(null);
  const [editRegName, setEditRegName] = useState("");
  const [editIsReg, setEditIsReg] = useState(false);

  // Visual/Simulation Notification state
  const [simulatedAlert, setSimulatedAlert] = useState<{ title: string; msg: string } | null>(null);

  // Helper: Find user avatar by UID
  const getUserProfile = (uid: string): UserProfile | undefined => {
    return roster.find(r => r.uid === uid);
  };

  // Safe Date Formatter
  const formatCompDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { 
      weekday: "short", 
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    });
  };

  // Calculate days remaining or past
  const getDaysDiffString = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compDate = new Date(dateStr);
    compDate.setHours(0, 0, 0, 0);

    const diffTime = compDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { text: "Starts TODAY!", isUpcoming: true, isCritical: true };
    } else if (diffDays > 0) {
      return { text: `In ${diffDays} day${diffDays > 1 ? 's' : ''}`, isUpcoming: true, isCritical: diffDays <= 7 };
    } else {
      return { text: `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`, isUpcoming: false, isCritical: false };
    }
  };

  // Sync / Load Competitions
  useEffect(() => {
    if (currentUser.isOfflineMock) {
      const syncMockComps = () => {
        const local = localStorage.getItem("axotic_mock_competitions");
        if (local) {
          try {
            setCompetitions(JSON.parse(local));
          } catch (_) {}
        } else {
          // Pre-populate with realistic robotics competitions
          const defaultComps: Competition[] = [
            {
              id: "comp-1",
              title: "FIRST Robotics Silicon Valley Regional",
              description: "The annual premiere FRC regional competition featuring 60 regional schools. High-stakes field plays, rapid engineering troubleshooting in pits, and heavy team collaboration.",
              date: new Date(Date.now() + 3600000 * 24 * 12).toISOString().split('T')[0], // 12 days from now
              location: "San Jose State Event Center, San Jose CA",
              link: "https://www.firstinspires.org/robotics/frc",
              createdBy: "mock-genu",
              creatorName: "Genu Kakisara (Lead)",
              createdAt: new Date().toISOString(),
              remindUserIds: ["mock-sarah", "mock-genu"],
              isRegistered: true,
              registeredName: "AXOTIC FRC Team #9999",
              registeredUserIds: ["mock-genu", "mock-sarah"]
            },
            {
              id: "comp-2",
              title: "VEX U National Autonomy Challenge",
              description: "Autonomous programming & hardware coordination challenge. Strictly collegiate-level teams playing in dual-alliance configurations with larger custom frame allowances.",
              date: new Date(Date.now() + 3600000 * 24 * 35).toISOString().split('T')[0], // 35 days from now
              location: "Kentucky International Exposition Center, Louisville KY",
              link: "https://www.vexrobotics.com/vexu",
              createdBy: "mock-bob",
              creatorName: "Bob Axel",
              createdAt: new Date().toISOString(),
              remindUserIds: ["mock-bob"],
              isRegistered: false,
              registeredName: "",
              registeredUserIds: []
            },
            {
              id: "comp-3",
              title: "RoboCup Autonomous Soccer Open",
              description: "Autonomous humanoid and wheeled robotics championship. Our navigation, vision, and kicker systems are put to the ultimate test against top engineering universities.",
              date: new Date(Date.now() - 3600000 * 24 * 14).toISOString().split('T')[0], // 14 days ago
              location: "Bordeaux Congress Center, Bordeaux France",
              link: "https://www.robocup.org/",
              createdBy: "mock-sarah",
              creatorName: "Sarah Connor",
              createdAt: new Date().toISOString(),
              remindUserIds: [],
              isRegistered: true,
              registeredName: "AXOTIC Robo Soccer Alliance",
              registeredUserIds: ["mock-bob", "mock-sarah"]
            }
          ];
          localStorage.setItem("axotic_mock_competitions", JSON.stringify(defaultComps));
          setCompetitions(defaultComps);
        }
        setLoading(false);
      };

      syncMockComps();
      window.addEventListener("axotic_db_update", syncMockComps);
      return () => window.removeEventListener("axotic_db_update", syncMockComps);
    } else {
      // Real database subscription
      const q = query(collection(db, "competitions"), orderBy("date", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: Competition[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Competition);
        });
        setCompetitions(list);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, "competitions");
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [currentUser.isOfflineMock]);

  // Handle Competition Addition
  const handleAddCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!newTitle.trim()) {
      setFormError("Competition Title is required.");
      return;
    }
    if (!newDate) {
      setFormError("Competition Date is required.");
      return;
    }
    if (!newLocation.trim()) {
      setFormError("Competition Location is required.");
      return;
    }

    setSubmitting(true);

    const compData = {
      title: newTitle.trim(),
      description: newDesc.trim(),
      date: newDate,
      location: newLocation.trim(),
      link: newLink.trim() || "",
      createdBy: currentUser.uid,
      creatorName: currentUser.displayName,
      createdAt: new Date().toISOString(),
      remindUserIds: [currentUser.uid], // Creator is auto-reminded
      isRegistered: newIsRegistered,
      registeredName: newIsRegistered ? newRegisteredName.trim() : "",
      registeredUserIds: newRegisteredUserIds
    };

    if (currentUser.isOfflineMock) {
      const local = localStorage.getItem("axotic_mock_competitions");
      const currentList: Competition[] = local ? JSON.parse(local) : [];
      const newComp: Competition = {
        id: `mock-comp-${Date.now()}`,
        ...compData,
        link: compData.link || ""
      };
      
      const updatedList = [...currentList, newComp].sort((a, b) => a.date.localeCompare(b.date));
      localStorage.setItem("axotic_mock_competitions", JSON.stringify(updatedList));
      
      // Global alert log mock
      await createGlobalNotification(
        "competition_created",
        `New competition added: ${newComp.title}`,
        newComp.id,
        currentUser
      );
      await createAdminLog(
        "competition_added",
        `Created upcoming competition: ${newComp.title}`,
        currentUser
      );

      window.dispatchEvent(new Event("axotic_db_update"));
      setSubmitting(false);
      resetForm();
    } else {
      try {
        const docRef = await addDoc(collection(db, "competitions"), compData);
        await createGlobalNotification(
          "competition_created",
          `New competition added: ${compData.title}`,
          docRef.id,
          currentUser
        );
        await createAdminLog(
          "competition_added",
          `Created upcoming competition: ${compData.title}`,
          currentUser
        );
        setSubmitting(false);
        resetForm();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.CREATE, "competitions");
        setFormError("Firestore Permission Denied. Members only can add competitions.");
        setSubmitting(false);
      }
    }
  };

  const resetForm = () => {
    setNewTitle("");
    setNewDesc("");
    setNewDate("");
    setNewLocation("");
    setNewLink("");
    setNewIsRegistered(false);
    setNewRegisteredName("");
    setNewRegisteredUserIds([]);
    setIsAddOpen(false);
  };

  // Toggle a user's registered state on the team's roster for a competition
  const toggleUserRegistration = async (comp: Competition) => {
    const isRegisteredOnTeam = (comp.registeredUserIds || []).includes(currentUser.uid);
    let updatedIds: string[];

    if (isRegisteredOnTeam) {
      updatedIds = (comp.registeredUserIds || []).filter(id => id !== currentUser.uid);
    } else {
      updatedIds = [...(comp.registeredUserIds || []), currentUser.uid];
    }

    if (currentUser.isOfflineMock) {
      const local = localStorage.getItem("axotic_mock_competitions");
      if (local) {
        const list: Competition[] = JSON.parse(local);
        const idx = list.findIndex(c => c.id === comp.id);
        if (idx !== -1) {
          list[idx].registeredUserIds = updatedIds;
          localStorage.setItem("axotic_mock_competitions", JSON.stringify(list));
          window.dispatchEvent(new Event("axotic_db_update"));
        }
      }
    } else {
      try {
        await updateDoc(doc(db, "competitions", comp.id), {
          registeredUserIds: updatedIds
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `competitions/${comp.id}`);
      }
    }
  };

  // Update overall registration status (Registered vs Interested) and registered team name
  const updateRegistrationInfo = async (comp: Competition, isRegistered: boolean, registeredName: string) => {
    if (currentUser.isOfflineMock) {
      const local = localStorage.getItem("axotic_mock_competitions");
      if (local) {
        const list: Competition[] = JSON.parse(local);
        const idx = list.findIndex(c => c.id === comp.id);
        if (idx !== -1) {
          list[idx].isRegistered = isRegistered;
          list[idx].registeredName = registeredName.trim();
          localStorage.setItem("axotic_mock_competitions", JSON.stringify(list));
          window.dispatchEvent(new Event("axotic_db_update"));
        }
      }
    } else {
      try {
        await updateDoc(doc(db, "competitions", comp.id), {
          isRegistered,
          registeredName: registeredName.trim()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `competitions/${comp.id}`);
      }
    }
  };

  // Toggle Reminder Request
  const toggleReminder = async (comp: Competition) => {
    const isReminded = (comp.remindUserIds || []).includes(currentUser.uid);
    let updatedIds: string[];

    if (isReminded) {
      updatedIds = (comp.remindUserIds || []).filter(id => id !== currentUser.uid);
    } else {
      updatedIds = [...(comp.remindUserIds || []), currentUser.uid];
    }

    if (currentUser.isOfflineMock) {
      const local = localStorage.getItem("axotic_mock_competitions");
      if (local) {
        const list: Competition[] = JSON.parse(local);
        const idx = list.findIndex(c => c.id === comp.id);
        if (idx !== -1) {
          list[idx].remindUserIds = updatedIds;
          localStorage.setItem("axotic_mock_competitions", JSON.stringify(list));
          window.dispatchEvent(new Event("axotic_db_update"));
        }
      }
    } else {
      try {
        await updateDoc(doc(db, "competitions", comp.id), {
          remindUserIds: updatedIds
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `competitions/${comp.id}`);
      }
    }
  };

  // Delete Competition
  const handleDeleteCompetition = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to remove the competition "${title}"?`)) return;

    if (currentUser.isOfflineMock) {
      const local = localStorage.getItem("axotic_mock_competitions");
      if (local) {
        const list: Competition[] = JSON.parse(local);
        const filtered = list.filter(c => c.id !== id);
        localStorage.setItem("axotic_mock_competitions", JSON.stringify(filtered));
        await createAdminLog(
          "competition_deleted",
          `Removed competition registry: ${title}`,
          currentUser
        );
        window.dispatchEvent(new Event("axotic_db_update"));
      }
    } else {
      try {
        await deleteDoc(doc(db, "competitions", id));
        await createAdminLog(
          "competition_deleted",
          `Removed competition registry: ${title}`,
          currentUser
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `competitions/${id}`);
      }
    }
  };

  // Simulated Reminder Dispatcher
  const triggerSimulatedReminder = (comp: Competition) => {
    const isUserRegistered = (comp.remindUserIds || []).includes(currentUser.uid);
    if (!isUserRegistered) {
      setSimulatedAlert({
        title: "Subscribe First!",
        msg: `You need to enable the 'Deadline Alerts' toggle switch first to register your telemetry contact for ${comp.title}.`
      });
      return;
    }

    setSimulatedAlert({
      title: "🚨 Competition Alert Reminder",
      msg: `REMINDER CHANNELS ACTIVE: "${comp.title}" is coming up on ${formatCompDate(comp.date)}! Check logistics, clean chassis assemblies, calibrate AprilTag camera streams, and pack active battery packs.`
    });

    // Create a real notifications entry
    createGlobalNotification(
      "competition_reminder",
      `Urgent reminder dispatch for ${comp.title}! Starts on ${formatCompDate(comp.date)}.`,
      comp.id,
      currentUser
    );
  };

  // Filter & Search Logic
  const filteredCompetitions = competitions.filter(comp => {
    const matchesSearch = 
      comp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.description.toLowerCase().includes(searchQuery.toLowerCase());

    const { isUpcoming } = getDaysDiffString(comp.date);
    if (filterType === "upcoming") return matchesSearch && isUpcoming;
    if (filterType === "past") return matchesSearch && !isUpcoming;
    return matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col space-y-6 text-left">
      {/* Simulation Banner Alert */}
      <AnimatePresence>
        {simulatedAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-blue-600 dark:bg-blue-900/40 text-white dark:text-blue-200 border border-blue-500/30 p-4 rounded-2xl shadow-xl flex items-start gap-3.5 relative overflow-hidden"
          >
            <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Trophy className="size-5 text-amber-300 animate-bounce" />
            </div>
            <div className="flex-1 pr-8">
              <h5 className="font-extrabold text-sm uppercase tracking-wider">{simulatedAlert.title}</h5>
              <p className="text-xs mt-1 leading-relaxed opacity-90 font-sans">{simulatedAlert.msg}</p>
            </div>
            <button 
              onClick={() => setSimulatedAlert(null)}
              className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-3xs relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <div className="size-12 md:size-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
            <Trophy className="size-6 md:size-7" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-black text-blue-500 tracking-widest font-mono">Competencies</span>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Competitions Portal</h1>
            <p className="text-xs text-slate-400 mt-1">Add robotics arena challenges, schedule countdowns, and broadcast telemetry reminders.</p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsAddOpen(true)}
          className="relative z-10 sm:self-center bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 px-5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Add Competition</span>
        </motion.button>

        {/* Dynamic Background visual */}
        <div className="absolute right-0 top-0 w-1/3 h-full bg-radial-gradient from-blue-500/10 to-transparent pointer-events-none opacity-40" />
      </div>

      {/* Filters and Search Bar row */}
      <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 shadow-3xs">
        {/* Search bar widget */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search matches or stadiums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 rounded-xl border border-slate-200/50 dark:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        {/* Filter Type toggles */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setFilterType("upcoming")}
            className={`flex-1 md:flex-none text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer ${
              filterType === "upcoming"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-3xs font-extrabold"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilterType("past")}
            className={`flex-1 md:flex-none text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer ${
              filterType === "past"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-3xs font-extrabold"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilterType("all")}
            className={`flex-1 md:flex-none text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer ${
              filterType === "all"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-3xs font-extrabold"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
            }`}
          >
            All Scheduled
          </button>
        </div>
      </div>

      {/* Competitions Card List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3.5">
          <div className="size-9 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Synchronizing arena streams...</p>
        </div>
      ) : filteredCompetitions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/20 text-center">
          <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">
            <Trophy className="size-6" />
          </div>
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wider">No Competitions Tracked</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
            There are no registered competitions matching the filter standard right now. Add one to keep the specialists reminded.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            Add First Competition
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCompetitions.map((comp) => {
            const { text, isUpcoming, isCritical } = getDaysDiffString(comp.date);
            const isUserReminded = (comp.remindUserIds || []).includes(currentUser.uid);

            return (
              <motion.div
                key={comp.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col h-full bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-2xl p-5 shadow-3xs hover:shadow-2xs transition-all flex-1 relative overflow-hidden"
              >
                {/* Competition countdown pill & registration status badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isUpcoming ? (
                      <span className={`text-[9px] font-black uppercase tracking-wider font-mono px-2 py-0.8 rounded-md border ${
                        isCritical
                          ? "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse"
                          : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      }`}>
                        {text}
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-wider font-mono px-2 py-0.8 rounded-md border bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200/40 dark:border-slate-700">
                        Completed
                      </span>
                    )}

                    {/* Official Registration Status Badge */}
                    {comp.isRegistered ? (
                      <span className="text-[9px] font-black uppercase tracking-wider font-mono px-2 py-0.8 rounded-md border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 flex items-center gap-1">
                        <Check className="size-2.5 stroke-[3px]" />
                        <span>Registered</span>
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-wider font-mono px-2 py-0.8 rounded-md border bg-amber-500/10 text-amber-600 dark:text-amber-450 border-amber-500/20 flex items-center gap-1">
                        <AlertCircle className="size-2.5" />
                        <span>Planning</span>
                      </span>
                    )}
                  </div>

                  {/* Actions for Creator / Admin */}
                  {(currentUser.role === "admin" || currentUser.uid === comp.createdBy) && (
                    <button
                      onClick={() => handleDeleteCompetition(comp.id, comp.title)}
                      title="Remove competition"
                      className="text-slate-350 hover:text-red-500 p-1 rounded-md hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>

                {/* Body Content */}
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight tracking-tight uppercase">
                      {comp.title}
                    </h3>
                    <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed mt-1.5 font-sans">
                      {comp.description || "No competition scope provided."}
                    </p>
                  </div>

                  {/* Countdown Timer Widget */}
                  <CountdownTimer targetDateStr={comp.date} />

                  {/* Telemetry info row (Date, Location) */}
                  <div className="space-y-2 border-y border-slate-100 dark:border-slate-900 py-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-blue-500 shrink-0" />
                      <span className="font-medium font-sans">
                        {formatCompDate(comp.date)}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="size-4 text-blue-500 shrink-0 mt-0.5" />
                      <span className="leading-tight truncate pr-1" title={comp.location}>
                        {comp.location}
                      </span>
                    </div>
                    {comp.link && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="size-4 text-blue-500 shrink-0" />
                        <a 
                          href={comp.link} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline font-bold truncate block"
                        >
                          Official Challenge Website
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Team Registration & Roster Section */}
                  <div className="pt-3.5 space-y-2.5">
                    {/* Header with edit button if creator/admin */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-black text-slate-450 dark:text-slate-400 tracking-wider font-mono">Team Registration</span>
                      {(currentUser.role === "admin" || currentUser.uid === comp.createdBy) && (
                        <button
                          onClick={() => {
                            if (editingRegCompId === comp.id) {
                              setEditingRegCompId(null);
                            } else {
                              setEditingRegCompId(comp.id);
                              setEditIsReg(comp.isRegistered || false);
                              setEditRegName(comp.registeredName || "");
                            }
                          }}
                          className="text-[10px] text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    {/* Registration Status and Team Name details */}
                    {editingRegCompId === comp.id ? (
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-2.5 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`edit-reg-${comp.id}`}
                            checked={editIsReg}
                            onChange={(e) => setEditIsReg(e.target.checked)}
                            className="rounded text-blue-600 size-3.5 border-slate-300 dark:border-slate-700 cursor-pointer"
                          />
                          <label htmlFor={`edit-reg-${comp.id}`} className="font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none">
                            Officially Registered
                          </label>
                        </div>
                        {editIsReg && (
                          <input
                            type="text"
                            placeholder="Official Registered Team Name"
                            value={editRegName}
                            onChange={(e) => setEditRegName(e.target.value)}
                            className="w-full text-xs px-2.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden"
                          />
                        )}
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingRegCompId(null)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400 font-bold text-[10px] rounded-md cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateRegistrationInfo(comp, editIsReg, editRegName);
                              setEditingRegCompId(null);
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded-md cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                        {comp.isRegistered ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                              <span>Registered for Challenge</span>
                            </div>
                            {comp.registeredName && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 py-1.5 px-2.5 rounded-lg border border-slate-100/40 dark:border-slate-900/40 font-medium">
                                Registered Name: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{comp.registeredName}</strong>
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-450 font-bold">
                            <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>Interested / In Planning Stage</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Registered Members of the Team */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-450 dark:text-slate-400 font-bold uppercase tracking-wider font-mono">
                        <span>{comp.isRegistered ? "Team Roster" : "Interested Team"} ({(comp.registeredUserIds || []).length})</span>
                        <button
                          onClick={() => toggleUserRegistration(comp)}
                          className="text-blue-500 hover:text-blue-600 normal-case font-extrabold flex items-center gap-1 cursor-pointer font-sans"
                        >
                          {(comp.registeredUserIds || []).includes(currentUser.uid) ? (
                            <span>✕ Leave Roster</span>
                          ) : (
                            <span>+ Join Roster</span>
                          )}
                        </button>
                      </div>

                      {(comp.registeredUserIds || []).length > 0 ? (
                        <div className="grid grid-cols-2 gap-1.5 bg-slate-50/50 dark:bg-slate-900/30 p-2 rounded-xl border border-slate-100/30 dark:border-slate-900/30">
                          {(comp.registeredUserIds || []).map((uid) => {
                            const p = getUserProfile(uid);
                            return (
                              <div key={uid} className="flex items-center gap-1.5 overflow-hidden">
                                <img
                                  src={p?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${uid}`}
                                  alt={p?.displayName || "Member"}
                                  className="size-5 rounded-md object-cover border border-slate-200/50 dark:border-slate-800 shrink-0"
                                />
                                <span className="text-[11px] font-sans font-medium text-slate-600 dark:text-slate-400 truncate" title={p?.displayName || "Anonymous Scholar"}>
                                  {p?.displayName || "Anonymous Scholar"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-sans italic p-2 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-lg border border-dashed border-slate-100 dark:border-slate-900/60">
                          No team members registered yet. Tap 'Join Roster' above.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Remind Registrants + Controls */}
                <div className="mt-4 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-900/80">
                  {/* Avatars of people getting reminded */}
                  <div className="flex items-center gap-2 text-left">
                    {(comp.remindUserIds || []).length > 0 ? (
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {(comp.remindUserIds || []).slice(0, 4).map((uid) => {
                          const p = getUserProfile(uid);
                          return (
                            <img
                              key={uid}
                              src={p?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${uid}`}
                              alt={p?.displayName || "Member"}
                              className="inline-block size-6 rounded-md border border-white dark:border-slate-950 shrink-0 object-cover"
                              title={p?.displayName || "Member"}
                            />
                          );
                        })}
                        {(comp.remindUserIds || []).length > 4 && (
                          <div className="size-6 rounded-md border border-white dark:border-slate-950 bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-450 dark:text-slate-400 flex items-center justify-center shrink-0">
                            +{(comp.remindUserIds || []).length - 4}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="size-6 rounded-md border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-350">
                        <Bell className="size-3" />
                      </div>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono tracking-wider font-semibold">
                      {(comp.remindUserIds || []).length} REMINDER{(comp.remindUserIds || []).length !== 1 ? 'S' : ''}
                    </span>
                  </div>

                  {/* Reminder interaction Buttons */}
                  <div className="flex gap-2.5 items-center justify-end">
                    {/* Toggle Switch */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-900 px-3 py-1.5 rounded-xl">
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider font-sans leading-none">
                          Deadline Alerts
                        </span>
                        <span className={`text-[8px] font-semibold font-mono tracking-wide mt-0.5 ${
                          isUserReminded ? "text-blue-500 dark:text-blue-400 animate-pulse" : "text-slate-400"
                        }`}>
                          {isUserReminded ? "SUBSCRIBED" : "OFF"}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleReminder(comp)}
                        id={`remind-toggle-${comp.id}`}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          isUserReminded ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-800"
                        }`}
                        role="switch"
                        aria-checked={isUserReminded}
                        title={isUserReminded ? "Unsubscribe from deadline alerts" : "Subscribe to deadline alerts"}
                      >
                        <span
                          className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            isUserReminded ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Simulated Alert triggers */}
                    {isUpcoming && (
                      <button
                        onClick={() => triggerSimulatedReminder(comp)}
                        id={`simulate-alert-${comp.id}`}
                        title="Simulate push notification reminder"
                        className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800 text-slate-500 hover:text-blue-500 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                      >
                        <Clock className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtitle created by info */}
                <div className="absolute bottom-1 right-2.5 text-[8px] font-mono text-slate-300 dark:text-slate-700 pointer-events-none uppercase">
                  By {comp.creatorName}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Competition Overlay Dialog Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200/40 dark:border-slate-800/80 z-10 flex flex-col max-h-[85vh]"
            >
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                    <Trophy className="size-4.5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-extrabold text-sm uppercase text-slate-800 dark:text-white tracking-wider">Register Arena Event</h3>
                    <p className="text-[10px] text-slate-400 font-mono">Fill out competition metrics</p>
                  </div>
                </div>
                <button
                  onClick={resetForm}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              <form onSubmit={handleAddCompetition} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
                {formError && (
                  <div className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase font-mono mb-1.5 tracking-wider">Competition Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FIRST Robotics National Championship"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500/50 placeholder:text-slate-400"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase font-mono mb-1.5 tracking-wider">Scope / Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details about registration deadlines, rules, pit locations, and active design assemblies involved..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500/50 placeholder:text-slate-400 resize-none"
                  />
                </div>

                {/* Grid row for Date and Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase font-mono mb-1.5 tracking-wider">Challenge Date *</label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500/50"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase font-mono mb-1.5 tracking-wider">Stadium / Location *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. San Jose Convention Center"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500/50 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Web Link */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase font-mono mb-1.5 tracking-wider">Official Website Link (optional)</label>
                  <input
                    type="url"
                    placeholder="https://www.vexrobotics.com/vexu"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500/50 placeholder:text-slate-400"
                  />
                </div>

                {/* Team Registration Status Toggle */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase font-mono mb-1.5 tracking-wider">Official Team Registration Status</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setNewIsRegistered(true);
                        if (!newRegisteredUserIds.includes(currentUser.uid)) {
                          setNewRegisteredUserIds([...newRegisteredUserIds, currentUser.uid]);
                        }
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                        newIsRegistered
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200/50 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850"
                      }`}
                    >
                      <span className={`size-2 rounded-full ${newIsRegistered ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>✓ Officially Registered</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewIsRegistered(false)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                        !newIsRegistered
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : "bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200/50 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850"
                      }`}
                    >
                      <span className={`size-2 rounded-full ${!newIsRegistered ? 'bg-amber-500' : 'bg-slate-400'}`} />
                      <span>Interested / Planning</span>
                    </button>
                  </div>
                </div>

                {/* Registered Team Name Input */}
                {newIsRegistered && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1.5"
                  >
                    <label className="block text-[9px] font-black text-slate-400 uppercase font-mono mb-1 tracking-wider">Registered Team Name *</label>
                    <input
                      type="text"
                      required={newIsRegistered}
                      placeholder="e.g. AXOTIC Robotics Team #2401"
                      value={newRegisteredName}
                      onChange={(e) => setNewRegisteredName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500/50 placeholder:text-slate-400"
                    />
                  </motion.div>
                )}

                {/* Initially Registered Members Checkboxes */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase font-mono mb-1.5 tracking-wider">
                    {newIsRegistered ? "Registered Team Members (Roster)" : "Interested Members / Planners"}
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-slate-200/50 dark:border-slate-800/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-900/40 space-y-2 text-left">
                    {roster.map((member) => {
                      const isChecked = newRegisteredUserIds.includes(member.uid);
                      return (
                        <label key={member.uid} className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-100/55 dark:hover:bg-slate-800/40 p-1.5 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setNewRegisteredUserIds(newRegisteredUserIds.filter(uid => uid !== member.uid));
                              } else {
                                setNewRegisteredUserIds([...newRegisteredUserIds, member.uid]);
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 size-4 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                          />
                          <img
                            src={member.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${member.uid}`}
                            alt={member.displayName}
                            className="size-6 rounded-md object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-sans font-medium flex-1 truncate">{member.displayName}</span>
                          {member.uid === currentUser.uid && (
                            <span className="text-[8px] font-mono font-bold bg-blue-500/10 text-blue-500 px-1 py-0.5 rounded">You</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800/60">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Deploying..." : "Add to Roster"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
