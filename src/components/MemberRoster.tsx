import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { 
  Shield, 
  Award, 
  User, 
  Users, 
  Trash2, 
  Calendar, 
  Pencil, 
  Check, 
  Search, 
  LayoutGrid,
  List,
  ExternalLink,
  Phone,
  Mail,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  Globe,
  Copy,
  CheckCheck,
  Plus,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  Sparkles
} from "lucide-react";
import { UserProfile, UserRole } from "../types";
import { resolveMemberRole, ROLE_COLOR_MAP } from "../roleUtils";
import { useWorkspaceSettings } from "../useWorkspaceSettings";
import TagInput from "./TagInput";
import { RosterGridSkeleton, WhoOnlineSkeleton } from "./DashboardSkeletons";

interface MemberRosterProps {
  currentUser: UserProfile;
  roster: UserProfile[];
}

export default function MemberRoster({ currentUser, roster }: MemberRosterProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // Linear view mode: "linear" (expandable rows) or "table" (compact data table)
  const [viewMode, setViewMode] = useState<"linear" | "table">(() => {
    const saved = localStorage.getItem("axotic_roster_view_mode");
    return (saved === "table" ? "table" : "linear");
  });

  const handleSetViewMode = (mode: "linear" | "table") => {
    setViewMode(mode);
    localStorage.setItem("axotic_roster_view_mode", mode);
  };
  
  // Set of expanded member IDs in the linear layout
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // By default, auto-expand the current logged in user so they immediately see how it works
    return new Set([currentUser.uid]);
  });

  const toggleExpand = (uid: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  const expandAll = (ids: string[]) => {
    setExpandedIds(new Set(ids));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Quick copy email feedback
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const handleCopyEmail = (e: React.MouseEvent, uid: string, email: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  // Custom specifications editing states (quick inline tag editor)
  const [editingSpecsId, setEditingSpecsId] = useState<string | null>(null);
  const [tempSpecsText, setTempSpecsText] = useState("");
  
  // Selected member for full dossier inspection modal
  const [selectedMemberDossier, setSelectedMemberDossier] = useState<UserProfile | null>(null);
  
  // Custom overlay feedback of alerts inside frame
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserProfile | null>(null);
  
  // Dynamic filter and directory search states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubTeam, setActiveSubTeam] = useState<string>("All");
  const [activeRoleFilter, setActiveRoleFilter] = useState<string>("All");

  // In-place profile override editing states
  const { customRoles, divisionTags, specialtyTags } = useWorkspaceSettings(currentUser.isOfflineMock);
  const [editingProfileUser, setEditingProfileUser] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("member");
  const [editCustomRoleId, setEditCustomRoleId] = useState<string>("core_engineer");
  const [editSubTeam, setEditSubTeam] = useState(divisionTags[0] || "General");
  const [editPhone, setEditPhone] = useState("");
  const [editHomepage, setEditHomepage] = useState("");
  const [editSpecs, setEditSpecs] = useState("");

  const isAdmin = currentUser.role === "admin";

  // Helper to ensure deleted division tags are never shown and always resolve to active registered divisions
  const resolveMemberDivision = (subTeam?: string): string => {
    const active = divisionTags && divisionTags.length > 0 ? divisionTags : ["General"];
    if (!subTeam) return active[0] || "General";
    const match = active.find(dt => dt.toLowerCase() === subTeam.toLowerCase());
    if (match) return match;
    // When subTeam was deleted (e.g. Software & Autonomy deleted from admin settings), always fall back to the active registered division tag
    return active[0] || "General";
  };

  // Auto-heal member records with deleted division tags or deleted custom roles in persistent storage & Firestore
  useEffect(() => {
    if (!roster || roster.length === 0) return;
    
    const fallbackDivision = (divisionTags && divisionTags.length > 0) ? divisionTags[0] : "General";
    
    // Check if any member has an unregistered division tag, deleted custom role, or old default tags
    const needsHeal = roster.some(m => {
      const isBadDivision = m.subTeam && divisionTags.length > 0 && !divisionTags.some(dt => dt.toLowerCase() === m.subTeam!.toLowerCase());
      const isBadRoleId = m.customRoleId && customRoles.length > 0 && !customRoles.some(r => r.id === m.customRoleId);
      const isBadRoleName = m.customRoleName && customRoles.length > 0 && !customRoles.some(r => r.name.toLowerCase() === m.customRoleName!.toLowerCase());
      const hasOldDefaultSpecs = m.specifications && (
        m.specifications.includes("ROS 2 & Autonomy") ||
        m.specifications.includes("PCB Design & KiCad") ||
        m.specifications.includes("Control Theory & PID")
      );
      return isBadDivision || isBadRoleId || isBadRoleName || hasOldDefaultSpecs;
    });

    if (needsHeal) {
      const fixed = roster.map(u => {
        let updated = { ...u };
        if (updated.specifications && (
          updated.specifications.includes("ROS 2 & Autonomy") ||
          updated.specifications.includes("PCB Design & KiCad") ||
          updated.specifications.includes("Control Theory & PID")
        )) {
          updated.specifications = "";
        }
        if (u.subTeam && divisionTags.length > 0 && !divisionTags.some(dt => dt.toLowerCase() === u.subTeam!.toLowerCase())) {
          updated.subTeam = fallbackDivision;
        }
        const hasMatchingRoleId = u.customRoleId && customRoles.some(r => r.id === u.customRoleId);
        const hasMatchingRoleName = u.customRoleName && customRoles.some(r => r.name.toLowerCase() === u.customRoleName!.toLowerCase());
        if ((u.customRoleId && !hasMatchingRoleId) || (u.customRoleName && !hasMatchingRoleName)) {
          const fallbackRole = customRoles.find(r => r.clearance === u.role) || customRoles.find(r => r.clearance !== "admin") || customRoles[0];
          if (fallbackRole) {
            updated.customRoleId = fallbackRole.id;
            updated.customRoleName = fallbackRole.name;
            updated.role = fallbackRole.clearance;
          }
        }
        return updated;
      });

      if (currentUser.isOfflineMock) {
        localStorage.setItem("axotic_mock_roster", JSON.stringify(fixed));
        if (fixed.some(m => m.uid === currentUser.uid)) {
          const myFixed = fixed.find(m => m.uid === currentUser.uid);
          if (myFixed) localStorage.setItem("axotic_local_auth", JSON.stringify(myFixed));
        }
        window.dispatchEvent(new Event("axotic_db_update"));
      } else {
        fixed.forEach(async (m) => {
          try {
            await updateDoc(doc(db, "users", m.uid), {
              subTeam: m.subTeam,
              customRoleId: m.customRoleId,
              customRoleName: m.customRoleName,
              role: m.role,
              specifications: m.specifications || ""
            });
          } catch (e) {
            console.warn(`Could not heal deleted role/division for user ${m.uid}`, e);
          }
        });
      }
    }
  }, [divisionTags, customRoles, roster, currentUser.isOfflineMock, currentUser.uid]);

  // Erase roster records (Admin only) - opens confirmation modal
  const handleDeleteMember = (targetUser: UserProfile) => {
    if (!isAdmin) {
      setErrorMsg("Access Restricted: Only administrators can remove members.");
      setTimeout(() => setErrorMsg(null), 5000);
      return;
    }
    if (targetUser.uid === currentUser.uid) {
      setErrorMsg("Action Blocked: You cannot remove yourself from the active roster.");
      setTimeout(() => setErrorMsg(null), 5000);
      return;
    }
    setDeleteConfirmUser(targetUser);
  };

  // Triggers final actual Firestore deletion on confirm
  const handleConfirmDeleteMember = async () => {
    if (!deleteConfirmUser) return;
    const targetUser = deleteConfirmUser;
    setDeleteConfirmUser(null);

    if (currentUser.isOfflineMock) {
      setLoadingId(targetUser.uid);
      const stored = localStorage.getItem("axotic_mock_roster");
      if (stored) {
        const rosterList: UserProfile[] = JSON.parse(stored);
        const filtered = rosterList.filter(u => u.uid !== targetUser.uid);
        localStorage.setItem("axotic_mock_roster", JSON.stringify(filtered));
        window.dispatchEvent(new Event("axotic_db_update"));
      }
      setLoadingId(null);
      setSuccessMsg(`Removed ${targetUser.displayName} from the roster.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      return;
    }

    try {
      setLoadingId(targetUser.uid);
      await deleteDoc(doc(db, "users", targetUser.uid));
      setSuccessMsg(`Removed ${targetUser.displayName} from the workspace database.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(`Failed to delete profile: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setErrorMsg(null), 8000);
      handleFirestoreError(err, OperationType.DELETE, `users/${targetUser.uid}`);
    } finally {
      setLoadingId(null);
    }
  };

  // Assign or Edit Member specifications (quick tag editor)
  const handleStartSpecsEdit = (member: UserProfile) => {
    setEditingSpecsId(member.uid);
    setTempSpecsText(member.specifications || "");
  };

  const handleSaveSpecifications = async (uid: string) => {
    if (currentUser.isOfflineMock) {
      setLoadingId(uid);
      const stored = localStorage.getItem("axotic_mock_roster");
      if (stored) {
        const rosterList: UserProfile[] = JSON.parse(stored);
        const idx = rosterList.findIndex(u => u.uid === uid);
        if (idx !== -1) {
          rosterList[idx].specifications = tempSpecsText.trim();
          localStorage.setItem("axotic_mock_roster", JSON.stringify(rosterList));

          // Sync local login profile if target is currently logged in user
          if (currentUser.uid === uid) {
            const updatedProfile = { ...currentUser, specifications: tempSpecsText.trim() };
            localStorage.setItem("axotic_local_auth", JSON.stringify(updatedProfile));
          }

          window.dispatchEvent(new Event("axotic_db_update"));
        }
      }
      setEditingSpecsId(null);
      setLoadingId(null);
      setSuccessMsg("Updated technical competencies.");
      setTimeout(() => setSuccessMsg(null), 4000);
      return;
    }

    try {
      setLoadingId(uid);
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, { specifications: tempSpecsText.trim() });
      setEditingSpecsId(null);
      setSuccessMsg("Updated technical competencies.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    } finally {
      setLoadingId(null);
    }
  };

  // Modal Profile Editor triggers
  const handleStartProfileEdit = (member: UserProfile) => {
    setEditingProfileUser(member);
    setEditRole(member.role || "member");
    setEditCustomRoleId(member.customRoleId || (member.role === "admin" ? "admin" : "core_engineer"));
    setEditSubTeam(resolveMemberDivision(member.subTeam));
    setEditPhone(member.phoneNumber || "");
    setEditHomepage(member.homepageUrl || "");
    setEditSpecs(member.specifications || "");
  };

  const handleSaveProfileOverride = async (uid: string) => {
    const chosenRole = customRoles.find(r => r.id === editCustomRoleId);
    const updatedClearance: UserRole = chosenRole ? chosenRole.clearance : editRole;
    const updatedRoleName = chosenRole ? chosenRole.name : "Core Engineer";

    if (currentUser.isOfflineMock) {
      setLoadingId(uid);
      const stored = localStorage.getItem("axotic_mock_roster");
      if (stored) {
        const rosterList: UserProfile[] = JSON.parse(stored);
        const idx = rosterList.findIndex(u => u.uid === uid);
        if (idx !== -1) {
          rosterList[idx].role = updatedClearance;
          rosterList[idx].customRoleId = chosenRole ? chosenRole.id : undefined;
          rosterList[idx].customRoleName = updatedRoleName;
          rosterList[idx].subTeam = editSubTeam.trim();
          rosterList[idx].phoneNumber = editPhone.trim();
          rosterList[idx].homepageUrl = editHomepage.trim();
          rosterList[idx].specifications = editSpecs.trim();
          localStorage.setItem("axotic_mock_roster", JSON.stringify(rosterList));

          // Sync local login profile if target is currently logged in user
          if (currentUser.uid === uid) {
            const updatedProfile = { 
              ...currentUser, 
              role: updatedClearance, 
              customRoleId: chosenRole ? chosenRole.id : undefined,
              customRoleName: updatedRoleName,
              subTeam: editSubTeam.trim(), 
              phoneNumber: editPhone.trim(),
              homepageUrl: editHomepage.trim(),
              specifications: editSpecs.trim()
            };
            localStorage.setItem("axotic_local_auth", JSON.stringify(updatedProfile));
          }

          window.dispatchEvent(new Event("axotic_db_update"));
        }
      }
      setEditingProfileUser(null);
      setLoadingId(null);
      setSuccessMsg("Updated member profile.");
      setTimeout(() => setSuccessMsg(null), 5000);
      return;
    }

    try {
      setLoadingId(uid);
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, { 
        role: updatedClearance, 
        customRoleId: chosenRole ? chosenRole.id : undefined,
        customRoleName: updatedRoleName,
        subTeam: editSubTeam.trim(), 
        phoneNumber: editPhone.trim(),
        homepageUrl: editHomepage.trim(),
        specifications: editSpecs.trim()
      });
      setEditingProfileUser(null);
      setSuccessMsg("Saved member profile changes.");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(`Failed to save settings: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setErrorMsg(null), 8000);
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    } finally {
      setLoadingId(null);
    }
  };

  // Roster metrics
  const totalCount = roster.length;
  const onlineCount = roster.filter(m => {
    if (m.uid === currentUser.uid) return true;
    if (m.isOnline !== true) return false;
    if (!m.lastActiveAt) return false;
    return Date.now() - new Date(m.lastActiveAt).getTime() < 5 * 60 * 1000;
  }).length;

  // Stable sort of roster members by joinedAt ascending, then by name or uid fallback
  const sortedRoster = [...roster].sort((a, b) => {
    const timeA = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
    const timeB = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    return (a.displayName || "").localeCompare(b.displayName || "") || (a.uid || "").localeCompare(b.uid || "");
  });

  // Apply filters on top of sorted roster
  const filteredRoster = sortedRoster.filter(member => {
    const query = searchQuery.toLowerCase().trim();
    const nameMatch = (member.displayName || "").toLowerCase().includes(query);
    const emailMatch = (member.email || "").toLowerCase().includes(query);
    const roleBadge = resolveMemberRole(member.customRoleId, member.customRoleName, member.role, customRoles);
    const roleMatch = roleBadge.name.toLowerCase().includes(query);
    const memberDivision = resolveMemberDivision(member.subTeam);
    const subTeamMatch = memberDivision.toLowerCase().includes(query);
    const specsMatch = (member.specifications || "").toLowerCase().includes(query);
    const matchesSearch = !query || nameMatch || emailMatch || roleMatch || subTeamMatch || specsMatch;

    const matchesSubTeam = activeSubTeam === "All" || memberDivision.toLowerCase() === activeSubTeam.toLowerCase();
    const matchesRole = activeRoleFilter === "All" || roleBadge.name === activeRoleFilter || member.customRoleId === activeRoleFilter;

    return matchesSearch && matchesSubTeam && matchesRole;
  });

  const subTeamsList = [
    "All",
    ...(divisionTags && divisionTags.length > 0 ? divisionTags : ["General"])
  ];

  return (
    <div id="member-roster-root" className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-6">
      
      {/* Toast Feedback Alerts */}
      {(errorMsg || successMsg) && (
        <div className="space-y-3">
          {errorMsg && (
            <div id="roster-error" className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2">
                <span className="size-2 bg-rose-500 rounded-full shrink-0 animate-ping" />
                {errorMsg}
              </span>
              <button type="button" onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-mono text-[11px] cursor-pointer">
                Dismiss
              </button>
            </div>
          )}
          {successMsg && (
            <div id="roster-success" className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2">
                <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {successMsg}
              </span>
              <button type="button" onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-mono text-[11px] cursor-pointer">
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modern Header & Metrics Summary */}
      <div id="roster-header-section" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xs text-left">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Title & Editorial Description */}
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Users className="size-3.5 text-blue-600 dark:text-blue-400" />
              <span>Team Directory</span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
              <span>Linear Expandable Roster</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Members & Specialists
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Click any member row to expand full dossier details, technical competencies, contact channels, and clearance status.
            </p>
          </div>

          {/* Clean Unboxed Metric Indicators */}
          <div className="flex items-center divide-x divide-slate-100 dark:divide-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 shrink-0">
            <div className="px-3.5 py-1 text-left">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Members</span>
              <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                {totalCount}
              </span>
            </div>
            <div className="px-3.5 py-1 text-left">
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block flex items-center gap-1.5">
                <span className="size-1.5 bg-emerald-500 rounded-full animate-pulse" /> Online
              </span>
              <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {onlineCount}
              </span>
            </div>
            <div className="px-3.5 py-1 text-left">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Divisions</span>
              <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
                {divisionTags.length}
              </span>
            </div>
            <div className="px-3.5 py-1 text-left">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Skills</span>
              <span className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400">
                {specialtyTags.length}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Directory Filter, Search & Layout View Control Bar */}
      <div id="roster-filter-hub" className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-left space-y-4">
        
        {/* Top Search & Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          
          {/* Search bar */}
          <div id="roster-search-field" className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, specialty tag, or division..."
              className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/60 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-xl text-xs outline-hidden text-slate-800 dark:text-slate-100 transition-all font-sans"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Right Action Island: Role Filter, Expand/Collapse & View Switcher */}
          <div className="flex items-center gap-2.5 self-start lg:self-auto shrink-0 flex-wrap">
            
            {/* Quick Expand All / Collapse All controls */}
            {viewMode === "linear" && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => expandAll(filteredRoster.map(m => m.uid))}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  title="Expand all member rows"
                >
                  <Maximize2 className="size-3" />
                  <span>Expand All</span>
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  title="Collapse all member rows"
                >
                  <Minimize2 className="size-3" />
                  <span>Collapse</span>
                </button>
              </div>
            )}

            {/* Role Filter Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Role:</span>
              <select
                value={activeRoleFilter}
                onChange={(e) => setActiveRoleFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-hidden cursor-pointer pr-1"
              >
                <option value="All">All Roles ({customRoles.length})</option>
                {customRoles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle: Linear vs Table */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleSetViewMode("linear")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "linear"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title="Linear Expandable View"
              >
                <List className="size-3.5" />
                <span>Linear</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode("table")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title="Dense Directory Table View"
              >
                <LayoutGrid className="size-3.5" />
                <span>Table</span>
              </button>
            </div>
          </div>

        </div>

        {/* Division Filter Segmented Tabs */}
        <div className="flex flex-wrap gap-1.5 items-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1.5 font-mono flex items-center gap-1">
            <Filter className="size-3 text-blue-500" /> Division:
          </span>
          {subTeamsList.map((team) => {
            const count = team === "All" 
              ? roster.length 
              : roster.filter(u => resolveMemberDivision(u.subTeam).toLowerCase() === team.toLowerCase()).length;

            const isActive = activeSubTeam === team;

            return (
              <button
                key={team}
                type="button"
                onClick={() => setActiveSubTeam(team)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-2xs"
                    : "bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60"
                }`}
              >
                <span>{team}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Filters Summary & Reset */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Showing <strong className="text-slate-800 dark:text-slate-200 font-semibold">{filteredRoster.length}</strong> of {totalCount} active team members</span>
            {(searchQuery || activeSubTeam !== "All" || activeRoleFilter !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveSubTeam("All");
                  setActiveRoleFilter("All");
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-xs cursor-pointer ml-1"
              >
                Reset Filters
              </button>
            )}
          </div>
          {viewMode === "linear" && (
            <span className="text-[11px] text-slate-400 italic hidden sm:inline">
              {expandedIds.size} of {filteredRoster.length} expanded
            </span>
          )}
        </div>

      </div>

      {/* Main Content Area: Linear Expandable List & Presence Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Column (3/4): Linear Expandable List or Table View */}
        <div className="lg:col-span-3 space-y-3">
          {roster.length === 0 ? (
            <RosterGridSkeleton count={6} />
          ) : filteredRoster.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-2xs">
              <div className="size-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700 text-slate-400">
                <User className="size-6 stroke-[1.5]" />
              </div>
              <h3 className="font-display font-bold text-sm text-slate-700 dark:text-slate-200">No matching members found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Adjust your search keywords or select another division tag to expand results.
              </p>
            </div>
          ) : viewMode === "linear" ? (

            /* ==================== LINEAR EXPANDABLE LIST ==================== */
            <div id="roster-linear-list" className="space-y-2.5">
              {filteredRoster.map((member) => {
                const isMe = member.uid === currentUser.uid;
                const isExpanded = expandedIds.has(member.uid);
                const memberDivision = resolveMemberDivision(member.subTeam);
                const roleBadge = resolveMemberRole(member.customRoleId, member.customRoleName, member.role, customRoles);

                const memberSpecialtyTags = member.specifications
                  ? member.specifications.split(",").map(s => s.trim()).filter(Boolean)
                  : [];

                const isOnline = (() => {
                  if (isMe) return true;
                  if (member.isOnline !== true) return false;
                  if (!member.lastActiveAt) return false;
                  return Date.now() - new Date(member.lastActiveAt).getTime() < 5 * 60 * 1000;
                })();

                return (
                  <div
                    key={member.uid}
                    id={`member-linear-${member.uid}`}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 overflow-hidden text-left ${
                      isExpanded 
                        ? "border-blue-500/50 dark:border-blue-500/50 shadow-md ring-1 ring-blue-500/20" 
                        : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
                    } ${isMe && !isExpanded ? "ring-1 ring-blue-400/40" : ""}`}
                  >
                    {/* Collapsed / Clickable Header Row */}
                    <div
                      onClick={() => toggleExpand(member.uid)}
                      className={`p-3.5 sm:p-4.5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors select-none ${
                        isExpanded ? "bg-slate-50/70 dark:bg-slate-800/40" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/25"
                      }`}
                    >
                      {/* Left: Avatar, Name, Email, Division */}
                      <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                        
                        {/* Avatar with Online Ring */}
                        <div className="relative shrink-0">
                          <img
                            referrerPolicy="no-referrer"
                            src={member.avatarUrl || undefined}
                            alt={member.displayName}
                            className="size-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 object-cover"
                          />
                          <span 
                            className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                              isOnline ? "bg-emerald-500 animate-[pulse_2s_infinite]" : "bg-slate-300 dark:bg-slate-600"
                            }`}
                            title={isOnline ? "Online Now" : "Offline"}
                          />
                        </div>

                        {/* Name, Division, Role */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight truncate">
                              {member.displayName}
                            </h3>
                            {isMe && (
                              <span className="px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-400 text-[9px] font-bold rounded">
                                You
                              </span>
                            )}
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate hidden md:inline">
                              {member.email}
                            </span>
                          </div>

                          {/* Linear Subtitle: Role & Division */}
                          <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <div className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                              <span className={`size-1.5 rounded-full shrink-0 ${roleBadge.dotClass}`} />
                              <span>{roleBadge.name}</span>
                            </div>
                            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{memberDivision}</span>
                            
                            {/* Preview top 2 specialty tags if not expanded */}
                            {!isExpanded && memberSpecialtyTags.length > 0 && (
                              <>
                                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700 hidden lg:inline">·</span>
                                <div className="hidden lg:flex items-center gap-1">
                                  {memberSpecialtyTags.slice(0, 2).map(tag => (
                                    <span key={tag} className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 rounded font-sans">
                                      {tag}
                                    </span>
                                  ))}
                                  {memberSpecialtyTags.length > 2 && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      +{memberSpecialtyTags.length - 2}
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Right: Presence Status, Action Icons, Expand Chevron */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60">
                        
                        {/* Online status indicator */}
                        <div className="flex items-center gap-1.5">
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium border border-emerald-200/60 dark:border-emerald-900/60">
                              <span className="size-1.5 bg-emerald-500 rounded-full animate-pulse" /> Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-slate-400 dark:text-slate-500">
                              <span className="size-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" /> Offline
                            </span>
                          )}
                        </div>

                        {/* Quick Action Buttons (Edit / Remove) */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {(isAdmin || isMe) && (
                            <button
                              type="button"
                              onClick={() => handleStartProfileEdit(member)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Edit Member Profile"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          )}
                          {isAdmin && !isMe && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(member)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Remove Member"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Interactive Rotating Chevron */}
                        <div className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                          <ChevronDown className={`size-4.5 transition-transform duration-200 ${isExpanded ? "rotate-180 text-blue-600 dark:text-blue-400" : ""}`} />
                        </div>

                      </div>
                    </div>

                    {/* ==================== EXPANDED DRAWER CONTENT ==================== */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                          className="overflow-hidden border-t border-slate-100 dark:border-slate-800"
                        >
                          <div className="p-5 bg-white dark:bg-slate-900/90 space-y-5">
                            
                            {/* Detailed Grid: Contact & Specs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
                              
                              {/* Left Column: Direct Contacts & Profile Metadata */}
                              <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                                  Contact & Clearance Information
                                </h4>

                                <div className="space-y-2 text-xs">
                                  {/* Email with copy shortcut */}
                                  <div className="flex items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-700/40">
                                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                      <Mail className="size-3 text-slate-400" /> Email:
                                    </span>
                                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                                      <span>{member.email}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopyEmail(e, member.uid, member.email)}
                                        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer p-0.5"
                                        title="Copy email"
                                      >
                                        {copiedUid === member.uid ? (
                                          <CheckCheck className="size-3 text-emerald-500" />
                                        ) : (
                                          <Copy className="size-3" />
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Phone number */}
                                  <div className="flex items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-700/40">
                                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                      <Phone className="size-3 text-slate-400" /> Phone:
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                                      {member.phoneNumber ? (
                                        <a href={`tel:${member.phoneNumber}`} className="hover:underline hover:text-blue-600">
                                          {member.phoneNumber}
                                        </a>
                                      ) : (
                                        <span className="text-slate-400 italic">None provided</span>
                                      )}
                                    </span>
                                  </div>

                                  {/* Portfolio / Website */}
                                  <div className="flex items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-700/40">
                                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                      <Globe className="size-3 text-slate-400" /> Portfolio:
                                    </span>
                                    {member.homepageUrl ? (
                                      <a
                                        href={member.homepageUrl.startsWith("http") ? member.homepageUrl : `https://${member.homepageUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                                      >
                                        <span>{member.homepageUrl.replace(/^https?:\/\//, "")}</span>
                                        <ExternalLink className="size-2.5" />
                                      </a>
                                    ) : (
                                      <span className="text-slate-400 italic">None provided</span>
                                    )}
                                  </div>

                                  {/* Joined Date */}
                                  <div className="flex items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-700/40">
                                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                      <Calendar className="size-3 text-slate-400" /> Active Since:
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                      {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "Active Member"}
                                    </span>
                                  </div>

                                  {/* Clearance Scope */}
                                  <div className="flex items-center justify-between py-1">
                                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                      <Shield className="size-3 text-slate-400" /> Clearance Level:
                                    </span>
                                    <span className="font-mono font-semibold text-[10px] uppercase text-slate-700 dark:text-slate-300">
                                      {member.role === "admin" ? "Administrative Root" : member.role === "moderator" ? "Operations Moderator" : "Team Member"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right Column: Engineering Competencies & In-place tag editing */}
                              <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                                    Engineering Specialties & Competencies
                                  </h4>
                                  {(isAdmin || isMe) && editingSpecsId !== member.uid && (
                                    <button
                                      type="button"
                                      onClick={() => handleStartSpecsEdit(member)}
                                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Pencil className="size-2.5" /> Edit Tags
                                    </button>
                                  )}
                                </div>

                                {editingSpecsId === member.uid ? (
                                  <div className="space-y-2.5 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                                    <TagInput
                                      value={tempSpecsText}
                                      onChange={(val) => setTempSpecsText(val)}
                                      suggestions={specialtyTags}
                                      placeholder="Type competency and press Enter or comma..."
                                    />
                                    <div className="flex items-center gap-2 justify-end pt-1">
                                      <button
                                        type="button"
                                        onClick={() => setEditingSpecsId(null)}
                                        className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveSpecifications(member.uid)}
                                        disabled={loadingId === member.uid}
                                        className="px-3.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5"
                                      >
                                        <Check className="size-3" /> Save Changes
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {memberSpecialtyTags.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {memberSpecialtyTags.map((tag) => (
                                          <span
                                            key={tag}
                                            className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium border border-slate-200/80 dark:border-slate-700 shadow-3xs"
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="p-4 bg-white/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                                        <p className="text-xs text-slate-400 italic">No technical specialties or tags registered yet.</p>
                                        {(isAdmin || isMe) && (
                                          <button
                                            type="button"
                                            onClick={() => handleStartSpecsEdit(member)}
                                            className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                          >
                                            <Plus className="size-3" /> Add Engineering Tags
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                            </div>

                            {/* Expanded Action Toolbar */}
                            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedMemberDossier(member)}
                                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                  <User className="size-3.5" /> Full Inspection Modal
                                </button>
                                {(isAdmin || isMe) && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartProfileEdit(member)}
                                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-blue-200/60 dark:border-blue-800/60"
                                  >
                                    <Pencil className="size-3.5" /> Edit Profile Details
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {isAdmin && !isMe && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMember(member)}
                                    className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                                  >
                                    <Trash2 className="size-3.5" /> Remove
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(member.uid)}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium cursor-pointer"
                                >
                                  Collapse
                                </button>
                              </div>
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                );
              })}
            </div>
          ) : (

            /* ==================== DIRECTORY TABLE VIEW ==================== */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden text-left">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Division</th>
                      <th className="py-3 px-4">Specialties</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRoster.map((member) => {
                      const isMe = member.uid === currentUser.uid;
                      const memberDivision = resolveMemberDivision(member.subTeam);
                      const roleBadge = resolveMemberRole(member.customRoleId, member.customRoleName, member.role, customRoles);
                      const memberSpecialtyTags = member.specifications
                        ? member.specifications.split(",").map(s => s.trim()).filter(Boolean)
                        : [];

                      const isOnline = (() => {
                        if (isMe) return true;
                        if (member.isOnline !== true) return false;
                        if (!member.lastActiveAt) return false;
                        return Date.now() - new Date(member.lastActiveAt).getTime() < 5 * 60 * 1000;
                      })();

                      return (
                        <tr 
                          key={member.uid} 
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                          onClick={() => setSelectedMemberDossier(member)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <img
                                  referrerPolicy="no-referrer"
                                  src={member.avatarUrl || undefined}
                                  alt=""
                                  className="size-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 object-cover"
                                />
                                {isMe && (
                                  <span className="absolute -top-1 -left-1 px-1 py-0.2 bg-blue-600 text-white font-sans text-[7px] uppercase tracking-wider font-extrabold rounded select-none">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-800 dark:text-slate-100 block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                  {member.displayName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block truncate">
                                  {member.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                              <span className={`size-1.5 rounded-full ${roleBadge.dotClass}`} />
                              <span className="font-medium">{roleBadge.name}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {memberDivision}
                            </span>
                          </td>

                          <td className="py-3 px-4 max-w-[220px]">
                            {memberSpecialtyTags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {memberSpecialtyTags.slice(0, 3).map((tag) => (
                                  <span 
                                    key={tag}
                                    className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[100px]"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {memberSpecialtyTags.length > 3 && (
                                  <span className="px-1 py-0.5 text-[9px] font-mono text-slate-400">
                                    +{memberSpecialtyTags.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">None</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {member.phoneNumber || "—"}
                          </td>

                          <td className="py-3 px-4">
                            {isOnline ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                <span className="size-1.5 bg-emerald-500 rounded-full animate-pulse" /> Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                                <span className="size-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" /> Offline
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedMemberDossier(member)}
                                className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                              >
                                View
                              </button>
                              {(isAdmin || isMe) && (
                                <button
                                  type="button"
                                  onClick={() => handleStartProfileEdit(member)}
                                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                                  title="Edit"
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                              )}
                              {isAdmin && !isMe && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMember(member)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                  title="Remove"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1/4): Who's Online Presence Panel */}
        <div className="lg:col-span-1 space-y-4">
          {roster.length === 0 ? (
            <WhoOnlineSkeleton />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden text-left">
              {/* Panel Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="font-display font-bold text-xs text-slate-900 dark:text-white tracking-tight">Active Presence</h3>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60">
                  {onlineCount} Online
                </span>
              </div>

              {/* Online Members List */}
              <div className="p-3 space-y-2">
                {onlineCount === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-slate-400 italic">No members currently active.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[460px] overflow-y-auto">
                    {sortedRoster
                      .filter(m => {
                        if (m.uid === currentUser.uid) return true;
                        if (m.isOnline !== true) return false;
                        if (!m.lastActiveAt) return false;
                        return Date.now() - new Date(m.lastActiveAt).getTime() < 5 * 60 * 1000;
                      })
                      .map((member) => {
                        const isMe = member.uid === currentUser.uid;
                        const division = resolveMemberDivision(member.subTeam);

                        return (
                          <div 
                            key={member.uid} 
                            onClick={() => {
                              // Expand this member in the linear view and scroll
                              toggleExpand(member.uid);
                              const el = document.getElementById(`member-linear-${member.uid}`);
                              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                            }}
                            className="flex items-center justify-between py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-xl transition-colors"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <img
                                  referrerPolicy="no-referrer"
                                  src={member.avatarUrl || undefined}
                                  alt={member.displayName}
                                  className="size-7.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 object-cover"
                                />
                                <span className="absolute -bottom-0.5 -right-0.5 size-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-[pulse_1.5s_infinite]" />
                              </div>
                              <div className="min-w-0 text-left">
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1">
                                  {member.displayName}
                                  {isMe && <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400">(You)</span>}
                                </p>
                                <span className="text-[10px] text-slate-400 font-mono truncate block">{member.email}</span>
                              </div>
                            </div>

                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0 ml-1">
                              {division}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
                
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                  <span className="size-1.5 bg-emerald-500 rounded-full inline-block" />
                  <span>Real-time presence monitoring</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ==================== MEMBER DOSSIER MODAL ==================== */}
      {selectedMemberDossier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-6 text-left animate-in fade-in zoom-in-95 duration-200 relative">
            <button
              type="button"
              onClick={() => setSelectedMemberDossier(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="size-4.5" />
            </button>

            {/* Dossier Header */}
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <img
                  referrerPolicy="no-referrer"
                  src={selectedMemberDossier.avatarUrl || undefined}
                  alt={selectedMemberDossier.displayName}
                  className="size-16 rounded-2xl border-2 border-white dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-800 object-cover"
                />
                <span className={`absolute -bottom-1 -right-1 size-3.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                  selectedMemberDossier.isOnline || selectedMemberDossier.uid === currentUser.uid ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                }`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {selectedMemberDossier.displayName}
                  </h2>
                  {selectedMemberDossier.uid === currentUser.uid && (
                    <span className="px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-400 font-mono text-[9px] font-bold rounded">
                      You
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedMemberDossier.email}</p>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {(() => {
                    const roleBadge = resolveMemberRole(selectedMemberDossier.customRoleId, selectedMemberDossier.customRoleName, selectedMemberDossier.role, customRoles);
                    return (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                        <span className={`size-1.5 rounded-full ${roleBadge.dotClass}`} />
                        {roleBadge.name}
                      </span>
                    );
                  })()}

                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {resolveMemberDivision(selectedMemberDossier.subTeam)}
                  </span>
                </div>
              </div>
            </div>

            {/* Dossier Details Card */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                <span className="text-slate-400">Phone Number:</span>
                <span className="font-semibold font-mono text-slate-800 dark:text-slate-100">{selectedMemberDossier.phoneNumber || "Not provided"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                <span className="text-slate-400">Portfolio Website:</span>
                {selectedMemberDossier.homepageUrl ? (
                  <a
                    href={selectedMemberDossier.homepageUrl.startsWith("http") ? selectedMemberDossier.homepageUrl : `https://${selectedMemberDossier.homepageUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>{selectedMemberDossier.homepageUrl.replace(/^https?:\/\//, "")}</span>
                    <ExternalLink className="size-3" />
                  </a>
                ) : (
                  <span className="text-slate-400 italic">None</span>
                )}
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                <span className="text-slate-400">Joined Team:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {selectedMemberDossier.joinedAt ? new Date(selectedMemberDossier.joinedAt).toLocaleDateString() : "Active Member"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Clearance:</span>
                <span className="font-mono font-semibold text-[10px] uppercase text-slate-700 dark:text-slate-300">
                  {selectedMemberDossier.role}
                </span>
              </div>
            </div>

            {/* Competency Tags in Dossier */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono block">
                Specialties & Competencies
              </span>
              {selectedMemberDossier.specifications ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedMemberDossier.specifications.split(",").map(s => s.trim()).filter(Boolean).map(tag => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">No registered specialties yet.</span>
              )}
            </div>

            {/* Dossier Footer Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
              {(isAdmin || selectedMemberDossier.uid === currentUser.uid) && (
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedMemberDossier;
                    setSelectedMemberDossier(null);
                    handleStartProfileEdit(target);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Pencil className="size-3.5" /> Edit Profile
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedMemberDossier(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EDIT PROFILE DETAILS MODAL ==================== */}
      {editingProfileUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 text-left animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Pencil className="size-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                    Edit Member Profile
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{editingProfileUser.displayName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProfileUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveProfileOverride(editingProfileUser.uid);
              }}
              className="space-y-4 text-left"
            >
              {/* Assigned Role */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  Role Designation
                </label>
                <select
                  value={editCustomRoleId}
                  onChange={(e) => {
                    const chosen = customRoles.find(r => r.id === e.target.value);
                    setEditCustomRoleId(e.target.value);
                    if (chosen) setEditRole(chosen.clearance);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-hidden cursor-pointer"
                >
                  {customRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.clearance === "admin" ? "Admin Clearance" : "Standard"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Division Tag */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  Division / Department
                </label>
                <select
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs rounded-xl px-3 py-2 outline-hidden text-slate-800 dark:text-slate-100 font-medium cursor-pointer"
                  value={editSubTeam}
                  onChange={(e) => setEditSubTeam(e.target.value)}
                >
                  {divisionTags.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                  <option value="General">General</option>
                </select>
              </div>

              {/* Engineering Competency Tags (TagInput) */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  Specialties & Technical Competencies
                </label>
                <TagInput
                  value={editSpecs}
                  onChange={(val) => setEditSpecs(val)}
                  suggestions={specialtyTags}
                  placeholder="Type competency and press Enter or comma..."
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Select from registered competencies or type new technical skills.
                </span>
              </div>

              {/* Phone & Homepage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 019-2834"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs rounded-xl px-3 py-2 outline-hidden text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                    Website / Portfolio
                  </label>
                  <input
                    type="url"
                    value={editHomepage}
                    onChange={(e) => setEditHomepage(e.target.value)}
                    placeholder="https://portfolio.dev"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs rounded-xl px-3 py-2 outline-hidden text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProfileUser(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingId === editingProfileUser.uid}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="size-3.5" />
                  <span>{loadingId === editingProfileUser.uid ? "Saving..." : "Save Profile"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== REMOVE CONFIRMATION DIALOG ==================== */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-55 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200 dark:border-rose-900/50 flex items-center justify-center shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-base text-slate-800 dark:text-white">
                  Remove Member?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Are you sure you want to remove <strong className="text-slate-800 dark:text-slate-200">{deleteConfirmUser.displayName}</strong> from the team roster?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMember}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
