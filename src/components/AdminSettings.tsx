import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType, createAdminLog } from "../firebase";
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
  UserPlus,
  UserMinus,
  ShieldOff,
  Search,
  FileCode,
  SunDim,
  MoonStar,
  User,
  Mail,
  Phone,
  Upload
} from "lucide-react";
import { UserProfile, UserRole, AdminLog } from "../types";
import AddMember from "./AddMember";
import TagInput from "./TagInput";

interface AdminSettingsProps {
  currentUser: UserProfile;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export default function AdminSettings({ currentUser, isDark = false, onToggleTheme }: AdminSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"general" | "onboard" | "logs" | "preferences">(() => {
    return currentUser?.role === "admin" ? "general" : "preferences";
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Administrative Audit Log State Fields
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [logSearch, setLogSearch] = useState("");
  const [logFilterAction, setLogFilterAction] = useState<string>("ALL");
  const [showClearLogsConfirm, setShowClearLogsConfirm] = useState(false);

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

  // Personal Member Preferences States
  const [prefDisplayName, setPrefDisplayName] = useState(currentUser?.displayName || "");
  const [prefPhone, setPrefPhone] = useState(currentUser?.phoneNumber || "");
  const [prefBirthday, setPrefBirthday] = useState(currentUser?.birthday || "");
  const [prefAvatarUrl, setPrefAvatarUrl] = useState(currentUser?.avatarUrl || "");
  const [prefError, setPrefError] = useState("");
  const [prefSuccess, setPrefSuccess] = useState("");
  const [savingPref, setSavingPref] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setPrefDisplayName(currentUser.displayName || "");
      setPrefPhone(currentUser.phoneNumber || "");
      setPrefBirthday(currentUser.birthday || "");
      setPrefAvatarUrl(currentUser.avatarUrl || "");
    }
  }, [currentUser]);

