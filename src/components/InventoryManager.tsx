import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db, handleFirestoreError, OperationType, createAdminLog } from "../firebase";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc 
} from "firebase/firestore";
import { 
  Search, 
  Filter, 
  Plus, 
  Wrench, 
  ShoppingBag, 
  PackageCheck, 
  AlertCircle, 
  ArrowRightLeft,
  X,
  Layers,
  MapPin,
  Cpu,
  Trash2,
  ChevronDown,
  Maximize2,
  Minimize2,
  Package,
  Battery,
  Radio,
  Box,
  List,
  LayoutGrid,
  FolderGit2
} from "lucide-react";
import { InventoryItem, Project, UserProfile, AllocatedHardware, ProjectLog } from "../types";

const getSpecPoints = (spec: string): string[] => {
  if (!spec) return [];
  let parts: string[] = [];
  if (spec.includes('\n')) {
    parts = spec.split('\n');
  } else if (spec.includes(';')) {
    parts = spec.split(';');
  } else if (spec.includes(',')) {
    parts = spec.split(',');
  } else {
    parts = [spec];
  }
  return parts
    .map(p => p.trim())
    .map(p => p.replace(/^[•\-\*\s]+/, '').trim())
    .filter(Boolean);
};

const getCategoryIcon = (category: string) => {
  const cat = (category || "").toLowerCase();
  if (cat.includes("micro") || cat.includes("chip") || cat.includes("comput")) {
    return <Cpu className="size-4 text-blue-500" />;
  }
  if (cat.includes("sensor") || cat.includes("vision") || cat.includes("imu")) {
    return <Radio className="size-4 text-emerald-500" />;
  }
  if (cat.includes("power") || cat.includes("battery") || cat.includes("energy")) {
    return <Battery className="size-4 text-amber-500" />;
  }
  if (cat.includes("mech") || cat.includes("raw") || cat.includes("stepper") || cat.includes("motor") || cat.includes("hardw")) {
    return <Layers className="size-4 text-purple-500" />;
  }
  return <Package className="size-4 text-slate-500" />;
};

interface InventoryManagerProps {
  currentUser: UserProfile;
  projects: Project[];
}

