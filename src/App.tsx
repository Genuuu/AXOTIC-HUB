import React, { useState, useEffect } from "react";
import { auth, db, testConnectionObj, handleFirestoreError, OperationType, createGlobalNotification } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, onSnapshot, query, orderBy, doc, addDoc, serverTimestamp, setDoc, limit, updateDoc, arrayUnion } from "firebase/firestore";
import { 
  LogOut, 
  Layers, 
  Warehouse, 
  Users, 
  UserCircle, 
  ShieldCheck, 
  Globe,
  Plus,
  Compass,
  Lock,
  ArrowRight,
  UserPlus,
  Settings,
  LayoutGrid,
  SunDim,
  MoonStar,
  Zap,
  Key,
  User,
  Upload,
  X,
  Camera,
  Trash2,
  Cpu,
  Boxes,
  Bell,
  Megaphone,
  ChevronDown,
  ChevronRight,
  Sliders,
  Trophy
} from "lucide-react";
import { UserProfile, Project, AppNotification } from "./types";
import defaultLogoUrl from "../Images/Logo.png";
import { useWorkspaceSettings } from "./useWorkspaceSettings";
import { motion, AnimatePresence } from "motion/react";

// Import custom sub-panels
import PublicLanding from "./components/PublicLanding";
import AuthModal from "./components/AuthModal";
import HomeDashboard from "./components/HomeDashboard";
import ProjectHub from "./components/ProjectHub";
import InventoryManager from "./components/InventoryManager";
import MemberRoster from "./components/MemberRoster";
import AdminSettings from "./components/AdminSettings";
import IdeasBoard from "./components/IdeasBoard";
import CompetitionsHub from "./components/CompetitionsHub";

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const { logoUrl: remoteLogoUrl } = useWorkspaceSettings(currentUser?.isOfflineMock);
  const activeLogoUrl = remoteLogoUrl || defaultLogoUrl;
  const [roster, setRoster] = useState<UserProfile[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [showUserPopover, setShowUserPopover] = useState(false);
  
  // Theme state: "light" | "dark" | "system"
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("axotic_theme_mode") as "light" | "dark" | "system" | null;
      if (saved) return saved;
      const legacy = localStorage.getItem("axotic_theme");
      if (legacy) return legacy === "dark" ? "dark" : "light";
    }
    return "system";
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("axotic_theme_mode") as "light" | "dark" | "system" | null;
      if (saved === "dark") return true;
      if (saved === "light") return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const updateTheme = () => {
      let darkValue = false;
      if (themeMode === "system") {
        darkValue = mediaQuery.matches;
      } else {
        darkValue = themeMode === "dark";
      }
      setIsDark(darkValue);
      
      if (darkValue) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    updateTheme();
    localStorage.setItem("axotic_theme_mode", themeMode);
    localStorage.setItem("axotic_theme", themeMode === "system" ? (mediaQuery.matches ? "dark" : "light") : themeMode);

    const handleChange = () => {
      if (themeMode === "system") {
        updateTheme();
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [themeMode]);

  const cycleThemeMode = () => {
    setThemeMode((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  };

  // Navigation tabs state inside Internal Portal: "home" | "projects" | "inventory" | "roster" | "settings" | "ideas" | "competitions"
  const [activeTab, setActiveTab] = useState<"home" | "projects" | "inventory" | "roster" | "settings" | "ideas" | "competitions">("home");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  // UI Control states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // User Profile Edit States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileBirthday, setProfileBirthday] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [compressingProfilePic, setCompressingProfilePic] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const handleOpenEditProfile = () => {
    if (currentUser) {
      setProfileDisplayName(currentUser.displayName || "");
      setProfilePhone(currentUser.phoneNumber || "");
      setProfileBirthday(currentUser.birthday || "");
      setProfileAvatarUrl(currentUser.avatarUrl || "");
      setProfileError("");
      setIsEditProfileOpen(true);
    }
  };

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileError("Only image files (JPEG, PNG, SVG) are allowed.");
      return;
    }

    setCompressingProfilePic(true);
    setProfileError("");

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 160;
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
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setProfileAvatarUrl(dataUrl);
        } else {
          setProfileAvatarUrl(readerEvent.target?.result as string);
        }
        setCompressingProfilePic(false);
      };
      img.onerror = () => {
        setProfileError("Failed to process image file.");
        setCompressingProfilePic(false);
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!profileDisplayName.trim()) {
      setProfileError("Name cannot be blank.");
      return;
    }

    setSavingProfile(true);
    setProfileError("");

    const updatedProfile = {
      ...currentUser,
      displayName: profileDisplayName.trim(),
      phoneNumber: profilePhone.trim(),
      birthday: profileBirthday,
      avatarUrl: profileAvatarUrl
    };

    if (currentUser.isOfflineMock) {
      setCurrentUser(updatedProfile);
      localStorage.setItem("axotic_local_auth", JSON.stringify(updatedProfile));

      // Sync mock roster
      const rosterStored = localStorage.getItem("axotic_mock_roster");
      if (rosterStored) {
        try {
          const list: UserProfile[] = JSON.parse(rosterStored);
          const index = list.findIndex(u => u.uid === currentUser.uid);
          if (index !== -1) {
            list[index] = {
              ...list[index],
              displayName: profileDisplayName.trim(),
              phoneNumber: profilePhone.trim(),
              birthday: profileBirthday,
              avatarUrl: profileAvatarUrl
            };
            localStorage.setItem("axotic_mock_roster", JSON.stringify(list));
          }
        } catch (_) {}
      }

      window.dispatchEvent(new Event("axotic_db_update"));
      setSavingProfile(false);
      setIsEditProfileOpen(false);
    } else {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(userRef, {
          displayName: profileDisplayName.trim(),
          phoneNumber: profilePhone.trim(),
          birthday: profileBirthday,
          avatarUrl: profileAvatarUrl
        }, { merge: true });

        // Update local auth cache as well
        localStorage.setItem("axotic_local_auth", JSON.stringify(updatedProfile));
        
        setSavingProfile(false);
        setIsEditProfileOpen(false);
      } catch (err) {
        console.error("Profile update fail", err instanceof Error ? err.message : String(err));
        setProfileError("Database connection failed. Please try again.");
        setSavingProfile(false);
      }
    }
  };

  // 1. Initial Connection Diagnostics Check
  useEffect(() => {
    testConnectionObj();
  }, []);

  // 2. Stream Firebase Authentication State Changes
  useEffect(() => {
    const storedLocalAuth = localStorage.getItem("axotic_local_auth");
    if (storedLocalAuth) {
      try {
        const parsed = JSON.parse(storedLocalAuth);
        if (parsed && parsed.isOfflineMock) {
          setCurrentUser(parsed);
          setAuthChecking(false);
          return;
        }
      } catch (e) {
        localStorage.removeItem("axotic_local_auth");
      }
    }

    let unsubUserProfile: () => void = () => {};

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Clean up previous listener just in case auth changes rapidly
        unsubUserProfile();
        
        // Authenticated Session: Listen to their matching user document dynamically
        const userDocRef = doc(db, "users", firebaseUser.uid);
        unsubUserProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setCurrentUser({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
          } else {
            // Profile entry hasn't been written to Firestore yet—wait for the AuthModal hook to complete the write
            console.log("Awaiting profile write to database...");
          }
          setAuthChecking(false);
        }, (err) => {
          console.error("Firestore user profile stream failed", err instanceof Error ? err.message : String(err));
          setAuthChecking(false);
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        });

      } else {
        // Logged Out Session
        unsubUserProfile();
        setCurrentUser(null);
        setAuthChecking(false);
      }
    });

    return () => {
      unsubAuth();
      unsubUserProfile();
    };
  }, []);

  // 3. Stream Team Roster list real-time (Only when logged in)
  useEffect(() => {
    if (!currentUser) {
      setRoster([]);
      return;
    }

    if (currentUser.isOfflineMock) {
      const seedRoster = () => {
        const local = localStorage.getItem("axotic_mock_roster");
        if (local) {
          try {
            setRoster(JSON.parse(local));
            return;
          } catch (_) {}
        }

        const defaultRoster: UserProfile[] = [
          {
            uid: "mock-genu",
            displayName: "Genu Kakisara (Lead)",
            email: "genu.kakisara@axotic.org",
            role: "admin",
            avatarUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Genu",
            subTeam: "Core Engineering",
            phoneNumber: "+1 (555) 019-2834",
            joinedAt: new Date(Date.now() - 3600000 * 24 * 50).toISOString(),
            isOfflineMock: true
          },
          {
            uid: "mock-bob",
            displayName: "Bob Axel",
            email: "bob.axel@axotic.org",
            role: "member",
            avatarUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Bob",
            subTeam: "Core Engineering",
            phoneNumber: "+1 (555) 014-9382",
            joinedAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
            isOfflineMock: true
          },
          {
            uid: "mock-sarah",
            displayName: "Sarah Connor",
            email: "sarah.connor@axotic.org",
            role: "member",
            avatarUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Sarah",
            subTeam: "Core Engineering",
            phoneNumber: "+1 (555) 012-4451",
            joinedAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
            isOfflineMock: true
          }
        ];
        localStorage.setItem("axotic_mock_roster", JSON.stringify(defaultRoster));
        setRoster(defaultRoster);
      };

      seedRoster();

      const handleStorageChange = () => {
        const local = localStorage.getItem("axotic_mock_roster");
        if (local) {
          try {
            setRoster(JSON.parse(local));
          } catch (_) {}
        }
      };
      window.addEventListener("axotic_db_update", handleStorageChange);
      return () => window.removeEventListener("axotic_db_update", handleStorageChange);
    }

    const rosterQuery = query(collection(db, "users"), orderBy("joinedAt", "asc"));
    const unsubRoster = onSnapshot(rosterQuery, (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((snapDoc) => {
        users.push({ uid: snapDoc.id, ...snapDoc.data() } as UserProfile);
      });
      setRoster(users);
    }, (err) => {
      console.warn("Could not load roster list securely. Authenticated access constraints active.", err instanceof Error ? err.message : String(err));
    });

    return () => unsubRoster();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser) return;

    const updateActiveStatus = async () => {
      if (currentUser.isOfflineMock) {
        let stored = localStorage.getItem("axotic_mock_roster");
        if (stored) {
           let list = JSON.parse(stored);
           let idx = list.findIndex((u: any) => u.uid === currentUser.uid);
           if (idx !== -1) {
              list[idx].isOnline = true;
              list[idx].lastActiveAt = new Date().toISOString();
              localStorage.setItem("axotic_mock_roster", JSON.stringify(list));
              window.dispatchEvent(new Event("axotic_db_update"));
           }
        }
        return;
      }

      try {
        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(userRef, { lastActiveAt: new Date().toISOString(), isOnline: true }, { merge: true });
      } catch (err) {
        console.warn("Failed to update active status", err instanceof Error ? err.message : String(err));
      }
    };

    updateActiveStatus();
    const intervalId = setInterval(updateActiveStatus, 2 * 60 * 1000);

    const handleBeforeUnload = () => {
       if (currentUser.isOfflineMock) return;
       const userRef = doc(db, "users", currentUser.uid);
       setDoc(userRef, { isOnline: false, lastActiveAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (!currentUser.isOfflineMock) {
         const userRef = doc(db, "users", currentUser.uid);
         setDoc(userRef, { isOnline: false, lastActiveAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      }
    };
  }, [currentUser?.uid, currentUser?.isOfflineMock]);

  // 4. Stream Project lists globally to sync across screens (Only when logged in)
  useEffect(() => {
    if (!currentUser) {
      setProjectsList([]);
      return;
    }

    if (currentUser.isOfflineMock) {
      const seedProjects = () => {
        const local = localStorage.getItem("axotic_mock_projects");
        if (local) {
          try {
            setProjectsList(JSON.parse(local));
            return;
          } catch (_) {}
        }

        const defaultProjects: Project[] = [
          {
            id: "mock-proj-1",
            title: "Mars Rover Chassis Integration",
            description: "Developing robust aluminum structures and motor mount assemblies for the primary planetary scout chassis. Includes clearance analysis & stress testing.",
            status: "Fabricating",
            leaderId: "mock-bob",
            leaderName: "Bob Axel",
            memberIds: ["mock-sarah"],
            memberNames: ["Sarah Connor"],
            deadline: "2026-10-31",
            startDate: "2026-06-01",
            createdAt: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
            updatedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
            createdBy: "mock-genu",
            kicadLink: ""
          },
          {
            id: "mock-proj-2",
            title: "LIDAR SLAM Navigation Core",
            description: "Compiling real-time spatial pipelines, sensor-fusion nodes, and collision-avoidance graphs. Optimizing ROS2 navigation rings.",
            status: "Testing",
            leaderId: "mock-genu",
            leaderName: "Genu Kakisara (Lead)",
            memberIds: ["mock-bob", "mock-sarah"],
            memberNames: ["Bob Axel", "Sarah Connor"],
            deadline: "2026-08-15",
            startDate: "2026-05-25",
            createdAt: new Date(Date.now() - 3600000 * 24 * 20).toISOString(),
            updatedAt: new Date(Date.now() - 3600000).toISOString(),
            createdBy: "mock-genu",
            kicadLink: ""
          },
          {
            id: "mock-proj-3",
            title: "Power Delivery Board Shield",
            description: "Synthesizing 5Vin buck convertors, optoisolator ports, and high-amp terminal rails on a double-layer custom copper PCB shield.",
            status: "Planning",
            leaderId: "mock-sarah",
            leaderName: "Sarah Connor",
            memberIds: ["mock-genu"],
            memberNames: ["Genu Kakisara (Lead)"],
            deadline: "2026-12-01",
            startDate: "2026-06-10",
            createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
            updatedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
            createdBy: "mock-sarah",
            kicadLink: ""
          }
        ];
        localStorage.setItem("axotic_mock_projects", JSON.stringify(defaultProjects));
        setProjectsList(defaultProjects);
      };

      seedProjects();

      const handleStorageChange = () => {
        const local = localStorage.getItem("axotic_mock_projects");
        if (local) {
          try {
            setProjectsList(JSON.parse(local));
          } catch (_) {}
        }
      };
      window.addEventListener("axotic_db_update", handleStorageChange);
      return () => window.removeEventListener("axotic_db_update", handleStorageChange);
    }

    const projectsQuery = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsubProjects = onSnapshot(projectsQuery, (snapshot) => {
      const items: Project[] = [];
      snapshot.forEach((snapDoc) => {
        items.push({ id: snapDoc.id, ...snapDoc.data() } as Project);
      });
      setProjectsList(items);
    }, (err) => {
      console.warn("Could not fetch global build listings real-time.", err instanceof Error ? err.message : String(err));
    });

    return () => unsubProjects();
  }, [currentUser?.uid]);

  // Stream notifications real-time
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    
    if (currentUser.isOfflineMock) {
      const loadLocalNotifs = () => {
        const n = localStorage.getItem("axotic_mock_notifications");
        if (n) {
          try {
            setNotifications(JSON.parse(n));
          } catch (_) {}
        }
      };
      loadLocalNotifs();
      window.addEventListener("axotic_db_update", loadLocalNotifs);
      return () => window.removeEventListener("axotic_db_update", loadLocalNotifs);
    }

    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(50));
    const unsub = onSnapshot(q, (snapshot) => {
      const items: AppNotification[] = [];
      snapshot.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() } as AppNotification));
      setNotifications(items);
    }, (err) => {
      console.warn("Failed to stream notifications", err instanceof Error ? err.message : String(err));
    });
    return () => unsub();
  }, [currentUser?.uid, currentUser?.isOfflineMock]);



  const handlePromoteToProject = async (idea: any): Promise<string> => {
    const timestamp = new Date().toISOString();
    const newProjectPayload = {
      title: idea.title,
      description: idea.description,
      status: "Planning",
      leaderId: idea.createdBy,
      leaderName: idea.creatorName,
      memberIds: [idea.createdBy],
      memberNames: [idea.creatorName],
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: currentUser?.uid || "system",
      budget: 0,
      estimatedCost: 0,
      costSplitType: "equal",
      memberCostSplits: {},
      budgetItems: [],
      sponsorFundings: [],
      memberContributions: [],
      peerTransfers: []
    };

    if (currentUser?.isOfflineMock) {
      const generatedId = `mock-proj-${Date.now()}`;
      const local = localStorage.getItem("axotic_mock_projects");
      let currentProjects = [];
      if (local) {
        try {
          currentProjects = JSON.parse(local);
        } catch (_) {}
      }
      const updatedProjects = [
        { id: generatedId, ...newProjectPayload },
        ...currentProjects
      ];
      localStorage.setItem("axotic_mock_projects", JSON.stringify(updatedProjects));
      setProjectsList(updatedProjects);
      
      // Dispatch storage update so that active panels pick up the new project
      window.dispatchEvent(new Event("axotic_db_update"));
      createGlobalNotification("project_created", `Idea "${idea.title}" was promoted to a full project.`, generatedId, currentUser);
      return generatedId;
    } else {
      const docRef = await addDoc(collection(db, "projects"), {
        ...newProjectPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      createGlobalNotification("project_created", `Idea "${idea.title}" was promoted to a full project.`, docRef.id, currentUser);
      return docRef.id;
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("axotic_local_auth");
      await signOut(auth);
      setCurrentUser(null);
      setActiveTab("projects");
    } catch (err) {
      console.error("Sign-out failure", err instanceof Error ? err.message : String(err));
    }
  };

  if (authChecking) {
    return (
      <div id="booting-loader" className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="relative flex items-center justify-center">
          <div className="size-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          <div className="absolute font-display font-bold text-[10px] text-slate-800">AX</div>
        </div>
        <p className="font-display font-medium text-xs tracking-widest text-slate-600 mt-6 select-none uppercase">
          Initializing AXOTIC Hub Channels...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row font-sans transition-all duration-500 ease-in-out antialiased selection:bg-blue-100 dark:selection:bg-blue-900 selection:text-blue-950 dark:selection:text-blue-100">
      
      {/* 1. PUBLIC PRESENTATION MODE (User Is Logged Out) */}
      {!currentUser ? (
        <div id="public-context-shell" className="flex-1 flex flex-col animate-fade-in">
          <PublicLanding onOpenLogin={() => setIsAuthModalOpen(true)} />
          
          <AuthModal 
            isOpen={isAuthModalOpen} 
            onClose={() => setIsAuthModalOpen(false)}
            onAuthSuccess={(profile) => {
              setCurrentUser(profile);
            }}
          />
        </div>
      ) : (
        
        /* 2. SECURE MEMBER HUB WORKSPACE (User Is Logged In) */
        <div id="secure-hub-context-shell" className="flex-1 flex flex-col md:flex-row min-h-screen w-full">
          
          {/* Side navigation for desktop / top header for mobile */}
          <aside id="secured-hub-sidebar" className="sticky top-0 z-40 w-full md:w-64 bg-slate-900/85 backdrop-blur-md border-b border-slate-800 md:relative md:bg-slate-900 md:backdrop-blur-none md:border-b-0 md:border-r flex flex-col justify-between shrink-0 transition-all duration-300">
            
            {/* Top Logo & App Context */}
            <div className="py-7 px-6 md:p-6 border-b border-slate-800 flex items-center justify-between md:block">
              <div className="flex items-center space-x-3">
                <div className="size-8.5 rounded-lg overflow-hidden flex items-center justify-center bg-slate-800 relative">
                  <img 
                    src={activeLogoUrl || undefined} 
                    alt="AXOTIC Logo" 
                    className="size-full object-contain" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fb = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fb) fb.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden absolute inset-0 bg-blue-600 text-white rounded-lg flex items-center justify-center font-display font-bold text-sm shadow-md shadow-blue-500/20">
                    AX
                  </div>
                </div>
                <div>
                  <h1 className="font-display font-bold text-sm tracking-tight text-white flex items-center gap-1.5 uppercase">
                    AXOTIC <span className="text-blue-400">HUB</span>
                  </h1>
                  {currentUser?.isOfflineMock ? (
                    <div className="flex items-center gap-1 text-[9px] font-mono text-amber-400">
                      <span>SANDBOX CONNECT</span>
                      <span className="size-1.5 bg-amber-500 rounded-full animate-pulse" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400">
                      <span>LIVE CONNECTIVITY</span>
                      <span className="size-1.5 bg-emerald-500 rounded-full animate-ping" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Mobile controls button cluster */}
              <div className="flex items-center gap-2 md:hidden">
                <button
                  onClick={handleOpenEditProfile}
                  title="Edit profile settings"
                  className="size-8 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                >
                  <Settings className="size-4" />
                </button>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={cycleThemeMode}
                  title={`Toggle visual theme (Current: ${themeMode})`}
                  className="size-8 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-400 hover:text-amber-400 transition-colors flex items-center justify-center cursor-pointer relative overflow-hidden"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={isDark ? "dark" : "light"}
                      initial={{ y: -12, opacity: 0, rotate: -45, scale: 0.8 }}
                      animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
                      exit={{ y: 12, opacity: 0, rotate: 45, scale: 0.8 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="flex items-center justify-center"
                    >
                      {isDark ? <SunDim className="size-4 text-amber-400" /> : <MoonStar className="size-4 text-slate-400" />}
                    </motion.div>
                  </AnimatePresence>
                </motion.button>

                <button
                  id="mobile-sign-out-btn"
                  onClick={handleLogout}
                  title="Sign out of workspace sessions"
                  className="size-8 rounded-lg bg-slate-800 hover:bg-red-500/10 border border-slate-700 text-slate-400 hover:text-red-400 transition-all flex items-center justify-center cursor-pointer"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav id="viewport-nav" className="hidden md:flex flex-1 p-4 space-y-1.5 flex-col justify-start text-left">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-2.5 mb-2 hidden md:block">
                Member Workspace
              </div>
              
              <button
                id="tab-nav-home"
                onClick={() => setActiveTab("home")}
                className={`w-full px-3 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2.5 group relative ${
                  activeTab === "home"
                    ? "bg-slate-800 text-blue-400 shadow-sm font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <LayoutGrid className="size-4" /> Home Dashboard

                <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 w-56 scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-150 origin-left bg-slate-950 text-slate-300 rounded-lg text-[10px] p-2.5 shadow-xl border border-slate-800 z-50 hidden md:block select-none font-normal normal-case tracking-normal leading-relaxed">
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[5px] border-r-slate-950 animate-fade-in" />
                  <strong className="text-white block font-semibold mb-0.5 text-[11px]">Home Command</strong>
                  Overview metrics, supply limits, active competencies, logs, and system budgets.
                </span>
              </button>
              
              <button
                id="tab-nav-projects"
                onClick={() => setActiveTab("projects")}
                className={`w-full px-3 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2.5 group relative ${
                  activeTab === "projects"
                    ? "bg-slate-800 text-blue-400 shadow-sm font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Cpu className="size-4" /> Project Workspace

                <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 w-56 scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-150 origin-left bg-slate-950 text-slate-300 rounded-lg text-[10px] p-2.5 shadow-xl border border-slate-800 z-50 hidden md:block select-none font-normal normal-case tracking-normal leading-relaxed">
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[5px] border-r-slate-950 animate-fade-in" />
                  <strong className="text-white block font-semibold mb-0.5 text-[11px]">Robotics Projects</strong>
                  Manage component bills-of-materials, budget items, CAD schemas, and live build logs.
                </span>
              </button>

              <button
                id="tab-nav-ideas"
                onClick={() => setActiveTab("ideas")}
                className={`w-full px-3 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2.5 group relative ${
                  activeTab === "ideas"
                    ? "bg-slate-800 text-blue-400 shadow-sm font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Zap className="size-4" /> Ideas Board

                <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 w-56 scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-150 origin-left bg-slate-950 text-slate-300 rounded-lg text-[10px] p-2.5 shadow-xl border border-slate-800 z-50 hidden md:block select-none font-normal normal-case tracking-normal leading-relaxed">
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[5px] border-r-slate-950 animate-fade-in" />
                  <strong className="text-white block font-semibold mb-0.5 text-[11px]">Brainstorming Board</strong>
                  Propose mechanical designs, electronics/PCB ideas, software paths, or vote on concepts.
                </span>
              </button>
              
              <button
                id="tab-nav-inventory"
                onClick={() => setActiveTab("inventory")}
                className={`w-full px-3 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2.5 group relative ${
                  activeTab === "inventory"
                    ? "bg-slate-800 text-blue-400 shadow-sm font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Boxes className="size-4" /> Stockroom Inventory

                <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 w-56 scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-150 origin-left bg-slate-950 text-slate-300 rounded-lg text-[10px] p-2.5 shadow-xl border border-slate-800 z-50 hidden md:block select-none font-normal normal-case tracking-normal leading-relaxed">
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[5px] border-r-slate-950 animate-fade-in" />
                  <strong className="text-white block font-semibold mb-0.5 text-[11px]">Stock Inventory</strong>
                  Catalog physical parts, processors, wire sensors, brackets, and track stock counts.
                </span>
              </button>
              
              <button
                id="tab-nav-roster"
                onClick={() => setActiveTab("roster")}
                className={`w-full px-3 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2.5 group relative ${
                  activeTab === "roster"
                    ? "bg-slate-800 text-blue-400 shadow-sm font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Users className="size-4" /> Members

                <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 w-56 scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-150 origin-left bg-slate-950 text-slate-300 rounded-lg text-[10px] p-2.5 shadow-xl border border-slate-800 z-50 hidden md:block select-none font-normal normal-case tracking-normal leading-relaxed">
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[5px] border-r-slate-950 animate-fade-in" />
                  <strong className="text-white block font-semibold mb-0.5 text-[11px]">Roster Directory</strong>
                  Browse active specialists with technical specialty tags, email addresses, and graduation classes.
                </span>
              </button>

              <button
                id="tab-nav-competitions"
                onClick={() => setActiveTab("competitions")}
                className={`w-full px-3 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2.5 group relative ${
                  activeTab === "competitions"
                    ? "bg-slate-800 text-blue-400 shadow-sm font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Trophy className="size-4" /> Competitions

                <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 w-56 scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-150 origin-left bg-slate-950 text-slate-300 rounded-lg text-[10px] p-2.5 shadow-xl border border-slate-800 z-50 hidden md:block select-none font-normal normal-case tracking-normal leading-relaxed">
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[5px] border-r-slate-950 animate-fade-in" />
                  <strong className="text-white block font-semibold mb-0.5 text-[11px]">Upcoming Challenges</strong>
                  Track regional robotics cups, register team alerts, and toggle logistics reminders.
                </span>
              </button>
              
              <button
                id="tab-nav-settings"
                onClick={() => setActiveTab("settings")}
                className={`w-full px-3 py-2.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2.5 group relative ${
                  activeTab === "settings"
                    ? "bg-slate-800 text-blue-400 shadow-sm font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Settings className="size-4" /> {currentUser?.role === "admin" ? "System Settings" : "Preferences & Theme"}

                <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 w-56 scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-150 origin-left bg-slate-950 text-slate-300 rounded-lg text-[10px] p-2.5 shadow-xl border border-slate-800 z-50 hidden md:block select-none font-normal normal-case tracking-normal leading-relaxed text-left">
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[5px] border-r-slate-950 animate-fade-in" />
                  <strong className="text-white block font-semibold mb-0.5 text-[11px]">
                    {currentUser?.role === "admin" ? "Admin Hub Control" : "Personal Preferences"}
                  </strong>
                  {currentUser?.role === "admin" 
                    ? "Configure global taxonomies, component categories, member access clearance levels, and security rules." 
                    : "Calibrate visual theme preferences and update personal profile parameters."
                  }
                </span>
              </button>
            </nav>

            {/* Bottom active profile widget */}
            <div className="p-4 border-t border-slate-800 hidden md:flex flex-col space-y-3.5">
              <div className="flex items-center gap-3">
                <img
                  referrerPolicy="no-referrer"
                  src={currentUser.avatarUrl || undefined}
                  alt={currentUser.displayName}
                  className="size-9 rounded-lg border border-slate-700 shadow-xs shrink-0"
                />
                <div className="text-left w-full min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-xs font-bold text-white truncate block max-w-[100px]" title={currentUser.displayName}>
                        {currentUser.displayName}
                      </span>
                    </div>
                    {currentUser.role === "admin" ? (
                      <span className="bg-blue-500/15 text-blue-400 text-[8px] font-bold px-1.5 py-0.2 rounded border border-blue-500/30 font-mono tracking-wider shrink-0">
                        Admin
                      </span>
                    ) : (
                      <span className="bg-slate-800 text-slate-400 text-[8px] font-bold px-1.5 py-0.2 rounded border border-slate-700 font-mono tracking-wider shrink-0">
                        Member
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block truncate">{currentUser.email}</span>
                </div>
              </div>

              {/* Sign Out Option */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleOpenEditProfile}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold rounded-lg uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 border border-slate-700"
                >
                  <Settings className="size-3.5" /> Edit Profile
                </button>

                <button
                  id="navbar-sign-out-btn"
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 text-[11px] font-bold rounded-lg uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogOut className="size-3.5" /> Log Out Workspace
                </button>
              </div>

              {/* Version & Copyright Footer */}
              <div className="pt-4 pb-2 text-center flex flex-col space-y-1">
                <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">AXOTIC HUB V1.0</span>
                <span className="text-[8px] text-slate-600 font-sans tracking-wide">&copy; All rights reserved TEAM AXOTIC</span>
              </div>
            </div>
          </aside>

          {/* Main workspace frame on right */}
          <div className="flex-1 flex flex-col min-w-0">
            
            {/* Header Title Banner with workspace context description */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800/60 px-6 py-5 hidden md:block text-left transition-colors duration-500 ease-in-out">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
                    {activeTab === "home" && "AXOTIC Central Command & Analytics"}
                    {activeTab === "projects" && "Robotics Engineering Workspace"}
                    {activeTab === "ideas" && "Concept Board & Brainstorming"}
                    {activeTab === "inventory" && "Stockroom & Component Registry"}
                    {activeTab === "roster" && "Active Specialists & Team Directory"}
                    {activeTab === "settings" && (currentUser?.role === "admin" ? "Hub Command Center & Administration" : "Personal Preferences & App Settings")}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-1">
                    {activeTab === "home" && "Overview telemetry on component supply levels, sponsor funding buffers, active competencies, and logs."}
                    {activeTab === "projects" && "Draft schematics, allocate hardware components, and publish real-time team logs."}
                    {activeTab === "ideas" && "Propose custom robot attachments, electronic controllers, software nodes, upvote concepts, and promote them to active projects."}
                    {activeTab === "inventory" && "Manage stockroom part catalog listings."}
                    {activeTab === "roster" && "Active specialists with customizable technical tags, contact credentials, and division roles."}
                    {activeTab === "settings" && (currentUser?.role === "admin" 
                      ? "Manage taxonomy categories, edit member access clearance, and configure workspace params." 
                      : "Customize visual theme preferences, adjust private layout options, and calibrate personal profile parameters."
                    )}
                  </p>
                </div>
                
                <div className="flex items-center gap-3 relative">
                  {/* Notifications Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                      className="size-9 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700 text-slate-650 dark:text-slate-350 transition-all flex items-center justify-center cursor-pointer shadow-3xs relative"
                    >
                      <Bell className="size-4.5" />
                      {notifications.some(n => n.createdBy !== currentUser?.uid && !n.readBy.includes(currentUser?.uid || "")) && (
                        <div className="absolute top-2 right-2.5 size-1.5 bg-red-500 rounded-full animate-pulse blur-[1px]"></div>
                      )}
                      {notifications.some(n => n.createdBy !== currentUser?.uid && !n.readBy.includes(currentUser?.uid || "")) && (
                        <div className="absolute top-2 right-2.5 size-1.5 bg-red-500 rounded-full"></div>
                      )}
                    </button>

                    {showNotificationsMenu && (
                      <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col max-h-[400px]">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Recent Activity</h4>
                          <button 
                            onClick={() => {
                              // mark all as read logic could go here
                              setShowNotificationsMenu(false);
                            }}
                            className="text-[10px] text-blue-600 hover:underline font-semibold"
                          >
                            Close
                          </button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2 space-y-1">
                          {notifications.length === 0 ? (
                            <p className="p-4 text-center text-xs text-slate-500">No new activity found.</p>
                          ) : (
                            notifications.map((notif, idx) => {
                              const isUnread = notif.createdBy !== currentUser?.uid && !notif.readBy.includes(currentUser?.uid || "");
                              return (
                                <div 
                                  key={`${notif.id}-${idx}`} 
                                  className={`p-3 rounded-xl border transition-colors ${
                                    isUnread
                                      ? "bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50"
                                      : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                  }`}
                                  onClick={async () => {
                                    if (isUnread && currentUser && !currentUser.isOfflineMock) {
                                      try {
                                        await updateDoc(doc(db, "notifications", notif.id), {
                                          readBy: arrayUnion(currentUser.uid)
                                        });
                                      } catch (e) {}
                                    } else if (isUnread && currentUser && currentUser.isOfflineMock) {
                                      const local = localStorage.getItem("axotic_mock_notifications");
                                      if (local) {
                                        let curr = JSON.parse(local);
                                        let idx = curr.findIndex((c: any) => c.id === notif.id);
                                        if (idx !== -1) {
                                          if (!curr[idx].readBy) curr[idx].readBy = [];
                                          curr[idx].readBy.push(currentUser.uid);
                                          localStorage.setItem("axotic_mock_notifications", JSON.stringify(curr));
                                          window.dispatchEvent(new Event("axotic_db_update"));
                                        }
                                      }
                                    }
                                    if (notif.type === "idea_created" || notif.type === "comment_added") setActiveTab("ideas");
                                    if (notif.type === "project_created") setActiveTab("projects");
                                    setShowNotificationsMenu(false);
                                  }}
                                >
                                  <div className="flex items-baseline justify-between mb-1">
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{notif.creatorName}</span>
                                    <span className="text-[9px] text-slate-400">{new Date(notif.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{notif.message}</p>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Theme Toggle Button */}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={cycleThemeMode}
                    title={`Toggle visual theme (Current: ${themeMode})`}
                    className="size-9 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700 text-slate-650 dark:text-slate-350 transition-colors flex items-center justify-center cursor-pointer shadow-3xs relative overflow-hidden"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={isDark ? "dark" : "light"}
                        initial={{ y: -12, opacity: 0, rotate: -45, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ y: 12, opacity: 0, rotate: 45, scale: 0.8 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        className="flex items-center justify-center"
                      >
                        {isDark ? (
                          <SunDim className="size-4.5 text-amber-400" />
                        ) : (
                          <MoonStar className="size-4.5 text-slate-550" />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </motion.button>

                  {/* User Profile Popover Widget */}
                  {currentUser && (
                    <div className="relative" id="header-user-popover-root">
                      <button
                        onClick={() => setShowUserPopover(!showUserPopover)}
                        className="flex items-center gap-2 p-1 pr-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700 transition-all cursor-pointer shadow-3xs"
                        id="header-user-avatar-btn"
                        title="View status telemetry"
                      >
                        <img
                          src={currentUser.avatarUrl || undefined}
                          alt={currentUser.displayName}
                          className="size-7 rounded-lg object-cover border border-slate-200 dark:border-slate-600 shadow-xs shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-left hidden lg:block pr-1">
                          <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[80px]">
                            {currentUser.displayName}
                          </p>
                          <p className="text-[8px] text-slate-400 font-mono leading-none uppercase tracking-wider">
                            {currentUser.role}
                          </p>
                        </div>
                        <ChevronDown className="size-3 text-slate-450 dark:text-slate-400 shrink-0 hidden sm:block" />
                      </button>

                      <AnimatePresence>
                        {showUserPopover && (
                          <>
                            {/* Backdrop overlay */}
                            <div
                              className="fixed inset-0 z-40 bg-transparent"
                              onClick={() => setShowUserPopover(false)}
                            />
                            
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.96 }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 30,
                                opacity: { duration: 0.15 }
                              }}
                              className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-4 z-50 text-left"
                              id="header-user-popover-card"
                            >
                              {/* Avatar & Basic Info */}
                              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                                <img
                                  src={currentUser.avatarUrl || undefined}
                                  alt={currentUser.displayName}
                                  className="size-10 rounded-xl object-cover border border-slate-200 dark:border-slate-705 shadow-xs"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {currentUser.displayName}
                                  </p>
                                  <p className="text-[9px] text-slate-400 font-mono truncate">
                                    {currentUser.email}
                                  </p>
                                  <div className="mt-1 flex items-center">
                                    {currentUser.role === "admin" ? (
                                      <span className="bg-blue-500/10 text-blue-500 dark:text-blue-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-blue-500/20 font-mono uppercase tracking-wider">
                                        Admin access
                                      </span>
                                    ) : (
                                      <span className="bg-slate-100 dark:bg-slate-805 text-slate-600 dark:text-slate-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono uppercase tracking-wider">
                                        Specialist
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Simple telemetry statistics */}
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                                  <span className="block text-sm font-extrabold text-slate-900 dark:text-white font-mono leading-tight">
                                    {projectsList.length}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                                    Projects
                                  </span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                                  <span className="block text-sm font-extrabold text-rose-500 font-mono leading-tight">
                                    {notifications.filter(n => n.createdBy !== currentUser?.uid && !n.readBy.includes(currentUser?.uid || "")).length}
                                  </span>
                                  <span className="text-[8px] font-bold text-rose-400 dark:text-rose-500 uppercase tracking-wider font-mono">
                                    Unread Alerts
                                  </span>
                                </div>
                              </div>

                              {/* Direct Links */}
                              <div className="space-y-1">
                                <button
                                  onClick={() => {
                                    setShowUserPopover(false);
                                    handleOpenEditProfile();
                                  }}
                                  className="w-full flex items-center justify-between text-left p-2 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-150/50 dark:hover:border-slate-750 transition-colors cursor-pointer"
                                  id="popover-link-profile"
                                >
                                  <span className="flex items-center gap-2">
                                    <User className="size-3.5 text-slate-400" />
                                    Configure Profile Mode
                                  </span>
                                  <ChevronRight className="size-3 text-slate-400" />
                                </button>

                                <button
                                  onClick={() => {
                                    setShowUserPopover(false);
                                    setActiveTab("settings");
                                  }}
                                  className="w-full flex items-center justify-between text-left p-2 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-150/50 dark:hover:border-slate-750 transition-colors cursor-pointer"
                                  id="popover-link-settings"
                                >
                                  <span className="flex items-center gap-2">
                                    <Sliders className="size-3.5 text-slate-400" />
                                    Command Settings
                                  </span>
                                  <ChevronRight className="size-3 text-slate-400" />
                                </button>

                                <div className="border-t border-slate-100 dark:border-slate-800/80 my-2 pt-1.5">
                                  <button
                                    onClick={() => {
                                      setShowUserPopover(false);
                                      handleLogout();
                                    }}
                                    className="w-full flex items-center gap-2 text-left p-2 rounded-xl text-[11px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                                    id="popover-link-logout"
                                  >
                                    <LogOut className="size-3.5 shrink-0" />
                                    Log Out Workspace
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Real-time Indicator banner */}
                  {currentUser?.isOfflineMock ? (
                    <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 p-2 px-3.5 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-sans shadow-2xs select-none">
                      <div className="size-2 bg-amber-500 rounded-full animate-pulse" />
                      <span className="font-medium">Offline Sandbox Channel</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-755 p-2 px-3.5 rounded-xl text-xs text-slate-600 dark:text-slate-300 font-sans shadow-2xs select-none">
                      <div className="size-2 bg-emerald-500 rounded-full animate-ping" />
                      <span className="font-medium">Active Database Channel</span>
                    </div>
                  )}
                </div>
              </div>


            </header>

            {/* Core Content View Area container */}
            <main id="portal-content-frame" className="flex-1 w-full px-4 sm:px-6 pt-6 pb-24 md:py-6 animate-fade-in flex flex-col overflow-y-auto relative">
              
              {/* View dispatch router */}
              <div className="flex-1 flex flex-col">
                <AnimatePresence mode="wait">
                  {activeTab === "home" && (
                    <motion.div
                      key="home"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                      className="flex-1 flex flex-col"
                    >
                      <HomeDashboard 
                        currentUser={currentUser} 
                        roster={roster} 
                        projectsList={projectsList} 
                        onNavigate={(tab, projectId) => {
                          setActiveTab(tab);
                          if (projectId) {
                            setSelectedProjectId(projectId);
                          }
                        }}
                        onOpenEditProfile={handleOpenEditProfile}
                      />
                    </motion.div>
                  )}
                  {activeTab === "projects" && (
                    <motion.div
                      key="projects"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                      className="flex-1 flex flex-col"
                    >
                      <ProjectHub 
                        currentUser={currentUser} 
                        roster={roster} 
                        initialSelectedProjectId={selectedProjectId}
                        onClearInitialSelectedProjectId={() => setSelectedProjectId(null)}
                      />
                    </motion.div>
                  )}
                  {activeTab === "ideas" && (
                    <motion.div
                      key="ideas"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                      className="flex-1 flex flex-col"
                    >
                      <IdeasBoard
                        currentUser={currentUser}
                        roster={roster}
                        onPromoteToProject={async (idea) => {
                          const newId = await handlePromoteToProject(idea);
                          setActiveTab("projects");
                          setSelectedProjectId(newId);
                          return newId;
                        }}
                      />
                    </motion.div>
                  )}
                  {activeTab === "inventory" && (
                    <motion.div
                      key="inventory"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                      className="flex-1 flex flex-col"
                    >
                      <InventoryManager currentUser={currentUser} projects={projectsList} />
                    </motion.div>
                  )}
                  {activeTab === "roster" && (
                    <motion.div
                      key="roster"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                      className="flex-1 flex flex-col"
                    >
                      <MemberRoster currentUser={currentUser} roster={roster} />
                    </motion.div>
                  )}
                  {activeTab === "competitions" && currentUser && (
                    <motion.div
                      key="competitions"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                      className="flex-1 flex flex-col"
                    >
                      <CompetitionsHub currentUser={currentUser} roster={roster} />
                    </motion.div>
                  )}
                  {activeTab === "settings" && currentUser && (
                    <motion.div
                      key="settings"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                      className="flex-1 flex flex-col"
                    >
                      <AdminSettings 
                        currentUser={currentUser} 
                        isDark={isDark} 
                        onToggleTheme={() => setIsDark(!isDark)}
                        themeMode={themeMode}
                        onChangeThemeMode={setThemeMode}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </main>

            {/* Bottom Mobile View Navigation segment tab button row */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex flex-row overflow-x-auto p-1.5 px-2 text-[10px] sm:text-[11px] font-semibold gap-1 scrollbar-none select-none justify-between items-center sm:justify-around">
                <button
                  onClick={() => setActiveTab("home")}
                  className={`flex shrink-0 w-[60px] sm:w-[72px] flex-col items-center justify-center py-2 px-1 rounded-xl cursor-pointer transition-all ${
                    activeTab === "home" 
                      ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold" 
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <LayoutGrid className={`size-5 mb-1 ${activeTab === "home" ? "ease-out scale-110" : ""}`} strokeWidth={activeTab === "home" ? 2.5 : 2} />
                  <span>Home</span>
                </button>
                <button
                  onClick={() => setActiveTab("projects")}
                  className={`flex shrink-0 w-[60px] sm:w-[72px] flex-col items-center justify-center py-2 px-1 rounded-xl cursor-pointer transition-all ${
                    activeTab === "projects" 
                      ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold" 
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Cpu className={`size-5 mb-1 ${activeTab === "projects" ? "ease-out scale-110" : ""}`} strokeWidth={activeTab === "projects" ? 2.5 : 2} />
                  <span>Workspace</span>
                </button>
                <button
                  onClick={() => setActiveTab("ideas")}
                  className={`flex shrink-0 w-[60px] sm:w-[72px] flex-col items-center justify-center py-2 px-1 rounded-xl cursor-pointer transition-all ${
                    activeTab === "ideas" 
                      ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold" 
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Zap className={`size-5 mb-1 ${activeTab === "ideas" ? "ease-out scale-110" : ""}`} strokeWidth={activeTab === "ideas" ? 2.5 : 2} />
                  <span>Ideas</span>
                </button>
                <button
                  onClick={() => setActiveTab("inventory")}
                  className={`flex shrink-0 w-[60px] sm:w-[72px] flex-col items-center justify-center py-2 px-1 rounded-xl cursor-pointer transition-all ${
                    activeTab === "inventory" 
                      ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold" 
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Boxes className={`size-5 mb-1 ${activeTab === "inventory" ? "ease-out scale-110" : ""}`} strokeWidth={activeTab === "inventory" ? 2.5 : 2} />
                  <span>Stock</span>
                </button>
                <button
                  onClick={() => setActiveTab("roster")}
                  className={`flex shrink-0 w-[60px] sm:w-[72px] flex-col items-center justify-center py-2 px-1 rounded-xl cursor-pointer transition-all ${
                    activeTab === "roster" 
                      ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold" 
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Users className={`size-5 mb-1 ${activeTab === "roster" ? "ease-out scale-110" : ""}`} strokeWidth={activeTab === "roster" ? 2.5 : 2} />
                  <span>Members</span>
                </button>
                <button
                  onClick={() => setActiveTab("competitions")}
                  className={`flex shrink-0 w-[60px] sm:w-[72px] flex-col items-center justify-center py-2 px-1 rounded-xl cursor-pointer transition-all ${
                    activeTab === "competitions" 
                      ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold" 
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Trophy className={`size-5 mb-1 ${activeTab === "competitions" ? "ease-out scale-110" : ""}`} strokeWidth={activeTab === "competitions" ? 2.5 : 2} />
                  <span>Arena</span>
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`flex shrink-0 w-[60px] sm:w-[72px] flex-col items-center justify-center py-2 px-1 rounded-xl cursor-pointer transition-all ${
                    activeTab === "settings" 
                      ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold" 
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Settings className={`size-5 mb-1 ${activeTab === "settings" ? "ease-out scale-110" : ""}`} strokeWidth={activeTab === "settings" ? 2.5 : 2} />
                  <span>{currentUser?.role === "admin" ? "Settings" : "Preferences"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. DYNAMIC PROFILE EDIT MODAL INTERACTION INTERFACE */}
      {isEditProfileOpen && currentUser && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-55 p-4 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden relative text-left animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header Title Bar */}
            <div className="bg-slate-900 dark:bg-slate-950 px-6 py-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5 text-white">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <User className="size-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm tracking-wide uppercase">Edit My Profile Details</h3>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">Modify fields synced with AXOTIC database real-time.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditProfileOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            {/* Profile formulation form */}
            <form onSubmit={handleSaveProfile} className="p-6 overflow-y-auto space-y-5 flex-1 select-none">
              
              {profileError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-300 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <span className="size-1.5 bg-rose-500 rounded-full shrink-0" /> {profileError}
                </div>
              )}

              {/* Avatar Selector and browser uploader section */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800/60">
                <div className="relative group shrink-0">
                  <div className="size-20 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center relative">
                    {profileAvatarUrl ? (
                      <img 
                        src={profileAvatarUrl} 
                        alt="Avatar preview" 
                        className="size-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-450 p-2 text-center">
                        <Camera className="size-6 text-slate-350 dark:text-slate-500 mb-1" />
                        <span className="text-[8px] font-mono">No Photo</span>
                      </div>
                    )}
                    {compressingProfilePic && (
                      <div className="absolute inset-0 bg-white/85 dark:bg-slate-900/85 flex items-center justify-center">
                        <div className="size-5 border-2 border-slate-205 border-t-blue-600 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  {profileAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => setProfileAvatarUrl("")}
                      className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-sm transition-all cursor-pointer hover:scale-105"
                      title="Clear picture"
                    >
                      <Trash2 className="size-2.5" />
                    </button>
                  )}
                </div>

                <div className="text-center sm:text-left space-y-2 flex-1">
                  <span className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Custom Avatar Photo</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="profile-avatar-upload-picker"
                      accept="image/*"
                      onChange={handleProfilePhotoUpload}
                      className="hidden"
                    />
                    
                    <button
                      type="button"
                      onClick={() => document.getElementById("profile-avatar-upload-picker")?.click()}
                      className="px-3 py-1.8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-3xs flex items-center gap-1.5"
                    >
                      <Upload className="size-3" /> Upload Profile Image
                    </button>

                    <button
                      type="button"
                      onClick={() => setProfileAvatarUrl(`https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(profileDisplayName || 'AX')}`)}
                      className="px-3 py-1.8 bg-slate-150 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-650 dark:text-slate-350 cursor-pointer"
                    >
                      Use Pixel Art Seed
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-500 font-sans leading-normal">
                    JPG/PNG files are auto-scaled offline to minimize server overhead.
                  </p>
                </div>
              </div>

              {/* Form Input fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1 px-1">
                    Display Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-550 focus:bg-white dark:focus:bg-slate-900 rounded-xl px-3.5 py-2.5 text-xs outline-hidden transition-all text-slate-800 dark:text-slate-100 font-medium"
                    placeholder="e.g. John Doe"
                    value={profileDisplayName}
                    onChange={(e) => setProfileDisplayName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1 px-1">
                    Registered Google account
                  </label>
                  <input
                    type="email"
                    disabled
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-220 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 dark:text-slate-400 font-mono select-none opacity-70"
                    value={currentUser.email}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1 px-1">
                    📞 Contact Number
                  </label>
                  <input
                    type="tel"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl px-3.5 py-2.5 text-xs outline-hidden transition-all text-slate-800 dark:text-slate-100 font-mono"
                    placeholder="e.g. +1 (555) 012-3456"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1 px-1">
                    🎂 Birthday
                  </label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl px-3.5 py-2.5 text-xs outline-hidden transition-all text-slate-800 dark:text-slate-100 cursor-pointer"
                    value={profileBirthday}
                    onChange={(e) => setProfileBirthday(e.target.value)}
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4.5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel changes
                </button>
                <button
                  type="submit"
                  disabled={savingProfile || compressingProfilePic}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md hover:shadow-blue-500/10 transition-all cursor-pointer flex items-center gap-2 active:scale-98 disabled:opacity-55"
                >
                  {savingProfile ? "Saving changes..." : "Save My Profile"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
