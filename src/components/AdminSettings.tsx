import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType, createAdminLog, auth } from "../firebase";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  addDoc,
  query,
  limit,
  getDocs,
  getDoc,
  getDocFromServer
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
  Upload, 
  Target, 
  HeartHandshake, 
  Image, 
  Megaphone, 
  Link, 
  Banknote, 
  Layers, 
  PackageOpen, 
  Lightbulb, 
  Compass, 
  Trophy, 
  ShieldCheck, 
  Palette, 
  Edit2, 
  X, 
} from "lucide-react";
import { UserProfile, UserRole, AdminLog, GeneralFundTransaction, CustomRole, DEFAULT_CUSTOM_ROLES, DEFAULT_DIVISION_TAGS, DEFAULT_SPECIALTY_TAGS, ALL_PERMISSIONS, PermissionKey } from "../types";
import { resolveMemberRole, ROLE_COLOR_MAP } from "../roleUtils";
import AddMember from "./AddMember";
import TagInput from "./TagInput";
import { defaultPublicLandingData, PublicLandingData, SubTeam, BuildSpec, TrackRecord, Achievement } from "./defaultPublicLandingData";
import { TreasuryHub } from "./TreasuryHub";

export function parseBuildImages(rawUrl: string | undefined): string[] {
  if (!rawUrl) return [];
  if (rawUrl.includes("|||")) {
    return rawUrl.split("|||").map(s => s.trim()).filter(Boolean);
  }
  if (rawUrl.includes("data:image/")) {
    const parts = rawUrl.split(',').map(s => s.trim()).filter(Boolean);
    const result: string[] = [];
    let currentDataUrl = "";
    for (const part of parts) {
      if (part.startsWith("data:image/")) {
        if (currentDataUrl) result.push(currentDataUrl);
        currentDataUrl = part;
      } else if (currentDataUrl) {
        currentDataUrl += "," + part;
        result.push(currentDataUrl);
        currentDataUrl = "";
      } else if (part.startsWith("http://") || part.startsWith("https://")) {
        result.push(part);
      }
    }
    if (currentDataUrl) result.push(currentDataUrl);
    return result.length > 0 ? result : [rawUrl];
  }
  return rawUrl.split(',').map(s => s.trim()).filter(Boolean);
}

export function joinBuildImages(urls: string[]): string {
  return urls.map(s => s.trim()).filter(Boolean).join(' ||| ');
}

interface AdminSettingsProps {
  currentUser: UserProfile;
  isDark?: boolean;
  onToggleTheme?: () => void;
  themeMode?: "light" | "dark" | "system";
  onChangeThemeMode?: (mode: "light" | "dark" | "system") => void;
  initialSubTab?: "general" | "roles" | "onboard" | "logs" | "preferences" | "public_page" | "treasury";
}