export default function InventoryManager({ currentUser, projects }: InventoryManagerProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // View mode: Linear Expandable (default) vs Dense Table
  const [viewMode, setViewMode] = useState<"linear" | "table">(() => {
    return (localStorage.getItem("axotic_inventory_view_mode") as "linear" | "table") || "linear";
  });

  const handleSetViewMode = (mode: "linear" | "table") => {
    setViewMode(mode);
    localStorage.setItem("axotic_inventory_view_mode", mode);
  };

  // Linear layout item expansion state (accordion)
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());

  const toggleExpandItem = (id: string) => {
    setExpandedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAllItems = (ids: string[]) => {
    setExpandedItemIds(new Set(ids));
  };

  const collapseAllItems = () => {
    setExpandedItemIds(new Set());
  };

  // Cross-project allocations for rich in-place dossier inspection
  const [allAllocations, setAllAllocations] = useState<{ [projectId: string]: AllocatedHardware[] }>({});

  useEffect(() => {
    if (projects.length === 0) {
      setAllAllocations({});
      return;
    }

    if (currentUser.isOfflineMock) {
      const loadLocalAllocations = () => {
        const aggregated: { [projectId: string]: AllocatedHardware[] } = {};
        projects.forEach(p => {
          const hwKey = `axotic_mock_hardware_${p.id}`;
          const stored = localStorage.getItem(hwKey);
          if (stored) {
            try {
              aggregated[p.id] = JSON.parse(stored);
            } catch (_) {}
          }
        });
        setAllAllocations(aggregated);
      };
      loadLocalAllocations();
      window.addEventListener("axotic_db_update", loadLocalAllocations);
      return () => window.removeEventListener("axotic_db_update", loadLocalAllocations);
    } else {
      const unsubscribers: (() => void)[] = [];
      const aggregated: { [projectId: string]: AllocatedHardware[] } = {};

      projects.forEach(p => {
        const hwRef = collection(db, "projects", p.id, "hardware");
        const unsub = onSnapshot(hwRef, (snap) => {
          const hwList: AllocatedHardware[] = [];
          snap.forEach(d => {
            hwList.push({ id: d.id, ...d.data() } as AllocatedHardware);
          });
          aggregated[p.id] = hwList;
          setAllAllocations({ ...aggregated });
        }, (err) => {
          console.warn("Could not stream project hardware in InventoryManager", err);
        });
        unsubscribers.push(unsub);
      });

      return () => {
        unsubscribers.forEach(u => u());
      };
    }
  }, [projects, currentUser?.isOfflineMock]);
  
  // Checkout drawer state
  const [checkoutItem, setCheckoutItem] = useState<InventoryItem | null>(null);
  const [checkoutProjectId, setCheckoutProjectId] = useState("");
  const [checkoutQty, setCheckoutQty] = useState(1);
  
  // Admin-Only Salvage Workbench state
  const [showSalvagePanel, setShowSalvagePanel] = useState(false);
  const [salvageProjectId, setSalvageProjectId] = useState("");
  const [projectHardwareList, setProjectHardwareList] = useState<AllocatedHardware[]>([]);
  const [selectedSalvageHardware, setSelectedSalvageHardware] = useState<AllocatedHardware | null>(null);
  const [salvageQty, setSalvageQty] = useState(1);
  
  // Registration state (any member can add items)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCat, setNewCat] = useState("Microcontrollers");
  const [newTotalQty, setNewTotalQty] = useState(10);
  const [newLoc, setNewLoc] = useState("");
  const [newSpec, setNewSpec] = useState("");
  const [mergeExisting, setMergeExisting] = useState(true);

  // Edit stock item state
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCat, setEditCat] = useState("Microcontrollers");
  const [editTotalQty, setEditTotalQty] = useState(10);
  const [editAvailQty, setEditAvailQty] = useState(10);
  const [editLoc, setEditLoc] = useState("");
  const [editSpec, setEditSpec] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteConfirmItemId, setDeleteConfirmItemId] = useState<string | null>(null);

  const [categories, setCategories] = useState<string[]>(["Microcontrollers", "Mechanical", "Sensors", "Energy & Power", "Raw Materials"]);

  // Stream categories dynamically
  useEffect(() => {
    if (currentUser.isOfflineMock) {
      const loadMockCategories = () => {
        const stored = localStorage.getItem("axotic_mock_categories");
        if (stored) {
          try {
            setCategories(JSON.parse(stored));
          } catch (_) {}
        }
      };
      loadMockCategories();
      window.addEventListener("axotic_db_update", loadMockCategories);
      return () => window.removeEventListener("axotic_db_update", loadMockCategories);
    } else {
      const unsub = onSnapshot(collection(db, "categories"), (snap) => {
        if (!snap.empty) {
          const list: string[] = [];
          snap.forEach((d) => {
            if (d.data().name) list.push(d.data().name);
          });
          setCategories(Array.from(new Set(list)));
        }
      }, (err) => {
        console.warn("Could not stream categories dynamically", err instanceof Error ? err.message : String(err));
        handleFirestoreError(err, OperationType.LIST, "categories");
      });
      return () => unsub();
    }
  }, [currentUser?.isOfflineMock]);

  // Set default category when categories list changes
  useEffect(() => {
    if (categories.length > 0) {
      if (!categories.includes(newCat)) setNewCat(categories[0]);
      if (!categories.includes(editCat)) setEditCat(categories[0]);
    }
  }, [categories]);

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 6000);
  };

  const isAdmin = currentUser.role === "admin";

  // Stream general stockroom inventory
  useEffect(() => {
    if (currentUser.isOfflineMock) {
      const loadLocalInventory = () => {
        const stored = localStorage.getItem("axotic_mock_inventory");
        if (stored) {
          try {
            setInventory(JSON.parse(stored));
          } catch (_) {
            setInventory([]);
          }
        } else {
          // Default initial inventory seed
          const defaultInventory: InventoryItem[] = [
            {
              id: "inv-esp32",
              name: "ESP32-WROOM-32E Dev Board",
              category: "Microcontrollers",
              description: "Dual-core Wi-Fi & Bluetooth microcontroller node for high-frequency navigation signals.",
              totalQuantity: 25,
              availableQuantity: 21,
              location: "Cabinet A-4",
              specification: "ESP32-D0WDQ6-V3, 3.3V power node, 240MHz dual-core"
            },
            {
              id: "inv-imu",
              name: "MPU6050 6-Axis Accelerometer/Gyroscope",
              category: "Sensors",
              description: "High precision inertial measurement unit for orientation tracking and SLAM feedback.",
              totalQuantity: 15,
              availableQuantity: 15,
              location: "Drawer B-1",
              specification: "I2C interface, 3-5V input tolerance, 16-bit ADC per channel"
            },
            {
              id: "inv-motor",
              name: "NEMA 17 Stepper Motor High Torque",
              category: "Hardware",
              description: "High durability drivetrain locomotion node. Integrates directly with motor control shields.",
              totalQuantity: 30,
              availableQuantity: 28,
              location: "Bay C-2",
              specification: "1.8 deg/step, 1.5A rating, 42x42x48mm dimensions"
            }
          ];
          localStorage.setItem("axotic_mock_inventory", JSON.stringify(defaultInventory));
          setInventory(defaultInventory);
        }
      };
      loadLocalInventory();
      window.addEventListener("axotic_db_update", loadLocalInventory);
      return () => window.removeEventListener("axotic_db_update", loadLocalInventory);
    }

    const unsub = onSnapshot(collection(db, "inventory"), (snap) => {
      const list: InventoryItem[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as InventoryItem);
      });
      setInventory(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "inventory");
    });

    return () => unsub();
  }, [currentUser?.isOfflineMock]);

  // When salvage project changes, fetch its hardware subcollection
  useEffect(() => {
    if (!salvageProjectId) {
      setProjectHardwareList([]);
      setSelectedSalvageHardware(null);
      return;
    }

    if (currentUser.isOfflineMock) {
      const hwKey = `axotic_mock_hardware_${salvageProjectId}`;
      const stored = localStorage.getItem(hwKey);
      if (stored) {
        try {
          const parsed: AllocatedHardware[] = JSON.parse(stored);
          setProjectHardwareList(parsed);
          setSelectedSalvageHardware(parsed[0] || null);
          setSalvageQty(1);
        } catch (_) {
          setProjectHardwareList([]);
        }
      } else {
        setProjectHardwareList([]);
      }
      return;
    }

    const unsub = onSnapshot(collection(db, "projects", salvageProjectId, "hardware"), (snap) => {
      const list: AllocatedHardware[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as AllocatedHardware);
      });
      setProjectHardwareList(list);
      setSelectedSalvageHardware(list[0] || null);
      setSalvageQty(1);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `projects/${salvageProjectId}/hardware`);
    });

    return () => unsub();
  }, [salvageProjectId, currentUser?.isOfflineMock]);

  // Quick In-Place Stock Quantity Adjuster (+1, -1, +5, -5)
  const handleQuickAdjustQuantity = async (item: InventoryItem, delta: number) => {
    const nextTotal = Math.max(0, item.totalQuantity + delta);
    const allocated = Math.max(0, item.totalQuantity - item.availableQuantity);
    const nextAvail = Math.max(0, nextTotal - allocated);

    if (currentUser.isOfflineMock) {
      try {
        const stored = localStorage.getItem("axotic_mock_inventory");
        if (stored) {
          const invList: InventoryItem[] = JSON.parse(stored);
          const idx = invList.findIndex(i => i.id === item.id);
          if (idx !== -1) {
            invList[idx].totalQuantity = nextTotal;
            invList[idx].availableQuantity = nextAvail;
            localStorage.setItem("axotic_mock_inventory", JSON.stringify(invList));
            window.dispatchEvent(new Event("axotic_db_update"));
            triggerFeedback(`Adjusted stock of ${item.name} (${delta > 0 ? `+${delta}` : delta} units)`);
          }
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      const itemRef = doc(db, "inventory", item.id);
      await updateDoc(itemRef, {
        totalQuantity: nextTotal,
        availableQuantity: nextAvail
      });
      triggerFeedback(`Adjusted stock of ${item.name} (${delta > 0 ? `+${delta}` : delta} units)`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `inventory/${item.id}`);
    }
  };

  // Register new item into inventory
  const handleRegisterItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const trimmedName = newName.trim();
    const existingIndex = inventory.findIndex(
      (item) => item.name.toLowerCase().trim() === trimmedName.toLowerCase()
    );

    // Merge duplicate if requested
    if (existingIndex !== -1 && mergeExisting) {
      const targetItem = inventory[existingIndex];
      const updatedTotal = targetItem.totalQuantity + Number(newTotalQty);
      const updatedAvail = targetItem.availableQuantity + Number(newTotalQty);

      if (currentUser.isOfflineMock) {
        try {
          setLoading(true);
          const stored = localStorage.getItem("axotic_mock_inventory");
          if (stored) {
            const currentInv: InventoryItem[] = JSON.parse(stored);
            const idx = currentInv.findIndex(i => i.id === targetItem.id);
            if (idx !== -1) {
              currentInv[idx].totalQuantity = updatedTotal;
              currentInv[idx].availableQuantity = updatedAvail;
              if (newLoc.trim()) currentInv[idx].location = newLoc.trim();
              if (newSpec.trim()) currentInv[idx].specification = newSpec.trim();
              if (newDesc.trim()) currentInv[idx].description = newDesc.trim();
              localStorage.setItem("axotic_mock_inventory", JSON.stringify(currentInv));
              window.dispatchEvent(new Event("axotic_db_update"));
            }
          }
          setShowAddModal(false);
          setNewName("");
          setNewDesc("");
          setNewTotalQty(10);
          setNewLoc("");
          setNewSpec("");
          triggerFeedback(`Merged stock for ${trimmedName}: Added +${newTotalQty} units (Total: ${updatedTotal}).`);
          createAdminLog("INVENTORY_MERGED", `Merged ${newTotalQty} units into "${trimmedName}". Total count is now ${updatedTotal}.`, currentUser);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const itemRef = doc(db, "inventory", targetItem.id);
        const updatePayload: Partial<InventoryItem> = {
          totalQuantity: updatedTotal,
          availableQuantity: updatedAvail,
        };
        if (newLoc.trim()) updatePayload.location = newLoc.trim();
        if (newSpec.trim()) updatePayload.specification = newSpec.trim();
        if (newDesc.trim()) updatePayload.description = newDesc.trim();

        await updateDoc(itemRef, updatePayload);
        setShowAddModal(false);
        setNewName("");
        setNewDesc("");
        setNewTotalQty(10);
        setNewLoc("");
        setNewSpec("");
        triggerFeedback(`Merged stock for ${trimmedName}: Added +${newTotalQty} units (Total: ${updatedTotal}).`);
        createAdminLog("INVENTORY_MERGED", `Merged ${newTotalQty} units into "${trimmedName}". Total count is now ${updatedTotal}.`, currentUser);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `inventory/${targetItem.id}`);
      } finally {
        setLoading(false);
      }
      return;
    }

    const payload = {
      name: trimmedName,
      description: newDesc.trim(),
      category: newCat,
      totalQuantity: Number(newTotalQty),
      availableQuantity: Number(newTotalQty),
      location: newLoc.trim() || "Unassigned Bay",
      specification: newSpec.trim()
    };

    if (currentUser.isOfflineMock) {
      setLoading(true);
      const stored = localStorage.getItem("axotic_mock_inventory");
      const currentInv: InventoryItem[] = stored ? JSON.parse(stored) : [];
      const newInvItem: InventoryItem = {
        id: `inv-${Date.now()}`,
        ...payload
      };
      localStorage.setItem("axotic_mock_inventory", JSON.stringify([newInvItem, ...currentInv]));
      window.dispatchEvent(new Event("axotic_db_update"));

      setShowAddModal(false);
      setNewName("");
      setNewDesc("");
      setNewTotalQty(10);
      setNewLoc("");
      setNewSpec("");
      triggerFeedback("New hardware component successfully registered in Sandbox.");
      createAdminLog("INVENTORY_ADDED", `Registered new item: "${trimmedName}" in Sandbox.`, currentUser);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, "inventory"), payload);
      
      setShowAddModal(false);
      setNewName("");
      setNewDesc("");
      setNewTotalQty(10);
      setNewLoc("");
      setNewSpec("");
      triggerFeedback("New hardware component successfully registered.");
      createAdminLog("INVENTORY_ADDED", `Registered new item: "${trimmedName}".`, currentUser);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDesc(item.description || "");
    setEditCat(item.category);
    setEditTotalQty(item.totalQuantity);
    setEditAvailQty(item.availableQuantity);
    setEditLoc(item.location || "");
    setEditSpec(item.specification || "");
    setShowEditItemModal(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editName.trim()) return;

    if (editAvailQty > editTotalQty) {
      triggerError("Error: Available quantity cannot exceed total quantity.");
      return;
    }

    const payload: Partial<InventoryItem> = {
      name: editName.trim(),
      description: editDesc.trim(),
      category: editCat,
      totalQuantity: Number(editTotalQty),
      availableQuantity: Number(editAvailQty),
      location: editLoc.trim() || "Unassigned Bay",
      specification: editSpec.trim()
    };

    if (currentUser.isOfflineMock) {
      try {
        setLoading(true);
        const stored = localStorage.getItem("axotic_mock_inventory");
        if (stored) {
          const invList: InventoryItem[] = JSON.parse(stored);
          const idx = invList.findIndex(item => item.id === editingItem.id);
          if (idx !== -1) {
            invList[idx] = {
              ...invList[idx],
              ...payload
            };
            localStorage.setItem("axotic_mock_inventory", JSON.stringify(invList));
            window.dispatchEvent(new Event("axotic_db_update"));
            triggerFeedback(`Updated catalog details for ${editName}.`);
            setShowEditItemModal(false);
          }
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Live mode
    try {
      setLoading(true);
      const itemRef = doc(db, "inventory", editingItem.id);
      await updateDoc(itemRef, payload);
      triggerFeedback(`Updated catalog details for ${editName}.`);
      setShowEditItemModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `inventory/${editingItem.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCatalogItem = async (itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    if (currentUser.isOfflineMock) {
      try {
        setLoading(true);
        const stored = localStorage.getItem("axotic_mock_inventory");
        if (stored) {
          const invList: InventoryItem[] = JSON.parse(stored);
          const filtered = invList.filter(i => i.id !== itemId);
          localStorage.setItem("axotic_mock_inventory", JSON.stringify(filtered));
          window.dispatchEvent(new Event("axotic_db_update"));
          triggerFeedback(`Successfully removed ${item.name} from stockroom catalog.`);
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
        setDeleteConfirmItemId(null);
      }
      return;
    }

    // Live mode
    try {
      setLoading(true);
      const itemRef = doc(db, "inventory", itemId);
      await deleteDoc(itemRef);
      triggerFeedback(`Successfully removed ${item.name} from stockroom catalog.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `inventory/${itemId}`);
    } finally {
      setLoading(false);
      setDeleteConfirmItemId(null);
    }
  };

  // Perform checkout allocation
  const handlePerformAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutItem || !checkoutProjectId || checkoutQty <= 0) return;

    if (checkoutQty > checkoutItem.availableQuantity) {
      triggerError("Error: Insufficient stock room quantity. Reduce allocation amount.");
      return;
    }

    const selectedProj = projects.find(p => p.id === checkoutProjectId);
    if (!selectedProj) return;

    if (currentUser.isOfflineMock) {
      try {
        setLoading(true);

        // 1. Deduct count in Inventory
        const storedInv = localStorage.getItem("axotic_mock_inventory");
        if (storedInv) {
          const invList: InventoryItem[] = JSON.parse(storedInv);
          const iIdx = invList.findIndex(item => item.id === checkoutItem.id);
          if (iIdx !== -1) {
            invList[iIdx].availableQuantity = invList[iIdx].availableQuantity - checkoutQty;
            localStorage.setItem("axotic_mock_inventory", JSON.stringify(invList));
          }
        }

        // 2. Append to project allocated hardware Subcollection
        const hwKey = `axotic_mock_hardware_${checkoutProjectId}`;
        const storedHw = localStorage.getItem(hwKey);
        const hwList: AllocatedHardware[] = storedHw ? JSON.parse(storedHw) : [];
        const hwIdx = hwList.findIndex(hw => hw.id === checkoutItem.id);
        
        if (hwIdx !== -1) {
          hwList[hwIdx].quantity = hwList[hwIdx].quantity + checkoutQty;
          hwList[hwIdx].allocatedAt = new Date().toISOString();
        } else {
          const payload: AllocatedHardware = {
            id: checkoutItem.id,
            name: checkoutItem.name,
            category: checkoutItem.category,
            quantity: checkoutQty,
            allocatedBy: currentUser.uid,
            allocatedByName: currentUser.displayName,
            allocatedAt: new Date().toISOString()
          };
          hwList.push(payload);
        }
        localStorage.setItem(hwKey, JSON.stringify(hwList));

        // 3. Append to Project Logs feed
        const logsKey = `axotic_mock_logs_${checkoutProjectId}`;
        const storedLogs = localStorage.getItem(logsKey);
        const logsList: ProjectLog[] = storedLogs ? JSON.parse(storedLogs) : [];
        const newLog: ProjectLog = {
          id: `mock-log-${Date.now()}`,
          projectId: checkoutProjectId,
          content: `⚡ HARDWARE ALLOCATION: Allocated x${checkoutQty} ${checkoutItem.name} (${checkoutItem.category}) from stockroom.`,
          authorId: currentUser.uid,
          authorName: currentUser.displayName,
          createdAt: new Date().toISOString()
        };
        logsList.unshift(newLog);
        localStorage.setItem(logsKey, JSON.stringify(logsList));

        window.dispatchEvent(new Event("axotic_db_update"));

        setCheckoutItem(null);
        setCheckoutProjectId("");
        setCheckoutQty(1);
        triggerFeedback(`Successfully allocated x${checkoutQty} ${checkoutItem.name} to ${selectedProj.title}.`);
      } catch (err) {
        console.error("Local allocation error", err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      // 1. Deduct count in Inventory
      const itemRef = doc(db, "inventory", checkoutItem.id);
      await updateDoc(itemRef, {
        availableQuantity: checkoutItem.availableQuantity - checkoutQty
      });

      // 2. Append to project allocated hardware Subcollection
      const hwCollectionRef = collection(db, "projects", checkoutProjectId, "hardware");
      const projectHwRef = doc(hwCollectionRef, checkoutItem.id);
      const hwSnap = await getDoc(projectHwRef);

      if (hwSnap.exists()) {
        const existingData = hwSnap.data() as AllocatedHardware;
        await updateDoc(projectHwRef, {
          quantity: existingData.quantity + checkoutQty,
          allocatedAt: new Date().toISOString()
        });
      } else {
        const payload: AllocatedHardware = {
          id: checkoutItem.id,
          name: checkoutItem.name,
          category: checkoutItem.category,
          quantity: checkoutQty,
          allocatedBy: currentUser.uid,
          allocatedByName: currentUser.displayName,
          allocatedAt: new Date().toISOString()
        };
        await setDoc(projectHwRef, payload);
      }

      // 3. Append to Project Logs feed
      const logRef = collection(db, "projects", checkoutProjectId, "logs");
      await addDoc(logRef, {
        projectId: checkoutProjectId,
        content: `⚡ HARDWARE ALLOCATION: Allocated x${checkoutQty} ${checkoutItem.name} (${checkoutItem.category}) from stockroom.`,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        createdAt: new Date().toISOString()
      });

      setCheckoutItem(null);
      setCheckoutProjectId("");
      setCheckoutQty(1);
      triggerFeedback(`Successfully allocated x${checkoutQty} ${checkoutItem.name} to ${selectedProj.title}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `projects/${checkoutProjectId}/hardware`);
    } finally {
      setLoading(false);
    }
  };

  // Perform Admin Component Salvage (return hardware from project build back to inventory)
  const handlePerformSalvage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salvageProjectId || !selectedSalvageHardware || salvageQty <= 0) return;

    if (currentUser.isOfflineMock) {
      try {
        setLoading(true);

        // 1. Return count to inventory
        const storedInv = localStorage.getItem("axotic_mock_inventory");
        if (storedInv) {
          const invList: InventoryItem[] = JSON.parse(storedInv);
          const iIdx = invList.findIndex(item => item.id === selectedSalvageHardware.id);
          if (iIdx !== -1) {
            invList[iIdx].availableQuantity = invList[iIdx].availableQuantity + salvageQty;
            localStorage.setItem("axotic_mock_inventory", JSON.stringify(invList));
          }
        }

        // 2. Reduce or strip subcollection project-hardware records
        const hwKey = `axotic_mock_hardware_${salvageProjectId}`;
        const storedHw = localStorage.getItem(hwKey);
        if (storedHw) {
          let hwList: AllocatedHardware[] = JSON.parse(storedHw);
          const hwIdx = hwList.findIndex(hw => hw.id === selectedSalvageHardware.id);
          if (hwIdx !== -1) {
            if (salvageQty === selectedSalvageHardware.quantity) {
              hwList = hwList.filter(hw => hw.id !== selectedSalvageHardware.id);
            } else {
              hwList[hwIdx].quantity = hwList[hwIdx].quantity - salvageQty;
            }
            localStorage.setItem(hwKey, JSON.stringify(hwList));
          }
        }

        // 3. Append manual salvage log in the workspace
        const logsKey = `axotic_mock_logs_${salvageProjectId}`;
        const storedLogs = localStorage.getItem(logsKey);
        const logsList: ProjectLog[] = storedLogs ? JSON.parse(storedLogs) : [];
        const newLog: ProjectLog = {
          id: `mock-log-${Date.now()}`,
          projectId: salvageProjectId,
          content: `🔧 ADMIN SALVAGE: Salvaged/stripped x${salvageQty} ${selectedSalvageHardware.name} back to central stores.`,
          authorId: currentUser.uid,
          authorName: currentUser.displayName,
          createdAt: new Date().toISOString()
        };
        logsList.unshift(newLog);
        localStorage.setItem(logsKey, JSON.stringify(logsList));

        window.dispatchEvent(new Event("axotic_db_update"));

        setSalvageProjectId("");
        triggerFeedback(`Successfully salvaged x${salvageQty} ${selectedSalvageHardware.name} components.`);
      } catch (err) {
        console.error("Local salvage error", err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);

      // 1. Feed count back to Inventory
      const itemInventoryRef = doc(db, "inventory", selectedSalvageHardware.id);
      const invSnap = await getDoc(itemInventoryRef);
      
      if (invSnap.exists()) {
        const currentInv = invSnap.data() as InventoryItem;
        await updateDoc(itemInventoryRef, {
          availableQuantity: currentInv.availableQuantity + salvageQty
        });
      }

      // 2. Reduce or strip subcollection project-hardware records
      const projectHwRef = doc(db, "projects", salvageProjectId, "hardware", selectedSalvageHardware.id);
      if (salvageQty === selectedSalvageHardware.quantity) {
        await deleteDoc(projectHwRef);
      } else {
        await updateDoc(projectHwRef, {
          quantity: selectedSalvageHardware.quantity - salvageQty
        });
      }

      // 3. Append manual salvage log in the workspace
      const logRef = collection(db, "projects", salvageProjectId, "logs");
      await addDoc(logRef, {
        projectId: salvageProjectId,
        content: `🔧 ADMIN SALVAGE: Salvaged/stripped x${salvageQty} ${selectedSalvageHardware.name} back to central stores.`,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        createdAt: new Date().toISOString()
      });

      setSalvageProjectId("");
      triggerFeedback(`Successfully salvaged x${salvageQty} ${selectedSalvageHardware.name} components.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `projects/${salvageProjectId}/hardware`);
    } finally {
      setLoading(false);
    }
  };

  const triggerFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(""), 4500);
  };

  // Filter and search inventory items locally
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.specification.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalUnits = inventory.reduce((acc, i) => acc + (i.totalQuantity || 0), 0);
  const availableUnits = inventory.reduce((acc, i) => acc + (i.availableQuantity || 0), 0);
  const allocatedUnits = Math.max(0, totalUnits - availableUnits);
  const depletedCount = inventory.filter(i => i.availableQuantity <= 0).length;
  const lowStockCount = inventory.filter(i => i.availableQuantity > 0 && i.availableQuantity <= 3).length;

  return (
    <div id="inventory-manager-layout" className="space-y-5 w-full max-w-7xl mx-auto px-1 py-4 text-left">
      
      {/* Header & Metrics Overview */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xs text-left">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Box className="size-3.5 text-blue-600 dark:text-blue-400" />
              <span>Stockroom Inventory</span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
              <span>Linear Expandable Hardware Catalog</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Stockroom & Components
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Centralized stock of processors, actuators, sensors, and structural hardware. Click any line to expand component dossiers, technical specifications, and project allocations.
            </p>
          </div>

          {/* Clean Unboxed Metric Indicators */}
          <div className="flex items-center divide-x divide-slate-100 dark:divide-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 shrink-0 flex-wrap sm:flex-nowrap">
            <div className="px-3.5 py-1 text-left">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">Catalog Parts</span>
              <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                {inventory.length}
              </span>
            </div>
            <div className="px-3.5 py-1 text-left">
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block font-mono">Available</span>
              <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {availableUnits}
              </span>
            </div>
            <div className="px-3.5 py-1 text-left">
              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider block font-mono">Allocated</span>
              <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
                {allocatedUnits}
              </span>
            </div>
            <div className="px-3.5 py-1 text-left">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">Total Units</span>
              <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                {totalUnits}
              </span>
            </div>
            {depletedCount > 0 && (
              <div className="px-3.5 py-1 text-left hidden sm:block">
                <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider block font-mono">Depleted</span>
                <span className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                  {depletedCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search, Category Tabs & Actions Control Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5 text-left">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          
          {/* Search bar */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              className="w-full bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/60 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-9 py-2 text-xs outline-hidden text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all"
              placeholder="Search components by name, location (Cabinet A-4), specs (ESP32, 5Vin, I2C)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle, Expand/Collapse & Primary Actions */}
          <div className="flex items-center gap-2.5 self-start lg:self-auto shrink-0 flex-wrap">
            
            {/* View Mode Switcher: Linear vs Table */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleSetViewMode("linear")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "linear"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title="Linear Expandable Lines"
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
                title="Dense Directory Table"
              >
                <LayoutGrid className="size-3.5" />
                <span>Table</span>
              </button>
            </div>

            {/* Quick Expand All / Collapse All controls (available in linear mode) */}
            {viewMode === "linear" && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => expandAllItems(filteredInventory.map(i => i.id))}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  title="Expand all stockroom lines"
                >
                  <Maximize2 className="size-3" />
                  <span>Expand All</span>
                </button>
                <button
                  type="button"
                  onClick={collapseAllItems}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  title="Collapse all stockroom lines"
                >
                  <Minimize2 className="size-3" />
                  <span>Collapse</span>
                </button>
              </div>
            )}

            {/* Admin Salvage Switch */}
            <button
              onClick={() => setShowSalvagePanel(!showSalvagePanel)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showSalvagePanel 
                  ? "bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300" 
                  : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <Wrench className="size-3.5" /> Salvaging
            </button>

            {/* Register New Hardware */}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="size-3.5" /> Register Part
            </button>
          </div>
        </div>

        {/* Category Segmented Tabs with Live Item Counts */}
        <div className="flex flex-wrap gap-1.5 items-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1.5 font-mono flex items-center gap-1">
            <Filter className="size-3 text-blue-500" /> Category:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory("All")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              selectedCategory === "All"
                ? "bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-2xs"
                : "bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60"
            }`}
          >
            <span>All Parts</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              selectedCategory === "All" ? "bg-white/20 text-white" : "bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
            }`}>
              {inventory.length}
            </span>
          </button>

          {categories.map((cat) => {
            const count = inventory.filter(i => i.category.toLowerCase() === cat.toLowerCase()).length;
            const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-2xs"
                    : "bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60"
                }`}
              >
                <span>{cat}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Summary Row */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Showing <strong className="text-slate-800 dark:text-slate-200 font-semibold">{filteredInventory.length}</strong> of {inventory.length} components</span>
            {(searchTerm || selectedCategory !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("All");
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-xs cursor-pointer ml-1"
              >
                Reset Filters
              </button>
            )}
          </div>
          {viewMode === "linear" && (
            <span className="text-[11px] text-slate-400 italic hidden sm:inline font-mono">
              {expandedItemIds.size} of {filteredInventory.length} lines expanded
            </span>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div id="inventory-feedback" className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
          <PackageCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> {feedbackMsg}
        </div>
      )}

      {errorMsg && (
        <div id="inventory-error" className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-semibold flex items-center gap-2">
          <AlertCircle className="size-4 text-rose-600 dark:text-rose-400 shrink-0" /> {errorMsg}
        </div>
      )}

      {/* Advanced Component Salvaging Workbench (Collapsible Block) */}
      {showSalvagePanel && (
        <div id="salvage-workbench" className="bg-amber-50/50 dark:bg-amber-950/20 p-5 sm:p-6 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 text-left space-y-4">
          <div className="flex items-start justify-between border-b border-amber-200/60 dark:border-amber-900/60 pb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 uppercase">
                <Wrench className="size-4 text-amber-600 dark:text-amber-400" /> Component Salvaging & Scrap Deck
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-sans mt-0.5">
                Admin Privilege: Strip parts off existing, retired, or finished chassis and inject them back into database stockrooms.
              </p>
            </div>
            {!isAdmin && (
              <span className="px-2 py-0.5 bg-red-50 text-red-800 border border-red-100 text-[9px] font-bold rounded flex items-center gap-1 uppercase">
                <AlertCircle className="size-3" /> Locked to Admins Only
              </span>
            )}
          </div>

          {isAdmin ? (
            <form onSubmit={handlePerformSalvage} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white dark:bg-slate-900 p-5 rounded-xl border border-amber-200/60 dark:border-amber-900/60 shadow-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Project</label>
                <select
                  required
                  value={salvageProjectId}
                  onChange={(e) => setSalvageProjectId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.8 text-xs text-slate-700 dark:text-slate-200 cursor-pointer outline-hidden focus:border-blue-500"
                >
                  <option value="">Choose build...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.status})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Active Part</label>
                <select
                  required
                  disabled={projectHardwareList.length === 0}
                  onChange={(e) => {
                    const item = projectHardwareList.find(h => h.id === e.target.value);
                    setSelectedSalvageHardware(item || null);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.8 text-xs text-slate-700 dark:text-slate-200 cursor-pointer outline-hidden disabled:opacity-50 focus:border-blue-500"
                >
                  {projectHardwareList.length === 0 ? (
                    <option value="">No parts allocated</option>
                  ) : (
                    projectHardwareList.map(h => (
                      <option key={h.id} value={h.id}>{h.name} (Qty: {h.quantity})</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantity to Salvage</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={1}
                    max={selectedSalvageHardware?.quantity || 1}
                    value={salvageQty}
                    onChange={(e) => setSalvageQty(Math.floor(Number(e.target.value)))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 shrink-0 font-mono">max: {selectedSalvageHardware?.quantity || 0}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={projectHardwareList.length === 0 || !selectedSalvageHardware}
                className="w-full py-2 bg-slate-900 text-white hover:bg-blue-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 outline-hidden transition-all duration-200 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <ArrowRightLeft className="size-4" /> Transfer to Catalog
              </button>
            </form>
          ) : (
            <div className="p-4 bg-white/50 text-slate-400 text-xs text-center border rounded-xl italic">
              Access Restricted. Please log in utilizing an Administrator card to test part-stripping and reclamation.
            </div>
          )}
        </div>
      )}

      {/* Main Stockroom Catalog: Linear Expandable Lines or Dense Table */}
      {filteredInventory.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 p-16 rounded-2xl text-center shadow-2xs">
          <Cpu className="size-12 text-slate-300 dark:text-slate-600 mx-auto mb-3 animate-pulse" />
          <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-200">No Catalog Matches</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Refine your search parameters or register a new hardware unit above.</p>
        </div>
      ) : viewMode === "linear" ? (

        /* ==================== LINEAR EXPANDABLE VIEW ==================== */
        <section id="catalog-stock-linear" className="space-y-2 text-left">
          {filteredInventory.map((item) => {
            const isExpanded = expandedItemIds.has(item.id);
            const isOutOfStock = item.availableQuantity <= 0;
            const isLowStock = !isOutOfStock && item.availableQuantity <= 3;
            const specPoints = getSpecPoints(item.specification);
            const allocatedCount = Math.max(0, item.totalQuantity - item.availableQuantity);
            const availablePercent = item.totalQuantity > 0 
              ? Math.round((item.availableQuantity / item.totalQuantity) * 100) 
              : 0;

            // Match active project allocations for this item
            const itemAllocations = Object.entries(allAllocations).flatMap(([projId, list]) => {
              const matching = list.filter(hw => hw.name.toLowerCase() === item.name.toLowerCase() || hw.id === item.id);
              const proj = projects.find(p => p.id === projId);
              return matching.map(hw => ({
                projectId: projId,
                projectTitle: proj?.title || "Robotics Build",
                quantity: hw.quantity,
                allocatedByName: hw.allocatedByName,
                allocatedAt: hw.allocatedAt
              }));
            });

            return (
              <div
                key={item.id}
                id={`catalog-item-${item.id}`}
                className={`bg-white dark:bg-slate-900 rounded-xl border transition-all duration-200 overflow-hidden text-left ${
                  isExpanded
                    ? "border-blue-500/50 dark:border-blue-500/50 shadow-md ring-1 ring-blue-500/20"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
                }`}
              >
                {/* Sleek Horizontal Linear Row (Click to Expand) */}
                <div
                  onClick={() => toggleExpandItem(item.id)}
                  className={`px-4 py-3 sm:px-5 sm:py-3.5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 transition-colors select-none ${
                    isExpanded ? "bg-slate-50/70 dark:bg-slate-800/40" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/25"
                  }`}
                >
                  {/* Left: Category Icon, Component Title, Category Pill, Storage Location & Spec snippet */}
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    
                    <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 flex items-center justify-center shrink-0">
                      {getCategoryIcon(item.category)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight truncate">
                          {item.name}
                        </h3>
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-bold rounded uppercase tracking-wider font-mono">
                          {item.category}
                        </span>
                      </div>

                      {/* Linear details line: location + specs preview */}
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 font-sans text-[11px] text-slate-600 dark:text-slate-300">
                          <MapPin className="size-3 text-slate-400 shrink-0" /> {item.location || "Unassigned Bay"}
                        </span>
                        
                        {!isExpanded && specPoints.length > 0 && (
                          <>
                            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700 hidden md:inline">·</span>
                            <span className="text-[11px] text-slate-400 font-mono truncate max-w-xs lg:max-w-md hidden md:inline">
                              {specPoints[0]}
                            </span>
                          </>
                        )}
                        {!isExpanded && specPoints.length === 0 && item.description && (
                          <>
                            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700 hidden md:inline">·</span>
                            <span className="text-[11px] text-slate-400 truncate max-w-xs lg:max-w-md hidden md:inline">
                              {item.description}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Stock Status Pill, Ratios & Expand Chevron */}
                  <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60">
                    
                    {/* Stock status indicator */}
                    <div className="flex items-center gap-2">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-[11px] font-semibold border border-rose-200/60 dark:border-rose-900/60">
                          <span className="size-1.5 bg-rose-500 rounded-full" /> Depleted
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[11px] font-semibold border border-amber-200/60 dark:border-amber-900/60">
                          <span className="size-1.5 bg-amber-500 rounded-full animate-pulse" /> Low stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-200/60 dark:border-emerald-900/60">
                          <span className="size-1.5 bg-emerald-500 rounded-full" /> Available
                        </span>
                      )}

                      {/* Stock Numbers */}
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
                          {item.availableQuantity}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono"> / {item.totalQuantity}</span>
                      </div>
                    </div>

                    {/* Rotating Expand Chevron */}
                    <div className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                      <ChevronDown className={`size-4.5 transition-transform duration-200 ${isExpanded ? "rotate-180 text-blue-600 dark:text-blue-400" : ""}`} />
                    </div>

                  </div>
                </div>

                {/* ==================== EXPANDED IN-PLACE COMPONENT DOSSIER ==================== */}
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
                          
                          {/* Left Column: Description, Specs & Storage Location */}
                          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                              Component Dossier & Specifications
                            </h4>

                            <div className="space-y-2.5 text-xs">
                              <div>
                                <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Description:</span>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-xs">
                                  {item.description || "Robotics stock component registered in database inventory."}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                  <MapPin className="size-3 text-slate-400" /> Stockroom Placement:
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {item.location || "Unassigned Bay"}
                                </span>
                              </div>

                              {item.specification && (
                                <div className="pt-2 border-t border-slate-200/40 dark:border-slate-700/40 space-y-1.5">
                                  <span className="text-[10px] font-semibold text-slate-400 block">Technical Datasheet Specifications:</span>
                                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto space-y-1">
                                    {specPoints.map((point, idx) => (
                                      <div key={idx} className="flex items-start gap-1.5">
                                        <span className="text-blue-500 select-none">▪</span>
                                        <span>{point}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Column: Inventory Availability Gauge, Project Allocations & Quick Count */}
                          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                              Stock Distribution & Active Allocations
                            </h4>

                            {/* Progress bar */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500 dark:text-slate-400 font-medium">Availability ratio:</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{availablePercent}% available</span>
                              </div>
                              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isOutOfStock 
                                      ? "bg-rose-500" 
                                      : isLowStock 
                                        ? "bg-amber-500" 
                                        : "bg-blue-600"
                                  }`}
                                  style={{ width: `${availablePercent}%` }}
                                />
                              </div>
                            </div>

                            {/* 3 Metric Summary Boxes */}
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700">
                                <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Available</span>
                                <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                  {item.availableQuantity}
                                </span>
                              </div>
                              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700">
                                <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Allocated</span>
                                <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                                  {allocatedCount}
                                </span>
                              </div>
                              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700">
                                <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Total Units</span>
                                <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">
                                  {item.totalQuantity}
                                </span>
                              </div>
                            </div>

                            {/* In-Place Quick Stock Adjuster */}
                            <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700 flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                Quick Count Adjust:
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleQuickAdjustQuantity(item, -5)}
                                  disabled={item.totalQuantity < 5}
                                  className="px-2 py-0.8 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-mono font-bold rounded transition-colors disabled:opacity-40 cursor-pointer"
                                  title="Subtract 5 units"
                                >
                                  -5
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickAdjustQuantity(item, -1)}
                                  disabled={item.totalQuantity < 1}
                                  className="px-2 py-0.8 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-mono font-bold rounded transition-colors disabled:opacity-40 cursor-pointer"
                                  title="Subtract 1 unit"
                                >
                                  -1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickAdjustQuantity(item, 1)}
                                  className="px-2 py-0.8 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-mono font-bold rounded transition-colors cursor-pointer"
                                  title="Add 1 unit"
                                >
                                  +1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickAdjustQuantity(item, 5)}
                                  className="px-2 py-0.8 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-mono font-bold rounded transition-colors cursor-pointer"
                                  title="Add 5 units"
                                >
                                  +5
                                </button>
                              </div>
                            </div>

                            {/* Active Robotics Project Allocations */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-semibold text-slate-400 block font-mono">Active Project Bindings:</span>
                              {itemAllocations.length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic">No active project checkouts. All inventory is in central stock.</p>
                              ) : (
                                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                  {itemAllocations.map((alloc, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-[11px] bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700 font-sans">
                                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                                        {alloc.projectTitle}
                                      </span>
                                      <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                                        x{alloc.quantity}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                          </div>

                        </div>

                        {/* Expanded Drawer Action Bar */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setCheckoutItem(item)}
                              disabled={item.availableQuantity <= 0}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                            >
                              <ShoppingBag className="size-3.5" /> Allocate to Project
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <Wrench className="size-3.5" /> Edit Component
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmItemId(item.id)}
                              className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                            >
                              <Trash2 className="size-3.5" /> Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleExpandItem(item.id)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium cursor-pointer"
                            >
                              Collapse Line
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
        </section>

      ) : (

        /* ==================== DENSE DIRECTORY TABLE VIEW ==================== */
        <div id="catalog-stock-table" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden text-left">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Component</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Location</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Specification</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">Available / Total</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-sans">
                {filteredInventory.map((item) => {
                  const isOutOfStock = item.availableQuantity <= 0;
                  const isLowStock = !isOutOfStock && item.availableQuantity <= 3;
                  const specPoints = getSpecPoints(item.specification);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700">
                            {getCategoryIcon(item.category)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 font-display">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">
                              {item.description || "No description"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono font-bold rounded">
                          {item.category}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-sans text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 text-slate-400 shrink-0" />
                          {item.location || "Unassigned"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                        {specPoints.length > 0 ? specPoints.join("; ") : "—"}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono">
                        <div className="inline-flex items-center gap-1.5">
                          <span className={`size-1.5 rounded-full ${
                            isOutOfStock ? "bg-rose-500" : isLowStock ? "bg-amber-500" : "bg-emerald-500"
                          }`} />
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.availableQuantity}
                          </span>
                          <span className="text-slate-400">/ {item.totalQuantity}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setCheckoutItem(item)}
                            disabled={item.availableQuantity <= 0}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                            title="Allocate to Project"
                          >
                            Allocate
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Wrench className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmItemId(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
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

      {/* CHECKOUT ALLOCATION MODAL */}
      {checkoutItem && (
        <div id="checkout-allocation-portal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl overflow-hidden text-left">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5 uppercase">
                <ShoppingBag className="size-4 text-blue-400" /> Checkout Allocation Gate
              </h3>
              <button 
                onClick={() => setCheckoutItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handlePerformAllocation} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-0.5">{checkoutItem.category}</span>
                <h4 className="font-display font-bold text-slate-800 text-xs">{checkoutItem.name}</h4>
                <p className="text-[10px] text-slate-500 mt-1">Available in Stockroom: <strong className="text-slate-700 font-mono">{checkoutItem.availableQuantity} units</strong></p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Quantity to Checkout</label>
                <input
                  type="number"
                  min={1}
                  max={checkoutItem.availableQuantity}
                  value={checkoutQty}
                  onChange={(e) => setCheckoutQty(Math.floor(Number(e.target.value)))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-hidden font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Assign permanently to Project:</label>
                <select
                  required
                  value={checkoutProjectId}
                  onChange={(e) => setCheckoutProjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs rounded-lg px-3 py-2 outline-hidden cursor-pointer"
                >
                  <option value="">Select Project...</option>
                  {projects.filter(p => p.status !== "Finished").map((p) => (
                    <option key={p.id} value={p.id}>{p.title} ({p.status})</option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-400 leading-normal mt-1.5">
                  Allocation instantly discounts counts from central storage and binds the hardware to the selected project's build materials.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setCheckoutItem(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white font-semibold text-xs rounded-lg cursor-pointer"
                >
                  Verify checkout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER ITEM MODAL */}
      {showAddModal && (
        <div id="register-hardware-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl text-left overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold">Register Hardware Component</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Component Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ESP32-S3 (Dual-core, 5Vin Pin)"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-hidden"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />

                {(() => {
                  const trimmed = newName.trim();
                  const matches = trimmed
                    ? inventory.filter(i => 
                        i.name.toLowerCase().includes(trimmed.toLowerCase()) && 
                        i.name.toLowerCase().trim() !== trimmed.toLowerCase().trim()
                      )
                    : [];
                  if (matches.length === 0) return null;
                  return (
                    <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] space-y-1.5 max-h-32 overflow-y-auto" id="matching-parts-suggestions">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Matching Existing Parts (Click to Select & Merge):</span>
                      <div className="space-y-1">
                        {matches.slice(0, 5).map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => {
                              setNewName(item.name);
                              setNewCat(item.category);
                              setNewLoc(item.location || "");
                              setNewSpec(item.specification || "");
                              setNewDesc(item.description || "");
                              setMergeExisting(true);
                            }}
                            className="w-full text-left px-2 py-1 bg-white hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-md text-slate-700 font-medium transition-colors cursor-pointer flex justify-between items-center"
                          >
                            <span className="truncate mr-2">{item.name}</span>
                            <span className="text-[9px] text-blue-600 font-bold font-mono bg-blue-50/50 px-1.5 py-0.5 rounded-sm shrink-0">
                              {item.totalQuantity} in stock
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {(() => {
                const matchedItem = newName.trim()
                  ? inventory.find(i => i.name.toLowerCase().trim() === newName.toLowerCase().trim())
                  : null;
                if (!matchedItem) return null;
                return (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-xs flex flex-col gap-1.5 animate-fade-in" id="duplicate-warning">
                    <div className="flex items-center gap-1 font-semibold">
                      <AlertCircle className="size-4 shrink-0 text-amber-600" />
                      Component already exists in catalog
                    </div>
                    <p className="text-amber-700 leading-normal">
                      An item named <strong>{matchedItem.name}</strong> is already registered. Adding it will increase its quantity instead of creating a duplicate item card.
                    </p>
                    <label className="flex items-center gap-1.5 mt-1 font-semibold cursor-pointer text-slate-700 select-none">
                      <input
                        type="checkbox"
                        checked={mergeExisting}
                        onChange={(e) => setMergeExisting(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-3.5"
                        id="merge-existing-toggle"
                      />
                      Merge into existing stock of "{matchedItem.name}" (Add to current {matchedItem.totalQuantity} units)
                    </label>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Category</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs rounded-lg px-2.5 py-2 outline-hidden cursor-pointer"
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Total Quantity</label>
                  <input
                    type="number"
                    required
                    min={0}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-sm outline-hidden font-mono"
                    value={newTotalQty}
                    onChange={(e) => setNewTotalQty(Math.floor(Number(e.target.value)))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Stockroom Placement / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Closet C, Partition 12"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-hidden"
                  value={newLoc}
                  onChange={(e) => setNewLoc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Brief Description</label>
                <input
                  type="text"
                  placeholder="What is this item primarily allocated for?"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-hidden"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Technical specification (Datasheet notes)</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs outline-hidden font-mono"
                  rows={2}
                  placeholder="e.g., Dual USB, standard 2.4Ghz antenna, 5Vin configuration"
                  value={newSpec}
                  onChange={(e) => setNewSpec(e.target.value)}
                />
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white font-semibold text-xs rounded-lg cursor-pointer transition-colors"
                >
                  {(() => {
                    const matchedItem = newName.trim()
                      ? inventory.find(i => i.name.toLowerCase().trim() === newName.toLowerCase().trim())
                      : null;
                    if (matchedItem && mergeExisting) {
                      return loading ? "Merging..." : "Merge & Add Stock";
                    }
                    return loading ? "Registering..." : "Register part";
                  })()}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INSTANCE MODAL */}
      {showEditItemModal && editingItem && (
        <div id="edit-catalog-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-100 shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5 uppercase">
                <Wrench className="size-4 text-blue-400" /> Edit Catalog Specification
              </h3>
              <button 
                onClick={() => {
                  setShowEditItemModal(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Component Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raspberry Pi Zero 2W"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-hidden font-medium"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Category</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-2.5 py-2 text-xs outline-hidden cursor-pointer"
                    value={editCat}
                    onChange={(e) => setEditCat(e.target.value)}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Placement / Location ID</label>
                  <input
                    type="text"
                    placeholder="e.g. Bay D, Shelf 2"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-xs outline-hidden"
                    value={editLoc}
                    onChange={(e) => setEditLoc(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Total stock count</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-xs outline-hidden font-mono"
                    value={editTotalQty}
                    onChange={(e) => setEditTotalQty(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Available to allocate</label>
                  <input
                    type="number"
                    min="0"
                    max={editTotalQty}
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-xs outline-hidden font-mono"
                    value={editAvailQty}
                    onChange={(e) => setEditAvailQty(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Brief Description</label>
                <input
                  type="text"
                  placeholder="What is this item primarily allocated for?"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-hidden"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Technical datasheet notes / Specs</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs outline-hidden font-mono"
                  rows={2}
                  placeholder="e.g. 5V input, I2C logic level converter needed"
                  value={editSpec}
                  onChange={(e) => setEditSpec(e.target.value)}
                />
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditItemModal(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg cursor-pointer transition-colors"
                >
                  {loading ? "Saving catalog..." : "Apply changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmItemId && (
        <div id="delete-inventory-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-100 shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-display text-sm font-bold text-slate-800 mb-2">Delete Inventory Item?</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Are you absolutely sure you want to delete <strong>{inventory.find(i => i.id === deleteConfirmItemId)?.name}</strong> from the stockroom inventory? This will permanently wipe out its specification and count details.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmItemId(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
                id="cancel-delete-inventory-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDeleteCatalogItem(deleteConfirmItemId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-xs"
                id="confirm-delete-inventory-btn"
              >
                {loading ? "Deleting..." : "Delete Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 size-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-40 cursor-pointer"
        title="Register New Part"
      >
        <Plus className="size-6" />
      </button>
    </div>
  );
}
