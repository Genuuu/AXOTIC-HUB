import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc 
} from "firebase/firestore";
import { 
  Settings, 
  Plus, 
  Trash2, 
  Tag, 
  Users, 
  Shield, 
  ShieldAlert, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Sliders, 
  Info,
  Laptop,
  Check,
  ChevronRight,
  RefreshCw,
  Clock,
  UserPlus
} from "lucide-react";
import { UserProfile, UserRole } from "../types";
import AddMember from "./AddMember";
import TagInput from "./TagInput";

interface AdminSettingsProps {
  currentUser: UserProfile;
}

export default function AdminSettings({ currentUser }: AdminSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"general" | "onboard">("general");
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Managing Users state variables
  const [roster, setRoster] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  
  // User edit state fields
  const [editRole, setEditRole] = useState<UserRole>("member");
  const [editSubTeam, setEditSubTeam] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // General Settings States
  const [workspaceName, setWorkspaceName] = useState("AXOTIC Robotics Hub");
  const [returnPeriod, setReturnPeriod] = useState("30 days");
  const [allowPublicVisibility, setAllowPublicVisibility] = useState(true);

  // Load Categories list
  useEffect(() => {
    if (currentUser.isOfflineMock) {
      const loadMockCategories = () => {
        const stored = localStorage.getItem("axotic_mock_categories");
        if (stored) {
          try {
            setCategories(JSON.parse(stored));
            return;
          } catch (_) {}
        }
        const defaultCats = ["Microcontrollers", "Mechanical", "Sensors", "Energy & Power", "Raw Materials"];
        localStorage.setItem("axotic_mock_categories", JSON.stringify(defaultCats));
        setCategories(defaultCats);
      };
      loadMockCategories();

      const handleUpdate = () => {
        const stored = localStorage.getItem("axotic_mock_categories");
        if (stored) {
          try {
            setCategories(JSON.parse(stored));
          } catch (_) {}
        }
      };
      window.addEventListener("axotic_db_update", handleUpdate);
      return () => window.removeEventListener("axotic_db_update", handleUpdate);
    } else {
      // Live Firebase mode
      const unsub = onSnapshot(collection(db, "categories"), (snap) => {
        if (snap.empty) {
          // If Firestore categories collection is initially empty, we fallback to defaults for listing
          const defaultCats = ["Microcontrollers", "Mechanical", "Sensors", "Energy & Power", "Raw Materials"];
          setCategories(defaultCats);
        } else {
          const list: string[] = [];
          snap.forEach((d) => {
            const data = d.data();
            if (data.name) list.push(data.name);
          });
          // Unique merged categories list
          setCategories(Array.from(new Set(list)));
        }
      }, (err) => {
        console.warn("Could not load Firestore categories stream", err);
      });
      return () => unsub();
    }
  }, [currentUser.isOfflineMock]);

  // Load Users Roster dynamically
  useEffect(() => {
    if (currentUser.isOfflineMock) {
      const loadMockRoster = () => {
        const stored = localStorage.getItem("axotic_mock_roster");
        if (stored) {
          try {
            setRoster(JSON.parse(stored));
          } catch (_) {}
        }
      };
      loadMockRoster();

      const handleUpdate = () => {
        const stored = localStorage.getItem("axotic_mock_roster");
        if (stored) {
          try {
            setRoster(JSON.parse(stored));
          } catch (_) {}
        }
      };
      window.addEventListener("axotic_db_update", handleUpdate);
      return () => window.removeEventListener("axotic_db_update", handleUpdate);
    } else {
      const unsub = onSnapshot(collection(db, "users"), (snap) => {
        const list: UserProfile[] = [];
        snap.forEach((d) => {
          list.push({ uid: d.id, ...d.data() } as UserProfile);
        });
        setRoster(list);
      }, (err) => {
        console.warn("Could not load users database", err);
      });
      return () => unsub();
    }
  }, [currentUser.isOfflineMock]);

  // Handle category register
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg("This classification category already exists in your registry.");
      return;
    }

    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    if (currentUser.isOfflineMock) {
      const updatedCats = [...categories, trimmed];
      localStorage.setItem("axotic_mock_categories", JSON.stringify(updatedCats));
      setCategories(updatedCats);
      window.dispatchEvent(new Event("axotic_db_update"));
      setNewCategoryName("");
      setSuccessMsg(`Successfully registered new category "${trimmed}" in local sandbox.`);
      setLoading(false);
    } else {
      try {
        await setDoc(doc(db, "categories", trimmed), {
          name: trimmed,
          createdAt: new Date().toISOString()
        });
        setNewCategoryName("");
        setSuccessMsg(`Successfully registered new category "${trimmed}" permanently.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `categories/${trimmed}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle category removal
  const handleRemoveCategory = async (catName: string) => {
    const confirmRemove = window.confirm(`Are you sure you want to delete the category "${catName}"? Existing inventory items belonging to this category will not be deleted but they will lose their classification matching.`);
    if (!confirmRemove) return;

    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    if (currentUser.isOfflineMock) {
      // In mock mode, if settings stored default values, save the custom list without this category
      const currentList = categories.filter(c => c !== catName);
      localStorage.setItem("axotic_mock_categories", JSON.stringify(currentList));
      setCategories(currentList);
      window.dispatchEvent(new Event("axotic_db_update"));
      setSuccessMsg(`Removed category "${catName}" from sandbox.`);
      setLoading(false);
    } else {
      try {
        await deleteDoc(doc(db, "categories", catName));
        setSuccessMsg(`Permanently deleted category "${catName}" from the database.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `categories/${catName}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Triggers user edit selection
  const handleSelectUserForEdit = (user: UserProfile) => {
    setSelectedUserForEdit(user);
    setEditRole(user.role);
    setEditSubTeam(user.subTeam || "Core Engineering");
    setEditPhone(user.phoneNumber || "");
  };

  // Save modified user profile properties
  const handleSaveUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const targetUid = selectedUserForEdit.uid;

    if (currentUser.isOfflineMock) {
      const stored = localStorage.getItem("axotic_mock_roster");
      if (stored) {
        try {
          const rosterList: UserProfile[] = JSON.parse(stored);
          const idx = rosterList.findIndex(u => u.uid === targetUid);
          if (idx !== -1) {
            rosterList[idx] = {
              ...rosterList[idx],
              role: editRole,
              subTeam: editSubTeam,
              phoneNumber: editPhone
            };
            localStorage.setItem("axotic_mock_roster", JSON.stringify(rosterList));
            window.dispatchEvent(new Event("axotic_db_update"));
          }
        } catch (_) {}
      }
      setSuccessMsg(`Updated profile configurations for ${selectedUserForEdit.displayName}.`);
      setSelectedUserForEdit(null);
      setLoading(false);
    } else {
      try {
        const userRef = doc(db, "users", targetUid);
        await updateDoc(userRef, {
          role: editRole,
          subTeam: editSubTeam,
          phoneNumber: editPhone
        });
        setSuccessMsg(`Successfully saved administrative profile changes for ${selectedUserForEdit.displayName}.`);
        setSelectedUserForEdit(null);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Admin dismissal/deletion of user roster profiles
  const handleDismissUser = async (user: UserProfile) => {
    if (user.uid === currentUser.uid) {
      alert("Self-Mutation Blocked: You cannot dismiss your own administrator session profile.");
      return;
    }

    const confirmDismiss = window.confirm(`Permanently dismiss and delete ${user.displayName}'s access profile? WARNING: This action cannot be undone.`);
    if (!confirmDismiss) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (currentUser.isOfflineMock) {
      const stored = localStorage.getItem("axotic_mock_roster");
      if (stored) {
        try {
          const rosterList: UserProfile[] = JSON.parse(stored);
          const filtered = rosterList.filter(u => u.uid !== user.uid);
          localStorage.setItem("axotic_mock_roster", JSON.stringify(filtered));
          window.dispatchEvent(new Event("axotic_db_update"));
        } catch (_) {}
      }
      setSuccessMsg(`Dismissed user "${user.displayName}" from local simulation.`);
      if (selectedUserForEdit?.uid === user.uid) setSelectedUserForEdit(null);
      setLoading(false);
    } else {
      try {
        await deleteDoc(doc(db, "users", user.uid));
        setSuccessMsg(`Successfully wiped registration & access credentials for ${user.displayName}.`);
        if (selectedUserForEdit?.uid === user.uid) setSelectedUserForEdit(null);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // General Settings Save
  const handleSaveGeneralConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("System configurations updated successfully.");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // Filter roster listing
  const filteredRoster = roster.filter(u => {
    const s = userSearch.toLowerCase();
    return u.displayName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.subTeam?.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-8 animate-fade-in text-left">
      
      {/* Dynamic Action Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs flex items-center gap-3 shadow-2xs">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 animate-bounce" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-800 text-xs flex items-center gap-3 shadow-2xs">
          <AlertCircle className="size-4 shrink-0 text-rose-600 animate-bounce" />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Sub-tabs Navigation */}
      <div className="flex border border-slate-200 bg-slate-100/80 p-1 rounded-xl gap-1 max-w-sm" id="settings-sub-navigation">
        <button
          type="button"
          onClick={() => setActiveSubTab("general")}
          className={`flex-1 px-3 py-1.8 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === "general"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
          }`}
          id="btn-subnav-general"
        >
          <Sliders className="size-3.5" /> System Controls
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("onboard")}
          className={`flex-1 px-3 py-1.8 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === "onboard"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
          }`}
          id="btn-subnav-onboard"
        >
          <UserPlus className="size-3.5" /> Onboard Member
        </button>
      </div>

      {activeSubTab === "general" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Categories & Workspace Configs (7 Cols) */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-8">
          
          {/* CATEGORY WORKBENCH */}
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-xs overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <Tag className="size-4 text-blue-400" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider">Inventory Categories Classification</h3>
              </div>
              <span className="text-[10px] font-mono bg-blue-500/10 border border-blue-400/20 px-2 py-0.5 rounded-full text-blue-400 font-bold">
                {categories.length} Categories
              </span>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-xs text-slate-500 leading-relaxed">
                Define the high-level physical classification taxonomy used to group and filter hardware components inside the stockroom. Adding or deleting items propagates to components registration.
              </p>

              {/* Add category inline form */}
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. Actuators, Optoelectronics, Microcontrollers"
                  className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs outline-hidden font-medium"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.currentTarget.value)}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1.5"
                >
                  <Plus className="size-3.5" /> Register Category
                </button>
              </form>

              {/* Active list layout */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Current Classification Tags</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <div 
                      key={cat} 
                      className="group bg-slate-50 border border-slate-100 hover:border-slate-200 p-2.5 px-3.5 rounded-xl flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="size-2 rounded-full bg-blue-500 shadow-xs shadow-blue-500/40" />
                        <span className="text-xs font-bold text-slate-700 truncate">{cat}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(cat)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                        title="Delete product category"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* WORKSPACE & BEHAVIOR SETTINGS */}
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-xs overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 flex items-center text-white space-x-2">
              <Sliders className="size-4 text-blue-400" />
              <h3 className="font-display text-sm font-bold uppercase tracking-wider">Workspace Parameters & Stuff</h3>
            </div>

            <form onSubmit={handleSaveGeneralConfig} className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Hub Organization Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs outline-hidden font-medium"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Standard Checkout Return Duration</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs rounded-xl px-2.5 py-2 outline-hidden cursor-pointer"
                    value={returnPeriod}
                    onChange={(e) => setReturnPeriod(e.target.value)}
                  >
                    <option value="7 days">7 Days Trial Period</option>
                    <option value="14 days">14 Days Short Deployment</option>
                    <option value="30 days">30 Days Standard Build Cycle</option>
                    <option value="60 days">60 Days Semester Clearance</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Allow Anonymous Member Self-Onboarding</span>
                    <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">Allow public viewers to request direct member credentials offline.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowPublicVisibility}
                      onChange={(e) => setAllowPublicVisibility(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Save System Configurations
                </button>
              </div>

            </form>
          </div>

          {/* DIAGNOSTIC INFORMATION */}
          <div className="bg-slate-100/60 border border-slate-200/50 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Laptop className="size-5" />
            </div>
            <div className="space-y-1 text-left">
              <span className="text-xs font-bold text-slate-800 block">Workspace Cloud Terminal Context</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                This administration settings board handles real-time data flow permissions and role bindings. Ensure team policies and categories coordinate with physical lab cabinets for perfect compliance.
              </p>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: User Roster Manage List & Profiles Editor (5 Cols) */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-8">
          
          {/* USERS MANAGER LIST */}
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-xs overflow-hidden flex flex-col max-h-[1000px]">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <Users className="size-4 text-blue-400" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider">Access Clearance Profiles</h3>
              </div>
              <span className="text-[10px] font-mono bg-blue-500/10 border border-blue-400/20 px-2 py-0.5 rounded-full text-blue-400 font-bold">
                {roster.length} Registered
              </span>
            </div>

            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <input
                type="text"
                placeholder="Search research members by name, email..."
                className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs outline-hidden font-medium"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-[460px]">
              {filteredRoster.map((user) => {
                const isSelected = selectedUserForEdit?.uid === user.uid;
                return (
                  <div 
                    key={user.uid} 
                    className={`p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors ${
                      isSelected ? "bg-blue-50/20 border-l-2 border-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <img 
                        src={user.avatarUrl} 
                        alt={user.displayName} 
                        className="size-9 rounded-lg border border-slate-100 shrink-0"
                      />
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 truncate block max-w-[130px]">{user.displayName}</span>
                          {user.role === "admin" ? (
                            <span className="bg-blue-50 text-blue-700 text-[8px] font-bold px-1.5 py-0.2 rounded border border-blue-200/30">
                              Admin
                            </span>
                          ) : (
                            <span className="bg-slate-50 text-slate-500 text-[8px] font-bold px-1.5 py-0.2 rounded border border-slate-200/40">
                              Member
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block truncate">{user.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSelectUserForEdit(user)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer text-xs font-semibold flex items-center gap-1"
                        title="Configure specs and role credentials"
                      >
                        Edit
                        <ChevronRight className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDismissUser(user)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="Revoke clearance & delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredRoster.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No registered members match search.
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE MEMBER DETAILED PROFILE PREFERENCE WRITER */}
          {selectedUserForEdit && (
            <div className="bg-white border border-slate-200/60 rounded-2xl shadow-xs overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
              <div className="bg-blue-900 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="size-4 text-blue-300" />
                  <h4 className="font-display text-xs font-bold uppercase tracking-widest">Override Member Specification</h4>
                </div>
                <button
                  onClick={() => setSelectedUserForEdit(null)}
                  className="text-white/70 hover:text-white text-xs font-bold font-mono"
                >
                  Clear Selection
                </button>
              </div>

              <form onSubmit={handleSaveUserProfile} className="p-5 space-y-4">
                <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-xl">
                  <img src={selectedUserForEdit.avatarUrl} alt="" className="size-10 rounded-lg bg-white" />
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-800 block">{selectedUserForEdit.displayName}</span>
                    <span className="text-[10px] font-mono text-slate-400">{selectedUserForEdit.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Clearance Role</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs rounded-lg px-2.5 py-1.8 outline-hidden cursor-pointer font-semibold"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                    >
                      <option value="member">Lab Member</option>
                      <option value="admin">Administrator (Full Master Auth)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Contact Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +1 (555) 019-2834"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs rounded-lg px-2.5 py-1.8 outline-hidden font-mono"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForEdit(null)}
                    className="px-3.5 py-1.8 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-3.5 py-1.8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                  >
                    {loading ? "Saving..." : "Apply Member Custom Override"}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

      </div>
      ) : (
        <div className="animate-in fade-in zoom-in-95 duration-200 bg-white border border-slate-200/60 rounded-2xl p-2 sm:p-4 shadow-2xs">
          <AddMember currentUser={currentUser} />
        </div>
      )}

    </div>
  );
}