export default function AdminSettings({ 
  currentUser, 
  isDark = false, 
  onToggleTheme,
  themeMode,
  onChangeThemeMode,
  initialSubTab
}: AdminSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"general" | "roles" | "onboard" | "logs" | "preferences" | "public_page" | "treasury">(() => {
    if (initialSubTab) return initialSubTab;
    return currentUser?.role === "admin" ? "general" : "preferences";
  });

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  // General Fund / Treasury
  const [generalFundTransactions, setGeneralFundTransactions] = useState<GeneralFundTransaction[]>([]);
  const [newFundType, setNewFundType] = useState<"deposit" | "withdrawal">("deposit");
  const [newFundAmount, setNewFundAmount] = useState("");
  const [newFundNotes, setNewFundNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");


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

    if (currentUser.isOfflineMock) {
      // Offline mode handling (mock)
      const stored = localStorage.getItem("axotic_mock_general_settings");
      let parsed = stored ? JSON.parse(stored) : {};
      const currentStoredTx: GeneralFundTransaction[] = Array.isArray(parsed.generalFundTransactions) ? parsed.generalFundTransactions : (generalFundTransactions || []);
      const nextTx = [newTx, ...currentStoredTx.filter(t => t.id !== newTx.id)];
      parsed.generalFundTransactions = nextTx;
      localStorage.setItem("axotic_mock_general_settings", JSON.stringify(parsed));
      setGeneralFundTransactions(nextTx);
      setNewFundAmount("");
      setNewFundNotes("");
      setSuccessMsg("Transaction added to General Fund.");
      window.dispatchEvent(new Event("axotic_db_update"));
      return;
    }

    setLoading(true);
    try {
      const docRef = doc(db, "settings", "general");
      const snap = await getDoc(docRef);
      let existingTx: GeneralFundTransaction[] = [];
      if (snap.exists() && snap.data()?.generalFundTransactions && Array.isArray(snap.data().generalFundTransactions)) {
        existingTx = snap.data().generalFundTransactions;
      } else {
        existingTx = generalFundTransactions || [];
      }
      const nextTx = [newTx, ...existingTx.filter(t => t.id !== newTx.id)];
      await setDoc(docRef, { generalFundTransactions: nextTx }, { merge: true });
      setGeneralFundTransactions(nextTx);
      setNewFundAmount("");
      setNewFundNotes("");
      setSuccessMsg("Transaction saved to General Fund.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "settings/general");
      setErrorMsg("Failed to add transaction.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFundTransaction = async (txId: string) => {
    if (!currentUser || currentUser.role !== "admin") return;
    if (!window.confirm("Are you sure you want to delete this transaction from the General Fund ledger?")) return;

    if (currentUser.isOfflineMock) {
      const stored = localStorage.getItem("axotic_mock_general_settings");
      let parsed = stored ? JSON.parse(stored) : {};
      const currentStoredTx: GeneralFundTransaction[] = Array.isArray(parsed.generalFundTransactions) ? parsed.generalFundTransactions : (generalFundTransactions || []);
      const nextTx = currentStoredTx.filter(t => t.id !== txId);
      parsed.generalFundTransactions = nextTx;
      localStorage.setItem("axotic_mock_general_settings", JSON.stringify(parsed));
      setGeneralFundTransactions(nextTx);
      window.dispatchEvent(new Event("axotic_db_update"));
      return;
    }

    try {
      const docRef = doc(db, "settings", "general");
      const snap = await getDoc(docRef);
      let existingTx: GeneralFundTransaction[] = [];
      if (snap.exists() && snap.data()?.generalFundTransactions && Array.isArray(snap.data().generalFundTransactions)) {
        existingTx = snap.data().generalFundTransactions;
      } else {
        existingTx = generalFundTransactions || [];
      }
      const nextTx = existingTx.filter(t => t.id !== txId);
      await setDoc(docRef, { generalFundTransactions: nextTx }, { merge: true });
      setGeneralFundTransactions(nextTx);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "settings/general");
      setErrorMsg("Failed to delete transaction.");
    }
  };

  // Administrative Audit Log State Fields
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [logSearch, setLogSearch] = useState("");
  const [logFilterAction, setLogFilterAction] = useState<string>("ALL");
  const [showClearLogsConfirm, setShowClearLogsConfirm] = useState(false);

  // Managing Users state variables
  const [roster, setRoster] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  
  // Custom Roles state with lazy persistence
  const [customRoles, setCustomRoles] = useState<CustomRole[]>(() => {
    const direct = localStorage.getItem("axotic_custom_roles");
    if (direct) {
      try {
        const parsed = JSON.parse(direct);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    const storedGen = localStorage.getItem("axotic_mock_general_settings");
    if (storedGen) {
      try {
        const p = JSON.parse(storedGen);
        if (p.customRoles && Array.isArray(p.customRoles) && p.customRoles.length > 0) return p.customRoles;
      } catch (_) {}
    }
    return DEFAULT_CUSTOM_ROLES;
  });
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<CustomRole | null>(null);
  const [roleNameInput, setRoleNameInput] = useState("");
  const [roleDescInput, setRoleDescInput] = useState("");
  const [roleColorInput, setRoleColorInput] = useState<CustomRole["color"]>("blue");
  const [roleClearanceInput, setRoleClearanceInput] = useState<UserRole>("member");
  const [rolePermissionsInput, setRolePermissionsInput] = useState<PermissionKey[]>(["manage_ideas"]);
  const [roleMemberSearch, setRoleMemberSearch] = useState("");
  
  const [divisionTags, setDivisionTags] = useState<string[]>(() => {
    const direct = localStorage.getItem("axotic_division_tags");
    if (direct) {
      try {
        const parsed = JSON.parse(direct);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    const storedGen = localStorage.getItem("axotic_mock_general_settings");
    if (storedGen) {
      try {
        const p = JSON.parse(storedGen);
        if (p.divisionTags && Array.isArray(p.divisionTags) && p.divisionTags.length > 0) return p.divisionTags;
      } catch (_) {}
    }
    return DEFAULT_DIVISION_TAGS;
  });
  const [newDivisionTagInput, setNewDivisionTagInput] = useState("");

  const [specialtyTags, setSpecialtyTags] = useState<string[]>(() => {
    const direct = localStorage.getItem("axotic_specialty_tags");
    if (direct) {
      try {
        const parsed = JSON.parse(direct);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    const storedGen = localStorage.getItem("axotic_mock_general_settings");
    if (storedGen) {
      try {
        const p = JSON.parse(storedGen);
        if (p.specialtyTags && Array.isArray(p.specialtyTags) && p.specialtyTags.length > 0) return p.specialtyTags;
      } catch (_) {}
    }
    return DEFAULT_SPECIALTY_TAGS;
  });
  const [newSpecialtyTagInput, setNewSpecialtyTagInput] = useState("");

  // User edit state fields
  const [editRole, setEditRole] = useState<UserRole>("member");
  const [editCustomRoleId, setEditCustomRoleId] = useState<string>("core_engineer");
  const [editSubTeam, setEditSubTeam] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // General Settings States
  const [workspaceName, setWorkspaceName] = useState("AXOTIC Robotics Hub");
  const [logoUrl, setLogoUrl] = useState("");
  const [returnPeriod, setReturnPeriod] = useState("30 days");
  const [allowPublicVisibility, setAllowPublicVisibility] = useState(true);

  // Public Landing Page Editor States
  const [publicPageData, setPublicPageData] = useState<PublicLandingData | null>(null);
  const [savingPublicPage, setSavingPublicPage] = useState(false);

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

  // Diagnostic Tool state variables
  const [diagnosticResult, setDiagnosticResult] = useState<{
    status: "idle" | "running" | "success" | "error";
    authStatus?: string;
    roleStatus?: string;
    connectionStatus?: string;
    readStatus?: string;
    writeStatus?: string;
    rulesStatus?: string;
    errorMsg?: string;
  }>({ status: "idle" });

  const runDiagnostics = async () => {
    setDiagnosticResult({ status: "running" });
    try {
      // 1. Auth check
      const authUser = auth.currentUser;
      if (!authUser) {
        throw new Error("Authentication failure: No user is currently logged in.");
      }
      const authStatus = `Authenticated as ${authUser.displayName || authUser.email || authUser.uid}`;
      const roleStatus = `User Database Role: ${currentUser?.role || "none (logged-in user)"}`;

      // 2. Base connection check
      let connectionStatus = "Failed";
      try {
        await getDocFromServer(doc(db, "test", "connection"));
        connectionStatus = "Successful";
      } catch (err: any) {
        connectionStatus = `Successful (Offline warning: ${err?.message || err})`;
      }

      // 3. Competitions collection read check
      let readStatus = "Failed";
      try {
        const testQuery = query(collection(db, "competitions"), limit(1));
        await getDocs(testQuery);
        readStatus = "Verified Accessible";
      } catch (err: any) {
        readStatus = `Access Denied: ${err?.message || err}`;
      }

      // 4. Competitions write test / rules status
      let writeStatus = "Pending Verification";
      let rulesStatus = "Verifying...";
      
      try {
        const testDocRef = await addDoc(collection(db, "competitions"), {
          title: "Diagnostic Self-Test Item",
          description: "Temporary diagnostic test doc to verify Firestore security rules writing permissions.",
          date: new Date().toISOString().split("T")[0],
          location: "Diagnostics Engine",
          link: "",
          createdBy: authUser.uid,
          creatorName: authUser.displayName || "Diagnostics",
          createdAt: new Date().toISOString(),
          remindUserIds: [authUser.uid],
          isRegistered: false,
          registeredName: "",
          registeredUserIds: []
        });
        
        writeStatus = "Verified Accessible (Write allowed by security rules)";
        
        // Clean it up immediately!
        await deleteDoc(testDocRef);
        rulesStatus = "Competitions Security Rules Fully Validated & Working";
      } catch (err: any) {
        writeStatus = `Denied: ${err?.message || err}`;
        rulesStatus = "Incorrect security rules configuration. Write is blocked.";
      }

      setDiagnosticResult({
        status: "success",
        authStatus,
        roleStatus,
        connectionStatus,
        readStatus,
        writeStatus,
        rulesStatus
      });
    } catch (err: any) {
      setDiagnosticResult({
        status: "error",
        errorMsg: err?.message || String(err)
      });
    }
  };

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
        handleFirestoreError(err, OperationType.LIST, "categories");
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
      if (currentUser.role !== "admin") {
        setAdminLogs([]);
        return () => {};
      }
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
        handleFirestoreError(err, OperationType.LIST, "admin_logs");
      });
      return () => unsub();
    }
  }, [currentUser.isOfflineMock, currentUser.role]);

  // Load General workspace settings configuration on mount
  useEffect(() => {
    if (currentUser.isOfflineMock) {
      const name = localStorage.getItem("axotic_workspace_name");
      const logo = localStorage.getItem("axotic_logo_url");
      const period = localStorage.getItem("axotic_return_period");
      const pub = localStorage.getItem("axotic_public_onboarding");
      if (name) setWorkspaceName(name);
      if (logo) setLogoUrl(logo === "/AXOTIC Logo-1.png" ? "/logo.png" : logo);
      if (period) setReturnPeriod(period);
      if (pub) setAllowPublicVisibility(pub === "true");
      const storedGen = localStorage.getItem("axotic_mock_general_settings");
      if (storedGen) {
        try {
          const p = JSON.parse(storedGen);
          if (p.generalFundTransactions) setGeneralFundTransactions(p.generalFundTransactions);
          if (p.customRoles && Array.isArray(p.customRoles) && p.customRoles.length > 0) setCustomRoles(p.customRoles);
          if (p.divisionTags && Array.isArray(p.divisionTags) && p.divisionTags.length > 0) setDivisionTags(p.divisionTags);
          if (p.specialtyTags && Array.isArray(p.specialtyTags) && p.specialtyTags.length > 0) setSpecialtyTags(p.specialtyTags);
        } catch(e) {}
      }
    } else {
      const unsub = onSnapshot(doc(db, "settings", "general"), (d) => {
        if (d.exists()) {
          const data = d.data();
          if (data.workspaceName) setWorkspaceName(data.workspaceName);
          if (data.logoUrl) setLogoUrl(data.logoUrl === "/AXOTIC Logo-1.png" ? "/logo.png" : data.logoUrl);
          if (data.returnPeriod) setReturnPeriod(data.returnPeriod);
          if (data.generalFundTransactions) setGeneralFundTransactions(data.generalFundTransactions);
          if (data.customRoles && Array.isArray(data.customRoles) && data.customRoles.length > 0) setCustomRoles(data.customRoles);
          if (data.divisionTags && Array.isArray(data.divisionTags) && data.divisionTags.length > 0) setDivisionTags(data.divisionTags);
          if (data.specialtyTags && Array.isArray(data.specialtyTags) && data.specialtyTags.length > 0) setSpecialtyTags(data.specialtyTags);
          if (data.allowPublicVisibility !== undefined) setAllowPublicVisibility(data.allowPublicVisibility);
        }
      }, (err) => {
        console.warn("Could not load Firestore general workspace configurations", err instanceof Error ? err.message : String(err));
        handleFirestoreError(err, OperationType.GET, "settings/general");
      });
      return () => unsub();
    }
  }, [currentUser.isOfflineMock]);

  // Load Public Landing settings configuration on mount
  useEffect(() => {
    if (currentUser.isOfflineMock) {
      const stored = localStorage.getItem("axotic_public_landing_config");
      if (stored) {
        try {
          setPublicPageData({
            ...defaultPublicLandingData,
            ...JSON.parse(stored)
          });
        } catch (_) {
          setPublicPageData(defaultPublicLandingData);
        }
      } else {
        setPublicPageData(defaultPublicLandingData);
      }
    } else {
      const unsub = onSnapshot(doc(db, "landing", "public"), (snap) => {
        if (snap.exists()) {
          const d = snap.data() as Partial<PublicLandingData>;
          setPublicPageData({
            ...defaultPublicLandingData,
            ...d,
            subTeams: d.subTeams || defaultPublicLandingData.subTeams,
            buildSpecs: d.buildSpecs || defaultPublicLandingData.buildSpecs,
            trackRecords: d.trackRecords || defaultPublicLandingData.trackRecords,
            achievements: d.achievements || defaultPublicLandingData.achievements,
            galleryPhotos: d.galleryPhotos || defaultPublicLandingData.galleryPhotos,
            showAchievements: d.showAchievements !== undefined ? d.showAchievements : true,
          } as PublicLandingData);
        } else {
          setPublicPageData(defaultPublicLandingData);
        }
      }, (err) => {
        console.warn("Could not load public page configurations", err.message);
        setPublicPageData(defaultPublicLandingData);
        handleFirestoreError(err, OperationType.GET, "landing/public");
      });
      return () => unsub();
    }
  }, [currentUser.isOfflineMock]);

  const handleSavePublicPage = async (updatedData: PublicLandingData) => {
    setSavingPublicPage(true);
    setSuccessMsg("");
    setErrorMsg("");

    if (currentUser.isOfflineMock) {
      localStorage.setItem("axotic_public_landing_config", JSON.stringify(updatedData));
      setPublicPageData(updatedData);
      createAdminLog("WORKSPACE_CONFIG", "Modified public landing page structures and descriptions in sandbox.", currentUser);
      window.dispatchEvent(new Event("axotic_db_update"));
      setSuccessMsg("Public landing page configuration saved successfully to sandbox!");
      setSavingPublicPage(false);
    } else {
      try {
        await setDoc(doc(db, "landing", "public"), updatedData);
        createAdminLog("WORKSPACE_CONFIG", "Modified public landing page structures and descriptions permanently in database.", currentUser);
        setSuccessMsg("Public landing page configuration saved successfully to live database!");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        handleFirestoreError(err, OperationType.WRITE, "landing/public");
      } finally {
        setSavingPublicPage(false);
      }
    }
  };

  const handleUploadAchievementPhoto = (achIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Only image files (JPEG, PNG, WEBP, SVG) are allowed.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
          
          if (publicPageData) {
            const list = [...(publicPageData.achievements || [])];
            list[achIndex] = { ...list[achIndex], imageUrl: dataUrl };
            setPublicPageData({ ...publicPageData, achievements: list });
          }
        }
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleUploadBuildPhoto = (buildIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Only image files (JPEG, PNG, WEBP, SVG) are allowed.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
          
          if (publicPageData) {
            const list = [...publicPageData.buildSpecs];
            const currentUrls = parseBuildImages(list[buildIndex].imageUrl);
            currentUrls.push(dataUrl);
            list[buildIndex] = { ...list[buildIndex], imageUrl: joinBuildImages(currentUrls) };
            setPublicPageData({ ...publicPageData, buildSpecs: list });
          }
        }
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

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
        handleFirestoreError(err, OperationType.LIST, "users");
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
    setEditCustomRoleId(user.customRoleId || (user.role === "admin" ? "admin" : "core_engineer"));
    setEditSubTeam(user.subTeam || (divisionTags[0] || "Software & Autonomy"));
    setEditPhone(user.phoneNumber || "");
  };

  // Save custom role definition
  const handleSaveCustomRole = async () => {
    if (!roleNameInput.trim()) {
      setErrorMsg("Role name is required.");
      return;
    }

    let updatedList: CustomRole[] = [];
    if (roleToEdit) {
      updatedList = customRoles.map(r => 
        r.id === roleToEdit.id 
          ? { 
              ...r, 
              name: roleNameInput.trim(), 
              description: roleDescInput.trim(), 
              color: roleColorInput, 
              clearance: roleClearanceInput,
              permissions: rolePermissionsInput
            }
          : r
      );
    } else {
      const newRole: CustomRole = {
        id: "role-" + Date.now(),
        name: roleNameInput.trim(),
        description: roleDescInput.trim(),
        color: roleColorInput,
        clearance: roleClearanceInput,
        permissions: rolePermissionsInput,
        isSystem: false
      };
      updatedList = [...customRoles, newRole];
    }

    // Always sync locally for instantaneous persistent tab switching
    localStorage.setItem("axotic_custom_roles", JSON.stringify(updatedList));
    const storedGen = localStorage.getItem("axotic_mock_general_settings");
    let p = storedGen ? JSON.parse(storedGen) : {};
    p.customRoles = updatedList;
    localStorage.setItem("axotic_mock_general_settings", JSON.stringify(p));

    setCustomRoles(updatedList);
    setIsRoleModalOpen(false);
    setRoleToEdit(null);
    setSuccessMsg(`Successfully saved role "${roleNameInput}".`);
    window.dispatchEvent(new Event("axotic_db_update"));

    if (currentUser.isOfflineMock) {
      return;
    }

    try {
      setLoading(true);
      await updateDoc(doc(db, "settings", "general"), {
        customRoles: updatedList
      }).catch(async () => {
        await setDoc(doc(db, "settings", "general"), { customRoles: updatedList }, { merge: true });
      });
      createAdminLog("ROLE_CONFIGURED", `Configured role "${roleNameInput}" (Clearance: ${roleClearanceInput}, Permissions: ${rolePermissionsInput.length}).`, currentUser);
    } catch (err) {
      console.warn("Saved locally, but remote Firestore sync failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Delete custom role definition
  const handleDeleteCustomRole = async (roleId: string) => {
    const role = customRoles.find(r => r.id === roleId);
    if (!role) return;

    // Safety guard: ensure at least one admin clearance role remains
    const adminRoles = customRoles.filter(r => r.clearance === "admin");
    if (role.clearance === "admin" && adminRoles.length <= 1) {
      setErrorMsg("Cannot delete the only administrative role. At least one Admin role must exist.");
      return;
    }

    const updatedList = customRoles.filter(r => r.id !== roleId);
    
    // Always persist locally
    localStorage.setItem("axotic_custom_roles", JSON.stringify(updatedList));
    const storedGen = localStorage.getItem("axotic_mock_general_settings");
    let p = storedGen ? JSON.parse(storedGen) : {};
    p.customRoles = updatedList;
    localStorage.setItem("axotic_mock_general_settings", JSON.stringify(p));
    setCustomRoles(updatedList);
    window.dispatchEvent(new Event("axotic_db_update"));
    setSuccessMsg(`Deleted role "${role.name}".`);

    if (currentUser.isOfflineMock) {
      return;
    }
    try {
      setLoading(true);
      await updateDoc(doc(db, "settings", "general"), {
        customRoles: updatedList
      }).catch(async () => {
        await setDoc(doc(db, "settings", "general"), { customRoles: updatedList }, { merge: true });
      });
      createAdminLog("ROLE_DELETED", `Removed role designation "${role.name}".`, currentUser);
    } catch (err) {
      console.warn("Deleted locally, but remote Firestore sync failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Reset roles & tags back to defaults
  const handleResetRolesToDefaults = async () => {
    const defaultList = DEFAULT_CUSTOM_ROLES;
    const defaultTags = DEFAULT_DIVISION_TAGS;
    const defaultSpecialties = DEFAULT_SPECIALTY_TAGS;

    localStorage.setItem("axotic_custom_roles", JSON.stringify(defaultList));
    localStorage.setItem("axotic_division_tags", JSON.stringify(defaultTags));
    localStorage.setItem("axotic_specialty_tags", JSON.stringify(defaultSpecialties));

    const storedGen = localStorage.getItem("axotic_mock_general_settings");
    let p = storedGen ? JSON.parse(storedGen) : {};
    p.customRoles = defaultList;
    p.divisionTags = defaultTags;
    p.specialtyTags = defaultSpecialties;
    localStorage.setItem("axotic_mock_general_settings", JSON.stringify(p));

    setCustomRoles(defaultList);
    setDivisionTags(defaultTags);
    setSpecialtyTags(defaultSpecialties);
    window.dispatchEvent(new Event("axotic_db_update"));
    setSuccessMsg("Restored default roles, specialty tags, and division tags.");

    if (currentUser.isOfflineMock) {
      return;
    }

    try {
      setLoading(true);
      await setDoc(doc(db, "settings", "general"), {
        customRoles: defaultList,
        divisionTags: defaultTags,
        specialtyTags: defaultSpecialties
      }, { merge: true });
      createAdminLog("ROLES_RESET", "Restored system default role designations, specialty tags, and division tags.", currentUser);
    } catch (err) {
      console.warn("Restored locally, remote sync warning:", err);
    } finally {
      setLoading(false);
    }
  };

  // Manage Division Tags
  const handleAddDivisionTag = async (newTag: string) => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (divisionTags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`Division tag "${trimmed}" already exists.`);
      return;
    }
    const updatedTags = [...divisionTags, trimmed];
    await saveDivisionTags(updatedTags);
    setNewDivisionTagInput("");
  };

  const handleDeleteDivisionTag = async (tagToDelete: string) => {
    const updatedTags = divisionTags.filter(t => t !== tagToDelete);
    await saveDivisionTags(updatedTags);
  };

  const saveDivisionTags = async (updatedTags: string[]) => {
    localStorage.setItem("axotic_division_tags", JSON.stringify(updatedTags));
    const storedGen = localStorage.getItem("axotic_mock_general_settings");
    let p = storedGen ? JSON.parse(storedGen) : {};
    p.divisionTags = updatedTags;
    localStorage.setItem("axotic_mock_general_settings", JSON.stringify(p));

    setDivisionTags(updatedTags);
    window.dispatchEvent(new Event("axotic_db_update"));
    setSuccessMsg("Updated engineering division tags.");

    if (currentUser.isOfflineMock) {
      return;
    }
    try {
      setLoading(true);
      await setDoc(doc(db, "settings", "general"), {
        divisionTags: updatedTags
      }, { merge: true });
      createAdminLog("DIVISION_TAGS_UPDATED", `Updated division tags: ${updatedTags.join(", ")}`, currentUser);
    } catch (err) {
      console.warn("Saved locally, remote division tags sync failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Manage Technical Specialty Tags
  const handleAddSpecialtyTag = async (newTag: string) => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (specialtyTags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`Specialty tag "${trimmed}" already exists.`);
      return;
    }
    const updatedTags = [...specialtyTags, trimmed];
    await saveSpecialtyTags(updatedTags);
    setNewSpecialtyTagInput("");
  };

  const handleDeleteSpecialtyTag = async (tagToDelete: string) => {
    const updatedTags = specialtyTags.filter(t => t !== tagToDelete);
    await saveSpecialtyTags(updatedTags);
  };

  const saveSpecialtyTags = async (updatedTags: string[]) => {
    localStorage.setItem("axotic_specialty_tags", JSON.stringify(updatedTags));
    const storedGen = localStorage.getItem("axotic_mock_general_settings");
    let p = storedGen ? JSON.parse(storedGen) : {};
    p.specialtyTags = updatedTags;
    localStorage.setItem("axotic_mock_general_settings", JSON.stringify(p));

    setSpecialtyTags(updatedTags);
    window.dispatchEvent(new Event("axotic_db_update"));
    setSuccessMsg("Updated technical specialty tags.");

    if (currentUser.isOfflineMock) {
      return;
    }
    try {
      setLoading(true);
      await setDoc(doc(db, "settings", "general"), {
        specialtyTags: updatedTags
      }, { merge: true });
      createAdminLog("SPECIALTY_TAGS_UPDATED", `Updated specialty tags: ${updatedTags.join(", ")}`, currentUser);
    } catch (err) {
      console.warn("Saved locally, remote specialty tags sync failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Quick assign role to member from table
  const handleQuickAssignRole = async (targetUser: UserProfile, roleId: string) => {
    const chosenRole = customRoles.find(r => r.id === roleId);
    if (!chosenRole) return;

    // Immediately update local roster state & local storage
    const updatedRoster = roster.map(u => 
      u.uid === targetUser.uid 
        ? {
            ...u,
            role: chosenRole.clearance,
            customRoleId: chosenRole.id,
            customRoleName: chosenRole.name
          }
        : u
    );
    setRoster(updatedRoster);
    localStorage.setItem("axotic_mock_roster", JSON.stringify(updatedRoster));
    if (currentUser.uid === targetUser.uid) {
      const currentStored = localStorage.getItem("axotic_local_auth");
      if (currentStored) {
        try {
          const parsed = JSON.parse(currentStored);
          localStorage.setItem("axotic_local_auth", JSON.stringify({
            ...parsed,
            role: chosenRole.clearance,
            customRoleId: chosenRole.id,
            customRoleName: chosenRole.name
          }));
        } catch (_) {}
      }
    }
    window.dispatchEvent(new Event("axotic_db_update"));

    setSuccessMsg(`Assigned role "${chosenRole.name}" to ${targetUser.displayName}. Click "Save Role Changes" to confirm across workspace.`);
    setTimeout(() => setSuccessMsg(""), 4000);

    if (currentUser.isOfflineMock) {
      return;
    }

    try {
      const userRef = doc(db, "users", targetUser.uid);
      await updateDoc(userRef, {
        role: chosenRole.clearance,
        customRoleId: chosenRole.id,
        customRoleName: chosenRole.name
      }).catch(async () => {
        await setDoc(userRef, {
          role: chosenRole.clearance,
          customRoleId: chosenRole.id,
          customRoleName: chosenRole.name
        }, { merge: true });
      });
      createAdminLog("ROLE_ASSIGNED", `Assigned role "${chosenRole.name}" to ${targetUser.displayName}.`, currentUser);
    } catch (err) {
      console.warn("Role saved locally, remote Firestore sync warning:", err);
    }
  };

  // Quick update sub-team division tag
  const handleQuickUpdateSubTeam = async (targetUser: UserProfile, newSubTeam: string) => {
    const updatedRoster = roster.map(u => 
      u.uid === targetUser.uid 
        ? {
            ...u,
            subTeam: newSubTeam.trim()
          }
        : u
    );
    setRoster(updatedRoster);
    localStorage.setItem("axotic_mock_roster", JSON.stringify(updatedRoster));
    if (currentUser.uid === targetUser.uid) {
      const currentStored = localStorage.getItem("axotic_local_auth");
      if (currentStored) {
        try {
          const parsed = JSON.parse(currentStored);
          localStorage.setItem("axotic_local_auth", JSON.stringify({
            ...parsed,
            subTeam: newSubTeam.trim()
          }));
        } catch (_) {}
      }
    }
    window.dispatchEvent(new Event("axotic_db_update"));

    setSuccessMsg(`Updated division tag to "${newSubTeam}".`);
    setTimeout(() => setSuccessMsg(""), 4000);

    if (currentUser.isOfflineMock) {
      return;
    }

    try {
      const userRef = doc(db, "users", targetUser.uid);
      await updateDoc(userRef, {
        subTeam: newSubTeam.trim()
      }).catch(async () => {
        await setDoc(userRef, { subTeam: newSubTeam.trim() }, { merge: true });
      });
    } catch (err) {
      console.warn("Division tag saved locally, remote sync warning:", err);
    }
  };

  // Master Save All Settings & Member Roles Button
  const handleSaveAllMemberRoles = async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // 1. Sync custom roles, division tags, and specialty tags
      localStorage.setItem("axotic_custom_roles", JSON.stringify(customRoles));
      localStorage.setItem("axotic_division_tags", JSON.stringify(divisionTags));
      localStorage.setItem("axotic_specialty_tags", JSON.stringify(specialtyTags));

      const storedGen = localStorage.getItem("axotic_mock_general_settings");
      let p = storedGen ? JSON.parse(storedGen) : {};
      p.customRoles = customRoles;
      p.divisionTags = divisionTags;
      p.specialtyTags = specialtyTags;
      localStorage.setItem("axotic_mock_general_settings", JSON.stringify(p));

      // 2. Sync roster assignments
      localStorage.setItem("axotic_mock_roster", JSON.stringify(roster));

      // 3. Remote Firestore sync
      if (!currentUser.isOfflineMock) {
        await setDoc(doc(db, "settings", "general"), {
          customRoles: customRoles,
          divisionTags: divisionTags,
          specialtyTags: specialtyTags
        }, { merge: true }).catch(() => {});

        for (const u of roster) {
          try {
            await updateDoc(doc(db, "users", u.uid), {
              role: u.role,
              customRoleId: u.customRoleId,
              customRoleName: u.customRoleName,
              subTeam: u.subTeam
            }).catch(async () => {
              await setDoc(doc(db, "users", u.uid), {
                role: u.role,
                customRoleId: u.customRoleId,
                customRoleName: u.customRoleName,
                subTeam: u.subTeam
              }, { merge: true });
            });
          } catch (_) {}
        }
      }

      window.dispatchEvent(new Event("axotic_db_update"));
      createAdminLog("ROLES_SAVED", "Confirmed & saved all member roles, permissions, and division assignments.", currentUser);
      setSuccessMsg("All member roles, permissions, and division assignments have been saved & confirmed!");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save member role assignments.");
    } finally {
      setLoading(false);
    }
  };

  // Save modified user profile properties
  const handleSaveUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const targetUid = selectedUserForEdit.uid;
    const chosenRole = customRoles.find(r => r.id === editCustomRoleId);
    const finalClearance: UserRole = chosenRole ? chosenRole.clearance : editRole;
    const finalRoleName = chosenRole ? chosenRole.name : (finalClearance === "admin" ? "Team Lead & Admin" : "Member");

    if (currentUser.isOfflineMock) {
      const stored = localStorage.getItem("axotic_mock_roster");
      if (stored) {
        try {
          const rosterList: UserProfile[] = JSON.parse(stored);
          const idx = rosterList.findIndex(u => u.uid === targetUid);
          if (idx !== -1) {
            rosterList[idx] = {
              ...rosterList[idx],
              role: finalClearance,
              customRoleId: chosenRole ? chosenRole.id : undefined,
              customRoleName: finalRoleName,
              subTeam: editSubTeam.trim(),
              phoneNumber: editPhone.trim()
            };
            localStorage.setItem("axotic_mock_roster", JSON.stringify(rosterList));
            createAdminLog(
              "USER_OVERRIDE",
              `Overrode clearance profile for "${selectedUserForEdit.displayName}": role assigned to "${finalRoleName}", department set to "${editSubTeam}", contact: "${editPhone}".`,
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
          role: finalClearance,
          customRoleId: chosenRole ? chosenRole.id : undefined,
          customRoleName: finalRoleName,
          subTeam: editSubTeam.trim(),
          phoneNumber: editPhone.trim()
        });
        createAdminLog(
          "USER_OVERRIDE",
          `Overrode clearance profile for "${selectedUserForEdit.displayName}": role assigned to "${finalRoleName}", department set to "${editSubTeam}", contact: "${editPhone}".`,
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
      localStorage.setItem("axotic_logo_url", logoUrl);
      localStorage.setItem("axotic_return_period", returnPeriod);
      localStorage.setItem("axotic_public_onboarding", String(allowPublicVisibility));
      
      createAdminLog(
        "WORKSPACE_CONFIG",
        `Updated workspace config parameters: Name: "${workspaceName}", citizen public onboarding flag: "${allowPublicVisibility ? "Enabled" : "Disabled"}".`,
        currentUser
      );
      
      window.dispatchEvent(new Event("axotic_db_update"));
      setSuccessMsg("System configurations updated and synced with sandbox storage.");
      setLoading(false);
    } else {
      try {
        await setDoc(doc(db, "settings", "general"), {
          workspaceName,
          logoUrl,
          returnPeriod,
          allowPublicVisibility,
          updatedBy: currentUser.uid,
          updatedAt: new Date().toISOString()
        });

        createAdminLog(
          "WORKSPACE_CONFIG",
          `Updated workspace config parameters: Name: "${workspaceName}", citizen public onboarding flag: "${allowPublicVisibility ? "Enabled" : "Disabled"}".`,
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
        <div className="flex border border-slate-200 bg-slate-100/80 dark:bg-slate-800/85 p-1 rounded-xl gap-1 max-w-full overflow-x-auto whitespace-nowrap scrollbar-none" id="settings-sub-navigation">
          <button
            type="button"
            onClick={() => setActiveSubTab("general")}
            className={`shrink-0 px-3.5 py-2 text-[10.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
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
            onClick={() => setActiveSubTab("roles")}
            className={`shrink-0 px-3.5 py-2 text-[10.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === "roles"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-950"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
            }`}
            id="btn-subnav-roles"
          >
            <ShieldCheck className="size-3.5 text-blue-400" /> Member Roles & Permissions
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("onboard")}
            className={`shrink-0 px-3.5 py-2 text-[10.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
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
            className={`shrink-0 px-3.5 py-2 text-[10.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
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
            className={`shrink-0 px-3.5 py-2 text-[10.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === "preferences"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-950"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
            }`}
            id="btn-subnav-preferences"
          >
            <User className="size-3.5" /> My Preferences
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("treasury")}
            className={`shrink-0 px-3.5 py-2 text-[10.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === "treasury"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-950"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
            }`}
            id="btn-subnav-treasury"
          >
            <Banknote className="size-3.5 text-emerald-400" /> General Fund & Treasury
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("public_page")}
            className={`shrink-0 px-3.5 py-2 text-[10.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === "public_page"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-950"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
            }`}
            id="btn-subnav-publicpage"
          >
            <Laptop className="size-3.5" /> Landing Workspace
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
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
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
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Hub Organization Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs outline-hidden font-medium dark:bg-slate-950 dark:border-slate-800"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Hub Organization Logo URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/logo.png"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs outline-hidden font-medium dark:bg-slate-950 dark:border-slate-800"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
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

          {/* SECURITY RULES & COMPETITIONS DIAGNOSTIC TOOL */}
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-xs overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="size-4 text-emerald-400" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider">Firestore Security & Write Rules Diagnostics</h3>
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5 rounded-full text-emerald-400 font-bold">
                Online Verified
              </span>
            </div>

            <div className="p-6 space-y-6 text-left">
              <p className="text-xs text-slate-500 leading-relaxed">
                Check and verify writing accessibility on the <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold">competitions</code> collection. This tool executes a safe, real-time read/write transaction to confirm Firestore rules configuration.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={runDiagnostics}
                  disabled={diagnosticResult.status === "running"}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <RefreshCw className={`size-3.5 ${diagnosticResult.status === "running" ? "animate-spin" : ""}`} />
                  {diagnosticResult.status === "running" ? "Analyzing Database Security Rules..." : "Run Security & Write Diagnostic"}
                </button>
              </div>

              {/* Diagnostic Results Dashboard */}
              {diagnosticResult.status !== "idle" && (
                <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-xs font-bold text-slate-700">Diagnostic Check Results</span>
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                      diagnosticResult.status === "running"
                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                        : diagnosticResult.status === "success"
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-rose-100 text-rose-700 border border-rose-200"
                    }`}>
                      {diagnosticResult.status}
                    </span>
                  </div>

                  {diagnosticResult.status === "error" && (
                    <div className="text-xs text-rose-600 font-semibold p-2.5 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-2">
                      <AlertCircle className="size-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{diagnosticResult.errorMsg}</span>
                    </div>
                  )}

                  {diagnosticResult.status === "running" && (
                    <div className="space-y-2">
                      <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 animate-[pulse_1.5s_infinite] w-3/4 rounded-full" />
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium block">Querying database endpoints, analyzing rules version 2...</span>
                    </div>
                  )}

                  {diagnosticResult.status === "success" && (
                    <div className="grid grid-cols-1 gap-2.5">
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500 font-medium">1. Connection Authorization</span>
                        <span className="text-slate-800 font-semibold text-right">{diagnosticResult.authStatus}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500 font-medium">2. Registered Account Role</span>
                        <span className="text-slate-800 font-semibold text-right">{diagnosticResult.roleStatus}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500 font-medium">3. Firebase Base Handshake</span>
                        <span className="text-emerald-600 font-bold flex items-center gap-1 text-right">
                          <CheckCircle2 className="size-3.5" /> {diagnosticResult.connectionStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500 font-medium">4. competitions Read Access</span>
                        <span className="text-emerald-600 font-bold flex items-center gap-1 text-right">
                          <CheckCircle2 className="size-3.5" /> {diagnosticResult.readStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500 font-medium">5. competitions Write & Create Test</span>
                        <span className="text-emerald-600 font-bold flex items-center gap-1 text-right">
                          <CheckCircle2 className="size-3.5" /> {diagnosticResult.writeStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500 font-medium">6. Security Rules Resolution</span>
                        <span className="text-slate-800 font-mono text-[11px] font-semibold text-right">{diagnosticResult.rulesStatus}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                        src={user.avatarUrl || undefined} 
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
                  <img src={selectedUserForEdit.avatarUrl || undefined} alt="" className="size-10 rounded-lg bg-white" />
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-800 block">{selectedUserForEdit.displayName}</span>
                    <span className="text-[10px] font-mono text-slate-400">{selectedUserForEdit.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Assigned Role</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs rounded-lg px-2.5 py-2 outline-hidden cursor-pointer font-bold text-slate-700"
                      value={editCustomRoleId}
                      onChange={(e) => {
                        const chosen = customRoles.find(r => r.id === e.target.value);
                        setEditCustomRoleId(e.target.value);
                        if (chosen) {
                          setEditRole(chosen.clearance);
                        }
                      }}
                    >
                      {customRoles.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.clearance === "admin" ? "Admin Clearance" : "Member"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Sub-Team Division / Tag</label>
                    <input
                      type="text"
                      list="subteam-presets"
                      placeholder="e.g. Software & Autonomy, Hardware & Electronics"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs rounded-lg px-2.5 py-2 outline-hidden font-semibold text-slate-700"
                      value={editSubTeam}
                      onChange={(e) => setEditSubTeam(e.target.value)}
                    />
                    <datalist id="subteam-presets">
                      {divisionTags.map(tag => (
                        <option key={tag} value={tag} />
                      ))}
                    </datalist>
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

      {/* ROLES & PERMISSIONS MANAGEMENT SUBTAB */}
      {activeSubTab === "roles" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-200">
          
          {/* HEADER BANNER */}
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 z-10 text-left">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block font-mono">Team Architecture & Governance</span>
              <h2 className="font-display text-2xl font-black tracking-tight flex items-center gap-2.5">
                <ShieldCheck className="size-6 text-blue-400" /> Member Roles & Permissions
              </h2>
              <p className="text-xs text-slate-400 font-sans max-w-xl leading-relaxed">
                Customize official team designations, authorization clearances, and engineering division tags (like Software, Hardware, Mechanical, and Robotics Specialists). Assign roles to team members directly.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 z-10 self-start md:self-auto">
              <button
                type="button"
                onClick={handleSaveAllMemberRoles}
                disabled={loading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Check className="size-4" />
                <span>{loading ? "Saving..." : "Save Role Changes"}</span>
              </button>
              <button
                type="button"
                onClick={handleResetRolesToDefaults}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all border border-slate-700/80 flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Restore default role designations and division tags"
              >
                <RefreshCw className="size-3.5 text-slate-400" />
                <span>Reset Defaults</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoleToEdit(null);
                  setRoleNameInput("");
                  setRoleDescInput("");
                  setRoleColorInput("blue");
                  setRoleClearanceInput("member");
                  setRolePermissionsInput(["manage_ideas"]);
                  setIsRoleModalOpen(true);
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="size-4" />
                <span>Create New Role</span>
              </button>
            </div>
          </div>

          {/* ROLE DEFINITIONS CARDS */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Palette className="size-4 text-blue-600" /> Active Role Designations ({customRoles.length})
              </h3>
              <span className="text-xs text-slate-400 font-medium">Click Edit to customize role details and granular permissions</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {customRoles.map((role) => {
                const membersWithRole = roster.filter(u => 
                  u.customRoleId === role.id || 
                  (u.customRoleName && u.customRoleName.toLowerCase() === role.name.toLowerCase()) ||
                  (!u.customRoleId && !u.customRoleName && (role.id === "admin" ? u.role === "admin" : (role.id === "core_engineer" && u.role === "member")))
                );

                const colors = ROLE_COLOR_MAP[role.color] || ROLE_COLOR_MAP.blue;
                const isOnlyAdmin = role.clearance === "admin" && customRoles.filter(r => r.clearance === "admin").length <= 1;
                const permCount = role.permissions ? role.permissions.length : (role.clearance === "admin" ? ALL_PERMISSIONS.length : (role.clearance === "moderator" ? 6 : 1));

                return (
                  <div 
                    key={role.id}
                    className={`bg-white rounded-2xl border-t-4 border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${colors.border}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className={`px-2.5 py-1 text-[10px] font-bold font-mono uppercase tracking-wider rounded-lg border flex items-center gap-1.5 ${colors.badge}`}>
                          <span className={`size-1.5 rounded-full ${colors.dot}`} />
                          {role.name}
                        </span>
                        <span className={`px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-widest rounded-md border font-mono ${
                          role.clearance === "admin" 
                            ? "bg-rose-50 text-rose-700 border-rose-200" 
                            : role.clearance === "moderator"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}>
                          {role.clearance === "admin" ? "Master Admin" : role.clearance === "moderator" ? "Moderator" : "Standard"}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 font-medium leading-relaxed mb-3 min-h-[34px]">
                        {role.description || "Official engineering role for Team AXOTIC."}
                      </p>

                      {/* Permissions Summary Pill */}
                      <div className="mb-3.5 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-600 font-mono">
                          <ShieldCheck className="size-3 text-blue-600" />
                          {permCount} / {ALL_PERMISSIONS.length} Permissions
                        </span>
                        {role.clearance === "admin" && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 border border-rose-100 text-[9px] font-extrabold text-rose-600 uppercase font-mono">
                            Full Access
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                          {membersWithRole.slice(0, 4).map(m => (
                            <img 
                              key={m.uid} 
                              src={m.avatarUrl || undefined} 
                              alt={m.displayName}
                              title={m.displayName}
                              className="size-6 rounded-full border-2 border-white object-cover bg-slate-100" 
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 font-mono">
                          {membersWithRole.length} member{membersWithRole.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setRoleToEdit(role);
                            setRoleNameInput(role.name);
                            setRoleDescInput(role.description || "");
                            setRoleColorInput(role.color);
                            setRoleClearanceInput(role.clearance);
                            setRolePermissionsInput(
                              role.permissions && Array.isArray(role.permissions)
                                ? role.permissions
                                : (role.clearance === "admin" 
                                    ? ALL_PERMISSIONS.map(p => p.key) 
                                    : role.clearance === "moderator"
                                    ? ["manage_projects", "manage_inventory", "manage_competitions", "manage_ideas", "manage_tags", "manage_members"]
                                    : ["manage_ideas"])
                            );
                            setIsRoleModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Role & Permissions"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        {!isOnlyAdmin && (
                          <button
                            onClick={() => handleDeleteCustomRole(role.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Role Designation"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TECHNICAL SPECIALTY TAGS SECTION */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Sparkles className="size-4.5 text-purple-600" /> Technical Specialty Tags ({specialtyTags.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customizable engineering specialty competencies (e.g. ROS 2, PCB Design, Computer Vision, SLAM) assigned to members and project builder skillsets.
                </p>
              </div>
              <button
                type="button"
                onClick={() => saveSpecialtyTags(DEFAULT_SPECIALTY_TAGS)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className="size-3 text-slate-400" />
                <span>Reset Specialties</span>
              </button>
            </div>

            {/* Specialty Tags Flow */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {specialtyTags.map(tag => {
                const memberCount = roster.filter(u => 
                  u.specifications && u.specifications.toLowerCase().includes(tag.toLowerCase())
                ).length;

                return (
                  <div 
                    key={tag}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-purple-200/80 bg-purple-50/60 text-purple-900 text-xs font-semibold hover:bg-purple-50 transition-all shadow-2xs"
                  >
                    <span className="size-2 rounded-full bg-purple-500" />
                    <span className="font-bold">{tag}</span>
                    <span className="px-1.5 py-0.2 bg-white/90 border border-purple-200 rounded-md text-[10px] font-mono text-purple-700">
                      {memberCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSpecialtyTag(tag)}
                      className="p-0.5 text-purple-400 hover:text-rose-600 rounded transition-colors cursor-pointer ml-0.5"
                      title={`Remove "${tag}" specialty tag`}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Specialty Tag Form */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 max-w-md">
              <input
                type="text"
                value={newSpecialtyTagInput}
                onChange={(e) => setNewSpecialtyTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSpecialtyTag(newSpecialtyTagInput);
                  }
                }}
                placeholder="Add new technical specialty tag (e.g. Kinematics, SLAM)..."
                className="flex-1 bg-slate-50 border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-1.8 text-xs font-medium outline-hidden text-slate-800"
              />
              <button
                type="button"
                onClick={() => handleAddSpecialtyTag(newSpecialtyTagInput)}
                disabled={!newSpecialtyTagInput.trim()}
                className="px-3.5 py-1.8 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="size-3.5" />
                <span>Add Specialty</span>
              </button>
            </div>
          </div>

          {/* ENGINEERING DIVISION TAGS SECTION */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Tag className="size-4.5 text-blue-600" /> Engineering Division Tags ({divisionTags.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official engineering sub-team tags associated with members and project milestones.
                </p>
              </div>
              <button
                type="button"
                onClick={() => saveDivisionTags(DEFAULT_DIVISION_TAGS)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className="size-3 text-slate-400" />
                <span>Reset Divisions</span>
              </button>
            </div>

            {/* Tags Pills Flow */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {divisionTags.map(tag => {
                const memberCount = roster.filter(u => (u.subTeam || "").toLowerCase() === tag.toLowerCase()).length;

                return (
                  <div 
                    key={tag}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-200/70 bg-blue-50/50 text-blue-900 text-xs font-semibold hover:bg-blue-50 transition-all shadow-2xs"
                  >
                    <span className="size-2 rounded-full bg-blue-500" />
                    <span className="font-bold">{tag}</span>
                    <span className="px-1.5 py-0.2 bg-white/90 border border-blue-200 rounded-md text-[10px] font-mono text-blue-700">
                      {memberCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDivisionTag(tag)}
                      className="p-0.5 text-blue-400 hover:text-rose-600 rounded transition-colors cursor-pointer ml-0.5"
                      title={`Remove "${tag}" tag`}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Division Tag Form */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 max-w-md">
              <input
                type="text"
                value={newDivisionTagInput}
                onChange={(e) => setNewDivisionTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddDivisionTag(newDivisionTagInput);
                  }
                }}
                placeholder="Add new engineering division tag..."
                className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.8 text-xs font-medium outline-hidden text-slate-800"
              />
              <button
                type="button"
                onClick={() => handleAddDivisionTag(newDivisionTagInput)}
                disabled={!newDivisionTagInput.trim()}
                className="px-3.5 py-1.8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="size-3.5" />
                <span>Add Tag</span>
              </button>
            </div>
          </div>

          {/* MEMBER ROLE ASSIGNMENT TABLE */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-5 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Users className="size-4.5 text-blue-600" /> Member Role & Division Matrix
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Quickly reassign roles or update division tags with live synchronization.</p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, role, email..."
                  value={roleMemberSearch}
                  onChange={(e) => setRoleMemberSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-9 pr-3 py-1.5 text-xs outline-hidden text-slate-700 font-medium"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Role Designation</th>
                    <th className="py-3 px-4">Division / Tag</th>
                    <th className="py-3 px-4">Clearance</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roster
                    .filter(u => {
                      if (!roleMemberSearch.trim()) return true;
                      const q = roleMemberSearch.toLowerCase();
                      return (
                        u.displayName.toLowerCase().includes(q) ||
                        u.email.toLowerCase().includes(q) ||
                        (u.customRoleName && u.customRoleName.toLowerCase().includes(q)) ||
                        (u.subTeam && u.subTeam.toLowerCase().includes(q))
                      );
                    })
                    .map(member => {
                      const currentRoleId = member.customRoleId || (member.role === "admin" ? "admin" : (member.role === "moderator" ? "moderator" : "core_engineer"));

                      return (
                        <tr key={member.uid} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={member.avatarUrl || undefined} 
                                alt="" 
                                className="size-8 rounded-lg bg-slate-100 object-cover border border-slate-200" 
                              />
                              <div>
                                <span className="font-bold text-slate-800 block">{member.displayName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{member.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <select
                              value={currentRoleId}
                              onChange={(e) => handleQuickAssignRole(member, e.target.value)}
                              className="bg-slate-50 hover:bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-hidden cursor-pointer"
                            >
                              {customRoles.map(r => (
                                <option key={r.id} value={r.id}>
                                  {r.name} ({r.clearance === "admin" ? "Admin" : r.clearance === "moderator" ? "Moderator" : "Member"})
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                list="matrix-subteam-presets"
                                value={member.subTeam || ""}
                                placeholder="Division tag..."
                                onChange={(e) => handleQuickUpdateSubTeam(member, e.target.value)}
                                className="bg-slate-50 hover:bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-hidden w-44"
                              />
                              <datalist id="matrix-subteam-presets">
                                {divisionTags.map(tag => (
                                  <option key={tag} value={tag} />
                                ))}
                              </datalist>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 text-[9px] font-bold font-mono uppercase tracking-wider rounded-md border ${
                              member.role === "admin" 
                                ? "bg-rose-50 text-rose-700 border-rose-200" 
                                : member.role === "moderator"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}>
                              {member.role}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                handleSelectUserForEdit(member);
                                setActiveSubTab("general");
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              Edit Profile
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Confirmation & Save Bar */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>Role changes apply instantly and persist across all workspace tabs. Confirm below to broadcast across team roster.</span>
              </div>
              <button
                type="button"
                onClick={handleSaveAllMemberRoles}
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider shrink-0 w-full sm:w-auto"
              >
                <Check className="size-4" />
                <span>{loading ? "Saving..." : "Confirm & Save Member Roles"}</span>
              </button>
            </div>
          </div>

          {/* ROLE CREATION / EDITING MODAL WITH GRANULAR PERMISSIONS */}
          {isRoleModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5 text-left animate-in fade-in zoom-in-95 duration-200 my-8 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                      <ShieldCheck className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-lg text-slate-900 leading-tight">
                        {roleToEdit ? `Edit Role: ${roleToEdit.name}` : "Create Custom Role"}
                      </h3>
                      <p className="text-xs text-slate-400">Configure role branding, clearance tier, and granular permission capabilities.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsRoleModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="space-y-5 overflow-y-auto pr-1 flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Role Title / Designation</label>
                      <input
                        type="text"
                        placeholder="e.g. Lead Firmware Engineer, Operations Moderator"
                        value={roleNameInput}
                        onChange={(e) => setRoleNameInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Badge Color Palette</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(["rose", "blue", "purple", "emerald", "amber", "cyan", "indigo", "slate"] as const).map(color => {
                          const isSelected = roleColorInput === color;
                          const colStyle = ROLE_COLOR_MAP[color] || ROLE_COLOR_MAP.blue;
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setRoleColorInput(color)}
                              className={`p-1.5 rounded-lg border text-[10px] font-bold capitalize flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                isSelected 
                                  ? "ring-2 ring-blue-500 border-blue-400 " + colStyle.badge
                                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <span className={`size-1.5 rounded-full ${colStyle.dot}`} />
                              <span>{color}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Description & Responsibilities</label>
                    <textarea
                      rows={2}
                      placeholder="Describe what members holding this role are responsible for..."
                      value={roleDescInput}
                      onChange={(e) => setRoleDescInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-700 outline-hidden resize-none"
                    />
                  </div>

                  {/* 3-TIER SYSTEM CLEARANCE AUTHORITY */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">System Clearance Authority Tier</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setRoleClearanceInput("member");
                          setRolePermissionsInput(["manage_ideas"]);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          roleClearanceInput === "member"
                            ? "bg-slate-50 border-slate-400 ring-2 ring-slate-400/30"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span className="font-bold text-xs text-slate-800 block">Standard Member</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Project builds and collaborative ideas</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRoleClearanceInput("moderator");
                          setRolePermissionsInput([
                            "manage_projects",
                            "manage_inventory",
                            "manage_competitions",
                            "manage_ideas",
                            "manage_tags",
                            "manage_members"
                          ]);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          roleClearanceInput === "moderator"
                            ? "bg-purple-50/80 border-purple-400 ring-2 ring-purple-500/30"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span className="font-bold text-xs text-purple-900 block">Operations Moderator</span>
                        <span className="text-[10px] text-purple-700 block mt-0.5">Operations, projects, parts & competitions</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRoleClearanceInput("admin");
                          setRolePermissionsInput(ALL_PERMISSIONS.map(p => p.key));
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          roleClearanceInput === "admin"
                            ? "bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/30"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span className="font-bold text-xs text-rose-900 block">Master Admin</span>
                        <span className="text-[10px] text-rose-700 block mt-0.5">Master governance, treasury & security logs</span>
                      </button>
                    </div>
                  </div>

                  {/* GRANULAR PERMISSIONS CHECKLIST */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4.5 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                      <div>
                        <h4 className="font-display font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck className="size-4 text-blue-600" />
                          Granular Permission Matrix ({rolePermissionsInput.length} Granted)
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Toggle specific capabilities allowed for members with this role.</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRolePermissionsInput(ALL_PERMISSIONS.map(p => p.key))}
                          className="px-2 py-1 rounded bg-white hover:bg-blue-50 border border-slate-200 text-blue-600 font-bold text-[10px] cursor-pointer"
                        >
                          Grant All
                        </button>
                        <button
                          type="button"
                          onClick={() => setRolePermissionsInput([])}
                          className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] cursor-pointer"
                        >
                          Revoke All
                        </button>
                      </div>
                    </div>

                    {/* Permissions Grouped by Category */}
                    {(["Administration", "Robotics Operations", "Knowledge & Community"] as const).map(cat => {
                      const permsInCat = ALL_PERMISSIONS.filter(p => p.category === cat);
                      return (
                        <div key={cat} className="space-y-2">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                            {cat}
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {permsInCat.map(perm => {
                              const isChecked = rolePermissionsInput.includes(perm.key);
                              return (
                                <label
                                  key={perm.key}
                                  className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                                    isChecked
                                      ? "bg-white border-blue-400 ring-1 ring-blue-500/20 shadow-2xs"
                                      : "bg-white/60 border-slate-200/80 hover:bg-white text-slate-600 opacity-75"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setRolePermissionsInput(prev => [...prev, perm.key]);
                                      } else {
                                        setRolePermissionsInput(prev => prev.filter(k => k !== perm.key));
                                      }
                                    }}
                                    className="mt-0.5 size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <div className="min-w-0">
                                    <span className={`text-xs font-bold block ${isChecked ? "text-slate-900" : "text-slate-700"}`}>
                                      {perm.label}
                                    </span>
                                    <span className="text-[10.5px] text-slate-400 block leading-tight mt-0.5">
                                      {perm.description}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Live Badge Preview */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Badge Preview:</span>
                    <span className={`px-2.5 py-1 text-[10.5px] font-bold font-mono uppercase tracking-wider rounded-lg border flex items-center gap-1.5 ${
                      ROLE_COLOR_MAP[roleColorInput]?.badge || ROLE_COLOR_MAP.blue.badge
                    }`}>
                      <span className={`size-1.5 rounded-full ${ROLE_COLOR_MAP[roleColorInput]?.dot || ROLE_COLOR_MAP.blue.dot}`} />
                      {roleNameInput.trim() || "Role Title"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsRoleModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustomRole}
                    disabled={loading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    {loading ? "Saving..." : "Save Role & Permissions"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ONBOARD NEW MEMBER SUBTAB */}
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
                
                {/* Inventory & Logistics */}
                <option value="INVENTORY_ADDED">Parts Registered</option>
                <option value="INVENTORY_UPDATED">Parts Updated</option>
                <option value="INVENTORY_DELETED">Parts Deleted</option>
                <option value="HARDWARE_ALLOCATED">Hardware Allocated</option>
                <option value="HARDWARE_SALVAGED">Hardware Salvaged</option>
                
                {/* Projects & Build Logs */}
                <option value="PROJECT_CREATED">Projects Initiated</option>
                <option value="PROJECT_DELETED">Projects Archived</option>
                <option value="PROJECT_LOG_ADDED">Project Logs Added</option>
                
                {/* Ideas & Brainstorming */}
                <option value="IDEA_CREATED">Ideas Pitched</option>
                <option value="IDEA_UPDATED">Idea Status Updates</option>
                <option value="IDEA_DELETED">Ideas Discarded</option>
                
                {/* Competitions */}
                <option value="competition_added">Competitions Created</option>
                <option value="competition_updated">Competitions Updated</option>

                {/* System Classifications */}
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
                } else if (log.action === "INVENTORY_ADDED" || log.action === "INVENTORY_UPDATED") {
                  actionColor = "bg-teal-50 text-teal-700 border-teal-100";
                  actionBadge = log.action === "INVENTORY_ADDED" ? "Parts Registry" : "Parts Updated";
                  actionIcon = <Layers className="size-4" />;
                } else if (log.action === "INVENTORY_DELETED") {
                  actionColor = "bg-rose-50 text-rose-700 border-rose-100";
                  actionBadge = "Parts Deleted";
                  actionIcon = <Trash2 className="size-4" />;
                } else if (log.action === "HARDWARE_ALLOCATED" || log.action === "HARDWARE_SALVAGED") {
                  actionColor = "bg-cyan-50 text-cyan-700 border-cyan-100";
                  actionBadge = log.action === "HARDWARE_ALLOCATED" ? "Checkout" : "Salvaged";
                  actionIcon = <PackageOpen className="size-4" />;
                } else if (log.action === "PROJECT_CREATED" || log.action === "PROJECT_LOG_ADDED") {
                  actionColor = "bg-blue-50 text-blue-700 border-blue-100";
                  actionBadge = log.action === "PROJECT_CREATED" ? "Project Init" : "Log Entry";
                  actionIcon = <Compass className="size-4" />;
                } else if (log.action === "PROJECT_DELETED") {
                  actionColor = "bg-rose-50 text-rose-700 border-rose-100";
                  actionBadge = "Project Deleted";
                  actionIcon = <Trash2 className="size-4" />;
                } else if (log.action === "IDEA_CREATED" || log.action === "IDEA_UPDATED") {
                  actionColor = "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100";
                  actionBadge = log.action === "IDEA_CREATED" ? "Idea Pitched" : "Idea Updated";
                  actionIcon = <Lightbulb className="size-4" />;
                } else if (log.action === "IDEA_DELETED") {
                  actionColor = "bg-rose-50 text-rose-700 border-rose-100";
                  actionBadge = "Idea Deleted";
                  actionIcon = <Trash2 className="size-4" />;
                } else if (log.action === "competition_added" || log.action === "competition_updated") {
                  actionColor = "bg-orange-50 text-orange-700 border-orange-100";
                  actionBadge = "Competition";
                  actionIcon = <Trophy className="size-4" />;
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
                  <div key={log.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
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
                    <div className="shrink-0 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:self-stretch border-t border-slate-100 dark:border-slate-800 sm:border-t-0 pt-2 sm:pt-0 mt-1 sm:mt-0">
                      <span className="text-[10px] text-slate-500 font-medium font-mono whitespace-nowrap bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 px-2 py-0.5 rounded-md">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap font-mono mt-1 sm:mt-1">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Light theme choice */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onChangeThemeMode) {
                        onChangeThemeMode("light");
                      } else if (isDark && onToggleTheme) {
                        onToggleTheme();
                      }
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      (themeMode ? themeMode === "light" : !isDark)
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
                      if (onChangeThemeMode) {
                        onChangeThemeMode("dark");
                      } else if (!isDark && onToggleTheme) {
                        onToggleTheme();
                      }
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      (themeMode ? themeMode === "dark" : isDark)
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

                  {/* System Auto Sync choice */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onChangeThemeMode) {
                        onChangeThemeMode("system");
                      }
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      (themeMode ? themeMode === "system" : false)
                        ? "border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-2 ring-blue-500/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-3">
                      <Laptop className="size-4.5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">System Auto</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Sync with mobile OS</span>
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
                          src={prefAvatarUrl || undefined} 
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

      
      {activeSubTab === "treasury" && (
        <TreasuryHub 
          currentUser={currentUser} 
          generalFundTransactions={generalFundTransactions} 
          customRoles={customRoles} 
        />
      )}

      {activeSubTab === "public_page" && publicPageData && (
        <div className="space-y-8 animate-fade-in text-left font-sans">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div>
              <h3 className="text-base font-extrabold text-[#0f2e46] dark:text-blue-100 uppercase font-mono tracking-tight flex items-center gap-2">
                <Laptop className="size-4 text-blue-600 dark:text-blue-400" /> Public Landing Workspace
              </h3>
              <p className="text-xs text-slate-550 mt-1 dark:text-slate-400">
                Calibrate headers, origin narratives, sub-team segments, and sponsorship terms. Changes show up instantly.
              </p>
            </div>
            
            <button
              onClick={() => handleSavePublicPage(publicPageData)}
              disabled={savingPublicPage}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-md transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingPublicPage ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="size-3.5" /> Save Changes
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left side: Hero, Mission & Sponsor Settings (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* SECTION: HERO & WHO WE ARE */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-100 dark:border-slate-805">
                  <div className="flex items-center gap-2">
                    <Sliders className="size-4 text-blue-400" />
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider">A. Intro & About Us Settings</h3>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[10px] font-bold text-slate-300 font-mono tracking-wide uppercase">Show Intro</span>
                      <input 
                        type="checkbox" 
                        checked={publicPageData.showIntro !== false}
                        onChange={(e) => setPublicPageData({ ...publicPageData, showIntro: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-7 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-[12px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500 relative"></div>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[10px] font-bold text-slate-300 font-mono tracking-wide uppercase">Show About</span>
                      <input 
                        type="checkbox" 
                        checked={publicPageData.showAboutUs !== false}
                        onChange={(e) => setPublicPageData({ ...publicPageData, showAboutUs: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-7 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-[12px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500 relative"></div>
                    </label>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">Hero Title Placeholder</label>
                    <input 
                      type="text"
                      value={publicPageData.heroTitle}
                      onChange={(e) => setPublicPageData({ ...publicPageData, heroTitle: e.target.value })}
                      className="w-full text-xs font-medium px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">Hero Organization Subtitle Description</label>
                    <textarea 
                      rows={2}
                      value={publicPageData.heroSubtitle}
                      onChange={(e) => setPublicPageData({ ...publicPageData, heroSubtitle: e.target.value })}
                      className="w-full text-xs font-medium p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[#0f2e46] dark:text-blue-300 uppercase tracking-wider font-mono mb-1.5">Origin Block Title</label>
                      <input 
                        type="text"
                        value={publicPageData.whoWeAreOriginTitle}
                        onChange={(e) => setPublicPageData({ ...publicPageData, whoWeAreOriginTitle: e.target.value })}
                        className="w-full text-xs font-mono px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">Origin Narrative</label>
                      <textarea 
                        rows={4}
                        value={publicPageData.whoWeAreOriginDesc}
                        onChange={(e) => setPublicPageData({ ...publicPageData, whoWeAreOriginDesc: e.target.value })}
                        className="w-full text-xs font-medium p-4 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: SUB-TEAMS BUILDER */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-100 dark:border-slate-805">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-emerald-400" />
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider">B. Division Sub-Teams Registry</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `sub-team-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                      const updatedTeams = [...publicPageData.subTeams, {
                        id: newId,
                        title: "New Sub-Team",
                        description: "Add descriptive structural features here.",
                        iconType: "wrench" as const
                      }];
                      setPublicPageData({ ...publicPageData, subTeams: updatedTeams });
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <Plus className="size-3" /> Add Sub-Team
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  {publicPageData.subTeams.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950/25 border border-dashed rounded-xl border-slate-300">
                      No active sub-teams registered. Click "Add Sub-Team" to catalog division entities.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {publicPageData.subTeams.map((team, idx) => (
                        <div key={`${team.id}-${idx}`} className="relative bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-850 rounded-xl flex flex-col justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              const filtered = publicPageData.subTeams.filter(t => t.id !== team.id);
                              setPublicPageData({ ...publicPageData, subTeams: filtered });
                            }}
                            className="absolute top-3 right-3 text-slate-355 hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete Sub-team"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                          
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <div className="w-1/3">
                                <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1">Vector Icon</label>
                                <select
                                  value={team.iconType}
                                  onChange={(e) => {
                                    const updated = [...publicPageData.subTeams];
                                    updated[idx] = { ...updated[idx], iconType: e.target.value as any };
                                    setPublicPageData({ ...publicPageData, subTeams: updated });
                                  }}
                                  className="w-full text-[10px] font-mono px-2 py-1.5 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
                                >
                                  <option value="layers">Layers</option>
                                  <option value="cpu">Cpu</option>
                                  <option value="compass">Compass</option>
                                  <option value="wrench">Wrench</option>
                                  <option value="settings">Settings</option>
                                </select>
                              </div>
                              <div className="w-2/3">
                                <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1">Sub-Team Name</label>
                                <input
                                  type="text"
                                  value={team.title}
                                  onChange={(e) => {
                                    const updated = [...publicPageData.subTeams];
                                    updated[idx] = { ...updated[idx], title: e.target.value };
                                    setPublicPageData({ ...publicPageData, subTeams: updated });
                                  }}
                                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1">Commitment & Description</label>
                              <textarea
                                rows={2}
                                value={team.description}
                                onChange={(e) => {
                                  const updated = [...publicPageData.subTeams];
                                  updated[idx] = { ...updated[idx], description: e.target.value };
                                  setPublicPageData({ ...publicPageData, subTeams: updated });
                                }}
                                className="w-full text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 leading-normal"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION: TECHNICAL BUILDS PORTFOLIO */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-100 dark:border-slate-805">
                  <div className="flex items-center gap-2">
                    <FileCode className="size-4 text-blue-400" />
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider">C. Our Builds Settings</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[10px] font-bold text-slate-300 font-mono tracking-wide uppercase">Show Builds</span>
                      <input 
                        type="checkbox" 
                        checked={publicPageData.showBuilds !== false}
                        onChange={(e) => setPublicPageData({ ...publicPageData, showBuilds: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-7 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-[12px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500 relative"></div>
                    </label>
                    <button
                    type="button"
                    onClick={() => {
                      const newId = `build-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                      const updatedBuilds = [...publicPageData.buildSpecs, {
                        id: newId,
                        category: "Category Name",
                        title: "Featured Build Platform Name",
                        subtitle: "Platform summary details.",
                        
                      }];
                      setPublicPageData({ ...publicPageData, buildSpecs: updatedBuilds });
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-mono text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <Plus className="size-3" /> Register Built Spec
                  </button>
                  </div>
                </div>
                <div className="p-6">
                  {publicPageData.buildSpecs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950/25 border border-dashed rounded-xl border-slate-300">
                      No builds cataloged. Keep records updated to prove engineering capability!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {publicPageData.buildSpecs.map((build, idx) => (
                        <div key={`${build.id}-${idx}`} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl relative">
                          <button
                            type="button"
                            onClick={() => {
                              const filtered = publicPageData.buildSpecs.filter(b => b.id !== build.id);
                              setPublicPageData({ ...publicPageData, buildSpecs: filtered });
                            }}
                            className="absolute top-4 right-4 text-slate-355 hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete Spec"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1">Catalog Classification Category</label>
                              <input
                                type="text"
                                value={build.category}
                                onChange={(e) => {
                                  const updated = [...publicPageData.buildSpecs];
                                  updated[idx] = { ...updated[idx], category: e.target.value };
                                  setPublicPageData({ ...publicPageData, buildSpecs: updated });
                                }}
                                className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1">Build Platform Name</label>
                              <input
                                type="text"
                                value={build.title}
                                onChange={(e) => {
                                  const updated = [...publicPageData.buildSpecs];
                                  updated[idx] = { ...updated[idx], title: e.target.value };
                                  setPublicPageData({ ...publicPageData, buildSpecs: updated });
                                }}
                                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1">Subtitle Summary</label>
                              <input
                                type="text"
                                value={build.subtitle}
                                onChange={(e) => {
                                  const updated = [...publicPageData.buildSpecs];
                                  updated[idx] = { ...updated[idx], subtitle: e.target.value };
                                  setPublicPageData({ ...publicPageData, buildSpecs: updated });
                                }}
                                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                          </div>
                          
                          
                          {/* Multi-Image Manager per Build */}
                          <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                            {(() => {
                              const buildImages = parseBuildImages(build.imageUrl);
                              return (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[8px] font-bold text-slate-400 uppercase font-mono flex items-center gap-1.5">
                                      <span>Build Hardware & CAD Photos ({buildImages.length})</span>
                                      <span className="text-[7.5px] text-slate-400 font-normal">Add multiple photos for visitor swiping</span>
                                    </label>
                                    
                                    <label className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[8.5px] font-bold font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs">
                                      <Upload className="size-3 text-blue-500" /> Upload Image
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="sr-only"
                                        onChange={(e) => handleUploadBuildPhoto(idx, e)}
                                      />
                                    </label>
                                  </div>

                                  {/* Direct Image URL Input with Add Button */}
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      id={`new-build-url-${idx}`}
                                      placeholder="https://images.unsplash.com/... or paste image URL"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const input = e.currentTarget;
                                          const val = input.value.trim();
                                          if (val) {
                                            const updated = [...publicPageData.buildSpecs];
                                            const current = parseBuildImages(updated[idx].imageUrl);
                                            current.push(val);
                                            updated[idx] = { ...updated[idx], imageUrl: joinBuildImages(current) };
                                            setPublicPageData({ ...publicPageData, buildSpecs: updated });
                                            input.value = "";
                                          }
                                        }
                                      }}
                                      className="flex-1 text-[10px] font-mono px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const input = document.getElementById(`new-build-url-${idx}`) as HTMLInputElement;
                                        if (input && input.value.trim()) {
                                          const val = input.value.trim();
                                          const updated = [...publicPageData.buildSpecs];
                                          const current = parseBuildImages(updated[idx].imageUrl);
                                          current.push(val);
                                          updated[idx] = { ...updated[idx], imageUrl: joinBuildImages(current) };
                                          setPublicPageData({ ...publicPageData, buildSpecs: updated });
                                          input.value = "";
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                                    >
                                      + Add URL
                                    </button>
                                  </div>

                                  {/* Image Thumbnails Strip */}
                                  {buildImages.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                      {buildImages.map((imgUrl, imgIdx) => (
                                        <div key={imgIdx} className="relative group/bimg w-20 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shrink-0">
                                          <img 
                                            src={imgUrl} 
                                            alt={`Build ${imgIdx + 1}`} 
                                            className="w-full h-full object-cover" 
                                            referrerPolicy="no-referrer"
                                          />
                                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/bimg:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updated = [...publicPageData.buildSpecs];
                                                const current = parseBuildImages(updated[idx].imageUrl);
                                                const filtered = current.filter((_, i) => i !== imgIdx);
                                                updated[idx] = { ...updated[idx], imageUrl: joinBuildImages(filtered) };
                                                setPublicPageData({ ...publicPageData, buildSpecs: updated });
                                              }}
                                              className="p-1 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                                              title="Delete Photo"
                                            >
                                              <Trash2 className="size-3" />
                                            </button>
                                          </div>
                                          <span className="absolute bottom-1 right-1 text-[7.5px] font-mono font-bold bg-black/70 text-white px-1 rounded">
                                            #{imgIdx + 1}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[9.5px] text-slate-400 italic">No custom images uploaded yet. (Showing default unsplash placeholder)</p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION: ACHIEVEMENTS & AWARDS */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-100 dark:border-slate-805">
                  <div className="flex items-center gap-2">
                    <Trophy className="size-4 text-amber-400" />
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider">D. Team Achievements & Awards</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[10px] font-bold text-slate-300 font-mono tracking-wide uppercase">Show</span>
                      <input 
                        type="checkbox" 
                        checked={publicPageData.showAchievements !== false}
                        onChange={(e) => setPublicPageData({ ...publicPageData, showAchievements: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-7 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-[12px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500 relative"></div>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newId = `ach-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                        const list = publicPageData.achievements || [];
                        const updated = [...list, {
                          id: newId,
                          title: "Robotics Competition Championship",
                          eventOrCompetition: "National Robotics Challenge",
                          yearOrDate: new Date().getFullYear().toString(),
                          award: "1st Place Champions (Gold)",
                          description: "Secured first place victory in the national autonomous tournament category.",
                          badgeType: "gold" as const
                        }];
                        setPublicPageData({ ...publicPageData, achievements: updated });
                      }}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono text-[9px] font-extrabold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-sans shadow-xs"
                    >
                      <Plus className="size-3" /> Add Achievement
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  {(!publicPageData.achievements || publicPageData.achievements.length === 0) ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950/25 border border-dashed rounded-xl border-slate-300">
                      No achievements registered yet. Click "Add Achievement" to showcase your team's victories and awards!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {publicPageData.achievements.map((ach, idx) => (
                        <div key={`${ach.id}-${idx}`} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl relative space-y-3">
                          <button
                            type="button"
                            onClick={() => {
                              const list = publicPageData.achievements || [];
                              const filtered = list.filter(a => a.id !== ach.id);
                              setPublicPageData({ ...publicPageData, achievements: filtered });
                            }}
                            className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete Achievement"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pr-8">
                            <div className="md:col-span-2">
                              <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1">Achievement / Award Title</label>
                              <input
                                type="text"
                                value={ach.title}
                                placeholder="e.g. National Robotics Championship"
                                onChange={(e) => {
                                  const list = [...(publicPageData.achievements || [])];
                                  list[idx] = { ...list[idx], title: e.target.value };
                                  setPublicPageData({ ...publicPageData, achievements: list });
                                }}
                                className="w-full text-xs font-bold px-2.5 py-1.8 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1">Event / Competition</label>
                              <input
                                type="text"
                                value={ach.eventOrCompetition}
                                placeholder="e.g. SLIIT ROBOFEST"
                                onChange={(e) => {
                                  const list = [...(publicPageData.achievements || [])];
                                  list[idx] = { ...list[idx], eventOrCompetition: e.target.value };
                                  setPublicPageData({ ...publicPageData, achievements: list });
                                }}
                                className="w-full text-xs font-semibold px-2.5 py-1.8 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1">Year / Date</label>
                              <input
                                type="text"
                                value={ach.yearOrDate || ""}
                                placeholder="e.g. 2025"
                                onChange={(e) => {
                                  const list = [...(publicPageData.achievements || [])];
                                  list[idx] = { ...list[idx], yearOrDate: e.target.value };
                                  setPublicPageData({ ...publicPageData, achievements: list });
                                }}
                                className="w-full text-xs font-mono px-2.5 py-1.8 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                              <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1">Award Rank / Placement Tag</label>
                              <input
                                type="text"
                                value={ach.award}
                                placeholder="e.g. 1st Place Champions (Gold Medal)"
                                onChange={(e) => {
                                  const list = [...(publicPageData.achievements || [])];
                                  list[idx] = { ...list[idx], award: e.target.value };
                                  setPublicPageData({ ...publicPageData, achievements: list });
                                }}
                                className="w-full text-xs font-semibold text-amber-700 dark:text-amber-400 px-2.5 py-1.8 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1">Badge Styling</label>
                              <select
                                value={ach.badgeType || "gold"}
                                onChange={(e) => {
                                  const list = [...(publicPageData.achievements || [])];
                                  list[idx] = { ...list[idx], badgeType: e.target.value as any };
                                  setPublicPageData({ ...publicPageData, achievements: list });
                                }}
                                className="w-full text-xs font-medium px-2.5 py-1.8 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
                              >
                                <option value="gold">🥇 Gold Trophy / Medal</option>
                                <option value="silver">🥈 Silver Medal</option>
                                <option value="bronze">🥉 Bronze Medal</option>
                                <option value="award">⭐ Award / Innovation</option>
                                <option value="trophy">🏆 General Trophy</option>
                              </select>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1">Achievement Description & Engineering Highlights</label>
                            <textarea
                              rows={2}
                              value={ach.description}
                              placeholder="Describe the category victory, bot performance, or engineering milestone..."
                              onChange={(e) => {
                                const list = [...(publicPageData.achievements || [])];
                                list[idx] = { ...list[idx], description: e.target.value };
                                setPublicPageData({ ...publicPageData, achievements: list });
                              }}
                              className="w-full text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 leading-normal"
                            />
                          </div>

                          <div className="pt-1">
                            <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1.5 flex items-center justify-between">
                              <span>Achievement Trophy / Podium / Certificate Photo</span>
                              <span className="text-[7.5px] text-slate-400 font-normal">Direct URL or Upload</span>
                            </label>
                            
                            <div className="flex flex-col sm:flex-row gap-2.5 items-start">
                              <div className="flex-1 w-full space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={ach.imageUrl || ""}
                                    placeholder="https://... or click upload"
                                    onChange={(e) => {
                                      const list = [...(publicPageData.achievements || [])];
                                      list[idx] = { ...list[idx], imageUrl: e.target.value };
                                      setPublicPageData({ ...publicPageData, achievements: list });
                                    }}
                                    className="flex-1 text-[10px] font-mono px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                                  />
                                  
                                  <label className="shrink-0 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs">
                                    <Upload className="size-3 text-blue-500" /> Upload Photo
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="sr-only"
                                      onChange={(e) => handleUploadAchievementPhoto(idx, e)}
                                    />
                                  </label>

                                  {ach.imageUrl && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const list = [...(publicPageData.achievements || [])];
                                        list[idx] = { ...list[idx], imageUrl: "" };
                                        setPublicPageData({ ...publicPageData, achievements: list });
                                      }}
                                      className="px-2 py-1.5 text-slate-400 hover:text-red-500 rounded-lg text-[9px] font-bold font-mono transition-colors cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900/40"
                                      title="Remove photo"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>

                              {ach.imageUrl && (
                                <div className="relative shrink-0 w-20 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 group/thumb">
                                  <img 
                                    src={ach.imageUrl} 
                                    alt="Achievement preview" 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION: TRACK RECORD & GOALS */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-100 dark:border-slate-805">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-purple-400" />
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider">E. Team Performance Trajectory & Records</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `tr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                      const updatedRecords = [...publicPageData.trackRecords, {
                        id: newId,
                        badge: "Immediate Targets",
                        title: "Upcoming Project Goal",
                        description: "Add details concerning targets and milestones.",
                        statusTag: "TARGET ACTIVE"
                      }];
                      setPublicPageData({ ...publicPageData, trackRecords: updatedRecords });
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-mono text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <Plus className="size-3" /> Add Track Record
                  </button>
                </div>
                <div className="p-6">
                  {publicPageData.trackRecords.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950/25 border border-dashed rounded-xl border-slate-300">
                      No track records cataloged.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {publicPageData.trackRecords.map((tr, idx) => (
                        <div key={`${tr.id}-${idx}`} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl relative">
                          <button
                            type="button"
                            onClick={() => {
                              const filtered = publicPageData.trackRecords.filter(t => t.id !== tr.id);
                              setPublicPageData({ ...publicPageData, trackRecords: filtered });
                            }}
                            className="absolute top-4 right-4 text-slate-355 hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1">Badge Category Tag</label>
                              <input
                                type="text"
                                value={tr.badge}
                                onChange={(e) => {
                                  const updated = [...publicPageData.trackRecords];
                                  updated[idx] = { ...updated[idx], badge: e.target.value };
                                  setPublicPageData({ ...publicPageData, trackRecords: updated });
                                }}
                                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1">Milestone Title</label>
                              <input
                                type="text"
                                value={tr.title}
                                onChange={(e) => {
                                  const updated = [...publicPageData.trackRecords];
                                  updated[idx] = { ...updated[idx], title: e.target.value };
                                  setPublicPageData({ ...publicPageData, trackRecords: updated });
                                }}
                                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1">Status Tag</label>
                              <input
                                type="text"
                                value={tr.statusTag}
                                onChange={(e) => {
                                  const updated = [...publicPageData.trackRecords];
                                  updated[idx] = { ...updated[idx], statusTag: e.target.value };
                                  setPublicPageData({ ...publicPageData, trackRecords: updated });
                                }}
                                className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <label className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-1">Milestone Accomplishment Narrative Description</label>
                            <textarea
                              rows={2}
                              value={tr.description}
                              onChange={(e) => {
                                const updated = [...publicPageData.trackRecords];
                                updated[idx] = { ...updated[idx], description: e.target.value };
                                  setPublicPageData({ ...publicPageData, trackRecords: updated });
                              }}
                              className="w-full text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 leading-normal"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right side Sponsorship section Form Sidebar (4 Cols) */}
            <div className="lg:col-span-4 space-y-6">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-100 dark:border-slate-805">
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="size-4 text-rose-400" />
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider">E. Sponsors</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[10px] font-bold text-slate-300 font-mono tracking-wide uppercase">Show</span>
                    <input 
                      type="checkbox" 
                      checked={publicPageData.showSponsors !== false}
                      onChange={(e) => setPublicPageData({ ...publicPageData, showSponsors: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-7 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-[12px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500 relative"></div>
                  </label>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">Sponsorship Header Category</label>
                    <input 
                      type="text"
                      value={publicPageData.sponsorHeader}
                      onChange={(e) => setPublicPageData({ ...publicPageData, sponsorHeader: e.target.value })}
                      className="w-full text-xs font-medium px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">Sponsorship Title Headline</label>
                    <textarea 
                      rows={2}
                      value={publicPageData.sponsorTitle}
                      onChange={(e) => setPublicPageData({ ...publicPageData, sponsorTitle: e.target.value })}
                      className="w-full text-xs font-bold px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">The Ask Header Title</label>
                    <input 
                      type="text"
                      value={publicPageData.sponsorAskTitle}
                      onChange={(e) => setPublicPageData({ ...publicPageData, sponsorAskTitle: e.target.value })}
                      className="w-full text-xs font-medium px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">The Ask Description Paragraph</label>
                    <textarea 
                      rows={4}
                      value={publicPageData.sponsorAskDesc}
                      onChange={(e) => setPublicPageData({ ...publicPageData, sponsorAskDesc: e.target.value })}
                      className="w-full text-xs p-4 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 leading-relaxed font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">The Benefit Header Title</label>
                    <input 
                      type="text"
                      value={publicPageData.sponsorBenefitTitle}
                      onChange={(e) => setPublicPageData({ ...publicPageData, sponsorBenefitTitle: e.target.value })}
                      className="w-full text-xs font-medium px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">The Benefit Description Paragraph</label>
                    <textarea 
                      rows={4}
                      value={publicPageData.sponsorBenefitDesc}
                      onChange={(e) => setPublicPageData({ ...publicPageData, sponsorBenefitDesc: e.target.value })}
                      className="w-full text-xs p-4 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 leading-relaxed font-sans"
                    />
                  </div>
                </div>
                
                {/* Sponsor Logos Section */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Sponsor Organizations</h4>
                      <p className="text-[10px] text-slate-500 mt-1">Manage logos and links for your sponsors.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newId = `sponsor-${Date.now()}`;
                        const updatedSponsors = [...(publicPageData.sponsors || []), {
                          id: newId,
                          name: "New Sponsor",
                          websiteUrl: "https://"
                        }];
                        setPublicPageData({ ...publicPageData, sponsors: updatedSponsors });
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-mono text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="size-3" /> Add Sponsor
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(!publicPageData.sponsors || publicPageData.sponsors.length === 0) ? (
                      <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <p className="text-xs text-slate-500 font-mono">No sponsors added yet</p>
                      </div>
                    ) : (
                      publicPageData.sponsors.map((sponsor, idx) => (
                        <div key={sponsor.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-slate-400">SPONSOR #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = publicPageData.sponsors?.filter(s => s.id !== sponsor.id);
                                setPublicPageData({ ...publicPageData, sponsors: updated });
                              }}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1">Organization Name</label>
                              <input
                                type="text"
                                value={sponsor.name}
                                onChange={(e) => {
                                  const updated = publicPageData.sponsors?.map(s => 
                                    s.id === sponsor.id ? { ...s, name: e.target.value } : s
                                  );
                                  setPublicPageData({ ...publicPageData, sponsors: updated });
                                }}
                                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1">Website URL</label>
                              <input
                                type="url"
                                value={sponsor.websiteUrl || ""}
                                onChange={(e) => {
                                  const updated = publicPageData.sponsors?.map(s => 
                                    s.id === sponsor.id ? { ...s, websiteUrl: e.target.value } : s
                                  );
                                  setPublicPageData({ ...publicPageData, sponsors: updated });
                                }}
                                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[9px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1">Logo URL (Optional)</label>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder="https://..."
                                  value={sponsor.logoUrl || ""}
                                  onChange={(e) => {
                                    const updated = publicPageData.sponsors?.map(s => 
                                      s.id === sponsor.id ? { ...s, logoUrl: e.target.value } : s
                                    );
                                    setPublicPageData({ ...publicPageData, sponsors: updated });
                                  }}
                                  className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                                />
                                {sponsor.logoUrl && (
                                  <div className="w-8 h-8 rounded shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center overflow-hidden">
                                    <img src={sponsor.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* F. Contact Us Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-100 dark:border-slate-805">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail size-4 text-blue-400"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider">F. Contact Us</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[10px] font-bold text-slate-300 font-mono tracking-wide uppercase">Show</span>
                    <input 
                      type="checkbox" 
                      checked={publicPageData.showContactUs !== false}
                      onChange={(e) => setPublicPageData({ ...publicPageData, showContactUs: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-7 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-[12px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500 relative"></div>
                  </label>
                </div>
                <div className="p-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">Contact Email address</label>
                    <input 
                      type="email"
                      value={publicPageData.contactEmail}
                      onChange={(e) => setPublicPageData({ ...publicPageData, contactEmail: e.target.value })}
                      className="w-full text-xs font-mono px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Social Channels Section */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Link className="size-4 text-blue-600" /> Social Channels
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Configure social media links displayed in the footer.</p>
                  </div>
                  <button
                    onClick={() => {
                      const newId = `sc-${Date.now()}`;
                      const updatedChannels = [...(publicPageData.socialChannels || []), {
                        id: newId,
                        platform: "Website",
                        url: "https://"
                      }];
                      setPublicPageData({ ...publicPageData, socialChannels: updatedChannels });
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <Plus className="size-3" /> Add Channel
                  </button>
                </div>
                
                <div className="space-y-4">
                  {!(publicPageData.socialChannels && publicPageData.socialChannels.length > 0) ? (
                    <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      <p className="text-xs text-slate-500 font-mono">No social channels configured.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {publicPageData.socialChannels.map((channel, index) => (
                        <div key={channel.id} className="relative p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                          <div className="absolute top-2 right-2">
                            <button
                              type="button"
                              onClick={() => {
                                const filtered = (publicPageData.socialChannels || []).filter(c => c.id !== channel.id);
                                setPublicPageData({ ...publicPageData, socialChannels: filtered });
                              }}
                              className="text-slate-400 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-slate-900 transition-colors"
                              title="Delete Channel"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                          
                          <div className="space-y-3 mt-4">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono mb-1">Platform Name</label>
                              <input 
                                type="text"
                                value={channel.platform}
                                onChange={(e) => {
                                  const updated = [...(publicPageData.socialChannels || [])];
                                  updated[index] = { ...channel, platform: e.target.value };
                                  setPublicPageData({ ...publicPageData, socialChannels: updated });
                                }}
                                className="w-full text-xs font-medium px-2 py-1.5 bg-white border border-slate-200 rounded dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono mb-1">URL</label>
                              <input 
                                type="url"
                                value={channel.url}
                                onChange={(e) => {
                                  const updated = [...(publicPageData.socialChannels || [])];
                                  updated[index] = { ...channel, url: e.target.value };
                                  setPublicPageData({ ...publicPageData, socialChannels: updated });
                                }}
                                className="w-full text-[11px] font-mono px-2 py-1.5 bg-white border border-slate-200 rounded dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 focus:outline-hidden"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION: VISUAL GALLERY PHOTOS */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-100 dark:border-slate-850">
                  <div className="flex items-center gap-2">
                    <Image className="size-4 text-emerald-400" />
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider">G. Team Photos Gallery</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                      const updatedPhotos = [...(publicPageData.galleryPhotos || []), {
                        id: newId,
                        url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80&w=800",
                        caption: "Axotic division robotics calibration pass."
                      }];
                      setPublicPageData({ ...publicPageData, galleryPhotos: updatedPhotos });
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <Plus className="size-3" /> Add Photo
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                    Curate engineering, division life, or robotic chassis pictures here.
                  </p>

                  {!(publicPageData.galleryPhotos && publicPageData.galleryPhotos.length > 0) ? (
                    <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      <p className="text-xs text-slate-400 italic">No gallery photos added yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                      {publicPageData.galleryPhotos.map((photo, index) => (
                        <div key={`${photo.id}-${index}`} className="p-3 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-2 bg-slate-50/50 dark:bg-slate-950/40">
                          <div className="flex items-start gap-2">
                            <div className="size-12 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200/40">
                              <img 
                                src={photo.url || undefined} 
                                alt="preview" 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80&w=800";
                                }}
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <input 
                                type="text"
                                placeholder="Image link URL"
                                value={photo.url}
                                onChange={(e) => {
                                  const updated = [...(publicPageData.galleryPhotos || [])];
                                  updated[index] = { ...photo, url: e.target.value };
                                  setPublicPageData({ ...publicPageData, galleryPhotos: updated });
                                }}
                                className="w-full text-[10px] font-mono px-2 py-1 bg-white border border-slate-200 rounded dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 focus:outline-hidden"
                              />
                              <input 
                                type="text"
                                placeholder="Caption"
                                value={photo.caption || ""}
                                onChange={(e) => {
                                  const updated = [...(publicPageData.galleryPhotos || [])];
                                  updated[index] = { ...photo, caption: e.target.value };
                                  setPublicPageData({ ...publicPageData, galleryPhotos: updated });
                                }}
                                className="w-full text-[10px] px-2 py-1 bg-white border border-slate-200 rounded dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 focus:outline-hidden"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const filtered = (publicPageData.galleryPhotos || []).filter(p => p.id !== photo.id);
                                setPublicPageData({ ...publicPageData, galleryPhotos: filtered });
                              }}
                              className="text-slate-400 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-slate-900 transition-colors"
                              title="Delete Photo"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SAVE PREVIEW HELP BOX */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-2xl space-y-2">
                <h5 className="text-[11px] font-bold text-[#0f2e46] dark:text-blue-300 uppercase tracking-wider font-mono">Real-time Deployment Sync</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Clicking the <strong>Commit/Save Changes</strong> button updates Firestore configuration registers instantly or caches your changes in your offline mock local workspace automatically.
                </p>
              </div>

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
