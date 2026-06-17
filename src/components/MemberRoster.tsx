import React, { useState } from "react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { 
  Shield, 
  ShieldAlert, 
  Award, 
  User, 
  Users, 
  Trash2, 
  Calendar, 
  HardDrive, 
  GraduationCap, 
  Pencil, 
  Check, 
  FileText, 
  Search, 
  SlidersHorizontal, 
  Sparkles, 
  Cpu, 
  Layers, 
  Code
} from "lucide-react";
import { UserProfile, UserRole } from "../types";
import TagInput from "./TagInput";

interface MemberRosterProps {
  currentUser: UserProfile;
  roster: UserProfile[];
}

export default function MemberRoster({ currentUser, roster }: MemberRosterProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // Custom specifications editing states
  const [editingSpecsId, setEditingSpecsId] = useState<string | null>(null);
  const [tempSpecsText, setTempSpecsText] = useState("");
  
  // Custom overlay feedback of alerts inside frame
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserProfile | null>(null);
  
  // Dynamic filter and directory search states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubTeam, setActiveSubTeam] = useState<string>("All");

  const isAdmin = currentUser.role === "admin";

  // Grant role access override (Admin only)
  const handleToggleRole = async (targetUser: UserProfile) => {
    if (!isAdmin) {
      setErrorMsg("Access Restricted: Only system administrators can override roster clearance roles.");
      setTimeout(() => setErrorMsg(null), 5000);
      return;
    }

    if (targetUser.uid === currentUser.uid) {
      setErrorMsg("Self-Mutation Blocked: You cannot demote your own administrator profile.");
      setTimeout(() => setErrorMsg(null), 5000);
      return;
    }

    const nextRole: UserRole = targetUser.role === "admin" ? "member" : "admin";
    
    if (currentUser.isOfflineMock) {
      setLoadingId(targetUser.uid);
      const stored = localStorage.getItem("axotic_mock_roster");
      if (stored) {
        const rosterList: UserProfile[] = JSON.parse(stored);
        const idx = rosterList.findIndex(u => u.uid === targetUser.uid);
        if (idx !== -1) {
          rosterList[idx].role = nextRole;
          localStorage.setItem("axotic_mock_roster", JSON.stringify(rosterList));
          window.dispatchEvent(new Event("axotic_db_update"));
        }
      }
      setLoadingId(null);
      setSuccessMsg(`Successfully toggled ${targetUser.displayName}'s role to ${nextRole} in local sandbox.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      return;
    }

    try {
      setLoadingId(targetUser.uid);
      const userRef = doc(db, "users", targetUser.uid);
      await updateDoc(userRef, { role: nextRole });
      setSuccessMsg(`Successfully updated ${targetUser.displayName}'s role to ${nextRole} (real-time sync).`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.uid}`);
    } finally {
      setLoadingId(null);
    }
  };

  // Erase roster records (Admin only) - opens elegant overlay modal
  const handleDeleteMember = (targetUser: UserProfile) => {
    if (!isAdmin) {
      setErrorMsg("Access Restricted: Only system administrators can remove members.");
      setTimeout(() => setErrorMsg(null), 5000);
      return;
    }
    if (targetUser.uid === currentUser.uid) {
      setErrorMsg("Self-Mutation Blocked: You cannot dismiss yourself from the roster.");
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
      setSuccessMsg(`Dismissed member ${targetUser.displayName} from local roster sandbox.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      return;
    }

    try {
      setLoadingId(targetUser.uid);
      await deleteDoc(doc(db, "users", targetUser.uid));
      setSuccessMsg(`Dismissed member ${targetUser.displayName} from workspace database.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(`Failed to delete profile: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setErrorMsg(null), 8000);
      handleFirestoreError(err, OperationType.DELETE, `users/${targetUser.uid}`);
    } finally {
      setLoadingId(null);
    }
  };

  // Assign or Edit Member specifications (Admin only)
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
      return;
    }

    try {
      setLoadingId(uid);
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, { specifications: tempSpecsText.trim() });
      setEditingSpecsId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    } finally {
      setLoadingId(null);
    }
  };

  // Roster summaries
  const totalCount = roster.length;
  const adminCount = roster.filter(u => u.role === "admin").length;

  // Stable sort of roster members by joinedAt ascending, then by name or uid fallback
  const sortedRoster = [...roster].sort((a, b) => {
    const timeA = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
    const timeB = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    return (a.displayName || "").localeCompare(b.displayName || "") || (a.uid || "").localeCompare(b.uid || "");
  });

  // Apply filters on top of sorted roster
  const filteredRoster = sortedRoster.filter(member => {
    const query = searchQuery.toLowerCase();
    const nameMatch = (member.displayName || "").toLowerCase().includes(query);
    const emailMatch = (member.email || "").toLowerCase().includes(query);
    const matchesSearch = nameMatch || emailMatch;

    const matchesSubTeam = activeSubTeam === "All" || member.subTeam === activeSubTeam;

    return matchesSearch && matchesSubTeam;
  });

  const subTeamsList = ["All"];

  return (
    <div id="member-roster-root" className="w-full max-w-7xl mx-auto px-1 py-4 space-y-8">
      
      {/* Toast / Global Feedback Banners */}
      {(errorMsg || successMsg) && (
        <div className="space-y-3">
          {errorMsg && (
            <div id="roster-error" className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 font-semibold flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2">
                <span className="size-2 bg-rose-500 rounded-full shrink-0 animate-ping" />
                {errorMsg}
              </span>
              <button type="button" onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-slate-600 font-mono text-[10px] cursor-pointer">dismiss</button>
            </div>
          )}
          {successMsg && (
            <div id="roster-success" className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 font-semibold flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2">
                <Award className="size-4 text-emerald-600 shrink-0" />
                {successMsg}
              </span>
              <button type="button" onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-slate-600 font-mono text-[10px] cursor-pointer">dismiss</button>
            </div>
          )}
        </div>
      )}

      {/* Modern High-End Board Header & Stats Grid */}
      <div id="roster-header-section" className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl relative overflow-hidden text-left">
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 opacity-90 z-0" />
        
        {/* Subtle architectural background line */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl z-0" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/5 rounded-full blur-2xl z-0" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">
                <Sparkles className="size-3" /> AXOTIC Robotics Workspace
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-black tracking-tight text-white">
                Team Directory & Competencies
              </h1>
              <p className="text-xs text-slate-400 mt-1.5 max-w-2xl font-sans leading-relaxed">
                Explore real-time specialist mappings, hardware engineering subdivisions, and authorized administrative credentials for the active robotics program.
              </p>
            </div>

            {/* Total member badge card representation */}
            <div className="bg-slate-950/40 backdrop-blur-md px-6 py-4 rounded-2xl border border-slate-800 flex items-center gap-4 shrink-0">
              <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/20">
                <Users className="size-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Authorized Team</span>
                <span className="text-2xl font-black font-mono text-white flex items-baseline gap-1">
                  {totalCount} <span className="text-xs text-slate-500 font-normal">Active</span>
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Directory Filter & Search Control Bar */}
      <div id="roster-filter-hub" className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs text-left space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Magnifying search bar with focus ring and clear icon */}
          <div id="roster-search-field" className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-3 size-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search directory by name or email address..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs outline-hidden text-slate-800 focus:ring-4 focus:ring-blue-100 transition-all font-sans"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-2.5 text-[10px] font-mono font-bold text-slate-400 hover:text-slate-800 hover:underline cursor-pointer"
              >
                clear
              </button>
            )}
          </div>



        </div>

        {/* Dynamic Secondary Filters and Matches Summary */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 gap-3 font-sans">
          
          {/* Matches Counter with clear-all override state */}
          <div className="flex items-center gap-2">
            <span>Showing <strong>{filteredRoster.length}</strong> of {totalCount} active team members</span>
            {(searchQuery || activeSubTeam !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveSubTeam("All");
                }}
                className="text-blue-600 hover:text-blue-800 font-bold text-[10px] uppercase tracking-wider cursor-pointer underline underline-offset-2 ml-1"
              >
                Reset Filters
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Directory Grid of Beautiful Member Cards */}
      {filteredRoster.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-2xs">
          <div className="size-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto border border-slate-100 text-slate-400">
            <User className="size-6 stroke-[1.5]" />
          </div>
          <h3 className="font-display font-bold text-sm text-slate-700">No matching members found</h3>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
            Adjust your search keywords, class filter or select another sub-team tab to expand results.
          </p>
        </div>
      ) : (
        <div id="roster-members-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoster.map((member) => {
            const isMe = member.uid === currentUser.uid;
            
            // Map color styles cleanly for custom card accent frames
            let subTeamAccentColor = "border-t-slate-300";
            let subTeamGradient = "from-slate-50/10 to-slate-100/5";
            let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
            let subTeamIcon = <User className="size-3" />;

            // Slice out specifications into individual specialty tags
            const specialtyTags = member.specifications
              ? member.specifications.split(",").map(s => s.trim()).filter(Boolean)
              : [];

            // Compute if member is online
            const isOnline = (() => {
              if (isMe) return true;
              if (member.isOnline !== true) return false;
              if (!member.lastActiveAt) return false;
              const activeTime = new Date(member.lastActiveAt).getTime();
              return Date.now() - activeTime < 5 * 60 * 1000;
            })();

            return (
              <div
                key={member.uid}
                id={`member-node-${member.uid}`}
                className={`group bg-white rounded-2xl border-t-4 border-r border-b border-l border-r-slate-250/60 border-b-slate-250/60 border-l-slate-250/60 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${subTeamAccentColor} ${
                  isMe ? "ring-2 ring-blue-500/60 shadow-lg" : ""
                }`}
              >
                
                {/* Visual Header / Avatar Banner area */}
                <div className={`p-5 space-y-4 bg-gradient-to-b ${subTeamGradient}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <img
                          referrerPolicy="no-referrer"
                          src={member.avatarUrl}
                          alt={member.displayName}
                          className="size-12 rounded-xl border-2 border-white shadow-md bg-slate-100 shrink-0 object-cover"
                        />
                        {isMe && (
                          <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 bg-blue-600 text-white font-sans text-[7px] uppercase tracking-wider font-extrabold rounded shadow-2xs select-none">
                            You
                          </span>
                        )}
                      </div>

                      <div className="text-left min-w-0">
                        <h3 className="font-display font-extrabold text-sm text-slate-800 tracking-tight truncate group-hover:text-blue-600 transition-colors">
                          {member.displayName}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{member.email}</p>
                        {member.phoneNumber && (
                          <p className="text-[10px] text-slate-500 font-mono tracking-tight mt-0.5 truncate flex items-center gap-1 leading-none select-all" title="Contact telephone number">
                            <span className="text-slate-400">📞</span> {member.phoneNumber}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {isOnline ? (
                            <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-150 text-emerald-700 text-[9px] font-bold rounded flex items-center gap-1 select-none">
                              <span className="size-1 bg-emerald-500 rounded-full animate-pulse" /> Online
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 text-[9px] font-bold rounded flex items-center gap-1 select-none">
                              <span className="size-1 bg-slate-400 rounded-full" /> Offline
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Small administrative badge at the upper corner */}
                    <span className={`px-2 py-0.5 text-[8px] font-bold font-mono uppercase tracking-wider rounded-md border ${
                      member.role === "admin"
                        ? "bg-rose-50 text-rose-700 border-rose-200/80"
                        : "bg-slate-50 text-slate-500 border-slate-150"
                    }`}>
                      {member.role}
                    </span>
                  </div>
                </div>

                {/* Card Footer Base section containing micro stats and admin permissions triggers */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    {member.birthday ? (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-sans">
                        🎂 <span className="font-semibold">{member.birthday}</span>
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-mono">Member: Active</span>
                    )}
                  </div>

                  {/* Operational Override Tools (Admin only) */}
                  {isAdmin ? (
                    <div className="flex items-center space-x-1.5 shrink-0 opacity-80 hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleToggleRole(member)}
                        disabled={loadingId !== null || member.uid === currentUser.uid}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-semibold rounded-md shadow-2xs cursor-pointer text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-40"
                      >
                        Toggle Role
                      </button>
                      
                      {member.uid !== currentUser.uid && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(member)}
                          disabled={loadingId !== null}
                          title="Dismiss member from active workspace"
                          className="p-1 text-slate-350 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-md transition-all cursor-pointer disabled:opacity-40"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-[9px] font-mono font-medium text-slate-400 tracking-tight uppercase">
                      Workspace Node Secured
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Custom Deletion Dialog Overlay */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-55">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full mx-4 shadow-xl space-y-4 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-sm text-slate-800">
                  Dismiss Workspace Member?
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Are you absolutely sure you want to dismiss <strong className="text-slate-700">{deleteConfirmUser.displayName}</strong> from the active workspace? This deletes their profile node and denies all authorization.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMember}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                Dismiss Member
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