  // Confirm states
  const [categoryToRemove, setCategoryToRemove] = useState<string | null>(null);
  const [userToDismiss, setUserToDismiss] = useState<UserProfile | null>(null);

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
        console.warn("Could not load Firestore categories stream", err instanceof Error ? err.message : String(err));
      });
      return () => unsub();
    }
  }, [currentUser.isOfflineMock]);

  // Load and auto-seed Admin Audit Logs
  useEffect(() => {
    if (currentUser.isOfflineMock) {
      const loadLogs = () => {
        const stored = localStorage.getItem("axotic_mock_admin_logs");
        if (stored) {
          try {
            setAdminLogs(JSON.parse(stored));
            return;
          } catch (_) {}
        }
        // Seed default initial logs if sandbox empty
        const seedLogs: AdminLog[] = [
          {
            id: "seed-log-1",
            action: "WORKSPACE_CONFIG",
            details: "Administrative security supervisor initialized. AXOTIC Hub auditing server online.",
            performedBy: currentUser.uid,
            performedByName: "Systems Supervisor",
            performedByEmail: "security@axotic.org",
            createdAt: new Date(Date.now() - 3600000 * 24).toISOString() // 1 day ago
          },
          {
            id: "seed-log-2",
            action: "MEMBER_ONBOARDED",
            details: `Onboarded primary system administrator "${currentUser.displayName}" with master privileges limit.`,
            performedBy: currentUser.uid,
            performedByName: "Core Registrar",
            performedByEmail: "roster@axotic.org",
            createdAt: new Date(Date.now() - 3600000 * 3).toISOString() // 3 hours ago
          }
        ];
        localStorage.setItem("axotic_mock_admin_logs", JSON.stringify(seedLogs));
        setAdminLogs(seedLogs);
      };
      loadLogs();

      const handleUpdate = () => {
        const stored = localStorage.getItem("axotic_mock_admin_logs");
        if (stored) {
          try {
            setAdminLogs(JSON.parse(stored));
          } catch (_) {}
        }
      };
      window.addEventListener("axotic_db_update", handleUpdate);
      return () => window.removeEventListener("axotic_db_update", handleUpdate);
    } else {
      const unsub = onSnapshot(collection(db, "admin_logs"), (snap) => {
        const list: AdminLog[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as AdminLog);
        });
        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAdminLogs(list);
      }, (err) => {
        console.warn("Could not load Firestore admin logs collection", err instanceof Error ? err.message : String(err));
      });
      return () => unsub();
    }
  }, [currentUser.isOfflineMock]);

  // Load General workspace settings configuration on mount
  useEffect(() => {
    if (currentUser.isOfflineMock) {
      const name = localStorage.getItem("axotic_workspace_name");
      const period = localStorage.getItem("axotic_return_period");
      const pub = localStorage.getItem("axotic_public_onboarding");
      if (name) setWorkspaceName(name);
      if (period) setReturnPeriod(period);
      if (pub) setAllowPublicVisibility(pub === "true");
    } else {
      const unsub = onSnapshot(doc(db, "settings", "general"), (d) => {
        if (d.exists()) {
          const data = d.data();
          if (data.workspaceName) setWorkspaceName(data.workspaceName);
          if (data.returnPeriod) setReturnPeriod(data.returnPeriod);
          if (data.allowPublicVisibility !== undefined) setAllowPublicVisibility(data.allowPublicVisibility);
        }
      }, (err) => {
        console.warn("Could not load Firestore general workspace configurations", err instanceof Error ? err.message : String(err));
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
        console.warn("Could not load users database", err instanceof Error ? err.message : String(err));
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
      createAdminLog("CATEGORY_ADDED", `Registered new hardware category classification: "${trimmed}".`, currentUser);
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
        createAdminLog("CATEGORY_ADDED", `Registered new hardware category classification: "${trimmed}".`, currentUser);
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
  const handleConfirmRemoveCategory = async () => {
    if (!categoryToRemove) return;
    const catName = categoryToRemove;
    setCategoryToRemove(null);

    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    if (currentUser.isOfflineMock) {
      // In mock mode, if settings stored default values, save the custom list without this category
      const currentList = categories.filter(c => c !== catName);
      localStorage.setItem("axotic_mock_categories", JSON.stringify(currentList));
      setCategories(currentList);
      createAdminLog("CATEGORY_DELETED", `Permanently deleted classification category "${catName}" from taxonomy registry.`, currentUser);
      window.dispatchEvent(new Event("axotic_db_update"));
      setSuccessMsg(`Removed category "${catName}" from sandbox.`);
      setLoading(false);
    } else {
      try {
        await deleteDoc(doc(db, "categories", catName));
        createAdminLog("CATEGORY_DELETED", `Permanently deleted classification category "${catName}" from taxonomy registry.`, currentUser);
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
            createAdminLog(
              "USER_OVERRIDE",
              `Overrode clearance profile for "${selectedUserForEdit.displayName}": role assigned to "${editRole}", department set to "${editSubTeam}", contact: "${editPhone}".`,
              currentUser
            );
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
        createAdminLog(
          "USER_OVERRIDE",
          `Overrode clearance profile for "${selectedUserForEdit.displayName}": role assigned to "${editRole}", department set to "${editSubTeam}", contact: "${editPhone}".`,
          currentUser
        );
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
  const handleDismissUser = (user: UserProfile) => {
    if (user.uid === currentUser.uid) {
      setErrorMsg("Self-Mutation Blocked: You cannot dismiss your own administrator session profile.");
      return;
    }
    setUserToDismiss(user);
  };

  const handleConfirmDismissUser = async () => {
    if (!userToDismiss) return;
    const user = userToDismiss;
    setUserToDismiss(null);

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
          createAdminLog(
            "USER_DISMISSED",
            `Dismissed team registration and revoked credentials for "${user.displayName}" (${user.email}).`,
            currentUser
          );
          window.dispatchEvent(new Event("axotic_db_update"));
        } catch (_) {}
      }
      setSuccessMsg(`Dismissed user "${user.displayName}" from local simulation.`);
      if (selectedUserForEdit?.uid === user.uid) setSelectedUserForEdit(null);
      setLoading(false);
    } else {
      try {
        await deleteDoc(doc(db, "users", user.uid));
        createAdminLog(
          "USER_DISMISSED",
          `Dismissed team registration and revoked credentials for "${user.displayName}" (${user.email}).`,
          currentUser
        );
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
  const handleSaveGeneralConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (currentUser.isOfflineMock) {
      localStorage.setItem("axotic_workspace_name", workspaceName);
      localStorage.setItem("axotic_return_period", returnPeriod);
      localStorage.setItem("axotic_public_onboarding", String(allowPublicVisibility));
      
      createAdminLog(
        "WORKSPACE_CONFIG",
        `Updated workspace config parameters: Name: "${workspaceName}", return duration set: "${returnPeriod}", citizen public onboarding flag: "${allowPublicVisibility ? "Enabled" : "Disabled"}".`,
        currentUser
      );
      
      window.dispatchEvent(new Event("axotic_db_update"));
      setSuccessMsg("System configurations updated and synced with sandbox storage.");
      setLoading(false);
    } else {
      try {
        await setDoc(doc(db, "settings", "general"), {
          workspaceName,
          returnPeriod,
          allowPublicVisibility,
          updatedBy: currentUser.uid,
          updatedAt: new Date().toISOString()
        });

        createAdminLog(
          "WORKSPACE_CONFIG",
          `Updated workspace config parameters: Name: "${workspaceName}", return duration set: "${returnPeriod}", citizen public onboarding flag: "${allowPublicVisibility ? "Enabled" : "Disabled"}".`,
          currentUser
        );

        setSuccessMsg("System configurations updated and published permanently.");
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "settings/general");
        setErrorMsg("Failed to update general configurations.");
      } finally {
        setLoading(false);
      }
    }
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // Purge Audit log trails
  const handleClearLogs = async () => {
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    setShowClearLogsConfirm(false);

    if (currentUser.isOfflineMock) {
      localStorage.setItem("axotic_mock_admin_logs", JSON.stringify([]));
      createAdminLog("AUDIT_PURGED", "Purged entire security timeline history.", currentUser);
      window.dispatchEvent(new Event("axotic_db_update"));
      setSuccessMsg("Confidential audit logs trail was cleared.");
      setLoading(false);
    } else {
      try {
        createAdminLog("AUDIT_PURGED", "Purged entire security timeline history.", currentUser);
        setSuccessMsg("Administrative audit records reset.");
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, "admin_logs");
        setErrorMsg("Failed to purge logs from remote database.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Personal Member Preferences Save Configuration
  const handleSavePref = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefDisplayName.trim()) {
      setPrefError("Profile display name cannot be blank.");
      return;
    }
    setSavingPref(true);
    setPrefError("");
    setPrefSuccess("");

    const updatedProfile = {
      ...currentUser,
      displayName: prefDisplayName.trim(),
      phoneNumber: prefPhone.trim(),
      birthday: prefBirthday,
      avatarUrl: prefAvatarUrl
    };

    if (currentUser.isOfflineMock) {
      localStorage.setItem("axotic_local_auth", JSON.stringify(updatedProfile));
      
      const rosterStored = localStorage.getItem("axotic_mock_roster");
      if (rosterStored) {
        try {
          const list: UserProfile[] = JSON.parse(rosterStored);
          const index = list.findIndex(u => u.uid === currentUser.uid);
          if (index !== -1) {
            list[index] = {
              ...list[index],
              displayName: prefDisplayName.trim(),
              phoneNumber: prefPhone.trim(),
              birthday: prefBirthday,
              avatarUrl: prefAvatarUrl
            };
            localStorage.setItem("axotic_mock_roster", JSON.stringify(list));
          }
        } catch (_) {}
      }
      
      window.dispatchEvent(new Event("axotic_db_update"));
      setPrefSuccess("Your personal preferences have been saved & synced in sandbox storage.");
      setSavingPref(false);
      setTimeout(() => setPrefSuccess(""), 4000);
    } else {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(userRef, {
          displayName: prefDisplayName.trim(),
          phoneNumber: prefPhone.trim(),
          birthday: prefBirthday,
          avatarUrl: prefAvatarUrl
        }, { merge: true });

        localStorage.setItem("axotic_local_auth", JSON.stringify(updatedProfile));
        setPrefSuccess("Your preferences were updated and synchronized live with the database.");
      } catch (err) {
        console.error("Preferences save failed", err);
        setPrefError("Failed to update preferences. External database error.");
      } finally {
        setSavingPref(false);
        setTimeout(() => setPrefSuccess(""), 4000);
      }
    }
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
      {currentUser?.role === "admin" && (
        <div className="flex border border-slate-200 bg-slate-100/80 dark:bg-slate-800/85 p-1 rounded-xl gap-1 max-w-2xl" id="settings-sub-navigation">
          <button
            type="button"
            onClick={() => setActiveSubTab("general")}
            className={`flex-1 px-2.5 py-1.8 text-[10.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === "general"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-950"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
            }`}
            id="btn-subnav-general"
          >
            <Sliders className="size-3.5" /> System Controls
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("onboard")}
            className={`flex-1 px-2.5 py-1.8 text-[10.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === "onboard"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-950"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
            }`}
            id="btn-subnav-onboard"
          >
            <UserPlus className="size-3.5" /> Onboard Member
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("logs")}
            className={`flex-1 px-2.5 py-1.8 text-[10.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === "logs"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-950"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
            }`}
            id="btn-subnav-logs"
          >
            <ShieldAlert className="size-3.5" /> Confidential Logs
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("preferences")}
            className={`flex-1 px-2.5 py-1.8 text-[10.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === "preferences"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-950"
                 : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
            }`}
            id="btn-subnav-preferences"
          >
            <User className="size-3.5" /> My Preferences
          </button>
        </div>
      )}

      {activeSubTab === "general" && (
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
                        onClick={() => setCategoryToRemove(cat)}
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
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Hub Organization Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs outline-hidden font-medium dark:bg-slate-950 dark:border-slate-800"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                  />
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
                      <option value="member">Member</option>
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
      )}

      {activeSubTab === "onboard" && (
        <div className="animate-in fade-in zoom-in-95 duration-200 bg-white border border-slate-200/60 rounded-2xl p-2 sm:p-4 shadow-2xs">
          <AddMember currentUser={currentUser} />
        </div>
      )}

      {activeSubTab === "logs" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-200">
          
          {/* HEADER SUMMARY CARD */}
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 z-10 text-left">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block font-mono">Confidential Security Auditing Panel</span>
              <h2 className="font-display text-2xl font-black tracking-tight">Hub Operations Audit Trail</h2>
              <p className="text-xs text-slate-400 font-sans max-w-lg leading-relaxed">
                This feed aggregates restricted administrative and operation system events inside the Hub stockroom, budget boards, roster permissions, and secure system parameters. This panel is visible exclusively to authorized administrators.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-4 bg-slate-800/80 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-xs z-10 self-start md:self-auto min-w-[200px]">
              <div className="p-3 bg-red-500/20 rounded-xl text-red-100 shrink-0">
                <ShieldAlert className="size-5 text-red-400" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Security Log Depth</span>
                <span className="text-lg font-black font-mono text-red-400">{adminLogs.length} Records</span>
              </div>
            </div>
          </div>

          {/* CONTROL BAR */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-2xs">
            <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
              
              {/* Search input field */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter logs by performer, description, email..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2 text-xs outline-hidden font-medium text-slate-700 font-sans"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
              </div>

              {/* Action Category Filter */}
              <select
                className="bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs rounded-xl px-3 py-2 outline-hidden cursor-pointer font-bold text-slate-600 min-w-[170px]"
                value={logFilterAction}
                onChange={(e) => setLogFilterAction(e.target.value)}
              >
                <option value="ALL">All Event Types</option>
                <option value="MEMBER_ONBOARDED">Onboarded Members</option>
                <option value="USER_OVERRIDE">Role Overrides</option>
                <option value="USER_DISMISSED">Roster Dismissals</option>
                <option value="CATEGORY_ADDED">Categories Registered</option>
                <option value="CATEGORY_DELETED">Categories Wiped</option>
                <option value="WORKSPACE_CONFIG">General Config Updates</option>
                <option value="AUDIT_PURGED">Audit Purges</option>
              </select>

            </div>

            {/* Clear Audit History Trigger */}
            <button
              onClick={() => setShowClearLogsConfirm(true)}
              disabled={adminLogs.length === 0}
              className="w-full md:w-auto px-4 py-2 border border-rose-200 hover:border-rose-500 text-rose-650 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              <ShieldOff className="size-3.5 text-rose-600" />
              Purge Security Log History
            </button>
          </div>

          {/* AUDIT LOG TIMELINE */}
          <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
            
            {adminLogs
              .filter(log => {
                const searchStr = logSearch.toLowerCase();
                const colMatches = logFilterAction === "ALL" || log.action === logFilterAction;
                const searchMatches = 
                  log.details.toLowerCase().includes(searchStr) ||
                  log.performedByName.toLowerCase().includes(searchStr) ||
                  log.performedByEmail.toLowerCase().includes(searchStr) ||
                  log.action.toLowerCase().includes(searchStr);
                return colMatches && searchMatches;
              })
              .map((log) => {
                // Determine layout details dynamically based on log.action type
                let actionColor = "bg-slate-100 text-slate-700 border-slate-200/50";
                let actionBadge = "System Action";
                let actionIcon = <Sliders className="size-4" />;

                if (log.action === "MEMBER_ONBOARDED") {
                  actionColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                  actionBadge = "Team Onboard";
                  actionIcon = <UserPlus className="size-4" />;
                } else if (log.action === "USER_OVERRIDE") {
                  actionColor = "bg-amber-50 text-amber-700 border-amber-100";
                  actionBadge = "Clearance Overrode";
                  actionIcon = <ShieldAlert className="size-4" />;
                } else if (log.action === "USER_DISMISSED") {
                  actionColor = "bg-rose-50 text-rose-700 border-rose-100";
                  actionBadge = "Access Dismissal";
                  actionIcon = <UserMinus className="size-4" />;
                } else if (log.action === "CATEGORY_ADDED") {
                  actionColor = "bg-blue-50 text-blue-700 border-blue-100";
                  actionBadge = "Classification Tag";
                  actionIcon = <Tag className="size-4" />;
                } else if (log.action === "CATEGORY_DELETED") {
                  actionColor = "bg-red-50 text-red-700 border-red-100";
                  actionBadge = "Taxonomy Deleted";
                  actionIcon = <FileCode className="size-4" />;
                } else if (log.action === "WORKSPACE_CONFIG") {
                  actionColor = "bg-indigo-50 text-indigo-700 border-indigo-100";
                  actionBadge = "Config Calibration";
                  actionIcon = <Sliders className="size-4" />;
                } else if (log.action === "AUDIT_PURGED") {
                  actionColor = "bg-slate-900 border-slate-850 text-slate-100";
                  actionBadge = "Logs Purged";
                  actionIcon = <ShieldOff className="size-4 text-rose-500" />;
                }

                return (
                  <div key={log.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex gap-4 min-w-0 flex-1">
                      
                      {/* Left circular avatar-badge identifier */}
                      <div className={`p-3 rounded-2xl border ${actionColor} shrink-0 self-start`}>
                        {actionIcon}
                      </div>

                      {/* Middle summary */}
                      <div className="space-y-1.5 min-w-0 text-left font-sans">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${actionColor}`}>
                            {actionBadge}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Synced via Secure Server</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-850 leading-relaxed max-w-4xl break-words">
                          {log.details}
                        </p>
                        
                        {/* Performer accountability label */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-sans">
                          <span className="font-bold text-slate-705">{log.performedByName}</span>
                          <span className="text-slate-400 font-mono">({log.performedByEmail})</span>
                        </div>
                      </div>

                    </div>

                    {/* Right timestamp display */}
                    <div className="shrink-0 flex flex-col items-end justify-between self-stretch h-full">
                      <span className="text-[10px] text-slate-500 font-medium font-mono whitespace-nowrap bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap font-mono mt-1">
                        {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                  </div>
                );
              })}

            {adminLogs.filter(log => {
              const searchStr = logSearch.toLowerCase();
              const colMatches = logFilterAction === "ALL" || log.action === logFilterAction;
              const searchMatches = 
                log.details.toLowerCase().includes(searchStr) ||
                log.performedByName.toLowerCase().includes(searchStr) ||
                log.performedByEmail.toLowerCase().includes(searchStr) ||
                log.action.toLowerCase().includes(searchStr);
              return colMatches && searchMatches;
            }).length === 0 && (
              <div className="p-16 text-center text-slate-450 text-xs">
                <ShieldOff className="size-8 text-slate-300 mx-auto mb-2 animate-pulse" />
                <span className="font-bold block">No restricted audit records found.</span>
                <span className="text-[10px] text-slate-400 block mt-1">Try adjusting your keyword filter values above.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "preferences" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in text-left">
          
          {/* LEFT SIDE: Visual Appearance & Theme Controls & General Status (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* THEME SELECTOR CARD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 flex items-center gap-2 text-white border-b border-slate-100 dark:border-slate-800">
                <Sparkles className="size-4 text-amber-500" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider">App Appearance & Theme</h3>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Calibrate the active layout colors. Switch to eye-safe dark slate or clean, modern high-contrast light mode.
                </p>

                {/* Theme Options */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Light theme choice */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isDark && onToggleTheme) onToggleTheme();
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      !isDark
                        ? "border-blue-500 bg-blue-50/25 dark:bg-blue-950/10 ring-2 ring-blue-500/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="size-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center mb-3">
                      <SunDim className="size-4.5 text-amber-500" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Light Mode</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Classic slate white</span>
                  </button>

                  {/* Dark theme choice */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDark && onToggleTheme) onToggleTheme();
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      isDark
                        ? "border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-2 ring-blue-500/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="size-8 rounded-lg bg-slate-850 dark:bg-slate-950 border border-slate-700 flex items-center justify-center mb-3">
                      <MoonStar className="size-4.5 text-blue-450" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Dark Mode</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Cosmic eye-safe dark</span>
                  </button>
                </div>
              </div>
            </div>

            {/* MEMBER ROSTER STATUS OVERVIEW CARD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 flex items-center gap-2 text-white border-b border-slate-100 dark:border-slate-800">
                <Info className="size-4 text-blue-400" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider">Clearance & Status</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Security Clearance</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 capitalize border border-slate-200 dark:border-slate-705">
                    {currentUser.role}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Gmail Account</span>
                  <span className="text-xs font-mono text-slate-650 dark:text-slate-300 truncate max-w-[170px]" title={currentUser.email}>
                    {currentUser.email}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT SIDE: Profile Detail Formulation Form Cards (7 cols) */}
          <div className="lg:col-span-7">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 flex items-center justify-between text-white border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-blue-400" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider">Calibration of Personal Profile</h3>
                </div>
                {savingPref && (
                  <div className="size-4 border-2 border-slate-205 border-t-white rounded-full animate-spin" />
                )}
              </div>

              <form onSubmit={handleSavePref} className="p-6 space-y-6">
                
                {prefError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="size-4 text-rose-600 shrink-0" />
                    <span className="font-medium">{prefError}</span>
                  </div>
                )}

                {prefSuccess && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">{prefSuccess}</span>
                  </div>
                )}

                {/* Avatar Display & Input URL */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800/60 animate-fade-in">
                  <div className="relative shrink-0">
                    <div className="size-16 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-755 bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center">
                      {prefAvatarUrl ? (
                        <img 
                          src={prefAvatarUrl} 
                          alt="Avatar Visual" 
                          className="size-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-center p-1 text-[8px] text-slate-400 uppercase">
                          No Photo
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                    <span className="block text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Custom Avatar Identifier</span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Avatar SVG URL or Seed"
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs outline-hidden text-slate-800 dark:text-slate-250 font-medium"
                        value={prefAvatarUrl}
                        onChange={(e) => setPrefAvatarUrl(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const seed = prefDisplayName.trim() || String(Math.floor(Math.random() * 1000));
                          setPrefAvatarUrl(`https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed)}`);
                        }}
                        className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-705 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap"
                      >
                        Generate Pixel-Art Seed
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Elements Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Profile Display Name <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Your full name"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl px-3.5 py-2.5 text-xs outline-hidden font-medium text-slate-800 dark:text-slate-100 transition-all"
                      value={prefDisplayName}
                      onChange={(e) => setPrefDisplayName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">📞 Contact phone number</label>
                    <input
                      type="tel"
                      placeholder="e.g. +1 (555) 0192-231"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl px-3.5 py-2.5 text-xs outline-hidden font-mono text-slate-800 dark:text-slate-100 transition-all"
                      value={prefPhone}
                      onChange={(e) => setPrefPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">🎂 Birthday (Optional)</label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl px-3.5 py-2.5 text-xs outline-hidden text-slate-800 dark:text-slate-100 transition-all cursor-pointer"
                      value={prefBirthday}
                      onChange={(e) => setPrefBirthday(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Access Rank Clearance Level</label>
                    <input
                      type="text"
                      disabled
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 dark:text-slate-550 font-mono select-none cursor-not-allowed uppercase font-bold tracking-wide"
                      value={`${currentUser.role || "member"} profile clear`}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={savingPref}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-755 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    {savingPref ? "Updating..." : "Save Profile Preferences"}
                  </button>
                </div>

              </form>
            </div>

          </div>

        </div>
      )}

      {/* Category Remove Confirmation Modal */}
      {categoryToRemove && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm cursor-pointer"
            onClick={() => setCategoryToRemove(null)}
          ></div>
          <div className="relative bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <h3 className="text-[17px] font-black text-slate-900 mb-2">Delete Category?</h3>
            <p className="text-[13px] font-medium text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to delete the category "{categoryToRemove}"? Existing inventory items belonging to this category will not be deleted but they will lose their classification matching.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setCategoryToRemove(null)}
                className="flex-1 px-4 py-2 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveCategory}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors border border-transparent shadow-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Dismissal Confirmation Modal */}
      {userToDismiss && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm cursor-pointer"
            onClick={() => setUserToDismiss(null)}
          ></div>
          <div className="relative bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <h3 className="text-[17px] font-black text-slate-900 mb-2">Dismiss User?</h3>
            <p className="text-[13px] font-medium text-slate-500 mb-6 leading-relaxed">
              Permanently dismiss and delete {userToDismiss.displayName}'s access profile? <strong className="text-red-500">WARNING: This action cannot be undone.</strong>
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setUserToDismiss(null)}
                className="flex-1 px-4 py-2 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDismissUser}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors border border-transparent shadow-sm flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="size-3.5" />
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge Audit History Confirmation Modal */}
      {showClearLogsConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm cursor-pointer"
            onClick={() => setShowClearLogsConfirm(false)}
          ></div>
          <div className="relative bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-left">
            <div className="p-3 bg-rose-50 rounded-2xl w-fit text-rose-500 mb-4 animate-pulse">
              <ShieldOff className="size-5" />
            </div>
            <h3 className="text-[17px] font-black text-slate-900 mb-2">Purge Security Audit logs?</h3>
            <p className="text-[13px] font-medium text-slate-500 mb-6 leading-relaxed">
              Are you sure? This will wipe out all past administrative records of user overrides, logins, classifications, and system edits from active tracking storage. <strong className="text-red-500">This action is audited and irreversible.</strong>
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearLogsConfirm(false)}
                className="flex-1 px-4 py-2 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                No, Keep Logs
              </button>
              <button
                type="button"
                onClick={handleClearLogs}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors border border-transparent shadow-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 className="size-3.5" />
                Yes, Purge Trail
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
